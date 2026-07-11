import type { Anthropic } from '@anthropic-ai/sdk';
import { createQuickCarousel } from '../quickCarousel/quickCarousel';
import { artDirector } from '../creativeDirector/artDirector';
import { animationEngine } from './animationEngine';
import { downloadImageFromUrl, downloadAndUploadToCanva, detectImageRequests, searchImageUrls } from '../../integrations/imageDownloader';
import { generateAnimatedCarousel, isRunwayAvailable } from '../../integrations/runway';
import { validateAesthetic, autoFixAesthetic } from './visualQA';
import { createCarouselExport } from './carouselExporter';

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
  brand?: unknown,
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
    const baseCarousel = await createQuickCarousel(brand as Parameters<typeof createQuickCarousel>[0], {
      prompt: input.prompt,
      slideCount,
      tone: 'Pinterest-inspired, innovative, zero-corporate',
    });

    // Step 2: Enhance with Pinterest aesthetics
    const pinterestSlides = baseCarousel.slides.map((slide: { visualText: string; designNotes: string }, idx: number) => {
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

    // Step 3B: Download + upload images if requested
    const downloadedImages: Map<number, string> = new Map();
    try {
      const imageKeywords = detectImageRequests(input.prompt);
      if (imageKeywords.length > 0) {
        const imageUrls = await searchImageUrls(imageKeywords);

        // Download and upload max 3 images (distribute across slides)
        const imagesToProcess = imageUrls.slice(0, 3);
        for (let i = 0; i < imagesToProcess.length; i++) {
          const slideIdx = Math.floor((i / imagesToProcess.length) * enhancedSlides.length);
          const imageUrl = imagesToProcess[i];
          if (!imageUrl) continue;
          const result = await downloadAndUploadToCanva(
            imageUrl,
            `carousel-slide-${slideIdx + 1}.png`,
          );
          if (result.assetId) {
            downloadedImages.set(slideIdx, result.assetId);
          }
        }
      }
    } catch (err) {
      // Silently fail, continue with text-only slides
    }

    // Apply downloaded images to slides
    enhancedSlides.forEach((slide, idx) => {
      if (downloadedImages.has(idx)) {
        slide.downloadedAssetId = downloadedImages.get(idx);
        slide.imageUrl = `canva-asset://${downloadedImages.get(idx)}`;
      }
    });

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
    if (includeVideo && isRunwayAvailable()) {
      try {
        // Generate MP4 from PNG slides using Runway API
        const slides = enhancedSlides.map((s) => `carousel-slide-${s.slide}`); // Placeholder paths
        const timings = animationEngine_instance.generateMP4Timing(enhancedSlides, animations.timeline);

        const result = await generateAnimatedCarousel(slides, timings as unknown as Parameters<typeof generateAnimatedCarousel>[1], {
          duration: slideCount * 2.5,
          quality: 'high',
          musicUrl: input.includeMusic ? 'default' : undefined,
        });

        if (result) {
          mp4Url = result.mp4Url;
        }
      } catch (err) {
        // Fallback: no video, PNG only
      }
    } else if (includeVideo && !isRunwayAvailable()) {
      // Runway API not configured, fallback to PNG
    }

    // Step 7: Visual QA check
    const qaResult = validateAesthetic(enhancedSlides);
    let finalSlides = enhancedSlides;

    // Auto-fix if score low but close to threshold
    if (qaResult.score < 70 && qaResult.score > 50) {
      const { slides: fixedSlides, fixes } = autoFixAesthetic(enhancedSlides);
      finalSlides = fixedSlides as unknown as typeof finalSlides;
      // Re-validate after fixes
      const revalidated = validateAesthetic(finalSlides);
      if (revalidated.score >= 70) {
        // Success: auto-fix brought it above threshold
      }
    }

    const endTime = Date.now();
    const totalMinutes = (endTime - startTime) / 1000 / 60;

    // Step 8: Create export package (ZIP directory)
    let exportPackage;
    try {
      exportPackage = await createCarouselExport(carouselId, finalSlides, animations, mp4Url);
    } catch (err) {
      // Fallback: no export, continue
      exportPackage = null;
    }

    return {
      id: carouselId,
      originalPrompt: input.prompt,
      style,
      slides: finalSlides,
      animations,
      caption: baseCarousel.caption || { full: '', short: '', cta: '', humanScore: 0 },
      hashtags: (baseCarousel.hashtags as unknown as string[] | undefined) || [],
      exports: {
        htmlPreview,
        slides: [],
        mp4Url,
        cssFile,
        zipUrl: exportPackage?.downloadUrl,
      },
      aestheticScore: qaResult.score,
      readyToPublish: qaResult.score >= 70,
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
  return patterns[slideIndex % patterns.length]!;
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
const generateHTMLPreview = (slides: PinterestSlide[], animations: { css: string }): string => {
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

