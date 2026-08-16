import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as ABTesting from '../../../src/services/ab-testing.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { name, hypothesis, control, variants } = req.body;

    if (!name || !hypothesis || !control || !variants || !Array.isArray(variants)) {
      return res.status(400).json({ error: 'Missing/invalid required fields: name, hypothesis, control, variants (array)' });
    }

    const test = ABTesting.createTest(name, hypothesis, control, variants);

    res.status(200).json({
      success: true,
      test,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error creating A/B test:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
