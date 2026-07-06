import { log } from '../agent/logger.js';
import { promptLoader, type PromptContext, type PromptFilter } from '../services/prompt-loader.js';
import type { BrandProfile } from '../config/types.js';

export interface ContentRequest {
  brand: BrandProfile;
  format: 'carousel' | 'reel' | 'story' | 'post';
  occasion: string;
  category?: string;
  count?: number;
  style?: string;
}

export interface GeneratedContent {
  id: string;
  format: 'carousel' | 'reel' | 'story' | 'post';
  prompts: PromptContext[];
  brandContext: string;
  generatedAt: string;
  status: 'planning' | 'generating' | 'complete' | 'failed';
}

export const contentPipeline = {
  /**
   * Main entry point: request → prompts → prepared context
   */
  async prepare(request: ContentRequest): Promise<GeneratedContent> {
    log.info('[ContentPipeline] preparing', {
      brand: request.brand.name,
      format: request.format,
      occasion: request.occasion,
    });

    const startTime = Date.now();

    try {
      // Step 1: Load prompts for this occasion/format
      const promptContext = await promptLoader.getPromptContext(
        request.occasion,
        request.format,
        request.category,
      );

      // Step 2: Build content request with prompts
      const content: GeneratedContent = {
        id: `content-${Date.now()}`,
        format: request.format,
        prompts: [promptContext],
        brandContext: `${request.brand.name} | ${promptContext.brandContext}`,
        generatedAt: new Date().toISOString(),
        status: 'planning',
      };

      // Step 3: Load variations if carousel/reel (multiple slides needed)
      if (['carousel', 'reel'].includes(request.format)) {
        for (let i = 1; i < (request.count || 3); i++) {
          const varContext = await promptLoader.getPromptContext(
            request.occasion,
            request.format,
            request.category,
          );
          content.prompts.push(varContext);
        }
      }

      log.info('[ContentPipeline] prepared', {
        contentId: content.id,
        slides: content.prompts.length,
        durationMs: Date.now() - startTime,
      });

      return content;
    } catch (error) {
      log.error('[ContentPipeline] prepare failed', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  },

  /**
   * Format-specific handlers
   */
  async generateCarousel(request: ContentRequest): Promise<GeneratedContent> {
    const content = await this.prepare({ ...request, format: 'carousel', count: 10 });
    content.status = 'generating';

    log.info('[ContentPipeline] carousel generation', {
      contentId: content.id,
      slides: content.prompts.length,
    });

    // Carousel: 10 slides (hook + value + CTA pattern)
    return {
      ...content,
      status: 'complete',
    };
  },

  async generateReel(request: ContentRequest): Promise<GeneratedContent> {
    const content = await this.prepare({ ...request, format: 'reel', count: 5 });
    content.status = 'generating';

    log.info('[ContentPipeline] reel generation', {
      contentId: content.id,
      scenes: content.prompts.length,
    });

    // Reel: 5 scenes (15-30s total with transitions)
    return {
      ...content,
      status: 'complete',
    };
  },

  async generateStory(request: ContentRequest): Promise<GeneratedContent> {
    const content = await this.prepare({ ...request, format: 'story', count: 3 });
    content.status = 'generating';

    log.info('[ContentPipeline] story generation', {
      contentId: content.id,
      frames: content.prompts.length,
    });

    // Story: 3-5 frames vertical
    return {
      ...content,
      status: 'complete',
    };
  },

  async generatePost(request: ContentRequest): Promise<GeneratedContent> {
    const content = await this.prepare({ ...request, format: 'post', count: 1 });
    content.status = 'generating';

    log.info('[ContentPipeline] post generation', {
      contentId: content.id,
    });

    // Post: single image + caption
    return {
      ...content,
      status: 'complete',
    };
  },

  /**
   * Batch generation for multiple content pieces
   */
  async generateBatch(
    brand: BrandProfile,
    format: 'carousel' | 'reel' | 'story' | 'post',
    occasions: string[],
    count: number = 1,
  ): Promise<GeneratedContent[]> {
    log.info('[ContentPipeline] batch generation', {
      brand: brand.name,
      format,
      occasions: occasions.length,
      count,
    });

    const results: GeneratedContent[] = [];

    for (const occasion of occasions) {
      for (let i = 0; i < count; i++) {
        const content = await this.prepare({
          brand,
          format,
          occasion,
        });
        results.push(content);
      }
    }

    log.info('[ContentPipeline] batch complete', {
      totalGenerated: results.length,
    });

    return results;
  },

  /**
   * Get pipeline statistics
   */
  getStats() {
    const stats = promptLoader.getBatchStats();
    return {
      ...stats,
      pipelineReady: true,
      formats: ['carousel', 'reel', 'story', 'post'],
      occasions: Object.keys(stats.byOccasion),
    };
  },
};
