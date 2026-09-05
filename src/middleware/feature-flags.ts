/**
 * Feature Flags Middleware
 * Tier-based feature access control
 */

import { getUserTier } from '../db/user-tiers.js';

export type FeatureName = 'advanced_analytics' | 'white_label' | 'api_webhooks' | 'priority_support' | 'custom_branding' | 'bulk_operations';

// db/user-tiers.ts's UserTier ('free' | 'starter' | 'pro' | 'agency') is
// the real 4-tier set (matches the DB's own CHECK constraint) -- this
// was missing 'starter' entirely, which made every call below a type
// error since tierRecord.tier can genuinely be 'starter'. Not adding
// 'starter' to any feature's own tiers array below (that's a pricing/
// packaging decision, not something to invent) -- just widening the
// type so a starter-tier user's feature checks compile and correctly
// evaluate to "not included" for all of these, same as free, until
// someone makes an actual call on what starter should unlock.
export interface FeatureFlag {
  name: FeatureName;
  tiers: Array<'free' | 'starter' | 'pro' | 'agency'>;
}

const featureFlags: Record<FeatureName, FeatureFlag> = {
  advanced_analytics: {
    name: 'advanced_analytics',
    tiers: ['pro', 'agency'],
  },
  white_label: {
    name: 'white_label',
    tiers: ['agency'],
  },
  api_webhooks: {
    name: 'api_webhooks',
    tiers: ['pro', 'agency'],
  },
  priority_support: {
    name: 'priority_support',
    tiers: ['agency'],
  },
  custom_branding: {
    name: 'custom_branding',
    tiers: ['pro', 'agency'],
  },
  bulk_operations: {
    name: 'bulk_operations',
    tiers: ['pro', 'agency'],
  },
};

/**
 * Check if user has access to feature
 */
export const hasFeatureAccess = async (
  userId: string,
  feature: FeatureName,
): Promise<{ allowed: boolean; reason?: string }> => {
  try {
    const tierRecord = await getUserTier(userId);
    if (!tierRecord) {
      return { allowed: false, reason: 'User tier not found' };
    }

    const flag = featureFlags[feature];
    if (!flag) {
      return { allowed: false, reason: 'Feature not found' };
    }

    if (!flag.tiers.includes(tierRecord.tier)) {
      return {
        allowed: false,
        reason: `Feature '${feature}' not available for ${tierRecord.tier} tier. Required: ${flag.tiers.join(' or ')}`,
      };
    }

    return { allowed: true };
  } catch (err) {
    console.error('[FeatureFlags] Access check error:', err);
    return { allowed: false, reason: String(err) };
  }
};

/**
 * Middleware for Express route protection
 */
export const requireFeature = (feature: FeatureName) => async (req: any, res: any, next: any): Promise<void> => {
    try {
      const userId = req.userId || req.query.userId || req.body.userId;

      if (!userId) {
        res.status(401).json({ error: 'User ID required' });
        return;
      }

      const result = await hasFeatureAccess(userId, feature);

      if (!result.allowed) {
        res.status(403).json({
          error: 'Feature not available',
          reason: result.reason,
          feature,
        });
        return;
      }

      next();
    } catch (err) {
      console.error('[FeatureFlags] Middleware error:', err);
      res.status(500).json({ error: 'Feature access check failed' });
    }
  };

/**
 * Get all features for a user tier
 */
export const getUserFeatures = async (userId: string): Promise<FeatureName[]> => {
  try {
    const tierRecord = await getUserTier(userId);
    if (!tierRecord) {
      return [];
    }

    return Object.entries(featureFlags)
      .filter(([, flag]) => flag.tiers.includes(tierRecord.tier))
      .map(([name]) => name as FeatureName);
  } catch (err) {
    console.error('[FeatureFlags] Get user features error:', err);
    return [];
  }
};

/**
 * Get feature details
 */
export const getFeatureDetails = (feature: FeatureName): FeatureFlag | null => featureFlags[feature] || null;

/**
 * List all features
 */
export const listAllFeatures = (): FeatureFlag[] => Object.values(featureFlags);
