/**
 * Tier Enforcement Middleware
 * Validates user tier against app limits (campaigns/mo, batch size, usage budget, etc.)
 */

import {
  getUserTier,
  incrementCampaignUsage,
  incrementFormatUsage,
  upsertUserTier,
  type UserTier,
  type ContentFormat,
} from '../db/user-tiers.js';
import { canProceed as canProceedBilling } from '../services/billing-manager.js';

export interface TierContext {
  userId: string;
  tier: UserTier;
  campaignsRemaining: number;
  batchLimit: number;
  customBrandKit: boolean;
  analyticsDepth: 'basic' | 'advanced';
  supportLevel: 'community' | 'email' | 'email-24h' | '24h-priority';
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

const FORMAT_LABELS: Record<ContentFormat, string> = {
  carousels: 'carousels',
  stories: 'stories',
  videos: 'videos (reels/TikTok)',
};

/**
 * Per-format gate: checks the format-specific quota (carouselsLimit,
 * storiesLimit, videosLimit) AND the tier's overall campaignsLimit — both
 * must have room, since every piece counts against its format bucket and the
 * shared total. Read-only — does NOT increment usage. Call
 * commitFormatUsage() only after generation actually succeeds; incrementing
 * here would charge a user's quota for a request that then fails downstream
 * (e.g. an LLM provider error), which is exactly the bug this split avoids.
 *
 * Auto-provisions a free-tier row for first-time userIds. The studio pages
 * (carrusel/reel/stories) call generation directly without ever visiting
 * /checkout, so requiring a pre-existing user_tiers row would reject every
 * brand-new visitor. Lazily creating one on first use keeps that self-serve
 * flow working; explicit signup via /checkout still upgrades the same row.
 */
export interface FormatQuotaResult {
  allowed: boolean;
  context: TierContext | null;
  reason?: string;
  // Matches the payload public/app.js's `feedia:quotaExceeded` listener
  // already renders (used/limit/currentPlan/upgradeUrl) — reuse that
  // existing modal instead of building a second one.
  used?: number;
  limit?: number;
  currentPlan?: string;
}

export const checkFormatQuota = async (
  userId: string,
  format: ContentFormat,
  count: number = 1,
): Promise<FormatQuotaResult> => {
  try {
    let tierRecord = await getUserTier(userId);

    if (!tierRecord) {
      tierRecord = await upsertUserTier(userId, `${userId}@anon.feedia.app`, 'free');
    }

    const formatLimit =
      format === 'carousels' ? tierRecord.carouselsLimit : format === 'stories' ? tierRecord.storiesLimit : tierRecord.videosLimit;
    const formatUsed =
      format === 'carousels'
        ? tierRecord.carouselsUsedThisMonth
        : format === 'stories'
          ? tierRecord.storiesUsedThisMonth
          : tierRecord.videosUsedThisMonth;
    const formatRemaining = formatLimit - formatUsed;
    const campaignsRemaining = tierRecord.campaignsLimit - tierRecord.campaignsUsedThisMonth;

    const context: TierContext = {
      userId,
      tier: tierRecord.tier,
      campaignsRemaining,
      batchLimit: tierRecord.batchLimit,
      customBrandKit: tierRecord.customBrandKit,
      analyticsDepth: tierRecord.analyticsDepth,
      supportLevel: tierRecord.supportLevel,
    };

    if (formatRemaining < count) {
      return {
        allowed: false,
        context,
        reason: `Llegaste al límite mensual de ${FORMAT_LABELS[format]} de tu plan.`,
        used: formatUsed,
        limit: formatLimit,
        currentPlan: tierRecord.tier,
      };
    }
    if (campaignsRemaining < count) {
      return {
        allowed: false,
        context,
        reason: 'Llegaste al límite mensual de contenido de tu plan.',
        used: tierRecord.campaignsUsedThisMonth,
        limit: tierRecord.campaignsLimit,
        currentPlan: tierRecord.tier,
      };
    }

    return { allowed: true, context };
  } catch (err) {
    console.error('[TierEnforcer] Format quota check failed:', err);
    return {
      allowed: false,
      context: null,
      reason: 'Tier validation error',
    };
  }
};

/**
 * Commit usage after a generation call has actually succeeded. Never call
 * this before the content is generated — see checkFormatQuota's docstring.
 */
export const commitFormatUsage = async (userId: string, format: ContentFormat, count: number = 1): Promise<void> => {
  await incrementFormatUsage(userId, format, count);
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
  tier: UserTier,
  feature: 'customBrandKit' | 'analytics' | 'api_access' | 'webhooks' | 'priority_support',
): boolean => {
  const features = {
    free: { customBrandKit: false, analytics: false, api_access: false, webhooks: false, priority_support: false },
    starter: { customBrandKit: false, analytics: false, api_access: false, webhooks: false, priority_support: false },
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
