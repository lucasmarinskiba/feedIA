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
  carouselsLimit: number;
  carouselsUsed: number;
  storiesLimit: number;
  storiesUsed: number;
  videosLimit: number;
  videosUsed: number;
  profilesLimit: number;
  storageGb: number;
  customBrandKit: boolean;
  analyticsDepth: string;
  supportLevel: string;
  subscriptionEndDate: string | null;
  // Next 1st-of-month UTC — matches the exact trigger condition
  // startMonthlyUsageResetScheduler() in server.ts checks (now.getUTCDate() ===
  // 1), so this date is when usage actually goes back to 0, not an estimate.
  resetsAt: string;
  error?: string;
}

const nextResetDate = (): string => {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0));
  return next.toISOString();
};

const FREE_DEFAULTS = {
  tier: 'free',
  campaignsLimit: 5,
  campaignsUsed: 0,
  campaignsRemaining: 5,
  batchLimit: 1,
  carouselsLimit: 3,
  carouselsUsed: 0,
  storiesLimit: 2,
  storiesUsed: 0,
  videosLimit: 0,
  videosUsed: 0,
  profilesLimit: 1,
  storageGb: 0.5,
  customBrandKit: false,
  analyticsDepth: 'basic',
  supportLevel: 'community',
  subscriptionEndDate: null,
} as const;

const buildFreeDefaults = () => ({ ...FREE_DEFAULTS, resetsAt: nextResetDate() });

export const getTierInfo = async (userId: string): Promise<GetTierResponse> => {
  try {
    const tierRecord = await getUserTier(userId);

    if (!tierRecord) {
      return {
        success: false,
        ...buildFreeDefaults(),
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
      carouselsLimit: tierRecord.carouselsLimit,
      carouselsUsed: tierRecord.carouselsUsedThisMonth,
      storiesLimit: tierRecord.storiesLimit,
      storiesUsed: tierRecord.storiesUsedThisMonth,
      videosLimit: tierRecord.videosLimit,
      videosUsed: tierRecord.videosUsedThisMonth,
      profilesLimit: tierRecord.profilesLimit,
      storageGb: tierRecord.storageGb,
      customBrandKit: tierRecord.customBrandKit,
      analyticsDepth: tierRecord.analyticsDepth,
      supportLevel: tierRecord.supportLevel,
      subscriptionEndDate: tierRecord.subscriptionEndDate?.toISOString() || null,
      resetsAt: nextResetDate(),
    };
  } catch (err) {
    console.error('[GetTier] Failed:', err);
    return {
      success: false,
      ...buildFreeDefaults(),
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
