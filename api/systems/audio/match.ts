import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as AudioIntelligence from '../../../src/services/audio-intelligence.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { format, niche, contentLength = 60 } = req.body;

    if (!format || !niche) {
      return res.status(400).json({ error: 'Missing required fields: format, niche' });
    }

    if (!['carousel', 'reel', 'story', 'static'].includes(format)) {
      return res.status(400).json({ error: 'Invalid format' });
    }

    const matches = AudioIntelligence.matchAudioToContent(
      format as 'carousel' | 'reel' | 'story' | 'static',
      niche,
      contentLength
    );

    res.status(200).json({
      success: true,
      format,
      niche,
      matches: matches.slice(0, 5), // Top 5 matches
      topMatch: matches[0],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error matching audio:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
