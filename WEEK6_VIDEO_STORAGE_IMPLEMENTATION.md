# Week 6: Video Storage Implementation

**Goal**: Enable Veo 3.1 video uploads to Backblaze B2 with auto-encoding for Instagram (1080x1920, 8000kbps). Premium tier only. +$270/mo revenue projection.

---

## Database Schema Update

```sql
ALTER TABLE carousels ADD COLUMN IF NOT EXISTS video_url TEXT;
ALTER TABLE carousels ADD COLUMN IF NOT EXISTS video_size_mb INT DEFAULT 0;
ALTER TABLE carousels ADD COLUMN IF NOT EXISTS video_duration_sec INT;
ALTER TABLE carousels ADD COLUMN IF NOT EXISTS video_model VARCHAR(50) DEFAULT 'veo-3.1';

CREATE TABLE IF NOT EXISTS videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  carousel_id UUID NOT NULL REFERENCES carousels(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  video_url TEXT NOT NULL,
  file_size_mb INT NOT NULL,
  duration_sec INT,
  model VARCHAR(50) DEFAULT 'veo-3.1',
  status VARCHAR(20) DEFAULT 'processing', -- processing, ready, failed
  encoding_status VARCHAR(20) DEFAULT 'queued', -- queued, encoding, complete, error
  instagram_url TEXT, -- 1080x1920 version
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  INDEX (carousel_id),
  INDEX (user_id),
  INDEX (status)
);

-- Storage quota override: Video not counted toward GB limit (stored separately)
ALTER TABLE pricing_plans ADD COLUMN IF NOT EXISTS video_storage_gb INT DEFAULT 0;
-- Free: 0GB, Pro: 10GB, Premium: unlimited
```

---

## Video Upload Service

**File**: `src/services/video-storage.ts`

```typescript
import fetch from 'node-fetch';
import { log } from '../agent/logger.js';
import { carouselDB } from '../db/postgres.js';

interface VideoUploadResult {
  videoId: string;
  url: string;
  size_mb: number;
  duration_sec?: number;
  status: string;
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

  private getAuthHeader(): string {
    return `Basic ${Buffer.from(`${this.keyId}:${this.appKey}`).toString('base64')}`;
  }

  /**
   * Upload video to Backblaze B2 videos bucket
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
      const pool = (carouselDB as any).pool;
      await pool.query(
        `INSERT INTO videos (carousel_id, user_id, video_url, file_size_mb, model, status, encoding_status)
         VALUES ($1, $2, $3, $4, $5, 'processing', 'queued')`,
        [carouselId, userId, url, sizeMb],
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
  private async queueEncodingJob(videoId: string, videoUrl: string, carouselId: string, userId: string): Promise<void> {
    try {
      // Queue job: FFmpeg encode to 1080x1920 @ 8000kbps
      // This will run in background via worker service
      log.info('Encoding job queued', { videoId, videoUrl });
    } catch (err) {
      log.info('Error queueing encoding job', { videoId, error: err });
    }
  }

  /**
   * Get video storage stats for user
   */
  async getUserVideoStats(userId: string): Promise<{
    total_videos: number;
    total_video_storage_mb: number;
    quota_mb: number;
  }> {
    try {
      const pool = (carouselDB as any).pool;

      // Get user plan to determine quota
      const userResult = await pool.query(`SELECT plan FROM users WHERE id = $1`, [userId]);
      if (userResult.rows.length === 0) throw new Error('User not found');

      const plan = userResult.rows[0].plan;
      const quotaResult = await pool.query(`SELECT video_storage_gb FROM pricing_plans WHERE plan_name = $1`, [plan]);
      const quotaMb = (quotaResult.rows[0]?.video_storage_gb || 0) * 1024;

      // Get user's video storage usage
      const statsResult = await pool.query(
        `SELECT COUNT(*) as total_videos, SUM(file_size_mb) as total_storage FROM videos WHERE user_id = $1`,
        [userId],
      );

      const row = statsResult.rows[0];
      return {
        total_videos: parseInt(row.total_videos) || 0,
        total_video_storage_mb: parseInt(row.total_storage) || 0,
        quota_mb: quotaMb,
      };
    } catch (err) {
      log.info('Error getting video stats', { userId, error: err });
      throw err;
    }
  }

  /**
   * Delete video (frees storage)
   */
  async deleteVideo(videoUrl: string, videoId: string): Promise<void> {
    try {
      const key = videoUrl.split(`${this.videoBucketName}/`)[1];
      if (!key) throw new Error('Invalid URL format');

      const deleteUrl = `${this.endpoint}/${this.videoBucketName}/${key}`;
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { Authorization: this.getAuthHeader() },
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }

      // Update DB status
      const pool = (carouselDB as any).pool;
      await pool.query(`UPDATE videos SET status = 'deleted' WHERE id = $1`, [videoId]);

      log.info('Video deleted', { videoId, url: videoUrl });
    } catch (err) {
      log.info('Error deleting video', { videoId, error: err });
      throw err;
    }
  }
}

export const videoStorage = new VideoStorage();
```

