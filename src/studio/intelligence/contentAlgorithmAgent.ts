import type { NicheCategory } from './nicheAnalyzer.js';
import type { AccountStrategy } from './accountProfiler.js';

/**
 * Content Algorithm Intelligence Agent
 * Models Instagram/TikTok ranking algorithms per niche
 * Optimizes content structure for maximum algorithmic reach
 */

export interface AlgorithmProfile {
  platform: 'instagram' | 'tiktok';
  niche: NicheCategory;
  rankingFactors: RankingFactor[];
  hookRequirements: HookSpec;
  engagementVelocityTarget: EngagementVelocity;
  retentionCurve: RetentionSpec;
  distributionLogic: DistributionSpec;
  shadowbanRisks: string[];
  boostSignals: string[];
}

export interface RankingFactor {
  factor: string;
  weight: number;
  optimization: string;
  targetValue: string;
}

export interface HookSpec {
  maxSeconds: number;
  requiredElements: string[];
  forbiddenPatterns: string[];
  exampleFormulas: string[];
}

export interface EngagementVelocity {
  first1hTarget: string;
  first24hTarget: string;
  saveRateTarget: string;
  shareRateTarget: string;
  commentDepthTarget: string;
}

export interface RetentionSpec {
  criticalDropoffPoints: string[];
  retentionHooks: string[];
  loopStrategies: string[];
  avgWatchTimeTarget: string;
}

export interface DistributionSpec {
  initialAudienceSize: string;
  amplificationTrigger: string;
  viralThreshold: string;
  nicheHashtagStrategy: string;
}

export interface ContentOptimizationPlan {
  platform: 'instagram' | 'tiktok';
  contentType: string;
  optimizations: Optimization[];
  score: number;
  predictedReach: string;
}

export interface Optimization {
  element: string;
  current?: string;
  recommended: string;
  impact: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
}

// Algorithm models per platform + niche
const INSTAGRAM_ALGORITHM: RankingFactor[] = [
  {
    factor: 'Watch time / completion rate',
    weight: 0.3,
    optimization: 'Hook in first 1s, loop video',
    targetValue: '>70% completion',
  },
  {
    factor: 'Saves',
    weight: 0.25,
    optimization: 'Provide save-worthy value: checklists, tips, frameworks',
    targetValue: '2-5% save rate',
  },
  {
    factor: 'Shares',
    weight: 0.2,
    optimization: 'Relatable emotion, controversial opinion, viral hook',
    targetValue: '1-3% share rate',
  },
  {
    factor: 'Comments',
    weight: 0.15,
    optimization: 'Ask direct questions, use controversy, create debate',
    targetValue: '0.5-2% comment rate',
  },
  {
    factor: 'Likes',
    weight: 0.05,
    optimization: 'Emotional resonance, agreeable statements',
    targetValue: '3-8% like rate',
  },
  {
    factor: 'Follows from post',
    weight: 0.05,
    optimization: 'Clear identity, promise of more value',
    targetValue: '0.3-1% follow rate',
  },
];

const TIKTOK_ALGORITHM: RankingFactor[] = [
  {
    factor: 'Video completion / re-watch rate',
    weight: 0.35,
    optimization: 'Loop videos, create curiosity gaps, pattern interrupts every 2s',
    targetValue: '>80% completion',
  },
  {
    factor: 'Shares',
    weight: 0.25,
    optimization: 'Relatable, funny, surprising, or extremely useful',
    targetValue: '2-5% share rate',
  },
  {
    factor: 'Comments',
    weight: 0.2,
    optimization: 'Ask divisive questions, "comment if you agree", challenges',
    targetValue: '1-3% comment rate',
  },
  { factor: 'Likes', weight: 0.1, optimization: 'Emotional peaks at intervals', targetValue: '5-15% like rate' },
  {
    factor: 'Follows from video',
    weight: 0.1,
    optimization: 'Tease next video content in current',
    targetValue: '0.5-2% follow rate',
  },
];

// Niche-specific algorithm adjustments
const NICHE_ALGORITHM_MODIFIERS: Partial<Record<NicheCategory, Partial<AlgorithmProfile>>> = {
  'fitness-products': {
    boostSignals: [
      'before/after thumbnail',
      'ingredient reveal hook',
      'transformation overlay text',
      'product close-up first 0.5s',
    ],
    shadowbanRisks: [
      'misleading health claims',
      'explicit before/after',
      'steroid-related terms',
      'extreme weight loss promises',
    ],
  },
  'fitness-coaching': {
    boostSignals: [
      'personal story hook',
      'relatable pain point opener',
      'DM CTA in caption',
      'client result as thumbnail',
    ],
    shadowbanRisks: ['spam DM tactics', 'purchase link in video', 'fake urgency', 'misleading income claims'],
  },
  'fitness-b2b': {
    boostSignals: [
      'data/statistics hook',
      'controversial industry take',
      'success metric as thumbnail',
      'step-by-step structure',
    ],
    shadowbanRisks: ['income guarantees', 'get-rich-quick language', 'external link in caption on TikTok'],
  },
  'personal-brand': {
    boostSignals: ['trending audio', 'duet/stitch bait', 'controversial opinion', 'pattern interrupt thumbnail'],
    shadowbanRisks: ['purchased engagement', 'follow/unfollow behavior', 'comment spam', 'irrelevant hashtags'],
  },
  ecommerce: {
    boostSignals: ['product demo hook', 'ugc style filming', 'price reveal moment', 'shopping tag usage'],
    shadowbanRisks: ['hard-sell spam', 'competitor brand mentions', 'copyright audio', 'price comparison claims'],
  },
};

