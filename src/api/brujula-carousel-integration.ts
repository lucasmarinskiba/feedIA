/**
 * Brújula 3-Plane Integration — Carousel Plan Generation with FeedIA Intelligence
 * Wires carousel plan (cover → ideas → CTA) to 20,200+ prompt variations
 * Reason: Automated multi-slide carousel creation from visual intelligence
 */

import { feediaBrain } from '../core/feedia-brain';
import { masterContentPipeline } from '../services/master-content-pipeline.js';
import { consistencyLockManager } from '../services/consistency-lock.js';

interface CarouselSlide {
  slide_number: number;
  type: 'hook' | 'showcase' | 'interactive' | 'cta' | 'testimonial';
  content: string;
  prompt: string;
  compositionalIdeas: string[];
  qualityScore?: number;
  witScore?: number;
}

interface CarouselPlan {
  title: string;
  domain: string;
  slides: CarouselSlide[];
  totalSlides: number;
  estimatedLength: string;
  consistencySeriesId?: string;
}

class BrujulaCarouselIntegration {
  /**
   * Generate carousel plan from domain + brief
   * Every slide prompt is run through the Master Content Pipeline (quality +
   * cinematography + ocurrencia + resolution lock) and all slides share one
   * consistency lock so character/product/environment stay stable across the carousel.
   */
  async generateCarouselPlan(
    domain: string,
    brief: string,
    slideCount: number = 10,
    platform: 'instagram' | 'tiktok' = 'instagram'
  ): Promise<CarouselPlan> {
    const rawSlides: Omit<CarouselSlide, 'qualityScore' | 'witScore'>[] = [];

    // Slide 1: Hook (capture attention)
    rawSlides.push({
      slide_number: 1,
      type: 'hook',
      content: brief,
      prompt: feediaBrain.getRandomPrompt(domain),
      compositionalIdeas: feediaBrain.getCompositionIdeas(domain, 3),
    });

    // Slides 2-7: Product/Value Showcase (50% of carousel)
    const showcaseCount = Math.floor(slideCount * 0.5);
    for (let i = 0; i < showcaseCount - 1; i++) {
      rawSlides.push({
        slide_number: i + 2,
        type: 'showcase',
        content: `Feature/Benefit ${i + 1}`,
        prompt: feediaBrain.getRandomPrompt(domain),
        compositionalIdeas: feediaBrain.getCompositionIdeas(domain, 2),
      });
    }

    // Slides 8-9: Interactive/Engagement
    const interactiveCount = Math.floor(slideCount * 0.2);
    for (let i = 0; i < interactiveCount; i++) {
      rawSlides.push({
        slide_number: rawSlides.length + 1,
        type: 'interactive',
        content: 'Poll/Question/Engagement Hook',
        prompt: feediaBrain.getRandomPrompt(domain),
        compositionalIdeas: feediaBrain.getCompositionIdeas(domain, 1),
      });
    }

    // Slide 10: CTA (close/convert)
    rawSlides.push({
      slide_number: rawSlides.length + 1,
      type: 'cta',
      content: 'Call To Action — Order/Follow/Click',
      prompt: feediaBrain.getRandomPrompt(domain),
      compositionalIdeas: feediaBrain.getCompositionIdeas(domain, 2),
    });

    // One consistency lock for the whole carousel — environment stays locked
    // (character/product locks require a description; domain doubles as environment context)
    const seriesLock = consistencyLockManager.createSeriesLock(
      rawSlides.length,
      undefined,
      undefined,
      consistencyLockManager.createEnvironmentLock(`domain: ${domain}, brief: ${brief}`)
    );

    const slides: CarouselSlide[] = [];
    for (const raw of rawSlides) {
      const result = await masterContentPipeline.processContent({
        basePrompt: raw.prompt,
        platform,
        contentType: 'carousel',
        consistencySeriesId: seriesLock.seriesId,
        frameNumber: raw.slide_number,
        frameCount: rawSlides.length,
      });

      slides.push({
        ...raw,
        prompt: result.finalPrompt,
        qualityScore: result.qualityScore,
        witScore: result.witScore,
      });
    }

    return {
      title: `${domain} Carousel`,
      domain,
      slides,
      totalSlides: slides.length,
      estimatedLength: `${slides.length}-slide carousel for ${domain} domain`,
      consistencySeriesId: seriesLock.seriesId,
    };
  }

  /**
   * Generate multi-format carousel (feed square, stories vertical, reels 9:16)
   */
  async generateMultiFormatCarousel(domain: string, brief: string): Promise<Record<string, CarouselPlan>> {
    const [feed_square, stories_vertical, reels_9_16] = await Promise.all([
      this.generateCarouselPlan(domain, brief, 8, 'instagram'),
      this.generateCarouselPlan(domain, brief, 10, 'instagram'),
      this.generateCarouselPlan(domain, brief, 12, 'tiktok'),
    ]);

    return { feed_square, stories_vertical, reels_9_16 };
  }

  /**
   * Optimize carousel plan based on performance feedback
   */
  optimizeCarouselPlan(plan: CarouselPlan, feedbackMetrics: Record<string, number>): CarouselPlan {
    // Re-weight slide types based on engagement
    const optimized = { ...plan };

    // If hook has low engagement, replace prompt variation
    const hookSlide = optimized.slides[0];
    if (hookSlide && (feedbackMetrics.hook_engagement ?? 1) < 0.3) {
      hookSlide.prompt = feediaBrain.getRandomPrompt(plan.domain);
    }

    // If CTA has low conversion, refresh composition
    const ctaSlide = optimized.slides.find(s => s.type === 'cta');
    if (ctaSlide && (feedbackMetrics.cta_conversion ?? 1) < 0.1) {
      ctaSlide.compositionalIdeas = feediaBrain.getCompositionIdeas(plan.domain, 3);
    }

    return optimized;
  }
}

export const brujulaIntegration = new BrujulaCarouselIntegration();
