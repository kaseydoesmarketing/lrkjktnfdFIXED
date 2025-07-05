// ========================================
// COMPLETE STRIPE INTEGRATION SYSTEM
// ========================================

import Stripe from 'stripe';
import express from 'express';
import { storage } from './storage.js';

// Initialize Stripe with error handling
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable');
}

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  console.warn('Missing STRIPE_WEBHOOK_SECRET - webhooks will not verify signatures');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-05-28.basil',
  maxNetworkRetries: 3,
  timeout: 20000,
});

// ========================================
// STRIPE SERVICE CLASS
// ========================================

class StripeService {
  constructor() {
    this.stripe = stripe;
    this.plans = {
      pro: {
        priceId: process.env.STRIPE_PRO_PRICE_ID,
        amount: 2900, // $29.00
        name: 'TitleTesterPro Pro',
        features: [
          'Unlimited A/B Tests',
          'Advanced Analytics',
          'Email Support',
          'Statistical Significance Tracking',
          'Performance Dashboard',
          'CSV Export'
        ]
      },
      authority: {
        priceId: process.env.STRIPE_AUTHORITY_PRICE_ID,
        amount: 9900, // $99.00
        name: 'TitleTesterPro Authority',
        features: [
          'Everything in Pro',
          'Up to 10 YouTube Channels',
          'AI-Powered Title Generation',
          'Team Collaboration',
          'White-Label Reports',
          'Dedicated Account Manager',
          'Custom Integrations',
          'Priority Support'
        ]
      }
    };
  }

  // Create or retrieve Stripe customer
  async createOrGetCustomer(user) {
    try {
      // Check if user already has Stripe customer ID
      if (user.stripeCustomerId) {
        try {
          const customer = await this.stripe.customers.retrieve(user.stripeCustomerId);
          if (!customer.deleted) {
            return customer;
          }
        } catch (error) {
          console.log('Existing customer not found, creating new one');
        }
      }

      // Create new customer
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.name || `User ${user.id}`,
        metadata: {
          userId: user.id,
          platform: 'titletesterpro',
          created_via: 'dashboard'
        }
      });

      // Update user with Stripe customer ID
      await storage.updateUser(user.id, { 
        stripeCustomerId: customer.id 
      });

