/**
 * Sala Ejecutiva Dashboard Routes
 *
 * Real-time Instagram metrics and analytics
 * GET /api/sala-ejecutiva/snapshot    — account metrics, format performance, growth
 * GET /api/sala-ejecutiva/growth      — 30-day growth trajectory
 * GET /api/sala-ejecutiva/platforms   — Instagram vs TikTok comparison
 */

import express, { Request, Response } from 'express';
import { log } from '../agent/logger.js';
import {
  generateExecutiveDashboardSnapshot,
  getGrowthTrajectory,
  getPlatformComparison,
} from '../capabilities/executive/metricsExecutiveDashboard.js';
import { BrandProfileSchema } from '../config/types.js';

const router = express.Router();

/**
 * GET /api/sala-ejecutiva/snapshot
 * Full dashboard snapshot: accounts, formats, variants, winners
 */
router.get('/snapshot', (req: Request, res: Response): void => {
  try {
    // Mock brand for now (attach to request if user context exists)
    const brand = BrandProfileSchema.parse({
      name: 'FeedIA Account',
      handle: '@feedia',
      visual: { palette: {}, typography: {}, style: 'modern', mood: 'professional' },
      goals: { primary: 'reach', metricsToWatch: ['reach', 'engagement', 'followers'] },
      competitors: [],
      hashtagPools: {},
      contentPillars: [],
      brandStrategy: { positioning: '', voiceTone: '', valueProps: [] },
    });

    const snapshot = generateExecutiveDashboardSnapshot(brand);

    log.info('[SalaEjecutiva] Snapshot generated', { accountName: brand.name });

    res.json({
      ok: true,
      snapshot,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    log.error('[SalaEjecutiva] Snapshot failed', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * GET /api/sala-ejecutiva/growth
 * 30-day growth trajectory
 */
router.get('/growth', (req: Request, res: Response): void => {
  try {
    const brand = BrandProfileSchema.parse({
      name: 'FeedIA Account',
      handle: '@feedia',
      visual: { palette: {}, typography: {}, style: 'modern', mood: 'professional' },
      goals: { primary: 'reach', metricsToWatch: ['reach', 'engagement', 'followers'] },
      competitors: [],
      hashtagPools: {},
      contentPillars: [],
      brandStrategy: { positioning: '', voiceTone: '', valueProps: [] },
    });

    const growth = getGrowthTrajectory(brand);

    log.info('[SalaEjecutiva] Growth trajectory retrieved');

    res.json({
      ok: true,
      growth,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    log.error('[SalaEjecutiva] Growth failed', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * GET /api/sala-ejecutiva/platforms
 * Platform comparison (Instagram vs TikTok)
 */
router.get('/platforms', (req: Request, res: Response): void => {
  try {
    const brand = BrandProfileSchema.parse({
      name: 'FeedIA Account',
      handle: '@feedia',
      visual: { palette: {}, typography: {}, style: 'modern', mood: 'professional' },
      goals: { primary: 'reach', metricsToWatch: ['reach', 'engagement', 'followers'] },
      competitors: [],
      hashtagPools: {},
      contentPillars: [],
      brandStrategy: { positioning: '', voiceTone: '', valueProps: [] },
    });

    const comparison = getPlatformComparison(brand);

    log.info('[SalaEjecutiva] Platform comparison retrieved');

    res.json({
      ok: true,
      comparison,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    log.error('[SalaEjecutiva] Platforms failed', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
