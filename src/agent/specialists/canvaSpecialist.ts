/**
 * Canva Specialist Agent
 *
 * Maestro en:
 * - Diseño gráfico (composición, jerarquía visual, balance)
 * - Branding (brand guidelines, color theory, typography)
 * - Estética (Pinterest patterns, trending aesthetics)
 * - Comunicación visual (iconografía, siluetas, illustrations)
 * - Arte (color psychology, visual rhythm, contrast)
 *
 * Consulta: otros agentes + CU preguntan "cómo diseñar X"
 * Output: struct design instruction para Canva/herramientas
 */

import { log } from '../logger.js';
import type { BrandProfile } from '../../config/types.js';

export interface DesignBrief {
  format: 'carousel' | 'reel' | 'story' | 'tiktok-video' | 'tiktok-photo' | 'tiktok-script';
  platform: 'instagram' | 'tiktok';
  topic: string;
  tone: string[];
  contentType: 'hook' | 'value' | 'cta' | 'testimonial' | 'behind-the-scenes' | 'educational' | 'entertaining';
  brand?: BrandProfile;
}

export interface CanvaDesignSpec {
  templateSuggestion: string; // Canva template ID or name
  dimensions: { width: number; height: number };
  colorPalette: {
    primary: string; // hex
    secondary: string;
    accent: string;
    text: string;
  };
  typography: {
    headline: { font: string; size: number; weight: number; color: string };
    body: { font: string; size: number; weight: number; color: string };
    cta: { font: string; size: number; weight: number; color: string };
  };
  layout: {
    pattern: 'left-text-right-image' | 'full-bleed' | 'grid' | 'asymmetrical' | 'centered';
    whitespace: number; // % minimum
    alignment: 'left' | 'center' | 'right';
  };
  imagery: {
    style: 'photo' | 'illustration' | 'silueta' | 'mixed';
    keywords: string[];
    mood: string;
  };
  elements: {
    icons: boolean;
    decorativeShapes: boolean;
    borders: boolean;
    shadows: boolean;
    gradients: boolean;
  };
  animation: {
    style: 'fade' | 'slide' | 'zoom' | 'none';
    duration: number; // ms
  };
  canvaInstructions: string[]; // Step-by-step for human or CU
}

// ── Design decision engine ────────────────────────────────────────────────

