import { executeWithRecovery } from '../computerUse/reliableSession.js';
import { log } from '../../agent/logger.js';
import type { NicheCategory } from './nicheAnalyzer.js';
import type { BrandProfile } from '../../config/types.js';

/**
 * Trend Intelligence Agent
 * Real-time viral trend monitoring per niche
 * Scrapes trending audio, hashtags, content formats, viral hooks
 */

export interface TrendReport {
  niche: NicheCategory;
  platform: 'instagram' | 'tiktok' | 'both';
  scrapedAt: Date;
  viralAudio: AudioTrend[];
  trendingHashtags: HashtagTrend[];
  contentFormats: FormatTrend[];
  viralHooks: string[];
  emergingTopics: string[];
  decayingTopics: string[];
  opportunityScore: number;
}

export interface AudioTrend {
  name: string;
  usageCount: string;
  growthRate: 'exploding' | 'rising' | 'stable' | 'declining';
  nicheRelevance: number;
}

export interface HashtagTrend {
  tag: string;
  posts: string;
  velocity: 'new' | 'rising' | 'peak' | 'declining';
  competitionLevel: 'low' | 'medium' | 'high';
}

export interface FormatTrend {
  format: string;
  engagementLift: number;
  adoptionStage: 'early' | 'mainstream' | 'saturated';
  recommendedFor: string[];
}

// Per-niche trend sources and search terms
const NICHE_TREND_SOURCES: Record<string, { hashtags: string[]; searchTerms: string[]; competitors: string[] }> = {
  'fitness-products': {
    hashtags: ['#suplementos', '#fitness', '#gym', '#protein', '#workout'],
    searchTerms: ['fitness supplements trending', 'gym accessories viral'],
    competitors: ['gymshark', 'myprotein', 'optimumnutrition'],
  },
  'fitness-coaching': {
    hashtags: ['#coachingrfitness', '#transformacion', '#entrenamiento', '#coaching'],
    searchTerms: ['fitness coach viral content', 'transformation results trending'],
    competitors: ['kayla_itsines', 'chloetwng', 'joefitness'],
  },
  'fitness-b2b': {
    hashtags: ['#coachingdenegocios', '#fitnessbusiness', '#personaltrainer'],
    searchTerms: ['fitness business growth', 'online coaching business viral'],
    competitors: ['fitbizowner', 'ptbizpros'],
  },
  'personal-brand': {
    hashtags: ['#personalbrand', '#creatoreconomy', '#contentcreator'],
    searchTerms: ['personal brand viral reels', 'content creator trending'],
    competitors: ['garyvee', 'alexhormozi'],
  },
  ecommerce: {
    hashtags: ['#ecommerce', '#onlineshop', '#dropshipping', '#shopify'],
    searchTerms: ['ecommerce product viral', 'tiktok shop trending'],
    competitors: ['brandnames', 'shopifyshops'],
  },
};

export class TrendIntelligenceAgent {
  private cache: Map<string, TrendReport> = new Map();
  private readonly CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

