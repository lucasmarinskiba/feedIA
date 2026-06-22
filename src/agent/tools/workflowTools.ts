import type { Tool } from '@anthropic-ai/sdk/resources/messages.js';
import { workflowOrchestrator } from '../../studio/orchestrators/workflowOrchestrator.js';
import { growthHackingAgent } from '../../studio/intelligence/growthHackingAgent.js';
import { competitorSpyAgent } from '../../studio/intelligence/competitorSpyAgent.js';
import { revenueOptimizationAgent } from '../../studio/intelligence/revenueOptimizationAgent.js';
import { trendIntelligenceAgent } from '../../studio/intelligence/trendIntelligenceAgent.js';
import { contentAlgorithmAgent } from '../../studio/intelligence/contentAlgorithmAgent.js';
import { audiencePsychologyAgent } from '../../studio/intelligence/audiencePsychologyAgent.js';
import type { BrandProfile } from '../../config/types.js';
import type { NicheCategory, MonetizationModel } from '../../studio/intelligence/nicheAnalyzer.js';
import { buildMinimalIntelligence, DEFAULT_AUDIENCE } from './intelligenceHelpers.js';

interface ToolSpec extends Tool {
  description: string;
}

const tools: Record<string, ToolSpec> = {};

// ── Existing tools ────────────────────────────────────────────────────────────

tools.workflow_auto_content = {
  name: 'workflow_auto_content',
  description: 'Full automated content pipeline: trend → design → video → post → optimize',
  input_schema: {
    type: 'object' as const,
    properties: {
      repeat_count: { type: 'number', description: 'How many times to run workflow this week (1-7)' },
    },
  },
};

tools.workflow_batch_create = {
  name: 'workflow_batch_create',
  description: 'Batch create 10-30 pieces of content automatically',
  input_schema: {
    type: 'object' as const,
    properties: {
      count: { type: 'number', description: 'Number of posts to create (10-30)' },
      content_type: {
        type: 'string',
        enum: ['reels', 'carousels', 'mixed'],
        description: 'What type of content to create',
      },
    },
    required: ['count'],
  },
};

tools.workflow_ab_test = {
  name: 'workflow_ab_test',
  description: 'Run A/B test on content variants, auto-boost winner',
  input_schema: {
    type: 'object' as const,
    properties: {
      base_hook: { type: 'string', description: 'Main content hook to test variants of' },
      test_duration_hours: { type: 'number', description: 'How long to test (24, 48, 72 hours)' },
    },
    required: ['base_hook'],
  },
};

// ── AI Intelligence Workflow Tools ────────────────────────────────────────────

tools.workflow_niche_domination = {
  name: 'workflow_niche_domination',
  description:
    'Generate a 90-day niche domination plan — systematic strategy to become the go-to authority in your niche. Includes daily actions, content pillars, growth milestones, and monetization roadmap',
  input_schema: {
    type: 'object' as const,
    properties: {
      platform: { type: 'string', enum: ['instagram', 'tiktok', 'both'], description: 'Primary platform' },
      niche: { type: 'string', description: 'Target niche to dominate' },
      current_followers: { type: 'number', description: 'Starting follower count' },
      goal_followers: { type: 'number', description: '90-day follower target' },
      monetization_model: {
        type: 'string',
        enum: ['coaching', 'products', 'affiliate', 'ads', 'sponsorship', 'saas', 'services', 'community'],
        description: 'Revenue model to build toward',
      },
      unique_angle: { type: 'string', description: 'Your unique perspective or differentiator in the niche' },
    },
    required: ['platform', 'niche'],
  },
};

