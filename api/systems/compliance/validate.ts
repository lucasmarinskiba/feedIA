import type { VercelRequest, VercelResponse } from '@vercel/node';
import * as ComplianceValidator from '../../../src/services/compliance-validator.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { contentId, content, platform } = req.body;

    if (!contentId || !content || !platform) {
      return res.status(400).json({ error: 'Missing required fields: contentId, content, platform' });
    }

    const validation = ComplianceValidator.validateContent(
      contentId,
      content,
      platform as 'instagram' | 'tiktok' | 'pinterest' | 'facebook' | 'youtube'
    );

    res.status(200).json({
      success: true,
      validation,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error validating compliance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
