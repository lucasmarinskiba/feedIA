/**
 * Tier 5: Trending Detection (System 9: Trends)
 */

import type { Request, Response } from 'express';
import { query } from '../db/client.js';

export const detectTrends = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).userId;
    const { days = 7 } = req.query;

    const trendsResult = await query(
      `SELECT
        campaign_id,
        COUNT(*) as current_events,
        LAG(COUNT(*)) OVER (PARTITION BY campaign_id ORDER BY DATE(timestamp)) as prev_events
       FROM analytics_events
       WHERE user_id = $1 AND timestamp > NOW() - INTERVAL '${days} days'
       GROUP BY campaign_id, DATE(timestamp)
       ORDER BY current_events DESC LIMIT 10`,
      [userId]
    );

    const trends = trendsResult.rows.map((row: any) => ({
      campaignId: row.campaign_id,
      events: row.current_events,
      growth: row.prev_events ? ((row.current_events - row.prev_events) / row.prev_events * 100).toFixed(1) + '%' : 'new',
    }));

    res.json({ trends, period: `${days} days` });
  } catch (err) {
    res.status(500).json({ error: 'Trend detection failed' });
  }
};

export const getTrendingAudio = async (req: Request, res: Response): Promise<void> => {
  try {
    const { platform = 'tiktok', limit = 10 } = req.query;

    const result = await query(
      `SELECT * FROM audio_library
       WHERE platform = $1
       ORDER BY virality_score DESC, uses DESC
       LIMIT $2`,
      [platform, parseInt(limit as string, 10)]
    );

    res.json({
      trending: result.rows.map((row: any) => ({
        id: row.id,
        name: row.audio_name,
        artist: row.artist,
        virality: row.virality_score,
        uses: row.uses,
        trend: row.trend_status,
      })),
      platform,
    });
  } catch (err) {
    res.status(500).json({ error: 'Trending audio fetch failed' });
  }
};

export const registerTrendingRoutes = (app: any): void => {
  app.get('/api/trends/detect', (req: Request, res: Response) => detectTrends(req, res));
  app.get('/api/trends/audio', (req: Request, res: Response) => getTrendingAudio(req, res));
};
