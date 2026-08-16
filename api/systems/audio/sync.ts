import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as AudioIntelligence from '../../../src/services/audio-intelligence.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { audioId, videoDuration } = req.body;

    if (!audioId || !videoDuration) {
      return res.status(400).json({ error: 'Missing required fields: audioId, videoDuration' });
    }

    const syncPoints = AudioIntelligence.getSyncPoints(audioId, videoDuration);

    res.status(200).json({
      success: true,
      audioId,
      videoDuration,
      syncPoints,
      beatMap: syncPoints.map((p) => `${p.second}s: ${p.action}`).join(', '),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error getting sync points:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
