/**
 * Analytics Endpoints (System 13: Feedback)
 * POST /api/analytics/events - Record event
 * GET /api/analytics/campaigns/:id - Campaign metrics
 * GET /api/analytics/summary - User dashboard summary
 */

import type { Request, Response } from 'express';
import { query } from '../db/client.js';

/**
 * POST /api/analytics/events
 * Record engagement event (view, like, share, conversion)
 */
export const recordEvent = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { contentId, campaignId, eventType, platform, value = 1, metadata = {} } = req.body;

    if (!eventType || !['view', 'engagement', 'conversion', 'share'].includes(eventType)) {
      return res.status(400).json({ error: 'Invalid eventType' });
      return;
    }

    const eventId = crypto.randomUUID();

    // Insert event
    await query(
      `INSERT INTO analytics_events
       (id, content_id, campaign_id, user_id, event_type, platform, metric_value, metadata, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [eventId, contentId || null, campaignId || null, userId, eventType, platform || 'unknown', value, JSON.stringify(metadata)]
    );

    return res.status(201).json({
      eventId,
      recorded: true,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Analytics] Record error:', err);
    return res.status(500).json({ error: 'Event recording failed' });
  }
};

/**
 * GET /api/analytics/campaigns/:id
 * Get campaign metrics (views, engagement rate, conversions)
 */
export const getCampaignMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id: campaignId } = req.params;
    const { startDate, endDate } = req.query;

    // Verify ownership
    const campaignResult = await query(
      'SELECT * FROM campaigns WHERE id = $1 AND user_id = $2',
      [campaignId, userId]
    );

    if (campaignResult.rowCount === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
      return;
    }

    // Build date filter
    let dateFilter = '';
    if (startDate && endDate) {
      dateFilter = ` AND timestamp BETWEEN '${startDate}' AND '${endDate}'`;
    }

    // Get metrics
    const metricsResult = await query(
      `SELECT
        event_type,
        COUNT(*) as count,
        SUM(metric_value) as total_value
       FROM analytics_events
       WHERE campaign_id = $1 ${dateFilter}
       GROUP BY event_type`,
      [campaignId]
    );

    // Get total events
    const totalResult = await query(
      `SELECT COUNT(*) as total FROM analytics_events WHERE campaign_id = $1 ${dateFilter}`,
      [campaignId]
    );

    const metrics = metricsResult.rows.reduce((acc: any, row: any) => {
      acc[row.event_type] = { count: row.count, value: row.total_value };
      return acc;
    }, {});

    const views = metrics.view?.count || 0;
    const engagements = metrics.engagement?.count || 0;
    const conversions = metrics.conversion?.count || 0;

    return res.json({
      campaignId,
      period: { startDate, endDate },
      totals: {
        events: totalResult.rows[0].total,
        views,
        engagements,
        conversions,
        shares: metrics.share?.count || 0,
      },
      rates: {
        engagement: views > 0 ? ((engagements / views) * 100).toFixed(2) + '%' : '0%',
        conversion: engagements > 0 ? ((conversions / engagements) * 100).toFixed(2) + '%' : '0%',
      },
      byEvent: metrics,
    });
  } catch (err) {
    console.error('[Analytics] Metrics error:', err);
    return res.status(500).json({ error: 'Metrics retrieval failed' });
  }
};

/**
 * GET /api/analytics/summary
 * User dashboard summary (all campaigns)
 */
export const getAnalyticsSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;

    // Get all campaigns
    const campaignResult = await query(
      'SELECT id FROM campaigns WHERE user_id = $1 AND status = $2',
      [userId, 'active']
    );

    const campaignIds = campaignResult.rows.map((row: any) => row.id);

    if (campaignIds.length === 0) {
      return res.json({
        summary: {
          activeCampaigns: 0,
          totalEvents: 0,
          avgEngagementRate: '0%',
        },
      });
      return;
    }

    // Get aggregated metrics
    const summaryResult = await query(
      `SELECT
        COUNT(DISTINCT campaign_id) as campaigns,
        COUNT(*) as total_events,
        SUM(CASE WHEN event_type = 'view' THEN 1 ELSE 0 END) as views,
        SUM(CASE WHEN event_type = 'engagement' THEN 1 ELSE 0 END) as engagements
       FROM analytics_events
       WHERE user_id = $1`,
      [userId]
    );

    const summary = summaryResult.rows[0];
    const engagementRate = summary.views > 0 ? ((summary.engagements / summary.views) * 100).toFixed(2) : '0';

    return res.json({
      summary: {
        activeCampaigns: summary.campaigns,
        totalEvents: summary.total_events,
        totalViews: summary.views,
        totalEngagements: summary.engagements,
        avgEngagementRate: engagementRate + '%',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Analytics] Summary error:', err);
    return res.status(500).json({ error: 'Summary retrieval failed' });
  }
};

/**
 * GET /api/analytics/content/:id
 * Get metrics for specific content
 */
export const getContentMetrics = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { id: contentId } = req.params;

    // Verify ownership
    const contentResult = await query(
      'SELECT * FROM content WHERE id = $1 AND user_id = $2',
      [contentId, userId]
    );

    if (contentResult.rowCount === 0) {
      return res.status(404).json({ error: 'Content not found' });
      return;
    }

    // Get metrics
    const metricsResult = await query(
      `SELECT
        event_type,
        COUNT(*) as count,
        SUM(metric_value) as value
       FROM analytics_events
       WHERE content_id = $1
       GROUP BY event_type`,
      [contentId]
    );

    const metrics = metricsResult.rows.reduce((acc: any, row: any) => {
      acc[row.event_type] = { count: row.count, value: row.value };
      return acc;
    }, {});

    return res.json({
      contentId,
      metrics,
      totals: {
        views: metrics.view?.count || 0,
        engagements: metrics.engagement?.count || 0,
        conversions: metrics.conversion?.count || 0,
      },
    });
  } catch (err) {
    console.error('[Analytics] Content metrics error:', err);
    return res.status(500).json({ error: 'Metrics retrieval failed' });
  }
};
