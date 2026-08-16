import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as ContentCuration from '../../../src/services/content-curation.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const result = ContentCuration.curateContent();

    res.status(200).json({
      success: true,
      curation: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error analyzing curation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