---

## API Routes

**File**: `src/api/video-storage-routes.ts`

```typescript
import { Router, Request, Response } from 'express';
import multer from 'multer';
import { videoStorage } from '../services/video-storage.js';
import { carouselDB } from '../db/postgres.js';
import { log } from '../agent/logger.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 * 1024 } }); // 5GB max

/**
 * 1. Upload video to carousel
 * POST /api/carousels/:carousel_id/videos
 * Requires: Premium tier
 */
router.post('/api/carousels/:carousel_id/videos', upload.single('video'), async (req: Request, res: Response) => {
  try {
    const carouselId = req.params.carousel_id as string;
    const userId = (req as any).userId;
    const file = req.file;

    if (!userId || !carouselId || !file) {
      return res.status(400).json({ error: 'Missing carousel_id, user_id, or video file' });
    }

    // Check plan
    const pool = (carouselDB as any).pool;
    const planResult = await pool.query(`SELECT plan FROM users WHERE id = $1`, [userId]);
    if (planResult.rows.length === 0 || planResult.rows[0].plan !== 'premium') {
      return res.status(403).json({ error: 'Video storage requires Premium tier' });
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
    const pool = (carouselDB as any).pool;

    const result = await pool.query(
      `SELECT id, video_url, file_size_mb, duration_sec, status, encoding_status, instagram_url, created_at
       FROM videos WHERE carousel_id = $1 ORDER BY created_at DESC`,
      [carouselId],
    );

    return res.json({
      carousel_id: carouselId,
      videos: result.rows,
      count: result.rows.length,
    });
  } catch (err) {
    log.info('Error fetching videos', { error: err });
    return res.status(500).json({ error: 'Failed to fetch videos' });
  }
});

/**
 * 3. Delete video
 * DELETE /api/videos/:video_id
 */
router.delete('/api/videos/:video_id', async (req: Request, res: Response) => {
  try {
    const videoId = req.params.video_id as string;
    const userId = (req as any).userId;
    const pool = (carouselDB as any).pool;

    // Verify ownership
    const videoResult = await pool.query(`SELECT video_url, user_id FROM videos WHERE id = $1`, [videoId]);
    if (videoResult.rows.length === 0 || videoResult.rows[0].user_id !== userId) {
      return res.status(403).json({ error: 'Not authorized to delete this video' });
    }

    const videoUrl = videoResult.rows[0].video_url;
    await videoStorage.deleteVideo(videoUrl, videoId);

    return res.json({ message: 'Video deleted successfully' });
  } catch (err) {
    log.info('Error deleting video', { error: err });
    return res.status(500).json({ error: 'Failed to delete video' });
  }
});

/**
 * 4. Get user video storage stats
 * GET /api/users/:user_id/video-storage
 */
router.get('/api/users/:user_id/video-storage', async (req: Request, res: Response) => {
  try {
    const userId = req.params.user_id as string;

    const stats = await videoStorage.getUserVideoStats(userId);

    return res.json({
      user_id: userId,
      total_videos: stats.total_videos,
      total_storage_mb: stats.total_video_storage_mb,
      quota_mb: stats.quota_mb,
      utilization_percent: stats.quota_mb > 0 ? ((stats.total_video_storage_mb / stats.quota_mb) * 100).toFixed(1) : 0,
      can_upload: stats.total_video_storage_mb < stats.quota_mb,
    });
  } catch (err) {
    log.info('Error fetching video storage stats', { error: err });
    return res.status(500).json({ error: 'Failed to fetch video storage stats' });
  }
});

export default router;
```

---