  async getTrends(
    niche: NicheCategory,
    platform: 'instagram' | 'tiktok' | 'both',
    brand: BrandProfile,
  ): Promise<TrendReport> {
    const cacheKey = `${niche}:${platform}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.scrapedAt.getTime() < this.CACHE_TTL_MS) {
      log.debug(`[TrendAgent] Cache hit: ${cacheKey}`);
      return cached;
    }

    log.info(`[TrendAgent] Scraping trends: ${niche} / ${platform}`);
    const report = await this.scrapeTrends(niche, platform, brand);
    this.cache.set(cacheKey, report);

    return report;
  }

  private async scrapeTrends(
    niche: NicheCategory,
    platform: 'instagram' | 'tiktok' | 'both',
    brand: BrandProfile,
  ): Promise<TrendReport> {
    const sources = NICHE_TREND_SOURCES[niche] ?? NICHE_TREND_SOURCES['personal-brand']!;
    const goal = this.buildTrendGoal(niche, platform, sources);

    const result = await executeWithRecovery(brand, {
      goal,
      maxIterations: 15,
      operationName: `Trend scraping ${niche}`,
      maxRetries: 2,
    });

    return this.parseTrendResult(niche, platform, result.summary);
  }

  private buildTrendGoal(
    niche: string,
    platform: string,
    sources: { hashtags: string[]; searchTerms: string[]; competitors: string[] },
  ): string {
    const platforms =
      platform === 'both' ? ['Instagram', 'TikTok'] : [platform === 'instagram' ? 'Instagram' : 'TikTok'];

    return `Real-time trend intelligence for ${niche} niche on ${platforms.join(' + ')}:

STEP 1: TRENDING AUDIO (TikTok)
${
  platform !== 'instagram'
    ? `- Go to TikTok.com/trending or search ${sources.hashtags[0]}
- Check "Trending sounds" section
- List top 5 trending audio: name, usage count, growth direction`
    : '- Skip (Instagram only)'
}

STEP 2: TRENDING HASHTAGS
- Search: ${sources.hashtags.join(', ')}
- For each hashtag note: post count, recent velocity (rising/stable/declining)
- Find 3 NEW emerging hashtags under 100K posts

STEP 3: VIRAL CONTENT FORMATS
- Check Reels/TikTok explore for ${niche} niche
- Identify: which formats dominate? (talking head, B-roll, before/after, UGC, tutorials)
- Note engagement rates visible on top posts

STEP 4: VIRAL HOOKS EXTRACTION
- Open 5 highest-performing recent posts in ${niche}
- Extract the opening line/hook of each
- List hooks verbatim

STEP 5: EMERGING vs DECLINING TOPICS
- What topics are getting more traction this week?
- What topics seem oversaturated / declining engagement?
- Any controversy or trending discussion in this niche?

STEP 6: COMPETITOR CONTENT AUDIT
- Check recent posts from: ${sources.competitors.join(', ')}
- What content is performing best for them right now?

REPORT FORMAT:
AUDIO_TRENDS: [name|count|direction, ...]
HASHTAG_TRENDS: [tag|posts|velocity|competition, ...]
FORMAT_TRENDS: [format|engagementLift%|stage, ...]
VIRAL_HOOKS: [hook1 | hook2 | hook3 | hook4 | hook5]
EMERGING_TOPICS: [topic1, topic2, topic3]
DECAYING_TOPICS: [topic1, topic2]
OPPORTUNITY_SCORE: [0-100]`;
  }

  private parseTrendResult(
    niche: NicheCategory,
    platform: 'instagram' | 'tiktok' | 'both',
    summary: string,
  ): TrendReport {
    const extract = (key: string): string => {
      const match = summary.match(new RegExp(`${key}:\\s*([^\\n]+)`, 'i'));
      return match?.[1]?.trim() ?? '';
    };

    const audioRaw = extract('AUDIO_TRENDS');
    const viralAudio: AudioTrend[] = audioRaw
      ? audioRaw
          .split(',')
          .slice(0, 5)
          .map((item) => {
            const parts = item.trim().split('|');
            return {
              name: parts[0]?.trim() ?? 'Unknown',
              usageCount: parts[1]?.trim() ?? '0',
              growthRate: (parts[2]?.trim() ?? 'stable') as AudioTrend['growthRate'],
              nicheRelevance: 0.7,
            };
          })
      : [];

    const hashtagRaw = extract('HASHTAG_TRENDS');
    const trendingHashtags: HashtagTrend[] = hashtagRaw
      ? hashtagRaw
          .split(',')
          .slice(0, 10)
          .map((item) => {
            const parts = item.trim().split('|');
            return {
              tag: parts[0]?.trim() ?? '#trend',
              posts: parts[1]?.trim() ?? '0',
              velocity: (parts[2]?.trim() ?? 'stable') as HashtagTrend['velocity'],
              competitionLevel: (parts[3]?.trim() ?? 'medium') as HashtagTrend['competitionLevel'],
            };
          })
      : [];

    const formatRaw = extract('FORMAT_TRENDS');
    const contentFormats: FormatTrend[] = formatRaw
      ? formatRaw
          .split(',')
          .slice(0, 5)
          .map((item) => {
            const parts = item.trim().split('|');
            const lift = parseInt(parts[1]?.replace('%', '') ?? '0', 10);
            return {
              format: parts[0]?.trim() ?? 'reel',
              engagementLift: isNaN(lift) ? 0 : lift,
              adoptionStage: (parts[2]?.trim() ?? 'mainstream') as FormatTrend['adoptionStage'],
              recommendedFor: [niche],
            };
          })
      : [];

    const hooksRaw = extract('VIRAL_HOOKS');
    const viralHooks = hooksRaw
      ? hooksRaw
          .split('|')
          .map((h) => h.trim())
          .filter(Boolean)
      : [];

    const emergingTopics = extract('EMERGING_TOPICS')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const decayingTopics = extract('DECAYING_TOPICS')
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const opportunityScore = parseInt(extract('OPPORTUNITY_SCORE') || '60', 10);

    return {
      niche,
      platform,
      scrapedAt: new Date(),
      viralAudio,
      trendingHashtags,
      contentFormats,
      viralHooks,
      emergingTopics,
      decayingTopics,
      opportunityScore: isNaN(opportunityScore) ? 60 : opportunityScore,
    };
  }

  /**
   * Get trend-aligned content recommendations
   */
  getTrendRecommendations(report: TrendReport): string[] {
    const recs: string[] = [];

    const earlyAudio = report.viralAudio.find((a) => a.growthRate === 'exploding' || a.growthRate === 'rising');
    if (earlyAudio) {
      recs.push(`Use trending audio "${earlyAudio.name}" (${earlyAudio.usageCount} uses, ${earlyAudio.growthRate})`);
    }

    const lowCompHashtags = report.trendingHashtags.filter(
      (h) => h.competitionLevel === 'low' && h.velocity === 'rising',
    );
    if (lowCompHashtags.length > 0) {
      recs.push(`Exploit low-competition rising hashtags: ${lowCompHashtags.map((h) => h.tag).join(', ')}`);
    }

    const earlyFormat = report.contentFormats.find((f) => f.adoptionStage === 'early');
    if (earlyFormat) {
      recs.push(
        `Adopt early-stage format "${earlyFormat.format}" before saturation (+${earlyFormat.engagementLift}% engagement lift)`,
      );
    }

    if (report.emergingTopics.length > 0) {
      recs.push(`Cover emerging topics first: ${report.emergingTopics[0]}`);
    }

    if (report.viralHooks.length > 0) {
      recs.push(`Adapt viral hook: "${report.viralHooks[0]}"`);
    }

    return recs;
  }

  clearCache(niche?: NicheCategory): void {
    if (niche) {
      this.cache.delete(`${niche}:instagram`);
      this.cache.delete(`${niche}:tiktok`);
      this.cache.delete(`${niche}:both`);
    } else {
      this.cache.clear();
    }
  }
}

export const trendIntelligenceAgent = new TrendIntelligenceAgent();
