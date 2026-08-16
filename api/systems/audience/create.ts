import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as AudienceProfiling from '../../../src/services/audience-profiling.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { niche, description } = req.body;

    if (!niche || !description) {
      return res.status(400).json({ error: 'Missing required fields: niche, description' });
    }

    const segment = AudienceProfiling.createAudienceSegment(niche, description);

    res.status(200).json({
      success: true,
      segment,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error creating audience segment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
