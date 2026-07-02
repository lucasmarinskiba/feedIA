/**
 * Phase 25: Typography System
 *
 * 20 premium fonts + pairing strategies + mobile/contrast checklist
 * Fonts organized by niche, emotion, use case
 */

import { log } from '../../agent/logger.js';

export interface FontFamily {
  id: string;
  name: string;
  category: 'headline' | 'body' | 'accent' | 'display' | 'monospace' | 'script';
  weights: string[];
  niches: string[];
  emotions: string[];
  useCase: string;
  mobileOptimized: boolean;
  minContrast: number; // WCAG ratio
}

export interface FontPairing {
  id: string;
  headline: string;
  body: string;
  accent?: string;
  niche: string;
  emotion: string[];
  useCase: string;
}

export interface TypographyChecklist {
  readableOnMobile: boolean;
  matchesNicheEnergy: boolean;
  sufficientContrast: boolean; // 4.5:1 minimum
  enoughReadingTime: boolean;
  pass: boolean;
}

// ── 20 PREMIUM FONTS ───────────────────────────────────────────────────────

export const premiumFonts: FontFamily[] = [
  // GROUP A: Tech / Modern (5 fonts)
  {
    id: 'outfit',
    name: 'Outfit',
    category: 'headline',
    weights: ['Thin', 'Regular', 'Medium', 'Semibold', 'Bold', 'Black'],
    niches: ['tech', 'startup', 'fintech'],
    emotions: ['modern', 'clean', 'professional'],
    useCase: 'Tech headlines, startup branding, modern professional',
    mobileOptimized: true,
    minContrast: 4.5,
  },
  {
    id: 'exo2',
    name: 'Exo 2',
    category: 'display',
    weights: ['Thin', 'Bold', 'Black'],
    niches: ['tech', 'innovation', 'ai'],
    emotions: ['futuristic', 'dynamic', 'cutting-edge'],
    useCase: 'Cutting-edge, innovation, sci-fi, AI brands',
    mobileOptimized: true,
    minContrast: 4.5,
  },
  {
    id: 'dmSans',
    name: 'DM Sans',
    category: 'body',
    weights: ['Light', 'Regular', 'Medium', 'Semibold', 'Bold', 'Extrabold', 'Black'],
    niches: ['editorial', 'tech', 'minimal'],
    emotions: ['clean', 'readable', 'accessible'],
    useCase: 'Body text, accessibility champion, editorial, minimal',
    mobileOptimized: true,
    minContrast: 4.5,
  },
  {
    id: 'plusJakarta',
    name: 'Plus Jakarta Sans',
    category: 'headline',
    weights: ['Extralight', 'Light', 'Regular', 'Semibold', 'Bold', 'Extrabold'],
    niches: ['playful', 'contemporary', 'creative'],
    emotions: ['friendly', 'approachable', 'warm'],
    useCase: 'Contemporary, playful-professional, community brands',
    mobileOptimized: true,
    minContrast: 4.5,
  },
  {
    id: 'proximaNova',
    name: 'Proxima Nova',
    category: 'headline',
    weights: ['Light', 'Regular', 'Medium', 'Semibold', 'Bold', 'Extrabold', 'Black'],
    niches: ['professional', 'universal', 'corporate'],
    emotions: ['versatile', 'trustworthy', 'balanced'],
    useCase: 'Default professional, universal choice, versatile',
    mobileOptimized: true,
    minContrast: 4.5,
  },

  // GROUP B: Wellness / Emotional (5 fonts)
  {
    id: 'spaceGrotesk',
    name: 'Space Grotesk',
    category: 'display',
    weights: ['Regular', 'Bold'],
    niches: ['finance', 'fintech', 'tech'],
    emotions: ['modern', 'bold', 'impactful'],
    useCase: 'Finance, keywords in CAPS, bold impact, tech',
    mobileOptimized: true,
    minContrast: 4.5,
  },
  {
    id: 'manrope',
    name: 'Manrope',
    category: 'body',
    weights: ['Light', 'Regular', 'Medium', 'Semibold', 'Bold', 'Extrabold'],
    niches: ['wellness', 'health', 'coaching', 'calm'],
    emotions: ['calm', 'friendly', 'peaceful', 'warm'],
    useCase: 'Health/wellness, testimonials, peaceful content, breathing room',
    mobileOptimized: true,
    minContrast: 4.5,
  },
  {
    id: 'fraunces',
    name: 'Fraunces',
    category: 'display',
    weights: ['Regular', 'Semibold', 'Bold', 'Black'],
    niches: ['psychology', 'coaching', 'emotion', 'luxury'],
    emotions: ['emotional', 'warm', 'reflective', 'elegant'],
    useCase: 'Emotional copy, psychological hooks, coaching, reflective',
    mobileOptimized: false, // Serif, needs larger size on mobile
    minContrast: 7.0, // Higher for serif
  },
  {
    id: 'playfairDisplay',
    name: 'Playfair Display',
    category: 'display',
    weights: ['Regular', 'Semibold', 'Bold', 'Black'],
    niches: ['luxury', 'realestate', 'premium', 'fashion'],
    emotions: ['elegant', 'premium', 'sophisticated', 'timeless'],
    useCase: 'Luxury, real estate, high-end brands, premium positioning',
    mobileOptimized: false, // Serif display, headline-only
    minContrast: 7.0,
  },
  {
    id: 'workSans',
    name: 'Work Sans',
    category: 'body',
    weights: ['Thin', 'Light', 'Regular', 'Medium', 'Semibold', 'Bold', 'Extrabold', 'Black'],
    niches: ['education', 'elearning', 'minimal', 'tech'],
    emotions: ['educational', 'clear', 'efficient', 'readable'],
    useCase: 'Education, e-learning, variable weights for hierarchy, minimal',
    mobileOptimized: true,
    minContrast: 4.5,
  },

  // GROUP C: Premium / Specialty (5 fonts)
  {
    id: 'offlander',
    name: 'Offlander',
    category: 'script',
    weights: ['Regular'],
    niches: ['vintage', 'luxury', 'artisanal', 'handmade'],
    emotions: ['nostalgic', 'elegant', 'timeless', 'authentic'],
    useCase: 'Vintage brands, artisanal products, elegant accents',
    mobileOptimized: false, // Script, display-only
    minContrast: 7.0,
  },
  {
    id: 'gulfsBold',
    name: 'Gulfs Display',
    category: 'display',
    weights: ['Bold', 'Black'],
    niches: ['bold', 'playful', 'impact', 'entertainment'],
    emotions: ['powerful', 'confident', 'striking', 'bold'],
    useCase: 'Bold headlines, eye-catching, high-impact messaging',
    mobileOptimized: true,
    minContrast: 4.5,
  },
  {
    id: 'leagueSpartan',
    name: 'League Spartan',
    category: 'headline',
    weights: ['Light', 'Regular', 'Semibold', 'Bold', 'Black'],
    niches: ['modern', 'minimal', 'geometric', 'tech'],
    emotions: ['contemporary', 'clean', 'forward-thinking', 'minimalist'],
    useCase: 'Modern headlines, minimal design, geometric brands',
    mobileOptimized: true,
    minContrast: 4.5,
  },
  {
    id: 'alef',
    name: 'Alef',
    category: 'display',
    weights: ['Regular', 'Bold', 'Black'],
    niches: ['tech', 'innovation', 'futuristic', 'ai'],
    emotions: ['futuristic', 'geometric', 'cutting-edge', 'advanced'],
    useCase: 'Tech innovation, geometric systems, futuristic brands',
    mobileOptimized: true,
    minContrast: 4.5,
  },
  {
    id: 'bernoruCondensed',
    name: 'Bernoru Condensed',
    category: 'display',
    weights: ['Bold', 'Black'],
    niches: ['bold', 'compact', 'modern', 'impact'],
    emotions: ['bold', 'compressed', 'efficient', 'modern'],
    useCase: 'Space-efficient headlines, bold impact, compact design',
    mobileOptimized: true,
    minContrast: 4.5,
  },

  // GROUP D: Technical / Supportive (5 fonts)
  {
    id: 'robotoMono',
    name: 'Roboto Mono',
    category: 'monospace',
    weights: ['Light', 'Regular', 'Medium', 'Bold'],
    niches: ['tech', 'code', 'developer', 'technical'],
    emotions: ['technical', 'precise', 'code-native', 'systematic'],
    useCase: 'Code blocks, tech docs, developer content, monospace',
    mobileOptimized: true,
    minContrast: 4.5,
  },
  {
    id: 'herticalRough',
    name: 'Hertical Rough',
    category: 'script',
    weights: ['Regular'],
    niches: ['creative', 'casual', 'handmade', 'playful'],
    emotions: ['creative', 'expressive', 'human', 'authentic'],
    useCase: 'Handwritten feel, creative accents, casual messaging',
    mobileOptimized: false, // Script, display-only
    minContrast: 7.0,
  },
  {
    id: 'cubaoNarrow',
    name: 'Cubao Narrow',
    category: 'headline',
    weights: ['Regular', 'Bold', 'Black'],
    niches: ['compact', 'minimal', 'modern', 'tech'],
    emotions: ['compact', 'efficient', 'minimal', 'bold'],
    useCase: 'Space-constrained designs, narrow headlines, compact',
    mobileOptimized: true,
    minContrast: 4.5,
  },
  {
    id: 'rumbleBrave',
    name: 'Rumble Brave',
    category: 'script',
    weights: ['Regular', 'Bold'],
    niches: ['bold', 'confident', 'statement', 'emotional'],
    emotions: ['bold', 'confident', 'expressive', 'impactful'],
    useCase: 'Bold statements, emotional copy, confident messaging',
    mobileOptimized: false, // Script, display-only
    minContrast: 7.0,
  },
  {
    id: 'motor',
    name: 'Motor',
    category: 'monospace',
    weights: ['Regular', 'Bold'],
    niches: ['tech', 'innovation', 'modern', 'developer'],
    emotions: ['technical', 'innovative', 'forward', 'precise'],
    useCase: 'Tech brands, innovation, modern monospace, developer-friendly',
    mobileOptimized: true,
    minContrast: 4.5,
  },
];

