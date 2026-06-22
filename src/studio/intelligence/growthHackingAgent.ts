import { executeWithRecovery } from '../computerUse/reliableSession.js';
import { log } from '../../agent/logger.js';
import type { NicheCategory } from './nicheAnalyzer.js';
import type { BrandProfile } from '../../config/types.js';
import type { AccountIntelligence } from './accountProfiler.js';

/**
 * Growth Hacking Agent
 * Niche-specific growth automation: viral loops, engagement farming, collab strategies
 * Executes Computer Use growth tactics autonomously
 */

export interface GrowthExperiment {
  id: string;
  name: string;
  tactic: string;
  platform: 'instagram' | 'tiktok';
  expectedLift: string;
  effort: 'low' | 'medium' | 'high';
  timeToResults: string;
  automatable: boolean;
  steps: string[];
}

export interface GrowthPlaybook {
  niche: NicheCategory;
  platform: 'instagram' | 'tiktok';
  followerStage: 'seed' | 'growing' | 'established' | 'authority';
  experiments: GrowthExperiment[];
  weeklyPriority: string[];
  viralLoops: ViralLoop[];
  collaborationTargets: string[];
}

export interface ViralLoop {
  name: string;
  trigger: string;
  amplification: string;
  exitAction: string;
  exampleContent: string;
}

export interface GrowthExecutionResult {
  tactic: string;
  platform: 'instagram' | 'tiktok';
  status: 'executed' | 'failed' | 'partial';
  actionsCompleted: string[];
  estimatedImpact: string;
}

