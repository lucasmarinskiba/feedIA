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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock data uses legacy shape
  return {
    id: `brand_${userId}_canva`,
    name: 'My Brand (Canva)',
    type: 'marca-personal',
    niche: 'general',
    visual: { palette: ['#E91E8C', '#00D9FF', '#FFFFFF', '#1A1A1A'], typography: ['Poppins', 'Inter', 'Playfair Display'], style: 'bold-playful', mood: 'energetic' },
    voice: { tone: ['energetic', 'playful', 'authentic'], forbidden: [], referenceQuotes: [] },
    audience: { description: 'Gen Z creators and small business owners', pains: [], desires: [], locale: 'es' },
    goals: [], competitors: [], hashtagPools: { niche: [], trending: [], branded: [] },
  } as unknown as BrandProfile;
};

const detectFromInstagram = async (userId: string): Promise<BrandProfile | null> => {
  // Connect to Instagram Graph API
  // Extract: bio, profile colors, content style, audience
  // Mock: return sample Instagram brand
  log.debug(`[Brand Kit] Checking Instagram for user: ${userId}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock data uses legacy shape
  return {
    id: `brand_${userId}_ig`,
    name: 'My Instagram Brand',
    type: 'marca-personal',
    niche: 'lifestyle',
    visual: { palette: ['#E1306C', '#405DE6', '#FFFFFF', '#000000'], typography: ['Montserrat', 'Open Sans', 'Playfair Display'], style: 'clean-editorial', mood: 'friendly' },
    voice: { tone: ['friendly', 'inspirational'], forbidden: [], referenceQuotes: [] },
    audience: { description: 'Women 25-35 and lifestyle enthusiasts', pains: [], desires: [], locale: 'es' },
    goals: [], competitors: [], hashtagPools: { niche: [], trending: [], branded: [] },
  } as unknown as BrandProfile;
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
      type: 'marca-personal',
      niche: 'wellness',
      visual: { palette: ['#6B8E71', '#D4AF37', '#F5EEE0', '#1A1A1A'], typography: ['Poppins', 'Inter', 'Lora'], style: 'warm-organic', mood: 'authentic' },
      voice: { tone: ['authentic', 'educational', 'warm'], forbidden: [], referenceQuotes: [] },
      audience: { description: 'Conscious consumers and sustainability advocates', pains: [], desires: [], locale: 'es' },
      goals: [], competitors: [], hashtagPools: { niche: [], trending: [], branded: [] },
    } as unknown as BrandProfile,
    confidence: 65,
  };
};

export const validateBrandKit = (brand: BrandProfile): {valid: boolean; issues: string[]} => {
  const issues: string[] = [];

  if (!brand.visual?.palette?.[0]) issues.push('Missing primary color');
  if (!brand.visual?.typography?.[0]) issues.push('Missing headline font');
  if (!brand.voice?.tone?.length) issues.push('Missing voice tone');
  if (!brand.audience?.description) issues.push('Missing audience description');

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
  };
};
