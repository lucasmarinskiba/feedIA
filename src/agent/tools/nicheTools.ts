import type { Tool } from '@anthropic-ai/sdk/resources/messages.js';
import { nicheAnalyzer } from '../../studio/intelligence/nicheAnalyzer.js';
import { accountProfiler } from '../../studio/intelligence/accountProfiler.js';
import { multiAccountOrchestrator } from '../../studio/intelligence/multiAccountOrchestrator.js';
import { trendIntelligenceAgent } from '../../studio/intelligence/trendIntelligenceAgent.js';
import { competitorSpyAgent } from '../../studio/intelligence/competitorSpyAgent.js';
import { audiencePsychologyAgent } from '../../studio/intelligence/audiencePsychologyAgent.js';
import { contentAlgorithmAgent } from '../../studio/intelligence/contentAlgorithmAgent.js';
import { growthHackingAgent } from '../../studio/intelligence/growthHackingAgent.js';
import { revenueOptimizationAgent } from '../../studio/intelligence/revenueOptimizationAgent.js';
import { nicheClassifier } from '../../studio/intelligence/nicheClassifier.js';
import type { NicheCategory } from '../../studio/intelligence/nicheAnalyzer.js';
import type { BrandProfile } from '../../config/types.js';

interface ToolSpec extends Tool {
  description: string;
}

const tools: Record<string, ToolSpec> = {};

tools.niche_analyze_account = {
  name: 'niche_analyze_account',
  description:
    'Deep niche research for an Instagram/TikTok account. Discovers niche, audience, monetization model, content pillars, competitors.',
  input_schema: {
    type: 'object' as const,
    properties: {
      handle: { type: 'string', description: 'Account handle e.g. @username' },
      platform: { type: 'string', enum: ['instagram', 'tiktok'] },
    },
    required: ['handle', 'platform'],
  },
};

tools.niche_profile_account = {
  name: 'niche_profile_account',
  description: 'Full account profiling: niche analysis + adaptive strategy generation. Caches result for 7 days.',
  input_schema: {
    type: 'object' as const,
    properties: {
      handle: { type: 'string' },
      platform: { type: 'string', enum: ['instagram', 'tiktok'] },
    },
    required: ['handle', 'platform'],
  },
};

tools.niche_multi_account_plan = {
  name: 'niche_multi_account_plan',
  description:
    'Build comprehensive weekly content + growth plan for ALL user accounts simultaneously. Each account gets niche-tailored strategy.',
  input_schema: {
    type: 'object' as const,
    properties: {
      accounts: {
        type: 'array',
        description: 'List of accounts to plan for',
        items: {
          type: 'object',
          properties: {
            handle: { type: 'string' },
            platform: { type: 'string', enum: ['instagram', 'tiktok'] },
          },
          required: ['handle', 'platform'],
        },
      },
      user_id: { type: 'string', description: 'User identifier' },
    },
    required: ['accounts'],
  },
};

tools.niche_get_strategy = {
  name: 'niche_get_strategy',
  description: 'Get niche-specific content strategy for an already-profiled account.',
  input_schema: {
    type: 'object' as const,
    properties: {
      account_id: { type: 'string', description: 'Format: instagram:handle or tiktok:handle' },
    },
    required: ['account_id'],
  },
};

tools.niche_refresh_profile = {
  name: 'niche_refresh_profile',
  description: 'Force re-analyze an account (refresh niche profile).',
  input_schema: {
    type: 'object' as const,
    properties: {
      account_id: { type: 'string' },
    },
    required: ['account_id'],
  },
};

tools.niche_trend_intelligence = {
  name: 'niche_trend_intelligence',
  description:
    'Real-time viral trend monitoring: trending audio, hashtags, formats, viral hooks, emerging/decaying topics for a specific niche.',
  input_schema: {
    type: 'object' as const,
    properties: {
      niche: { type: 'string', description: 'Niche category' },
      platform: { type: 'string', enum: ['instagram', 'tiktok', 'both'] },
    },
    required: ['niche', 'platform'],
  },
};

