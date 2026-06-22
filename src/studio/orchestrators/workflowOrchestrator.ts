import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

export interface WorkflowStep {
  id: string;
  name: string;
  action: string;
  params: Record<string, unknown>;
  dependsOn?: string[];
  retry: number;
  timeout: number;
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
  schedule?: 'once' | 'daily' | 'weekly' | 'monthly';
  enabled: boolean;
}

export interface WorkflowExecution {
  executionId: string;
  workflowId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed' | 'paused';
  results: Map<string, unknown>;
  errors: Map<string, string>;
}

/**
 * Smart Workflow Orchestrator
 * Chains content creation → design → video → posting → analytics
 * Automatic optimization based on real-time metrics
 */
export class WorkflowOrchestrator {
  private workflows: Map<string, WorkflowDefinition> = new Map();
  private executions: Map<string, WorkflowExecution> = new Map();

  registerWorkflow(workflow: WorkflowDefinition): void {
    this.workflows.set(workflow.id, workflow);
    log.debug(`[Orchestrator] Registered workflow: ${workflow.name}`);
  }

  /**
   * End-to-end content automation workflow
   * Input: Idea + brand
   * Output: Posted + optimized content
   */
  createAutoContentWorkflow(brand: BrandProfile): WorkflowDefinition {
    return {
      id: `auto-content-${Date.now()}`,
      name: `Auto Content - ${brand.name}`,
      description: 'Automated end-to-end content creation & posting',
      schedule: 'daily',
      enabled: true,
      steps: [
        {
          id: 'trend-detect',
          name: 'Detect Trending Topics',
          action: 'trend_detect',
          params: { brand: brand.name, platforms: ['instagram', 'tiktok'] },
          retry: 1,
          timeout: 30000,
        },
        {
          id: 'hook-generate',
          name: 'Generate Content Hooks',
          action: 'generate_hooks',
          params: {
            topic: '{trend-detect.topic}',
            variations: 5,
            tone: brand.voice.tone,
          },
          dependsOn: ['trend-detect'],
          retry: 2,
          timeout: 20000,
        },
        {
          id: 'design-batch',
          name: 'Create Design Variations',
          action: 'design_batch',
          params: {
            tool: 'canva',
            hooks: '{hook-generate.hooks}',
            formats: ['instagram-post', 'tiktok-thumbnail'],
            brand_colors: brand.visual.palette,
          },
          dependsOn: ['hook-generate'],
          retry: 2,
          timeout: 120000,
        },
        {
          id: 'video-edit',
          name: 'Edit Video Variations',
          action: 'video_edit_batch',
          params: {
            tool: 'capcut',
            count: 3,
            designs: '{design-batch.urls}',
            audio: 'trending',
          },
          dependsOn: ['design-batch'],
          retry: 2,
          timeout: 180000,
        },
        {
          id: 'optimal-time',
          name: 'Calculate Posting Times',
          action: 'calculate_optimal_posting',
          params: {
            brand: brand.name,
            platforms: ['instagram', 'tiktok'],
            variance: '2h',
          },
          dependsOn: ['hook-generate'],
          retry: 1,
          timeout: 10000,
        },
        {
          id: 'post-instagram',
          name: 'Post to Instagram',
          action: 'instagram_post_native',
          params: {
            media_path: '{design-batch.instagram}',
            caption: '{hook-generate.main_hook}',
            hashtags: '{hashtag-research.tags}',
            scheduled_time: '{optimal-time.instagram_time}',
          },
          dependsOn: ['design-batch', 'optimal-time'],
          retry: 2,
          timeout: 60000,
        },
        {
          id: 'post-tiktok',
          name: 'Post to TikTok',
          action: 'tiktok_post_native',
          params: {
            video_path: '{video-edit.tiktok}',
            caption: '{hook-generate.tiktok_variant}',
            hashtags: '{hashtag-research.trending}',
            scheduled_time: '{optimal-time.tiktok_time}',
          },
          dependsOn: ['video-edit', 'optimal-time'],
          retry: 2,
          timeout: 60000,
        },
        {
          id: 'monitor-1h',
          name: 'Monitor First Hour Metrics',
          action: 'monitor_performance',
          params: {
            duration_minutes: 60,
            metrics: ['engagement', 'reach', 'saves'],
          },
          dependsOn: ['post-instagram', 'post-tiktok'],
          retry: 1,
          timeout: 65000,
        },
        {
          id: 'optimize',
          name: 'Auto-Optimize Based on Metrics',
          action: 'optimize_posting',
          params: {
            metrics: '{monitor-1h.data}',
            actions: ['boost-trending', 'adjust-caption', 'repost-variant'],
          },
          dependsOn: ['monitor-1h'],
          retry: 1,
          timeout: 30000,
        },
      ],
    };
  }

