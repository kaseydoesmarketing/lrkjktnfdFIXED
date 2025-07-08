// server/routes/stripe-webhook.ts
import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { db } from '../db';
import { users } from '@shared/schema';
import { eq } from 'drizzle-orm';
import express from 'express';

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

// Webhook handler - MUST be before body parser
router.post('/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('❌ Stripe webhook secret not configured');
      return res.status(500).send('Webhook secret not configured');
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        webhookSecret
      );
    } catch (err: any) {
      console.error('❌ Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          await handleCheckoutComplete(session);
          break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionUpdate(subscription);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await handleSubscriptionCanceled(subscription);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          await handlePaymentFailed(invoice);
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          await handlePaymentSucceeded(invoice);
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error('❌ Error processing webhook:', error);
      res.status(500).send('Webhook processing error');
    }
  }
);

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) {
    console.error('No userId in checkout session metadata');
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  );

  await db.update(users)
    .set({
      stripeCustomerId: session.customer as string,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionTier: subscription.metadata.plan || 'pro',
      updatedAt: new Date()
    })
    .where(eq(users.id, userId));

  console.log(`✅ Subscription activated for user ${userId}`);
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const user = await db.select()
    .from(users)
    .where(eq(users.stripeSubscriptionId, subscription.id))
    .limit(1);

  if (user.length === 0) return;

  const plan = subscription.items.data[0]?.price.metadata?.plan || 'pro';

  await db.update(users)
    .set({
      subscriptionStatus: subscription.status,
      subscriptionTier: plan,
      updatedAt: new Date()
    })
    .where(eq(users.id, user[0].id));

  console.log(`✅ Subscription updated for user ${user[0].id}`);
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  const user = await db.select()
    .from(users)
    .where(eq(users.stripeSubscriptionId, subscription.id))
    .limit(1);

  if (user.length === 0) return;

  await db.update(users)
    .set({
      subscriptionStatus: 'canceled',
      subscriptionTier: 'free',
      updatedAt: new Date()
    })
    .where(eq(users.id, user[0].id));

  console.log(`✅ Subscription canceled for user ${user[0].id}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  const subscription = await stripe.subscriptions.retrieve(
    invoice.subscription as string
  );

  const user = await db.select()
    .from(users)
    .where(eq(users.stripeCustomerId, invoice.customer as string))
    .limit(1);

  if (user.length === 0) return;

  console.error(`⚠️ Payment failed for user ${user[0].id}`);

  // Update subscription status
  await db.update(users)
    .set({
      subscriptionStatus: 'past_due',
      updatedAt: new Date()
    })
    .where(eq(users.id, user[0].id));

  // TODO: Send payment failure email
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  const user = await db.select()
    .from(users)
    .where(eq(users.stripeCustomerId, invoice.customer as string))
    .limit(1);

  if (user.length === 0) return;

  // Update subscription status to active
  await db.update(users)
    .set({
      subscriptionStatus: 'active',
      updatedAt: new Date()
    })
    .where(eq(users.id, user[0].id));

  console.log(`✅ Payment succeeded for user ${user[0].id}`);
}

export default router;