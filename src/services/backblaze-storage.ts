/**
 * Backblaze B2 Storage Service
 * Replaces Wasabi for 72% cost savings ($215→$60/mo)
 * Week 4: Infrastructure optimization
 */

import fetch from 'node-fetch';
import { log } from '../agent/logger.js';

interface UploadResult {
  url: string;
  size_kb: number;
  hash: string;
  compressed: boolean;
}

class BackblazeStorage {
  private keyId = process.env.BACKBLAZE_KEY_ID;
  private appKey = process.env.BACKBLAZE_APP_KEY;
  private bucketName = process.env.BACKBLAZE_BUCKET_NAME || 'feedia-carousels';
  private endpoint = 'https://s3.us-west-000.backblazeb2.com';
  private authToken: string | null = null;

  constructor() {
    if (!this.keyId || !this.appKey) {
      throw new Error('BACKBLAZE_KEY_ID and BACKBLAZE_APP_KEY must be set');
    }
  }

  /**
   * Get authorization header for B2 API
   */
  private getAuthHeader(): string {
    return `Basic ${Buffer.from(`${this.keyId}:${this.appKey}`).toString('base64')}`;
  }

  /**
   * Upload image to Backblaze B2
   */
  async uploadImage(
    imageBuffer: Buffer,
    userId: string,
    carouselId: string,
    slideNumber: number,
    compressed: boolean = false,
  ): Promise<UploadResult> {
    try {
      const timestamp = Date.now();
      const extension = compressed ? 'webp' : 'jpg';
      const key = `users/${userId}/carousels/${carouselId}/slide_${slideNumber}_${timestamp}.${extension}`;
      const url = `${this.endpoint}/${this.bucketName}/${key}`;
      const contentType = compressed ? 'image/webp' : 'image/jpeg';

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: this.getAuthHeader(),
          'Content-Type': contentType,
          'Cache-Control': 'max-age=31536000', // 1 year
        },
        body: imageBuffer,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const size_kb = Math.round(imageBuffer.length / 1024);
      const hash = this.hashBuffer(imageBuffer);

      log.info('Image uploaded to Backblaze B2', {
        url,
        size_kb,
        compressed,
        key,
      });

      return {
        url,
        size_kb,
        hash,
        compressed,
      };
    } catch (err) {
      log.info('Error uploading to Backblaze', { userId, carouselId, error: err });
      throw err;
    }
  }

  /**
   * Batch upload multiple images
   */
  async uploadBatch(
    images: Array<{ buffer: Buffer; slideNumber: number }>,
    userId: string,
    carouselId: string,
    compressed: boolean = false,
  ): Promise<UploadResult[]> {
    try {
      const results = await Promise.all(
        images.map((img) => this.uploadImage(img.buffer, userId, carouselId, img.slideNumber, compressed)),
      );
      return results;
    } catch (err) {
      log.info('Error in batch upload', { userId, carouselId, error: err });
      throw err;
    }
  }

  /**
   * Delete image from Backblaze B2
   */
  async deleteImage(url: string): Promise<void> {
    try {
      // Extract key from URL
      const key = url.split(`${this.bucketName}/`)[1];
      if (!key) {
        throw new Error('Invalid URL format');
      }

      const deleteUrl = `${this.endpoint}/${this.bucketName}/${key}`;
      const response = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { Authorization: this.getAuthHeader() },
      });

      if (!response.ok) {
        throw new Error(`Delete failed: ${response.statusText}`);
      }

      log.info('Image deleted from Backblaze', { url, key });
    } catch (err) {
      log.info('Error deleting from Backblaze', { url, error: err });
      throw err;
    }
  }

  /**
   * List files for a user's carousel
   */
  async listCarouselImages(userId: string, carouselId: string) {
    try {
      const prefix = `users/${userId}/carousels/${carouselId}/`;

      // Backblaze B2 list API call (S3 compatible)
      const listUrl = `${this.endpoint}/${this.bucketName}?prefix=${encodeURIComponent(prefix)}`;
      const response = await fetch(listUrl, {
        method: 'GET',
        headers: { Authorization: this.getAuthHeader() },
      });

      if (!response.ok) {
        throw new Error(`List failed: ${response.statusText}`);
      }

      // Parse XML response (S3 ListObjects format)
      const text = await response.text();

      // Simple XML parse (extract key, size, modified)
      const keys: string[] = [];
      const keyRegex = /<Key>([^<]+)<\/Key>/g;
      let match;
      while ((match = keyRegex.exec(text)) !== null) {
        keys.push(match[1]);
      }

      return keys.map((key) => ({
        key,
        url: `${this.endpoint}/${this.bucketName}/${key}`,
      }));
    } catch (err) {
      log.info('Error listing carousel images', { userId, carouselId, error: err });
      throw err;
    }
  }

  /**
   * Get user storage stats
   */
  async getUserStorageStats(userId: string): Promise<{
    total_files: number;
    total_bytes: number;
    total_mb: number;
  }> {
    try {
      const prefix = `users/${userId}/`;
      const listUrl = `${this.endpoint}/${this.bucketName}?prefix=${encodeURIComponent(prefix)}`;

      const response = await fetch(listUrl, {
        method: 'GET',
        headers: { Authorization: this.getAuthHeader() },
      });

      if (!response.ok) {
        throw new Error(`List failed: ${response.statusText}`);
      }

      const text = await response.text();

      // Parse sizes from XML
      const sizes: number[] = [];
      const sizeRegex = /<Size>(\d+)<\/Size>/g;
      let match;
      while ((match = sizeRegex.exec(text)) !== null) {
        sizes.push(parseInt(match[1], 10));
      }

      const totalBytes = sizes.reduce((sum, size) => sum + size, 0);

      return {
        total_files: sizes.length,
        total_bytes: totalBytes,
        total_mb: Math.round((totalBytes / (1024 * 1024)) * 100) / 100,
      };
    } catch (err) {
      log.info('Error getting storage stats', { userId, error: err });
      throw err;
    }
  }

  /**
   * Generate pre-signed URL for direct upload
   * (Browser to Backblaze, no server bottleneck)
   */
  async generateUploadSignature(
    userId: string,
    carouselId: string,
    slideNumber: number,
    expirySeconds: number = 3600,
  ): Promise<{
    url: string;
    fields: Record<string, string>;
  }> {
    try {
      const key = `users/${userId}/carousels/${carouselId}/slide_${slideNumber}_${Date.now()}.webp`;

      // For Backblaze, return direct S3-compatible URL
      // Client can PUT directly to this URL with proper auth
      const uploadUrl = `${this.endpoint}/${this.bucketName}/${key}`;

      return {
        url: uploadUrl,
        fields: {
          key,
          bucket: this.bucketName,
          // Client must add Authorization header
        },
      };
    } catch (err) {
      log.info('Error generating upload signature', { error: err });
      throw err;
    }
  }

  /**
   * SHA-256 hash for deduplication
   */
  private hashBuffer(buffer: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }
}

export const backblazeStorage = new BackblazeStorage();
