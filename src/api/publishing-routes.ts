/**
 * Content Publishing API
 * Publish carousels/reels/stories to connected Instagram/TikTok accounts
 */

import { Router, Request, Response } from 'express';
import { log } from '../agent/logger.js';
import { getAccount, checkAccountFormatQuota, recordPublishedContent } from '../db/accounts.js';
import { getUserTier } from '../db/user-tiers.js';

const router = Router();

/**
 * Publish carousel to Instagram account
 * POST /api/publish/carousel
 * Body: { accountId, slides: [{image, caption}], hashtags, scheduledAt? }
 */
router.post('/carousel', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'User ID required' });

    const { accountId, slides, hashtags, scheduledAt } = req.body;

    if (!accountId || !slides || !Array.isArray(slides) || slides.length === 0) {
      return res.status(400).json({ error: 'accountId and slides required' });
    }

    // Verify account ownership
    const account = await getAccount(accountId);
    if (!account || account.userId !== userId) {
      return res.status(404).json({ error: 'Account not found' });
    }

    // Check quota
    const quotaCheck = await checkAccountFormatQuota(accountId, 'carousels', 1);
    if (!quotaCheck.allowed) {
      return res.status(403).json({
        error: 'Carousel limit reached',
        used: quotaCheck.used,
        limit: quotaCheck.limit,
      });
    }

    // Validate slides
    if (slides.length < 2 || slides.length > 10) {
      return res.status(400).json({ error: 'Carousel must have 2-10 slides' });
    }

    // Publish to Instagram Graph API
    const igPostId = await publishCarouselToInstagram(account.accessToken, slides, hashtags);

    if (!igPostId) {
      return res.status(500).json({ error: 'Instagram publishing failed' });
    }

    // Record in database (increments quota)
    const content = await recordPublishedContent(userId, accountId, 'instagram', igPostId, 'carousel', new Date(scheduledAt || Date.now()));

    log.info('[Publishing] Carousel published', { userId, accountId, postId: igPostId });

    res.json({
      ok: true,
      postId: igPostId,
      url: `https://instagram.com/p/${igPostId}`,
      recordedAt: content.publishedAt,
    });
  } catch (err) {
    log.error('[Publish Carousel] Error', { error: String(err) });
    res.status(500).json({ error: 'Publishing failed' });
  }
});

/**
 * Publish reel/video to Instagram or TikTok
 * POST /api/publish/video
 * Body: { accountId, videoUrl, caption, hashtags, platform, scheduledAt? }
 */
router.post('/video', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'User ID required' });

    const { accountId, videoUrl, caption, hashtags, platform, scheduledAt } = req.body;

    if (!accountId || !videoUrl || !platform) {
      return res.status(400).json({ error: 'accountId, videoUrl, platform required' });
    }

    // Verify account ownership + platform match
    const account = await getAccount(accountId);
    if (!account || account.userId !== userId) {
      return res.status(404).json({ error: 'Account not found' });
    }

    if (account.platform !== platform) {
      return res.status(400).json({ error: `Account is ${account.platform}, not ${platform}` });
    }

    // Check quota
    const quotaCheck = await checkAccountFormatQuota(accountId, 'videos', 1);
    if (!quotaCheck.allowed) {
      return res.status(403).json({
        error: 'Video limit reached',
        used: quotaCheck.used,
        limit: quotaCheck.limit,
      });
    }

    // Publish to platform
    let videoId: string | null = null;

    if (platform === 'instagram') {
      videoId = await publishReelToInstagram(account.accessToken, videoUrl, caption, hashtags);
    } else if (platform === 'tiktok') {
      videoId = await publishToTikTok(account.accessToken, videoUrl, caption, hashtags);
    }

    if (!videoId) {
      return res.status(500).json({ error: `${platform} publishing failed` });
    }

    // Record in database
    const content = await recordPublishedContent(userId, accountId, platform as any, videoId, 'video', new Date(scheduledAt || Date.now()));

    log.info('[Publishing] Video published', { userId, accountId, videoId, platform });

    res.json({
      ok: true,
      videoId,
      url: platform === 'instagram' ? `https://instagram.com/reel/${videoId}` : `https://tiktok.com/@${account.accountHandle}/video/${videoId}`,
      recordedAt: content.publishedAt,
    });
  } catch (err) {
    log.error('[Publish Video] Error', { error: String(err) });
    res.status(500).json({ error: 'Publishing failed' });
  }
});

