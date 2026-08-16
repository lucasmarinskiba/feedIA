import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as CompetitiveIntelligence from '../../../src/services/competitive-intelligence.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { niche } = req.body;

    if (!niche) {
      return res.status(400).json({ error: 'Missing required field: niche' });
    }

    const analysis = CompetitiveIntelligence.analyzeCompetitors(niche);

    res.status(200).json({
      success: true,
      analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error analyzing competitors:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