// Pre-built growth experiment library
const GROWTH_EXPERIMENTS: Record<string, GrowthExperiment[]> = {
  'fitness-products': [
    {
      id: 'fp-ugc-campaign',
      name: 'UGC Seeding Campaign',
      tactic: 'Send products to 10 micro-influencers (5-50K) for honest reviews',
      platform: 'instagram',
      expectedLift: '+1K-5K followers, +30% reach',
      effort: 'medium',
      timeToResults: '2-4 weeks',
      automatable: false,
      steps: [
        'Identify 10 niche accounts',
        'DM each with free product offer',
        'Collect and repost UGC',
        'Run paid boost on best UGC',
      ],
    },
    {
      id: 'fp-before-after-series',
      name: '30-Day Transformation Series',
      tactic: 'Document customer transformation with weekly updates',
      platform: 'instagram',
      expectedLift: '+500-2K followers, +150% engagement',
      effort: 'low',
      timeToResults: '30 days',
      automatable: true,
      steps: [
        'Find customer willing to document',
        'Week 1 baseline reel',
        'Week 2-4 progress reels',
        'Final reveal reel',
        'Compile into carousel',
      ],
    },
    {
      id: 'fp-ingredient-series',
      name: 'Ingredient Deep Dive Series',
      tactic: 'One ingredient explained per video - saves-focused educational content',
      platform: 'tiktok',
      expectedLift: '+2K-10K followers from saves/shares',
      effort: 'low',
      timeToResults: '2-3 weeks',
      automatable: true,
      steps: [
        'List 10 key ingredients',
        'One 60s video per ingredient',
        'Post every 2 days',
        'Link to product in bio for each ingredient mentioned',
      ],
    },
  ],
  'fitness-coaching': [
    {
      id: 'fc-dm-funnel-automation',
      name: 'DM Keyword Trigger Funnel',
      tactic: 'Post reel with "Comment READY for my free guide" → auto-DM sequence',
      platform: 'instagram',
      expectedLift: '+100-500 qualified leads/month',
      effort: 'medium',
      timeToResults: '1 week to set up, immediate leads',
      automatable: true,
      steps: [
        'Create value reel with comment CTA',
        'Set up ManyChat or IG automation',
        'DM 1: deliver freebie',
        'DM 2 (day 2): check-in + soft sell',
        'DM 3 (day 4): discovery call CTA',
      ],
    },
    {
      id: 'fc-collab-live',
      name: 'Collab Live Series',
      tactic: 'Weekly Instagram Lives with complementary coaches',
      platform: 'instagram',
      expectedLift: '+20-50% audience crossover, +200-1K followers per live',
      effort: 'medium',
      timeToResults: '2-4 weeks',
      automatable: false,
      steps: [
        'Identify 4 complementary coaches (nutrition, mindset, sleep)',
        'Propose weekly collab live',
        'Cross-promote 24h before',
        'Do 45-min value live',
        'Post replay as IGTV',
      ],
    },
    {
      id: 'fc-free-challenge',
      name: '5-Day Free Challenge',
      tactic: 'Host free challenge → convert to paid program',
      platform: 'instagram',
      expectedLift: '+500-2K followers, 5-20% convert to paid',
      effort: 'high',
      timeToResults: '2 weeks run up + 5 days',
      automatable: false,
      steps: [
        'Create 5 daily challenge tasks',
        'Build landing page',
        'Drive traffic via reels for 2 weeks',
        'Run challenge live',
        'Pitch paid program on day 5',
      ],
    },
  ],
  'fitness-b2b': [
    {
      id: 'fb2b-case-study-series',
      name: 'Client Case Study Series',
      tactic: 'One case study per week: coach profile + results achieved',
      platform: 'instagram',
      expectedLift: '+authority positioning, +50-200 qualified leads/month',
      effort: 'medium',
      timeToResults: '4-8 weeks for authority tipping point',
      automatable: true,
      steps: [
        'Interview top 5 clients',
        'Extract metrics: before revenue/clients → after',
        'Create reel + carousel per case',
        'Cross-tag the client for cross-audience reach',
      ],
    },
    {
      id: 'fb2b-linkedin-crosspost',
      name: 'LinkedIn → Instagram Funnel',
      tactic: 'Post data-driven takes on LinkedIn, repurpose as carousels on Instagram',
      platform: 'instagram',
      expectedLift: '+professional credibility, +B2B audience segment',
      effort: 'low',
      timeToResults: '4-6 weeks',
      automatable: true,
      steps: [
        'Post LinkedIn article',
        'Summarize as 10-slide carousel',
        'Add "Swipe for the framework" hook',
        'Cross-link both platforms',
      ],
    },
  ],
  'personal-brand': [
    {
      id: 'pb-stitch-bait',
      name: 'Stitch/Duet Bait Content',
      tactic: 'Create controversial opinion posts designed to generate stitches',
      platform: 'tiktok',
      expectedLift: '+exponential reach from stitches',
      effort: 'low',
      timeToResults: '24-72 hours',
      automatable: true,
      steps: [
        'Identify hot opinion in niche',
        'Take strong stance',
        'End with "What do you think? Stitch this"',
        'Reply to stitches to fuel discussion',
      ],
    },
    {
      id: 'pb-trending-audio-rapid',
      name: 'Trending Audio Rapid Response',
      tactic: 'Within 24h of new trend, post niche-relevant content with trending audio',
      platform: 'tiktok',
      expectedLift: '+500-50K views from trend traffic',
      effort: 'low',
      timeToResults: '24-72 hours',
      automatable: true,
      steps: [
        'Monitor TikTok trending sounds daily',
        'Find niche angle for trending sound',
        'Film + post within 24h of trend peak',
        'Use trend hashtag',
      ],
    },
    {
      id: 'pb-collab-series',
      name: 'Creator Collab Series',
      tactic: 'Monthly collab with 1 creator in adjacent niche',
      platform: 'instagram',
      expectedLift: '+1K-10K followers per collab from crossover',
      effort: 'medium',
      timeToResults: '1-2 weeks per collab',
      automatable: false,
      steps: [
        'Identify adjacent niche creators (10K-100K)',
        'Propose mutual value collab',
        'Create 1 collaborative reel each',
        'Cross-post and tag',
        'Story + lives follow-up',
      ],
    },
  ],
  ecommerce: [
    {
      id: 'ec-flash-sale-content',
      name: 'Flash Sale Content Series',
      tactic: '48-hour flash sale with countdown content series across stories + reels',
      platform: 'instagram',
      expectedLift: '+3-8x normal revenue, +200-500 new followers',
      effort: 'medium',
      timeToResults: '48 hours',
      automatable: true,
      steps: [
        'Announce sale 48h before via reel',
        'Story countdown every 6h',
        'Email + SMS list alert',
        'Real-time order counter stories',
        'Post-sale "sold out" social proof',
      ],
    },
    {
      id: 'ec-product-demo-tiktok',
      name: 'TikTok Shop Product Demo Series',
      tactic: 'One 30s product demo per product, linked to TikTok Shop',
      platform: 'tiktok',
      expectedLift: '+direct sales from FYP, +15-30% conversion vs link-in-bio',
      effort: 'low',
      timeToResults: '1-2 weeks',
      automatable: true,
      steps: [
        'Set up TikTok Shop',
        'Film 30s demo per product',
        'Tag product in video',
        'Batch post daily for 2 weeks',
        'Boost top performers with $20/day TikTok Spark Ads',
      ],
    },
  ],
};

// Viral loop architectures per niche
const VIRAL_LOOPS: Record<string, ViralLoop[]> = {
  'fitness-coaching': [
    {
      name: 'Free Value → DM → Paid',
      trigger: 'Post free tip reel with "Comment [word] for the full guide"',
      amplification: 'Comments → algorithm boost → more reach → more comments',
      exitAction: 'DM delivers freebie → nurture sequence → discovery call',
      exampleContent: '"Comment PLAN and I\'ll DM you my 12-week training template (free)"',
    },
    {
      name: 'Transformation Proof Loop',
      trigger: 'Post client result with @tag',
      amplification: 'Client reposts → their audience → new followers → new clients',
      exitAction: 'New followers see result → DM inquiry → new client',
      exampleContent: '"6 months ago she almost quit. Today: 20kg down, confidence up. @clienthandle"',
    },
  ],
  'fitness-products': [
    {
      name: 'UGC Flywheel',
      trigger: 'Ask customers to post with branded hashtag for discount',
      amplification: 'Customer posts → friends see → new customers',
      exitAction: 'Repost UGC → social proof → conversions',
      exampleContent: '"Tag us + #[BrandName] for 15% off your next order. We\'ll repost our favorites."',
    },
  ],
  'personal-brand': [
    {
      name: 'Controversial Take Loop',
      trigger: 'Post strong opinion that invites stitches/replies',
      amplification: 'Stitches → algorithm loves → exponential distribution',
      exitAction: 'New audience → follows → nurture → eventual offer',
      exampleContent: '"Unpopular opinion: [controversial fitness/niche take]"',
    },
  ],
};

