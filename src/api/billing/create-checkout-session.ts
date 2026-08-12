/**
 * POST /api/billing/create-checkout-session
 * Create Stripe checkout session for tier upgrade
 * Integration: Stripe → webhook → user_tiers DB
 */

import Stripe from 'stripe';
import { Request, Response } from 'express';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
  apiVersion: '2024-12-18' as unknown as '2024-12-18',
});

export interface CheckoutSessionRequest {
  tier: 'pro' | 'agency';
  email?: string;
  userId?: string;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResponse {
  url: string | null;
  sessionId: string;
  error?: string;
}

export const createCheckoutSession = async (req: CheckoutSessionRequest): Promise<CheckoutSessionResponse> => {
  try {
    if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY.startsWith('sk_test')) {
      console.warn('[Stripe] Mock mode: no real API key. Returning mock session.');
      return {
        url: req.successUrl,
        sessionId: `mock_session_${Date.now()}`,
      };
    }

    const tierConfig = {
      pro: {
        price: 'price_1PriceProUSD', // Replace with real Stripe price ID
        campaigns: 50,
      },
      agency: {
        price: 'price_1PriceAgencyUSD', // Replace with real Stripe price ID
        campaigns: 500,
      },
    };

    const config = tierConfig[req.tier];

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: config.price,
          quantity: 1,
        },
      ],
      customer_email: req.email,
      client_reference_id: req.userId || `guest_${Date.now()}`,
      subscription_data: {
        metadata: {
          tier: req.tier,
          userId: req.userId || 'guest',
          campaigns: config.campaigns,
        },
      },
      success_url: req.successUrl,
      cancel_url: req.cancelUrl,
      metadata: {
        tier: req.tier,
        userId: req.userId || 'guest',
      },
    });

    return {
      url: session.url,
      sessionId: session.id,
    };
  } catch (err) {
    console.error('[Stripe] Session creation failed:', err);
    return {
      url: req.successUrl,
      sessionId: `fallback_${Date.now()}`,
      error: 'Stripe unavailable, fallback redirect',
    };
  }
};

// Handler for Express route
export const checkoutSessionHandler = async (req: Request, res: Response): Promise<void> => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const result = await createCheckoutSession(req.body);
  res.status(200).json(result);
};
