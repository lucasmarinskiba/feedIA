/**
 * Autonomous Content Generator Stub
 * Full implementation in TypeScript migration phase
 */

import type { BrandProfile } from '../config/types.js';

interface BatchGenerateInput {
  brand: BrandProfile;
  format: string;
  occasion: string;
  batchSize?: number;
}

export const autonomousGenerator = {
  // api/autonomy-routes.ts's POST /generate reads result.carousels.items/
  // .itemsGenerated and result.totalTimeMs -- this used to return
  // carousels/reels/stories as bare arrays with a totalGenerated field
  // instead, which doesn't have any of those. `for (const c of result.
  // carousels.items)` on an array-shaped .carousels (no .items) threw
  // "undefined is not iterable" immediately, on every single call to this
  // endpoint. Reshaped to match what the route (the actual consumer)
  // expects; still a stub (no real generation), just a consistent one.
  async generateAll(
    brand: BrandProfile,
    occasion: string,
    carouselCount = 1,
    reelCount = 1,
    storyCount = 3,
  ) {
    const startedAt = Date.now();
    const toItems = (count: number, type: string) => Array(count).fill({ id: 'stub', type });
    return {
      status: 'success',
      carousels: { items: toItems(carouselCount, 'carousel'), itemsGenerated: carouselCount },
      reels: { items: toItems(reelCount, 'reel'), itemsGenerated: reelCount },
      stories: { items: toItems(storyCount, 'story'), itemsGenerated: storyCount },
      totalGenerated: carouselCount + reelCount + storyCount,
      totalTimeMs: Date.now() - startedAt,
    };
  },

  // generateCarousels/Reels/Stories' own callers (autonomy-routes.ts's
  // /carousels, /reels, /stories) check `result.status === 'success'` --
  // this returned 'completed', so `success` in the JSON response was
  // always false regardless of the stub "working".
  async generateCarousels(input: BatchGenerateInput) {
    return { status: 'success', count: input.batchSize || 1, items: [] };
  },

  async generateReels(input: BatchGenerateInput) {
    return { status: 'success', count: input.batchSize || 1, items: [] };
  },

  async generateStories(input: BatchGenerateInput) {
    return { status: 'success', count: input.batchSize || 3, items: [] };
  },

  getMetrics() {
    return {
      generated: 0,
      quality: 0,
      wit: 0,
      uptime: '100%',
    };
  },
};
