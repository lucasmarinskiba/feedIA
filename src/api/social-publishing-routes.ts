/**
 * Social Publishing Routes
 * POST /api/social/publish/instagram - Publish to Instagram
 * POST /api/social/publish/tiktok - Publish to TikTok
 * POST /api/social/publish/all - Publish to all connected platforms
 * GET /api/social/status - Check platform connections
 */

import { Express, Request, Response } from 'express';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.DATABASE_PRIVATE_URL,
  ssl: { rejectUnauthorized: false },
});

interface AuthRequest extends Request {
  userId?: string;
}

// Instagram tokens (stored from OAuth)
const instagramTokens: Map<string, string> = new Map();

/**
 * POST /api/social/publish/instagram
 * Publish post/reel to Instagram Business Account
 */
const publishToInstagram = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { contentId, caption, mediaUrls, type = 'feed' } = req.body;

    if (!contentId || !mediaUrls || mediaUrls.length === 0) {
      res.status(400).json({ error: 'Missing contentId, caption, or mediaUrls' });
      return;
    }

    // Get Instagram token (from OAuth)
    const igToken = instagramTokens.get(userId);
    if (!igToken) {
      res.status(400).json({ error: 'Instagram account not connected. Call /oauth/instagram/connect first.' });
      return;
    }

    // Get Instagram Business Account ID
    const meResponse = await fetch('https://graph.instagram.com/v18.0/me?fields=id,username&access_token=' + igToken);
    if (!meResponse.ok) {
      res.status(400).json({ error: 'Failed to get Instagram account info' });
      return;
    }

    const meData = (await meResponse.json()) as { id: string; username: string };
    const igAccountId = meData.id;

    // Create media container
    const mediaIds: string[] = [];
    for (const mediaUrl of mediaUrls) {
      const containerResponse = await fetch(
        `https://graph.instagram.com/v18.0/${igAccountId}/media?image_url=${encodeURIComponent(mediaUrl)}&caption=${encodeURIComponent(caption || '')}&access_token=${igToken}`,
        { method: 'POST' }
      );

      if (!containerResponse.ok) {
        console.error('Failed to create media container:', await containerResponse.json());
        continue;
      }

      const containerData = (await containerResponse.json()) as { id: string };
      mediaIds.push(containerData.id);
    }

    if (mediaIds.length === 0) {
      res.status(500).json({ error: 'Failed to create media containers' });
      return;
    }

    // Publish carousel or single image
    let publishResponse;
    if (mediaIds.length === 1) {
      // Single image
      publishResponse = await fetch(
        `https://graph.instagram.com/v18.0/${igAccountId}/media_publish?creation_id=${mediaIds[0]}&access_token=${igToken}`,
        { method: 'POST' }
      );
    } else {
      // Carousel
      const carouselResponse = await fetch(
        `https://graph.instagram.com/v18.0/${igAccountId}/media?media_type=CAROUSEL&children=${mediaIds.join(',')}&caption=${encodeURIComponent(caption || '')}&access_token=${igToken}`,
        { method: 'POST' }
      );

      if (!carouselResponse.ok) {
        res.status(500).json({ error: 'Failed to create carousel' });
        return;
      }

      const carouselData = (await carouselResponse.json()) as { id: string };
      publishResponse = await fetch(
        `https://graph.instagram.com/v18.0/${igAccountId}/media_publish?creation_id=${carouselData.id}&access_token=${igToken}`,
        { method: 'POST' }
      );
    }

    if (!publishResponse.ok) {
      res.status(500).json({ error: 'Failed to publish to Instagram', details: await publishResponse.json() });
      return;
    }

    const publishData = (await publishResponse.json()) as { id: string };

    // Update content record
    await pool.query(
      `UPDATE user_generated_content
       SET status = 'published', published_at = NOW(),
           metadata = jsonb_set(metadata, '{instagram_id}', to_jsonb($1::text))
       WHERE id = $2 AND user_id = $3`,
      [publishData.id, contentId, userId]
    );

    res.json({
      success: true,
      platform: 'instagram',
      postId: publishData.id,
      url: `https://instagram.com/p/${publishData.id}`,
      message: 'Published to Instagram',
    });
  } catch (err) {
    console.error('[Instagram] Publish error:', err);
    res.status(500).json({ error: 'Failed to publish to Instagram', details: String(err) });
  }
};

/**
 * POST /api/social/publish/tiktok
 * Publish video to TikTok (requires TikTok API key)
 */
