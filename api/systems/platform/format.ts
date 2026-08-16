import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as PlatformNativeOutput from '../../../src/services/platform-native-output.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { content, format, platform } = req.body;

    if (!content || !format || !platform) {
      return res.status(400).json({ error: 'Missing required fields: content, format, platform' });
    }

    const formatted = PlatformNativeOutput.formatForPlatform(
      content,
      format as 'carousel' | 'reel' | 'story' | 'static',
      platform as 'instagram' | 'tiktok' | 'pinterest' | 'facebook' | 'youtube'
    );

    res.status(200).json({
      success: true,
      formatted,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error formatting for platform:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
