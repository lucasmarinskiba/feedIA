import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as CompetitiveIntelligence from '../../../src/services/competitive-intelligence.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, niche, platforms } = req.body;

    if (!name || !niche || !platforms || !Array.isArray(platforms)) {
      return res.status(400).json({ error: 'Missing/invalid fields: name, niche, platforms (array)' });
    }

    CompetitiveIntelligence.addCompetitor(name, niche, platforms);

    res.status(200).json({
      success: true,
      competitor: { name, niche, platforms },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error adding competitor:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
