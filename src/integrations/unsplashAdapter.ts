/**
 * Unsplash API Adapter — Search for high-quality stock images.
 * Free tier: 50 requests/hour.
 */

import { log } from '../agent/logger.js';

const UNSPLASH_API_KEY = process.env['UNSPLASH_API_KEY'];
const UNSPLASH_API_BASE = 'https://api.unsplash.com';

export interface UnsplashImage {
  id: string;
  url: string;
  description: string;
  attribution: string;
}

/**
 * Search Unsplash by keyword.
 * Returns up to 10 results with download URLs.
 */
export const searchUnsplash = async (query: string, limit: number = 5): Promise<UnsplashImage[]> => {
  if (!UNSPLASH_API_KEY) {
    log.warn('[Unsplash] API key not set. Falling back to mock images.');
    return [];
  }

  try {
    const params = new URLSearchParams({
      query,
      client_id: UNSPLASH_API_KEY,
      per_page: String(Math.min(limit, 10)),
      order_by: 'relevance',
    });

    const response = await fetch(`${UNSPLASH_API_BASE}/search/photos?${params}`, {
      headers: { 'User-Agent': 'FeedIA-Carousel-Designer' },
    });

    if (!response.ok) {
      throw new Error(`Unsplash API error ${response.status}`);
    }

    const data = (await response.json()) as any;

    if (!data.results || data.results.length === 0) {
      log.info(`[Unsplash] No images found for query: "${query}"`);
      return [];
    }

    return data.results.map((item: any) => ({
      id: item.id,
      url: item.urls.regular, // High-res download URL
      description: item.description || item.alt_description || 'Stock photo',
      attribution: `Photo by ${item.user.name} on Unsplash`,
    }));
  } catch (err) {
    log.error(`[Unsplash] Search failed: ${(err as Error).message}`);
    return [];
  }
};

/**
 * Get download URL for Unsplash image (triggers download counter).
 * Required by Unsplash ToS before saving image.
 */
export const triggerUnsplashDownload = async (imageId: string): Promise<void> => {
  if (!UNSPLASH_API_KEY) return;

  try {
    const params = new URLSearchParams({
      client_id: UNSPLASH_API_KEY,
    });

    await fetch(`${UNSPLASH_API_BASE}/photos/${imageId}/download?${params}`);
  } catch (err) {
    log.warn(`[Unsplash] Download trigger failed: ${(err as Error).message}`);
  }
};

export const unsplashAdapter = {
  searchUnsplash,
  triggerUnsplashDownload,
};
