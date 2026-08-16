import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as AudioIntelligence from '../../../src/services/audio-intelligence.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { platform = 'tiktok', niche } = req.query;

    if (!platform || !['tiktok', 'instagram'].includes(platform as string)) {
      return res.status(400).json({ error: 'Invalid platform: tiktok or instagram' });
    }

    const trending = AudioIntelligence.fetchTrendingAudio(platform as 'tiktok' | 'instagram', niche as string | undefined);

    res.status(200).json({
      success: true,
      platform,
      niche: niche || 'all',
      trending,
      count: trending.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching trending audio:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
