import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as AudioIntelligence from '../../../src/services/audio-intelligence.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { niche, format, weeklyVolume = 3 } = req.body;

    if (!niche || !format) {
      return res.status(400).json({ error: 'Missing required fields: niche, format' });
    }

    const strategy = AudioIntelligence.buildAudioStrategy(
      niche,
      format as 'carousel' | 'reel' | 'story' | 'static',
      weeklyVolume
    );

    res.status(200).json({
      success: true,
      niche,
      format,
      weeklyVolume,
      strategy,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error building audio strategy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
