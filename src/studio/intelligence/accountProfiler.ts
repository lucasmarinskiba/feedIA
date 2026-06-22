import { log } from '../../agent/logger.js';
import { nicheAnalyzer } from './nicheAnalyzer.js';
import type { NicheProfile, NicheCategory, MonetizationModel } from './nicheAnalyzer.js';
import type { BrandProfile } from '../../config/types.js';

/**
 * Account Profiler
 * Stores + manages per-account niche intelligence
 * Routes system capabilities based on account profile
 */

export interface AccountIntelligence {
  accountId: string;
  handle: string;
  platform: 'instagram' | 'tiktok';
  niche: NicheProfile;
  strategy: AccountStrategy;
  lastAnalyzed: Date;
  refreshIntervalDays: number;
}

export interface AccountStrategy {
  primaryObjective: 'grow' | 'sell' | 'engage' | 'authority' | 'mixed';
  contentMix: ContentMixConfig;
  postingSchedule: PostingScheduleConfig;
  hashtagStrategy: HashtagStrategyConfig;
  growthTactics: string[];
  monetizationPriority: string[];
  contentTone: string;
  cta: string;
}

export interface ContentMixConfig {
  educational: number; // % of posts
  promotional: number;
  entertainment: number;
  personal: number;
  ugc: number; // user-generated content reposts
}

export interface PostingScheduleConfig {
  postsPerWeek: number;
  bestDays: string[];
  bestTimes: string[];
  reelsRatio: number; // % of content as reels/videos
}

export interface HashtagStrategyConfig {
  large: number; // >1M posts – count
  medium: number; // 100K-1M
  small: number; // <100K (niche)
  branded: number; // account-specific
}

export class AccountProfiler {
  private profiles: Map<string, AccountIntelligence> = new Map();

  /**
   * Analyze + profile an account
   */
  async profileAccount(
    handle: string,
    platform: 'instagram' | 'tiktok',
    brand: BrandProfile,
  ): Promise<AccountIntelligence> {
    const accountId = `${platform}:${handle.replace('@', '')}`;

    // Check if fresh profile exists
    const existing = this.profiles.get(accountId);
    if (existing && this.isProfileFresh(existing)) {
      log.debug(`[AccountProfiler] Using cached profile: ${handle}`);
      return existing;
    }

    // Deep niche analysis
    const niche = await nicheAnalyzer.analyzeAccount(handle, platform, brand);

    // Build adaptive strategy
    const strategy = this.buildStrategy(niche);

    const intelligence: AccountIntelligence = {
      accountId,
      handle,
      platform,
      niche,
      strategy,
      lastAnalyzed: new Date(),
      refreshIntervalDays: 7,
    };

    this.profiles.set(accountId, intelligence);
    log.info(`[AccountProfiler] Profiled ${handle}: ${niche.nicheCategory} → ${strategy.primaryObjective}`);

    return intelligence;
  }

