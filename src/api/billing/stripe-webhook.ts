/**
 * POST /api/billing/webhook/stripe
 * Stripe webhook: subscription.created, customer.subscription.updated, customer.subscription.deleted
 * Updates user_tiers table on successful payment
 */

import { Request, Response } from 'express';
import Stripe from 'stripe';
import { upsertUserTier, linkStripeSubscription } from '../../db/user-tiers.js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2024-12-18' as unknown as '2024-12-18',
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export const handleStripeWebhook = async (
  body: Buffer,
  signature: string | string[] | undefined,
): Promise<{ success: boolean; message: string; error?: string }> => {
  try {
    if (!webhookSecret) {
      console.warn('[Stripe] Webhook secret not configured. Skipping validation.');
      // Parse unsigned for local dev
      const event = JSON.parse(body.toString());
      return processEvent(event);
    }

    // Verify signature (prod)
    const sig = Array.isArray(signature) ? signature[0] : signature || '';
    const event = stripe.webhooks.constructEvent(body, sig, webhookSecret);

    return processEvent(event);
  } catch (err) {
    console.error('[Stripe Webhook] Verification failed:', err);
    return {
      success: false,
      error: String(err),
      message: 'Webhook verification failed',
    };
  }
};

async function processEvent(event: Stripe.Event): Promise<{ success: boolean; message: string; error?: string }> {
  const eventType = event.type;
  const data = event.data.object as unknown;

  console.log(`[Stripe Webhook] Event: ${eventType}`);

  try {
    switch (eventType) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        // Subscription active: update user tier
        const subscription = data as Stripe.Subscription;
        const metadata = subscription.metadata || {};
        const userId = metadata.userId || data.client_reference_id;
        const tier = (metadata.tier as 'pro' | 'agency') || 'pro';

        if (!userId) {
          console.warn('[Stripe] No userId in subscription metadata');
          return {
            success: false,
            message: 'Missing userId in subscription',
          };
        }

        const email = subscription.customer_email || `user_${userId}@feedia.app`;

        // Upsert tier in DB
        await upsertUserTier(userId, email, tier, subscription.customer as string);

        // Link Stripe subscription
        const endDate = new Date((subscription.current_period_end || Date.now() / 1000) * 1000);
        await linkStripeSubscription(userId, subscription.customer as string, subscription.id, endDate);

        console.log(`[Stripe] User ${userId} upgraded to ${tier}`);
        return {
          success: true,
          message: `Tier updated: ${tier}`,
        };
      }

      case 'customer.subscription.deleted': {
        // Subscription cancelled: downgrade to free
        const subscription = data as Stripe.Subscription;
        const metadata = subscription.metadata || {};
        const userId = metadata.userId || data.client_reference_id;

        if (userId) {
          const email = subscription.customer_email || `user_${userId}@feedia.app`;
          await upsertUserTier(userId, email, 'free');
          console.log(`[Stripe] User ${userId} downgraded to free (subscription cancelled)`);
        }

        return {
          success: true,
          message: 'Subscription cancelled, tier downgraded to free',
        };
      }

      case 'invoice.payment_failed': {
        // Payment failed: log but don't downgrade yet (allow retry period)
        const invoice = data as Stripe.Invoice;
        console.warn(`[Stripe] Payment failed for invoice ${invoice.id}`);

        return {
          success: true,
          message: 'Payment failed (logged)',
        };
      }

      default: {
        console.log(`[Stripe] Unhandled event: ${eventType}`);
        return {
          success: true,
          message: 'Event received but not processed',
        };
      }
    }
  } catch (err) {
    console.error('[Stripe Webhook] Processing failed:', err);
    return {
      success: false,
      error: String(err),
      message: 'Event processing failed',
    };
  }
}

// Express route handler
export const stripeWebhookHandler = async (req: Request, res: Response): Promise<void> => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const buf = (req as unknown as { rawBody?: Buffer }).rawBody || Buffer.alloc(0);
    const signature = req.headers['stripe-signature'] as string;

    const result = await handleStripeWebhook(buf, signature);

    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    console.error('[Stripe Webhook Route] Error:', err);
    res.status(500).json({ error: String(err) });
  }
};
