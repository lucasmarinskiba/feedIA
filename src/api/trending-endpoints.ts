/**
 * Tier 5: Trending Detection (System 9: Trends)
 */

import type { Express, Request, Response } from 'express';
import { query } from '../db/client.js';

export const detectTrends = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as unknown as { userId: string }).userId;
    const { days = '7' } = req.query as { days?: string };

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

    const trends = trendsResult.rows.map((row: unknown) => {
      const typedRow = row as { campaign_id: string; current_events: number; prev_events?: number };
      return {
        campaignId: typedRow.campaign_id,
        events: typedRow.current_events,
        growth: typedRow.prev_events ? ((typedRow.current_events - typedRow.prev_events) / typedRow.prev_events * 100).toFixed(1) + '%' : 'new',
      };
    });

    res.json({ trends, period: `${days} days` });
    return;
  } catch {
    res.status(500).json({ error: 'Trend detection failed' });
    return;
  }
};

export const getTrendingAudio = async (req: Request, res: Response): Promise<void> => {
  try {
    const { platform = 'tiktok', limit = '10' } = req.query as { platform?: string; limit?: string };

    const result = await query(
      `SELECT * FROM audio_library
       WHERE platform = $1
       ORDER BY virality_score DESC, uses DESC
       LIMIT $2`,
      [platform, parseInt(limit, 10)]
    );

    res.json({
      trending: result.rows.map((row: unknown) => {
        const typedRow = row as { id: string; audio_name: string; artist: string; virality_score: number; uses: number; trend_status: string };
        return {
          id: typedRow.id,
          name: typedRow.audio_name,
          artist: typedRow.artist,
          virality: typedRow.virality_score,
          uses: typedRow.uses,
          trend: typedRow.trend_status,
        };
      }),
      platform,
    });
    return;
  } catch {
    res.status(500).json({ error: 'Trending audio fetch failed' });
    return;
  }
};

export const registerTrendingRoutes = (app: Express): void => {
  app.get('/api/trends/detect', (req: Request, res: Response) => detectTrends(req, res));
  app.get('/api/trends/audio', (req: Request, res: Response) => getTrendingAudio(req, res));
};
