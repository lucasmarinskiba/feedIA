/**
 * Phase 21-25: Multi-User Branding Engine (Enhanced)
 *
 * Per-account brand profiles + personalized pattern libraries
 * Philosophy-first: Define brand essence, derive visual identity
 * 20 premium fonts, typography validation, design patterns
 */

import { log } from '../../agent/logger.js';
import { validateTypography, fontPairingsByNiche, premiumFonts } from './typographySystem.js';
import { BrandPhilosophy } from './brandPhilosophyEngine.js';

export interface UserBrandProfile {
  userId: string;
  accountName: string;
  industry: string;
  audience: string;
  objective: string;
  philosophy?: BrandPhilosophy;
  primaryColors: string[];
  secondaryColors: string[];
  accentColors: string[];
  backgroundStyle: 'image-heavy' | 'gradient' | 'solid' | 'minimal';
  headlineFont: string;
  bodyFont: string;
  accentFont?: string;
  tone: string[];
  voiceKeywords: string[];
  learnedNarratives: string[];
  learnedLayouts: string[];
  learnedCopyPatterns: string[];
  topContentTypes: string[];
  typographyChecklist?: {
    readableOnMobile: boolean;
    matchesNicheEnergy: boolean;
    sufficientContrast: boolean;
    enoughReadingTime: boolean;
  };
  averageEngagement: number;
  averageRetention: number;
  createdAt: string;
  updatedAt: string;
}

const userBrands: Map<string, UserBrandProfile> = new Map();

export const createUserBrandProfile = (
  userId: string,
  data: Partial<UserBrandProfile>,
): UserBrandProfile => {
  log.info(`[Phase 21] Brand profile: ${userId}`);

  // Validate fonts against 20 premium fonts
  const validFonts = premiumFonts.map((f) => f.name);
  const headlineFont = data.headlineFont && validFonts.includes(data.headlineFont) ? data.headlineFont : 'Outfit';
  const bodyFont = data.bodyFont && validFonts.includes(data.bodyFont) ? data.bodyFont : 'DM Sans';

  const profile: UserBrandProfile = {
    userId,
    accountName: data.accountName || `Account ${userId.slice(0, 8)}`,
    industry: data.industry || 'general',
    audience: data.audience || 'general',
    objective: data.objective || 'growth',
    philosophy: data.philosophy,
    primaryColors: data.primaryColors || ['#E91E8C', '#00D9FF'],
    secondaryColors: data.secondaryColors || ['#FFFFFF', '#1A1A1A'],
    accentColors: data.accentColors || ['#FF6B6B'],
    backgroundStyle: data.backgroundStyle || 'image-heavy',
    headlineFont,
    bodyFont,
    accentFont: data.accentFont,
    tone: data.tone || ['professional', 'friendly'],
    voiceKeywords: data.voiceKeywords || ['authentic', 'bold'],
    learnedNarratives: [],
    learnedLayouts: [],
    learnedCopyPatterns: [],
    topContentTypes: ['carousel', 'reel'],
    typographyChecklist: data.typographyChecklist,
    averageEngagement: 0,
    averageRetention: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  userBrands.set(userId, profile);
  return profile;
};

export const getUserBrandProfile = (userId: string): UserBrandProfile | null => {
  return userBrands.get(userId) || null;
};

export const updateUserBrandLearnings = (
  userId: string,
  learnings: any,
): UserBrandProfile | null => {
  const profile = userBrands.get(userId);
  if (!profile) return null;
  if (learnings.narratives) profile.learnedNarratives = learnings.narratives;
  if (learnings.layouts) profile.learnedLayouts = learnings.layouts;
  if (learnings.copyPatterns) profile.learnedCopyPatterns = learnings.copyPatterns;
  if (learnings.topContentTypes) profile.topContentTypes = learnings.topContentTypes;
  if (learnings.averageEngagement !== undefined) profile.averageEngagement = learnings.averageEngagement;
  if (learnings.averageRetention !== undefined) profile.averageRetention = learnings.averageRetention;
  profile.updatedAt = new Date().toISOString();
  return profile;
};

export const getPersonalizedGeneratorSettings = (userId: string): any => {
  const profile = getUserBrandProfile(userId);
  if (!profile) return null;
  return {
    colors: { primary: profile.primaryColors[0], secondary: profile.secondaryColors[0] },
    fonts: { headline: profile.headlineFont, body: profile.bodyFont },
    tone: profile.tone,
    narratives: profile.learnedNarratives.length > 0 ? profile.learnedNarratives : ['listicle'],
    topContentTypes: profile.topContentTypes,
  };
};

export const getAvailableFonts = (): string[] => {
  return premiumFonts.map((f) => f.name);
};

export const getFontsByCategory = (category: 'headline' | 'body' | 'display' | 'accent' | 'monospace' | 'script'): string[] => {
  return premiumFonts.filter((f) => f.category === category).map((f) => f.name);
};

export const getFontPairings = (niche: string): any => {
  return fontPairingsByNiche[niche] || fontPairingsByNiche['tech'];
};

log.info('[Phase 21-25] Multi-User Branding Engine ✅ (20 premium fonts, philosophy-first)');
