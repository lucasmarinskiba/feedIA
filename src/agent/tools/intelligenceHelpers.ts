import type { AccountIntelligence } from '../../studio/intelligence/accountProfiler.js';
import type { NicheCategory, MonetizationModel, AudienceProfile } from '../../studio/intelligence/nicheAnalyzer.js';
import type { BuyingTrigger } from '../../studio/intelligence/audiencePsychologyAgent.js';

export const DEFAULT_AUDIENCE: AudienceProfile = {
  ageRange: '25-35',
  gender: 'all',
  interests: [],
  painPoints: [],
  goals: [],
  buyingIntent: 'medium',
  incomeLevel: 'medium',
};

export const growthStageFromFollowers = (followers: number): 'seed' | 'growing' | 'established' | 'authority' => {
  if (followers < 1000) return 'seed';
  if (followers < 10000) return 'growing';
  if (followers < 100000) return 'established';
  return 'authority';
};

export const buildMinimalIntelligence = (
  handle: string,
  platform: 'instagram' | 'tiktok',
  niche: NicheCategory,
  monetization: MonetizationModel,
  followerCount: number,
): AccountIntelligence => ({
  accountId: handle,
  handle,
  platform,
  niche: {
    accountHandle: handle,
    platform,
    nicheCategory: niche,
    subNiche: niche.replace('-', ' '),
    monetizationModel: monetization,
    targetAudience: DEFAULT_AUDIENCE,
    contentPillars: [],
    competitorAccounts: [],
    topHashtags: [],
    brandVoiceSignals: [],
    growthStage: growthStageFromFollowers(followerCount),
    growthTrajectory: 'growing',
    topContentFormat: 'reel',
    avgEngagementRate: '3.5%',
    usp: handle,
    positioning: 'transformation',
    confidence: 0.7,
    analyzedAt: new Date(),
  },
  strategy: {
    primaryObjective: 'mixed',
    contentMix: { educational: 40, promotional: 20, entertainment: 20, personal: 15, ugc: 5 },
    postingSchedule: {
      postsPerWeek: 5,
      bestDays: ['monday', 'wednesday', 'friday'],
      bestTimes: ['09:00', '18:00'],
      reelsRatio: 60,
    },
    hashtagStrategy: { large: 3, medium: 10, small: 17, branded: 0 },
    growthTactics: [],
    monetizationPriority: [monetization],
    contentTone: 'professional',
    cta: 'Learn more',
  },
  lastAnalyzed: new Date(),
  refreshIntervalDays: 7,
});

export const makeBuyingTrigger = (text: string): BuyingTrigger => ({
  trigger: text,
  intensity: 'high',
  contentType: 'reel',
  exampleHook: text,
});