  /**
   * Build adaptive strategy based on niche
   */
  buildStrategy(niche: NicheProfile): AccountStrategy {
    const strategyMap: Record<string, Partial<AccountStrategy>> = {
      'fitness-products': {
        primaryObjective: 'sell',
        contentMix: { educational: 30, promotional: 40, entertainment: 15, personal: 10, ugc: 5 },
        postingSchedule: {
          postsPerWeek: 7,
          bestDays: ['Mon', 'Wed', 'Fri', 'Sun'],
          bestTimes: ['06:00', '12:00', '19:00'],
          reelsRatio: 60,
        },
        hashtagStrategy: { large: 3, medium: 7, small: 5, branded: 2 },
        growthTactics: ['product demos', 'before/after', 'customer reviews', 'bundle deals', 'flash sales'],
        monetizationPriority: ['direct sales', 'abandoned cart retargeting', 'upsells'],
        contentTone: 'energetic, results-focused',
        cta: 'Shop now – link in bio',
      },
      'fitness-coaching': {
        primaryObjective: 'sell',
        contentMix: { educational: 45, promotional: 25, entertainment: 15, personal: 15, ugc: 0 },
        postingSchedule: {
          postsPerWeek: 5,
          bestDays: ['Mon', 'Tue', 'Thu', 'Sat'],
          bestTimes: ['07:00', '12:00', '20:00'],
          reelsRatio: 70,
        },
        hashtagStrategy: { large: 2, medium: 6, small: 7, branded: 2 },
        growthTactics: ['transformation stories', 'free value tips', 'DM funnels', 'webinar invites'],
        monetizationPriority: ['DM sales', 'discovery calls', 'program launches'],
        contentTone: 'motivational, empathetic, expert',
        cta: 'DM me "READY" to start',
      },
      'fitness-b2b': {
        primaryObjective: 'authority',
        contentMix: { educational: 60, promotional: 20, entertainment: 5, personal: 15, ugc: 0 },
        postingSchedule: {
          postsPerWeek: 4,
          bestDays: ['Tue', 'Wed', 'Thu'],
          bestTimes: ['09:00', '13:00', '18:00'],
          reelsRatio: 50,
        },
        hashtagStrategy: { large: 1, medium: 5, small: 8, branded: 3 },
        growthTactics: ['case studies', 'industry insights', 'free tools', 'LinkedIn cross-post'],
        monetizationPriority: ['lead magnets', 'consultation calls', 'group programs'],
        contentTone: 'professional, data-driven, authoritative',
        cta: 'Download free guide – link in bio',
      },
      'personal-brand': {
        primaryObjective: 'grow',
        contentMix: { educational: 25, promotional: 15, entertainment: 30, personal: 30, ugc: 0 },
        postingSchedule: {
          postsPerWeek: 6,
          bestDays: ['Mon', 'Wed', 'Fri', 'Sat', 'Sun'],
          bestTimes: ['08:00', '12:00', '20:00', '22:00'],
          reelsRatio: 80,
        },
        hashtagStrategy: { large: 4, medium: 8, small: 5, branded: 1 },
        growthTactics: ['trending audio', 'collab posts', 'comment engagement', 'story polls', 'trending topics'],
        monetizationPriority: ['sponsorships', 'brand deals', 'merchandise'],
        contentTone: 'authentic, relatable, entertaining',
        cta: 'Follow for more',
      },
      ecommerce: {
        primaryObjective: 'sell',
        contentMix: { educational: 20, promotional: 50, entertainment: 15, personal: 5, ugc: 10 },
        postingSchedule: {
          postsPerWeek: 7,
          bestDays: ['Mon', 'Tue', 'Thu', 'Fri', 'Sat'],
          bestTimes: ['10:00', '14:00', '20:00'],
          reelsRatio: 55,
        },
        hashtagStrategy: { large: 3, medium: 7, small: 5, branded: 2 },
        growthTactics: ['product demos', 'unboxing', 'UGC reposts', 'flash sales', 'bundles'],
        monetizationPriority: ['product catalog', 'shopping tags', 'retargeting ads'],
        contentTone: 'aspirational, product-focused',
        cta: 'Shop now – link in bio',
      },
    };

    const base = strategyMap[niche.nicheCategory] || strategyMap['personal-brand']!;

    // Fill in defaults for any missing fields
    return {
      primaryObjective: base.primaryObjective || 'mixed',
      contentMix: base.contentMix || { educational: 30, promotional: 25, entertainment: 25, personal: 15, ugc: 5 },
      postingSchedule: base.postingSchedule || {
        postsPerWeek: 5,
        bestDays: ['Mon', 'Wed', 'Fri'],
        bestTimes: ['09:00', '19:00'],
        reelsRatio: 60,
      },
      hashtagStrategy: base.hashtagStrategy || { large: 3, medium: 7, small: 5, branded: 2 },
      growthTactics: base.growthTactics || ['consistent posting', 'engagement reply', 'trending audio'],
      monetizationPriority: base.monetizationPriority || ['organic growth'],
      contentTone: base.contentTone || 'engaging, authentic',
      cta: base.cta || 'Follow for more',
    };
  }

  getProfile(accountId: string): AccountIntelligence | undefined {
    return this.profiles.get(accountId);
  }

  getAllProfiles(): AccountIntelligence[] {
    return Array.from(this.profiles.values());
  }

  getProfilesByNiche(niche: NicheCategory): AccountIntelligence[] {
    return Array.from(this.profiles.values()).filter((p) => p.niche.nicheCategory === niche);
  }

  getProfilesByMonetization(model: MonetizationModel): AccountIntelligence[] {
    return Array.from(this.profiles.values()).filter((p) => p.niche.monetizationModel === model);
  }

  private isProfileFresh(profile: AccountIntelligence): boolean {
    const ageMs = Date.now() - profile.lastAnalyzed.getTime();
    const maxAgeMs = profile.refreshIntervalDays * 24 * 60 * 60 * 1000;
    return ageMs < maxAgeMs;
  }

  /**
   * Force refresh profile (re-analyze)
   */
  async refreshProfile(accountId: string, brand: BrandProfile): Promise<AccountIntelligence | null> {
    const existing = this.profiles.get(accountId);
    if (!existing) return null;

    this.profiles.delete(accountId);
    return this.profileAccount(existing.handle, existing.platform, brand);
  }
}

export const accountProfiler = new AccountProfiler();
