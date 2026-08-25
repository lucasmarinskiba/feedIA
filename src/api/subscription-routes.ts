/**
 * Subscription lifecycle management
 * Handles payment webhooks, subscription status, cancellation, reactivation
 */

import { Router, Request, Response } from 'express';
import { log } from '../agent/logger.js';
import {
  getUserTier,
  updateSubscriptionStatus,
  isSubscriptionActive,
  renewSubscription,
  cancelSubscription,
  reactivateSubscription,
  linkMercadoPagoSubscription,
} from '../db/user-tiers.js';
import {
  updatePaymentStatus,
  getPaymentHistory,
  logSubscriptionEvent,
  getOAuthToken,
  isTokenExpired,
} from '../db/payments-tokens.js';

const router = Router();

/**
 * Mercado Pago webhook handler
 * Called when payment status changes
 */
router.post('/webhook/mercado-pago', async (req: Request, res: Response) => {
  try {
    const { type, data } = req.body;

    if (type === 'payment') {
      const paymentId = data.id;
      const mpStatus = data.status;

      // Find payment in our system
      const result = await getPaymentHistory('', 1000); // Get all (TODO: index by provider ID)
      const payment = result.find((p) => p.providerPaymentId === String(paymentId));

      if (!payment) {
        log.warn('[MP Webhook] Payment not found', { paymentId });
        return res.json({ ok: true }); // Don't error, MP retries
      }

      const userId = payment.userId;
      const tierData = await getUserTier(userId);

      if (!tierData) {
        log.error('[MP Webhook] User not found', { userId, paymentId });
        return res.json({ ok: true });
      }

      // Handle status changes
      if (mpStatus === 'approved') {
        // Payment succeeded
        await updatePaymentStatus(payment.id, 'completed');

        // If first payment, link subscription to Mercado Pago
        if (tierData.paymentProvider !== 'mercado_pago') {
          const mpCustomerId = data.payer?.id || String(paymentId);
          const preferenceId = data.preference_id || '';
          await linkMercadoPagoSubscription(userId, mpCustomerId, preferenceId, tierData.tier);
        }

        await renewSubscription(userId);
        await logSubscriptionEvent(userId, 'payment.approved', 'mercado_pago', String(paymentId), data);
        log.info('[MP Webhook] Payment approved', { userId, paymentId, tier: tierData.tier });
      } else if (mpStatus === 'rejected' || mpStatus === 'cancelled') {
        // Payment failed
        await updatePaymentStatus(payment.id, 'failed', mpStatus);
        await updateSubscriptionStatus(userId, 'failed_payment');
        await logSubscriptionEvent(userId, 'payment.failed', 'mercado_pago', String(paymentId), data);
        log.warn('[MP Webhook] Payment failed', { userId, paymentId, reason: mpStatus });
      } else if (mpStatus === 'pending') {
        await logSubscriptionEvent(userId, 'payment.pending', 'mercado_pago', String(paymentId), data);
      }

      res.json({ ok: true });
    } else {
      res.json({ ok: true }); // Ignore other event types
    }
  } catch (err) {
    log.error('[MP Webhook] Error', { error: String(err) });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Get subscription details for user
 */
router.get('/subscription/status', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'User ID required' });

    const tier = await getUserTier(userId);
    if (!tier) return res.status(404).json({ error: 'User not found' });

    const isActive = await isSubscriptionActive(userId);
    const now = new Date();
    const daysUntilRenewal = tier.subscriptionCycleEnd
      ? Math.ceil((tier.subscriptionCycleEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    res.json({
      userId,
      tier: tier.tier,
      status: tier.subscriptionStatus,
      isActive,
      subscriptionCycleStart: tier.subscriptionCycleStart,
      subscriptionCycleEnd: tier.subscriptionCycleEnd,
      nextBillingDate: tier.nextBillingDate,
      lastPaymentDate: tier.lastPaymentDate,
      daysUntilRenewal,
      paymentProvider: tier.paymentProvider,
      autoRenew: tier.autoRenew,
      monthlyPriceUsd: tier.monthlyPriceUsd,
      monthlyPriceArs: tier.monthlyPriceArs,
    });
  } catch (err) {
    log.error('[Subscription Status] Error', { error: String(err) });
    res.status(500).json({ error: 'Failed to fetch subscription status' });
  }
});

/**
 * Cancel subscription
 */
router.post('/subscription/cancel', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'User ID required' });

    const tier = await getUserTier(userId);
    if (!tier) return res.status(404).json({ error: 'User not found' });

    const success = await cancelSubscription(userId);
    if (!success) return res.status(500).json({ error: 'Cancellation failed' });

    await logSubscriptionEvent(userId, 'subscription.canceled', tier.paymentProvider);
    log.info('[Subscription] Canceled', { userId, tier: tier.tier });

    res.json({ ok: true, status: 'canceled' });
  } catch (err) {
    log.error('[Subscription Cancel] Error', { error: String(err) });
    res.status(500).json({ error: 'Cancellation failed' });
  }
});

