/**
 * Video Storage Service
 * Handles video uploads to Backblaze B2, background encoding via BullMQ
 * Week 6: Video storage feature for Premium tier
 */

import crypto from 'crypto';
import fetch from 'node-fetch';
import { log } from '../agent/logger.js';
import { queryAs, queryOneAs, executeMutation } from '../db/typed-queries.js';

interface VideoUploadResult {
  videoId: string;
  url: string;
  size_mb: number;
  duration_sec?: number;
  status: string;
}

interface VideoStats {
  total_videos: number;
  total_video_storage_mb: number;
  quota_mb: number;
}

interface VideoRow {
  id: string;
  carousel_id: string;
  user_id: string;
  video_url: string;
  file_size_mb: number;
  duration_sec?: number | null;
  model?: string;
  status: string;
  encoding_status: string;
  instagram_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface UserRow {
  id: string;
  plan: string;
}

interface PricingPlanRow {
  plan_name: string;
  video_storage_gb: number;
}

interface VideoStatsRow {
  total_videos: string | number;
  total_storage: string | number;
}

class VideoStorage {
  private keyId = process.env.BACKBLAZE_KEY_ID;
  private appKey = process.env.BACKBLAZE_APP_KEY;
  private bucketName = process.env.BACKBLAZE_BUCKET_NAME || 'feedia-carousels';
  private videoBucketName = `${this.bucketName}-videos`;
  private endpoint = 'https://s3.us-west-000.backblazeb2.com';

  constructor() {
    if (!this.keyId || !this.appKey) {
      throw new Error('BACKBLAZE_KEY_ID and BACKBLAZE_APP_KEY must be set');
    }
  }

  /**
   * Get B2 authorization header
   */
  private getAuthHeader(): string {
    const keyId = this.keyId || '';
    const appKey = this.appKey || '';
    return `Basic ${Buffer.from(`${keyId}:${appKey}`).toString('base64')}`;
  }

  /**
   * Upload video to Backblaze B2 videos bucket
   * Returns upload result with videoId for tracking
   */
  async uploadVideo(
    videoBuffer: Buffer,
    userId: string,
    carouselId: string,
    model: string = 'veo-3.1',
  ): Promise<VideoUploadResult> {
    try {
      const videoId = crypto.randomUUID();
      const timestamp = Date.now();
      const key = `users/${userId}/videos/${carouselId}/${videoId}_${timestamp}.mp4`;
      const url = `${this.endpoint}/${this.videoBucketName}/${key}`;
      const sizeKb = Math.round(videoBuffer.length / 1024);
      const sizeMb = Math.round(sizeKb / 1024);

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'video/mp4',
          'Cache-Control': 'max-age=31536000',
        },
        body: videoBuffer,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      // Insert video record into DB
      await executeMutation(
        `INSERT INTO videos (carousel_id, user_id, video_url, file_size_mb, model, status, encoding_status)
         VALUES ($1, $2, $3, $4, $5, 'processing', 'queued')`,
        [carouselId, userId, url, sizeMb, model],
      );

      // Queue encoding job (async, will process in background)
      await this.queueEncodingJob(videoId, url, carouselId, userId);

      log.info('Video uploaded to Backblaze B2', {
        videoId,
        url,
        size_mb: sizeMb,
        model,
      });

      return {
        videoId,
        url,
        size_mb: sizeMb,
        status: 'processing',
      };
    } catch (err) {
      log.info('Error uploading video', { userId, carouselId, error: err });
      throw err;
    }
  }

  /**
   * Queue video encoding job (1080x1920, 8000kbps for Instagram)
   * Uses background worker/queue (BullMQ)
   */
  private async queueEncodingJob(
    videoId: string,
    videoUrl: string,
    _carouselId: string,
    _userId: string,
  ): Promise<void> {
    try {
      // TODO: Integrate with BullMQ queue
      // For now, log the job request
      log.info('Encoding job queued', { videoId, videoUrl });

      // Job format (for BullMQ worker):
      // {
      //   videoId,
      //   videoUrl,
      //   carouselId,
      //   userId,
      //   outputFormat: '1080x1920',
      //   bitrate: '8000k',
      //   codec: 'libx264'
      // }
    } catch (err) {
      log.info('Error queueing encoding job', { videoId, error: err });
    }
  }

  /**
   * Get video storage stats for user
   * Returns total videos, storage used, and quota based on plan
   */
  async getUserVideoStats(userId: string): Promise<VideoStats> {
    try {
      // Get user plan to determine quota
      const userRow = await queryOneAs<UserRow>(`SELECT plan FROM users WHERE id = $1`, [userId]);
      if (!userRow) {
        throw new Error('User not found');
      }

      // Get video storage quota for plan
      const quotaRow = await queryOneAs<PricingPlanRow>(
        `SELECT video_storage_gb FROM pricing_plans WHERE plan_name = $1`,
        [userRow.plan],
      );
      const quotaMb = (quotaRow?.video_storage_gb || 0) * 1024;

      // Get user's video storage usage
      const statsRow = await queryOneAs<VideoStatsRow>(
        `SELECT COUNT(*) as total_videos, COALESCE(SUM(file_size_mb), 0) as total_storage FROM videos WHERE user_id = $1 AND status != 'deleted'`,
        [userId],
      );

      return {
        total_videos:
          typeof statsRow?.total_videos === 'string'
            ? parseInt(statsRow.total_videos, 10)
            : statsRow?.total_videos || 0,
        total_video_storage_mb:
          typeof statsRow?.total_storage === 'string'
            ? parseInt(statsRow.total_storage, 10)
            : statsRow?.total_storage || 0,
        quota_mb: quotaMb,
      };
    } catch (err) {
      log.info('Error getting video stats', { userId, error: err });
      throw err;
    }
  }