export class GrowthHackingAgent {
  getPlaybook(intel: AccountIntelligence, platform: 'instagram' | 'tiktok'): GrowthPlaybook {
    const { niche, strategy } = intel;
    const experiments = GROWTH_EXPERIMENTS[niche.nicheCategory] ?? GROWTH_EXPERIMENTS['personal-brand']!;
    const viralLoops = VIRAL_LOOPS[niche.nicheCategory] ?? VIRAL_LOOPS['personal-brand']!;

    const platformExperiments = experiments.filter((e) => e.platform === platform || e.platform === ('both' as string));

    const sorted = platformExperiments.sort((a, b) => {
      const effortScore = { low: 3, medium: 2, high: 1 };
      return effortScore[b.effort] - effortScore[a.effort];
    });

    return {
      niche: niche.nicheCategory,
      platform,
      followerStage: niche.growthStage,
      experiments: sorted,
      weeklyPriority: this.buildWeeklyPriority(sorted, niche.growthStage),
      viralLoops,
      collaborationTargets: niche.competitorAccounts.slice(0, 3),
    };
  }

  async executeGrowthTactic(
    tactic: GrowthExperiment,
    intel: AccountIntelligence,
    brand: BrandProfile,
  ): Promise<GrowthExecutionResult> {
    if (!tactic.automatable) {
      return {
        tactic: tactic.name,
        platform: tactic.platform,
        status: 'partial',
        actionsCompleted: ['Strategy plan generated — manual execution required'],
        estimatedImpact: tactic.expectedLift,
      };
    }

    log.info(`[GrowthHacking] Executing: ${tactic.name}`);
    const goal = this.buildExecutionGoal(tactic, intel);

    const result = await executeWithRecovery(brand, {
      goal,
      maxIterations: 15,
      operationName: `Growth tactic: ${tactic.name}`,
      maxRetries: 2,
    });

    return {
      tactic: tactic.name,
      platform: tactic.platform,
      status: result.ok ? 'executed' : 'partial',
      actionsCompleted: tactic.steps,
      estimatedImpact: tactic.expectedLift,
    };
  }

  private buildExecutionGoal(tactic: GrowthExperiment, intel: AccountIntelligence): string {
    return `Execute growth tactic for ${intel.platform} account @${intel.handle}:

TACTIC: ${tactic.name}
DESCRIPTION: ${tactic.tactic}
EXPECTED RESULT: ${tactic.expectedLift}

STEPS TO EXECUTE:
${tactic.steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}

ACCOUNT CONTEXT:
- Niche: ${intel.niche.nicheCategory}
- Growth stage: ${intel.niche.growthStage}
- Primary CTA: ${intel.strategy.cta}
- Tone: ${intel.strategy.contentTone}

Complete each step. Log what was accomplished per step.`;
  }

  private buildWeeklyPriority(experiments: GrowthExperiment[], stage: string): string[] {
    const lowEffortFirst = experiments
      .filter((e) => e.effort === 'low' && e.automatable)
      .slice(0, 2)
      .map((e) => e.name);

    const mediumEffort = experiments
      .filter((e) => e.effort === 'medium')
      .slice(0, 1)
      .map((e) => `Plan: ${e.name}`);

    const stageSpecific =
      stage === 'seed'
        ? ['Focus on consistent posting over everything else']
        : stage === 'authority'
          ? ['Launch premium offer', 'Scale paid acquisition']
          : ['Engage every comment within 1h of posting'];

    return [...lowEffortFirst, ...mediumEffort, ...stageSpecific];
  }

  scoreExperiment(experiment: GrowthExperiment, currentFollowers: number): number {
    const effortScore = { low: 30, medium: 20, high: 10 };
    const automatableBonus = experiment.automatable ? 20 : 0;
    const followerMatch = currentFollowers < 5000 ? (experiment.followerStage === 'seed' ? 30 : 10) : 20;

    return effortScore[experiment.effort] + automatableBonus + (followerMatch || 20);
  }
}

// Extend GrowthExperiment type with followerStage
declare module './growthHackingAgent.js' {
  interface GrowthExperiment {
    followerStage?: 'seed' | 'growing' | 'established' | 'authority';
  }
}

export const growthHackingAgent = new GrowthHackingAgent();
