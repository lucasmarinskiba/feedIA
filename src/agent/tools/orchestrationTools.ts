// @ts-nocheck
import type { Tool } from '@anthropic-ai/sdk/resources/messages.js';
import { brandOrchestrator } from '../../studio/orchestrators/brandOrchestrator.js';
import { growthHackingAgent } from '../../studio/intelligence/growthHackingAgent.js';
import { contentAlgorithmAgent } from '../../studio/intelligence/contentAlgorithmAgent.js';
import { trendIntelligenceAgent } from '../../studio/intelligence/trendIntelligenceAgent.js';
import { competitorSpyAgent } from '../../studio/intelligence/competitorSpyAgent.js';
import { revenueOptimizationAgent } from '../../studio/intelligence/revenueOptimizationAgent.js';
import { audiencePsychologyAgent } from '../../studio/intelligence/audiencePsychologyAgent.js';
import type { BrandProfile } from '../../config/types.js';
import type { NicheCategory, MonetizationModel } from '../../studio/intelligence/nicheAnalyzer.js';
import { buildMinimalIntelligence, DEFAULT_AUDIENCE } from './intelligenceHelpers.js';

interface ToolSpec extends Tool {
  description: string;
}

const tools: Record<string, ToolSpec> = {};

// ── Existing tools ────────────────────────────────────────────────────────────

tools.orchestrate_decide_format = {
  name: 'orchestrate_decide_format',
  description: 'Use brand strategy to decide best content format (feed/reel/carousel/story)',
  input_schema: {
    type: 'object' as const,
    properties: {
      idea: { type: 'string', description: 'Content idea or topic' },
      target_audience: { type: 'string', description: 'Who this content targets' },
      goal: { type: 'string', enum: ['awareness', 'engagement', 'conversion', 'community'] },
      tone: { type: 'string', description: 'Content tone/voice' },
      visual_style: { type: 'string', description: 'Visual aesthetic' },
      proposed_formats: { type: 'array', items: { type: 'string' }, description: 'Format options being considered' },
    },
    required: ['idea', 'goal', 'proposed_formats'],
  },
};

tools.orchestrate_enforce_consistency = {
  name: 'orchestrate_enforce_consistency',
  description: 'Check if content (caption + visuals) aligns with brand identity',
  input_schema: {
    type: 'object' as const,
    properties: {
      caption: { type: 'string', description: 'Post caption text' },
      visual_assets: { type: 'array', items: { type: 'string' }, description: 'URLs/paths to images or videos' },
    },
    required: ['caption'],
  },
};

tools.orchestrate_campaign = {
  name: 'orchestrate_campaign',
  description: 'Plan multi-post campaign aligned with brand story arc',
  input_schema: {
    type: 'object' as const,
    properties: {
      theme: { type: 'string', description: 'Campaign theme or topic' },
      content_count: { type: 'number', description: 'Number of posts in campaign' },
      duration_days: { type: 'number', description: 'How many days to spread posts across' },
    },
    required: ['theme', 'content_count', 'duration_days'],
  },
};

// ── AI Intelligence Tools ─────────────────────────────────────────────────────

tools.orchestrate_niche_pipeline = {
  name: 'orchestrate_niche_pipeline',
  description:
    'Run complete niche intelligence pipeline: classify account → build psychology profile → get algorithm recommendations → competitor gaps → growth playbook. Returns full strategic brief',
  input_schema: {
    type: 'object' as const,
    properties: {
      handle: { type: 'string', description: 'Instagram/TikTok account handle' },
      platform: { type: 'string', enum: ['instagram', 'tiktok'], description: 'Primary platform' },
      niche: { type: 'string', description: 'Account niche (auto-detected if not provided)' },
      followers: { type: 'number', description: 'Current follower count' },
      monetization_model: {
        type: 'string',
        enum: ['coaching', 'products', 'affiliate', 'ads', 'sponsorship', 'saas', 'services', 'community'],
        description: 'How the account monetizes',
      },
    },
    required: ['handle', 'platform'],
  },
};

tools.orchestrate_viral_formula = {
  name: 'orchestrate_viral_formula',
  description:
    'Detect viral content patterns from top-performing posts in your niche, extract the formula, and generate replication brief. Returns hook patterns, formats, and content formulas that are currently going viral',
  input_schema: {
    type: 'object' as const,
    properties: {
      niche: { type: 'string', description: 'Content niche to analyze' },
      platform: { type: 'string', enum: ['instagram', 'tiktok'], description: 'Platform' },
      competitor_handles: {
        type: 'array',
        items: { type: 'string' },
        description: 'Competitor handles to analyze for viral patterns',
      },
      content_goal: {
        type: 'string',
        enum: ['followers', 'reach', 'sales', 'authority'],
        description: 'What you want the viral content to achieve',
      },
    },
    required: ['niche', 'platform'],
  },
};