  /**
   * Get video by ID
   */
  async getVideo(videoId: string): Promise<VideoRow | null> {
    try {
      return queryOneAs<VideoRow>(
        `SELECT id, carousel_id, user_id, video_url, file_size_mb, duration_sec, model, status, encoding_status, instagram_url, created_at, updated_at
         FROM videos WHERE id = $1`,
        [videoId],
      );
    } catch (err) {
      log.info('Error fetching video', { videoId, error: err });
      throw err;
    }
  }

  /**
   * Get all videos for carousel
   */
  async getCarouselVideos(carouselId: string): Promise<VideoRow[]> {
    try {
      return queryAs<VideoRow>(
        `SELECT id, carousel_id, user_id, video_url, file_size_mb, duration_sec, model, status, encoding_status, instagram_url, created_at, updated_at
         FROM videos WHERE carousel_id = $1 AND status != 'deleted' ORDER BY created_at DESC`,
        [carouselId],
      );
    } catch (err) {
      log.info('Error fetching carousel videos', { carouselId, error: err });
      throw err;
    }
  }

  /**
   * Update video encoding status
   * Called by background worker after encoding completes
   */
  async updateEncodingStatus(
    videoId: string,
    encodingStatus: 'complete' | 'error',
    instagramUrl?: string,
    duration?: number,
  ): Promise<void> {
    try {
      const status = encodingStatus === 'complete' ? 'ready' : 'failed';

      await executeMutation(
        `UPDATE videos SET encoding_status = $1, status = $2, instagram_url = $3, duration_sec = $4, updated_at = NOW()
         WHERE id = $5`,
        [encodingStatus, status, instagramUrl || null, duration || null, videoId],
      );

      log.info('Video encoding status updated', { videoId, encodingStatus, status });
    } catch (err) {
      log.info('Error updating video encoding status', { videoId, error: err });
      throw err;
    }
  }

  /**
   * Upload encoded video (Instagram format)
   * Called by background worker after encoding
   */
  async uploadEncodedVideo(
    encodedBuffer: Buffer,
    userId: string,
    carouselId: string,
    videoId: string,
  ): Promise<string> {
    try {
      const timestamp = Date.now();
      const key = `users/${userId}/videos/${carouselId}/${videoId}_instagram_${timestamp}.mp4`;
      const url = `${this.endpoint}/${this.videoBucketName}/${key}`;

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': 'video/mp4',
          'Cache-Control': 'max-age=31536000',
        },
        body: encodedBuffer,
      });

      if (!response.ok) {
        throw new Error(`Encoded upload failed: ${response.statusText}`);
      }

      log.info('Encoded video uploaded', { videoId, url });
      return url;
    } catch (err) {
      log.info('Error uploading encoded video', { videoId, error: err });
      throw err;
    }
  }

  /**
   * Delete video (soft delete — marks as deleted)
   * Frees storage quota for user
   */
  async deleteVideo(videoId: string, userId: string): Promise<void> {
    try {
      // Verify ownership
      interface VideoCheckRow {
        user_id: string;
        video_url: string;
        instagram_url?: string | null;
      }
      const video = await queryOneAs<VideoCheckRow>(
        `SELECT user_id, video_url, instagram_url FROM videos WHERE id = $1`,
        [videoId],
      );
      if (!video) {
        throw new Error('Video not found');
      }

      if (video.user_id !== userId) {
        throw new Error('Not authorized to delete this video');
      }

      // Mark as deleted in DB
      await executeMutation(`UPDATE videos SET status = 'deleted', updated_at = NOW() WHERE id = $1`, [videoId]);

      // TODO: Queue B2 deletion in background (soft delete in DB first)
      // This prevents re-uploads and quota issues if deletion fails
      await this.queueDeletionJob(video.video_url, video.instagram_url || undefined);

      log.info('Video deleted', { videoId, userId });
    } catch (err) {
      log.info('Error deleting video', { videoId, error: err });
      throw err;
    }
  }

  /**
   * Queue video deletion job
   * Removes files from B2 asynchronously
   */
  private async queueDeletionJob(videoUrl: string, instagramUrl?: string): Promise<void> {
    try {
      // TODO: Integrate with BullMQ queue for background deletion
      log.info('Deletion job queued', { videoUrl, instagramUrl });
    } catch (err) {
      log.info('Error queueing deletion job', { error: err });
    }
  }

  /**
   * Delete video from B2 (called by background worker)
   */
  async deleteFromB2(videoUrl: string): Promise<void> {
    try {
      const key = videoUrl.split(`${this.videoBucketName}/`)[1];
      if (!key) {
        throw new Error('Invalid URL format');
      }

      const deleteUrl = `${this.endpoint}/${this.videoBucketName}/${key}`;
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { Authorization: this.getAuthHeader() },
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }

      log.info('Video deleted from B2', { videoUrl });
    } catch (err) {
      log.info('Error deleting video from B2', { videoUrl, error: err });
      throw err;
    }
  }

  /**
   * Check if user can upload more videos
   * Returns true if user has storage quota remaining
   */
  async canUploadMore(userId: string): Promise<boolean> {
    try {
      const stats = await this.getUserVideoStats(userId);
      return stats.total_video_storage_mb < stats.quota_mb;
    } catch (err) {
      log.info('Error checking upload permission', { userId, error: err });
      return false;
    }
  }

  /**
   * Get upload remaining for user (in MB)
   */
  async getUploadRemaining(userId: string): Promise<number> {
    try {
      const stats = await this.getUserVideoStats(userId);
      return Math.max(0, stats.quota_mb - stats.total_video_storage_mb);
    } catch (err) {
      log.info('Error getting upload remaining', { userId, error: err });
      return 0;
    }
  }
}

export const videoStorage = new VideoStorage();
