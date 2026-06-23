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
): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
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
        maxRedirects: 5,
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
};

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
    const [, a, b, c, d] = ipMatch.map(Number);

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
): Promise<string> => {
  // This would call canva.uploadAsset() from canva.ts
  // For now, stub implementation
  const assetId = `asset-${Date.now()}`;
  return assetId;
};
