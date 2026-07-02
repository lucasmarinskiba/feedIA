/**
 * Phase 21: Multi-User Branding Engine
 *
 * Per-account brand profiles + personalized pattern libraries
 * Every user gets own: colors, fonts, visual style, messaging tone
 * Adapts generators to each account's aesthetic + objectives
 */

import { log } from '../../agent/logger.js';

export interface UserBrandProfile {
  userId: string;
  accountName: string;
  industry: string;
  audience: string;
  objective: string;
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

  const profile: UserBrandProfile = {
    userId,
    accountName: data.accountName || `Account ${userId.slice(0, 8)}`,
    industry: data.industry || 'general',
    audience: data.audience || 'general',
    objective: data.objective || 'growth',
    primaryColors: data.primaryColors || ['#E91E8C', '#00D9FF'],
    secondaryColors: data.secondaryColors || ['#FFFFFF', '#1A1A1A'],
    accentColors: data.accentColors || ['#FF6B6B'],
    backgroundStyle: data.backgroundStyle || 'image-heavy',
    headlineFont: data.headlineFont || 'Poppins',
    bodyFont: data.bodyFont || 'Inter',
    accentFont: data.accentFont,
    tone: data.tone || ['professional', 'friendly'],
    voiceKeywords: data.voiceKeywords || ['authentic', 'bold'],
    learnedNarratives: [],
    learnedLayouts: [],
    learnedCopyPatterns: [],
    topContentTypes: ['carousel', 'reel'],
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

log.info('[Phase 21] Multi-User Branding Engine ✅');
