import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as AutoFeedbackLoop from '../../../src/services/auto-feedback-loop.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { promptId, engagement, conversions, impressions, format, topic, style } = req.body;

    if (!promptId || typeof engagement !== 'number') {
      return res.status(400).json({ error: 'Missing/invalid required fields: promptId, engagement (number)' });
    }

    const feedback = AutoFeedbackLoop.recordPromptPerformance({
      promptId,
      engagement,
      conversions: conversions || 0,
      impressions: impressions || 0,
      format: format || 'carousel',
      topic: topic || 'general',
      style: style || 'modern',
    });

    res.status(200).json({
      success: true,
      feedback,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error recording feedback:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
