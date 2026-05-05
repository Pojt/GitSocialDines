import { onCall, onRequest, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret, defineString } from 'firebase-functions/params';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import Stripe from 'stripe';

initializeApp();
const db = getFirestore();

const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');
const appUrl = defineString('APP_URL', { default: 'http://localhost:3000' });

function stripe() {
  return new Stripe(stripeSecretKey.value(), { apiVersion: '2024-10-28' });
}

/**
 * Callable: creates a Stripe Checkout Session for a confirmed booking.
 * Returns { url } — redirect the user to this URL to complete payment.
 *
 * Required setup:
 *   firebase functions:secrets:set STRIPE_SECRET_KEY
 *   firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
 *   firebase functions:params:set APP_URL=https://your-app.web.app
 */
export const createCheckoutSession = onCall(
  { secrets: [stripeSecretKey] },
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError('unauthenticated', 'Must be signed in');

    const { bookingId } = request.data as { bookingId: string };
    if (!bookingId) throw new HttpsError('invalid-argument', 'bookingId is required');

    const bookingSnap = await db.collection('bookings').doc(bookingId).get();
    if (!bookingSnap.exists) throw new HttpsError('not-found', 'Booking not found');
    const booking = bookingSnap.data()!;

    if (booking.guestId !== uid) {
      throw new HttpsError('permission-denied', 'Not your booking');
    }
    if (booking.status !== 'confirmed') {
      throw new HttpsError('failed-precondition', 'Booking must be confirmed before payment');
    }
    if (booking.paymentStatus === 'paid') {
      throw new HttpsError('already-exists', 'Payment already completed');
    }

    const dinnerSnap = await db.collection('dinners').doc(booking.dinnerId).get();
    if (!dinnerSnap.exists) throw new HttpsError('not-found', 'Dinner not found');
    const dinner = dinnerSnap.data()!;

    const session = await stripe().checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: (dinner.currency || 'usd').toLowerCase(),
            product_data: {
              name: dinner.title,
              description: `${booking.guestCount} guest${booking.guestCount > 1 ? 's' : ''} · ${dinner.cuisine} dinner`
            },
            unit_amount: Math.round(dinner.price * 100)
          },
          quantity: booking.guestCount
        }
      ],
      success_url: `${appUrl.value()}/bookings?payment=success`,
      cancel_url: `${appUrl.value()}/bookings?payment=cancelled`,
      metadata: { bookingId, guestId: uid, dinnerId: booking.dinnerId }
    });

    await bookingSnap.ref.update({
      paymentStatus: 'awaiting_payment',
      stripeSessionId: session.id
    });

    return { url: session.url };
  }
);

/**
 * HTTP: Stripe webhook endpoint.
 * Register this URL in your Stripe dashboard under Webhooks.
 * Listen for: checkout.session.completed, checkout.session.expired
 */
export const stripeWebhook = onRequest(
  { secrets: [stripeSecretKey, stripeWebhookSecret] },
  async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    try {
      event = stripe().webhooks.constructEvent(
        req.rawBody,
        sig,
        stripeWebhookSecret.value()
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('Webhook signature verification failed:', msg);
      res.status(400).send(`Webhook error: ${msg}`);
      return;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const { bookingId, guestId } = session.metadata!;

      await db.collection('bookings').doc(bookingId).update({
        paymentStatus: 'paid',
        paidAt: FieldValue.serverTimestamp()
      });

      await db.collection('payments').add({
        bookingId,
        guestId,
        stripeSessionId: session.id,
        amount: session.amount_total,
        currency: session.currency,
        status: 'succeeded',
        createdAt: FieldValue.serverTimestamp()
      });

      // In-app notification to guest
      await db
        .collection('notifications')
        .doc(guestId)
        .collection('items')
        .add({
          type: 'booking_confirmed',
          message: 'Your payment was successful! See you at the table.',
          link: '/bookings',
          isRead: false,
          createdAt: Date.now()
        });
    }

    if (event.type === 'checkout.session.expired') {
      const session = event.data.object as Stripe.Checkout.Session;
      const bookingId = session.metadata?.bookingId;
      if (bookingId) {
        await db.collection('bookings').doc(bookingId).update({
          paymentStatus: 'unpaid'
        });
      }
    }

    res.json({ received: true });
  }
);