tools.orchestrate_content_calendar = {
  name: 'orchestrate_content_calendar',
  description:
    'Generate complete 30-day content calendar: topics, formats, captions, hashtag strategies, and optimal timing — all aligned with niche trends, algorithm signals, and brand voice',
  input_schema: {
    type: 'object' as const,
    properties: {
      platform: { type: 'string', enum: ['instagram', 'tiktok', 'both'], description: 'Target platform(s)' },
      niche: { type: 'string', description: 'Content niche' },
      posts_per_week: { type: 'number', description: 'Weekly posting frequency (1-14)' },
      content_pillars: {
        type: 'array',
        items: { type: 'string' },
        description: 'Content categories/pillars to rotate through (3-5 recommended)',
      },
      monetization_focus: {
        type: 'string',
        enum: ['coaching', 'products', 'affiliate', 'awareness', 'community'],
        description: 'Monetization angle to weave in',
      },
    },
    required: ['platform', 'niche'],
  },
};

tools.orchestrate_account_audit = {
  name: 'orchestrate_account_audit',
  description:
    'Run comprehensive account health audit: profile optimization score, content mix analysis, engagement quality, growth rate, algorithm alignment, and revenue potential. Returns prioritized action plan',
  input_schema: {
    type: 'object' as const,
    properties: {
      platform: { type: 'string', enum: ['instagram', 'tiktok'], description: 'Platform' },
      handle: { type: 'string', description: 'Account handle' },
      niche: { type: 'string', description: 'Account niche' },
      followers: { type: 'number', description: 'Current followers' },
      avg_engagement_rate: { type: 'number', description: 'Average engagement rate %' },
      posts_per_week: { type: 'number', description: 'Current posting frequency' },
      monetization_model: {
        type: 'string',
        enum: ['coaching', 'products', 'affiliate', 'ads', 'sponsorship', 'saas', 'services', 'community', 'none'],
        description: 'Current monetization',
      },
      has_link_in_bio: { type: 'boolean', description: 'Has link in bio?' },
      has_highlights: { type: 'boolean', description: 'Has story highlights?' },
      has_consistent_branding: { type: 'boolean', description: 'Consistent visual branding?' },
    },
    required: ['platform', 'handle', 'niche', 'followers'],
  },
};

tools.orchestrate_growth_sprint = {
  name: 'orchestrate_growth_sprint',
  description:
    'Generate a focused 7-day growth sprint plan — intensive high-impact actions designed to push through follower plateaus, increase algorithm distribution, and activate engagement growth',
  input_schema: {
    type: 'object' as const,
    properties: {
      platform: { type: 'string', enum: ['instagram', 'tiktok'], description: 'Platform' },
      niche: { type: 'string', description: 'Content niche' },
      current_followers: { type: 'number', description: 'Current followers' },
      current_engagement_rate: { type: 'number', description: 'Current engagement rate %' },
      growth_block: {
        type: 'string',
        enum: ['plateau', 'low-reach', 'low-engagement', 'low-conversions', 'starting-from-zero'],
        description: 'Specific growth problem to solve',
      },
      time_available_daily_hours: { type: 'number', description: 'Hours available per day for this sprint' },
    },
    required: ['platform', 'niche', 'growth_block'],
  },
};

tools.orchestrate_launch_sequence = {
  name: 'orchestrate_launch_sequence',
  description:
    'Generate a multi-platform product/offer launch sequence — pre-launch hype, launch day, and post-launch follow-up posts. Uses psychology triggers and urgency frameworks to maximize conversions',
  input_schema: {
    type: 'object' as const,
    properties: {
      product_name: { type: 'string', description: 'Product or offer name' },
      product_type: {
        type: 'string',
        enum: ['coaching-program', 'digital-product', 'physical-product', 'service', 'community', 'course'],
        description: 'Type of offer',
      },
      price_usd: { type: 'number', description: 'Price in USD' },
      niche: { type: 'string', description: 'Target niche' },
      platform: { type: 'string', enum: ['instagram', 'tiktok', 'both'], description: 'Platform(s)' },
      launch_date: { type: 'string', description: 'YYYY-MM-DD launch date' },
      pre_launch_days: { type: 'number', description: 'Days of pre-launch warming (3-14)' },
      urgency_mechanism: {
        type: 'string',
        enum: ['limited-spots', 'countdown-timer', 'early-bird-price', 'bonus-expiry', 'cohort-close'],
        description: 'Urgency/scarcity mechanism',
      },
    },
    required: ['product_name', 'product_type', 'niche', 'platform', 'launch_date'],
  },
};

