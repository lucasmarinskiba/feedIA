/**
 * Phase 13: Brand Kit Auto-Loader
 *
 * Reads user's existing brand profile + feeds into generation pipeline
 * No manual brand setup. Auto-detect from account metadata.
 */

import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

export interface BrandKitSource {
  type: 'instagram' | 'canva' | 'manual' | 'ai-detected';
  data: BrandProfile;
  confidence: number; // 0-100 (AI detection confidence)
  lastUpdated: string;
}

export const autoLoadBrandKit = async (userId: string): Promise<BrandKitSource> => {
  log.info(`[Brand Kit] Auto-loading for user: ${userId}`);

  // Step 1: Check if manual brand exists
  const manualBrand = await checkManualBrandKit(userId);
  if (manualBrand) {
    log.info('[Brand Kit] ✓ Manual brand kit found');
    return {
      type: 'manual',
      data: manualBrand,
      confidence: 100,
      lastUpdated: new Date().toISOString(),
    };
  }

  // Step 2: Try Canva Brand Kit API
  const canvaBrand = await loadFromCanva(userId);
  if (canvaBrand) {
    log.info('[Brand Kit] ✓ Canva brand kit loaded');
    return {
      type: 'canva',
      data: canvaBrand,
      confidence: 95,
      lastUpdated: new Date().toISOString(),
    };
  }

  // Step 3: Try Instagram profile detection
  const instagramBrand = await detectFromInstagram(userId);
  if (instagramBrand) {
    log.info('[Brand Kit] ✓ Instagram profile auto-detected');
    return {
      type: 'instagram',
      data: instagramBrand,
      confidence: 70,
      lastUpdated: new Date().toISOString(),
    };
  }

  // Step 4: Fallback to AI detection (analyze account history)
  const aiBrand = await aiDetectBrand(userId);
  log.info(`[Brand Kit] AI detected brand (confidence: ${aiBrand.confidence}%)`);

  return {
    type: 'ai-detected',
    data: aiBrand.profile,
    confidence: aiBrand.confidence,
    lastUpdated: new Date().toISOString(),
  };
};

const checkManualBrandKit = async (userId: string): Promise<BrandProfile | null> => {
  // Query DB for user's saved brand profile
  // Mock: simulate DB lookup
  return null;
};

const loadFromCanva = async (userId: string): Promise<BrandProfile | null> => {
  // Call Canva Brand Kit API
  // Extract: colors, fonts, logo, design guidelines
  // Mock: return sample Canva brand
  log.debug(`[Brand Kit] Checking Canva for user: ${userId}`);

  return {
    id: `brand_${userId}_canva`,
    name: 'My Brand (Canva)',
    colors: {
      primary: '#E91E8C',
      secondary: '#00D9FF',
      accent: '#FFFFFF',
      neutral: '#1A1A1A',
    },
    fonts: {
      headline: 'Poppins',
      body: 'Inter',
      accent: 'Playfair Display',
    },
    voice: {
      tone: ['energetic', 'playful', 'authentic'],
      tagline: 'Bold ideas, creative execution',
    },
    audience: {
      primary: 'Gen Z creators',
      secondary: 'small business owners',
    },
  };
};

const detectFromInstagram = async (userId: string): Promise<BrandProfile | null> => {
  // Connect to Instagram Graph API
  // Extract: bio, profile colors, content style, audience
  // Mock: return sample Instagram brand
  log.debug(`[Brand Kit] Checking Instagram for user: ${userId}`);

  return {
    id: `brand_${userId}_ig`,
    name: 'My Instagram Brand',
    colors: {
      primary: '#E1306C',
      secondary: '#405DE6',
      accent: '#FFFFFF',
      neutral: '#000000',
    },
    fonts: {
      headline: 'Montserrat',
      body: 'Open Sans',
      accent: 'Playfair Display',
    },
    voice: {
      tone: ['friendly', 'inspirational'],
      tagline: 'Creating moments that matter',
    },
    audience: {
      primary: 'women 25-35',
      secondary: 'lifestyle enthusiasts',
    },
  };
};

const aiDetectBrand = async (userId: string): Promise<{profile: BrandProfile; confidence: number}> => {
  // Analyze user's content history
  // LLM inference: tone, colors, values, audience
  // Mock: return AI-detected brand
  log.info(`[Brand Kit] AI analysis starting for: ${userId}`);

  return {
    profile: {
      id: `brand_${userId}_ai`,
      name: 'Auto-Detected Brand',
      colors: {
        primary: '#6B8E71',
        secondary: '#D4AF37',
        accent: '#F5EEE0',
        neutral: '#1A1A1A',
      },
      fonts: {
        headline: 'Poppins',
        body: 'Inter',
        accent: 'Lora',
      },
      voice: {
        tone: ['authentic', 'educational', 'warm'],
        tagline: 'Real stories, real impact',
      },
      audience: {
        primary: 'conscious consumers',
        secondary: 'sustainability advocates',
      },
    },
    confidence: 65,
  };
};

export const validateBrandKit = (brand: BrandProfile): {valid: boolean; issues: string[]} => {
  const issues: string[] = [];

  if (!brand.colors?.primary) issues.push('Missing primary color');
  if (!brand.fonts?.headline) issues.push('Missing headline font');
  if (!brand.voice?.tone?.length) issues.push('Missing voice tone');
  if (!brand.audience?.primary) issues.push('Missing primary audience');

  return {
    valid: issues.length === 0,
    issues,
  };
};

export const mergeBrandKits = (source: BrandKitSource, manual: Partial<BrandProfile>): BrandProfile => {
  log.info(`[Brand Kit] Merging ${source.type} + manual overrides`);

  return {
    ...source.data,
    ...manual,
    id: source.data.id,
    lastUpdated: new Date().toISOString(),
  };
};
