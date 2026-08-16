import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as ContentCuration from '../../../src/services/content-curation.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { promptId, content, format, topic, engagement, conversions, impressions } = req.body;

    if (!promptId || !format || !topic) {
      return res.status(400).json({ error: 'Missing required fields: promptId, format, topic' });
    }

    ContentCuration.recordPromptPerformance({
      promptId,
      content: content || '',
      format: format as 'carousel' | 'reel' | 'story' | 'static',
      topic,
      engagement: engagement || 0,
      conversions: conversions || 0,
      impressions: impressions || 0,
      timestamp: new Date().toISOString(),
    });

    const score = ContentCuration.curateContent();

    res.status(200).json({
      success: true,
      recorded: { promptId, format, topic },
      currentScore: score,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error recording prompt performance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
