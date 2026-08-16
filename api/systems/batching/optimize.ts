import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as SmartBatching from '../../../src/services/smart-batching.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { niche, goal, budget, duration } = req.body;

    if (!niche || !goal || !budget || !duration) {
      return res.status(400).json({ error: 'Missing required fields: niche, goal, budget, duration' });
    }

    const roadmap = SmartBatching.optimizeStrategyIntoRoadmap({
      niche,
      goal: goal as 'awareness' | 'engagement' | 'conversion' | 'retention',
      budget,
      duration,
    });

    res.status(200).json({
      success: true,
      roadmap,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error optimizing batching:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
