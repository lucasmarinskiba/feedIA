import { log } from '../agent/logger.js';
import { contentPipeline } from '../agents/content-generation-pipeline.js';
import { promptLoader } from '../services/prompt-loader.js';
import type { BrandProfile } from '../config/types.js';

export interface CarouselRequest {
  brand: BrandProfile;
  occasion: string;
  category?: string;
  hooks?: number;
  valueSlides?: number;
  cta?: boolean;
}

export interface CarouselSlide {
  position: number;
  type: 'hook' | 'value' | 'cta' | 'proof';
  prompt: string;
  copyDirective: string;
  visualStyle: string;
}

export interface CarouselDesign {
  id: string;
  brand: string;
  occasion: string;
  slides: CarouselSlide[];
  totalSlides: number;
  estimatedEngagementBoost: number;
  createdAt: string;
}

export const carouselDesignerPro = {
  /**
   * Main design flow: occasion → prompts → carousel structure
   */
  async design(request: CarouselRequest): Promise<CarouselDesign> {
    log.info('[CarouselDesignerPro] designing', {
      brand: request.brand.name,
      occasion: request.occasion,
    });

    // Get content context with prompts
    const contentCtx = await contentPipeline.generateCarousel({
      brand: request.brand,
      format: 'carousel',
      occasion: request.occasion,
      category: request.category,
      count: 10,
    });

    // Build carousel structure
    const slides: CarouselSlide[] = [];

    // Slide 1-3: Hook (grab attention)
    for (let i = 0; i < 3 && i < contentCtx.prompts.length; i++) {
      slides.push({
        position: i + 1,
        type: 'hook',
        prompt: contentCtx.prompts[i]!.prompt?.text || '',
        copyDirective: `HOOK ${i + 1}: Start strong. Problem statement or curiosity gap. Max 8 words.`,
        visualStyle: 'Bold color, minimal text, eye-catching composition',
      });
    }

    // Slide 4-7: Value (deliver promise)
    for (let i = 3; i < 7 && i < contentCtx.prompts.length; i++) {
      slides.push({
        position: i + 1,
        type: 'value',
        prompt: contentCtx.prompts[i]!.prompt?.text || '',
        copyDirective: `VALUE ${i - 2}: Step-by-step insight. 50 words max. Numbered list.`,
        visualStyle: 'Clean layout, readable typography, supporting visuals',
      });
    }

    // Slide 8-9: Proof (build credibility)
    for (let i = 7; i < 9 && i < contentCtx.prompts.length; i++) {
      slides.push({
        position: i + 1,
        type: 'proof',
        prompt: contentCtx.prompts[i]!.prompt?.text || '',
        copyDirective: `PROOF: Testimonial or stat. Quote format. Attribution.`,
        visualStyle: 'Real image or avatar, quote styling, high contrast',
      });
    }

    // Slide 10: CTA (call to action)
    if (contentCtx.prompts.length > 9) {
      slides.push({
        position: 10,
        type: 'cta',
        prompt: contentCtx.prompts[9]!.prompt?.text || '',
        copyDirective: `CTA: Single action. Link/bio/DM. Urgency optional.`,
        visualStyle: 'Highlight color, button/arrow, clear hierarchy',
      });
    }

    const design: CarouselDesign = {
      id: `carousel-${Date.now()}`,
      brand: request.brand.name,
      occasion: request.occasion,
      slides,
      totalSlides: slides.length,
      estimatedEngagementBoost: 0.35, // 35% higher engagement vs feed post
      createdAt: new Date().toISOString(),
    };

    log.info('[CarouselDesignerPro] design complete', {
      carouselId: design.id,
      slides: slides.length,
      engagement: design.estimatedEngagementBoost,
    });

    return design;
  },

  /**
   * Batch design for multiple occasions
   */
  async designBatch(
    brand: BrandProfile,
    occasions: string[],
  ): Promise<CarouselDesign[]> {
    log.info('[CarouselDesignerPro] batch design', {
      brand: brand.name,
      occasions: occasions.length,
    });

    const designs: CarouselDesign[] = [];

    for (const occasion of occasions) {
      const design = await this.design({
        brand,
        occasion,
      });
      designs.push(design);
    }

    return designs;
  },

  /**
   * Export carousel for platform (Canva, CapCut, etc)
   */
  async exportForCanva(carousel: CarouselDesign): Promise<string> {
    // Format carousel as Canva design JSON
    const canvaSpec = {
      title: `${carousel.brand} — ${carousel.occasion}`,
      slides: carousel.slides.map((slide, idx) => ({
        position: idx + 1,
        title: slide.copyDirective.split(':')[0],
        subtitle: slide.copyDirective,
        image_prompt: slide.prompt,
        visual_style: slide.visualStyle,
        template: slide.type === 'hook' ? 'bold' : slide.type === 'cta' ? 'call-to-action' : 'standard',
      })),
    };

    log.info('[CarouselDesignerPro] exported for Canva', {
      carouselId: carousel.id,
      slides: carousel.slides.length,
    });

    return JSON.stringify(canvaSpec, null, 2);
  },

  /**
   * Quality check carousel against Pinterest standards
   */
  async validateDesign(carousel: CarouselDesign): Promise<{
    valid: boolean;
    issues: string[];
    score: number;
  }> {
    const issues: string[] = [];
    let score = 1.0;

    // Check slide count
    if (carousel.slides.length < 3) {
      issues.push('Carousel too short (min 3 slides)');
      score -= 0.2;
    }
    if (carousel.slides.length > 15) {
      issues.push('Carousel too long (max 15 slides)');
      score -= 0.1;
    }

    // Check hook coverage
    const hooks = carousel.slides.filter((s) => s.type === 'hook');
    if (hooks.length === 0) {
      issues.push('No hook slides (need 1-3)');
      score -= 0.3;
    }

    // Check CTA presence
    const ctas = carousel.slides.filter((s) => s.type === 'cta');
    if (ctas.length === 0) {
      issues.push('No CTA slide at end');
      score -= 0.2;
    }

    // Check value slide ratio
    const values = carousel.slides.filter((s) => s.type === 'value');
    const valueRatio = values.length / carousel.slides.length;
    if (valueRatio < 0.3) {
      issues.push('Low value content ratio (<30%)');
      score -= 0.1;
    }

    return {
      valid: issues.length === 0,
      issues,
      score: Math.max(0, score),
    };
  },
};
