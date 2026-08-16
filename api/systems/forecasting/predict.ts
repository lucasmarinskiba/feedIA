import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as EngagementForecasting from '../../../src/services/engagement-forecasting.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { format, topic, platform, audience, postingTime } = req.body;

    if (!format || !topic || !platform || !audience || !postingTime) {
      return res.status(400).json({ error: 'Missing required fields: format, topic, platform, audience, postingTime' });
    }

    const forecast = EngagementForecasting.forecastEngagement({
      format: format as 'carousel' | 'reel' | 'story' | 'static',
      topic,
      platform: platform as 'instagram' | 'tiktok' | 'pinterest' | 'facebook' | 'youtube',
      audience,
      postingTime,
    });

    res.status(200).json({
      success: true,
      forecast,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error forecasting engagement:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
