/**
 * Brújula 3-Plane Integration — Carousel Plan Generation with FeedIA Intelligence
 * Wires carousel plan (cover → ideas → CTA) to 20,200+ prompt variations
 * Reason: Automated multi-slide carousel creation from visual intelligence
 */

import { feediaBrain } from '../core/feedia-brain';

interface CarouselSlide {
  slide_number: number;
  type: 'hook' | 'showcase' | 'interactive' | 'cta' | 'testimonial';
  content: string;
  prompt: string;
  compositionalIdeas: string[];
}

interface CarouselPlan {
  title: string;
  domain: string;
  slides: CarouselSlide[];
  totalSlides: number;
  estimatedLength: string;
}

class BrujulaCarouselIntegration {
  /**
   * Generate carousel plan from domain + brief
   */
  generateCarouselPlan(domain: string, brief: string, slideCount: number = 10): CarouselPlan {
    const slides: CarouselSlide[] = [];

    // Slide 1: Hook (capture attention)
    slides.push({
      slide_number: 1,
      type: 'hook',
      content: brief,
      prompt: feediaBrain.getRandomPrompt(domain),
      compositionalIdeas: feediaBrain.getCompositionIdeas(domain, 3),
    });

    // Slides 2-7: Product/Value Showcase (50% of carousel)
    const showcaseCount = Math.floor(slideCount * 0.5);
    for (let i = 0; i < showcaseCount - 1; i++) {
      slides.push({
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
      slides.push({
        slide_number: slides.length + 1,
        type: 'interactive',
        content: 'Poll/Question/Engagement Hook',
        prompt: feediaBrain.getRandomPrompt(domain),
        compositionalIdeas: feediaBrain.getCompositionIdeas(domain, 1),
      });
    }

    // Slide 10: CTA (close/convert)
    slides.push({
      slide_number: slides.length + 1,
      type: 'cta',
      content: 'Call To Action — Order/Follow/Click',
      prompt: feediaBrain.getRandomPrompt(domain),
      compositionalIdeas: feediaBrain.getCompositionIdeas(domain, 2),
    });

    return {
      title: `${domain} Carousel`,
      domain,
      slides,
      totalSlides: slides.length,
      estimatedLength: `${slides.length}-slide carousel for ${domain} domain`,
    };
  }

  /**
   * Generate multi-format carousel (feed square, stories vertical, reels 9:16)
   */
  generateMultiFormatCarousel(domain: string, brief: string): Record<string, CarouselPlan> {
    return {
      feed_square: this.generateCarouselPlan(domain, brief, 8),
      stories_vertical: this.generateCarouselPlan(domain, brief, 10),
      reels_9_16: this.generateCarouselPlan(domain, brief, 12),
    };
  }

  /**
   * Optimize carousel plan based on performance feedback
   */
  optimizeCarouselPlan(plan: CarouselPlan, feedbackMetrics: Record<string, number>): CarouselPlan {
    // Re-weight slide types based on engagement
    const optimized = { ...plan };

    // If hook has low engagement, replace prompt variation
    if (feedbackMetrics.hook_engagement < 0.3) {
      optimized.slides[0].prompt = feediaBrain.getRandomPrompt(plan.domain);
    }

    // If CTA has low conversion, refresh composition
    const ctaSlide = optimized.slides.find(s => s.type === 'cta');
    if (ctaSlide && feedbackMetrics.cta_conversion < 0.1) {
      ctaSlide.compositionalIdeas = feediaBrain.getCompositionIdeas(plan.domain, 3);
    }

    return optimized;
  }
}

export const brujulaIntegration = new BrujulaCarouselIntegration();