export class ContentAlgorithmAgent {
  getAlgorithmProfile(platform: 'instagram' | 'tiktok', niche: NicheCategory): AlgorithmProfile {
    const factors = platform === 'instagram' ? INSTAGRAM_ALGORITHM : TIKTOK_ALGORITHM;
    const modifier = NICHE_ALGORITHM_MODIFIERS[niche] ?? {};

    return {
      platform,
      niche,
      rankingFactors: factors,
      hookRequirements: this.getHookSpec(platform, niche),
      engagementVelocityTarget: this.getVelocityTarget(platform, niche),
      retentionCurve: this.getRetentionSpec(platform),
      distributionLogic: this.getDistributionSpec(platform),
      shadowbanRisks: modifier.shadowbanRisks ?? this.getDefaultShadowbanRisks(platform),
      boostSignals: modifier.boostSignals ?? this.getDefaultBoostSignals(platform),
    };
  }

  optimizeContent(
    platform: 'instagram' | 'tiktok',
    niche: NicheCategory,
    contentData: {
      type: string;
      hookText?: string;
      captionPreview?: string;
      hashtags?: string[];
      hasCta?: boolean;
      estimatedDuration?: number;
    },
  ): ContentOptimizationPlan {
    const profile = this.getAlgorithmProfile(platform, niche);
    const optimizations: Optimization[] = [];

    // Hook optimization
    if (!contentData.hookText || contentData.hookText.length < 5) {
      optimizations.push({
        element: 'Hook',
        recommended: profile.hookRequirements.exampleFormulas[0] ?? 'Start with a pattern interrupt',
        impact: 'critical',
        reason: `Algorithm weights completion rate at ${(profile.rankingFactors[0]!.weight * 100).toFixed(0)}%`,
      });
    }

    // Duration check
    if (contentData.estimatedDuration) {
      const maxDuration = platform === 'tiktok' ? 60 : 30;
      if (contentData.estimatedDuration > maxDuration) {
        optimizations.push({
          element: 'Duration',
          current: `${contentData.estimatedDuration}s`,
          recommended: `${maxDuration}s max for top completion rate`,
          impact: 'high',
          reason: 'Shorter videos hit >80% completion threshold more easily',
        });
      }
    }

    // CTA check
    if (!contentData.hasCta) {
      optimizations.push({
        element: 'CTA',
        recommended: 'Add engagement CTA: "Comment X if you agree" or "Share this"',
        impact: 'high',
        reason: `Comments weight ${(profile.rankingFactors[3]!.weight * 100).toFixed(0)}% in algorithm`,
      });
    }

    // Hashtag check
    const hashtagCount = contentData.hashtags?.length ?? 0;
    const optimalCount = platform === 'instagram' ? 8 : 5;
    if (hashtagCount !== optimalCount) {
      optimizations.push({
        element: 'Hashtags',
        current: `${hashtagCount} hashtags`,
        recommended: `${optimalCount} hashtags (mix niche + trending)`,
        impact: 'medium',
        reason: 'Hashtag volume affects initial distribution pool',
      });
    }

    const criticalCount = optimizations.filter((o) => o.impact === 'critical').length;
    const highCount = optimizations.filter((o) => o.impact === 'high').length;
    const score = Math.max(0, 100 - criticalCount * 25 - highCount * 10 - optimizations.length * 3);

    return {
      platform,
      contentType: contentData.type,
      optimizations,
      score,
      predictedReach: this.predictReach(score, niche),
    };
  }

  getPostingWindowScore(platform: 'instagram' | 'tiktok', dayOfWeek: string, hour: number): number {
    const peakWindows: Record<string, number[]> = {
      instagram: [7, 8, 9, 12, 13, 17, 18, 19, 20, 21],
      tiktok: [6, 7, 9, 10, 11, 12, 19, 20, 21, 22, 23],
    };

    const peakDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    const windows = peakWindows[platform] ?? peakWindows.instagram!;
    const isInWindow = windows.includes(hour);
    const isPeakDay = peakDays.includes(dayOfWeek);

    return (isInWindow ? 60 : 30) + (isPeakDay ? 40 : 10);
  }

