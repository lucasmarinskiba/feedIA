import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as TrendDetector from '../../../src/services/trend-detector.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, niche, volume, keywords } = req.body;

    if (!name || !niche || typeof volume !== 'number' || !keywords || !Array.isArray(keywords)) {
      return res.status(400).json({ error: 'Missing/invalid fields: name, niche, volume (number), keywords (array)' });
    }

    TrendDetector.detectTrend(name, niche, volume, keywords);

    const analysis = TrendDetector.analyzeTrends();

    res.status(200).json({
      success: true,
      trend: { name, niche, volume, keywords },
      analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error detecting trend:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