/**
 * Reactivate canceled subscription
 */
router.post('/subscription/reactivate', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'User ID required' });

    const tier = await getUserTier(userId);
    if (!tier) return res.status(404).json({ error: 'User not found' });

    if (tier.subscriptionStatus !== 'canceled') {
      return res.status(400).json({ error: 'Subscription is not canceled' });
    }

    const success = await reactivateSubscription(userId);
    if (!success) return res.status(500).json({ error: 'Reactivation failed' });

    await logSubscriptionEvent(userId, 'subscription.reactivated', tier.paymentProvider);
    log.info('[Subscription] Reactivated', { userId, tier: tier.tier });

    res.json({ ok: true, status: 'active' });
  } catch (err) {
    log.error('[Subscription Reactivate] Error', { error: String(err) });
    res.status(500).json({ error: 'Reactivation failed' });
  }
});

/**
 * Retry failed payment
 */
router.post('/subscription/retry-payment', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'User ID required' });

    const tier = await getUserTier(userId);
    if (!tier) return res.status(404).json({ error: 'User not found' });

    if (tier.subscriptionStatus !== 'failed_payment') {
      return res.status(400).json({ error: 'No failed payment to retry' });
    }

    // In production, this would trigger a payment retry via Mercado Pago API
    // For now, log the attempt
    await logSubscriptionEvent(userId, 'payment.retry_requested', tier.paymentProvider);

    res.json({
      ok: true,
      message: 'Payment retry initiated. You will receive confirmation email shortly.',
      status: 'pending',
    });
  } catch (err) {
    log.error('[Payment Retry] Error', { error: String(err) });
    res.status(500).json({ error: 'Retry failed' });
  }
});

/**
 * Get payment history
 */
router.get('/payment-history', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'User ID required' });

    const limit = Math.min(Number(req.query.limit) || 20, 100);
    const payments = await getPaymentHistory(userId, limit);

    res.json({ payments });
  } catch (err) {
    log.error('[Payment History] Error', { error: String(err) });
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

/**
 * Check and refresh Instagram OAuth token if expired
 */
router.post('/oauth/instagram/refresh', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'User ID required' });

    const isExpired = await isTokenExpired(userId, 'instagram_oauth');
    if (!isExpired) {
      // Token still valid
      const token = await getOAuthToken(userId, 'instagram_oauth');
      return res.json({
        ok: true,
        message: 'Token still valid',
        expiresAt: token?.expiresAt,
      });
    }

    // Token expired — would call Instagram API to refresh
    // For now, log and return error
    log.warn('[OAuth Refresh] Token expired, needs refresh', { userId });

    res.status(401).json({
      error: 'Instagram token expired',
      action: 'please_reconnect',
      redirectUrl: '/oauth/instagram/connect',
    });
  } catch (err) {
    log.error('[OAuth Refresh] Error', { error: String(err) });
    res.status(500).json({ error: 'Token refresh failed' });
  }
});

/**
 * Update payment method
 */
router.put('/payment-method', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'User ID required' });

    const { provider } = req.body;

    if (!['mercado_pago', 'stripe'].includes(provider)) {
      return res.status(400).json({ error: 'Invalid payment provider' });
    }

    // In production, this would update the payment method on file
    // For now, just log the request
    log.info('[Payment Method] Update requested', { userId, provider });

    res.json({
      ok: true,
      message: 'Redirecting to payment method update...',
    });
  } catch (err) {
    log.error('[Payment Method] Error', { error: String(err) });
    res.status(500).json({ error: 'Update failed' });
  }
});

export default router;