## Pricing Updates

Update `pricing_plans` table:

```sql
UPDATE pricing_plans SET video_storage_gb = 0 WHERE plan_name = 'free';
UPDATE pricing_plans SET video_storage_gb = 10 WHERE plan_name = 'pro';
UPDATE pricing_plans SET video_storage_gb = 1000 WHERE plan_name = 'premium'; -- Unlimited (1TB soft cap)
```

---

## Background Worker (Encoding)

**File**: `src/workers/video-encoder.ts`

Uses BullMQ queue to process video encoding asynchronously:

```typescript
import { Worker } from 'bullmq';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { carouselDB } from '../db/postgres.js';
import { log } from '../agent/logger.js';

const execFileAsync = promisify(execFile);

// Redis connection for BullMQ
const videoQueue = new Queue('video-encoding', {
  connection: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
  },
});

// Worker process
const worker = new Worker(
  'video-encoding',
  async (job) => {
    const { videoId, videoUrl, carouselId, userId } = job.data;

    try {
      // Download video from B2
      const videoBuffer = await fetch(videoUrl).then((r) => r.arrayBuffer());

      // FFmpeg encode: 1080x1920 @ 8000kbps
      const tempFile = `/tmp/video_${videoId}.mp4`;
      const outputFile = `/tmp/video_${videoId}_encoded.mp4`;

      // Save downloaded video
      require('fs').writeFileSync(tempFile, Buffer.from(videoBuffer));

      // Encode
      await execFileAsync('ffmpeg', [
        '-i',
        tempFile,
        '-vf',
        'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2',
        '-b:v',
        '8000k',
        '-c:v',
        'libx264',
        '-preset',
        'fast',
        '-movflags',
        '+faststart',
        outputFile,
      ]);

      // Upload encoded version to B2
      const encodedBuffer = require('fs').readFileSync(outputFile);
      const instagramUrl = await videoStorage.uploadEncodedVideo(encodedBuffer, userId, carouselId, videoId);

      // Update DB
      const pool = (carouselDB as any).pool;
      await pool.query(
        `UPDATE videos SET encoding_status = 'complete', instagram_url = $1, status = 'ready', updated_at = NOW()
         WHERE id = $2`,
        [instagramUrl, videoId],
      );

      log.info('Video encoding complete', { videoId, instagramUrl });

      // Cleanup temp files
      require('fs').unlinkSync(tempFile);
      require('fs').unlinkSync(outputFile);

      return { success: true, instagramUrl };
    } catch (err) {
      log.info('Video encoding failed', { videoId, error: err });

      // Mark as failed
      const pool = (carouselDB as any).pool;
      await pool.query(`UPDATE videos SET encoding_status = 'error', status = 'failed' WHERE id = $1`, [videoId]);

      throw err;
    }
  },
  {
    connection: {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
    },
  },
);

worker.on('completed', (job) => {
  log.info('Encoding job completed', { jobId: job.id });
});

worker.on('failed', (job) => {
  log.info('Encoding job failed', { jobId: job?.id });
});

export default worker;
```

---

## Implementation Checklist

- [ ] **Database**: Run schema migrations (carousels columns, videos table, pricing_plans update)
- [ ] **Services**: Implement VideoStorage class (upload, delete, stats)
- [ ] **API Routes**: Add 4 video endpoints to server
- [ ] **Background Worker**: Set up BullMQ + FFmpeg encoding pipeline
- [ ] **Package.json**: Add `bullmq`, `@types/node` for Worker API
- [ ] **Premium Tier Gating**: Verify plan check in upload route
- [ ] **Storage Quota**: Implement separate video quota (not counted in GB limit)
- [ ] **Testing**: Upload test video, verify encoding, check B2 storage
- [ ] **Deployment**: Deploy to Railway with Redis for BullMQ

---

## Success Criteria

| Metric                     | Target                             |
| -------------------------- | ---------------------------------- |
| Video upload success rate  | >99%                               |
| Encoding time (5min video) | <10min                             |
| Instagram URL generation   | 100%                               |
| Storage cost per GB        | $0.006 (B2 standard)               |
| Revenue impact             | +$270/mo (Premium conversion +15%) |

---

## Next: Analytics Dashboard (Week 6-7 overlapped)

After video storage stabilizes, begin analytics implementation (GET /api/carousels/:id/analytics).