const designPatterns: Record<string, CanvaDesignSpec> = {
  'carousel-hook': {
    templateSuggestion: 'Carousel Hook - Pinterest Style',
    dimensions: { width: 1080, height: 1350 },
    colorPalette: {
      primary: '#E91E8C',
      secondary: '#22D3EE',
      accent: '#7FFF00',
      text: '#FFFFFF',
    },
    typography: {
      headline: { font: 'Poppins', size: 48, weight: 700, color: '#FFFFFF' },
      body: { font: 'Inter', size: 16, weight: 400, color: '#F5F5F5' },
      cta: { font: 'Montserrat', size: 20, weight: 700, color: '#E91E8C' },
    },
    layout: {
      pattern: 'full-bleed',
      whitespace: 20,
      alignment: 'center',
    },
    imagery: {
      style: 'silueta',
      keywords: ['hand', 'gesture', 'attention-grabbing'],
      mood: 'energetic, playful',
    },
    elements: {
      icons: true,
      decorativeShapes: true,
      borders: false,
      shadows: true,
      gradients: true,
    },
    animation: {
      style: 'zoom',
      duration: 400,
    },
    canvaInstructions: [
      '1. Start with Bold Playful template (Magenta + Cyan)',
      '2. Add hook text (28-36px, bold, max 8 words)',
      '3. Layer silueta hand/object (opacity 80%)',
      '4. Add CTA at bottom (button-style)',
      '5. Export 1080×1350 PNG',
    ],
  },
  'carousel-value': {
    templateSuggestion: 'Carousel Value - Clean Editorial',
    dimensions: { width: 1080, height: 1350 },
    colorPalette: {
      primary: '#001F3F',
      secondary: '#FFFFFF',
      accent: '#22D3EE',
      text: '#16171C',
    },
    typography: {
      headline: { font: 'Inter', size: 36, weight: 700, color: '#001F3F' },
      body: { font: 'Inter', size: 14, weight: 400, color: '#474A54' },
      cta: { font: 'Inter', size: 16, weight: 600, color: '#22D3EE' },
    },
    layout: {
      pattern: 'left-text-right-image',
      whitespace: 15,
      alignment: 'left',
    },
    imagery: {
      style: 'photo',
      keywords: ['professional', 'authentic', 'real-context'],
      mood: 'trustworthy, expert',
    },
    elements: {
      icons: true,
      decorativeShapes: false,
      borders: true,
      shadows: true,
      gradients: false,
    },
    animation: {
      style: 'fade',
      duration: 400,
    },
    canvaInstructions: [
      '1. Use Clean Editorial template (Navy + White)',
      '2. Text on left 40%, image on right 60%',
      '3. Headline 36px bold, max 2 lines',
      '4. Body 14px, 80 chars max',
      '5. Add thin accent line (left edge)',
      '6. Export 1080×1350 PNG',
    ],
  },
  'reel-hook': {
    templateSuggestion: 'Reel Hook - Trending Audio Aligned',
    dimensions: { width: 1080, height: 1920 },
    colorPalette: {
      primary: '#E6D5B8',
      secondary: '#1A1A1A',
      accent: '#FE2C55',
      text: '#FFFFFF',
    },
    typography: {
      headline: { font: 'Poppins', size: 52, weight: 900, color: '#FFFFFF' },
      body: { font: 'Inter', size: 18, weight: 500, color: '#FFFFFF' },
      cta: { font: 'Montserrat', size: 24, weight: 700, color: '#FE2C55' },
    },
    layout: {
      pattern: 'full-bleed',
      whitespace: 10,
      alignment: 'center',
    },
    imagery: {
      style: 'mixed',
      keywords: ['trending', 'dynamic', 'eye-catching'],
      mood: 'viral, energetic',
    },
    elements: {
      icons: true,
      decorativeShapes: true,
      borders: false,
      shadows: true,
      gradients: true,
    },
    animation: {
      style: 'slide',
      duration: 500,
    },
    canvaInstructions: [
      '1. Dark premium template (Dark Gray + Soft Gold)',
      '2. Hook text 52px bold, 0-2 seconds timing',
      '3. Add trending audio visualization/waveform',
      '4. Layer dynamic shapes (animated)',
      '5. CTA at 1.5s mark (pattern interrupt)',
      '6. Export 1080×1920 MP4 (30fps)',
    ],
  },
  'tiktok-hook': {
    templateSuggestion: 'TikTok Hook - 9:16 Trending',
    dimensions: { width: 1080, height: 1920 },
    colorPalette: {
      primary: '#25F4EE',
      secondary: '#000000',
      accent: '#FE2C55',
      text: '#FFFFFF',
    },
    typography: {
      headline: { font: 'Poppins', size: 56, weight: 900, color: '#FFFFFF' },
      body: { font: 'TikTok Sans', size: 20, weight: 600, color: '#25F4EE' },
      cta: { font: 'Montserrat', size: 28, weight: 800, color: '#FE2C55' },
    },
    layout: {
      pattern: 'full-bleed',
      whitespace: 5,
      alignment: 'center',
    },
    imagery: {
      style: 'mixed',
      keywords: ['viral', 'TikTok-native', 'sticker-style'],
      mood: 'chaotic-fun, attention-grabbing',
    },
    elements: {
      icons: true,
      decorativeShapes: true,
      borders: true,
      shadows: true,
      gradients: true,
    },
    animation: {
      style: 'zoom',
      duration: 300,
    },
    canvaInstructions: [
      '1. TikTok Bold Playful template (Cyan + Magenta)',
      '2. Hook text 56px, top 1/3, max 4 words',
      '3. Add animated stickers + shapes',
      '4. Sound design: trending audio overlay',
      '5. Text enter: pop-in (0-1s)',
      '6. Export 1080×1920 MP4 (vertical, 30fps)',
    ],
  },
};

// ── Main consultation API ────────────────────────────────────────────────

