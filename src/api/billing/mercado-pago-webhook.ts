/**
 * POST /api/billing/webhook/mercado-pago
 * Mercado Pago webhook: payment.created, payment.updated
 * Updates user_tiers table on successful subscription payment
 */

import { Request, Response } from 'express';
import { upsertUserTier } from '../../db/user-tiers.js';

interface MercadoPagoPayment {
  id: number;
  status: string;
  external_reference: string;
  payer: {
    email: string;
  };
  metadata?: Record<string, unknown>;
}

export const handleMercadoPagoWebhook = async (
  body: Record<string, unknown>,
): Promise<{ success: boolean; message: string; error?: string }> => {
  try {
    const { type, data } = body;

    // Mercado Pago sends topic (not type)
    const topic = (body.topic as string) || (type as string) || '';

    console.log(`[MP Webhook] Event: ${topic}`, { dataId: data });

    if (topic === 'payment' && data) {
      const paymentId = data as string;
      return await processPayment(paymentId);
    }

    // Handle simple payload (data directly is payment object)
    if (body.status && body.external_reference) {
      const payment = body as unknown as MercadoPagoPayment;
      return await processPaymentData(payment);
    }

    console.log('[MP Webhook] Unhandled event type:', topic);
    return {
      success: true,
      message: 'Event received',
    };
  } catch (err) {
    console.error('[MP Webhook] Processing failed:', err);
    return {
      success: false,
      error: String(err),
      message: 'Webhook processing failed',
    };
  }
};

async function processPayment(paymentId: string): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    const mpAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!mpAccessToken) {
      console.warn('[MP Webhook] Access token not configured');
      return {
        success: false,
        message: 'Mercado Pago access token not configured',
      };
    }

    // Fetch payment details from Mercado Pago API
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
      },
    });

    if (!response.ok) {
      console.error('[MP Webhook] Failed to fetch payment:', response.status);
      return {
        success: false,
        message: `Failed to fetch payment ${paymentId}`,
      };
    }

    const payment = (await response.json()) as MercadoPagoPayment;
    return await processPaymentData(payment);
  } catch (err) {
    console.error('[MP Webhook] Fetch failed:', err);
    return {
      success: false,
      error: String(err),
      message: 'Failed to process payment',
    };
  }
}

async function processPaymentData(payment: MercadoPagoPayment): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    // Parse external_reference: "userId:tier"
    const [userId, tier] = (payment.external_reference || '').split(':');

    if (!userId || !tier) {
      console.warn('[MP Webhook] Invalid external_reference:', payment.external_reference);
      return {
        success: false,
        message: 'Invalid external_reference',
      };
    }

    const email = payment.payer?.email || `user_${userId}@feedia.app`;

    // Payment approved: update tier
    if (payment.status === 'approved') {
      await upsertUserTier(userId, email, tier as 'pro' | 'agency', `mp_${payment.id}`);

      console.log(`[MP Webhook] User ${userId} upgraded to ${tier}`, { paymentId: payment.id });
      return {
        success: true,
        message: `Tier updated: ${tier}`,
      };
    }

    // Payment pending: log but don't update yet
    if (payment.status === 'pending') {
      console.log(`[MP Webhook] Payment pending for ${userId}`, { paymentId: payment.id });
      return {
        success: true,
        message: 'Payment pending',
      };
    }

    // Payment rejected/other: log
    console.warn(`[MP Webhook] Payment ${payment.status}:`, { paymentId: payment.id, userId, tier });
    return {
      success: true,
      message: `Payment ${payment.status}`,
    };
  } catch (err) {
    console.error('[MP Webhook] Data processing failed:', err);
    return {
      success: false,
      error: String(err),
      message: 'Data processing failed',
    };
  }
}

// Express route handler
export const mercadoPagoWebhookHandler = async (req: Request, res: Response): Promise<void> => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const result = await handleMercadoPagoWebhook(req.body);
    res.status(result.success ? 200 : 400).json(result);
  } catch (err) {
    console.error('[MP Webhook Handler] Error:', err);
    res.status(500).json({ error: String(err) });
  }
};
