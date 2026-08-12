/**
 * Billing API Routes
 * /api/billing/* endpoints for Stripe integration + tier management
 */

import { Router, Request, Response } from 'express';
import { handleStripeWebhook } from './billing/stripe-webhook.js';
import { createCheckoutSession } from './billing/create-checkout-session.js';
import { saveTier } from './billing/save-tier.js';
import { getTierInfo } from './user/tier.js';

const router = Router();

// Webhook: Stripe events (subscription updates)
router.post('/webhook/stripe', async (req: Request, res: Response): Promise<void> => {
  try {
    const buf = (req as unknown as { rawBody?: Buffer }).rawBody || Buffer.alloc(0);
    const signature = req.headers['stripe-signature'] as string;

    const result = await handleStripeWebhook(buf, signature);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    console.error('[Billing] Webhook error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// Create Stripe checkout session
router.post('/create-checkout-session', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await createCheckoutSession(req.body);
    res.status(200).json(result);
  } catch (err) {
    console.error('[Billing] Checkout session error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// Save tier (free tier signup)
router.post('/save-tier', async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await saveTier(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    console.error('[Billing] Save tier error:', err);
    res.status(500).json({ error: String(err) });
  }
});

// Get user tier info
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

export default router;
