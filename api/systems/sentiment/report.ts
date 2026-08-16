import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as SentimentAnalysis from '../../../src/services/sentiment-analysis.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { contentId, commentIds } = req.body;

    if (!contentId || !commentIds || !Array.isArray(commentIds)) {
      return res.status(400).json({ error: 'Missing/invalid fields: contentId, commentIds (array)' });
    }

    const report = SentimentAnalysis.generateSentimentReport(contentId, commentIds);

    res.status(200).json({
      success: true,
      report,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating sentiment report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
