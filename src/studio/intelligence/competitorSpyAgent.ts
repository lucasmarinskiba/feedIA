import { executeWithRecovery } from '../computerUse/reliableSession.js';
import { log } from '../../agent/logger.js';
import type { NicheCategory } from './nicheAnalyzer.js';
import type { BrandProfile } from '../../config/types.js';

/**
 * Competitor Spy Agent
 * Deep reverse-engineering of competitor strategies
 * Discovers winning content patterns, gaps, positioning opportunities
 */

export interface CompetitorProfile {
  handle: string;
  platform: 'instagram' | 'tiktok';
  followers: string;
  avgEngagement: string;
  topContentTypes: string[];
  postingFrequency: string;
  primaryHooks: string[];
  cta: string;
  pricePoints: string[];
  audienceResonance: string[];
  weaknesses: string[];
  analyzedAt: Date;
}

export interface CompetitorIntelligence {
  niche: NicheCategory;
  competitors: CompetitorProfile[];
  contentGaps: string[];
  positioningOpportunities: string[];
  winningFormulas: string[];
  differentiationAngles: string[];
  bestPostingTimes: string[];
  avgNicheEngagement: string;
}

export interface GapAnalysis {
  untappedTopics: string[];
  underservedAudienceSegments: string[];
  missingContentFormats: string[];
  priceGaps: string[];
  positioningVoids: string[];
}

