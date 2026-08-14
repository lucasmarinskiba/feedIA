/**
 * POST /api/billing/create-checkout-session
 * Mercado Pago subscription checkout for tier upgrades
 * Integration: MP → webhook → user_tiers DB
 */

import { Request, Response } from 'express';

export interface CheckoutSessionRequest {
  tier: 'pro' | 'agency';
  email?: string;
  userId?: string;
}

export interface CheckoutSessionResponse {
  url?: string;
  preferenceId?: string;
  error?: string;
}

const tierConfig: Record<string, { price: number; reason: string }> = {
  pro: { price: 79, reason: 'Monthly pro plan - 50 campaigns' },
  agency: { price: 499, reason: 'Monthly agency plan - 500 campaigns' },
};

export const createCheckoutSession = async (req: CheckoutSessionRequest): Promise<CheckoutSessionResponse> => {
  try {
    const { tier, email, userId } = req;

    if (!tier || !email || !userId) {
      return { error: 'Missing required fields: tier, email, userId' };
    }

    const mpAccessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!mpAccessToken) {
      console.warn('[MP Checkout] Access token not configured, returning mock');
      return {
        preferenceId: `mock_${tier}_${userId}`,
        url: 'https://www.mercadopago.com.ar/checkout/v1/redirect?preference-id=mock',
      };
    }

    const tierData = tierConfig[tier];
    const preferencePayload = {
      items: [
        {
          title: `FeedIA ${tier.toUpperCase()} Plan`,
          description: tierData.reason,
          quantity: 1,
          unit_price: tierData.price,
          currency_id: 'ARS',
        },
      ],
      payer: {
        email,
      },
      back_urls: {
        success: 'https://feedia.vercel.app/#checkout-success',
        failure: 'https://feedia.vercel.app/#checkout-failure',
        pending: 'https://feedia.vercel.app/#checkout-pending',
      },
      auto_return: 'approved',
      external_reference: `${userId}:${tier}`,
      metadata: {
        userId,
        tier,
      },
    };

    const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mpAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferencePayload),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[MP Checkout] API error:', error);
      return { error: `Mercado Pago error: ${error}` };
    }

    interface MercadoPagoPreference {
      id: string;
      init_point: string;
    }
    const pref = (await response.json()) as MercadoPagoPreference;

    console.log('[MP Checkout] Created preference:', { prefId: pref.id, tier, userId });
    return {
      preferenceId: pref.id,
      url: pref.init_point,
    };
  } catch (err) {
    console.error('[MP Checkout] Failed:', err);
    return { error: String(err) };
  }
};

// Handler for Express route
export const checkoutSessionHandler = async (req: Request, res: Response): Promise<void> => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const result = await createCheckoutSession(req.body);
  res.status(result.error ? 400 : 200).json(result);
};
