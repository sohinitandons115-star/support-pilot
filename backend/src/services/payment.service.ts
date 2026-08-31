/**
 * System & Integration Concept: 3rd-Party API Integration
 * 
 * Demonstrates 3rd-Party Service Integration with Stripe Payment Gateway:
 * 1. Client SDK Initialization: Instantiates `Stripe` client with API secret key.
 * 2. Remote Session Generation: `stripe.checkout.sessions.create()` for handling subscriptions.
 * 3. Webhook Signature Verification: `stripe.webhooks.constructEvent()` for secure event processing.
 * 4. Fallback Mode: Provides graceful local simulation toggle when 3rd-party credentials are not configured.
 */

import Stripe from 'stripe';
import { prisma } from '../config/db';
import { logger } from '../utils/logger';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

let stripe: Stripe | null = null;
if (STRIPE_SECRET_KEY) {
  stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: '2024-04-10' as any
  });
}

export const createCheckoutSession = async (
  userId: string,
  priceId: string,
  successUrl: string,
  cancelUrl: string
): Promise<{ url: string; id: string }> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { subscription: true }
  });

  if (!user) {
    throw new Error('User not found');
  }

  // If Stripe is not configured, generate a local simulation checkout URL
  if (!stripe) {
    logger.warn('Stripe key is missing. Simulating checkout session.');
    const mockSessionId = `sess_mock_${Math.random().toString(36).substring(7)}`;
    return {
      url: `${successUrl}?session_id=${mockSessionId}&mock=true`,
      id: mockSessionId
    };
  }

  // Real Stripe session
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    customer_email: user.email,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl + '?session_id={CHECKOUT_SESSION_ID}',
    cancel_url: cancelUrl,
    metadata: {
      userId,
    },
  });

  return {
    url: session.url || '',
    id: session.id
  };
};

export const handleStripeWebhook = async (
  rawBody: string | Buffer,
  signature: string
): Promise<void> => {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    logger.error(`Stripe Webhook Signature Verification Failed: ${err.message}`);
    throw new Error(`Webhook Error: ${err.message}`);
  }

  logger.info(`Processing Stripe event: ${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerId = session.metadata?.userId;
      const subscriptionId = session.subscription as string;

      if (customerId) {
        await prisma.subscription.upsert({
          where: { customerId },
          update: {
            stripeSubscriptionId: subscriptionId,
            status: 'ACTIVE',
            tier: 'PRO'
          },
          create: {
            customerId,
            stripeSubscriptionId: subscriptionId,
            status: 'ACTIVE',
            tier: 'PRO'
          }
        });
        logger.info(`Subscription set to PRO for customer: ${customerId}`);
      }
      break;
    }
    case 'customer.subscription.deleted':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const stripeSubscriptionId = subscription.id;
      const status = subscription.status === 'active' ? 'ACTIVE' : 
                     subscription.status === 'past_due' ? 'PAST_DUE' : 'CANCELED';
      const tier = status === 'ACTIVE' ? 'PRO' : 'FREE';

      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId },
        data: {
          status: status as any,
          tier: tier as any
        }
      });
      logger.info(`Subscription ${stripeSubscriptionId} status updated to ${status}`);
      break;
    }
    default:
      logger.debug(`Unhandled event type: ${event.type}`);
  }
};

// Local simulation endpoint helper to upgrade user without real Stripe
export const simulatePaymentUpgrade = async (userId: string): Promise<any> => {
  logger.info(`Simulating payment upgrade for user: ${userId}`);
  const sub = await prisma.subscription.upsert({
    where: { customerId: userId },
    update: {
      status: 'ACTIVE',
      tier: 'PRO',
      stripeSubscriptionId: `sub_mock_${Math.random().toString(36).substring(7)}`
    },
    create: {
      customerId: userId,
      status: 'ACTIVE',
      tier: 'PRO',
      stripeSubscriptionId: `sub_mock_${Math.random().toString(36).substring(7)}`
    }
  });
  
  await prisma.payment.create({
    data: {
      customerId: userId,
      amount: 19.99,
      currency: 'usd',
      status: 'SUCCESSFUL',
      stripePaymentIntentId: `pi_mock_${Math.random().toString(36).substring(7)}`
    }
  });

  return sub;
};
