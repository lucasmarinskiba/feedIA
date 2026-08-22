/**
 * Growth Strategy Endpoints (System 10: Growth)
 * GET /api/growth/strategy - Generate personalized growth plan
 * GET /api/growth/forecast - Engagement forecast for next 30 days
 * GET /api/growth/recommendations - Content recommendations
 */

import type { Request, Response } from 'express';
import { query } from '../db/client.js';

/**
 * GET /api/growth/strategy
 * Generate growth strategy based on user data
 */
export const getGrowthStrategy = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;

    // Get user metrics
    const metricsResult = await query(
      `SELECT
        COUNT(DISTINCT campaign_id) as campaigns,
        COUNT(*) as total_events,
        SUM(CASE WHEN event_type = 'view' THEN 1 ELSE 0 END) as views,
        SUM(CASE WHEN event_type = 'engagement' THEN 1 ELSE 0 END) as engagements
       FROM analytics_events
       WHERE user_id = $1`,
      [userId]
    );

    const metrics = metricsResult.rows[0];
    const engagementRate = metrics.views > 0 ? (metrics.engagements / metrics.views) * 100 : 0;

    // Get top performing campaign
    const topCampaignResult = await query(
      `SELECT campaign_id, COUNT(*) as event_count
       FROM analytics_events
       WHERE user_id = $1
       GROUP BY campaign_id
       ORDER BY event_count DESC
       LIMIT 1`,
      [userId]
    );

    const topCampaign = topCampaignResult.rows[0] || null;

    // Generate strategy based on metrics
    const strategies: string[] = [];
    const recommendations: string[] = [];

    if (metrics.campaigns < 5) {
      strategies.push('Expand campaign portfolio');
      recommendations.push('Create more diverse campaigns to reach wider audience');
    }

    if (engagementRate < 5) {
      strategies.push('Improve content quality');
      recommendations.push('Analyze top-performing content and replicate patterns');
    }

    if (engagementRate > 10) {
      strategies.push('Leverage high-performing content');
      recommendations.push('Increase publishing frequency of similar content');
    }

    strategies.push('Optimize posting schedule');
    recommendations.push('Post during peak engagement hours (typically 6-10 PM)');

    strategies.push('Build audience consistency');
    recommendations.push('Publish 3-5 pieces per week to maintain momentum');

    res.json({
      strategy: {
        goals: strategies,
        actionItems: recommendations,
        metrics: {
          currentCampaigns: metrics.campaigns,
          totalEvents: metrics.total_events,
          avgEngagementRate: parseFloat(engagementRate.toFixed(2)) + '%',
          topPerformingCampaignId: topCampaign?.campaign_id || null,
        },
        timeline: '30-day growth plan',
      },
      estimatedGrowth: {
        '7days': `${Math.round(engagementRate * 1.2)}% engagement`,
        '14days': `${Math.round(engagementRate * 1.5)}% engagement`,
        '30days': `${Math.round(engagementRate * 2)}% engagement`,
      },
    });
  } catch (err) {
    console.error('[Growth] Strategy error:', err);
    res.status(500).json({ error: 'Strategy generation failed' });
  }
};

/**
 * GET /api/growth/forecast
 * Forecast engagement for next 30 days
 */
export const getEngagementForecast = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { campaignId } = req.query;

    // Get historical data
    let whereClause = 'WHERE user_id = $1';
    let paramIndex = 2;
    const params: unknown[] = [userId];

    if (campaignId) {
      whereClause += ` AND campaign_id = $${paramIndex}`;
      params.push(campaignId);
      paramIndex++;
    }

    const historyResult = await query(
      `SELECT
        DATE(timestamp) as date,
        COUNT(*) as events,
        SUM(CASE WHEN event_type = 'view' THEN 1 ELSE 0 END) as views,
        SUM(CASE WHEN event_type = 'engagement' THEN 1 ELSE 0 END) as engagements
       FROM analytics_events
       ${whereClause}
       GROUP BY DATE(timestamp)
       ORDER BY DATE(timestamp) DESC
       LIMIT 30`,
      params
    );

    const history = historyResult.rows;

    // Simple forecasting: use average of last 7 days
    const last7Days = history.slice(0, 7);
    const avgDaily = {
      views: last7Days.reduce((sum: number, row: any) => sum + (row.views || 0), 0) / 7,
      engagements: last7Days.reduce((sum: number, row: any) => sum + (row.engagements || 0), 0) / 7,
    };

    // Project 30 days
    const forecast = [];
    const today = new Date();
    for (let i = 1; i <= 30; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);

      // Add weekly variance (weekends tend to perform better)
      const variance = date.getDay() === 0 || date.getDay() === 6 ? 1.2 : 1;

      forecast.push({
        date: date.toISOString().split('T')[0],
        predictedViews: Math.round(avgDaily.views * variance),
        predictedEngagements: Math.round(avgDaily.engagements * variance),
        confidence: 0.75,
      });
    }

    res.json({
      forecast: forecast,
      summary: {
        projectedMonthlyViews: forecast.reduce((sum: number, f: any) => sum + f.predictedViews, 0),
        projectedMonthlyEngagements: forecast.reduce(
          (sum: number, f: any) => sum + f.predictedEngagements,
          0
        ),
        avgDailyViews: Math.round(avgDaily.views),
        avgDailyEngagements: Math.round(avgDaily.engagements),
        confidence: '75%',
      },
    });
  } catch (err) {
    console.error('[Growth] Forecast error:', err);
    res.status(500).json({ error: 'Forecast generation failed' });
  }
};

/**
 * GET /api/growth/recommendations
 * Content recommendations based on performance
 */
export const getRecommendations = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;

    // Get top-performing content types
    const topTypesResult = await query(
      `SELECT
        c.type,
        COUNT(ae.id) as events,
        SUM(CASE WHEN ae.event_type = 'engagement' THEN 1 ELSE 0 END) as engagements
       FROM content c
       LEFT JOIN analytics_events ae ON c.id = ae.content_id
       WHERE c.user_id = $1
       GROUP BY c.type
       ORDER BY engagements DESC
       LIMIT 3`,
      [userId]
    );

    const topTypes = topTypesResult.rows;

    // Get preferred platforms
    const platformsResult = await query(
      `SELECT
        platform,
        COUNT(*) as events
       FROM analytics_events
       WHERE user_id = $1
       GROUP BY platform
       ORDER BY events DESC
       LIMIT 3`,
      [userId]
    );

    const platforms = platformsResult.rows;

    const recommendations = [];

    if (topTypes.length > 0) {
      recommendations.push({
        type: 'content_type',
        suggestion: `Focus on ${topTypes[0].type} content — it has the highest engagement`,
        confidence: 0.85,
      });
    }

    if (platforms.length > 0) {
      recommendations.push({
        type: 'platform',
        suggestion: `Prioritize ${platforms[0].platform} — your audience is most active there`,
        confidence: 0.8,
      });
    }

    recommendations.push({
      type: 'posting_frequency',
      suggestion: 'Increase posting frequency to 4-5 times per week',
      confidence: 0.7,
    });

    recommendations.push({
      type: 'engagement_strategy',
      suggestion: 'Respond to comments within first hour for 30% higher reach',
      confidence: 0.8,
    });

    res.json({
      recommendations,
      summary: {
        topContentType: topTypes[0]?.type || 'carousel',
        topPlatform: platforms[0]?.platform || 'tiktok',
        totalRecommendations: recommendations.length,
      },
    });
  } catch (err) {
    console.error('[Growth] Recommendations error:', err);
    res.status(500).json({ error: 'Recommendations generation failed' });
  }
};