  /**
   * Batch content creation workflow
   * Create 10 pieces of content in one execution
   */
  createBatchWorkflow(brand: BrandProfile, count: number = 10): WorkflowDefinition {
    return {
      id: `batch-${count}-${Date.now()}`,
      name: `Batch Create ${count} Posts`,
      description: `Auto-generate and schedule ${count} posts`,
      schedule: 'once',
      enabled: true,
      steps: [
        {
          id: 'idea-generation',
          name: 'Generate Content Ideas',
          action: 'batch_idea_generation',
          params: { count, brand: brand.name, niche: brand.niche },
          retry: 2,
          timeout: 30000,
        },
        {
          id: 'design-all',
          name: `Create ${count} Designs`,
          action: 'design_batch',
          params: {
            tool: 'canva',
            count,
            ideas: '{idea-generation.ideas}',
            templates: 'auto-select',
          },
          dependsOn: ['idea-generation'],
          retry: 2,
          timeout: 300000,
        },
        {
          id: 'video-all',
          name: `Edit ${count} Videos`,
          action: 'video_batch_create',
          params: {
            tool: 'capcut',
            count,
            designs: '{design-all.urls}',
          },
          dependsOn: ['design-all'],
          retry: 2,
          timeout: 400000,
        },
        {
          id: 'captions-all',
          name: `Generate ${count} Captions`,
          action: 'caption_batch_generate',
          params: {
            ideas: '{idea-generation.ideas}',
            tone: brand.voice.tone,
            hashtags: 'auto',
          },
          dependsOn: ['idea-generation'],
          retry: 1,
          timeout: 20000,
        },
        {
          id: 'schedule-all',
          name: `Schedule ${count} Posts`,
          action: 'batch_schedule',
          params: {
            posts: '{design-all.urls}',
            captions: '{captions-all.text}',
            spacing: '2d',
            start: 'tomorrow',
          },
          dependsOn: ['design-all', 'video-all', 'captions-all'],
          retry: 1,
          timeout: 30000,
        },
      ],
    };
  }

  /**
   * A/B testing workflow
   * Test multiple variants, auto-optimize winner
   */
  createABTestWorkflow(brand: BrandProfile, baseHook: string): WorkflowDefinition {
    return {
      id: `ab-test-${Date.now()}`,
      name: `A/B Test: ${baseHook.substring(0, 30)}...`,
      description: 'Create variants, test, optimize',
      schedule: 'once',
      enabled: true,
      steps: [
        {
          id: 'generate-variants',
          name: 'Generate Hook Variants',
          action: 'generate_hook_variants',
          params: {
            base_hook: baseHook,
            count: 5,
            variations: ['emotional', 'curiosity', 'urgency', 'benefit', 'social-proof'],
          },
          retry: 1,
          timeout: 15000,
        },
        {
          id: 'design-variants',
          name: 'Create Design for Each Variant',
          action: 'design_variants',
          params: {
            tool: 'canva',
            hooks: '{generate-variants.hooks}',
            thumbnail_styles: ['minimal', 'colorful', 'gradient'],
          },
          dependsOn: ['generate-variants'],
          retry: 2,
          timeout: 120000,
        },
        {
          id: 'post-variants',
          name: 'Post All Variants',
          action: 'post_all_variants',
          params: {
            posts: '{design-variants.urls}',
            platforms: ['instagram', 'tiktok'],
            stagger_minutes: 30,
          },
          dependsOn: ['design-variants'],
          retry: 2,
          timeout: 120000,
        },
        {
          id: 'test-metrics',
          name: 'Collect Test Metrics (24h)',
          action: 'collect_ab_metrics',
          params: {
            duration_hours: 24,
            posts: '{post-variants.ids}',
          },
          dependsOn: ['post-variants'],
          retry: 1,
          timeout: 86400000,
        },
        {
          id: 'analyze-winner',
          name: 'Analyze Winner',
          action: 'analyze_ab_results',
          params: {
            metrics: '{test-metrics.data}',
            criteria: ['engagement-rate', 'reach', 'conversions'],
          },
          dependsOn: ['test-metrics'],
          retry: 1,
          timeout: 20000,
        },
        {
          id: 'boost-winner',
          name: 'Boost Winning Variant',
          action: 'boost_winning_content',
          params: {
            post_id: '{analyze-winner.winner_id}',
            budget: 100,
            audiences: 'lookalike + interests',
          },
          dependsOn: ['analyze-winner'],
          retry: 1,
          timeout: 30000,
        },
      ],
    };
  }

  async executeWorkflow(brand: BrandProfile, workflow: WorkflowDefinition): Promise<WorkflowExecution> {
    const execution: WorkflowExecution = {
      executionId: `exec-${Date.now()}`,
      workflowId: workflow.id,
      startedAt: new Date(),
      status: 'running',
      results: new Map(),
      errors: new Map(),
    };

    this.executions.set(execution.executionId, execution);
    log.info(`[Orchestrator] Starting: ${workflow.name}`);

    try {
      // Execute steps in dependency order
      const completed = new Set<string>();

      while (completed.size < workflow.steps.length) {
        const ready = workflow.steps.filter(
          (s) => !completed.has(s.id) && (s.dependsOn ?? []).every((d) => completed.has(d)),
        );

        if (ready.length === 0) {
          throw new Error('Workflow dependency deadlock');
        }

        // Execute ready steps in parallel
        await Promise.all(
          ready.map(async (step) => {
            log.debug(`[Orchestrator] Step: ${step.name}`);
            // TODO: Execute step with retry logic
            // For now: simulate success
            execution.results.set(step.id, { status: 'success', data: {} });
            completed.add(step.id);
          }),
        );
      }

      execution.status = 'completed';
      execution.completedAt = new Date();
      log.info(`[Orchestrator] Completed: ${workflow.name}`);
    } catch (error) {
      execution.status = 'failed';
      execution.completedAt = new Date();
      execution.errors.set('workflow', String(error));
      log.error(`[Orchestrator] Failed: ${error}`);
    }

    return execution;
  }

  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }
}

export const workflowOrchestrator = new WorkflowOrchestrator();