tools.orchestrate_repurpose = {
  name: 'orchestrate_repurpose',
  description:
    'Take one piece of content and repurpose it into every possible format — turns a reel into a carousel, thread, story sequence, TikTok, and email. Returns full repurposing plan with content outlines for each format',
  input_schema: {
    type: 'object' as const,
    properties: {
      source_content: { type: 'string', description: 'Original content description, transcript, or key points' },
      source_format: {
        type: 'string',
        enum: ['reel', 'podcast-clip', 'blog-post', 'tweet', 'carousel', 'live-stream', 'interview'],
        description: 'Original content format',
      },
      niche: { type: 'string', description: 'Content niche' },
      target_platforms: {
        type: 'array',
        items: {
          type: 'string',
          enum: ['instagram-reel', 'instagram-carousel', 'instagram-story', 'tiktok', 'tiktok-story', 'youtube-short'],
        },
        description: 'Target formats to repurpose into',
      },
    },
    required: ['source_content', 'source_format', 'niche'],
  },
};

export const orchestrationTools = tools;

export const executeOrchestrationTool = async (
  toolName: string,
  input: Record<string, unknown>,
  brand?: BrandProfile,
): Promise<string> => {
  try {
    if (!brand) return JSON.stringify({ ok: false, error: 'Brand profile required for orchestration' });

    switch (toolName) {
      case 'orchestrate_decide_format': {
        const brandTone = Array.isArray(brand.voice.tone) ? brand.voice.tone[0] : brand.voice.tone;
        const brief = {
          idea: (input.idea as string) || '',
          targetAudience: (input.target_audience as string) || '',
          goal: (input.goal as 'awareness' | 'engagement' | 'conversion' | 'community') || 'awareness',
          tone: (input.tone as string) || brandTone || 'profesional',
          visualStyle: (input.visual_style as string) || '',
          proposedFormats: (input.proposed_formats as string[]) || ['reel', 'carousel', 'feed'],
        };
        const result = await brandOrchestrator.decideBestFormat(brand, brief);
        if (!result.ok) return JSON.stringify({ ok: false, error: result.error });
        return JSON.stringify({
          ok: true,
          recommended_format: result.decision?.contentType,
          platform: result.decision?.platform,
          reasoning: result.decision?.reasoning,
          brand_alignment: result.decision?.brandAlignment,
          estimated_reach: result.decision?.estimatedReach,
          confidence: result.decision?.confidenceScore,
        });
      }

      case 'orchestrate_enforce_consistency': {
        const caption = (input.caption as string) || '';
        const assets = (input.visual_assets as string[]) || [];
        const result = await brandOrchestrator.enforceConsistency(brand, caption, assets);
        if (!result.ok) return JSON.stringify({ ok: false, error: result.error });
        return JSON.stringify({
          ok: true,
          passed_checks: result.check?.passedChecks,
          failed_checks: result.check?.failedChecks,
          consistency_score: result.check?.overallScore,
          recommendations: result.check?.recommendations,
          ready_to_publish: (result.check?.overallScore || 0) >= 70,
        });
      }

      case 'orchestrate_campaign': {
        const theme = (input.theme as string) || 'Brand Campaign';
        const contentCount = typeof input.content_count === 'number' ? input.content_count : 5;
        const days = typeof input.duration_days === 'number' ? input.duration_days : 7;
        const result = await brandOrchestrator.orchestrateCampaign(brand, theme, contentCount, days);
        if (!result.ok) return JSON.stringify({ ok: false, error: result.error });
        const campaign = result.campaign as Record<string, unknown> | undefined;
        return JSON.stringify({
          ok: true,
          campaign_theme: theme,
          content_pieces: contentCount,
          duration_days: days,
          schedule: campaign?.schedule,
          story_arc: campaign?.brand_story_arc,
          expected_reach: campaign?.expected_reach,
        });
      }

      // ── AI Intelligence Cases ───────────────────────────────────────────────

      case 'orchestrate_niche_pipeline': {
        const handle = (input.handle as string) || brand.name;
        const platform = (input.platform as string) || 'instagram';
        const niche = (input.niche as string as NicheCategory) ?? ('personal-brand' as NicheCategory);
        const followers = typeof input.followers === 'number' ? input.followers : 1000;
        const monetization = (input.monetization_model as MonetizationModel) || 'coaching';

        const psychProfile = audiencePsychologyAgent.buildPsychProfile(niche, DEFAULT_AUDIENCE);
        const algProfile = contentAlgorithmAgent.getAlgorithmProfile(platform as 'instagram' | 'tiktok', niche);
        const algBrief = contentAlgorithmAgent.generateAlgorithmBrief(
          { niche, monetizationModels: [monetization], followerCount: followers } as unknown as Parameters<
            typeof contentAlgorithmAgent.generateAlgorithmBrief
          >[0],
          platform as 'instagram' | 'tiktok',
          niche,
        );

        const trendReport = await trendIntelligenceAgent.getTrends(niche, platform as 'instagram' | 'tiktok', brand);
        const trendRecs = trendIntelligenceAgent.getTrendRecommendations(trendReport);

        const pipelineIntel = buildMinimalIntelligence(
          handle,
          platform as 'instagram' | 'tiktok',
          niche,
          monetization,
          followers,
        );
        const revProfile = revenueOptimizationAgent.buildRevenueProfile(pipelineIntel);
        const playbook = growthHackingAgent.getPlaybook(pipelineIntel, platform as 'instagram' | 'tiktok');

        return JSON.stringify({
          ok: true,
          handle,
          niche,
          platform,
          psychology_profile: {
            core_desire: psychProfile.psychographics.coreDesire,
            deepest_fear: psychProfile.psychographics.deepestFear,
            top_trigger: psychProfile.buyingTriggers[0]?.trigger,
            trust_signals: psychProfile.psychographics.trustSignals.slice(0, 3),
          },
          algorithm_brief: algBrief,
          top_algorithm_signals: algProfile.rankingFactors.slice(0, 3).map((f) => ({
            signal: f.factor,
            weight: `${(f.weight * 100).toFixed(0)}%`,
          })),
          trend_opportunities: trendRecs.slice(0, 3),
          revenue_potential: {
            current: `$${revProfile.currentEstimate.monthly}/mo`,
            optimized: `$${revProfile.optimizedEstimate.monthly}/mo`,
            top_lever: revProfile.revenueLevers[0]?.lever,
          },
          growth_experiments: playbook.experiments.slice(0, 3).map((e) => ({
            name: e.name,
            tactic: e.tactic,
            expected_lift: e.expectedLift,
            effort: e.effort,
          })),
          immediate_actions: playbook.weeklyPriority.slice(0, 5),
        });
      }

      case 'orchestrate_viral_formula': {
        const niche = input.niche as string as NicheCategory;
        const platform = (input.platform as string) || 'instagram';
        const competitors = (input.competitor_handles as string[]) || [];
        const contentGoal = (input.content_goal as string) || 'followers';

        const trendReport = await trendIntelligenceAgent.getTrends(niche, platform as 'instagram' | 'tiktok', brand);
        const psychProfile = audiencePsychologyAgent.buildPsychProfile(niche, DEFAULT_AUDIENCE);
        const algProfile = contentAlgorithmAgent.getAlgorithmProfile(platform as 'instagram' | 'tiktok', niche);

        const viralTrigger = psychProfile.buyingTriggers[0];
        const viralHooks = viralTrigger
          ? audiencePsychologyAgent.generateHookVariants(viralTrigger, 8)
          : [
              `Why ${niche} creators are failing at this`,
              `The ${niche} truth that changed everything`,
              `Nobody talks about this ${niche} strategy`,
            ];

        const viralFormula = {
          hook_patterns: viralHooks.slice(0, 5),
          top_formats:
            algProfile.rankingFactors[0]?.factor === 'video_completion'
              ? ['reel (15-30s)', 'tiktok-video (7-15s)', 'carousel (saves)']
              : ['carousel (saves)', 'reel (reach)', 'story-series (relationship)'],
          viral_triggers: psychProfile.psychographics.urgencyTriggers.slice(0, 3),
          content_structures: [
            'Problem → Agitation → Solution (PAS)',
            'Hook → Value → Reframe → CTA (HVRC)',
            'Before → After → Bridge (BAB)',
            'Shock stat → Context → Lesson → Save-prompt',
          ],
          algorithm_boosters: algProfile.boostSignals.slice(0, 4),
        };

        let competitorIntel = null;
        if (competitors.length > 0) {
          const intel = await competitorSpyAgent.analyzeCompetitors(
            competitors,
            niche,
            platform as 'instagram' | 'tiktok',
            brand,
          );
          const gaps = competitorSpyAgent.performGapAnalysis(intel);
          competitorIntel = {
            common_formats: intel.competitors[0]?.topContentTypes ?? [],
            content_gaps: gaps.untappedTopics.slice(0, 3),
            differentiation: intel.differentiationAngles.slice(0, 3),
          };
        }

        return JSON.stringify({
          ok: true,
          niche,
          platform,
          content_goal: contentGoal,
          viral_formula: viralFormula,
          trend_topics: trendReport.emergingTopics.slice(0, 5),
          competitor_intelligence: competitorIntel,
          replication_brief: `For ${niche} on ${platform}: lead with "${viralHooks[0]}", use ${viralFormula.top_formats[0]}, trigger ${viralFormula.viral_triggers[0]}. Post at peak hours.`,
        });
      }

      case 'orchestrate_content_calendar': {
        const platform = (input.platform as string) || 'instagram';
        const niche = input.niche as string as NicheCategory;
        const postsPerWeek = Math.min(
          14,
          Math.max(1, typeof input.posts_per_week === 'number' ? input.posts_per_week : 5),
        );
        const pillars = (input.content_pillars as string[]) || [
          'education',
          'motivation',
          'behind-scenes',
          'promotion',
          'entertainment',
        ];
        const monetizationFocus = (input.monetization_focus as string) || 'awareness';

        const algProfile = contentAlgorithmAgent.getAlgorithmProfile(
          (platform === 'both' ? 'instagram' : platform) as 'instagram' | 'tiktok',
          niche,
        );

        const trendReport = await trendIntelligenceAgent.getTrends(
          niche,
          (platform === 'both' ? 'instagram' : platform) as 'instagram' | 'tiktok',
          brand,
        );

        const today = new Date();
        const calendarDays = 30;
        const daysInterval = Math.floor(7 / postsPerWeek);

        const contentTypes = ['reel', 'carousel', 'reel', 'story-series', 'carousel', 'reel', 'feed-post'];
        const optimalHours = [7, 12, 17, 19, 20];

        const calendar = Array.from({ length: Math.min(postsPerWeek * 4, 30) }, (_, i) => {
          const postDate = new Date(today);
          postDate.setDate(postDate.getDate() + i * daysInterval);
          const pillar = pillars[i % pillars.length] ?? 'education';
          const contentType = contentTypes[i % contentTypes.length] ?? 'reel';
          const trendTopic = trendReport.emergingTopics[i % Math.max(trendReport.emergingTopics.length, 1)];
          const hour = optimalHours[i % optimalHours.length] ?? 12;

          return {
            week: Math.floor(i / postsPerWeek) + 1,
            post_number: i + 1,
            date: postDate.toISOString().split('T')[0],
            day_of_week: postDate.toLocaleDateString('en-US', { weekday: 'long' }),
            optimal_time: `${hour}:00`,
            content_pillar: pillar,
            format: contentType,
            topic_suggestion: trendTopic ?? `${pillar} tip for ${niche}`,
            caption_angle:
              i % 5 === 0
                ? 'educational'
                : i % 5 === 1
                  ? 'inspirational'
                  : i % 5 === 2
                    ? 'social-proof'
                    : i % 5 === 3
                      ? 'behind-scenes'
                      : 'promotional',
            hashtag_strategy: contentType === 'reel' ? '3-5 in caption + 8-10 in first comment' : '10-15 in caption',
            monetization_angle: i % 7 === 6 ? monetizationFocus : 'organic-value',
            priority_signal: algProfile.rankingFactors[0]?.factor ?? 'completion',
          };
        });

        return JSON.stringify({
          ok: true,
          platform,
          niche,
          posts_per_week: postsPerWeek,
          calendar_days: calendarDays,
          content_pillars: pillars,
          total_posts_planned: calendar.length,
          calendar,
          format_split: {
            reels: `${Math.round((calendar.filter((c) => c.format === 'reel').length / calendar.length) * 100)}%`,
            carousels: `${Math.round((calendar.filter((c) => c.format === 'carousel').length / calendar.length) * 100)}%`,
            other: `${Math.round((calendar.filter((c) => !['reel', 'carousel'].includes(c.format)).length / calendar.length) * 100)}%`,
          },
          top_algorithm_signal: algProfile.rankingFactors[0]?.factor,
          trend_topics_integrated: trendReport.emergingTopics.slice(0, 5),
        });
      }

      case 'orchestrate_account_audit': {
        const platform = (input.platform as string) || 'instagram';
        const handle = (input.handle as string) || brand.name;
        const niche = input.niche as string as NicheCategory;
        const followers = typeof input.followers === 'number' ? input.followers : 1000;
        const engRate = typeof input.avg_engagement_rate === 'number' ? input.avg_engagement_rate : 2.0;
        const postsPerWeek = typeof input.posts_per_week === 'number' ? input.posts_per_week : 3;
        const monetization = (input.monetization_model as MonetizationModel | 'none') || 'none';
        const hasLink = (input.has_link_in_bio as boolean) ?? false;
        const hasHighlights = (input.has_highlights as boolean) ?? false;
        const hasConsistentBranding = (input.has_consistent_branding as boolean) ?? false;

        const algProfile = contentAlgorithmAgent.getAlgorithmProfile(platform as 'instagram' | 'tiktok', niche);
        const psychProfile = audiencePsychologyAgent.buildPsychProfile(niche, DEFAULT_AUDIENCE);
        const revProfile =
          monetization !== 'none'
            ? revenueOptimizationAgent.buildRevenueProfile(
                buildMinimalIntelligence(
                  handle,
                  platform as 'instagram' | 'tiktok',
                  niche,
                  monetization as MonetizationModel,
                  followers,
                ),
              )
            : null;

        const scores = {
          profile_completeness: (hasLink ? 25 : 0) + (hasHighlights ? 20 : 0) + (hasConsistentBranding ? 30 : 0) + 25,
          engagement_health: Math.min(100, Math.round(engRate / 0.05)),
          posting_consistency: Math.min(100, Math.round((postsPerWeek / 7) * 100)),
          algorithm_alignment: algProfile.boostSignals.length > 0 ? 70 : 50,
          monetization_readiness: monetization !== 'none' && hasLink ? 80 : monetization !== 'none' ? 60 : 30,
        };

        const overallScore = Math.round(Object.values(scores).reduce((a, b) => a + b, 0) / Object.keys(scores).length);

        const criticalIssues: string[] = [];
        if (!hasLink) criticalIssues.push('No link in bio — losing every traffic conversion opportunity');
        if (engRate < 2.0) criticalIssues.push(`Low engagement rate (${engRate}%) — algorithm is restricting reach`);
        if (postsPerWeek < 3) criticalIssues.push('Under-posting — algorithm deprioritizes inactive accounts');
        if (!hasConsistentBranding) criticalIssues.push('Inconsistent branding — reducing trust and recognition');
        if (!hasHighlights && platform === 'instagram')
          criticalIssues.push('No story highlights — losing evergreen content visibility');

        const opportunities: string[] = [];
        psychProfile.psychographics.urgencyTriggers
          .slice(0, 2)
          .forEach((t) => opportunities.push(`Use "${t}" trigger in next 3 captions`));
        algProfile.boostSignals.slice(0, 2).forEach((b) => opportunities.push(`Algorithm booster: ${b}`));

        return JSON.stringify({
          ok: true,
          handle,
          platform,
          niche,
          overall_score: overallScore,
          grade: overallScore >= 80 ? 'A' : overallScore >= 65 ? 'B' : overallScore >= 50 ? 'C' : 'D',
          score_breakdown: scores,
          critical_issues: criticalIssues,
          opportunities,
          revenue_assessment: revProfile
            ? {
                current_estimate: `$${revProfile.currentEstimate.monthly}/mo`,
                potential: `$${revProfile.optimizedEstimate.monthly}/mo`,
                top_lever: revProfile.revenueLevers[0]?.lever,
              }
            : 'Enable monetization to calculate',
          priority_actions: [
            ...criticalIssues
              .slice(0, 3)
              .map((issue, i) => ({ priority: i + 1, action: `Fix: ${issue}`, timeline: 'This week' })),
            ...opportunities
              .slice(0, 2)
              .map((opp, i) => ({ priority: criticalIssues.length + i + 1, action: opp, timeline: 'Next 30 days' })),
          ],
        });
      }

      case 'orchestrate_growth_sprint': {
        const platform = (input.platform as string) || 'instagram';
        const niche = input.niche as string as NicheCategory;
        const followers = typeof input.current_followers === 'number' ? input.current_followers : 1000;
        const growthBlock = (input.growth_block as string) || 'plateau';
        const hoursPerDay = typeof input.time_available_daily_hours === 'number' ? input.time_available_daily_hours : 2;

        const sprintIntel = buildMinimalIntelligence(
          brand.name,
          platform as 'instagram' | 'tiktok',
          niche,
          'coaching' as MonetizationModel,
          followers,
        );
        const playbook = growthHackingAgent.getPlaybook(sprintIntel, platform as 'instagram' | 'tiktok');

        const sprintByBlock: Record<string, string[]> = {
          plateau: [
            'Post 2x daily for 7 days (double output)',
            'Engage 30min/day on competitor content',
            'Collab with 2 accounts in niche',
            'Run engagement story series daily',
          ],
          'low-reach': [
            'Shift 80% content to discovery format (reels)',
            'Use trending audio on every post',
            'Optimize posting time to peak hours',
            'Post within 1h of algorithm peak window',
          ],
          'low-engagement': [
            'End every caption with specific question',
            'Reply to every comment within 30min',
            'Run daily story polls/questions',
            'Post "save-worthy" carousel every 3 days',
          ],
          'low-conversions': [
            'Add link to bio immediately',
            'Create lead magnet for bio link',
            'Add link sticker to 3 stories/week',
            'DM warmest followers manually',
          ],
          'starting-from-zero': [
            'Post daily for 30 days minimum',
            'Engage 1h/day on niche hashtags',
            'Follow 20 ideal audience members/day',
            'Collab post with established creator',
          ],
        };

        const dailyPlan = Array.from({ length: 7 }, (_, i) => ({
          day: i + 1,
          date: new Date(Date.now() + i * 86400000).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
          }),
          content_task:
            i < 2
              ? 'High-hook reel'
              : i < 4
                ? 'Save-worthy carousel'
                : i < 6
                  ? 'Engagement story series'
                  : 'Viral-formula reel',
          engagement_task: `${Math.min(hoursPerDay * 30, 60)}min commenting on ${niche} content`,
          growth_task:
            sprintByBlock[growthBlock]?.[i % (sprintByBlock[growthBlock]?.length ?? 1)] ?? 'Increase posting frequency',
          expected_outcome: `Day ${i + 1}: ${i < 3 ? 'Build momentum' : i < 6 ? 'Activate algorithm' : 'Measure results'}`,
        }));

        return JSON.stringify({
          ok: true,
          platform,
          niche,
          growth_block: growthBlock,
          sprint_duration_days: 7,
          daily_plan: dailyPlan,
          block_specific_tactics: sprintByBlock[growthBlock] ?? [],
          top_growth_experiments: playbook.experiments.slice(0, 3).map((e) => ({
            name: e.name,
            steps: e.steps.slice(0, 3),
            expected_lift: e.expectedLift,
          })),
          kpis_to_track: ['followers_gained', 'reach_per_post', 'engagement_rate', 'profile_visits', 'link_clicks'],
          sprint_success_threshold: `+${Math.round(followers * 0.05)} followers minimum to declare successful sprint`,
        });
      }

      case 'orchestrate_launch_sequence': {
        const productName = (input.product_name as string) || 'offer';
        const productType = (input.product_type as string) || 'digital-product';
        const price = typeof input.price_usd === 'number' ? input.price_usd : 97;
        const niche = input.niche as string as NicheCategory;
        const platform = (input.platform as string) || 'instagram';
        const launchDate = new Date(
          (input.launch_date as string) || (new Date().toISOString().split('T')[0] ?? new Date().toISOString()),
        );
        const preLaunchDays = Math.min(
          14,
          Math.max(3, typeof input.pre_launch_days === 'number' ? input.pre_launch_days : 7),
        );
        const urgency = (input.urgency_mechanism as string) || 'limited-spots';

        const psychProfile = audiencePsychologyAgent.buildPsychProfile(niche, DEFAULT_AUDIENCE);
        const desire = psychProfile.psychographics.coreDesire;
        const fear = psychProfile.psychographics.deepestFear;
        const trustSignal = psychProfile.psychographics.trustSignals[0] ?? 'proof and results';

        const urgencyMessages: Record<string, string> = {
          'limited-spots': `Only [N] spots available — closes when full`,
          'countdown-timer': `Doors close [date] at midnight`,
          'early-bird-price': `Early bird $${Math.round(price * 0.7)} → goes to $${price} in [N] days`,
          'bonus-expiry': `Bonus #1 expires [date] — get it now or lose it`,
          'cohort-close': `Cohort [N] closes [date] — next open in [timeframe]`,
        };

        const sequence = [
          ...Array.from({ length: Math.floor(preLaunchDays * 0.5) }, (_, i) => {
            const d = new Date(launchDate);
            d.setDate(d.getDate() - preLaunchDays + i);
            return {
              phase: 'pre-launch-awareness',
              day: -preLaunchDays + i,
              date: d.toISOString().split('T')[0],
              content_type: i % 2 === 0 ? 'reel' : 'carousel',
              hook:
                i === 0
                  ? `Something big is coming for ${niche.replace('-', ' ')} people...`
                  : `The ${desire} most people never achieve (and why that changes for you)`,
              angle: 'Build desire and identify the problem',
              psychology: `Trigger desire: "${desire}"`,
              cta: 'Follow + notify 🔔',
              urgency: null,
            };
          }),
          ...Array.from({ length: Math.ceil(preLaunchDays * 0.5) }, (_, i) => {
            const d = new Date(launchDate);
            d.setDate(d.getDate() - Math.ceil(preLaunchDays * 0.5) + i);
            return {
              phase: 'pre-launch-warm',
              day: -Math.ceil(preLaunchDays * 0.5) + i,
              date: d.toISOString().split('T')[0],
              content_type: i % 2 === 0 ? 'story-series' : 'reel',
              hook:
                i === 0
                  ? `[Name] went from ${fear} to [result] in [timeframe]. Here's how:`
                  : `The exact system I'm revealing inside ${productName}`,
              angle: 'Social proof + mechanism preview',
              psychology: `Build trust via: "${trustSignal}"`,
              cta: 'Get on waitlist — link in bio',
              urgency: null,
            };
          }),
          {
            phase: 'launch-day',
            day: 0,
            date: launchDate.toISOString().split('T')[0],
            content_type: 'reel + story-series',
            hook: `🚨 IT'S OPEN: ${productName} is officially live`,
            angle: 'Full offer reveal with urgency',
            psychology: `Urgency + fear of missing: "${urgency}"`,
            cta: `Get access now — ${urgencyMessages[urgency] ?? 'limited time'}`,
            urgency: urgencyMessages[urgency],
          },
          {
            phase: 'post-launch-day2',
            day: 1,
            date: new Date(launchDate.getTime() + 86400000).toISOString().split('T')[0],
            content_type: 'carousel',
            hook: "Inside ${productName}: here's what you get",
            angle: 'Full value breakdown + overcome objections',
            psychology: 'Address top objections head-on',
            cta: `Link in bio — ${urgencyMessages[urgency] ?? 'join now'}`,
            urgency: urgencyMessages[urgency],
          },
          {
            phase: 'post-launch-day4',
            day: 3,
            date: new Date(launchDate.getTime() + 3 * 86400000).toISOString().split('T')[0],
            content_type: 'story-series',
            hook: "We're already [N] people in — here's what's happening",
            angle: 'Social proof + mid-launch update',
            psychology: 'FOMO + social validation',
            cta: 'Still time to join — link in bio',
            urgency: 'Spots filling up',
          },
          {
            phase: 'launch-close',
            day: preLaunchDays - 2,
            date: new Date(launchDate.getTime() + (preLaunchDays - 2) * 86400000).toISOString().split('T')[0],
            content_type: 'reel',
            hook: '⏰ Closing in 48 hours — last chance for ${productName}',
            angle: 'Final urgency push',
            psychology: 'Loss aversion — fear of missing out',
            cta: 'Last chance — link in bio NOW',
            urgency: `FINAL: ${urgencyMessages[urgency] ?? 'closing soon'}`,
          },
        ];

        return JSON.stringify({
          ok: true,
          product_name: productName,
          product_type: productType,
          price_usd: price,
          niche,
          platform,
          launch_date: launchDate.toISOString().split('T')[0],
          sequence_length: sequence.length,
          launch_sequence: sequence,
          psychology_framework: {
            core_desire: desire,
            deepest_fear: fear,
            trust_signal: trustSignal,
            urgency_mechanism: urgencyMessages[urgency],
          },
          expected_conversion_rate: price < 100 ? '3-7%' : price < 500 ? '1-3%' : '0.5-1.5%',
          revenue_projection: `At 3% conversion: $${Math.round(0.03 * price * 100)} per 100 clicks`,
        });
      }

      case 'orchestrate_repurpose': {
        const sourceContent = (input.source_content as string) || 'content piece';
        const sourceFormat = (input.source_format as string) || 'reel';
        const niche = input.niche as string as NicheCategory;
        const targetPlatforms = (input.target_platforms as string[]) || [
          'instagram-carousel',
          'tiktok',
          'instagram-story',
        ];

        const repurposeMap: Record<
          string,
          { title: string; approach: string; keyChange: string; estimatedTime: string }
        > = {
          'instagram-reel': {
            title: 'Instagram Reel',
            approach: 'Extract key visual moment, keep to 15-30s, add hook overlay',
            keyChange: 'Front-load the hook, add text overlay at 2s mark',
            estimatedTime: '30-60 min edit',
          },
          'instagram-carousel': {
            title: 'Instagram Carousel',
            approach: 'Extract 5-7 key points into slide-by-slide educational sequence',
            keyChange: 'Each slide = one insight. Slide 1 = hook, last slide = CTA',
            estimatedTime: '45 min design',
          },
          'instagram-story': {
            title: 'Instagram Story Series',
            approach: '3-5 story cards — hook, 2-3 value cards, CTA card with link',
            keyChange: 'Add poll or question to card 2 for engagement',
            estimatedTime: '20 min',
          },
          tiktok: {
            title: 'TikTok Video',
            approach: 'Re-hook for TikTok audience, trim to 15-30s, add trending sound',
            keyChange: 'Start with controversy or bold statement. Add FYP hashtags',
            estimatedTime: '30-45 min edit',
          },
          'tiktok-story': {
            title: 'TikTok Story',
            approach: 'Quick teaser version — 5-10s hook, link sticker or CTA',
            keyChange: 'Must be punchy and visual-first',
            estimatedTime: '15 min',
          },
          'youtube-short': {
            title: 'YouTube Short',
            approach: 'Full 15-60s version with title card and subscribe CTA at end',
            keyChange: 'Title card matters for Shorts browse. End screen = subscribe prompt',
            estimatedTime: '45 min edit',
          },
        };

        const repurposePlan = targetPlatforms.map((target) => {
          const guide = repurposeMap[target];
          return {
            target_format: target,
            title: guide?.title ?? target,
            approach: guide?.approach ?? 'Adapt content for platform',
            key_change: guide?.keyChange ?? 'Optimize for platform behavior',
            estimated_time: guide?.estimatedTime ?? '30-60 min',
            content_outline: `Source: ${sourceFormat} → ${guide?.title ?? target}\n1. Extract key message from "${sourceContent.slice(0, 100)}"\n2. ${guide?.keyChange ?? 'Adapt for platform'}\n3. Optimize caption and hashtags for ${target.split('-')[0]}`,
          };
        });

        return JSON.stringify({
          ok: true,
          source_format: sourceFormat,
          niche,
          source_content_preview: sourceContent.slice(0, 200),
          repurpose_plan: repurposePlan,
          total_assets_generated: targetPlatforms.length,
          efficiency_note: `1 piece of content → ${targetPlatforms.length} assets. Saves ~${targetPlatforms.length * 2}h of content creation`,
          priority_order: targetPlatforms.slice(0, 3),
          system_note: 'Post repurposed content 24-48h after original to avoid cannibalizing reach',
        });
      }

      default:
        return JSON.stringify({ ok: false, error: `Unknown orchestration tool: ${toolName}` });
    }
  } catch (error) {
    return JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
