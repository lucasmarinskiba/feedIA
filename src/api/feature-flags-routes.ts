/**
 * Feature Flags API Routes
 * GET /api/features/* — user feature access endpoints
 */

import { Router, Request, Response } from 'express';
import {
  hasFeatureAccess,
  getUserFeatures,
  getFeatureDetails,
  listAllFeatures,
  type FeatureName,
} from '../middleware/feature-flags.js';

const router = Router();

/**
 * GET /api/features/check?userId=:userId&feature=:featureName
 * Check if user has access to a specific feature
 */
router.get('/check', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, feature } = req.query;

    if (!userId || !feature) {
      return res.status(400).json({ error: 'userId and feature query params required' });
      return;
    }

    const result = await hasFeatureAccess(String(userId), String(feature) as FeatureName);

    return res.json({
      success: result.allowed,
      feature,
      allowed: result.allowed,
      reason: result.reason,
    });
  } catch (err) {
    console.error('[FeatureFlags] Check error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/features/user?userId=:userId
 * Get all features available to user
 */
router.get('/user', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.query;

    if (!userId) {
      return res.status(400).json({ error: 'userId query param required' });
      return;
    }

    const features = await getUserFeatures(String(userId));

    return res.json({
      success: true,
      userId,
      features,
      count: features.length,
    });
  } catch (err) {
    console.error('[FeatureFlags] Get user features error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/features/details?feature=:featureName
 * Get details about a specific feature
 */
router.get('/details', async (req: Request, res: Response): Promise<void> => {
  try {
    const { feature } = req.query;

    if (!feature) {
      return res.status(400).json({ error: 'feature query param required' });
      return;
    }

    const details = getFeatureDetails(String(feature) as FeatureName);

    if (!details) {
      return res.status(404).json({ error: 'Feature not found' });
      return;
    }

    return res.json({
      success: true,
      feature: details,
    });
  } catch (err) {
    console.error('[FeatureFlags] Get details error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/features/list
 * List all available features
 */
router.get('/list', async (req: Request, res: Response): Promise<void> => {
  try {
    const features = listAllFeatures();

    return res.json({
      success: true,
      features,
      count: features.length,
    });
  } catch (err) {
    console.error('[FeatureFlags] List error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

/**
 * GET /api/features
 * Get summary of feature system
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const features = listAllFeatures();

    return res.json({
      success: true,
      summary: {
        totalFeatures: features.length,
        tiers: ['free', 'pro', 'agency'],
        features: features.map((f) => ({
          name: f.name,
          availableTiers: f.tiers,
        })),
      },
      endpoints: {
        check: 'GET /api/features/check?userId=:userId&feature=:featureName',
        user: 'GET /api/features/user?userId=:userId',
        details: 'GET /api/features/details?feature=:featureName',
        list: 'GET /api/features/list',
      },
    });
  } catch (err) {
    console.error('[FeatureFlags] Get summary error:', err);
    return res.status(500).json({ error: String(err) });
  }
});

export default router;
