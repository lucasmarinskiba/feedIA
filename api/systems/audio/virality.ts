import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as AudioIntelligence from '../../../src/services/audio-intelligence.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { platform = 'tiktok' } = req.body;

    if (!['tiktok', 'instagram'].includes(platform)) {
      return res.status(400).json({ error: 'Invalid platform' });
    }

    const trending = AudioIntelligence.fetchTrendingAudio(platform as 'tiktok' | 'instagram');

    const predictions = trending.map((audio) => {
      const prediction = AudioIntelligence.predictAudioVirality(audio);
      const postingTimes = AudioIntelligence.getOptimalPostingTime(audio.audioId, platform as 'tiktok' | 'instagram');

      return {
        audioId: audio.audioId,
        name: audio.name,
        artist: audio.artist,
        ...prediction,
        optimalPostingTimes: postingTimes.slice(0, 3),
      };
    });

    res.status(200).json({
      success: true,
      platform,
      predictions: predictions.sort((a, b) => b.score - a.score),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error predicting virality:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