tools.niche_competitor_spy = {
  name: 'niche_competitor_spy',
  description:
    'Deep reverse-engineering of competitor accounts: content strategy, hooks, CTAs, weaknesses, content gaps, positioning opportunities.',
  input_schema: {
    type: 'object' as const,
    properties: {
      handles: { type: 'array', items: { type: 'string' }, description: 'Competitor handles to analyze' },
      niche: { type: 'string' },
      platform: { type: 'string', enum: ['instagram', 'tiktok'] },
    },
    required: ['handles', 'niche', 'platform'],
  },
};

tools.niche_audience_psychology = {
  name: 'niche_audience_psychology',
  description:
    'Deep psychological profiling: buying triggers, objections, emotional drivers, copy formulas, offer framing for a niche audience.',
  input_schema: {
    type: 'object' as const,
    properties: {
      account_id: { type: 'string', description: 'Profiled account ID (platform:handle)' },
    },
    required: ['account_id'],
  },
};

tools.niche_algorithm_optimize = {
  name: 'niche_algorithm_optimize',
  description:
    'Optimize content for Instagram/TikTok algorithm ranking. Returns optimization score, specific fixes, predicted reach.',
  input_schema: {
    type: 'object' as const,
    properties: {
      platform: { type: 'string', enum: ['instagram', 'tiktok'] },
      niche: { type: 'string' },
      content_type: { type: 'string', description: 'e.g. reel, carousel, story' },
      hook_text: { type: 'string', description: 'First line/hook of content' },
      has_cta: { type: 'boolean' },
      duration_seconds: { type: 'number' },
      hashtag_count: { type: 'number' },
    },
    required: ['platform', 'niche', 'content_type'],
  },
};

tools.niche_growth_playbook = {
  name: 'niche_growth_playbook',
  description:
    'Get niche-specific growth playbook: experiments, viral loops, collab targets, weekly priorities sorted by effort/impact.',
  input_schema: {
    type: 'object' as const,
    properties: {
      account_id: { type: 'string' },
      platform: { type: 'string', enum: ['instagram', 'tiktok'] },
    },
    required: ['account_id', 'platform'],
  },
};

tools.niche_revenue_optimize = {
  name: 'niche_revenue_optimize',
  description:
    'Full revenue profile: current vs optimized revenue estimate, offer stack gaps, funnel bottlenecks, monthly projections, prioritized recommendations.',
  input_schema: {
    type: 'object' as const,
    properties: {
      account_id: { type: 'string' },
    },
    required: ['account_id'],
  },
};

tools.niche_classify_account = {
  name: 'niche_classify_account',
  description:
    'Fast ML-style niche classification from raw signals (bio, hashtags, CTAs) without full Computer Use scrape.',
  input_schema: {
    type: 'object' as const,
    properties: {
      bio_text: { type: 'string' },
      hashtags: { type: 'array', items: { type: 'string' } },
      cta_text: { type: 'string' },
      content_samples: { type: 'array', items: { type: 'string' } },
    },
    required: ['bio_text'],
  },
};

tools.niche_find_competitors = {
  name: 'niche_find_competitors',
  description: 'Discover top competing accounts in a niche via Computer Use search.',
  input_schema: {
    type: 'object' as const,
    properties: {
      niche: { type: 'string' },
      platform: { type: 'string', enum: ['instagram', 'tiktok'] },
    },
    required: ['niche', 'platform'],
  },
};

export const nicheTools = tools;

