/**
 * POST /api/billing/save-tier
 * Save user tier preference to database (free tier signup)
 */

import { Request, Response } from 'express';
import { upsertUserTier } from '../../db/user-tiers.js';

export interface SaveTierRequest {
  userId: string;
  email: string;
  tier: 'free' | 'pro' | 'agency';
  stripeCustomerId?: string;
}

export interface SaveTierResponse {
  success: boolean;
  userId: string;
  tier: string;
  message?: string;
  error?: string;
}

export const saveTier = async (req: SaveTierRequest): Promise<SaveTierResponse> => {
  try {
    const { userId, email, tier, stripeCustomerId } = req;

    if (!userId || !email) {
      return {
        success: false,
        userId,
        tier,
        error: 'userId and email required',
      };
    }

    const result = await upsertUserTier(userId, email, tier, stripeCustomerId);

    return {
      success: true,
      userId: result.userId,
      tier: result.tier,
      message: `Tier saved: ${tier}`,
    };
  } catch (err) {
    console.error('[SaveTier] Failed:', err);
    return {
      success: false,
      userId: req.userId,
      tier: req.tier,
      error: String(err),
    };
  }
};

// Express route handler
export const saveTierHandler = async (req: Request, res: Response): Promise<void> => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const result = await saveTier(req.body);
  res.status(result.success ? 200 : 400).json(result);
};
