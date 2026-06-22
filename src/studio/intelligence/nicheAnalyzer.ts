import { log } from '../../agent/logger.js';
import { executeWithRecovery } from '../computerUse/reliableSession.js';
import { nicheClassifier } from './nicheClassifier.js';
import type { BrandProfile } from '../../config/types.js';

/**
 * Niche Analyzer
 * Deep research per account: scrapes bio, posts, hashtags, audience signals
 * Classifies niche + sub-niche + monetization model + target audience
 */

export type NicheCategory =
  | 'fitness-products'
  | 'fitness-coaching'
  | 'fitness-b2b'
  | 'fitness-lifestyle'
  | 'ecommerce'
  | 'coaching'
  | 'b2b-services'
  | 'personal-brand'
  | 'entertainment'
  | 'education'
  | 'travel'
  | 'food'
  | 'tech'
  | 'finance'
  | 'beauty'
  | 'fashion'
  | 'real-estate'
  | 'unknown';

export type MonetizationModel =
  | 'physical-products'
  | 'digital-products'
  | 'services-b2c'
  | 'services-b2b'
  | 'affiliate'
  | 'sponsorships'
  | 'content-only'
  | 'mixed';

export interface NicheProfile {
  accountHandle: string;
  platform: 'instagram' | 'tiktok';
  nicheCategory: NicheCategory;
  subNiche: string;
  monetizationModel: MonetizationModel;
  targetAudience: AudienceProfile;
  contentPillars: string[];
  competitorAccounts: string[];
  topHashtags: string[];
  brandVoiceSignals: string[];
  growthStage: 'seed' | 'growing' | 'established' | 'authority';
  growthTrajectory: 'declining' | 'stable' | 'growing' | 'accelerating';
  topContentFormat: 'reel' | 'carousel' | 'story' | 'video' | 'mixed';
  avgEngagementRate: string;
  usp: string;
  positioning: 'price' | 'quality' | 'transformation' | 'authority' | 'relatability';
  estimatedMonthlyRevenue?: number;
  confidence: number;
  analyzedAt: Date;
}

export interface AudienceProfile {
  ageRange: string;
  gender: string;
  interests: string[];
  painPoints: string[];
  goals: string[];
  buyingIntent: 'high' | 'medium' | 'low';
  incomeLevel: 'low' | 'medium' | 'high' | 'premium';
}

export class NicheAnalyzer {
  /**
   * Deep niche analysis via Computer Use
   * Scrapes account profile, posts, bio, hashtags, engagement
   */
  async analyzeAccount(handle: string, platform: 'instagram' | 'tiktok', brand: BrandProfile): Promise<NicheProfile> {
    log.info(`[NicheAnalyzer] Analyzing @${handle} on ${platform}`);

    const goal = this.buildAnalysisGoal(handle, platform);

    const result = await executeWithRecovery(brand, {
      goal,
      maxIterations: 20,
      operationName: `Niche analysis @${handle}`,
      maxRetries: 2,
    });

    const scrapeProfile = this.parseAnalysisResult(handle, platform, result.summary);

    // Layer 2: run classifier as confidence booster / conflict resolver
    const classifierResult = nicheClassifier.classify({
      bioText: result.summary,
      hashtags: scrapeProfile.topHashtags,
      ctaText: scrapeProfile.contentPillars.join(' '),
      contentSamples: scrapeProfile.brandVoiceSignals,
    });

    // If classifier strongly disagrees with scrape, use classifier (more signal-driven)
    const finalNiche =
      classifierResult.confidence > 0.4 && classifierResult.primaryNiche !== 'unknown'
        ? classifierResult.primaryNiche
        : scrapeProfile.nicheCategory;

    const finalMonetization = classifierResult.monetizationHints[0]
      ? (classifierResult.monetizationHints[0] as typeof scrapeProfile.monetizationModel)
      : scrapeProfile.monetizationModel;

    const profile: NicheProfile = {
      ...scrapeProfile,
      nicheCategory: finalNiche,
      monetizationModel: finalMonetization,
      confidence: Math.max(scrapeProfile.confidence, classifierResult.confidence),
    };

    log.info(
      `[NicheAnalyzer] @${handle}: ${profile.nicheCategory} | ${profile.monetizationModel} (confidence: ${profile.confidence.toFixed(2)})`,
    );

    return profile;
  }

