import type { Tool } from '@anthropic-ai/sdk/resources/messages.js';
import type { BrandProfile } from '../../config/types.js';
import type { NicheCategory, MonetizationModel } from '../../studio/intelligence/nicheAnalyzer.js';
import { trendIdeationEngine } from '../../studio/intelligence/trendIdeationEngine.js';
import { hookEnforcer } from '../../studio/intelligence/hookEnforcer.js';
import { ugcOrchestrator } from '../../studio/intelligence/ugcOrchestrator.js';
import { postProductionEngine } from '../../studio/intelligence/postProductionEngine.js';
import { retentionAnalyzer } from '../../studio/intelligence/retentionAnalyzer.js';
import {
  growthGuaranteeEngine,
  type GuaranteeTier,
  type KPIMetric,
} from '../../studio/intelligence/growthGuaranteeEngine.js';
import { viralityPredictor } from '../../studio/intelligence/viralityPredictor.js';
import { salesFunnelPredictor } from '../../studio/intelligence/salesFunnelPredictor.js';
import { scoreContent, formatContentScore } from '../../studio/intelligence/contentScoringMatrix.js';
import {
  assessRisk,
  processMoneyBackClaim,
  listAllTiers,
  type ExtendedGuaranteeTier,
} from '../../studio/intelligence/guaranteeModels.js';

interface ToolSpec extends Tool {
  description: string;
}

