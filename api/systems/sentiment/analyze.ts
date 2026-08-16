import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as SentimentAnalysis from '../../../src/services/sentiment-analysis.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { commentId, text } = req.body;

    if (!commentId || !text) {
      return res.status(400).json({ error: 'Missing required fields: commentId, text' });
    }

    const comment = SentimentAnalysis.analyzeComment(commentId, text);

    res.status(200).json({
      success: true,
      comment,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error analyzing sentiment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