      return customer;
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      throw new Error('Failed to create customer account');
    }
  }

  // Create checkout session for subscription
  async createCheckoutSession(userId, planType, successUrl, cancelUrl) {
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const plan = this.plans[planType];
      if (!plan) {
        throw new Error('Invalid plan type');
      }

      const customer = await this.createOrGetCustomer(user);

      // Create checkout session
      const session = await this.stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        mode: 'subscription',
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
        line_items: [
          {
            price: plan.priceId,
            quantity: 1,
          },
        ],
        metadata: {
          userId: user.id,
          planType: planType,
          customerEmail: user.email
        },
        subscription_data: {
          metadata: {
            userId: user.id,
            planType: planType
          },
          trial_period_days: 14, // 14-day free trial
        },
        success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&plan=${planType}`,
        cancel_url: cancelUrl,
        automatic_tax: {
          enabled: true,
        },
      });

      return {
        sessionId: session.id,
        url: session.url,
        plan: plan,
        customer: customer.id
      };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw new Error(`Failed to create checkout session: ${error.message}`);
    }
  }

  // Handle successful subscription creation
  async handleSubscriptionCreated(subscription) {
    try {
      const userId = subscription.metadata.userId;
      const planType = subscription.metadata.planType;

      if (!userId) {
        console.error('No userId in subscription metadata');
        return false;
      }

      // Update user subscription in database
      await storage.updateUserSubscription(userId, {
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: subscription.customer,
        status: subscription.status,
        planType: planType,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        createdAt: new Date()
      });

      console.log(`Subscription created for user ${userId}: ${planType} plan`);
      return true;
    } catch (error) {
      console.error('Error handling subscription creation:', error);
      return false;
    }
  }

  // Handle subscription updates
  async handleSubscriptionUpdated(subscription) {
    try {
      const userId = subscription.metadata.userId;

      if (!userId) {
        console.error('No userId in subscription metadata');
        return false;
      }

      await storage.updateUserSubscription(userId, {
        status: subscription.status,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        updatedAt: new Date()
      });

      console.log(`Subscription updated for user ${userId}: status ${subscription.status}`);
      return true;
    } catch (error) {
      console.error('Error handling subscription update:', error);
      return false;
    }
  }

  // Handle subscription deletion/cancellation
  async handleSubscriptionDeleted(subscription) {
    try {
      const userId = subscription.metadata.userId;

      if (!userId) {
        console.error('No userId in subscription metadata');
        return false;
      }

      await storage.updateUserSubscription(userId, {
        status: 'canceled',
        canceledAt: new Date(),
        updatedAt: new Date()
      });

      console.log(`Subscription canceled for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error handling subscription deletion:', error);
      return false;
    }
  }

  // Handle payment success
  async handlePaymentSucceeded(invoice) {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(invoice.subscription);
      const userId = subscription.metadata.userId;

      if (!userId) {
        console.error('No userId in subscription metadata');
        return false;
      }

      // Update payment status
      await storage.updateUserSubscription(userId, {
        status: 'active',
        lastPaymentStatus: 'succeeded',
        lastPaymentDate: new Date(),
        paymentFailureCount: 0,
        updatedAt: new Date()
      });

      // Log successful payment
      await storage.createPaymentRecord({
        userId: userId,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_paid,
        currency: invoice.currency,
        status: 'succeeded',
        paidAt: new Date(invoice.status_transitions.paid_at * 1000)
      });

      console.log(`Payment succeeded for user ${userId}: $${invoice.amount_paid / 100}`);
      return true;
    } catch (error) {
      console.error('Error handling payment success:', error);
      return false;
    }
  }

  // Handle payment failure with smart retry logic
  async handlePaymentFailed(invoice) {
    try {
      const subscription = await this.stripe.subscriptions.retrieve(invoice.subscription);
      const userId = subscription.metadata.userId;

      if (!userId) {
        console.error('No userId in subscription metadata');
        return false;
      }

      // Get current failure count
      const user = await storage.getUser(userId);
      const failureCount = (user.paymentFailureCount || 0) + 1;

      // Update payment failure status
      await storage.updateUserSubscription(userId, {
        lastPaymentStatus: 'failed',
        paymentFailureCount: failureCount,
        lastPaymentFailureDate: new Date(),
        updatedAt: new Date()
      });

      // Log failed payment
      await storage.createPaymentRecord({
        userId: userId,
        stripeInvoiceId: invoice.id,
        amount: invoice.amount_due,
        currency: invoice.currency,
        status: 'failed',
        failureReason: invoice.last_finalization_error?.message || 'Payment failed',
        attemptedAt: new Date()
      });

      // Implement graceful degradation based on failure count
      if (failureCount === 1) {
        // First failure: Send notification, maintain full access
        await this.sendPaymentFailureNotification(userId, 'first_failure');
      } else if (failureCount === 2) {
        // Second failure: Limit some features
        await storage.updateUserSubscription(userId, {
          accessLevel: 'limited'
        });
        await this.sendPaymentFailureNotification(userId, 'second_failure');
      } else if (failureCount >= 3) {
        // Third failure: Downgrade to free tier but don't delete data
        await storage.updateUserSubscription(userId, {
          status: 'past_due',
          accessLevel: 'free'
        });
        await this.sendPaymentFailureNotification(userId, 'final_failure');
      }

      console.log(`Payment failed for user ${userId}: attempt ${failureCount}`);
      return true;
    } catch (error) {
      console.error('Error handling payment failure:', error);
      return false;
    }
  }

  // Send payment failure notifications
  async sendPaymentFailureNotification(userId, failureType) {
    // This would integrate with your email service
    const user = await storage.getUser(userId);
    
    const messages = {
      first_failure: {
        subject: 'Payment Issue - TitleTesterPro',
        message: 'We had trouble processing your payment. Please update your payment method.'
      },
      second_failure: {
        subject: 'Urgent: Update Payment Method - TitleTesterPro',
        message: 'Multiple payment failures detected. Some features have been limited.'
      },
      final_failure: {
        subject: 'Account Downgraded - TitleTesterPro',
        message: 'Your account has been downgraded to free tier due to payment issues.'
      }
    };

    const notification = messages[failureType];
    console.log(`Would send email to ${user.email}: ${notification.subject}`);
    
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
  }

  // Cancel subscription
  async cancelSubscription(userId, cancelImmediately = false) {
    try {
      const user = await storage.getUser(userId);
      
      if (!user.stripeSubscriptionId) {
        throw new Error('No active subscription found');
      }

      let subscription;
      if (cancelImmediately) {
        subscription = await this.stripe.subscriptions.cancel(user.stripeSubscriptionId);
      } else {
        subscription = await this.stripe.subscriptions.update(user.stripeSubscriptionId, {
          cancel_at_period_end: true
        });
      }

      await storage.updateUserSubscription(userId, {
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: cancelImmediately ? new Date() : null,
        status: cancelImmediately ? 'canceled' : subscription.status,
        updatedAt: new Date()
      });

      return {
        success: true,
        subscription: subscription,
        canceledImmediately: cancelImmediately
      };
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  // Get subscription details
  async getSubscriptionDetails(userId) {
    try {
      const user = await storage.getUser(userId);
      
      if (!user.stripeSubscriptionId) {
        return { hasSubscription: false };
      }

      const subscription = await this.stripe.subscriptions.retrieve(user.stripeSubscriptionId);
      const customer = await this.stripe.customers.retrieve(subscription.customer);

      return {
        hasSubscription: true,
        status: subscription.status,
        planType: subscription.metadata.planType,
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        trialEnd: subscription.trial_end ? new Date(subscription.trial_end * 1000) : null,
        customer: {
          email: customer.email,
          name: customer.name
        }
      };
    } catch (error) {
      console.error('Error getting subscription details:', error);
      return { hasSubscription: false, error: error.message };
    }
  }

  // Create customer portal session
  async createPortalSession(userId, returnUrl) {
    try {
      const user = await storage.getUser(userId);
      
      if (!user.stripeCustomerId) {
        throw new Error('No customer account found');
      }

      const session = await this.stripe.billingPortal.sessions.create({
        customer: user.stripeCustomerId,
        return_url: returnUrl,
      });

      return session.url;
    } catch (error) {
      console.error('Error creating portal session:', error);
      throw new Error(`Failed to create billing portal: ${error.message}`);
    }
  }
}

// ========================================
// WEBHOOK HANDLER WITH SECURITY
// ========================================

export function createStripeWebhookHandler() {
  const stripeService = new StripeService();

  return async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event;

    try {
      // Verify webhook signature if secret is available
      if (webhookSecret) {
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      } else {
        // For development/testing without webhook secret
        event = req.body;
        console.warn('Processing webhook without signature verification');
      }
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event with proper error handling
    try {
      console.log(`Processing webhook: ${event.type}`);

      switch (event.type) {
        case 'customer.subscription.created':
          await stripeService.handleSubscriptionCreated(event.data.object);
          break;

        case 'customer.subscription.updated':
          await stripeService.handleSubscriptionUpdated(event.data.object);
          break;

        case 'customer.subscription.deleted':
          await stripeService.handleSubscriptionDeleted(event.data.object);
          break;

        case 'invoice.payment_succeeded':
          await stripeService.handlePaymentSucceeded(event.data.object);
          break;

        case 'invoice.payment_failed':
          await stripeService.handlePaymentFailed(event.data.object);
          break;

        case 'checkout.session.completed':
          // Handle one-time purchases if needed
          console.log('Checkout session completed:', event.data.object.id);
          break;

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      res.status(200).json({ received: true, type: event.type });
    } catch (error) {
      console.error(`Error processing webhook ${event.type}:`, error);
      res.status(500).json({ 
        error: 'Webhook processing failed',
        type: event.type,
        message: error.message 
      });
    }
  };
}

// ========================================
// API ROUTES FOR STRIPE INTEGRATION
// ========================================

export function createStripeRoutes(app) {
  const stripeService = new StripeService();

  // Middleware to parse raw body for webhooks
  app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }));

  // Webhook endpoint
  app.post('/api/stripe/webhook', createStripeWebhookHandler());

  // Create checkout session
  app.post('/api/stripe/create-checkout', async (req, res) => {
    try {
      const { planType } = req.body;
      const userId = req.user.id;

      // Get the current domain for redirect URLs
      const domain = req.get('host');
      const protocol = req.get('x-forwarded-proto') || req.protocol;
      const baseUrl = `${protocol}://${domain}`;

      const successUrl = `${baseUrl}/dashboard?payment=success`;
      const cancelUrl = `${baseUrl}/pricing?payment=canceled`;

      const session = await stripeService.createCheckoutSession(
        userId,
        planType,
        successUrl,
        cancelUrl
      );

      res.json(session);
    } catch (error) {
      console.error('Error creating checkout:', error);
      res.status(500).json({ 
        error: 'Failed to create checkout session',
        message: error.message 
      });
    }
  });

  // Get subscription status
  app.get('/api/stripe/subscription', async (req, res) => {
    try {
      const userId = req.user.id;
      const subscription = await stripeService.getSubscriptionDetails(userId);
      res.json(subscription);
    } catch (error) {
      console.error('Error getting subscription:', error);
      res.status(500).json({ 
        error: 'Failed to get subscription details',
        message: error.message 
      });
    }
  });

  // Cancel subscription
  app.post('/api/stripe/cancel-subscription', async (req, res) => {
    try {
      const userId = req.user.id;
      const { immediate } = req.body;

      const result = await stripeService.cancelSubscription(userId, immediate);
      res.json(result);
    } catch (error) {
      console.error('Error canceling subscription:', error);
      res.status(500).json({ 
        error: 'Failed to cancel subscription',
        message: error.message 
      });
    }
  });

  // Create billing portal session
  app.post('/api/stripe/billing-portal', async (req, res) => {
    try {
      const userId = req.user.id;
      const domain = req.get('host');
      const protocol = req.get('x-forwarded-proto') || req.protocol;
      const returnUrl = `${protocol}://${domain}/dashboard`;

      const portalUrl = await stripeService.createPortalSession(userId, returnUrl);
      res.json({ url: portalUrl });
    } catch (error) {
      console.error('Error creating billing portal:', error);
      res.status(500).json({ 
        error: 'Failed to create billing portal',
        message: error.message 
      });
    }
  });

  // Get available plans
  app.get('/api/stripe/plans', (req, res) => {
    res.json({
      plans: stripeService.plans,
      currency: 'usd'
    });
  });

  // Subscription middleware for protected routes
  app.use('/api/protected', async (req, res, next) => {
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      // Check subscription status
      const subscription = await stripeService.getSubscriptionDetails(user.id);
      
      if (!subscription.hasSubscription || 
          !['active', 'trialing'].includes(subscription.status)) {
        return res.status(402).json({
          error: 'Active subscription required',
          message: 'Please upgrade to access this feature',
          redirectTo: '/pricing'
        });
      }

      req.subscription = subscription;
      next();
    } catch (error) {
      console.error('Subscription middleware error:', error);
      res.status(500).json({ error: 'Subscription verification failed' });
    }
  });
}

