/**
 * Tier Enforcement Middleware
 * Validates user tier against app limits (campaigns/mo, batch size, usage budget, etc.)
 */

import { getUserTier, incrementCampaignUsage } from '../db/user-tiers.js';
import { canProceed as canProceedBilling } from '../services/billing-manager.js';

export interface TierContext {
  userId: string;
  tier: 'free' | 'pro' | 'agency';
  campaignsRemaining: number;
  batchLimit: number;
  customBrandKit: boolean;
  analyticsDepth: 'basic' | 'advanced';
  supportLevel: 'community' | 'email' | '24h-priority';
}

export const validateTierAccess = async (
  userId: string,
  campaignCount: number = 1,
): Promise<{ allowed: boolean; context: TierContext | null; reason?: string }> => {
  try {
    const tierRecord = await getUserTier(userId);

    if (!tierRecord) {
      return {
        allowed: false,
        context: null,
        reason: 'User tier not found',
      };
    }

    // Check campaign usage
    const campaignsRemaining = tierRecord.campaignsLimit - tierRecord.campaignsUsedThisMonth;
    if (campaignsRemaining < campaignCount) {
      return {
        allowed: false,
        context: {
          userId,
          tier: tierRecord.tier,
          campaignsRemaining,
          batchLimit: tierRecord.batchLimit,
          customBrandKit: tierRecord.customBrandKit,
          analyticsDepth: tierRecord.analyticsDepth,
          supportLevel: tierRecord.supportLevel,
        },
        reason: `Campaign limit exceeded. ${campaignsRemaining} remaining, need ${campaignCount}`,
      };
    }

    // Record usage
    await incrementCampaignUsage(userId, campaignCount);

    return {
      allowed: true,
      context: {
        userId,
        tier: tierRecord.tier,
        campaignsRemaining: campaignsRemaining - campaignCount,
        batchLimit: tierRecord.batchLimit,
        customBrandKit: tierRecord.customBrandKit,
        analyticsDepth: tierRecord.analyticsDepth,
        supportLevel: tierRecord.supportLevel,
      },
    };
  } catch (err) {
    console.error('[TierEnforcer] Validation failed:', err);
    // Deny on error (safe)
    return {
      allowed: false,
      context: null,
      reason: 'Tier validation error',
    };
  }
};

export const validateBatchSize = (
  userId: string,
  batchSize: number,
  userBatchLimit: number,
): { allowed: boolean; reason?: string } => {
  if (batchSize > userBatchLimit) {
    return {
      allowed: false,
      reason: `Batch size ${batchSize} exceeds limit ${userBatchLimit}`,
    };
  }

  return { allowed: true };
};

export const checkFeatureAccess = (
  tier: 'free' | 'pro' | 'agency',
  feature: 'customBrandKit' | 'analytics' | 'api_access' | 'webhooks' | 'priority_support',
): boolean => {
  const features = {
    free: { customBrandKit: false, analytics: false, api_access: false, webhooks: false, priority_support: false },
    pro: { customBrandKit: true, analytics: true, api_access: false, webhooks: false, priority_support: false },
    agency: { customBrandKit: true, analytics: true, api_access: true, webhooks: true, priority_support: true },
  };

  return features[tier][feature] ?? false;
};

/**
 * Validate access considering both campaign limits and billing budget
 */
export const validateAccessWithBilling = async (
  userId: string,
  campaignCount: number = 1,
  service: 'api_call' | 'content_generation' | 'image_upscale' | 'video_generation' = 'api_call',
): Promise<{
  allowed: boolean;
  context: TierContext | null;
  reason?: string;
  billingStatus?: { budgetRemaining: number };
}> => {
  try {
    // Check campaign tier limits
    const tierResult = await validateTierAccess(userId, campaignCount);
    if (!tierResult.allowed) {
      return {
        allowed: false,
        context: tierResult.context,
        reason: tierResult.reason,
      };
    }

    // Check billing budget
    const billingResult = await canProceedBilling(userId, service);
    if (!billingResult.allowed) {
      return {
        allowed: false,
        context: tierResult.context,
        reason: billingResult.reason,
        billingStatus: {
          budgetRemaining: billingResult.budgetRemaining || 0,
        },
      };
    }

    return {
      allowed: true,
      context: tierResult.context,
      billingStatus: {
        budgetRemaining: billingResult.budgetRemaining || 0,
      },
    };
  } catch (err) {
    console.error('[TierEnforcer] Validation with billing error:', err);
    return {
      allowed: false,
      context: null,
      reason: 'Tier validation error',
    };
  }
};