  private getHookSpec(platform: 'instagram' | 'tiktok', niche: NicheCategory): HookSpec {
    const baseSpec: HookSpec = {
      maxSeconds: platform === 'tiktok' ? 1.5 : 2,
      requiredElements: ['pattern interrupt', 'implied benefit', 'curiosity gap'],
      forbiddenPatterns: ['long intro', 'logo animation', 'please subscribe', 'in this video I will'],
      exampleFormulas: [
        "I [did X] for [time] and here's what happened",
        'Nobody talks about this [niche] mistake',
        "[Shocking stat]. Here's what it means for you.",
        'Stop doing [common behavior] if you want [result]',
        '[Number] [topic] that [authority claim] uses every day',
      ],
    };

    if (niche === 'fitness-products' || niche === 'fitness-coaching') {
      baseSpec.exampleFormulas.unshift(
        'I [lost/gained X] in [Y weeks] using this [method/product]',
        "Your [trainer/doctor/nutritionist] won't tell you this",
      );
    }

    return baseSpec;
  }

  private getVelocityTarget(platform: 'instagram' | 'tiktok', niche: NicheCategory): EngagementVelocity {
    const isHighIntent = ['fitness-coaching', 'fitness-b2b', 'coaching'].includes(niche);

    return {
      first1hTarget: platform === 'tiktok' ? '500+ views, 50+ likes' : '200+ likes, 10+ comments',
      first24hTarget: platform === 'tiktok' ? '5K+ views, 200+ likes' : '1000+ likes, 50+ comments',
      saveRateTarget: isHighIntent ? '3-8%' : '1-3%',
      shareRateTarget: '1-4%',
      commentDepthTarget: 'avg 2+ reply depth',
    };
  }

  private getRetentionSpec(platform: 'instagram' | 'tiktok'): RetentionSpec {
    return {
      criticalDropoffPoints: ['second 2-3 (first check)', 'second 8-10 (re-engage)', 'last 5s (loop point)'],
      retentionHooks: [
        'Pattern interrupt at 5s',
        'Curiosity re-trigger at 10s ("and here\'s the part nobody knows...")',
        'Loop bait in last 3s ("watch from the beginning if you missed...")',
        'Text overlay revelations mid-video',
      ],
      loopStrategies:
        platform === 'tiktok'
          ? ['end mid-sentence', 'point back to beginning', 'seamless visual loop', 'callback to hook']
          : ['carousel end → swipe back', 'video loop point', 'story swipe-up loop'],
      avgWatchTimeTarget: platform === 'tiktok' ? '>80%' : '>70% for reels',
    };
  }

  private getDistributionSpec(platform: 'instagram' | 'tiktok'): DistributionSpec {
    return platform === 'tiktok'
      ? {
          initialAudienceSize: '300-500 users (test pool)',
          amplificationTrigger: 'If completion >80% and shares >1% → 2nd distribution wave',
          viralThreshold: 'Views:followers ratio >3:1 triggers FYP push',
          nicheHashtagStrategy: '3-5 hashtags: 1 large (1M+), 2 medium (100K-1M), 2 niche (<100K)',
        }
      : {
          initialAudienceSize: '10-15% of followers (interest test)',
          amplificationTrigger: 'If saves/shares high → non-follower push via Explore',
          viralThreshold: 'Engagement rate >5% triggers Explore page push',
          nicheHashtagStrategy: '8-10 hashtags: 3 large, 4 medium, 3 niche',
        };
  }

  private predictReach(score: number, niche: NicheCategory): string {
    const base =
      score > 80
        ? 'High reach: 5-20x followers'
        : score > 60
          ? 'Normal reach: 1-3x followers'
          : 'Low reach: <1x followers';
    return `${base} for ${niche}`;
  }

  private getDefaultShadowbanRisks(platform: 'instagram' | 'tiktok'): string[] {
    return platform === 'tiktok'
      ? ['external links', 'competitors brand names', 'fake engagement', 'spam CTAs']
      : ['hashtag spamming', 'irrelevant hashtags', 'mass follow/unfollow', 'engagement pods'];
  }

  private getDefaultBoostSignals(platform: 'instagram' | 'tiktok'): string[] {
    return platform === 'tiktok'
      ? ['trending audio', 'stitch/duet bait', 'loop structure', 'caption curiosity hook']
      : ['save-worthy carousel', 'shareable hook', 'question CTA', 'collab post'];
  }

  generateAlgorithmBrief(strategy: AccountStrategy, platform: 'instagram' | 'tiktok', niche: NicheCategory): string {
    const profile = this.getAlgorithmProfile(platform, niche);
    const topFactor = profile.rankingFactors[0]!;
    const topBoost = profile.boostSignals[0] ?? 'trending content';

    return `ALGORITHM BRIEF for ${niche} on ${platform}:
Top ranking signal: ${topFactor.factor} (${(topFactor.weight * 100).toFixed(0)}% weight)
Optimization: ${topFactor.optimization}
Boost signal to use: ${topBoost}
Post frequency target: ${strategy.postingSchedule.postsPerWeek}x/week
Best times: ${strategy.postingSchedule.bestTimes.join(', ')}
Shadowban risks: ${profile.shadowbanRisks.slice(0, 2).join(', ')}`;
  }
}

export const contentAlgorithmAgent = new ContentAlgorithmAgent();