export class CompetitorSpyAgent {
  private cache: Map<string, CompetitorIntelligence> = new Map();
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  async analyzeCompetitors(
    handles: string[],
    niche: NicheCategory,
    platform: 'instagram' | 'tiktok',
    brand: BrandProfile,
  ): Promise<CompetitorIntelligence> {
    const cacheKey = `${niche}:${platform}:${handles.join(',')}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.competitors[0]!.analyzedAt.getTime() < this.CACHE_TTL_MS) {
      return cached;
    }

    log.info(`[CompetitorSpy] Analyzing ${handles.length} competitors in ${niche}`);
    const goal = this.buildSpyGoal(handles, niche, platform);

    const result = await executeWithRecovery(brand, {
      goal,
      maxIterations: 25,
      operationName: `Competitor analysis ${niche}`,
      maxRetries: 2,
    });

    const intelligence = this.parseCompetitorResult(handles, niche, platform, result.summary);
    this.cache.set(cacheKey, intelligence);

    return intelligence;
  }

  async findTopCompetitors(
    niche: NicheCategory,
    platform: 'instagram' | 'tiktok',
    brand: BrandProfile,
  ): Promise<string[]> {
    log.info(`[CompetitorSpy] Finding top competitors: ${niche}`);

    const goal = `Find top 5 ${niche} accounts on ${platform}:
- Search: ${this.getNicheSearchQuery(niche)}
- List handles of accounts with 10K-500K followers (sweet spot for analysis)
- Focus on accounts actively posting and growing
- Output: COMPETITORS: [handle1, handle2, handle3, handle4, handle5]`;

    const result = await executeWithRecovery(brand, {
      goal,
      maxIterations: 8,
      operationName: `Find competitors ${niche}`,
      maxRetries: 1,
    });

    const match = result.summary.match(/COMPETITORS:\s*\[([^\]]+)\]/i);
    return match
      ? match[1]!
          .split(',')
          .map((h) => h.trim())
          .filter(Boolean)
          .slice(0, 5)
      : [];
  }

  private buildSpyGoal(handles: string[], niche: string, platform: string): string {
    const baseUrl = platform === 'instagram' ? 'instagram.com' : 'tiktok.com/@';

    return `Deep competitive intelligence analysis for ${niche} niche on ${platform}:

ANALYZE EACH ACCOUNT: ${handles.join(', ')}

For EACH account:
STEP 1: PROFILE METRICS
- Go to ${baseUrl}[handle]
- Note: follower count, following, posts/videos count
- Engagement rate estimate (likes+comments / followers × 100)
- Verified? Business account?

STEP 2: TOP CONTENT REVERSE ENGINEERING
- Sort by: most liked / most viewed
- Analyze top 5 posts:
  * First 3 seconds / hook
  * Content type (talking head, B-roll, before/after, etc.)
  * Caption structure
  * CTA used
  * Hashtags count and strategy
  * Approximate posting time

STEP 3: CONTENT GAPS DETECTION
- What topics does this account NOT cover?
- What audience questions go unanswered in comments?
- What objections are raised but not addressed?

STEP 4: WEAKNESSES
- Where is engagement dropping?
- What content flops for them?
- What complaints appear in comments?

STEP 5: POSTING PATTERN
- Days of week most active
- Best performing days
- Post frequency per week

REPORT FORMAT:
COMPETITOR_[handle]_FOLLOWERS: [number]
COMPETITOR_[handle]_ENGAGEMENT: [%]
COMPETITOR_[handle]_TOP_FORMATS: [format1, format2, format3]
COMPETITOR_[handle]_HOOKS: [hook1 | hook2 | hook3]
COMPETITOR_[handle]_CTA: [primary CTA]
COMPETITOR_[handle]_WEAKNESSES: [weakness1, weakness2]
CONTENT_GAPS: [gap1, gap2, gap3, gap4, gap5]
POSITIONING_OPPORTUNITIES: [opportunity1, opportunity2, opportunity3]
WINNING_FORMULAS: [formula1 | formula2 | formula3]
BEST_POSTING_TIMES: [time1, time2, time3]
AVG_NICHE_ENGAGEMENT: [%]`;
  }

  private parseCompetitorResult(
    handles: string[],
    niche: NicheCategory,
    platform: 'instagram' | 'tiktok',
    summary: string,
  ): CompetitorIntelligence {
    const extract = (key: string): string => {
      const match = summary.match(new RegExp(`${key}:\\s*([^\\n]+)`, 'i'));
      return match?.[1]?.trim() ?? '';
    };

    const extractList = (key: string): string[] =>
      extract(key)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

    const competitors: CompetitorProfile[] = handles.map((handle) => {
      const prefix = `COMPETITOR_${handle.replace('@', '')}_`;
      const hooksRaw = extract(`${prefix}HOOKS`);

      return {
        handle,
        platform,
        followers: extract(`${prefix}FOLLOWERS`) || 'unknown',
        avgEngagement: extract(`${prefix}ENGAGEMENT`) || 'unknown',
        topContentTypes: extractList(`${prefix}TOP_FORMATS`),
        postingFrequency: '4-7x/week',
        primaryHooks: hooksRaw ? hooksRaw.split('|').map((h) => h.trim()) : [],
        cta: extract(`${prefix}CTA`) || 'unknown',
        pricePoints: [],
        audienceResonance: [],
        weaknesses: extractList(`${prefix}WEAKNESSES`),
        analyzedAt: new Date(),
      };
    });

    const winningFormulasRaw = extract('WINNING_FORMULAS');

    return {
      niche,
      competitors,
      contentGaps: extractList('CONTENT_GAPS'),
      positioningOpportunities: extractList('POSITIONING_OPPORTUNITIES'),
      winningFormulas: winningFormulasRaw
        ? winningFormulasRaw
            .split('|')
            .map((f) => f.trim())
            .filter(Boolean)
        : [],
      differentiationAngles: this.deriveDifferentiationAngles(extractList('CONTENT_GAPS')),
      bestPostingTimes: extractList('BEST_POSTING_TIMES'),
      avgNicheEngagement: extract('AVG_NICHE_ENGAGEMENT') || '3-5%',
    };
  }

  private deriveDifferentiationAngles(contentGaps: string[]): string[] {
    return contentGaps.slice(0, 3).map((gap) => `Own the "${gap}" angle nobody is covering`);
  }

  private getNicheSearchQuery(niche: NicheCategory): string {
    const queries: Partial<Record<NicheCategory, string>> = {
      'fitness-products': 'fitness supplements gym products',
      'fitness-coaching': 'fitness coach transformation results',
      'fitness-b2b': 'fitness business coaching for coaches',
      'personal-brand': 'personal brand growth creator',
      ecommerce: 'online store product drop',
      coaching: 'life business coach results',
      education: 'online course tutorial',
      entertainment: 'entertainment creator viral',
    };
    return queries[niche] ?? niche;
  }

  performGapAnalysis(intelligence: CompetitorIntelligence): GapAnalysis {
    return {
      untappedTopics: intelligence.contentGaps,
      underservedAudienceSegments: intelligence.positioningOpportunities.filter(
        (o) => o.toLowerCase().includes('audience') || o.toLowerCase().includes('segment'),
      ),
      missingContentFormats: this.detectMissingFormats(intelligence.competitors),
      priceGaps: [],
      positioningVoids: intelligence.differentiationAngles,
    };
  }

  private detectMissingFormats(competitors: CompetitorProfile[]): string[] {
    const allFormats = new Set(['reel', 'carousel', 'story', 'live', 'collab', 'ugc']);
    const usedFormats = new Set(competitors.flatMap((c) => c.topContentTypes.map((f) => f.toLowerCase())));
    return [...allFormats].filter((f) => !usedFormats.has(f));
  }
}

export const competitorSpyAgent = new CompetitorSpyAgent();