export const executeNicheTool = async (
  toolName: string,
  input: Record<string, unknown>,
  brand?: BrandProfile,
): Promise<string> => {
  if (!brand) {
    return JSON.stringify({ ok: false, error: 'Brand profile required' });
  }

  try {
    switch (toolName) {
      case 'niche_analyze_account': {
        const handle = (input.handle as string) || '';
        const platform = (input.platform as 'instagram' | 'tiktok') || 'instagram';

        const profile = await nicheAnalyzer.analyzeAccount(handle, platform, brand);

        return JSON.stringify({
          ok: true,
          handle,
          platform,
          niche: profile.nicheCategory,
          sub_niche: profile.subNiche,
          monetization: profile.monetizationModel,
          audience: {
            age: profile.targetAudience.ageRange,
            gender: profile.targetAudience.gender,
            interests: profile.targetAudience.interests,
            pain_points: profile.targetAudience.painPoints,
            buying_intent: profile.targetAudience.buyingIntent,
          },
          content_pillars: profile.contentPillars,
          top_hashtags: profile.topHashtags,
          competitors: profile.competitorAccounts,
          growth_stage: profile.growthStage,
          confidence: profile.confidence,
        });
      }

      case 'niche_profile_account': {
        const handle = (input.handle as string) || '';
        const platform = (input.platform as 'instagram' | 'tiktok') || 'instagram';

        const intelligence = await accountProfiler.profileAccount(handle, platform, brand);

        return JSON.stringify({
          ok: true,
          account_id: intelligence.accountId,
          niche: intelligence.niche.nicheCategory,
          sub_niche: intelligence.niche.subNiche,
          strategy: {
            objective: intelligence.strategy.primaryObjective,
            tone: intelligence.strategy.contentTone,
            cta: intelligence.strategy.cta,
            posts_per_week: intelligence.strategy.postingSchedule.postsPerWeek,
            best_times: intelligence.strategy.postingSchedule.bestTimes,
            content_mix: intelligence.strategy.contentMix,
            growth_tactics: intelligence.strategy.growthTactics,
          },
        });
      }

      case 'niche_multi_account_plan': {
        const rawAccounts = (input.accounts as Array<{ handle: string; platform: string }>) || [];
        const userId = (input.user_id as string) || 'default-user';

        const accounts = rawAccounts.map((a) => ({
          handle: a.handle,
          platform: a.platform as 'instagram' | 'tiktok',
        }));

        const plan = await multiAccountOrchestrator.buildUserPlan(userId, accounts, brand);

        return JSON.stringify({
          ok: true,
          user_id: plan.userId,
          accounts_planned: plan.accounts.length,
          cross_synergies: plan.crossAccountSynergies,
          plans: plan.accounts.map((a) => ({
            handle: a.handle,
            platform: a.platform,
            weekly_posts: a.weeklyContentPlan.length,
            ad_recommended: a.adStrategy.recommended,
            top_growth_actions: a.growthActions.slice(0, 3).map((g) => g.action),
            kpis: a.kpis,
            content_preview: a.weeklyContentPlan.slice(0, 3).map((c) => ({
              day: c.day,
              format: c.format,
              topic: c.topic,
              hook: c.hook,
            })),
          })),
        });
      }

      case 'niche_get_strategy': {
        const accountId = (input.account_id as string) || '';
        const profile = accountProfiler.getProfile(accountId);

        if (!profile) {
          return JSON.stringify({
            ok: false,
            error: `Account not profiled yet: ${accountId}. Run niche_profile_account first.`,
          });
        }

        const context = multiAccountOrchestrator.getNicheContext(accountId);

        return JSON.stringify({
          ok: true,
          account_id: accountId,
          strategy: profile.strategy,
          niche_context: context,
          last_analyzed: profile.lastAnalyzed.toISOString(),
        });
      }

      case 'niche_refresh_profile': {
        const accountId = (input.account_id as string) || '';
        const updated = await accountProfiler.refreshProfile(accountId, brand);

        if (!updated) {
          return JSON.stringify({ ok: false, error: `Profile not found: ${accountId}` });
        }

        return JSON.stringify({
          ok: true,
          account_id: accountId,
          refreshed: true,
          new_niche: updated.niche.nicheCategory,
        });
      }

      case 'niche_trend_intelligence': {
        const niche = (input.niche as NicheCategory) || 'personal-brand';
        const platform = (input.platform as 'instagram' | 'tiktok' | 'both') || 'instagram';

        const report = await trendIntelligenceAgent.getTrends(niche, platform, brand);
        const recs = trendIntelligenceAgent.getTrendRecommendations(report);

        return JSON.stringify({
          ok: true,
          niche,
          platform,
          opportunity_score: report.opportunityScore,
          viral_audio: report.viralAudio.slice(0, 3),
          trending_hashtags: report.trendingHashtags.slice(0, 5),
          top_formats: report.contentFormats.slice(0, 3),
          viral_hooks: report.viralHooks.slice(0, 5),
          emerging_topics: report.emergingTopics,
          decaying_topics: report.decayingTopics,
          recommendations: recs,
        });
      }

      case 'niche_competitor_spy': {
        const handles = (input.handles as string[]) || [];
        const niche = (input.niche as NicheCategory) || 'personal-brand';
        const platform = (input.platform as 'instagram' | 'tiktok') || 'instagram';

        const intel = await competitorSpyAgent.analyzeCompetitors(handles, niche, platform, brand);
        const gaps = competitorSpyAgent.performGapAnalysis(intel);

        return JSON.stringify({
          ok: true,
          competitors_analyzed: intel.competitors.length,
          content_gaps: intel.contentGaps,
          positioning_opportunities: intel.positioningOpportunities,
          winning_formulas: intel.winningFormulas,
          differentiation_angles: intel.differentiationAngles,
          avg_niche_engagement: intel.avgNicheEngagement,
          gap_analysis: gaps,
          best_posting_times: intel.bestPostingTimes,
        });
      }

      case 'niche_audience_psychology': {
        const accountId = (input.account_id as string) || '';
        const profile = accountProfiler.getProfile(accountId);

        if (!profile) {
          return JSON.stringify({
            ok: false,
            error: `Profile not found: ${accountId}. Run niche_profile_account first.`,
          });
        }

        const psychProfile = audiencePsychologyAgent.buildPsychProfile(
          profile.niche.nicheCategory,
          profile.niche.targetAudience,
        );

        return JSON.stringify({
          ok: true,
          account_id: accountId,
          core_desire: psychProfile.psychographics.coreDesire,
          deepest_fear: psychProfile.psychographics.deepestFear,
          decision_style: psychProfile.psychographics.decisionStyle,
          top_buying_triggers: psychProfile.buyingTriggers.slice(0, 3),
          top_objections: psychProfile.objections.slice(0, 3),
          emotional_drivers: psychProfile.emotionalDrivers,
          top_copy_formula: psychProfile.copyFormulas[0],
          offer_framing: psychProfile.offerFraming,
          content_resonance: psychProfile.contentResonanceMap.slice(0, 3),
        });
      }

      case 'niche_algorithm_optimize': {
        const platform = (input.platform as 'instagram' | 'tiktok') || 'instagram';
        const niche = (input.niche as NicheCategory) || 'personal-brand';

        const plan = contentAlgorithmAgent.optimizeContent(platform, niche, {
          type: (input.content_type as string) || 'reel',
          hookText: input.hook_text as string | undefined,
          hasCta: input.has_cta as boolean | undefined,
          estimatedDuration: input.duration_seconds as number | undefined,
          hashtags: input.hashtag_count ? Array(input.hashtag_count as number).fill('#tag') : undefined,
        });

        const algorithmBrief = contentAlgorithmAgent.getAlgorithmProfile(platform, niche);

        return JSON.stringify({
          ok: true,
          score: plan.score,
          predicted_reach: plan.predictedReach,
          optimizations: plan.optimizations,
          top_ranking_factor: algorithmBrief.rankingFactors[0],
          hook_requirements: algorithmBrief.hookRequirements,
          boost_signals: algorithmBrief.boostSignals.slice(0, 3),
          shadowban_risks: algorithmBrief.shadowbanRisks.slice(0, 3),
          retention_hooks: algorithmBrief.retentionCurve.retentionHooks,
          velocity_targets: algorithmBrief.engagementVelocityTarget,
        });
      }

      case 'niche_growth_playbook': {
        const accountId = (input.account_id as string) || '';
        const platform = (input.platform as 'instagram' | 'tiktok') || 'instagram';
        const profile = accountProfiler.getProfile(accountId);

        if (!profile) {
          return JSON.stringify({
            ok: false,
            error: `Profile not found: ${accountId}. Run niche_profile_account first.`,
          });
        }

        const playbook = growthHackingAgent.getPlaybook(profile, platform);

        return JSON.stringify({
          ok: true,
          account_id: accountId,
          niche: playbook.niche,
          follower_stage: playbook.followerStage,
          weekly_priority: playbook.weeklyPriority,
          top_experiments: playbook.experiments.slice(0, 3).map((e) => ({
            name: e.name,
            tactic: e.tactic,
            expected_lift: e.expectedLift,
            effort: e.effort,
            automatable: e.automatable,
          })),
          viral_loops: playbook.viralLoops,
          collab_targets: playbook.collaborationTargets,
        });
      }

      case 'niche_revenue_optimize': {
        const accountId = (input.account_id as string) || '';
        const profile = accountProfiler.getProfile(accountId);

        if (!profile) {
          return JSON.stringify({
            ok: false,
            error: `Profile not found: ${accountId}. Run niche_profile_account first.`,
          });
        }

        const revenueProfile = revenueOptimizationAgent.buildRevenueProfile(profile);

        return JSON.stringify({
          ok: true,
          account_id: accountId,
          current_monthly_estimate: revenueProfile.currentEstimate,
          optimized_monthly_estimate: revenueProfile.optimizedEstimate,
          revenue_gap: revenueProfile.optimizedEstimate.monthly - revenueProfile.currentEstimate.monthly,
          offer_stack: revenueProfile.offerStack.map((o) => ({
            name: o.name,
            type: o.type,
            price: o.priceRange,
            conversion: `${(o.conversionRate * 100).toFixed(1)}%`,
            purpose: o.purpose,
          })),
          funnel_bottlenecks: revenueProfile.conversionFunnelMap.filter((f) => f.bottleneck),
          top_levers: revenueProfile.revenueLevers.slice(0, 4),
          top_recommendations: revenueProfile.recommendations.slice(0, 5),
          month_6_projection: revenueProfile.monthlyProjection[5],
        });
      }

      case 'niche_classify_account': {
        const result = nicheClassifier.classify({
          bioText: (input.bio_text as string) || '',
          hashtags: (input.hashtags as string[]) || [],
          ctaText: (input.cta_text as string) || '',
          contentSamples: (input.content_samples as string[]) || [],
        });

        return JSON.stringify({
          ok: true,
          primary_niche: result.primaryNiche,
          secondary_niche: result.secondaryNiche,
          confidence: result.confidence,
          triggering_features: result.triggeringFeatures,
          monetization_hints: result.monetizationHints,
          top_scores: result.scores.slice(0, 5),
        });
      }

      case 'niche_find_competitors': {
        const niche = (input.niche as NicheCategory) || 'personal-brand';
        const platform = (input.platform as 'instagram' | 'tiktok') || 'instagram';

        const handles = await competitorSpyAgent.findTopCompetitors(niche, platform, brand);

        return JSON.stringify({
          ok: true,
          niche,
          platform,
          competitor_handles: handles,
          count: handles.length,
        });
      }

      default:
        return JSON.stringify({ ok: false, error: `Unknown niche tool: ${toolName}` });
    }
  } catch (error) {
    return JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
