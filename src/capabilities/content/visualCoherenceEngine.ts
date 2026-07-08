/**
 * Phase 14: Visual Coherence Engine
 *
 * Ensures visual continuity across carousel/video slides
 * Background images, text overlays, cross-slide continuity
 */

import { log } from '../../agent/logger.js';

export interface VisualSpec {
  slideNumber: number;
  backgroundImage?: string;
  textOverlay: {
    backgroundColor: string; // Semi-transparent (rgba)
    opacity: number; // 0-1
    padding: string; // "20px 30px"
  };
  typography: {
    headline: {font: string; size: number; weight: number; color: string};
    body: {font: string; size: number; weight: number; color: string};
  };
  layout: {
    safeZones: {top: number; bottom: number; left: number; right: number}; // % margins
    alignment: 'left' | 'center' | 'right';
    maxWidth: string;
  };
  effects: {
    shadowDepth: 'none' | 'subtle' | 'medium' | 'strong';
    cornerRadius: number; // px
    continuityMarker?: string; // Visual element continuing to next slide
  };
}

export interface VisualCoherence {
  slides: VisualSpec[];
  overallCoherence: number; // 0-100
  issues: string[];
  recommendations: string[];
}

export const generateVisualSpecs = (slideCount: number, brandColors: Record<string, string>): VisualCoherence => {
  log.info(`[Visual] Generating specs for ${slideCount} slides`);

  const slides: VisualSpec[] = [];

  for (let i = 1; i <= slideCount; i++) {
    const spec: VisualSpec = {
      slideNumber: i,
      backgroundImage: selectBackgroundStrategy(i, slideCount),
      textOverlay: {
        backgroundColor: `rgba(0, 0, 0, 0.5)`, // 50% black overlay
        opacity: 0.7,
        padding: '30px 40px',
      },
      typography: {
        headline: {
          font: selectHeadlineFont(i, slideCount),
          size: selectHeadlineSize(i),
          weight: i <= 3 ? 700 : 600, // Bold hook, semi-bold value
          color: brandColors.text || '#FFFFFF',
        },
        body: {
          font: 'Inter',
          size: 16,
          weight: 400,
          color: '#F5F5F5',
        },
      },
      layout: {
        safeZones: {top: 20, bottom: 20, left: 20, right: 20}, // % margins
        alignment: i % 2 === 0 ? 'left' : 'center',
        maxWidth: '90%',
      },
      effects: {
        shadowDepth: i === 1 ? 'strong' : 'subtle',
        cornerRadius: 12,
        continuityMarker: i < slideCount ? `element-${i}` : undefined,
      },
    };

    slides.push(spec);
  }

  // Validate coherence
  const issues = validateVisualCoherence(slides, brandColors);
  const recommendations = generateRecommendations(slides, issues);
  const coherence = calculateVisualCoherence(slides, issues);

  log.info(`[Visual] Coherence score: ${coherence}/100. Issues: ${issues.length}`);

  return {
    slides,
    overallCoherence: coherence,
    issues,
    recommendations,
  };
};

const selectBackgroundStrategy = (slideNumber: number, total: number): string => {
  if (slideNumber === 1) return 'hero-full-bleed'; // First slide = hero image
  if (slideNumber <= 3) return 'gradient-overlay'; // Hooks = colorful
  if (slideNumber <= total - 2) return 'image-background'; // Value = image + text
  return 'solid-cta'; // CTA = solid background
};

const selectHeadlineFont = (slideNumber: number, _total: number): string => {
  if (slideNumber === 1) return 'Playfair Display'; // Hero = elegant
  if (slideNumber <= 3) return 'Poppins'; // Hooks = punchy
  return 'Montserrat'; // Value/CTA = clean
};

const selectHeadlineSize = (slideNumber: number): number => {
  if (slideNumber === 1) return 48; // Hero large
  if (slideNumber <= 3) return 40; // Hooks bold
  return 32; // Value smaller
};

const validateVisualCoherence = (slides: VisualSpec[], _brandColors: Record<string, string>): string[] => {
  const issues: string[] = [];

  // Check font consistency
  const fonts = new Set(slides.map((s) => s.typography.headline.font));
  if (fonts.size > 3) {
    issues.push('Too many headline fonts (max 3). Looks inconsistent.');
  }

  // Check color consistency
  const colors = new Set(slides.map((s) => s.typography.headline.color));
  if (colors.size > 2) {
    issues.push('Too many text colors (max 2). Lock to 1-2 for coherence.');
  }

  // Check alignment consistency
  const alignments = new Set(slides.map((s) => s.layout.alignment));
  if (alignments.size > 2) {
    issues.push('Alignment varies too much. Use 1-2 alignments max.');
  }

  // Check safe zones
  slides.forEach((s) => {
    if (s.layout.safeZones.top < 15) {
      issues.push(`Slide ${s.slideNumber}: Safe zone too small at top. Increase to 20%.`);
    }
  });

  return issues;
};

