/**
 * Platform-Native Output API Routes
 * /api/platform-native/* — Format content for platform specs + scheduling
 */

import { Router, Request, Response } from 'express';
import {
  formatForPlatform,
  validateContent,
  optimizeForPlatform,
  type ContentMetadata,
} from '../services/platform-native-output.js';

const router = Router();

/**
 * POST /api/platform-native/format
 * Format content for platform specs
 *
 * Request:
 * {
 *   "format": "carousel",
 *   "platform": "instagram",
 *   "title": "Skincare Routine",
 *   "description": "Learn this simple 3-step morning routine...",
 *   "hashtags": ["#skincare", "#beauty"],
 *   "callToAction": "Save this for later!"
 * }
 *
 * Response:
 * {
 *   "platform": "instagram",
 *   "format": "carousel",
 *   "specs": { imageWidth: 1080, imageHeight: 1350, ... },
 *   "scheduling": { recommendedPostTime: "...", bestDayOfWeek: "Tuesday", ... },
 *   "warnings": []
 * }
 */
router.post('/format', (req: Request, res: Response): void => {
  try {
    const { format, platform, title, description, hashtags, callToAction } = req.body as ContentMetadata;

    if (!format || !platform) {
      res.status(400).json({ error: 'format and platform required' });
      return;
    }

    const metadata: ContentMetadata = {
      format,
      platform: platform as 'instagram' | 'tiktok' | 'pinterest',
      title,
      description,
      hashtags,
      callToAction,
    };

    const result = formatForPlatform(metadata);

    res.json({
      success: true,
      result,
    });
  } catch (err) {
    console.error('[PlatformNative] Format failed:', err);
    res.status(400).json({ error: String(err) });
  }
});

/**
 * POST /api/platform-native/validate
 * Validate content meets platform requirements
 *
 * Response:
 * {
 *   "valid": true,
 *   "errors": [],
 *   "warnings": ["No hashtags specified..."]
 * }
 */
router.post('/validate', (req: Request, res: Response): void => {
  try {
    const { format, platform, title, description, hashtags, callToAction } = req.body as ContentMetadata;

    const metadata: ContentMetadata = {
      format,
      platform: platform as 'instagram' | 'tiktok' | 'pinterest',
      title,
      description,
      hashtags,
      callToAction,
    };

    const validation = validateContent(metadata);

    res.json({
      success: true,
      valid: validation.valid,
      errors: validation.errors,
      message: validation.valid ? 'Content valid for platform' : `${validation.errors.length} validation error(s)`,
    });
  } catch (err) {
    console.error('[PlatformNative] Validate failed:', err);
    res.status(500).json({ error: String(err) });
  }
});

/**
 * POST /api/platform-native/optimize
 * Auto-optimize content for platform
 *
 * Response:
 * {
 *   "optimized": { format: "carousel", platform: "instagram", description: "...", ... }
 * }
 */
router.post('/optimize', (req: Request, res: Response): void => {
  try {
    const { format, platform, title, description, hashtags, callToAction } = req.body as ContentMetadata;

    const metadata: ContentMetadata = {
      format,
      platform: platform as 'instagram' | 'tiktok' | 'pinterest',
      title,
      description,
      hashtags,
      callToAction,
    };

    const optimized = optimizeForPlatform(metadata);

    res.json({
      success: true,
      optimized,
      message: 'Content optimized for platform',
    });
  } catch (err) {
    console.error('[PlatformNative] Optimize failed:', err);
    res.status(400).json({ error: String(err) });
  }
});

/**
 * GET /api/platform-native/specs/:platform/:format
 * Get platform-specific specifications
 *
 * Response:
 * {
 *   "platform": "instagram",
 *   "format": "carousel",
 *   "specs": {
 *     "imageWidth": 1080,
 *     "imageHeight": 1350,
 *     "aspectRatio": "4:5",
 *     "maxTextLength": 2200,
 *     "safeTitleZone": { "x": 40, "y": 100, "width": 1000, "height": 250 }
 *   }
 * }
 */
router.get('/specs/:platform/:format', (req: Request, res: Response): void => {
  try {
    const platform = String(req.params.platform) as 'instagram' | 'tiktok' | 'pinterest';
    const format = String(req.params.format) as 'carousel' | 'reel' | 'story' | 'static';

    const metadata: ContentMetadata = { format, platform };
    const result = formatForPlatform(metadata);

    res.json({
      success: true,
      specs: result.specs,
    });
  } catch (err) {
    console.error('[PlatformNative] Specs failed:', err);
    res.status(400).json({ error: String(err) });
  }
});

/**
 * GET /api/platform-native/scheduling/:platform
 * Get scheduling recommendations for platform
 *
 * Response:
 * {
 *   "platform": "instagram",
 *   "bestDays": ["Tuesday", "Wednesday", "Thursday"],
 *   "bestHours": [6, 11, 19],
 *   "postingGap": 24
 * }
 */
router.get('/scheduling/:platform', (req: Request, res: Response): void => {
  try {
    const platform = String(req.params.platform);

    const SCHEDULING_RULES: Record<string, unknown> = {
      instagram: {
        bestDays: ['Tuesday', 'Wednesday', 'Thursday'],
        bestHours: [6, 11, 19],
        postingGap: 24,
      },
      tiktok: {
        bestDays: ['Tuesday', 'Wednesday', 'Thursday', 'Saturday'],
        bestHours: [6, 9, 19, 21],
        postingGap: 4,
      },
      pinterest: {
        bestDays: ['Monday', 'Tuesday', 'Thursday', 'Friday'],
        bestHours: [8, 14, 20],
        postingGap: 72,
      },
    };

    const rules = SCHEDULING_RULES[platform];

    if (!rules) {
      res.status(400).json({ error: `Unknown platform: ${platform}` });
      return;
    }

    res.json({
      success: true,
      platform,
      scheduling: rules,
    });
  } catch (err) {
    console.error('[PlatformNative] Scheduling failed:', err);
    res.status(500).json({ error: String(err) });
  }
});

export default router;
