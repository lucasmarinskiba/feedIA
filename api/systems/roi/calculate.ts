import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as ROICalculator from '../../../src/services/roi-calculator.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { format, niche, platform, budget, audience } = req.body;

    if (!format || !niche || !budget) {
      return res.status(400).json({ error: 'Missing required fields: format, niche, budget' });
    }

    const roi = ROICalculator.calculateROI({
      format: format as 'carousel' | 'reel' | 'story' | 'static',
      niche,
      platform: platform as 'instagram' | 'tiktok' | 'pinterest',
      budget,
      audience: audience || 'general',
    });

    res.status(200).json({
      success: true,
      roi,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error calculating ROI:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