export const growthToolDefinitions: ToolSpec[] = [
  {
    name: 'growth_ideation_plan',
    description:
      'Generate a 30-idea monthly content plan based on viral structures, trend data, and competitor gaps. Returns prioritized ideas with hooks, CTAs, ManyChat triggers, and production notes.',
    input_schema: {
      type: 'object' as const,
      properties: {
        niche: { type: 'string', description: 'Content niche' },
        platform: { type: 'string', enum: ['instagram', 'tiktok', 'both'], description: 'Target platform' },
        brand_handle: { type: 'string', description: 'Brand Instagram/TikTok handle' },
      },
      required: ['niche', 'platform'],
    },
  },
  {
    name: 'growth_hook_score',
    description:
      'Score a content hook (0-10) using cognitive bias detection. Blocks hooks scoring <7. Returns issues, improved hook, and 3 alternatives. Use before recording any video.',
    input_schema: {
      type: 'object' as const,
      properties: {
        hook: { type: 'string', description: 'The opening hook text (first 3 seconds of video)' },
        niche: { type: 'string', description: 'Content niche for psych-profile optimization' },
      },
      required: ['hook', 'niche'],
    },
  },
  {
    name: 'growth_script_build',
    description:
      'Build a full retention-optimized script with hook, body segments, and ManyChat CTA. Validates structure and blocks if retentionScore < 65.',
    input_schema: {
      type: 'object' as const,
      properties: {
        hook: { type: 'string', description: 'Opening hook text' },
        body_points: {
          type: 'array',
          items: { type: 'string' },
          description: 'Script body points (each as 1-2 sentences)',
        },
        niche: { type: 'string', description: 'Content niche' },
        conversion_goal: {
          type: 'string',
          enum: ['lead-magnet', 'dm-sale', 'link-delivery', 'discovery-call'],
          description: 'What action the CTA drives',
        },
      },
      required: ['hook', 'body_points', 'niche'],
    },
  },
  {
    name: 'growth_ugc_brief',
    description:
      'Create a UGC creator brief from a retention script. Returns structured brief with requirements, QA criteria, and exportable markdown for creator handoff.',
    input_schema: {
      type: 'object' as const,
      properties: {
        brand_id: { type: 'string' },
        product_name: { type: 'string' },
        product_description: { type: 'string' },
        hook: { type: 'string', description: 'Hook for the UGC video' },
        body_points: { type: 'array', items: { type: 'string' } },
        niche: { type: 'string' },
        format: { type: 'string', enum: ['9:16', '1:1', '4:5', '16:9'], description: 'Video format' },
        min_duration: { type: 'number', description: 'Min video duration in seconds' },
        max_duration: { type: 'number', description: 'Max video duration in seconds' },
        must_avoid: { type: 'array', items: { type: 'string' }, description: 'Forbidden words/brands' },
        budget: { type: 'number', description: 'Budget per video in USD' },
        deadline_days: { type: 'number', description: 'Days until deadline (default 2)' },
      },
      required: ['brand_id', 'product_name', 'hook', 'body_points', 'niche'],
    },
  },
  {
    name: 'growth_ugc_qa',
    description:
      'Run automated QA on a submitted UGC video. Checks hook presence, CTA, subtitles, duration, and forbidden content. Returns pass/fail with specific edit suggestions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        brief_id: { type: 'string', description: 'Brief ID from growth_ugc_brief' },
        video_transcript: { type: 'string', description: 'Full transcript of submitted video' },
        duration_seconds: { type: 'number', description: 'Actual video duration in seconds' },
        has_subtitles: { type: 'boolean', description: 'Whether subtitles are burned in' },
      },
      required: ['brief_id', 'video_transcript', 'duration_seconds', 'has_subtitles'],
    },
  },
  {
    name: 'growth_postprod_plan',
    description:
      'Generate a post-production edit plan with silence-cut, dynamic subtitles, b-roll intervals, zoom punches, and color grade. Includes step-by-step CapCut instructions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        video_path: { type: 'string', description: 'Path to raw video file' },
        platform: { type: 'string', enum: ['instagram', 'tiktok'] },
        niche: { type: 'string' },
        duration_seconds: { type: 'number', description: 'Raw video duration in seconds' },
        has_hook: { type: 'boolean', description: 'Whether video has a strong spoken hook' },
        hook_text: { type: 'string', description: 'Hook text for overlay (optional)' },
      },
      required: ['video_path', 'platform', 'niche', 'duration_seconds'],
    },
  },
  {
    name: 'growth_retention_analyze',
    description:
      'Analyze a published video retention curve to find dropout seconds, diagnose cause, and generate a recovery plan with new hook suggestions and edit instructions.',
    input_schema: {
      type: 'object' as const,
      properties: {
        video_id: { type: 'string', description: 'Video ID or URL for reference' },
        platform: { type: 'string', enum: ['instagram', 'tiktok'] },
        niche: { type: 'string' },
        retention_data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              second: { type: 'number' },
              viewer_percent: { type: 'number' },
            },
            required: ['second', 'viewer_percent'],
          },
          description: 'Retention curve data points from Instagram/TikTok analytics',
        },
        duration_seconds: { type: 'number', description: 'Total video duration in seconds' },
        original_hook: { type: 'string', description: 'Original hook text for replacement suggestions' },
      },
      required: ['video_id', 'platform', 'niche', 'retention_data', 'duration_seconds'],
    },
  },
  {
    name: 'growth_retention_predict',
    description:
      'Predict retention BEFORE posting based on hook score, script length, subtitles, and pattern interrupts. Returns predicted 3s retention and completion rate. Use as pre-post gate.',
    input_schema: {
      type: 'object' as const,
      properties: {
        hook: { type: 'string', description: 'Hook text to score and predict from' },
        niche: { type: 'string' },
        platform: { type: 'string', enum: ['instagram', 'tiktok'] },
        script_duration_seconds: { type: 'number' },
        has_subtitles: { type: 'boolean' },
        pattern_interrupt_count: { type: 'number', description: 'Number of zoom/text/cut interrupts in video' },
      },
      required: ['hook', 'niche', 'platform', 'script_duration_seconds'],
    },
  },
  {
    name: 'growth_guarantee_create',
    description:
      'Create a growth guarantee contract for a brand with KPI targets by tier. Tiers: starter (+500 followers/mo), growth (+2K), scale (+5K), authority (+10K). Returns contract with trackable KPIs.',
    input_schema: {
      type: 'object' as const,
      properties: {
        brand_id: { type: 'string' },
        niche: { type: 'string' },
        platform: { type: 'string', enum: ['instagram', 'tiktok', 'both'] },
        tier: { type: 'string', enum: ['starter', 'growth', 'scale', 'authority'] },
        duration_months: { type: 'number', description: 'Contract duration in months (default 1)' },
      },
      required: ['brand_id', 'niche', 'platform', 'tier'],
    },
  },
  {
    name: 'growth_guarantee_gate',
    description:
      'Content quality gate — validates hook score and predicted retention against guarantee thresholds before allowing a post. Blocks substandard content to protect guarantee KPIs.',
    input_schema: {
      type: 'object' as const,
      properties: {
        hook: { type: 'string' },
        niche: { type: 'string' },
        platform: { type: 'string', enum: ['instagram', 'tiktok'] },
        script_duration_seconds: { type: 'number' },
        has_subtitles: { type: 'boolean' },
        pattern_interrupt_count: { type: 'number' },
      },
      required: ['hook', 'niche', 'platform', 'script_duration_seconds'],
    },
  },
  {
    name: 'growth_guarantee_update',
    description: 'Update KPI progress on an active guarantee contract and check if correction cycle should trigger.',
    input_schema: {
      type: 'object' as const,
      properties: {
        contract_id: { type: 'string' },
        current_values: {
          type: 'object',
          description:
            'Current metric values. Keys: followers-gained, engagement-rate, dms-received, leads-generated, sales-closed, reach-per-post',
          additionalProperties: { type: 'number' },
        },
      },
      required: ['contract_id', 'current_values'],
    },
  },
  {
    name: 'growth_guarantee_report',
    description:
      'Generate a weekly progress report for a guarantee contract showing KPI progress bars, correction cycles, and projected end values.',
    input_schema: {
      type: 'object' as const,
      properties: {
        contract_id: { type: 'string' },
      },
      required: ['contract_id'],
    },
  },
  {
    name: 'growth_guarantee_tiers',
    description:
      'List all guarantee tiers with their KPI targets and descriptions. Use to recommend the right tier for a new client.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },

  // ── Data Science: Virality Predictor ─────────────────────────────────────
  {
    name: 'growth_virality_predict',
    description:
      'Predict virality using SIR epidemiology R₀ model + S-curve growth projection. Returns viral coefficient, expected reach multiplier, week 1/4/12 projections, and SHAP-like feature attribution. Use before posting to validate viral potential.',
    input_schema: {
      type: 'object' as const,
      properties: {
        hook_score: { type: 'number', description: 'Hook score 0-10 from growth_hook_score' },
        completion_rate_pct: { type: 'number', description: 'Expected completion rate % (0-100)' },
        save_rate_pct: { type: 'number', description: 'Expected save rate % (0-100)' },
        share_rate_pct: { type: 'number', description: 'Expected share rate % (0-100)' },
        comment_rate_pct: { type: 'number', description: 'Expected comment rate % (0-100)' },
        trend_alignment_score: { type: 'number', description: 'Trend alignment 0-10' },
        posting_timing_score: { type: 'number', description: 'Posting timing score 0-10' },
        format_platform_fit: { type: 'number', description: 'Format fit for platform 0-10' },
        audience_resonance_score: { type: 'number', description: 'Audience resonance 0-10' },
        initial_engagement_velocity: { type: 'number', description: 'Engagements/hour in first hour (0 if pre-post)' },
        niche: { type: 'string', description: 'Content niche' },
        platform: { type: 'string', enum: ['instagram', 'tiktok'] },
        content_type: { type: 'string', enum: ['reel', 'carousel', 'static', 'story'] },
        current_followers: { type: 'number', description: 'Current follower count' },
      },
      required: ['hook_score', 'niche', 'platform', 'content_type', 'current_followers'],
    },
  },
  {
    name: 'growth_virality_early_signals',
    description:
      'Bayesian update of virality prediction using early engagement signals (0-60 min after posting). Returns updated viral probability, recommended action (boost/wait/repurpose), and optimal posting window.',
    input_schema: {
      type: 'object' as const,
      properties: {
        prior_virality_score: { type: 'number', description: 'Virality score from growth_virality_predict (0-100)' },
        minutes_after_post: { type: 'number', description: 'Minutes since posting' },
        current_views: { type: 'number' },
        current_likes: { type: 'number' },
        current_shares: { type: 'number' },
        current_comments: { type: 'number' },
        current_saves: { type: 'number' },
        platform: { type: 'string', enum: ['instagram', 'tiktok'] },
        content_type: { type: 'string', enum: ['reel', 'carousel', 'static', 'story'] },
      },
      required: ['prior_virality_score', 'minutes_after_post', 'current_views', 'platform', 'content_type'],
    },
  },

  // ── Data Science: Sales Funnel Predictor ─────────────────────────────────
  {
    name: 'growth_funnel_simulate',
    description:
      'Monte Carlo sales funnel simulation (1000 iterations). Returns P10/P50/P90 revenue scenarios, LTV/CAC/ROAS, bottleneck identification, sensitivity analysis, and 30/60/90 day projections. Calibrated benchmarks by niche.',
    input_schema: {
      type: 'object' as const,
      properties: {
        niche: { type: 'string' },
        monetization_model: {
          type: 'string',
          enum: [
            'coaching',
            'digital-products',
            'physical-products',
            'services-b2c',
            'services-b2b',
            'saas',
            'affiliate',
            'events',
          ],
          description: 'How the brand monetizes',
        },
        monthly_reach: { type: 'number', description: 'Total accounts reached per month (from Instagram Insights)' },
        avg_order_value: {
          type: 'number',
          description: 'Average sale value in USD (leave blank to use niche benchmark)',
        },
        content_pieces_per_month: { type: 'number', description: 'Number of posts/videos per month' },
        manychat_enabled: { type: 'boolean', description: 'Whether ManyChat automation is active' },
      },
      required: ['niche', 'monetization_model', 'monthly_reach'],
    },
  },

  // ── Data Science: Content Scoring Matrix ─────────────────────────────────
  {
    name: 'growth_content_score',
    description:
      'Score content on 7 dimensions (hook strength 28%, retention architecture 20%, algorithm alignment 18%, audience resonance 14%, conversion potential 10%, production quality 6%, timing 4%). Returns GO/CONDITIONAL/NO-GO decision with quick wins.',
    input_schema: {
      type: 'object' as const,
      properties: {
        niche: { type: 'string' },
        platform: { type: 'string', enum: ['instagram', 'tiktok'] },
        content_format: { type: 'string', enum: ['reel', 'carousel', 'static', 'story', 'live'] },
        hook: { type: 'string', description: 'Opening hook text' },
        hook_score: {
          type: 'number',
          description: 'Pre-computed hook score 0-10 (optional, will estimate if omitted)',
        },
        script_length_seconds: { type: 'number' },
        has_subtitles: { type: 'boolean' },
        pattern_interrupt_count: { type: 'number' },
        has_cta: { type: 'boolean' },
        cta_type: { type: 'string', enum: ['comment-keyword', 'link-in-bio', 'dm-keyword', 'save', 'share'] },
        manychat_keyword: { type: 'string' },
        trend_alignment_score: { type: 'number', description: '0-10' },
        posting_hour: { type: 'number', description: '0-23' },
        posting_day_of_week: { type: 'number', description: '0=Sun, 6=Sat' },
        has_broll: { type: 'boolean' },
        has_color_grade: { type: 'boolean' },
        resolution_hd: { type: 'boolean' },
        audience_resonance_score: { type: 'number' },
        content_pillar: {
          type: 'string',
          enum: ['education', 'entertainment', 'inspiration', 'promotion', 'connection'],
        },
      },
      required: ['niche', 'platform', 'content_format', 'hook'],
    },
  },

  // ── Enhanced Guarantee Models ─────────────────────────────────────────────
  {
    name: 'growth_risk_assess',
    description:
      'Bayesian risk assessment for a guarantee contract. Returns risk score, price multiplier, adjusted monthly price, approval status, and conditions. Covers 6 risk factors including account age, follower base, content budget, ManyChat status.',
    input_schema: {
      type: 'object' as const,
      properties: {
        client_id: { type: 'string' },
        niche: { type: 'string' },
        platform: { type: 'string', enum: ['instagram', 'tiktok', 'both'] },
        tier: { type: 'string', enum: ['nano', 'starter', 'growth', 'scale', 'authority', 'viral', 'elite'] },
        current_followers: { type: 'number' },
        months_active: { type: 'number', description: 'Months the account has been active' },
        has_manychat: { type: 'boolean' },
        monetization_model: {
          type: 'string',
          enum: [
            'coaching',
            'digital-products',
            'physical-products',
            'services-b2c',
            'services-b2b',
            'saas',
            'affiliate',
            'events',
          ],
        },
        budget_for_content: { type: 'number', description: 'Monthly content production budget in USD' },
      },
      required: ['client_id', 'niche', 'platform', 'tier', 'current_followers', 'months_active', 'budget_for_content'],
    },
  },
  {
    name: 'growth_money_back_claim',
    description:
      'Process a money-back claim at end of guarantee period. Auto-determines refund type: full (<25% KPIs met), partial (<50%), none (≥50%). Returns claim with required evidence list and processing timeline.',
    input_schema: {
      type: 'object' as const,
      properties: {
        contract_id: { type: 'string' },
        client_id: { type: 'string' },
        tier: { type: 'string', enum: ['nano', 'starter', 'growth', 'scale', 'authority', 'viral', 'elite'] },
        monthly_price: { type: 'number', description: 'Amount paid this month in USD' },
        kpi_results: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              metric: { type: 'string' },
              achieved: { type: 'number', description: 'Actual value achieved' },
              target: { type: 'number', description: 'Target value from contract' },
            },
            required: ['metric', 'achieved', 'target'],
          },
        },
      },
      required: ['contract_id', 'client_id', 'tier', 'monthly_price', 'kpi_results'],
    },
  },
  {
    name: 'growth_extended_tiers',
    description:
      'List all 7 guarantee tiers including new Nano, Viral, and Elite tiers with KPIs, base prices, performance bond amounts, and eligibility criteria. Use to recommend the right tier and explain money-back thresholds.',
    input_schema: {
      type: 'object' as const,
      properties: {},
    },
  },
];