tools.workflow_content_repurpose = {
  name: 'workflow_content_repurpose',
  description:
    'Execute full content repurposing pipeline — take a top-performing piece of content and systematically convert it into all applicable formats for maximum reach with minimal creation effort',
  input_schema: {
    type: 'object' as const,
    properties: {
      source_post_url: { type: 'string', description: 'URL of top-performing post to repurpose' },
      source_content: { type: 'string', description: 'Content description or transcript if URL unavailable' },
      niche: { type: 'string', description: 'Content niche' },
      target_formats: {
        type: 'array',
        items: { type: 'string', enum: ['reel', 'carousel', 'tiktok', 'story-series', 'youtube-short', 'all'] },
        description: 'Formats to repurpose into (default: all)',
      },
      platforms: {
        type: 'array',
        items: { type: 'string', enum: ['instagram', 'tiktok'] },
        description: 'Platforms to publish repurposed content on',
      },
    },
    required: ['niche'],
  },
};

tools.workflow_competitor_monitor = {
  name: 'workflow_competitor_monitor',
  description:
    'Run daily competitor intelligence report — tracks top competitor accounts, identifies their viral content, extracts content gaps you can exploit, and surfaces trending topics before they peak',
  input_schema: {
    type: 'object' as const,
    properties: {
      platform: { type: 'string', enum: ['instagram', 'tiktok'], description: 'Platform' },
      niche: { type: 'string', description: 'Niche to monitor' },
      competitor_handles: {
        type: 'array',
        items: { type: 'string' },
        description: 'Competitor handles to track (or auto-discover if empty)',
      },
      monitor_frequency: {
        type: 'string',
        enum: ['daily', 'weekly', 'realtime'],
        description: 'How often to run this monitor',
      },
    },
    required: ['platform', 'niche'],
  },
};

tools.workflow_growth_report = {
  name: 'workflow_growth_report',
  description:
    'Generate weekly growth intelligence report — analyzes follower growth, engagement trends, top-performing content, algorithm changes, and revenue attribution. Returns prioritized action items for the next 7 days',
  input_schema: {
    type: 'object' as const,
    properties: {
      platform: { type: 'string', enum: ['instagram', 'tiktok', 'both'], description: 'Platform(s)' },
      niche: { type: 'string', description: 'Content niche' },
      current_followers: { type: 'number', description: 'Current followers' },
      followers_7d_ago: { type: 'number', description: 'Followers 7 days ago' },
      avg_engagement_rate: { type: 'number', description: 'Average engagement rate this week %' },
      posts_this_week: { type: 'number', description: 'Posts published this week' },
      top_post_url: { type: 'string', description: 'Best performing post URL this week (optional)' },
      monetization_model: {
        type: 'string',
        enum: ['coaching', 'products', 'affiliate', 'ads', 'sponsorship', 'saas', 'services', 'community', 'none'],
        description: 'Current monetization model',
      },
    },
    required: ['platform', 'niche', 'current_followers'],
  },
};

tools.workflow_revenue_funnel = {
  name: 'workflow_revenue_funnel',
  description:
    'Build and activate a complete revenue funnel from social content — creates the full system: lead magnet → landing page brief → email sequence outline → DM funnel → offer ladder. Returns revenue funnel blueprint',
  input_schema: {
    type: 'object' as const,
    properties: {
      niche: { type: 'string', description: 'Content niche' },
      monetization_model: {
        type: 'string',
        enum: ['coaching', 'products', 'affiliate', 'saas', 'services', 'community'],
        description: 'Primary monetization model',
      },
      offer_name: { type: 'string', description: 'Main offer or product name' },
      offer_price_usd: { type: 'number', description: 'Main offer price' },
      followers: { type: 'number', description: 'Current follower count' },
      platform: { type: 'string', enum: ['instagram', 'tiktok', 'both'], description: 'Platform' },
    },
    required: ['niche', 'monetization_model'],
  },
};

tools.workflow_viral_replication = {
  name: 'workflow_viral_replication',
  description:
    'Detect, analyze, and replicate viral content patterns systematically — identifies what made a post go viral (hook, format, timing, psychology), extracts the formula, and generates 5 new posts based on the same pattern',
  input_schema: {
    type: 'object' as const,
    properties: {
      viral_post_url: { type: 'string', description: 'URL of viral post to analyze (or describe if URL unavailable)' },
      viral_post_description: { type: 'string', description: 'Description of viral content if URL not available' },
      niche: { type: 'string', description: 'Content niche' },
      platform: { type: 'string', enum: ['instagram', 'tiktok'], description: 'Platform' },
      replications_to_generate: { type: 'number', description: 'Number of replication ideas to generate (3-10)' },
    },
    required: ['niche', 'platform'],
  },
};