export const consultCanvaSpecialist = async (brief: DesignBrief): Promise<CanvaDesignSpec> => {
  log.info(`[Canva Specialist] Consulting: ${brief.format} / ${brief.topic} / ${brief.contentType}`);

  // Pattern lookup
  const patternKey = `${brief.format}-${brief.contentType}`.toLowerCase().replace(/-_/g, '-');
  let spec: CanvaDesignSpec = designPatterns[patternKey];

  // Fallback: generic pattern
  if (!spec) {
    const fallback = designPatterns['carousel-value'] || Object.values(designPatterns)[0];
    spec = fallback as CanvaDesignSpec;
    log.warn(`[Canva Specialist] Pattern '${patternKey}' not found, using fallback`);
  }

  // Brand override (if brand provided)
  if (brief.brand?.type === 'empresa') {
    // Corporate brands use darker, professional colors
    spec.colorPalette.primary = '#001F3F'; // Navy
    spec.colorPalette.secondary = '#E6D5B8'; // Soft gold
  } else if (brief.brand?.niche === 'tech') {
    // Tech brands use modern, vibrant colors
    spec.colorPalette.primary = '#00D9FF'; // Cyan
    spec.colorPalette.secondary = '#E91E8C'; // Magenta
  }

  // Tone adjustment (brand voice affects typography)
  if (brief.tone?.includes('premium')) {
    spec.typography.headline.weight = 700;
    spec.layout.whitespace = Math.max(spec.layout.whitespace, 20);
  }
  if (brief.tone?.includes('playful')) {
    spec.elements.decorativeShapes = true;
    spec.elements.gradients = true;
  }

  return spec;
};

// ── Convert spec to Canva API calls (for CU) ──────────────────────────────

export interface CanvaAction {
  type: 'create' | 'edit' | 'add-text' | 'add-image' | 'apply-filter' | 'export';
  selector?: string; // CSS selector for CU to target
  instruction: string;
  params?: Record<string, unknown>;
}

export const specToCanvaActions = (spec: CanvaDesignSpec): CanvaAction[] => [
    {
      type: 'create',
      instruction: `Create new design: ${spec.dimensions.width}×${spec.dimensions.height}`,
      params: spec.dimensions,
    },
    {
      type: 'add-text',
      selector: '[data-text-type="headline"]',
      instruction: `Add headline: ${spec.typography.headline.font} ${spec.typography.headline.size}px ${spec.typography.headline.weight} color ${spec.typography.headline.color}`,
      params: spec.typography.headline,
    },
    {
      type: 'add-image',
      selector: '[data-image-slot="hero"]',
      instruction: `Add hero image: search "${spec.imagery.keywords.join(', ')}" (${spec.imagery.style} style, ${spec.imagery.mood} mood)`,
      params: spec.imagery,
    },
    {
      type: 'apply-filter',
      instruction: `Apply color overlay: primary=${spec.colorPalette.primary} opacity=20%`,
      params: { color: spec.colorPalette.primary, opacity: 0.2 },
    },
    {
      type: 'export',
      instruction: `Export as PNG: 1080×1350, optimize for Instagram`,
      params: { format: 'png', quality: 95 },
    },
  ];

// ── Studio tool helpers (non-CU fallback) ──────────────────────────────────

export const generateCarouselInsight = (spec: CanvaDesignSpec, slideIndex: number): string => {
  const layout = spec.layout.pattern;
  const colors = Object.values(spec.colorPalette).join(', ');
  return (
    `Slide ${slideIndex + 1}: ${layout} layout. ` +
    `Colors: ${colors}. ` +
    `Headline: ${spec.typography.headline.size}px ${spec.typography.headline.weight}. ` +
    `Image: ${spec.imagery.style} (${spec.imagery.mood}).`
  );
};

export const generateReelInsight = (spec: CanvaDesignSpec): string => (
    `Reel strategy: ${spec.animation.style} entrance (${spec.animation.duration}ms). ` +
    `Hook text: ${spec.typography.headline.size}px bold. ` +
    `Sound: trending audio paired with ${spec.imagery.mood} visuals. ` +
    `CTA at 1.5s mark.`
  );

export const generateTikTokInsight = (spec: CanvaDesignSpec): string => (
    `TikTok format (9:16): ${spec.layout.pattern}. ` +
    `Hook: ${spec.typography.headline.size}px, top 1/3. ` +
    `Trending stickers + sound. ` +
    `Enter animation: ${spec.animation.style} (${spec.animation.duration}ms).`
  );
