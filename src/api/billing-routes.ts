/**
 * Billing API Routes
 * /api/billing/* endpoints for Stripe + Mercado Pago integration, tier management, usage tracking
 */

import { Router, Request, Response } from 'express';
import { handleMercadoPagoWebhook } from './billing/mercado-pago-webhook.js';
import { createCheckoutSession } from './billing/create-checkout-session.js';
import { saveTier } from './billing/save-tier.js';
import { getTierInfo } from './user/tier.js';
import { handleStripeWebhook } from './billing/stripe-webhook.js';
import {
  trackUsage,
  getMonthlyUsage,
  getBillingStatus,
  recordBillingTransaction,
} from '../services/billing-manager.js';
import { getBillingStatus as getWebhookStatus } from '../services/webhook-service.js';
import {
  registerWebhook,
  unregisterWebhook,
  getUserWebhooks,
  processPendingWebhooks,
} from '../services/webhook-service.js';
import { hasFeatureAccess } from '../middleware/feature-flags.js';
import { tierConfig } from '../db/user-tiers.js';

const router = Router();

/**
 * ========== STRIPE WEBHOOK ==========
 * Receives Stripe subscription events
 */
router.post('/webhook/stripe', async (req: Request, res: Response): Promise<void> => {
  try {
    const buf = (req as unknown as { rawBody?: Buffer }).rawBody || Buffer.alloc(0);
    const signature = req.headers['stripe-signature'] as string | undefined;

    const result = await handleStripeWebhook(buf, signature);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    console.error('[Billing] Stripe Webhook error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * ========== STRIPE CHECKOUT ==========
 * Create Stripe checkout session for tier upgrades
 */
router.post('/stripe/checkout', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, tier, email } = req.body;

    if (!userId || !tier || !email) {
      res.status(400).json({ error: 'Missing required fields: userId, tier, email' });
      return;
    }

    const paidTierConfig = (tierConfig as Record<string, { monthlyPriceUsd: number } | undefined>)[tier];
    if (tier === 'free' || !paidTierConfig) {
      res.status(400).json({ error: `Invalid paid tier: ${tier}` });
      return;
    }

    // Check if Stripe is configured
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey || stripeKey.startsWith('sk_test_mock')) {
      res.status(503).json({
        error: 'Stripe not configured',
        message: 'Stripe keys not set. Using mock mode.',
      });
      return;
    }

    const Stripe = require('stripe');
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18' });

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      client_reference_id: userId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `FeedIA ${tier.toUpperCase()} Plan`,
            },
            unit_amount: Math.round(paidTierConfig.monthlyPriceUsd * 100),
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONTEND_URL || 'https://feedia.vercel.app'}/#checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL || 'https://feedia.vercel.app'}/#checkout/cancel`,
      metadata: {
        userId,
        tier,
      },
    });

    res.json({
      success: true,
      sessionId: session.id,
      clientSecret: session.client_secret,
      url: session.url,
    });
  } catch (err) {
    console.error('[Billing] Stripe checkout error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * ========== MERCADO PAGO WEBHOOK ==========
 */
router.post('/webhook/mercado-pago', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await handleMercadoPagoWebhook(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    console.error('[Billing] MP Webhook error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * ========== CHECKOUT SESSION ==========
 * Create Mercado Pago checkout session
 */
router.post('/create-checkout-session', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await createCheckoutSession(req.body);
    res.status(200).json(result);
  } catch (err) {
    console.error('[Billing] Checkout session error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * ========== SAVE TIER ==========
 * Free tier signup
 */
router.post('/save-tier', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await saveTier(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    console.error('[Billing] Save tier error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * ========== GET TIER INFO ==========
 */
router.get('/tier', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'userId query param required' });
      return;
    }

    const result = await getTierInfo(String(userId));
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    console.error('[Billing] Get tier error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * ========== USAGE TRACKING ==========
 * Track API usage and costs
 */
router.post('/track-usage', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, service, metadata } = req.body;

    if (!userId || !service) {
      res.status(400).json({ error: 'Missing required fields: userId, service' });
      return;
    }

    const result = await trackUsage(userId, service, metadata);

    if (!result.success) {
      res.status(402).json({
        error: 'Usage tracking failed',
        reason: result.error,
        cost: result.cost,
      });
      return;
    }

    res.json({
      success: true,
      cost: result.cost,
    });
  } catch (err) {
    console.error('[Billing] Track usage error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * ========== BILLING STATUS ==========
 * Get current month usage and budget
 */
router.get('/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'userId query param required' });
      return;
    }

    const status = await getBillingStatus(String(userId));
    res.json({ success: true, status });
  } catch (err) {
    console.error('[Billing] Get status error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * ========== MONTHLY USAGE ==========
 * Get total usage cost for current month
 */
router.get('/monthly-usage', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'userId query param required' });
      return;
    }

    const usage = await getMonthlyUsage(String(userId));
    res.json({ success: true, usage });
  } catch (err) {
    console.error('[Billing] Get monthly usage error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * ========== WEBHOOKS: REGISTER ==========
 * Register user webhook subscription
 */
router.post('/webhooks/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, url, events } = req.body;

    if (!userId || !url || !events) {
      res.status(400).json({ error: 'Missing required fields: userId, url, events' });
      return;
    }

    // Check feature access
    const hasAccess = await hasFeatureAccess(userId, 'api_webhooks');
    if (!hasAccess.allowed) {
      res.status(403).json({
        error: 'Feature not available',
        reason: hasAccess.reason,
      });
      return;
    }

    const subscription = await registerWebhook(userId, url, events);
    res.status(201).json({ success: true, subscription });
  } catch (err) {
    console.error('[Billing] Register webhook error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * ========== WEBHOOKS: LIST ==========
 * List user's webhook subscriptions
 */
router.get('/webhooks', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'userId query param required' });
      return;
    }

    const webhooks = await getUserWebhooks(String(userId));
    res.json({ success: true, webhooks });
  } catch (err) {
    console.error('[Billing] List webhooks error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * ========== WEBHOOKS: UNREGISTER ==========
 * Unregister webhook subscription
 */
router.delete('/webhooks/:subscriptionId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { subscriptionId } = req.params;
    const { userId } = req.query;

    if (!subscriptionId || !userId) {
      res.status(400).json({ error: 'Missing subscriptionId or userId' });
      return;
    }

    // Verify ownership (simple check)
    const webhooks = await getUserWebhooks(String(userId));
    const owned = webhooks.some((wh) => wh.id === subscriptionId);

    if (!owned) {
      res.status(403).json({ error: 'Not authorized' });
      return;
    }

    const success = await unregisterWebhook(subscriptionId);
    res.json({ success });
  } catch (err) {
    console.error('[Billing] Unregister webhook error:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * ========== WEBHOOKS: PROCESS PENDING ==========
 * Admin endpoint to process pending webhooks (run via cron)
 */
router.post('/webhooks/process-pending', async (req: Request, res: Response): Promise<void> => {
  try {
    // Verify admin key
    const adminKey = req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_KEY) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const processed = await processPendingWebhooks();
    res.json({ success: true, processed });
  } catch (err) {
    console.error('[Billing] Process webhooks error:', err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
