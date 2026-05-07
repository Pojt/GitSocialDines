import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

admin.initializeApp();

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');
const APP_URL = defineString('APP_URL');

// Basic rate limiting helper
async function checkRateLimit(userId: string, functionName: string, windowMs = 5000) {
  const rateLimitRef = admin.firestore().collection('rate_limits').doc(`${userId}_${functionName}`);
  const now = Date.now();
  
  const result = await admin.firestore().runTransaction(async (t) => {
    const doc = await t.get(rateLimitRef);
    if (doc.exists) {
      const lastCall = doc.data()?.lastCall || 0;
      if (now - lastCall < windowMs) {
        return false;
      }
    }
    t.set(rateLimitRef, { lastCall: now });
    return true;
  });
  
  return result;
}

export const createCheckoutSession = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  if (!(await checkRateLimit(request.auth.uid, 'createCheckoutSession'))) {
    throw new HttpsError('resource-exhausted', 'Slow down! Please wait a moment before trying again.');
  }

  const { bookingId } = request.data;
  if (!bookingId || typeof bookingId !== 'string') {
    throw new HttpsError('invalid-argument', 'Valid Booking ID is required.');
  }

  const bookingDoc = await admin.firestore().collection('bookings').doc(bookingId).get();
  if (!bookingDoc.exists) {
    throw new HttpsError('not-found', 'Booking not found.');
  }

  const booking = bookingDoc.data();
  if (booking?.guestId !== request.auth.uid) {
    throw new HttpsError('permission-denied', 'Only the guest can pay for this booking.');
  }

  if (booking?.status !== 'confirmed') {
    throw new HttpsError('failed-precondition', 'Booking must be confirmed by the host before payment.');
  }

  if (booking?.paymentStatus === 'paid') {
    throw new HttpsError('already-exists', 'Booking is already paid.');
  }

  const dinnerDoc = await admin.firestore().collection('dinners').doc(booking.dinnerId).get();
  const dinner = dinnerDoc.data();

  if (!dinner) {
    throw new HttpsError('not-found', 'Dinner not found.');
  }

  // Pre-payment capacity guard
  const currentCount = dinner.guestsCount || 0;
  const maxCount = dinner.guestsMax || 0;
  if (currentCount >= maxCount) {
    throw new HttpsError('failed-precondition', 'This table is already full.');
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY.value(), { apiVersion: '2025-02-24.acacia' });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: dinner?.title || 'Dinner Seat',
            description: `Hosted by ${dinner?.hostId}`,
          },
          unit_amount: Math.round((dinner?.price || 0) * 100),
        },
        quantity: booking.guestCount || 1,
      },
    ],
    mode: 'payment',
    success_url: `${APP_URL.value()}/bookings?payment=success`,
    cancel_url: `${APP_URL.value()}/bookings?payment=cancelled`,
    metadata: {
      bookingId,
      guestId: request.auth.uid,
    },
  });

  await admin.firestore().collection('bookings').doc(bookingId).update({
    paymentStatus: 'awaiting_payment',
    stripeSessionId: session.id,
  });

  return { url: session.url };
});

export const cancelBooking = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be signed in.');
  }

  if (!(await checkRateLimit(request.auth.uid, 'cancelBooking'))) {
    throw new HttpsError('resource-exhausted', 'Please wait before cancelling again.');
  }

  const { bookingId } = request.data;
  if (!bookingId || typeof bookingId !== 'string') {
    throw new HttpsError('invalid-argument', 'Valid Booking ID is required.');
  }
  const stripe = new Stripe(STRIPE_SECRET_KEY.value(), { apiVersion: '2025-02-24.acacia' });

  const result = await admin.firestore().runTransaction(async (transaction) => {
    const bookingRef = admin.firestore().collection('bookings').doc(bookingId);
    const bookingDoc = await transaction.get(bookingRef);

    if (!bookingDoc.exists) throw new HttpsError('not-found', 'Booking not found.');
    const booking = bookingDoc.data();

    if (booking?.guestId !== request.auth?.uid) throw new HttpsError('permission-denied', 'Unauthorized.');
    if (booking?.status !== 'confirmed') throw new HttpsError('failed-precondition', 'Cannot cancel unconfirmed booking this way.');

    // Prepare refund data but don't call stripe inside transaction
    return { booking, bookingRef };
  });

  const { booking, bookingRef } = result;
  let refunded = false;

  if (booking?.paymentStatus === 'paid') {
    const paymentSnap = await admin.firestore().collection('payments')
      .where('bookingId', '==', bookingId)
      .limit(1)
      .get();

    if (!paymentSnap.empty) {
      const payment = paymentSnap.docs[0].data();
      if (payment.paymentIntentId) {
        await stripe.refunds.create({ payment_intent: payment.paymentIntentId });
        refunded = true;
      }
    }
  }

  // Atomic update of status, guest count, and waitlist
  await admin.firestore().runTransaction(async (transaction) => {
    transaction.update(bookingRef, {
      status: 'cancelled',
      paymentStatus: refunded ? 'refunded' : booking?.paymentStatus,
      updatedAt: Date.now()
    });

    const dinnerRef = admin.firestore().collection('dinners').doc(booking?.dinnerId);
    transaction.update(dinnerRef, {
      guestsCount: admin.firestore.FieldValue.increment(-(booking?.guestCount || 1))
    });

    // Notify waitlist atomically
    const waitlistQuery = admin.firestore().collection('waitlist')
        .where('dinnerId', '==', booking?.dinnerId)
        .orderBy('joinedAt', 'asc')
        .limit(1);
    
    const waitlistSnap = await waitlistQuery.get();

    if (!waitlistSnap.empty) {
      const waitlistDoc = waitlistSnap.docs[0];
      const entry = waitlistDoc.data();
      
      // We check the document in the transaction to prevent race conditions
      await transaction.get(waitlistDoc.ref);
      
      const notifRef = admin.firestore().collection('notifications').doc(entry.userId).collection('items').doc();
      transaction.set(notifRef, {
        type: 'booking_confirmed',
        message: `A seat just opened up at a table you were waiting for!`,
        link: `/dinner/${booking?.dinnerId}`,
        isRead: false,
        createdAt: Date.now()
      });
      transaction.delete(waitlistDoc.ref);
    }
  });

  return { success: true, refunded };
});