  private buildAnalysisGoal(handle: string, platform: 'instagram' | 'tiktok'): string {
    const baseUrl =
      platform === 'instagram'
        ? `https://www.instagram.com/${handle.replace('@', '')}/`
        : `https://www.tiktok.com/@${handle.replace('@', '')}`;

    return `Deep niche research for ${platform} account ${handle}:

STEP 1: PROFILE ANALYSIS
- Open ${baseUrl}
- Read full bio (every word matters)
- Check link in bio (website, linktree, product)
- Note: follower count, following, post count
- Identify: verified status, business account indicators

STEP 2: CONTENT ANALYSIS (last 12 posts)
- Scroll through posts/videos
- Identify recurring topics/themes
- Note: product mentions, service offers, price points
- Check captions for CTAs ("buy", "DM", "link in bio", "shop")
- Identify content pillars (what categories repeat)

STEP 3: HASHTAG EXTRACTION
- Open 3-5 recent posts
- List all hashtags used
- Identify niche-specific hashtags vs generic ones
- Note trending hashtags in their content

STEP 4: ENGAGEMENT SIGNALS
- Check comments on top posts
- Identify: questions asked, complaints, praise topics
- Note: who engages (brands, individuals, industry peers)
- Check if they sell in comments ("DM for price", etc.)

STEP 5: MONETIZATION DETECTION
- Check if they sell products (ecommerce links)
- Check if they sell services (coaching, consulting)
- Check if they have affiliate links
- Check if sponsored content exists
- Identify primary revenue model

STEP 6: AUDIENCE SIGNALS
- Age range clues from content style
- Gender audience signals from topics
- Income level clues from products/services priced
- Pain points evident in comments

STEP 7: COMPETITOR CONTEXT
- Identify 3 similar accounts
- Note their follower counts (benchmark)

STEP 8: CONTENT PERFORMANCE SIGNALS
- Which posts have most likes/views? What pattern?
- Are reels outperforming carousels or vice versa?
- Any viral posts? What topic triggered virality?
- Estimate avg engagement rate (likes+comments / followers)

STEP 9: GROWTH TRAJECTORY SIGNALS
- Is follower growth accelerating, stable, or declining?
- Any notable collaboration or viral moment recently?
- Signs of paid promotion (consistent exact post counts, boosted posts)?

STEP 10: BRAND + POSITIONING SIGNALS
- Is there a clear USP stated?
- What makes them different from competitors?
- Do they position on price, quality, transformation, authority, or relatability?
- Is there a personal story or origin narrative?

REPORT FORMAT (output this EXACTLY):
NICHE: [fitness-products|fitness-coaching|ecommerce|coaching|b2b-services|personal-brand|entertainment|education|other]
SUB_NICHE: [specific description max 10 words]
MONETIZATION: [physical-products|digital-products|services-b2c|services-b2b|affiliate|sponsorships|content-only|mixed]
AUDIENCE_AGE: [e.g. 25-40]
AUDIENCE_GENDER: [male|female|mixed]
AUDIENCE_INTERESTS: [comma separated, max 5]
PAIN_POINTS: [comma separated, max 3]
GOALS: [comma separated, max 3]
BUYING_INTENT: [high|medium|low]
CONTENT_PILLARS: [comma separated, max 5]
HASHTAGS: [comma separated, max 10]
BRAND_VOICE: [comma separated signals, max 3]
GROWTH_STAGE: [seed|growing|established|authority]
COMPETITORS: [comma separated handles, max 3]
INCOME_LEVEL: [low|medium|high|premium]
TOP_FORMAT: [reel|carousel|story|video|mixed]
AVG_ENGAGEMENT: [%]
GROWTH_TRAJECTORY: [declining|stable|growing|accelerating]
USP: [unique selling proposition max 15 words]
POSITIONING: [price|quality|transformation|authority|relatability]`;
  }

  private parseAnalysisResult(handle: string, platform: 'instagram' | 'tiktok', summary: string): NicheProfile {
    const extract = (key: string): string => {
      const match = summary.match(new RegExp(`${key}:\\s*([^\\n]+)`, 'i'));
      return match?.[1]?.trim() || '';
    };

    const extractList = (key: string): string[] => {
      const raw = extract(key);
      return raw
        ? raw
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
    };

    const nicheRaw = extract('NICHE').toLowerCase() as NicheCategory;
    const monetizationRaw = extract('MONETIZATION').toLowerCase() as MonetizationModel;
    const buyingIntent = (extract('BUYING_INTENT').toLowerCase() || 'medium') as 'high' | 'medium' | 'low';
    const incomeLevel = (extract('INCOME_LEVEL').toLowerCase() || 'medium') as 'low' | 'medium' | 'high' | 'premium';
    const growthStage = (extract('GROWTH_STAGE').toLowerCase() || 'growing') as NicheProfile['growthStage'];

    return {
      accountHandle: handle,
      platform,
      nicheCategory: nicheRaw || 'unknown',
      subNiche: extract('SUB_NICHE') || 'Unknown sub-niche',
      monetizationModel: monetizationRaw || 'mixed',
      targetAudience: {
        ageRange: extract('AUDIENCE_AGE') || '18-35',
        gender: extract('AUDIENCE_GENDER') || 'mixed',
        interests: extractList('AUDIENCE_INTERESTS'),
        painPoints: extractList('PAIN_POINTS'),
        goals: extractList('GOALS'),
        buyingIntent,
        incomeLevel,
      },
      contentPillars: extractList('CONTENT_PILLARS'),
      competitorAccounts: extractList('COMPETITORS'),
      topHashtags: extractList('HASHTAGS'),
      brandVoiceSignals: extractList('BRAND_VOICE'),
      growthStage,
      growthTrajectory: (extract('GROWTH_TRAJECTORY') || 'stable') as NicheProfile['growthTrajectory'],
      topContentFormat: (extract('TOP_FORMAT') || 'mixed') as NicheProfile['topContentFormat'],
      avgEngagementRate: extract('AVG_ENGAGEMENT') || '3-5%',
      usp: extract('USP') || 'Not determined',
      positioning: (extract('POSITIONING') || 'quality') as NicheProfile['positioning'],
      confidence: summary.includes('NICHE:') ? 0.85 : 0.4,
      analyzedAt: new Date(),
    };
  }
}

export const nicheAnalyzer = new NicheAnalyzer();