export const growthTools: Record<string, ToolSpec> = Object.fromEntries(growthToolDefinitions.map((t) => [t.name, t]));

export const executeGrowthTool = async (
  toolName: string,
  input: Record<string, unknown>,
  brand?: BrandProfile,
): Promise<string> => {
  const niche = input.niche as string | undefined as NicheCategory | undefined;
  const platform = (input.platform as 'instagram' | 'tiktok' | 'both' | undefined) ?? 'instagram';

  switch (toolName) {
    case 'growth_ideation_plan': {
      if (!niche) return JSON.stringify({ error: 'niche required' });
      if (!brand) return JSON.stringify({ error: 'brand context required' });
      const plan = await trendIdeationEngine.generateMonthlyPlan(
        niche,
        platform as 'instagram' | 'tiktok' | 'both',
        (input.brand_handle as string) ?? '',
        brand,
      );
      return JSON.stringify({
        month: plan.month,
        total_ideas: plan.ideas.length,
        top_ideas: plan.topIdeas.slice(0, 5).map((i) => ({
          hook: i.hook,
          structure: i.structure,
          conversion_angle: i.conversionAngle,
          priority_score: i.priorityScore,
          manychat_trigger: i.manychatTrigger,
          cta: i.cta,
          rationale: i.rationale,
        })),
        trending_audio: plan.trendingAudio,
        trending_hashtags: plan.trendingHashtags,
        competitor_gaps: plan.competitorGaps.slice(0, 5),
        theme_weeks: plan.themeWeeks.map((w) => ({
          week: w.weekNumber,
          theme: w.theme,
          ideas: w.ideas.length,
          goal: w.conversionGoal,
        })),
      });
    }

    case 'growth_hook_score': {
      const hook = input.hook as string;
      if (!hook || !niche) return JSON.stringify({ error: 'hook and niche required' });
      const result = hookEnforcer.validateAndEnforce(hook, niche);
      return JSON.stringify({
        score: result.score,
        passed: result.passed,
        bias_detected: result.biasDetected,
        issues: result.issues.map((i) => ({ type: i.type, fix: i.fix })),
        improved_hook: result.improvedHook,
        alternatives: result.alternativeHooks,
        block_reason: result.blockReason,
      });
    }

    case 'growth_script_build': {
      const hook = input.hook as string;
      const bodyPoints = input.body_points as string[];
      const goal =
        (input.conversion_goal as 'lead-magnet' | 'dm-sale' | 'link-delivery' | 'discovery-call') ?? 'lead-magnet';
      if (!hook || !bodyPoints || !niche) return JSON.stringify({ error: 'hook, body_points, niche required' });
      const script = hookEnforcer.buildRetentionScript(hook, bodyPoints, niche, goal);
      return JSON.stringify({
        hook: script.hook,
        hook_score: script.hookScore.score,
        hook_passed: script.hookScore.passed,
        body_segments: script.body.map((s) => ({
          text: s.text,
          duration: s.durationEstimate,
          technique: s.retentionTechnique,
        })),
        cta: {
          text: script.cta.ctaText,
          caption: script.cta.captionCTA,
          keyword: script.cta.triggerKeyword,
          bot_reply: script.cta.automationMessage,
        },
        retention_score: script.retentionScore,
        total_duration_seconds: script.totalDurationEstimate,
        passed: script.passed,
        blocking_issues: script.blockingIssues,
      });
    }

    case 'growth_ugc_brief': {
      if (!niche) return JSON.stringify({ error: 'niche required' });
      const hook = input.hook as string;
      const bodyPoints = (input.body_points as string[]) ?? [];
      const script = hookEnforcer.buildRetentionScript(hook, bodyPoints, niche, 'lead-magnet');
      const deadlineDays = typeof input.deadline_days === 'number' ? input.deadline_days : 2;
      const brief = ugcOrchestrator.createBrief(
        input.brand_id as string,
        input.product_name as string,
        (input.product_description as string) ?? '',
        script,
        {
          format: (input.format as '9:16' | '1:1' | '4:5' | '16:9') ?? '9:16',
          minDuration: typeof input.min_duration === 'number' ? input.min_duration : 15,
          maxDuration: typeof input.max_duration === 'number' ? input.max_duration : 60,
          mustShowFace: true,
          mustShowProduct: true,
          mustInclude: [],
          mustAvoid: (input.must_avoid as string[]) ?? [],
        },
        new Date(Date.now() + deadlineDays * 86400000),
        typeof input.budget === 'number' ? input.budget : 150,
      );
      return JSON.stringify({
        brief_id: brief.briefId,
        status: brief.status,
        markdown_brief: ugcOrchestrator.exportBriefAsMarkdown(brief),
        hook_score: script.hookScore.score,
        retention_score: script.retentionScore,
        passed_gate: script.passed,
      });
    }

    case 'growth_ugc_qa': {
      const result = ugcOrchestrator.runQA(
        input.brief_id as string,
        input.video_transcript as string,
        input.duration_seconds as number,
        (input.has_subtitles as boolean) ?? false,
      );
      return JSON.stringify(result);
    }

    case 'growth_postprod_plan': {
      if (!niche) return JSON.stringify({ error: 'niche required' });
      const plan = postProductionEngine.buildPlan(
        input.video_path as string,
        (input.platform as 'instagram' | 'tiktok') ?? 'instagram',
        niche,
        input.duration_seconds as number,
        (input.has_hook as boolean) ?? false,
        input.hook_text as string | undefined,
      );
      return JSON.stringify({
        output_format: plan.outputFormat,
        operations: plan.operations.map((o) => o.type),
        retention_improvement_score: plan.retentionImprovementScore,
        estimated_edit_minutes: plan.estimatedEditTimeMinutes,
        automation_tool: plan.automationTool,
        capcut_instructions: plan.capcutInstructions,
      });
    }

    case 'growth_retention_analyze': {
      if (!niche) return JSON.stringify({ error: 'niche required' });
      const rawData = input.retention_data as Array<{ second: number; viewer_percent: number }>;
      const dataPoints = rawData.map((d) => ({ second: d.second, viewerPercent: d.viewer_percent }));
      const diagnosis = retentionAnalyzer.analyzeRetentionCurve(
        input.video_id as string,
        (input.platform as 'instagram' | 'tiktok') ?? 'instagram',
        niche,
        dataPoints,
        input.duration_seconds as number,
        input.original_hook as string | undefined,
      );
      return JSON.stringify({
        score: diagnosis.overallScore,
        hook_3s_retention: diagnosis.hook3SecRetention,
        midpoint_retention: diagnosis.midpointRetention,
        completion_rate: diagnosis.completionRate,
        avg_watch_time: diagnosis.avgWatchTime,
        primary_dropoff: diagnosis.primaryDropoff
          ? {
              second: diagnosis.primaryDropoff.second,
              drop_percent: diagnosis.primaryDropoff.dropPercent,
              cause: diagnosis.primaryDropoff.cause,
              severity: diagnosis.primaryDropoff.severity,
            }
          : null,
        failing_kpis: diagnosis.failingKPIs,
        recovery: diagnosis.recovery
          ? {
              action: diagnosis.recovery.primaryAction,
              urgency: diagnosis.recovery.urgency,
              expected_lift: diagnosis.recovery.expectedRetentionLift,
              new_hook_suggestions: diagnosis.recovery.newHookSuggestions,
              thumbnail_note: diagnosis.recovery.newThumbnailNote,
              edit_instructions: diagnosis.recovery.editInstructions,
              hours_to_fix: diagnosis.recovery.estimatedImplementationHours,
            }
          : null,
      });
    }

    case 'growth_retention_predict': {
      if (!niche) return JSON.stringify({ error: 'niche required' });
      const hook = input.hook as string;
      const hs = hookEnforcer.validateAndEnforce(hook, niche);
      const pred = retentionAnalyzer.predictRetentionBeforePosting(
        hs.score,
        input.script_duration_seconds as number,
        (input.has_subtitles as boolean) ?? false,
        typeof input.pattern_interrupt_count === 'number' ? input.pattern_interrupt_count : 0,
        (input.platform as 'instagram' | 'tiktok') ?? 'instagram',
      );
      return JSON.stringify({
        hook_score: hs.score,
        hook_passed: hs.passed,
        predicted_3s_retention: pred.predicted3sRetention,
        predicted_completion_rate: pred.predictedCompletionRate,
        passes_gate: pred.passesGate,
        improved_hook: hs.passed ? null : hs.improvedHook,
      });
    }

    case 'growth_guarantee_create': {
      if (!niche) return JSON.stringify({ error: 'niche required' });
      const g = growthGuaranteeEngine.createGuarantee(
        input.brand_id as string,
        niche,
        platform as 'instagram' | 'tiktok' | 'both',
        (input.tier as GuaranteeTier) ?? 'growth',
        typeof input.duration_months === 'number' ? input.duration_months : 1,
      );
      return JSON.stringify({
        contract_id: g.contractId,
        tier: g.tier,
        status: g.status,
        start_date: g.startDate,
        end_date: g.endDate,
        kpis: g.kpis,
      });
    }

    case 'growth_guarantee_gate': {
      if (!niche) return JSON.stringify({ error: 'niche required' });
      const gate = growthGuaranteeEngine.gateContent(
        input.hook as string,
        niche,
        (input.platform as 'instagram' | 'tiktok') ?? 'instagram',
        input.script_duration_seconds as number,
        (input.has_subtitles as boolean) ?? false,
        typeof input.pattern_interrupt_count === 'number' ? input.pattern_interrupt_count : 0,
      );
      return JSON.stringify(gate);
    }

    case 'growth_guarantee_update': {
      const rawVals = input.current_values as Record<string, number>;
      const vals = Object.fromEntries(Object.entries(rawVals).map(([k, v]) => [k as KPIMetric, v])) as Partial<
        Record<KPIMetric, number>
      >;
      const g = growthGuaranteeEngine.updateProgress(input.contract_id as string, vals);
      return JSON.stringify({
        contract_id: g.contractId,
        status: g.status,
        progress: g.currentProgress.map((p) => ({
          metric: p.kpi.metric,
          current: p.currentValue,
          target: p.kpi.targetMonthly,
          percent: p.percentToTarget,
          trend: p.trend,
          projected: p.projectedEndValue,
        })),
      });
    }

    case 'growth_guarantee_report': {
      const report = growthGuaranteeEngine.generateWeeklyReport(input.contract_id as string);
      return JSON.stringify({ report });
    }

    case 'growth_guarantee_tiers': {
      return JSON.stringify(growthGuaranteeEngine.listTiers());
    }

    // ── Virality Predictor ──────────────────────────────────────────────────
    case 'growth_virality_predict': {
      if (!niche) return JSON.stringify({ error: 'niche required' });
      const features = {
        hookScore: typeof input.hook_score === 'number' ? input.hook_score : 5,
        completionRatePct: typeof input.completion_rate_pct === 'number' ? input.completion_rate_pct : 35,
        saveRatePct: typeof input.save_rate_pct === 'number' ? input.save_rate_pct : 3,
        shareRatePct: typeof input.share_rate_pct === 'number' ? input.share_rate_pct : 2,
        commentRatePct: typeof input.comment_rate_pct === 'number' ? input.comment_rate_pct : 1,
        trendAlignmentScore: typeof input.trend_alignment_score === 'number' ? input.trend_alignment_score : 5,
        postingTimingScore: typeof input.posting_timing_score === 'number' ? input.posting_timing_score : 5,
        formatPlatformFit: typeof input.format_platform_fit === 'number' ? input.format_platform_fit : 7,
        audienceResonanceScore: typeof input.audience_resonance_score === 'number' ? input.audience_resonance_score : 5,
        initialEngagementVelocity:
          typeof input.initial_engagement_velocity === 'number' ? input.initial_engagement_velocity : 0,
      };
      // 'static' → 'post' (viralityPredictor uses 'reel'|'carousel'|'story'|'post')
      const rawCt = input.content_type as string;
      const viralContentType = (rawCt === 'static' ? 'post' : (rawCt ?? 'reel')) as
        | 'reel'
        | 'carousel'
        | 'story'
        | 'post';
      const prediction = viralityPredictor.predict(
        features,
        niche,
        platform as 'instagram' | 'tiktok',
        viralContentType,
        typeof input.current_followers === 'number' ? input.current_followers : 1000,
      );
      return JSON.stringify({
        virality_score: prediction.viralProbabilityScore,
        r0: prediction.viralCoefficient.R0,
        r0_interpretation: prediction.viralCoefficient.interpretation,
        reach_multiplier: prediction.viralCoefficient.expectedReachMultiplier,
        viral_threshold_met: prediction.viralCoefficient.viralThresholdMet,
        projections: {
          week_1_followers: prediction.growthProjection.week1Followers,
          week_4_followers: prediction.growthProjection.week4Followers,
          week_12_followers: prediction.growthProjection.week12Followers,
          confidence_interval_week12: prediction.growthProjection.confidenceInterval,
        },
        top_attribution: prediction.featureAttribution
          .sort((a: { contribution: number }, b: { contribution: number }) => b.contribution - a.contribution)
          .slice(0, 3)
          .map((a: { feature: string; contribution: number; improvementPotential: number }) => ({
            feature: a.feature,
            contribution_pct: a.contribution,
            improvement_potential: a.improvementPotential,
          })),
        recommendation: prediction.recommendation,
        blocking_factors: prediction.blockingFactors,
        boosting_factors: prediction.boostingFactors,
        predicted_peak_reach: prediction.predictedPeakReach,
        content_half_life_hours: prediction.halfLife.halfLifeHours,
        viral_window_hours: prediction.halfLife.viralWindowHours,
      });
    }

    case 'growth_virality_early_signals': {
      const priorScore = typeof input.prior_virality_score === 'number' ? input.prior_virality_score : 50;
      const minutesAfter = typeof input.minutes_after_post === 'number' ? input.minutes_after_post : 30;
      const views = typeof input.current_views === 'number' ? input.current_views : 0;
      const likes = typeof input.current_likes === 'number' ? input.current_likes : 0;
      const shares = typeof input.current_shares === 'number' ? input.current_shares : 0;
      const comments = typeof input.current_comments === 'number' ? input.current_comments : 0;
      const saves = typeof input.current_saves === 'number' ? input.current_saves : 0;
      // Build a minimal ViralityPrediction stub (method only reads .viralProbabilityScore)
      const priorPredStub = { viralProbabilityScore: priorScore } as Parameters<
        typeof viralityPredictor.updateWithEarlySignals
      >[0];
      const likesPerMin = minutesAfter > 0 ? likes / minutesAfter : likes;
      const commentsPerMin = minutesAfter > 0 ? comments / minutesAfter : comments;
      const sharesPerMin = minutesAfter > 0 ? shares / minutesAfter : shares;
      const savesPerMin = minutesAfter > 0 ? saves / minutesAfter : saves;
      const update = viralityPredictor.updateWithEarlySignals(
        priorPredStub,
        minutesAfter,
        likesPerMin,
        commentsPerMin,
        sharesPerMin,
        savesPerMin,
      );
      return JSON.stringify({
        updated_viral_probability: update.updatedViralProbability,
        updated_r0: update.updatedR0,
        recommended_action: update.recommendation,
        likes_per_min: parseFloat(likesPerMin.toFixed(2)),
        shares_per_min: parseFloat(sharesPerMin.toFixed(2)),
        saves_per_min: parseFloat(savesPerMin.toFixed(2)),
        total_views: views,
      });
    }

    // ── Sales Funnel Predictor ──────────────────────────────────────────────
    case 'growth_funnel_simulate': {
      if (!niche) return JSON.stringify({ error: 'niche required' });
      const config = salesFunnelPredictor.buildConfig(
        niche,
        (input.monetization_model as MonetizationModel) ?? 'coaching',
        typeof input.monthly_reach === 'number' ? input.monthly_reach : 10000,
        typeof input.content_pieces_per_month === 'number' ? input.content_pieces_per_month : 20,
        typeof input.manychat_enabled === 'boolean' ? input.manychat_enabled : true,
        typeof input.avg_order_value === 'number' ? input.avg_order_value : undefined,
      );
      const sim = salesFunnelPredictor.simulate(config);
      const contentCost = config.contentPiecesPerMonth * 150;
      const proj = salesFunnelPredictor.project30_60_90(config, sim.monthlyProjection, contentCost);
      return JSON.stringify({
        funnel_stages: sim.stageResults.map((s) => ({
          stage: s.stageName,
          input_volume: s.inputVolume,
          output_volume: s.outputVolume,
          conversion_rate_pct: parseFloat((s.conversionRate * 100).toFixed(1)),
          bottleneck: s.bottleneck,
        })),
        monthly_revenue: {
          p10: sim.monthlyProjection.p10Revenue,
          p50: sim.monthlyProjection.p50Revenue,
          p90: sim.monthlyProjection.p90Revenue,
          ci95: sim.monthlyProjection.confidenceInterval95,
        },
        annual_revenue: {
          p10: sim.annualProjection.p10Revenue,
          p50: sim.annualProjection.p50Revenue,
          p90: sim.annualProjection.p90Revenue,
        },
        customer_economics: {
          ltv_12m: sim.customerLTV.ltv12Months,
          cac: sim.cac,
          ltv_cac_ratio: sim.customerLTV.ltvToCacRatio,
          roas: sim.roas,
          payback_months: sim.customerLTV.paybackPeriodMonths,
        },
        bottleneck_stage: sim.bottleneckStage,
        bottleneck_fix: sim.bottleneckFix,
        top_sensitivities: sim.sensitivityAnalysis.slice(0, 3).map((s) => ({
          variable: s.variable,
          elasticity: s.elasticity,
          priority: s.priority,
        })),
        projections_30_60_90: proj,
        revenue_levers: sim.revenueLevers.slice(0, 3).map((l) => ({
          lever: l.lever,
          potential_monthly_impact: l.potentialImpact,
          effort: l.effort,
          recommendation: l.recommendation,
        })),
        report: salesFunnelPredictor.formatReport(sim),
      });
    }

    // ── Content Scoring Matrix ──────────────────────────────────────────────
    case 'growth_content_score': {
      if (!niche) return JSON.stringify({ error: 'niche required' });
      const scoringInput = {
        niche,
        platform: (input.platform as 'instagram' | 'tiktok') ?? 'instagram',
        contentFormat: (input.content_format as 'reel' | 'carousel' | 'static' | 'story' | 'live') ?? 'reel',
        hook: (input.hook as string) ?? '',
        hookScore: typeof input.hook_score === 'number' ? input.hook_score : undefined,
        scriptLengthSeconds: typeof input.script_length_seconds === 'number' ? input.script_length_seconds : undefined,
        hasSubtitles: typeof input.has_subtitles === 'boolean' ? input.has_subtitles : undefined,
        patternInterruptCount:
          typeof input.pattern_interrupt_count === 'number' ? input.pattern_interrupt_count : undefined,
        hasCTA: typeof input.has_cta === 'boolean' ? input.has_cta : undefined,
        ctaType: input.cta_type as 'comment-keyword' | 'link-in-bio' | 'dm-keyword' | 'save' | 'share' | undefined,
        manychatKeyword: input.manychat_keyword as string | undefined,
        trendAlignmentScore: typeof input.trend_alignment_score === 'number' ? input.trend_alignment_score : undefined,
        postingHour: typeof input.posting_hour === 'number' ? input.posting_hour : undefined,
        postingDayOfWeek: typeof input.posting_day_of_week === 'number' ? input.posting_day_of_week : undefined,
        hasBroll: typeof input.has_broll === 'boolean' ? input.has_broll : undefined,
        hasColorGrade: typeof input.has_color_grade === 'boolean' ? input.has_color_grade : undefined,
        resolutionHD: typeof input.resolution_hd === 'boolean' ? input.resolution_hd : undefined,
        audienceResonanceScore:
          typeof input.audience_resonance_score === 'number' ? input.audience_resonance_score : undefined,
        contentPillar: input.content_pillar as
          | 'education'
          | 'entertainment'
          | 'inspiration'
          | 'promotion'
          | 'connection'
          | undefined,
      };
      // Compute hookScore from hookEnforcer if not provided
      if (scoringInput.hookScore === undefined && scoringInput.hook) {
        const hs = hookEnforcer.validateAndEnforce(scoringInput.hook, niche);
        scoringInput.hookScore = hs.score;
      }
      const result = scoreContent(scoringInput);
      return JSON.stringify({
        total_score: result.totalScore,
        decision: result.decision,
        composite_label: result.compositeLabel,
        dimensions: result.dimensions.map((d) => ({
          dimension: d.dimension,
          score: d.score,
          weight_pct: Math.round(d.weight * 100),
          weighted_contribution: d.weightedScore,
          issues: d.criticalIssues,
          improvements: d.improvements,
        })),
        top_blocker: result.topBlocker,
        quick_wins: result.quickWins,
        estimated_engagement_range: result.estimatedEngagementRange,
        estimated_reach_multiplier: result.estimatedReachMultiplier,
        posting_recommendation: result.postingRecommendation,
        formatted_report: formatContentScore(result),
      });
    }

    // ── Enhanced Guarantee Models ───────────────────────────────────────────
    case 'growth_risk_assess': {
      if (!niche) return JSON.stringify({ error: 'niche required' });
      const assessment = assessRisk(
        input.client_id as string,
        niche,
        platform as 'instagram' | 'tiktok' | 'both',
        (input.tier as ExtendedGuaranteeTier) ?? 'growth',
        typeof input.current_followers === 'number' ? input.current_followers : 0,
        typeof input.months_active === 'number' ? input.months_active : 6,
        typeof input.has_manychat === 'boolean' ? input.has_manychat : false,
        (input.monetization_model as MonetizationModel) ?? 'coaching',
        typeof input.budget_for_content === 'number' ? input.budget_for_content : 0,
      );
      return JSON.stringify({
        risk_score: assessment.overallRiskScore,
        risk_category: assessment.riskCategory,
        approval_status: assessment.approvalStatus,
        price_multiplier: assessment.priceMultiplier,
        adjusted_monthly_price: assessment.adjustedMonthlyPrice,
        recommended_tier: assessment.recommendedTier,
        risk_factors: assessment.riskFactors.map((f) => ({
          factor: f.factor,
          level: f.riskLevel,
          mitigation: f.mitigation,
          required: f.mitigationRequired,
        })),
        conditions: assessment.conditions,
      });
    }

    case 'growth_money_back_claim': {
      const kpiResults = (input.kpi_results as Array<{ metric: string; achieved: number; target: number }>).map(
        (k) => ({
          metric: k.metric as KPIMetric,
          achieved: k.achieved,
          target: k.target,
        }),
      );
      const claim = processMoneyBackClaim(
        input.contract_id as string,
        input.client_id as string,
        (input.tier as ExtendedGuaranteeTier) ?? 'growth',
        typeof input.monthly_price === 'number' ? input.monthly_price : 0,
        kpiResults,
      );
      return JSON.stringify({
        claim_id: claim.claimId,
        kpi_achievement_pct: claim.kpiAchievementPct,
        refund_type: claim.refundType,
        refund_amount: claim.refundAmount,
        refund_reason: claim.refundReason,
        evidence_required: claim.evidenceRequired,
        processing_days: claim.processingDays,
        status: claim.status,
      });
    }

    case 'growth_extended_tiers': {
      return JSON.stringify(
        listAllTiers().map((t) => ({
          tier: t.tier,
          display_name: t.displayName,
          description: t.description,
          base_monthly_price: t.baseMonthlyPrice,
          performance_bond: t.performanceBond,
          money_back: t.moneyBackThreshold,
          kpis: t.kpis.map((k) => ({ metric: k.metric, target: k.targetMonthly, unit: k.unit })),
          eligibility: t.eligibilityCriteria,
        })),
      );
    }

    default:
      return JSON.stringify({ error: `Unknown growth tool: ${toolName}` });
  }
};
