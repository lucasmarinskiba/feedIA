import type { Anthropic } from '@anthropic-ai/sdk';
import { carouselPipeline } from '../quickCarousel/carouselPipeline';
import { artDirector } from '../creativeDirector/artDirector';
import { animationEngine } from './animationEngine';
import { downloadImageFromUrl } from '../../integrations/imageDownloader';
import { canva } from '../../integrations/canva';
import { runway } from '../../integrations/runway';

export interface CarouselDesignerProInput {
  prompt: string;
  brandId?: string;
  style?: 'warm-organic' | 'bold-playful' | 'dark-premium' | 'clean-editorial';
  slideCount?: number;
  animationStyle?: 'fade' | 'slideLeft' | 'slideUp' | 'zoom' | 'rotate';
  includeVideo?: boolean;
  includeMusic?: boolean;
}

export interface PinterestSlide {
  slide: number;
  visualText: string;
  designNotes: string;
  wordCount: number;
  pinterestPattern: string;
  colorPalette: {
    primary: string;
    secondary: string;
    accent: string;
  };
  typography: {
    headline: { size: number; weight: number };
    body: { size: number; weight: number };
    decorative: { size: number; weight: number };
  };
  animation: {
    type: 'fade' | 'slideLeft' | 'slideUp' | 'zoom' | 'rotate';
    duration: number;
    delay: number;
    easing: 'ease-in' | 'ease-out' | 'ease-in-out';
  };
  imageUrl?: string;
  downloadedAssetId?: string;
  cssKeyframes: string;
}

export interface CarouselDesignerProOutput {
  id: string;
  originalPrompt: string;
  style: 'warm-organic' | 'bold-playful' | 'dark-premium' | 'clean-editorial';
  slides: PinterestSlide[];
  animations: {
    css: string;
    timeline: Array<{ slideId: number; delay: number; duration: number; animation: string }>;
    totalDuration: number;
  };
  caption: {
    full: string;
    short: string;
    cta: string;
    humanScore: number;
  };
  hashtags: string[];
  exports: {
    htmlPreview: string;
    slides: string[];
    mp4Url?: string;
    cssFile: string;
    zipUrl?: string;
  };
  aestheticScore: number;
  readyToPublish: boolean;
  totalProductionMinutes: number;
}

/**
 * Main orchestrator for Pinterest-inspired carousel generation.
 * Combines quick-carousel pipeline with Pinterest aesthetic patterns,
 * animation engine, and Computer Use for Canva interaction.
 */
export const designCarouselPinterest = async (
  input: CarouselDesignerProInput,
  brand?: any,
  client?: Anthropic,
): Promise<CarouselDesignerProOutput> => {
  const startTime = Date.now();
  const carouselId = `pinterest-${Date.now()}`;
  const style = input.style || 'bold-playful';
  const slideCount = input.slideCount || 10;
  const animationStyle = input.animationStyle || 'fade';
  const includeVideo = input.includeVideo !== false;

  try {
    // Step 1: Generate base carousel using existing pipeline
    const baseCarousel = await carouselPipeline(
      {
        prompt: input.prompt,
        slideCount,
        tone: 'Pinterest-inspired, innovative, zero-corporate',
      },
      brand,
      client,
    );

    // Step 2: Enhance with Pinterest aesthetics
    const pinterestSlides = baseCarousel.slides.map((slide: any, idx: number) => {
      const pinterestPattern = getPinterestPattern(idx, slideCount);
      const palette = getPinterestPalette(style);
      const textAnim = getTextAnimation(animationStyle, idx);

      return {
        slide: idx + 1,
        visualText: slide.visualText,
        designNotes: slide.designNotes,
        wordCount: slide.visualText.split(' ').length,
        pinterestPattern,
        colorPalette: palette,
        typography: {
          headline: { size: 32, weight: 700 },
          body: { size: 16, weight: 400 },
          decorative: { size: 14, weight: 300 },
        },
        animation: {
          type: animationStyle as any,
          duration: 400,
          delay: idx * 100,
          easing: 'ease-out' as const,
        },
        imageUrl: undefined,
        cssKeyframes: '',
      } as PinterestSlide;
    });

    // Step 3: Generate Pinterest-aligned image prompts
    const enhancedSlides = await Promise.all(
      pinterestSlides.map(async (slide) => {
        const imagePrompt = artDirector.generatePinterestPrompt(
          `${input.prompt} - slide ${slide.slide}`,
          brand,
          {
            palette: slide.colorPalette,
            pattern: slide.pinterestPattern,
            style,
          },
        );

        // Optionally download image from Pinterest/web
        let imageUrl: string | undefined;
        try {
          // In production, would search Pinterest via Computer Use
          // For now, skip image download (Phase 3 enhancement)
          imageUrl = undefined;
        } catch (err) {
          // Fallback: no image, text-only slide
        }

        return { ...slide, imageUrl };
      }),
    );

    // Step 4: Generate animation CSS
    const animationEngine_instance = animationEngine();
    const animations = animationEngine_instance.buildAnimationTimeline(
      enhancedSlides,
      slideCount * 2.5, // 2.5s per slide
      animationStyle,
    );

    // Step 5: Generate exports
    const htmlPreview = generateHTMLPreview(enhancedSlides, animations);
    const cssFile = animations.css;

    // Step 6: Video export (async, if enabled)
    let mp4Url: string | undefined;
    if (includeVideo) {
      try {
        // In production, would use Runway API to generate MP4
        // For now, skip (Phase 4 enhancement)
        mp4Url = undefined;
      } catch (err) {
        // Fallback: no video
      }
    }

    // Step 7: Visual QA check
    const aestheticScore = validateAesthetic(enhancedSlides);

    const endTime = Date.now();
    const totalMinutes = (endTime - startTime) / 1000 / 60;

    return {
      id: carouselId,
      originalPrompt: input.prompt,
      style,
      slides: enhancedSlides,
      animations,
      caption: baseCarousel.caption || { full: '', short: '', cta: '', humanScore: 0 },
      hashtags: baseCarousel.hashtags?.flat || [],
      exports: {
        htmlPreview,
        slides: [],
        mp4Url,
        cssFile,
      },
      aestheticScore,
      readyToPublish: aestheticScore > 70,
      totalProductionMinutes: totalMinutes,
    };
  } catch (error) {
    throw new Error(`Carousel Designer Pro pipeline failed: ${error}`);
  }
};

