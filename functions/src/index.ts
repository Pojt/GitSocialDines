import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import * as admin from 'firebase-admin';
import Stripe from 'stripe';

admin.initializeApp();

const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');
const APP_URL = defineString('APP_URL');

const RATE_LIMIT_WINDOW_MS = 10_000;

async function checkRateLimit(uid: string, action: string): Promise<void> {
  const ref = admin.firestore().collection('rateLimits').doc(`${uid}_${action}`);
  await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const now = Date.now();
    if (snap.exists && now - (snap.data()?.lastAt ?? 0) < RATE_LIMIT_WINDOW_MS) {
      throw new HttpsError('resource-exhausted', 'Too many requests. Please wait a moment and try again.');
    }
    tx.set(ref, { lastAt: now });
  });
}

export const createCheckoutSession = onCall({ secrets: [STRIPE_SECRET_KEY] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'The function must be called while authenticated.');
  }

  const { bookingId } = request.data;
  if (!bookingId || typeof bookingId !== 'string') {
    throw new HttpsError('invalid-argument', 'Booking ID is required.');
  }

  await checkRateLimit(request.auth.uid, 'checkout');

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

  const guestCount = booking?.guestCount;
  if (typeof guestCount !== 'number' || guestCount < 1 || !Number.isInteger(guestCount)) {
    throw new HttpsError('invalid-argument', 'Invalid guest count on booking.');
  }

  const dinnerDoc = await admin.firestore().collection('dinners').doc(booking.dinnerId).get();
  if (!dinnerDoc.exists) {
    throw new HttpsError('not-found', 'Dinner not found.');
  }
  const dinner = dinnerDoc.data();

  const price = dinner?.price;
  if (typeof price !== 'number' || price <= 0) {
    throw new HttpsError('invalid-argument', 'Dinner has an invalid price.');
  }

  const stripe = new Stripe(STRIPE_SECRET_KEY.value(), { apiVersion: '2024-06-20' });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: dinner?.title || 'Dinner Seat',
            description: `Dinner with ${dinner?.host?.displayName || 'Host'}`,
          },
          unit_amount: Math.round(price * 100),
        },
        quantity: guestCount,
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

  const { bookingId } = request.data;
  if (!bookingId || typeof bookingId !== 'string') {
    throw new HttpsError('invalid-argument', 'Booking ID is required.');
  }

  await checkRateLimit(request.auth.uid, 'cancel');

  const bookingRef = admin.firestore().collection('bookings').doc(bookingId);
  const bookingDoc = await bookingRef.get();

  if (!bookingDoc.exists) throw new HttpsError('not-found', 'Booking not found.');
  const booking = bookingDoc.data();

  if (booking?.guestId !== request.auth.uid) throw new HttpsError('permission-denied', 'Unauthorized.');
  if (booking?.status !== 'confirmed') throw new HttpsError('failed-precondition', 'Cannot cancel unconfirmed booking this way.');

  let refunded = false;
  const stripe = new Stripe(STRIPE_SECRET_KEY.value(), { apiVersion: '2024-06-20' });

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

  const batch = admin.firestore().batch();
  batch.update(bookingRef, {
    status: 'cancelled',
    paymentStatus: refunded ? 'refunded' : booking?.paymentStatus
  });

  const dinnerRef = admin.firestore().collection('dinners').doc(booking?.dinnerId);
  batch.update(dinnerRef, {
    guestsCount: admin.firestore.FieldValue.increment(-(booking?.guestCount || 1))
  });

  await batch.commit();

  // Atomically claim the first waitlist entry to prevent double-notification
  await admin.firestore().runTransaction(async (tx) => {
    const waitlistSnap = await tx.get(
      admin.firestore().collection('waitlist')
        .where('dinnerId', '==', booking?.dinnerId)
        .orderBy('joinedAt', 'asc')
        .limit(1)
    );

    if (!waitlistSnap.empty) {
      const entry = waitlistSnap.docs[0].data();
      tx.delete(waitlistSnap.docs[0].ref);
      const notifRef = admin.firestore()
        .collection('notifications').doc(entry.userId).collection('items').doc();
      tx.set(notifRef, {
        type: 'waitlist_available',
        message: `A seat just opened up at a table you were waiting for!`,
        link: `/dinner/${booking?.dinnerId}`,
        isRead: false,
        createdAt: Date.now()
      });
    }
  });

  return { success: true, refunded };
});

export const stripeWebhook = onRequest({ secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET] }, async (req, res) => {
  const stripe = new Stripe(STRIPE_SECRET_KEY.value(), { apiVersion: '2024-06-20' });
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
