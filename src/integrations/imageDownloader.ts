/**
 * Image Downloader — Download images from URLs with anti-SSRF validation.
 * Supports JPEG, PNG, WebP, GIF up to 5MB.
 */

import https from 'https';
import http from 'http';
import { URL } from 'url';

export interface DownloadImageOptions {
  filename?: string;
  maxSize?: number; // bytes, default 5MB
  timeout?: number; // milliseconds, default 15s
  userAgent?: string;
}

/**
 * Download image from URL with anti-SSRF guards.
 * Returns Buffer or throws error.
 */
export const downloadImageFromUrl = async (
  urlString: string,
  options: DownloadImageOptions = {},
): Promise<Buffer> => {
  const {
    maxSize = 5 * 1024 * 1024, // 5MB
    timeout = 15000,
    userAgent = 'FeedIA-ImageDownloader/1.0',
  } = options;

  try {
    // Validate URL
    const url = new URL(urlString);

    // Anti-SSRF: Block private/loopback IPs
    if (isPrivateIP(url.hostname)) {
      throw new Error(`URL blocked: Private/loopback IP (${url.hostname})`);
    }

    // Support only http/https
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error(`Unsupported protocol: ${url.protocol}`);
    }

    const buffer = await downloadWithTimeout(urlString, maxSize, timeout, userAgent);
    return buffer;
  } catch (error) {
    throw new Error(`Failed to download image from ${urlString}: ${error}`);
  }
};

/**
 * Download with timeout and size limits.
 */
const downloadWithTimeout = async (
  urlString: string,
  maxSize: number,
  timeout: number,
  userAgent: string,
): Promise<Buffer> => new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;

    const request = client.get(
      urlString,
      {
        headers: {
          'User-Agent': userAgent,
          Accept: 'image/*',
        },
        timeout,
      },
      (response) => {
        // Check status
        if ((response.statusCode || 0) >= 400) {
          reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
          return;
        }

        // Check content-type
        const contentType = response.headers['content-type']?.toLowerCase() || '';
        if (!contentType.includes('image')) {
          reject(new Error(`Invalid content-type: ${contentType}`));
          return;
        }

        // Check content-length
        const contentLength = parseInt(response.headers['content-length'] || '0', 10);
        if (contentLength > maxSize) {
          reject(new Error(`File too large: ${contentLength} > ${maxSize}`));
          return;
        }

        const chunks: Buffer[] = [];
        let totalSize = 0;

        response.on('data', (chunk: Buffer) => {
          totalSize += chunk.length;
          if (totalSize > maxSize) {
            response.destroy();
            reject(new Error(`Download exceeded max size: ${maxSize}`));
            return;
          }
          chunks.push(chunk);
        });

        response.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer);
        });

        response.on('error', reject);
      },
    );

    request.on('timeout', () => {
      request.destroy();
      reject(new Error(`Download timeout after ${timeout}ms`));
    });

    request.on('error', reject);
  });

/**
 * Check if hostname is private/loopback IP.
 */
const isPrivateIP = (hostname: string): boolean => {
  // Check for localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
    return true;
  }

  // Parse as IPv4
  const ipMatch = hostname.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (ipMatch) {
    const nums = ipMatch.slice(1).map(Number);
    const a = nums[0] ?? 0;
    const b = nums[1] ?? 0;

    // 127.0.0.0/8 (loopback)
    if (a === 127) return true;

    // 10.0.0.0/8 (private)
    if (a === 10) return true;

    // 172.16.0.0/12 (private)
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.168.0.0/16 (private)
    if (a === 192 && b === 168) return true;

    // 169.254.0.0/16 (link-local)
    if (a === 169 && b === 254) return true;

    // 224.0.0.0/4 (multicast)
    if (a >= 224) return true;
  }

  return false;
};

/**
 * Upload downloaded image to Canva and return asset ID.
 */
export const uploadImageToCanva = async (
  imageBuffer: Buffer,
  filename: string,
  accountToken?: string,
): Promise<string | null> => {
  try {
    // In production, would call canva.uploadAsset() from canva.ts
    // For now, return mock asset ID
    const assetId = `asset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    return assetId;
  } catch (error) {
    console.error(`Failed to upload image to Canva: ${error}`);
    return null;
  }
};

/**
 * Download image from URL and upload to Canva in one step.
 * Used by carousel generator to fetch siluetas/elements.
 */
export const downloadAndUploadToCanva = async (
  imageUrl: string,
  filename: string,
  accountToken?: string,
): Promise<{ assetId: string | null; url: string; filename: string }> => {
  try {
    // Step 1: Download image
    const buffer = await downloadImageFromUrl(imageUrl, {
      filename,
      maxSize: 5 * 1024 * 1024, // 5MB
      timeout: 15000,
    });

    // Step 2: Upload to Canva
    const assetId = await uploadImageToCanva(buffer, filename, accountToken);

    return {
      assetId,
      url: imageUrl,
      filename,
    };
  } catch (error) {
    console.error(`Download+Upload failed for ${imageUrl}: ${error}`);
    return {
      assetId: null,
      url: imageUrl,
      filename,
    };
  }
};

/**
 * Parse prompt to detect image requests.
 * Examples: "silueta de persona", "elementos de trabajo", "iconos"
 */
export const detectImageRequests = (prompt: string): string[] => {
  const keywords = [
    'silueta',
    'persona',
    'gente',
    'elemento',
    'icono',
    'ilustración',
    'dibujo',
    'imagen',
    'fondo',
    'decoración',
  ];

  const matches: string[] = [];
  keywords.forEach((keyword) => {
    if (prompt.toLowerCase().includes(keyword)) {
      matches.push(keyword);
    }
  });

  return matches;
};

/**
 * Search for image URLs based on keywords.
 * Primary: Unsplash API (real images). Fallback: mock URLs.
 */
export const searchImageUrls = async (keywords: string[]): Promise<string[]> => {
  // Lazy import (only needed if UNSPLASH_API_KEY set)
  const { searchUnsplash, triggerUnsplashDownload } = await import('./unsplashAdapter.js');

  const urls: string[] = [];

  for (const keyword of keywords) {
    try {
      // Search Unsplash
      const results = await searchUnsplash(keyword, 3);

      if (results.length > 0) {
        // Trigger download counter (Unsplash ToS requirement)
        for (const result of results) {
          void triggerUnsplashDownload(result.id);
        }

        // Collect URLs
        urls.push(...results.map((r) => r.url));
      }
    } catch (err) {
      // Fallback: continue to next keyword
    }
  }

  // Fallback: mock URLs if Unsplash unavailable
  if (urls.length === 0) {
    const mockUrls: Record<string, string> = {
      silueta: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400',
      persona: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
      gente: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400',
      icono: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=400',
    };

    const fallbackUrls = keywords
      .map((k) => mockUrls[k.toLowerCase()])
      .filter((url) => url !== undefined);

    return fallbackUrls;
  }

  return urls;
};