const publishToTikTok = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { contentId, caption, videoUrl } = req.body;

    if (!contentId || !videoUrl) {
      res.status(400).json({ error: 'Missing contentId or videoUrl' });
      return;
    }

    const tiktokApiKey = process.env.TIKTOK_API_KEY;
    if (!tiktokApiKey) {
      res.status(400).json({ error: 'TikTok API not configured' });
      return;
    }

    // Initialize upload
    const initResponse = await fetch('https://open.tiktokapis.com/v1/video/init', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tiktokApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: 0, // Will get from videoUrl
        },
      }),
    });

    if (!initResponse.ok) {
      res.status(500).json({ error: 'Failed to initialize TikTok upload', details: await initResponse.json() });
      return;
    }

    const initData = (await initResponse.json()) as { data?: { upload_url?: string; publish_id?: string } };
    const uploadUrl = initData.data?.upload_url;
    const publishId = initData.data?.publish_id;

    if (!uploadUrl || !publishId) {
      res.status(500).json({ error: 'No upload URL or publish ID' });
      return;
    }

    // Download video and upload
    const videoResponse = await fetch(videoUrl);
    if (!videoResponse.ok) {
      res.status(400).json({ error: 'Failed to fetch video' });
      return;
    }

    const videoBuffer = await videoResponse.arrayBuffer();

    // Upload video chunk
    const uploadVideoResponse = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': 'video/mp4',
      },
      body: videoBuffer,
    });

    if (!uploadVideoResponse.ok) {
      res.status(500).json({ error: 'Failed to upload video to TikTok' });
      return;
    }

    // Publish
    const publishResponse = await fetch('https://open.tiktokapis.com/v1/video/publish', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tiktokApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source_info: {
          source: 'FILE_UPLOAD',
          video_size: videoBuffer.byteLength,
        },
        post_info: {
          title: caption || '',
          privacy_level: 'PUBLIC',
        },
        publish_id: publishId,
      }),
    });

    if (!publishResponse.ok) {
      res.status(500).json({ error: 'Failed to publish to TikTok', details: await publishResponse.json() });
      return;
    }

    const publishData = (await publishResponse.json()) as { data?: { video_id?: string } };
    const videoId = publishData.data?.video_id;

    // Update content record
    await pool.query(
      `UPDATE user_generated_content
       SET status = 'published', published_at = NOW(),
           metadata = jsonb_set(metadata, '{tiktok_id}', to_jsonb($1::text))
       WHERE id = $2 AND user_id = $3`,
      [videoId || publishId, contentId, userId]
    );

    res.json({
      success: true,
      platform: 'tiktok',
      postId: videoId || publishId,
      url: `https://tiktok.com/video/${videoId || publishId}`,
      message: 'Published to TikTok',
    });
  } catch (err) {
    console.error('[TikTok] Publish error:', err);
    res.status(500).json({ error: 'Failed to publish to TikTok', details: String(err) });
  }
};

/**
 * POST /api/social/publish/all
 * Publish to all connected platforms
 */
const publishToAll = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { contentId, caption, mediaUrls, videoUrl, platforms = ['instagram', 'tiktok'] } = req.body;

    if (!contentId) {
      res.status(400).json({ error: 'Missing contentId' });
      return;
    }

    const results: Record<string, unknown> = {};

    // Publish to Instagram
    if (platforms.includes('instagram') && mediaUrls?.length > 0) {
      try {
        const igRes = await publishToInstagram(
          { ...req, body: { contentId, caption, mediaUrls } } as AuthRequest,
          { json: (data: unknown) => (results.instagram = data) } as Response
        );
      } catch (err) {
        results.instagram = { error: String(err) };
      }
    }

    // Publish to TikTok
    if (platforms.includes('tiktok') && videoUrl) {
      try {
        const ttRes = await publishToTikTok(
          { ...req, body: { contentId, caption, videoUrl } } as AuthRequest,
          { json: (data: unknown) => (results.tiktok = data) } as Response
        );
      } catch (err) {
        results.tiktok = { error: String(err) };
      }
    }

    res.json({
      success: true,
      results,
      message: 'Publishing to selected platforms',
    });
  } catch (err) {
    console.error('[Publishing] Publish all error:', err);
    res.status(500).json({ error: 'Failed to publish', details: String(err) });
  }
};

/**
 * GET /api/social/status
 * Check which platforms are connected
 */
const checkStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = req.userId;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const igConnected = instagramTokens.has(userId);
    const tiktokApiKey = process.env.TIKTOK_API_KEY;

    res.json({
      instagram: {
        connected: igConnected,
        status: igConnected ? 'ready' : 'not_connected',
        action: igConnected ? null : 'connect',
        url: '/oauth/instagram/connect',
      },
      tiktok: {
        connected: !!tiktokApiKey,
        status: tiktokApiKey ? 'ready' : 'not_configured',
        action: tiktokApiKey ? null : 'configure_api_key',
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to check status' });
  }
};

export const registerSocialPublishingRoutes = (app: Express): void => {
  app.post('/api/social/publish/instagram', publishToInstagram);
  app.post('/api/social/publish/tiktok', publishToTikTok);
  app.post('/api/social/publish/all', publishToAll);
  app.get('/api/social/status', checkStatus);

  console.log('[Routes] Social publishing routes registered');
};

// Export for OAuth integration
export const setInstagramToken = (userId: string, token: string): void => {
  instagramTokens.set(userId, token);
};
