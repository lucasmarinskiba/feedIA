/**
 * Phase 25: Brand Philosophy Engine
 *
 * Brand definition FIRST (mission, values, voice, personality)
 * Visual identity DERIVES FROM philosophy
 * Content generation APPLIES both
 *
 * Order: Philosophy → Visual → Content
 */

import { log } from '../../agent/logger.js';

export interface BrandPhilosophy {
  userId: string;
  mission: string;
  vision: string;
  values: string[];
  personality: string[];
  voiceKeywords: string[];
  targetAudience: string;
  uniqueProposition: string;
  competitiveDifferentiator: string;
  tone: 'professional' | 'playful' | 'casual' | 'formal' | 'emotional' | 'bold';
  contentPillars: string[];
  createdAt: string;
  updatedAt: string;
}

export interface BrandVisualExpression {
  philosophy: BrandPhilosophy;
  headlineFont: string;
  bodyFont: string;
  primaryColors: string[];
  secondaryColors: string[];
  visualMetaphors: string[];
  iconStyle: 'outline' | 'filled' | 'monoline' | 'playful' | 'minimal';
  alignsWithPhilosophy: boolean;
}

const brandPhilosophies: Map<string, BrandPhilosophy> = new Map();

// ── CREATE BRAND PHILOSOPHY ────────────────────────────────────────────────