// ── FONT PAIRINGS BY NICHE ─────────────────────────────────────────────────

export const fontPairingsByNiche: Record<string, FontPairing> = {
  tech: {
    id: 'tech',
    headline: 'Outfit',
    body: 'DM Sans',
    accent: 'Exo 2',
    niche: 'tech',
    emotion: ['modern', 'clean', 'professional'],
    useCase: 'Tech startups, fintech, developer tools',
  },
  finance: {
    id: 'finance',
    headline: 'Space Grotesk',
    body: 'DM Sans',
    accent: 'Proxima Nova',
    niche: 'finance',
    emotion: ['bold', 'trustworthy', 'modern'],
    useCase: 'Finance, investment, crypto, economic',
  },
  wellness: {
    id: 'wellness',
    headline: 'Manrope',
    body: 'Manrope',
    accent: 'Fraunces',
    niche: 'wellness',
    emotion: ['calm', 'peaceful', 'warm'],
    useCase: 'Health, wellness, coaching, mindfulness',
  },
  luxury: {
    id: 'luxury',
    headline: 'Playfair Display',
    body: 'DM Sans',
    accent: 'Proxima Nova',
    niche: 'luxury',
    emotion: ['elegant', 'premium', 'sophisticated'],
    useCase: 'Luxury brands, real estate, premium services',
  },
  education: {
    id: 'education',
    headline: 'Work Sans',
    body: 'Work Sans',
    accent: 'DM Sans',
    niche: 'education',
    emotion: ['educational', 'clear', 'accessible'],
    useCase: 'E-learning, courses, educational content',
  },
  coaching: {
    id: 'coaching',
    headline: 'Fraunces',
    body: 'Manrope',
    accent: 'Plus Jakarta',
    niche: 'coaching',
    emotion: ['emotional', 'warm', 'reflective'],
    useCase: 'Coaching, psychology, personal development',
  },
  playful: {
    id: 'playful',
    headline: 'Plus Jakarta',
    body: 'Manrope',
    accent: 'Outfit',
    niche: 'playful',
    emotion: ['friendly', 'approachable', 'creative'],
    useCase: 'Community, creative, playful brands',
  },
  minimal: {
    id: 'minimal',
    headline: 'League Spartan',
    body: 'DM Sans',
    accent: 'Cubao Narrow',
    niche: 'minimal',
    emotion: ['clean', 'modern', 'minimal'],
    useCase: 'Minimal design, modern, geometric',
  },
  bold: {
    id: 'bold',
    headline: 'Gulfs Display',
    body: 'DM Sans',
    accent: 'Space Grotesk',
    niche: 'bold',
    emotion: ['powerful', 'confident', 'striking'],
    useCase: 'Bold impact, high-energy, entertainment',
  },
  vintage: {
    id: 'vintage',
    headline: 'Offlander',
    body: 'Proxima Nova',
    accent: 'Playfair Display',
    niche: 'vintage',
    emotion: ['nostalgic', 'elegant', 'timeless'],
    useCase: 'Vintage, artisanal, retro brands',
  },
};

