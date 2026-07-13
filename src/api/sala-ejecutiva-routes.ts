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
import { campaignService } from '../services/campaign-service.js';
import { analyticsService } from '../services/analytics-service.js';
import { influencerService } from '../services/influencer-service.js';
import { adPerformanceService } from '../services/ad-performance-service.js';
import { automationSchedulerService } from '../services/automation-scheduler-service.js';

const router = express.Router();

/**
 * GET /api/sala-ejecutiva/snapshot
 * Full dashboard snapshot: accounts, formats, variants, winners
 */
router.get('/snapshot', (req: Request, res: Response): void => {
  try {
    // Mock brand for now (attach to request if user context exists)
    const brand = (req as any).brand || BrandProfileSchema.parse({
      name: 'FeedIA Account',
      handle: '@feedia',
      visual: { palette: {}, typography: {}, style: 'modern', mood: 'professional' },
      goals: { primary: 'reach', metricsToWatch: ['reach', 'engagement', 'followers'] },
      competitors: [],
      hashtagPools: {},
      contentPillars: [],
      brandStrategy: { positioning: '', voiceTone: '', valueProps: [] },
    } as any);

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
    const brand = (req as any).brand || BrandProfileSchema.parse({
      name: 'FeedIA Account',
      handle: '@feedia',
      visual: { palette: {}, typography: {}, style: 'modern', mood: 'professional' },
      goals: { primary: 'reach', metricsToWatch: ['reach', 'engagement', 'followers'] },
      competitors: [],
      hashtagPools: {},
      contentPillars: [],
      brandStrategy: { positioning: '', voiceTone: '', valueProps: [] },
    } as any);

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
    const brand = (req as any).brand || BrandProfileSchema.parse({
      name: 'FeedIA Account',
      handle: '@feedia',
      visual: { palette: {}, typography: {}, style: 'modern', mood: 'professional' },
      goals: { primary: 'reach', metricsToWatch: ['reach', 'engagement', 'followers'] },
      competitors: [],
      hashtagPools: {},
      contentPillars: [],
      brandStrategy: { positioning: '', voiceTone: '', valueProps: [] },
    } as any);

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

/**
 * GET /api/sala-ejecutiva/campaigns
 * Campaign management dashboard
 */
router.get('/campaigns', async (req: Request, res: Response): Promise<void> => {
  try {
    const accountHandle = req.query.account as string || '@feedia';
    const campaigns = await campaignService.listCampaigns(accountHandle);

    const summary = {
      total: campaigns.length,
      active: campaigns.filter((c) => c.status === 'active').length,
      scheduled: campaigns.filter((c) => c.status === 'scheduled').length,
      completed: campaigns.filter((c) => c.status === 'completed').length,
      totalBudget: campaigns.reduce((sum, c) => sum + (c.budget || 0), 0),
      campaigns: campaigns.slice(0, 10),
    };

    log.info('[SalaEjecutiva] Campaigns dashboard retrieved', { account: accountHandle });

    res.json({ ok: true, summary, timestamp: new Date().toISOString() });
  } catch (err) {
    log.error('[SalaEjecutiva] Campaigns failed', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * GET /api/sala-ejecutiva/analytics-summary
 * Analytics dashboard
 */
router.get('/analytics-summary', async (req: Request, res: Response): Promise<void> => {
  try {
    const accountHandle = req.query.account as string || '@feedia';
    const platform = (req.query.platform as 'instagram' | 'tiktok') || 'instagram';

    const analytics = await analyticsService.loadAnalytics(accountHandle, platform);
    const growth = await analyticsService.getGrowthTrend(accountHandle, platform, 30);
    const engagementRate = await analyticsService.getEngagementRate(accountHandle, platform, 7);

    const summary = {
      accountHandle,
      platform,
      contentCount: analytics.content.length,
      metricsSnapshots: analytics.metrics.length,
      growth: growth,
      engagementRate,
      topContent: analytics.content.slice(0, 5),
    };

    log.info('[SalaEjecutiva] Analytics summary retrieved', { account: accountHandle });

    res.json({ ok: true, summary, timestamp: new Date().toISOString() });
  } catch (err) {
    log.error('[SalaEjecutiva] Analytics failed', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * GET /api/sala-ejecutiva/influencers
 * Influencer CRM dashboard
 */
router.get('/influencers', async (req: Request, res: Response): Promise<void> => {
  try {
    const partners = await influencerService.listInfluencers('partner');
    const prospects = await influencerService.listInfluencers('prospect');
    const topPerformers = await influencerService.getTopPerformers(5);

    const summary = {
      totalPartnerships: partners.length,
      totalProspects: prospects.length,
      topPerformers: topPerformers,
      averageEngagement:
        partners.length > 0
          ? partners.reduce((sum, inf) => sum + inf.engagement_rate, 0) / partners.length
          : 0,
    };

    log.info('[SalaEjecutiva] Influencers dashboard retrieved');

    res.json({ ok: true, summary, timestamp: new Date().toISOString() });
  } catch (err) {
    log.error('[SalaEjecutiva] Influencers failed', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * GET /api/sala-ejecutiva/ads
 * Ad performance dashboard
 */
router.get('/ads', async (req: Request, res: Response): Promise<void> => {
  try {
    const accountId = req.query.account as string || 'default';
    const activeCampaigns = await adPerformanceService.listCampaigns(accountId, 'active');
    const completedCampaigns = await adPerformanceService.listCampaigns(accountId, 'completed');

    const totalSpend = activeCampaigns.reduce((sum, c) => sum + c.performance.spend, 0);
    const totalConversions = activeCampaigns.reduce(
      (sum, c) => sum + c.performance.conversions,
      0
    );
    const avgROAS =
      activeCampaigns.length > 0
        ? activeCampaigns.reduce((sum, c) => sum + c.performance.roas, 0) /
          activeCampaigns.length
        : 0;

    const summary = {
      active: activeCampaigns.length,
      completed: completedCampaigns.length,
      totalSpend,
      totalConversions,
      avgROAS,
      topCampaigns: activeCampaigns.slice(0, 5),
    };

    log.info('[SalaEjecutiva] Ads dashboard retrieved');

    res.json({ ok: true, summary, timestamp: new Date().toISOString() });
  } catch (err) {
    log.error('[SalaEjecutiva] Ads failed', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * GET /api/sala-ejecutiva/automation
 * Automation scheduler dashboard
 */
router.get('/automation', async (req: Request, res: Response): Promise<void> => {
  try {
    const accountHandle = req.query.account as string || '@feedia';
    const activeTasks = await automationSchedulerService.listTasks(accountHandle, 'active');
    const pausedTasks = await automationSchedulerService.listTasks(accountHandle, 'paused');

    const summary = {
      active: activeTasks.length,
      paused: pausedTasks.length,
      total: activeTasks.length + pausedTasks.length,
      byType: {
        post: activeTasks.filter((t) => t.type === 'post').length,
        engage: activeTasks.filter((t) => t.type === 'engage').length,
        dm: activeTasks.filter((t) => t.type === 'dm').length,
        follow: activeTasks.filter((t) => t.type === 'follow').length,
      },
      recentTasks: activeTasks.slice(0, 5),
    };

    log.info('[SalaEjecutiva] Automation dashboard retrieved');

    res.json({ ok: true, summary, timestamp: new Date().toISOString() });
  } catch (err) {
    log.error('[SalaEjecutiva] Automation failed', { error: String(err) });
    res.status(500).json({ ok: false, error: String(err) });
  }
});

export default router;