export const createBrandPhilosophy = (
  userId: string,
  data: Partial<BrandPhilosophy>,
): BrandPhilosophy => {
  log.info(`[Phase 25] Creating brand philosophy for user: ${userId}`);

  const philosophy: BrandPhilosophy = {
    userId,
    mission: data.mission || 'Help people achieve their goals',
    vision: data.vision || 'Be the most trusted brand in our industry',
    values: data.values || ['authenticity', 'innovation', 'impact'],
    personality: data.personality || ['confident', 'approachable'],
    voiceKeywords: data.voiceKeywords || ['clear', 'honest', 'inspiring'],
    targetAudience: data.targetAudience || 'professionals 25-45',
    uniqueProposition: data.uniqueProposition || 'Only brand that understands your needs',
    competitiveDifferentiator:
      data.competitiveDifferentiator || 'We listen, others talk',
    tone: data.tone || 'professional',
    contentPillars: data.contentPillars || ['education', 'inspiration', 'community'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  brandPhilosophies.set(userId, philosophy);
  return philosophy;
};

// ── GET BRAND PHILOSOPHY ───────────────────────────────────────────────────

export const getBrandPhilosophy = (userId: string): BrandPhilosophy | null => {
  return brandPhilosophies.get(userId) || null;
};

// ── UPDATE BRAND PHILOSOPHY ────────────────────────────────────────────────

export const updateBrandPhilosophy = (
  userId: string,
  updates: Partial<BrandPhilosophy>,
): BrandPhilosophy | null => {
  const philosophy = brandPhilosophies.get(userId);
  if (!philosophy) return null;

  const updated: BrandPhilosophy = {
    ...philosophy,
    ...updates,
    userId,
    updatedAt: new Date().toISOString(),
  };

  brandPhilosophies.set(userId, updated);
  log.info(`[Phase 25] Updated philosophy: ${userId}`);
  return updated;
};

// ── VALIDATE VISUAL EXPRESSION AGAINST PHILOSOPHY ──────────────────────────

export const validateVisualAgainstPhilosophy = (
  visual: BrandVisualExpression,
): { aligned: boolean; mismatches: string[] } => {
  const mismatches: string[] = [];
  const { philosophy } = visual;

  // Check tone alignment
  const toneToFontMap: Record<string, string[]> = {
    professional: ['DM Sans', 'Proxima Nova', 'Outfit'],
    playful: ['Plus Jakarta', 'Manrope', 'Rumble Brave'],
    casual: ['Work Sans', 'League Spartan', 'Hernical Rough'],
    formal: ['Playfair Display', 'Fraunces'],
    emotional: ['Fraunces', 'Manrope'],
    bold: ['Gulfs Display', 'Space Grotesk', 'Bernoru Condensed'],
  };

  const appropriateFonts = toneToFontMap[philosophy.tone] || [];
  if (!appropriateFonts.includes(visual.headlineFont)) {
    mismatches.push(
      `Headline font "${visual.headlineFont}" doesn't match tone "${philosophy.tone}"`,
    );
  }

  // Check values alignment with colors (psychology)
  const valueToColorMap: Record<string, string[]> = {
    authenticity: ['#8B7355', '#D4AF37'], // warm, natural
    innovation: ['#00D9FF', '#E91E8C'], // bold playful
    trust: ['#001F3F', '#FFFFFF'], // navy, clean
    creativity: ['#FF6B6B', '#7FFF00'], // vibrant
  };

  for (const value of philosophy.values) {
    const valueColors = valueToColorMap[value.toLowerCase()] || [];
    if (valueColors.length > 0) {
      const hasColorMatch = visual.primaryColors.some((c) => valueColors.includes(c));
      if (!hasColorMatch) {
        mismatches.push(`Value "${value}" not reflected in color palette`);
      }
    }
  }

  return {
    aligned: mismatches.length === 0,
    mismatches,
  };
};

// ── DERIVE VISUAL IDENTITY FROM PHILOSOPHY ─────────────────────────────────

export const deriveVisualFromPhilosophy = (philosophy: BrandPhilosophy): Partial<BrandVisualExpression> => {
  log.info(`[Phase 25] Deriving visual identity from philosophy: ${philosophy.userId}`);

  // Map tone to fonts
  const toneToFonts: Record<string, { headline: string; body: string }> = {
    professional: { headline: 'Outfit', body: 'DM Sans' },
    playful: { headline: 'Plus Jakarta', body: 'Manrope' },
    casual: { headline: 'Work Sans', body: 'Work Sans' },
    formal: { headline: 'Playfair Display', body: 'DM Sans' },
    emotional: { headline: 'Fraunces', body: 'Manrope' },
    bold: { headline: 'Gulfs Display', body: 'DM Sans' },
  };

  // Map values to colors
  const valueToColors: Record<string, string[]> = {
    authenticity: ['#8B7355', '#D4AF37', '#F5EEE0'], // Warm Organic
    innovation: ['#E91E8C', '#00D9FF', '#7FFF00'], // Bold Playful
    trust: ['#001F3F', '#FFFFFF', '#E6D5B8'], // Dark Premium
    creativity: ['#FF6B6B', '#7FFF00', '#E91E8C'], // Bold Playful
    sustainability: ['#6B8E71', '#F5EEE0', '#8B7355'], // Warm Organic
  };

  let primaryColors: string[] = [];
  for (const value of philosophy.values) {
    const colors = valueToColors[value.toLowerCase()] || [];
    primaryColors.push(...colors);
  }
  primaryColors = [...new Set(primaryColors)].slice(0, 3);

  const fonts = toneToFonts[philosophy.tone];

  return {
    headlineFont: fonts?.headline || 'Proxima Nova',
    bodyFont: fonts?.body || 'DM Sans',
    primaryColors: primaryColors.length > 0 ? primaryColors : ['#E91E8C', '#00D9FF'],
    visualMetaphors: philosophy.contentPillars,
    iconStyle: philosophy.tone === 'playful' ? 'playful' : 'outline',
  };
};

// ── PHILOSOPHY-FIRST CONTENT BRIEF ────────────────────────────────────────

export const generatePhilosophyBrief = (userId: string): { brief: string; pillars: string[] } => {
  const philosophy = brandPhilosophies.get(userId);
  if (!philosophy) {
    return {
      brief: '',
      pillars: [],
    };
  }

  const brief = `
Brand: ${philosophy.mission}
Values: ${philosophy.values.join(', ')}
Personality: ${philosophy.personality.join(', ')}
Voice: ${philosophy.voiceKeywords.join(', ')}
Audience: ${philosophy.targetAudience}
Differentiation: ${philosophy.competitiveDifferentiator}
Tone: ${philosophy.tone}
Content Pillars: ${philosophy.contentPillars.join(', ')}
  `.trim();

  return {
    brief,
    pillars: philosophy.contentPillars,
  };
};

log.info('[Phase 25] Brand Philosophy Engine ✅');

export default {
  createBrandPhilosophy,
  getBrandPhilosophy,
  updateBrandPhilosophy,
  validateVisualAgainstPhilosophy,
  deriveVisualFromPhilosophy,
  generatePhilosophyBrief,
};
