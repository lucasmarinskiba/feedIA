import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as GrowthHacker from '../../../src/services/growth-hacker.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { currentFollowers, engagementRate, conversionRate } = req.body;

    if (typeof currentFollowers !== 'number' || typeof engagementRate !== 'number' || typeof conversionRate !== 'number') {
      return res.status(400).json({
        error: 'Missing/invalid required fields: currentFollowers (number), engagementRate (number), conversionRate (number)',
      });
    }

    const strategy = GrowthHacker.buildGrowthStrategy(currentFollowers, engagementRate, conversionRate);

    res.status(200).json({
      success: true,
      strategy,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error building growth strategy:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