// ========================================
// REPL.IT SPECIFIC CONFIGURATION
// ========================================

export function configureStripeForReplit() {
  console.log('🔧 Configuring Stripe for Repl.it environment...');
  
  // Repl.it specific webhook URL
  const replitUrl = process.env.REPL_URL || process.env.REPLIT_DOMAIN;
  if (replitUrl) {
    console.log(`📡 Webhook URL: https://${replitUrl}/api/stripe/webhook`);
    console.log('Configure this URL in your Stripe Dashboard > Webhooks');
  }

  // Required environment variables check
  const requiredVars = [
    'STRIPE_SECRET_KEY',
    'STRIPE_PUBLISHABLE_KEY'
  ];

  const optionalVars = [
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PRO_PRICE_ID',
    'STRIPE_AUTHORITY_PRICE_ID'
  ];

  console.log('\n✅ Required Stripe Configuration:');
  requiredVars.forEach(varName => {
    const isSet = !!process.env[varName];
    console.log(`   ${isSet ? '✅' : '❌'} ${varName}: ${isSet ? 'Set' : 'Missing'}`);
  });

  console.log('\n⚠️  Optional Stripe Configuration:');
  optionalVars.forEach(varName => {
    const isSet = !!process.env[varName];
    console.log(`   ${isSet ? '✅' : '⚠️ '} ${varName}: ${isSet ? 'Set' : 'Not set'}`);
  });

  console.log('\n🚀 Stripe integration ready for TitleTesterPro!');
}

// ========================================
// EXPORT STRIPE SERVICE
// ========================================

export const stripeService = new StripeService();
export { StripeService };