export const workflowTools = tools;

export const executeWorkflowTool = async (
  toolName: string,
  input: Record<string, unknown>,
  brand?: BrandProfile,
): Promise<string> => {
  if (!brand) return JSON.stringify({ ok: false, error: 'Brand profile required' });

  try {
    switch (toolName) {
      case 'workflow_auto_content': {
        const repeatCount = typeof input.repeat_count === 'number' ? input.repeat_count : 1;
        const workflow = workflowOrchestrator.createAutoContentWorkflow(brand);
        const executions = [];
        for (let i = 0; i < repeatCount; i++) {
          const result = await workflowOrchestrator.executeWorkflow(brand, workflow);
          executions.push({
            execution_id: result.executionId,
            status: result.status,
            completed_at: result.completedAt?.toISOString(),
          });
        }
        return JSON.stringify({
          ok: true,
          workflow_name: workflow.name,
          executions,
          message: `Executed auto-content workflow ${repeatCount} time(s)`,
        });
      }

      case 'workflow_batch_create': {
        const count = typeof input.count === 'number' ? input.count : 10;
        const workflow = workflowOrchestrator.createBatchWorkflow(brand, count);
        const result = await workflowOrchestrator.executeWorkflow(brand, workflow);
        return JSON.stringify({
          ok: result.status === 'completed',
          workflow_name: workflow.name,
          execution_id: result.executionId,
          status: result.status,
          posts_created: count,
          completed_at: result.completedAt?.toISOString(),
        });
      }

      case 'workflow_ab_test': {
        const baseHook = (input.base_hook as string) || 'Default hook';
        const testDuration = typeof input.test_duration_hours === 'number' ? input.test_duration_hours : 24;
        const workflow = workflowOrchestrator.createABTestWorkflow(brand, baseHook);
        const result = await workflowOrchestrator.executeWorkflow(brand, workflow);
        return JSON.stringify({
          ok: result.status === 'completed',
          workflow_name: workflow.name,
          execution_id: result.executionId,
          test_duration_hours: testDuration,
          status: result.status,
          message: 'A/B test workflow started.',
        });
      }

      // ── AI Intelligence Cases ───────────────────────────────────────────────

      case 'workflow_niche_domination': {
        const platform = (input.platform as string) || 'instagram';
        const niche = input.niche as string as NicheCategory;
        const currentFollowers = typeof input.current_followers === 'number' ? input.current_followers : 500;
        const goalFollowers = typeof input.goal_followers === 'number' ? input.goal_followers : currentFollowers * 10;
        const monetization = (input.monetization_model as MonetizationModel) || 'coaching';
        const uniqueAngle = (input.unique_angle as string) || `authentic ${niche.replace('-', ' ')} perspective`;

        const resolvedPlatform = (platform === 'both' ? 'instagram' : platform) as 'instagram' | 'tiktok';
        const algProfile = contentAlgorithmAgent.getAlgorithmProfile(resolvedPlatform, niche);
        const psychProfile = audiencePsychologyAgent.buildPsychProfile(niche, DEFAULT_AUDIENCE);
        const intel = buildMinimalIntelligence(
          brand.name,
          resolvedPlatform,
          niche,
          (monetization as MonetizationModel) || 'digital-products',
          currentFollowers,
        );
        const playbook = growthHackingAgent.getPlaybook(intel, resolvedPlatform);
        const revProfile = revenueOptimizationAgent.buildRevenueProfile(intel);

        const phases = [
          {
            phase: 'Phase 1: Foundation (Days 1-30)',
            followers_target: Math.round(currentFollowers * 2),
            focus: 'Establish content pillars, build consistent publishing cadence, optimize profile',
            daily_actions: [
              'Post 1 reel/TikTok daily',
              'Engage 30min on niche content',
              'Respond to all comments within 1h',
              'Optimize bio with SEO keywords',
            ],
            content_mix: '70% educational, 20% personal, 10% promotional',
            algorithm_priority: algProfile.rankingFactors[0]?.factor ?? 'completion',
            milestone: `${Math.round(currentFollowers * 2).toLocaleString()} followers + consistent engagement rate`,
          },
          {
            phase: 'Phase 2: Growth (Days 31-60)',
            followers_target: Math.round(currentFollowers * 5),
            focus: 'Scale content output, collaborations, viral formula testing',
            daily_actions: [
              'Post 2x daily (reel + story)',
              'Weekly collab with 1 creator',
              'Run A/B tests on hooks',
              'Build email/DM list',
            ],
            content_mix: '60% educational, 20% social-proof, 20% viral-formula',
            algorithm_priority: 'shares + saves (secondary signals)',
            milestone: `${Math.round(currentFollowers * 5).toLocaleString()} followers + first revenue signals`,
          },
          {
            phase: 'Phase 3: Domination (Days 61-90)',
            followers_target: goalFollowers,
            focus: 'Revenue activation, authority positioning, system automation',
            daily_actions: [
              'Launch core offer',
              'Activate full funnel',
              'Partner with brands',
              'Batch create 2 weeks ahead',
            ],
            content_mix: '50% authority, 30% social-proof, 20% promotional',
            algorithm_priority: 'saves + profile visits (conversion signals)',
            milestone: `${goalFollowers.toLocaleString()} followers + $${revProfile.optimizedEstimate.monthly}/mo revenue`,
          },
        ];

        return JSON.stringify({
          ok: true,
          niche,
          platform,
          unique_angle: uniqueAngle,
          starting_followers: currentFollowers,
          goal_followers: goalFollowers,
          domination_phases: phases,
          psychology_weapon: psychProfile
            ? {
                core_desire: psychProfile.psychographics.coreDesire,
                top_trigger: psychProfile.buyingTriggers[0]?.trigger,
                trust_signal: psychProfile.psychographics.trustSignals[0],
              }
            : null,
          top_growth_experiments: playbook.experiments.slice(0, 5).map((e) => ({
            name: e.name,
            expected_lift: e.expectedLift,
            effort: e.effort,
          })),
          revenue_path: {
            day_30_target: '$0 — focus on growth',
            day_60_target: `$${revProfile.currentEstimate.monthly * 2}/mo`,
            day_90_target: `$${revProfile.optimizedEstimate.monthly}/mo`,
            primary_lever: revProfile.revenueLevers[0]?.lever,
          },
          daily_non_negotiables: ['Post daily', 'Engage 30min', 'Reply to comments', 'Track metrics weekly'],
        });
      }

      case 'workflow_content_repurpose': {
        const sourceUrl = (input.source_post_url as string) || '';
        const niche = input.niche as string as NicheCategory;
        const targetFormats = (input.target_formats as string[]) || ['all'];
        const platforms = (input.platforms as string[]) || ['instagram', 'tiktok'];

        const allFormats = ['reel', 'carousel', 'tiktok', 'story-series', 'youtube-short'];
        const formats = targetFormats.includes('all') ? allFormats : targetFormats;

        const psychProfile = audiencePsychologyAgent.buildPsychProfile(niche, DEFAULT_AUDIENCE);
        const firstTrigger = psychProfile.buyingTriggers[0];
        const hookVariants = firstTrigger
          ? audiencePsychologyAgent.generateHookVariants(firstTrigger, 8)
          : [`The ${niche} truth you need to hear`, `Why most people fail at ${niche}`, `${niche}: the complete guide`];

        const repurposePlan = formats.map((format) => {
          const formatGuides: Record<string, Record<string, string>> = {
            reel: {
              hook: hookVariants[0] ?? 'Hook',
              approach: '15-30s highlight reel with text overlay',
              production: '30-60 min edit',
              platform: 'instagram',
            },
            carousel: {
              hook: hookVariants[1] ?? 'Key insight',
              approach: '5-7 slide breakdown — 1 insight per slide',
              production: '45 min design',
              platform: 'instagram',
            },
            tiktok: {
              hook: hookVariants[2] ?? 'TikTok hook',
              approach: '15-30s version adapted for FYP algorithm',
              production: '30 min edit + sound',
              platform: 'tiktok',
            },
            'story-series': {
              hook: 'Swipe for the full story →',
              approach: '3-5 story cards with poll or question',
              production: '20 min',
              platform: 'instagram',
            },
            'youtube-short': {
              hook: hookVariants[3] ?? 'Short hook',
              approach: '45-60s version with subscribe CTA',
              production: '30 min edit',
              platform: 'youtube',
            },
          };
          const guide = formatGuides[format] ?? (formatGuides['reel'] as Record<string, string>);
          return {
            format,
            target_platform: guide['platform'] ?? 'instagram',
            hook: guide['hook'] ?? 'Hook',
            approach: guide['approach'] ?? '15-30s format',
            production_time: guide['production'] ?? '30 min',
            caption_strategy: `Platform-optimized caption for ${guide['platform'] ?? 'instagram'}`,
            post_delay:
              format === 'reel' ? 'Post immediately' : `Post ${24 + formats.indexOf(format) * 24}h after original`,
          };
        });

        return JSON.stringify({
          ok: true,
          source: sourceUrl || 'provided content',
          niche,
          formats_planned: formats.length,
          platforms,
          repurpose_plan: repurposePlan,
          efficiency_summary: `1 content piece → ${formats.length} assets → ~${formats.length * 3}x reach potential`,
          creation_time_saved: `~${formats.length * 2}h vs. creating each from scratch`,
          publication_schedule: 'Spread over 5-7 days — avoid same-day cross-posting for maximum algorithm reach',
          psychology_hooks: hookVariants.slice(0, 3),
        });
      }

      case 'workflow_competitor_monitor': {
        const platform = (input.platform as string) || 'instagram';
        const niche = input.niche as string as NicheCategory;
        const competitors = (input.competitor_handles as string[]) || [];
        const frequency = (input.monitor_frequency as string) || 'weekly';

        const handles =
          competitors.length > 0
            ? competitors
            : await competitorSpyAgent.findTopCompetitors(niche, platform as 'instagram' | 'tiktok', brand);

        const intel = await competitorSpyAgent.analyzeCompetitors(
          handles.slice(0, 5),
          niche,
          platform as 'instagram' | 'tiktok',
          brand,
        );

        const gaps = competitorSpyAgent.performGapAnalysis(intel);

        const trendReport = await trendIntelligenceAgent.getTrends(niche, platform as 'instagram' | 'tiktok', brand);
        const trendRecs = trendIntelligenceAgent.getTrendRecommendations(trendReport);

        return JSON.stringify({
          ok: true,
          platform,
          niche,
          monitor_frequency: frequency,
          competitors_analyzed: handles.slice(0, 5),
          intelligence_report: {
            top_performing_accounts: intel.competitors.slice(0, 3).map((p) => ({
              handle: p.handle,
              followers: p.followers,
              avg_engagement: p.avgEngagement,
              top_format: p.topContentTypes[0],
            })),
            viral_content_patterns: intel.winningFormulas.slice(0, 3),
            avg_niche_engagement: intel.avgNicheEngagement,
          },
          gap_analysis: {
            content_gaps: gaps.untappedTopics.slice(0, 3),
            differentiation_angles: intel.differentiationAngles.slice(0, 3),
            positioning_voids: gaps.positioningVoids.slice(0, 3),
          },
          trending_now: trendRecs.slice(0, 3),
          action_items: [
            `Create content on gap: "${gaps.untappedTopics[0] ?? 'untapped niche topic'}"`,
            `Use differentiation angle: "${intel.differentiationAngles[0] ?? 'unique perspective'}"`,
            `Trending topic to ride: "${trendRecs[0] ?? 'current niche trend'}"`,
          ],
        });
      }

      case 'workflow_growth_report': {
        const platform = (input.platform as string) || 'instagram';
        const niche = input.niche as string as NicheCategory;
        const currentFollowers = typeof input.current_followers === 'number' ? input.current_followers : 1000;
        const followers7dAgo =
          typeof input.followers_7d_ago === 'number' ? input.followers_7d_ago : currentFollowers * 0.97;
        const avgEngagement = typeof input.avg_engagement_rate === 'number' ? input.avg_engagement_rate : 3.0;
        const postsThisWeek = typeof input.posts_this_week === 'number' ? input.posts_this_week : 3;
        const monetization = (input.monetization_model as MonetizationModel | 'none') || 'none';

        const followersGained = currentFollowers - followers7dAgo;
        const growthRate = followers7dAgo > 0 ? (followersGained / followers7dAgo) * 100 : 0;

        const algProfile = contentAlgorithmAgent.getAlgorithmProfile(
          (platform === 'both' ? 'instagram' : platform) as 'instagram' | 'tiktok',
          niche,
        );

        const resolvedPlatGrowth = (platform === 'both' ? 'instagram' : platform) as 'instagram' | 'tiktok';
        const revProfile =
          monetization !== 'none'
            ? revenueOptimizationAgent.buildRevenueProfile(
                buildMinimalIntelligence(
                  brand.name,
                  resolvedPlatGrowth,
                  niche,
                  monetization as MonetizationModel,
                  currentFollowers,
                ),
              )
            : null;

        const trendReport = await trendIntelligenceAgent.getTrends(niche, resolvedPlatGrowth, brand);

        const growthGrade =
          growthRate >= 5 ? 'Excellent' : growthRate >= 2 ? 'Good' : growthRate >= 0.5 ? 'Fair' : 'Needs improvement';
        const engagementGrade =
          avgEngagement >= 5 ? 'Excellent' : avgEngagement >= 3 ? 'Good' : avgEngagement >= 1.5 ? 'Fair' : 'Low';

        const nextWeekActions = [
          growthRate < 2
            ? `Increase posting frequency — currently ${postsThisWeek}/week, target 5+`
            : 'Maintain posting frequency',
          avgEngagement < 3 ? 'Add engagement question to every caption this week' : 'Continue engagement strategy',
          `Capitalize on trending: "${trendReport.emergingTopics[0] ?? 'current niche trend'}"`,
          `Algorithm priority this week: optimize for "${algProfile.rankingFactors[0]?.factor ?? 'completion'}"`,
          monetization !== 'none'
            ? `Revenue lever to activate: "${revProfile?.revenueLevers[0]?.lever ?? 'link in bio CTA'}"`
            : 'Add monetization to unlock revenue tracking',
        ];

        return JSON.stringify({
          ok: true,
          report_date: new Date().toISOString().split('T')[0],
          platform,
          niche,
          this_week_metrics: {
            followers_gained: followersGained,
            growth_rate: `${growthRate.toFixed(2)}%`,
            growth_grade: growthGrade,
            current_followers: currentFollowers,
            avg_engagement_rate: `${avgEngagement}%`,
            engagement_grade: engagementGrade,
            posts_published: postsThisWeek,
          },
          algorithm_health: {
            posting_frequency_score: Math.min(100, Math.round((postsThisWeek / 7) * 100)),
            engagement_score: Math.min(100, Math.round(avgEngagement / 0.05)),
            top_signal_to_optimize: algProfile.rankingFactors[0]?.factor,
          },
          revenue_snapshot: revProfile
            ? {
                current_estimate: `$${revProfile.currentEstimate.monthly}/mo`,
                optimized_potential: `$${revProfile.optimizedEstimate.monthly}/mo`,
                top_lever: revProfile.revenueLevers[0]?.lever,
              }
            : null,
          trending_opportunities: trendReport.emergingTopics.slice(0, 3),
          next_7_days_actions: nextWeekActions,
          celebration:
            followersGained > 100
              ? `Strong week — ${followersGained} new followers!`
              : growthRate > 0
                ? `Positive growth momentum — keep going!`
                : 'Focus on engagement quality this week',
        });
      }

      case 'workflow_revenue_funnel': {
        const niche = input.niche as string as NicheCategory;
        const monetization = (input.monetization_model as MonetizationModel) || 'coaching';
        const offerName = (input.offer_name as string) || 'core offer';
        const offerPrice = typeof input.offer_price_usd === 'number' ? input.offer_price_usd : 97;
        const followers = typeof input.followers === 'number' ? input.followers : 1000;
        const platform = (input.platform as string) || 'instagram';

        const resolvedPlatFunnel = (platform === 'both' ? 'instagram' : platform) as 'instagram' | 'tiktok';
        const psychProfile = audiencePsychologyAgent.buildPsychProfile(niche, DEFAULT_AUDIENCE);
        const funnelIntel = buildMinimalIntelligence(brand.name, resolvedPlatFunnel, niche, monetization, followers);
        const revProfile = revenueOptimizationAgent.buildRevenueProfile(funnelIntel);

        const desire = psychProfile.psychographics.coreDesire;
        const fear = psychProfile.psychographics.deepestFear;

        const leadMagnetIdeas = [
          `Free ${niche.replace('-', ' ')} guide: "The ${desire} checklist"`,
          `Free mini-training: "How to avoid ${fear} in ${niche.replace('-', ' ')}"`,
          `Free template: "${niche.replace('-', ' ')} starter kit"`,
        ];

        const emailSequence = [
          {
            email: 1,
            subject: `You requested [lead magnet] — here it is!`,
            goal: 'Deliver value, introduce yourself',
            send_time: 'Immediately',
          },
          {
            email: 2,
            subject: `The #1 mistake ${niche.replace('-', ' ')} people make`,
            goal: 'Establish authority, agitate problem',
            send_time: 'Day 2',
          },
          {
            email: 3,
            subject: `[Case study]: How [client] achieved [result]`,
            goal: 'Social proof',
            send_time: 'Day 4',
          },
          {
            email: 4,
            subject: `How ${offerName} works (and if it\'s right for you)`,
            goal: 'Soft offer introduction',
            send_time: 'Day 6',
          },
          {
            email: 5,
            subject: `Last chance: [urgency hook] for ${offerName}`,
            goal: 'Convert to sale',
            send_time: 'Day 8',
          },
        ];

        return JSON.stringify({
          ok: true,
          niche,
          monetization_model: monetization,
          offer_name: offerName,
          offer_price_usd: offerPrice,
          funnel_blueprint: {
            top_of_funnel: {
              traffic_source: `${platform} content → profile visits`,
              hook: `Content triggers "${desire}"`,
              conversion_action: 'Profile visit → Bio link click',
            },
            lead_magnet_ideas: leadMagnetIdeas,
            email_nurture_sequence: emailSequence,
            dm_funnel: [
              'Comment trigger: "DM me [keyword] for [resource]"',
              'Story poll → DM follow-up to engaged voters',
              'Welcome DM to new followers (within 24h)',
            ],
            offer_ladder: revProfile.recommendations.slice(0, 3).map((r) => r.action),
          },
          funnel_stages: revProfile.conversionFunnelMap.slice(0, 4).map((s) => ({
            stage: s.stage,
            metric: s.metric,
            fix: s.fix,
            bottleneck: s.bottleneck,
          })),
          revenue_projection: revProfile.monthlyProjection.slice(0, 3).map((p) => ({
            month: p.month,
            revenue_realistic: `$${p.realistic}`,
            revenue_optimistic: `$${p.optimistic}`,
            key_driver: p.keyDriver,
          })),
          quick_wins: [
            'Add link in bio TODAY',
            `Create lead magnet: "${leadMagnetIdeas[0]}"`,
            'Set up comment automation trigger',
            'Send welcome DM to last 20 new followers',
          ],
        });
      }

      case 'workflow_viral_replication': {
        const viralUrl = (input.viral_post_url as string) || '';
        const viralDesc = (input.viral_post_description as string) || 'Viral content piece';
        const niche = input.niche as string as NicheCategory;
        const platform = (input.platform as string) || 'instagram';
        const replicationCount = Math.min(
          10,
          Math.max(3, typeof input.replications_to_generate === 'number' ? input.replications_to_generate : 5),
        );

        const algProfile = contentAlgorithmAgent.getAlgorithmProfile(platform as 'instagram' | 'tiktok', niche);
        const psychProfile = audiencePsychologyAgent.buildPsychProfile(niche, DEFAULT_AUDIENCE);
        const trendReport = await trendIntelligenceAgent.getTrends(niche, platform as 'instagram' | 'tiktok', brand);

        const viralSignals = {
          hook_type: viralDesc.includes('?') ? 'question' : viralDesc.includes('!') ? 'shock' : 'statement',
          psychology_trigger: psychProfile.buyingTriggers[0]?.trigger ?? 'transformation',
          algorithm_signal: algProfile.rankingFactors[0]?.factor ?? 'completion',
          content_structure: 'Hook → Value → Reframe → CTA',
          virality_factors: ['Relatable pain point', 'Unexpected insight', 'Shareable format', 'Strong CTA'],
        };

        const firstViralTrigger = psychProfile.buyingTriggers[0];
        const hookVariants = firstViralTrigger
          ? audiencePsychologyAgent.generateHookVariants(firstViralTrigger, replicationCount + 3)
          : Array.from(
              { length: replicationCount + 3 },
              (_, i) =>
                `${['Why', 'How', 'The truth about', 'Stop', 'Nobody talks about'][i % 5]} ${niche.replace('-', ' ')} [topic]`,
            );

        const topics = trendReport.emergingTopics.length > 0 ? trendReport.emergingTopics : trendReport.viralHooks;
        const replications = Array.from({ length: replicationCount }, (_, i) => {
          const trendTopic = topics[i % Math.max(topics.length, 1)] ?? `${niche} insight ${i + 1}`;
          const topicWeight = algProfile.rankingFactors[0]?.weight ?? 0.3;
          return {
            replication_number: i + 1,
            topic: trendTopic,
            hook: hookVariants[i] ?? `Hook for ${trendTopic}`,
            format: i % 3 === 0 ? 'reel' : i % 3 === 1 ? 'carousel' : 'tiktok-video',
            angle: `${viralSignals.hook_type} approach applied to "${trendTopic}"`,
            psychology_trigger: viralSignals.psychology_trigger,
            estimated_virality: topicWeight > 0.3 ? 'High' : 'Medium',
            production_notes: `Same structure as viral post but for ${trendTopic}. Lead with "${hookVariants[i]?.slice(0, 50) ?? 'hook'}..."`,
          };
        });

        return JSON.stringify({
          ok: true,
          original_post: viralUrl || viralDesc.slice(0, 100),
          niche,
          platform,
          viral_analysis: {
            extracted_formula: viralSignals,
            what_made_it_viral: viralSignals.virality_factors,
            algorithm_factors: algProfile.rankingFactors.slice(0, 3).map((f) => f.factor),
          },
          replication_ideas: replications,
          posting_strategy: 'Post replications 48-72h apart — test which angle resonates most. Scale winner.',
          expected_outcomes: `If original got [X] reach, replications should get ${Math.round((algProfile.rankingFactors[0]?.weight ?? 0.3) * 200 + 40)}-80% of original performance on first attempt`,
        });
      }

      default:
        return JSON.stringify({ ok: false, error: `Unknown workflow tool: ${toolName}` });
    }
  } catch (error) {
    return JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