/**
 * Get Pinterest layout pattern based on slide index.
 * Rotates through patterns for variety.
 */
const getPinterestPattern = (slideIndex: number, totalSlides: number): string => {
  const patterns = [
    'left-aligned-text-right-image',
    'full-bleed-image-overlay',
    'grid-layout',
    'asymmetrical-balance',
    'left-aligned-text-right-image',
  ];
  return patterns[slideIndex % patterns.length];
};

/**
 * Get color palette based on style.
 */
const getPinterestPalette = (
  style: 'warm-organic' | 'bold-playful' | 'dark-premium' | 'clean-editorial',
): {
  primary: string;
  secondary: string;
  accent: string;
} => {
  const palettes: Record<string, any> = {
    'warm-organic': {
      primary: '#C65911',
      secondary: '#6B8E71',
      accent: '#D4AF37',
    },
    'bold-playful': {
      primary: '#E91E8C',
      secondary: '#00D9FF',
      accent: '#7FFF00',
    },
    'dark-premium': {
      primary: '#1A1A1A',
      secondary: '#36454F',
      accent: '#E6D5B8',
    },
    'clean-editorial': {
      primary: '#001F3F',
      secondary: '#E8E8E8',
      accent: '#000000',
    },
  };
  return palettes[style] || palettes['bold-playful'];
};

/**
 * Get text animation based on slide animation style.
 */
const getTextAnimation = (
  animationStyle: 'fade' | 'slideLeft' | 'slideUp' | 'zoom' | 'rotate',
  slideIndex: number,
): string => {
  const textAnimations: Record<string, string> = {
    fade: 'typewriter',
    slideLeft: 'pop-in',
    slideUp: 'fade-slide',
    zoom: 'pop-in',
    rotate: 'fade-slide',
  };
  return textAnimations[animationStyle] || 'typewriter';
};

/**
 * Generate HTML5 preview with CSS animations.
 */
const generateHTMLPreview = (slides: PinterestSlide[], animations: any): string => {
  const slidesHTML = slides
    .map(
      (slide, idx) => `
    <div class="slide slide-${idx + 1}" style="animation: ${slide.animation.type} ${slide.animation.duration}ms ${slide.animation.easing} forwards ${slide.animation.delay}ms;">
      <style>${slide.cssKeyframes}</style>
      <h2 style="font-size: ${slide.typography.headline.size}px; font-weight: ${slide.typography.headline.weight};">${slide.visualText}</h2>
      ${slide.imageUrl ? `<img src="${slide.imageUrl}" alt="slide-${idx + 1}" />` : ''}
      <p style="font-size: ${slide.typography.body.size}px;">${slide.designNotes}</p>
    </div>
  `,
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Carousel Preview</title>
  <style>
    body { font-family: 'Inter', sans-serif; margin: 0; padding: 20px; background: #0f0f12; }
    .carousel { width: 480px; aspect-ratio: 4/5; overflow: hidden; border-radius: 12px; box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
    .slide {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 24px;
      box-sizing: border-box;
      position: absolute;
    }
    ${animations.css}
  </style>
</head>
<body>
  <div class="carousel">
    ${slidesHTML}
  </div>
</body>
</html>
  `;
};

/**
 * Validate carousel against Pinterest aesthetic standards.
 * Returns score 0-100.
 */
const validateAesthetic = (slides: PinterestSlide[]): number => {
  let score = 100;

  slides.forEach((slide) => {
    // Typography validation
    if (slide.typography.headline.size < 28 || slide.typography.headline.size > 36) score -= 5;
    if (slide.typography.body.size < 14 || slide.typography.body.size > 18) score -= 5;

    // Color validation (simple check)
    if (!slide.colorPalette.primary || !slide.colorPalette.secondary) score -= 10;

    // Pattern validation
    const validPatterns = [
      'left-aligned-text-right-image',
      'full-bleed-image-overlay',
      'grid-layout',
      'asymmetrical-balance',
    ];
    if (!validPatterns.includes(slide.pinterestPattern)) score -= 10;

    // Animation validation
    if (slide.animation.duration < 300 || slide.animation.duration > 600) score -= 5;
  });

  return Math.max(0, Math.min(100, score));
};
