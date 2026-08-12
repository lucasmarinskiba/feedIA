/**
 * GET /api/user/tier?userId=X
 * Fetch user tier info + campaign usage
 * Used by app to enforce limits + display tier features
 */

import { Request, Response } from 'express';
import { getUserTier } from '../../db/user-tiers.js';

export interface GetTierResponse {
  success: boolean;
  tier: string | null;
  campaignsLimit: number;
  campaignsUsed: number;
  campaignsRemaining: number;
  batchLimit: number;
  customBrandKit: boolean;
  analyticsDepth: string;
  supportLevel: string;
  subscriptionEndDate: string | null;
  error?: string;
}

export const getTierInfo = async (userId: string): Promise<GetTierResponse> => {
  try {
    const tierRecord = await getUserTier(userId);

    if (!tierRecord) {
      return {
        success: false,
        tier: 'free',
        campaignsLimit: 5,
        campaignsUsed: 0,
        campaignsRemaining: 5,
        batchLimit: 1,
        customBrandKit: false,
        analyticsDepth: 'basic',
        supportLevel: 'community',
        subscriptionEndDate: null,
        error: 'User tier not found, defaulting to free',
      };
    }

    return {
      success: true,
      tier: tierRecord.tier,
      campaignsLimit: tierRecord.campaignsLimit,
      campaignsUsed: tierRecord.campaignsUsedThisMonth,
      campaignsRemaining: tierRecord.campaignsLimit - tierRecord.campaignsUsedThisMonth,
      batchLimit: tierRecord.batchLimit,
      customBrandKit: tierRecord.customBrandKit,
      analyticsDepth: tierRecord.analyticsDepth,
      supportLevel: tierRecord.supportLevel,
      subscriptionEndDate: tierRecord.subscriptionEndDate?.toISOString() || null,
    };
  } catch (err) {
    console.error('[GetTier] Failed:', err);
    return {
      success: false,
      tier: 'free',
      campaignsLimit: 5,
      campaignsUsed: 0,
      campaignsRemaining: 5,
      batchLimit: 1,
      customBrandKit: false,
      analyticsDepth: 'basic',
      supportLevel: 'community',
      subscriptionEndDate: null,
      error: String(err),
    };
  }
};

// Express route handler
export const getTierHandler = async (req: Request, res: Response): Promise<void> => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { userId } = req.query;

  if (!userId) {
    res.status(400).json({ error: 'userId query param required' });
    return;
  }

  const result = await getTierInfo(String(userId));
  res.status(result.success ? 200 : 400).json(result);
};
