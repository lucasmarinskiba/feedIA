import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as ChannelOrchestration from '../../../src/services/channel-orchestration.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { contentId, format, topic } = req.body;

    if (!contentId || !format || !topic) {
      return res.status(400).json({ error: 'Missing required fields: contentId, format, topic' });
    }

    const distribution = ChannelOrchestration.distributeContent(
      contentId,
      format as 'carousel' | 'reel' | 'story' | 'static',
      topic
    );

    res.status(200).json({
      success: true,
      distribution,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error distributing content:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