/**
 * Publish story to Instagram
 * POST /api/publish/story
 * Body: { accountId, imageUrl, caption?, duration?, scheduledAt? }
 */
router.post('/story', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'] as string;
    if (!userId) return res.status(401).json({ error: 'User ID required' });

    const { accountId, imageUrl, caption, duration, scheduledAt } = req.body;

    if (!accountId || !imageUrl) {
      return res.status(400).json({ error: 'accountId and imageUrl required' });
    }

    // Verify account ownership
    const account = await getAccount(accountId);
    if (!account || account.userId !== userId || account.platform !== 'instagram') {
      return res.status(404).json({ error: 'Instagram account not found' });
    }

    // Check quota
    const quotaCheck = await checkAccountFormatQuota(accountId, 'stories', 1);
    if (!quotaCheck.allowed) {
      return res.status(403).json({
        error: 'Story limit reached',
        used: quotaCheck.used,
        limit: quotaCheck.limit,
      });
    }

    // Publish to Instagram
    const storyId = await publishStoryToInstagram(account.accessToken, imageUrl, caption, duration);

    if (!storyId) {
      return res.status(500).json({ error: 'Story publishing failed' });
    }

    // Record in database
    const content = await recordPublishedContent(userId, accountId, 'instagram', storyId, 'story', new Date(scheduledAt || Date.now()));

    log.info('[Publishing] Story published', { userId, accountId, storyId });

    res.json({
      ok: true,
      storyId,
      recordedAt: content.publishedAt,
    });
  } catch (err) {
    log.error('[Publish Story] Error', { error: String(err) });
    res.status(500).json({ error: 'Publishing failed' });
  }
});

/**
 * ─── Platform Publishing Helpers ───
 */

async function publishCarouselToInstagram(
  accessToken: string,
  slides: Array<{ image: string; caption: string }>,
  hashtags?: string,
): Promise<string | null> {
  try {
    // TODO: Implement Instagram Graph API carousel publishing
    // 1. Upload each slide image to Instagram
    // 2. Create carousel container with all slide IDs
    // 3. Return post ID
    log.info('[Instagram] Carousel publishing (stub)', { slideCount: slides.length });
    // Stub: return mock ID for now
    return `ig_carousel_${Date.now()}`;
  } catch (err) {
    log.error('[Instagram Carousel] Error', { error: String(err) });
    return null;
  }
}

async function publishReelToInstagram(
  accessToken: string,
  videoUrl: string,
  caption: string,
  hashtags?: string,
): Promise<string | null> {
  try {
    // TODO: Implement Instagram Graph API reel publishing
    // 1. Download/stream video from videoUrl
    // 2. Upload to Instagram Graph API
    // 3. Return reel ID
    log.info('[Instagram] Reel publishing (stub)', { videoUrl });
    return `ig_reel_${Date.now()}`;
  } catch (err) {
    log.error('[Instagram Reel] Error', { error: String(err) });
    return null;
  }
}

async function publishStoryToInstagram(
  accessToken: string,
  imageUrl: string,
  caption?: string,
  duration?: number,
): Promise<string | null> {
  try {
    // TODO: Implement Instagram Graph API story publishing
    log.info('[Instagram] Story publishing (stub)', { imageUrl });
    return `ig_story_${Date.now()}`;
  } catch (err) {
    log.error('[Instagram Story] Error', { error: String(err) });
    return null;
  }
}

async function publishToTikTok(
  accessToken: string,
  videoUrl: string,
  caption: string,
  hashtags?: string,
): Promise<string | null> {
  try {
    // TODO: Implement TikTok API video publishing
    // 1. Download/stream video
    // 2. Upload to TikTok API
    // 3. Return video ID
    log.info('[TikTok] Video publishing (stub)', { videoUrl });
    return `tt_video_${Date.now()}`;
  } catch (err) {
    log.error('[TikTok Video] Error', { error: String(err) });
    return null;
  }
}

export default router;