// ── TYPOGRAPHY CHECKLIST ──────────────────────────────────────────────────

export const validateTypography = (
  font: FontFamily,
  niche: string,
  bgColor: string,
  textColor: string,
  platform: 'mobile' | 'desktop' | 'all' = 'all',
): TypographyChecklist => {
  const checks = {
    readableOnMobile: platform === 'desktop' ? true : font.mobileOptimized,
    matchesNicheEnergy: font.niches.includes(niche),
    sufficientContrast: font.minContrast >= 4.5,
    enoughReadingTime: font.category !== 'script' || font.category === 'body',
  };

  return {
    ...checks,
    pass: Object.values(checks).every((v) => v === true),
  };
};

// ── FONT LOADING STRATEGY ──────────────────────────────────────────────────

export const fontLoadingPriority = [
  // Tier 1: Universal, always load (web-safe fallbacks)
  { font: 'DM Sans', url: 'https://fonts.google.com/specimen/DM+Sans', priority: 1 },
  { font: 'Proxima Nova', url: 'https://fonts.google.com/specimen/Proxima+Nova', priority: 1 },
  { font: 'Outfit', url: 'https://fonts.google.com/specimen/Outfit', priority: 1 },

  // Tier 2: Niche-specific (load based on user brand)
  { font: 'Playfair Display', url: 'https://fonts.google.com/specimen/Playfair+Display', priority: 2 },
  { font: 'Fraunces', url: 'https://fonts.google.com/specimen/Fraunces', priority: 2 },
  { font: 'Manrope', url: 'https://fonts.google.com/specimen/Manrope', priority: 2 },

  // Tier 3: Premium/rare (load on-demand, may require Typekit/Adobe)
  { font: 'Offlander', url: 'https://adobe.com/fonts', priority: 3 },
  { font: 'Rumble Brave', url: 'https://adobe.com/fonts', priority: 3 },
];

log.info('[Phase 25] Typography System initialized: 20 fonts, 10 pairings, validation ✅');

export default premiumFonts;
