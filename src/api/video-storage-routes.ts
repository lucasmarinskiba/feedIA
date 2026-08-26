/**
 * Video Storage API Routes
 * Handles video uploads, retrieval, and deletion
 * Week 6: Video storage feature for Premium tier
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import { videoStorage } from '../services/video-storage.js';
import { queryOneAs } from '../db/typed-queries.js';
import { log } from '../agent/logger.js';

interface UserPlanRow {
  plan: string;
}

interface CarouselCheckRow {
  id?: string;
  user_id?: string;
}

interface VideoCheckRow {
  user_id: string;
}

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 * 1024 } }); // 5GB max

/**
 * 1. Upload video to carousel
 * POST /api/carousels/:carousel_id/videos
 * Requires: Premium tier
 * Body: multipart/form-data with 'video' field
 */
router.post('/api/carousels/:carousel_id/videos', upload.single('video'), async (req: Request, res: Response) => {
  try {
    const carouselId = req.params.carousel_id as string;
    const userId = (req as unknown as Record<string, any>).userId as string; // eslint-disable-line @typescript-eslint/no-explicit-any
    const file = req.file;

    if (!userId || !carouselId) {
      return res.status(400).json({ error: 'Missing carousel_id or auth' });
    }

    if (!file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    // Check plan
    const userPlan = await queryOneAs<UserPlanRow>(`SELECT plan FROM users WHERE id = $1`, [userId]);
    if (!userPlan) {
      return res.status(401).json({ error: 'User not found' });
    }

    const plan = userPlan.plan;
    if (plan !== 'premium') {
      return res.status(403).json({ error: 'Video storage requires Premium tier' });
    }

    // Check quota
    const canUpload = await videoStorage.canUploadMore(userId);
    if (!canUpload) {
      return res.status(409).json({ error: 'Video storage quota exceeded' });
    }

    // Verify carousel ownership
    const carousel = await queryOneAs<CarouselCheckRow>(`SELECT user_id FROM carousels WHERE id = $1`, [carouselId]);
    if (!carousel || carousel.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to upload to this carousel' });
    }

    // Upload video
    const result = await videoStorage.uploadVideo(file.buffer, userId, carouselId);

    return res.status(201).json({
      videoId: result.videoId,
      url: result.url,
      size_mb: result.size_mb,
      status: result.status,
      message: 'Video uploaded. Encoding to 1080x1920 @ 8000kbps for Instagram...',
    });
  } catch (err) {
    log.info('Error uploading video', { error: err });
    return res.status(500).json({ error: 'Failed to upload video' });
  }
});

/**
 * 2. Get carousel videos
 * GET /api/carousels/:carousel_id/videos
 */
router.get('/api/carousels/:carousel_id/videos', async (req: Request, res: Response) => {
  try {
    const carouselId = req.params.carousel_id as string;

    // Verify carousel exists
    const carousel = await queryOneAs<{ id: string }>(`SELECT id FROM carousels WHERE id = $1`, [carouselId]);
    if (!carousel) {
      return res.status(404).json({ error: 'Carousel not found' });
    }

    const videos = await videoStorage.getCarouselVideos(carouselId);

    return res.json({
      carousel_id: carouselId,
      videos,
      count: videos.length,
    });
  } catch (err) {
    log.info('Error fetching videos', { error: err });
    return res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

/**
 * 3. Get video details
 * GET /api/videos/:video_id
 */
router.get('/api/videos/:video_id', async (req: Request, res: Response) => {
  try {
    const videoId = req.params.video_id as string;

    const video = await videoStorage.getVideo(videoId);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    return res.json({
      video,
    });
  } catch (err) {
    log.info('Error fetching video details', { error: err });
    return res.status(500).json({ error: 'Failed to fetch video details' });
  }
});

/**
 * 4. Delete video
 * DELETE /api/videos/:video_id
 * Requires: ownership of video
 */
router.delete('/api/videos/:video_id', async (req: Request, res: Response) => {
  try {
    const videoId = req.params.video_id as string;
    const userId = (req as unknown as Record<string, any>).userId as string; // eslint-disable-line @typescript-eslint/no-explicit-any

    if (!userId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Verify ownership
    const video = await queryOneAs<VideoCheckRow>(`SELECT user_id FROM videos WHERE id = $1`, [videoId]);
    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    if (video.user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this video' });
    }

    await videoStorage.deleteVideo(videoId, userId);

    return res.json({ message: 'Video deleted successfully' });
  } catch (err) {
    log.info('Error deleting video', { error: err });
    return res.status(500).json({ error: 'Failed to delete video' });
  }
});

/**
 * 5. Get user video storage stats
 * GET /api/users/:user_id/video-storage
 */
router.get('/api/users/:user_id/video-storage', async (req: Request, res: Response) => {
  try {
    const userId = req.params.user_id as string;

    const stats = await videoStorage.getUserVideoStats(userId);
    const remaining = await videoStorage.getUploadRemaining(userId);

    return res.json({
      user_id: userId,
      total_videos: stats.total_videos,
      total_storage_mb: stats.total_video_storage_mb,
      quota_mb: stats.quota_mb,
      remaining_mb: remaining,
      utilization_percent:
        stats.quota_mb > 0 ? ((stats.total_video_storage_mb / stats.quota_mb) * 100).toFixed(1) : '0',
      can_upload: remaining > 0,
    });
  } catch (err) {
    log.info('Error fetching video storage stats', { error: err });
    return res.status(500).json({ error: 'Failed to fetch video storage stats' });
  }
});

/**
 * 6. Check upload permission
 * GET /api/users/:user_id/can-upload-video
 */
router.get('/api/users/:user_id/can-upload-video', async (req: Request, res: Response) => {
  try {
    const userId = req.params.user_id as string;

    const canUpload = await videoStorage.canUploadMore(userId);
    const remaining = await videoStorage.getUploadRemaining(userId);

    return res.json({
      user_id: userId,
      can_upload: canUpload,
      remaining_mb: remaining,
    });
  } catch (err) {
    log.info('Error checking upload permission', { error: err });
    return res.status(500).json({ error: 'Failed to check upload permission' });
  }
});

export default router;