const generateRecommendations = (slides: VisualSpec[], _issues: string[]): string[] => {
  const recs: string[] = [];

  // Font pairing recommendation
  if (slides[0]?.typography.headline.font === 'Playfair Display') {
    recs.push('Pair Playfair Display (hero) with Montserrat (body) for elegance.');
  }

  // Image continuity
  const hasImageContinuity = slides.some((s) => s.effects.continuityMarker);
  if (!hasImageContinuity && slides.length > 1) {
    recs.push('Consider cross-slide image continuity (half on N, half on N+1).');
  }

  // Shadow depth
  recs.push('Use subtle shadows (2px blur) for depth without distraction.');

  // Mockups
  recs.push('Insert product mockups on value slides (4-7) for proof.');

  return recs;
};

const calculateVisualCoherence = (slides: VisualSpec[], issues: string[]): number => {
  let score = 90; // Start high

  // Deduct for issues
  score -= issues.length * 10;

  // Check font consistency bonus
  const fonts = new Set(slides.map((s) => s.typography.headline.font));
  if (fonts.size <= 2) score += 5; // Perfect font coherence

  // Check alignment consistency bonus
  const alignments = new Set(slides.map((s) => s.layout.alignment));
  if (alignments.size <= 2) score += 5; // Good alignment

  return Math.max(0, Math.min(100, score));
};

// ── Background Image Selection ────────────────────────────────────────

export interface BackgroundStrategy {
  type: 'hero' | 'gradient' | 'image-text' | 'solid';
  imageUrl?: string;
  gradient?: {start: string; end: string};
  position: 'center' | 'top' | 'bottom';
  size: 'cover' | 'contain';
}

export const selectBackgroundImage = (
  slideNumber: number,
  topic: string,
  emotion: string,
): BackgroundStrategy => {
  const strategies: Record<string, BackgroundStrategy> = {
    'hero-full-bleed': {
      type: 'hero',
      position: 'center',
      size: 'cover',
      imageUrl: `https://images.unsplash.com/photo-1${Math.random()}?w=1200`, // Mock
    },
    'gradient-overlay': {
      type: 'gradient',
      gradient: {
        start: emotion === 'fear' ? '#E91E8C' : '#6B8E71',
        end: emotion === 'fear' ? '#000000' : '#FFFFFF',
      },
      position: 'center',
      size: 'cover',
    },
    'image-text': {
      type: 'image-text',
      position: 'center',
      size: 'cover',
      imageUrl: `https://images.pexels.com/search?q=${topic}`, // Mock
    },
    solid: {
      type: 'solid',
      position: 'center',
      size: 'cover',
    },
  };

  const key = selectBackgroundStrategy(slideNumber, 10);
  return strategies[key] || strategies['image-text']!;
};

// ── Text Overlay Safety ────────────────────────────────────────────────

export const calculateSafeZones = (
  containerWidth: number,
  containerHeight: number,
  margins: {top: number; bottom: number; left: number; right: number},
): {x: number; y: number; width: number; height: number} => {
  // Margins as percentage
  const topPx = (containerHeight * margins.top) / 100;
  const bottomPx = (containerHeight * margins.bottom) / 100;
  const leftPx = (containerWidth * margins.left) / 100;
  const rightPx = (containerWidth * margins.right) / 100;

  return {
    x: leftPx,
    y: topPx,
    width: containerWidth - leftPx - rightPx,
    height: containerHeight - topPx - bottomPx,
  };
};

// ── Cross-Slide Continuity ────────────────────────────────────────────

export interface ContinuityElement {
  slideNumber: number;
  element: string; // Description
  position: 'top' | 'bottom' | 'left' | 'right';
  splitPoint: 'half' | 'third' | 'quarter'; // How much carries to next slide
}

export const generateContinuityElements = (slideCount: number): ContinuityElement[] => {
  const elements: ContinuityElement[] = [];

  for (let i = 1; i < slideCount; i++) {
    const continuity: ContinuityElement = {
      slideNumber: i,
      element: `Woman holding ${i % 3 === 0 ? 'product' : 'gesture'}`,
      position: i % 2 === 0 ? 'right' : 'left',
      splitPoint: 'half',
    };

    elements.push(continuity);
  }

  return elements;
};
