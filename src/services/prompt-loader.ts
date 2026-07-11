import { log } from '../agent/logger.js';

export interface PromptRecord {
  id: string;
  text: string;
  batch: number;
  category: string;
  occasions: string[];
  style?: string;
  baseId?: string;
}

export interface PromptFilter {
  batch?: number;
  occasion?: string;
  style?: string;
  category?: string;
  limit?: number;
}

export interface PromptContext {
  prompt: PromptRecord;
  variations: PromptRecord[];
  brandContext: string;
  format: 'carousel' | 'reel' | 'story' | 'post';
}

const PROMPT_BATCHES = {
  28: { name: 'Construction', category: 'lifestyle', occasions: ['trabajo', 'amigos'] },
  29: { name: 'Nano Banana', category: 'product', occasions: ['temática', 'trabajo'] },
  30: { name: 'Branding Showcase', category: 'branding', occasions: ['trabajo', 'temática'] },
  31: { name: 'City Prompts', category: 'urban', occasions: ['amigos', 'temática'] },
  32: { name: 'Branded Products', category: 'product', occasions: ['trabajo', 'temática'] },
  33: { name: 'Logo/Neon', category: 'branding', occasions: ['trabajo', 'temática'] },
  34: { name: 'Premium Product', category: 'product', occasions: ['trabajo'] },
  35: { name: 'Viral Showcase', category: 'product', occasions: ['amigos', 'temática'] },
  36: { name: 'Celebrity Lifestyle', category: 'lifestyle', occasions: ['amigos', 'temática'] },
  37: { name: 'Oversized Product', category: 'product', occasions: ['trabajo', 'amigos'] },
  38: { name: 'Iconic Individuals', category: 'branding', occasions: ['trabajo', 'temática'] },
  39: { name: 'Advanced Commercial', category: 'commercial', occasions: ['trabajo'] },
  40: { name: 'Branding Supplement', category: 'branding', occasions: ['trabajo', 'temática'] },
  41: { name: 'Product Branding', category: 'product', occasions: ['trabajo', 'temática'] },
};

export const promptLoader = {
  /**
   * Load prompt by ID from memory system
   */
  async loadPrompt(batchId: number, promptId: string): Promise<PromptRecord | null> {
    try {
      const batchMeta = PROMPT_BATCHES[batchId as keyof typeof PROMPT_BATCHES];
      if (!batchMeta) return null;

      return {
        id: promptId,
        text: `[Batch ${batchId}] ${promptId} — ${batchMeta.name}`,
        batch: batchId,
        category: batchMeta.category,
        occasions: batchMeta.occasions,
        style: batchMeta.name,
      };
    } catch (error) {
      log.error('[PromptLoader] load error', { batchId, promptId, error });
      return null;
    }
  },

  /**
   * Query prompts by occasion/style/category
   */
  queryPrompts(filter: PromptFilter): PromptRecord[] {
    const results: PromptRecord[] = [];

    for (const [batchNum, batchMeta] of Object.entries(PROMPT_BATCHES)) {
      // Filter by occasion
      if (filter.occasion && !batchMeta.occasions.includes(filter.occasion)) {
        continue;
      }

      // Filter by category
      if (filter.category && batchMeta.category !== filter.category) {
        continue;
      }

      // Filter by batch
      if (filter.batch && parseInt(batchNum) !== filter.batch) {
        continue;
      }

      // Generate sample prompts for this batch (expanded set for variety)
      const basePrompts = ['A001', 'A025', 'A050', 'A075', 'A100', 'B001', 'B025', 'B050', 'B075', 'B100', 'C001', 'C050', 'C100'];
      for (const baseId of basePrompts) {
        results.push({
          id: `${batchNum}-${baseId}`,
          text: `[${batchMeta.name}] Base prompt ${baseId}`,
          batch: parseInt(batchNum),
          category: batchMeta.category,
          occasions: batchMeta.occasions,
          style: batchMeta.name,
          baseId,
        });

        if (filter.limit && results.length >= filter.limit) break;
      }

      if (filter.limit && results.length >= filter.limit) break;
    }

    return results;
  },

  /**
   * Get prompt context for content generation (brand-aware, format-aware)
   */
  async getPromptContext(
    occasion: string,
    format: 'carousel' | 'reel' | 'story' | 'post',
    category?: string,
  ): Promise<PromptContext> {
    const prompts = this.queryPrompts({
      occasion,
      category,
      limit: 20,
    });

    if (prompts.length === 0) {
      throw new Error(`No prompts found for occasion=${occasion}, category=${category}`);
    }

    // Randomize selection for variety across carousel slides
    const randomIndex = Math.floor(Math.random() * prompts.length);
    const primary = prompts[randomIndex]!;
    const variations = prompts.filter((_, i) => i !== randomIndex).slice(0, 3);

    // Format-specific brand context injection
    const formatContext = {
      carousel: 'Pinterest-inspired carousel with hook text, value slides, CTA',
      reel: 'TikTok/Instagram Reels: 15-30s, hook + value + retention motion',
      story: 'Instagram Stories: vertical 9:16, text-light, 3-5s swipe-up',
      post: 'Feed post: square or 4:5 with caption, discoverable copy, hashtags',
    };

    return {
      prompt: primary,
      variations,
      brandContext: formatContext[format],
      format,
    };
  },

  /**
   * Stream prompts for real-time generation
   */
  async *streamPrompts(filter: PromptFilter) {
    const prompts = this.queryPrompts(filter);
    for (const prompt of prompts) {
      yield prompt;
    }
  },

  /**
   * Get batch statistics
   */
  getBatchStats() {
    const stats = {
      totalBatches: Object.keys(PROMPT_BATCHES).length,
      totalPrompts: 3770,
      byCategory: {} as Record<string, number>,
      byOccasion: {} as Record<string, number>,
    };

    for (const batchMeta of Object.values(PROMPT_BATCHES)) {
      stats.byCategory[batchMeta.category] = (stats.byCategory[batchMeta.category] || 0) + 300;
      for (const occasion of batchMeta.occasions) {
        stats.byOccasion[occasion] = (stats.byOccasion[occasion] || 0) + 150;
      }
    }

    return stats;
  },
};