export const updateBookingStatus = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be signed in.');
  }

  if (!(await checkRateLimit(request.auth.uid, 'updateBookingStatus'))) {
    throw new HttpsError('resource-exhausted', 'Slow down.');
  }

  const { bookingId, status, dinnerId } = request.data;
  if (!bookingId || !status || !dinnerId) {
    throw new HttpsError('invalid-argument', 'Missing required fields.');
  }

  return await admin.firestore().runTransaction(async (transaction) => {
    const bookingRef = admin.firestore().collection('bookings').doc(bookingId);
    const bookingSnap = await transaction.get(bookingRef);
    if (!bookingSnap.exists) throw new HttpsError('not-found', 'Booking not found');
    const booking = bookingSnap.data();

    const dinnerRef = admin.firestore().collection('dinners').doc(dinnerId);
    const dinnerSnap = await transaction.get(dinnerRef);
    if (!dinnerSnap.exists) throw new HttpsError('not-found', 'Dinner not found');
    const dinner = dinnerSnap.data();

    // Permission check: only host can confirm/reject, only guest can cancel
    if (status === 'confirmed' || status === 'rejected') {
      if (booking?.hostId !== request.auth?.uid) throw new HttpsError('permission-denied', 'Only host can change status.');
    } else if (status === 'cancelled') {
      if (booking?.guestId !== request.auth?.uid) throw new HttpsError('permission-denied', 'Only guest can cancel.');
    }

    const currentGuests = dinner.guestsCount || 0;
    const guestsMax = dinner.guestsMax || 0;
    const bookingGuestCount = booking?.guestCount || 1;

    // Transition logic
    if (status === 'confirmed' && booking?.status !== 'confirmed') {
      if (currentGuests + bookingGuestCount > guestsMax) {
        throw new HttpsError('failed-precondition', 'Table is full.');
      }
      transaction.update(dinnerRef, { guestsCount: currentGuests + bookingGuestCount });
      
      const attendanceRef = admin.firestore().collection('confirmedAttendances').doc(`${booking?.guestId}_${dinnerId}`);
      transaction.set(attendanceRef, { guestId: booking?.guestId, dinnerId, confirmedAt: Date.now() });
    }

    if ((status === 'cancelled' || status === 'rejected') && booking?.status === 'confirmed') {
      transaction.update(dinnerRef, { guestsCount: Math.max(0, currentGuests - bookingGuestCount) });
      
      // Notify waitlist if spot opened
      const waitlistSnap = await admin.firestore().collection('waitlist')
        .where('dinnerId', '==', dinnerId)
        .orderBy('joinedAt', 'asc')
        .limit(1)
        .get();

      if (!waitlistSnap.empty) {
        const entry = waitlistSnap.docs[0];
        const entryData = entry.data();
        const notifRef = admin.firestore().collection('notifications').doc(entryData.userId).collection('items').doc();
        transaction.set(notifRef, {
          type: 'booking_confirmed',
          message: `A seat just opened up at "${dinner.title}"!`,
          link: `/dinner/${dinnerId}`,
          isRead: false,
          createdAt: Date.now()
        });
        transaction.delete(entry.ref);
      }
    }

    transaction.update(bookingRef, { 
      status,
      updatedAt: Date.now()
    });

    return { success: true };
  });
});

export const stripeWebhook = onRequest({ secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] }, async (req, res) => {
  const stripe = new Stripe(STRIPE_SECRET_KEY.value(), { apiVersion: '2025-02-24.acacia' });
  const sig = req.headers['stripe-signature'] as string;

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, STRIPE_WEBHOOK_SECRET.value());
  } catch (err: any) {
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;

    if (bookingId) {
      await admin.firestore().collection('bookings').doc(bookingId).update({
        paymentStatus: 'paid',
        paidAt: Date.now(),
      });

      await admin.firestore().collection('payments').add({
        bookingId,
        guestId: session.metadata?.guestId,
        amount: session.amount_total,
        currency: session.currency,
        status: 'succeeded',
        stripeSessionId: session.id,
        paymentIntentId: session.payment_intent,
        createdAt: Date.now(),
      });

      // Notify guest
      const bookingDoc = await admin.firestore().collection('bookings').doc(bookingId).get();
      const booking = bookingDoc.data();
      if (booking) {
        await admin.firestore().collection('notifications').doc(booking.guestId).collection('items').add({
          type: 'booking_confirmed',
          message: `Payment successful! Your seat is secured.`,
          link: '/bookings',
          isRead: false,
          createdAt: Date.now()
        });
      }
    }
  }

  res.json({ received: true });
});
