/**
 * Design Master Orchestrator — FeedIA Brain's Design Core
 *
 * Armoniza:
 * 1. Canva Specialist Agent (diseño + branding expertise)
 * 2. Computer Use + Canva (CU-aware design execution)
 * 3. Studio Tools (fallback + direct-to-tool guidance)
 *
 * Decision tree:
 * - User: "Carrusel sobre productividad"
 * - Consulta Canva Specialist → design spec
 * - ¿CU enabled? → CU ejecuta en Canva
 * - ¿CU disabled? → Inyecta insights en Studio tools
 * - Always: Retroalimenta al brain con resultados
 */

import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import {
  consultCanvaSpecialist,
  type DesignBrief,
  type CanvaDesignSpec,
} from '../agent/specialists/canvaSpecialist.js';
import {
  planCanvaDesign,
  injectCanvaInsightsToStudio,
  type CuCanvaContext,
  type CuCanvaPlan,
} from '../../capabilities/computerUse/cuCanvaBridge.js';
import {
  enrichCarouselDesigner,
  enrichReelGenerator,
  enrichTikTokVideo,
  enrichStoryTool,
  enrichTikTokPhoto,
  enrichTikTokScript,
  type StudioContext,
} from '../../capabilities/studioTools/canvaInsightsInjector.js';

export interface DesignWorkflow {
  instruction: string;
  format: 'carousel' | 'reel' | 'story' | 'tiktok-video' | 'tiktok-photo' | 'tiktok-script';
  platform: 'instagram' | 'tiktok';
  brand?: BrandProfile;
  useComputerUse?: boolean; // default: true if enabled
  slideCount?: number; // for carousel
}

export interface DesignExecutionPlan {
  workflowId: string;
  designSpec: CanvaDesignSpec;
  executionMode: 'computer-use' | 'studio-tools' | 'hybrid';
  cuPlan?: CuCanvaPlan; // if CU mode
  studioInsights?: Record<string, unknown>; // if Studio mode
  reasoning: string[];
  estimatedDurationMs: number;
}

export interface DesignResult {
  workflowId: string;
  success: boolean;
  format: string;
  platform: string;
  outputPath?: string;
  executionMode: string;
  durationMs: number;
  designQualityScore?: number; // 0-100
  feedback: string[];
}

// ── Main orchestration ────────────────────────────────────────────────────

export const orchestrateDesignWorkflow = async (
  workflow: DesignWorkflow,
  cuEnabled: boolean = true,
): Promise<DesignExecutionPlan> => {
  const workflowId = `design-${Date.now()}`;

  log.info(
    `[Design Master] Orchestrating: ${workflow.instruction} (${workflow.format}/${workflow.platform})`,
  );

  // 1. Consult Canva Specialist
  const brief: DesignBrief = {
    format: workflow.format,
    platform: workflow.platform,
    topic: workflow.instruction,
    tone: workflow.brand?.voice?.tone || ['professional'],
    contentType: 'value', // default, can refine
    brand: workflow.brand,
  };

  const designSpec = await consultCanvaSpecialist(brief);

  // 2. Decide execution mode
  const executionMode = workflow.useComputerUse !== false && cuEnabled ? 'computer-use' : 'studio-tools';

  const reasoning = [`Format: ${workflow.format}`, `Platform: ${workflow.platform}`, `Mode: ${executionMode}`];

  let estimatedDurationMs = 10000; // baseline
  let cuPlan: CuCanvaPlan | undefined;
  let studioInsights: Record<string, unknown> | undefined;

  // 3. Plan execution
  if (executionMode === 'computer-use') {
    log.info(`[Design Master] Planning CU-Canva execution`);

    const cuContext: CuCanvaContext = {
      instruction: workflow.instruction,
      format: workflow.format,
      platform: workflow.platform,
      brand: workflow.brand,
      slideCount: workflow.slideCount,
    };

    cuPlan = await planCanvaDesign(workflow.instruction, cuContext);
    estimatedDurationMs = cuPlan.estimatedDurationMs;
    reasoning.push(...cuPlan.reasoning);
  } else {
    log.info(`[Design Master] Planning Studio tools enrichment`);

    const studioContext: StudioContext = {
      topic: workflow.instruction,
      brand: workflow.brand,
      tone: workflow.brand?.voice?.tone || ['professional'],
      contentType: 'value',
    };

    // Enrich appropriate studio tool
    switch (workflow.format) {
      case 'carousel':
        studioInsights = {
          slides: await enrichCarouselDesigner(studioContext, workflow.slideCount || 10),
        };
        estimatedDurationMs = 5000;
        break;

      case 'reel':
        studioInsights = {
          reelGuidance: await enrichReelGenerator(studioContext),
        };
        estimatedDurationMs = 4000;
        break;

      case 'story':
        studioInsights = {
          storyGuidance: await enrichStoryTool(studioContext),
        };
        estimatedDurationMs = 3000;
        break;

      case 'tiktok-video':
        studioInsights = {
          tiktokVideoGuidance: await enrichTikTokVideo(studioContext),
        };
        estimatedDurationMs = 4000;
        break;

      case 'tiktok-photo':
        studioInsights = {
          tiktokPhotoGuidance: await enrichTikTokPhoto(studioContext),
        };
        estimatedDurationMs = 2000;
        break;

      case 'tiktok-script':
        studioInsights = {
          tiktokScriptGuidance: await enrichTikTokScript(studioContext),
        };
        estimatedDurationMs = 2000;
        break;
    }

    reasoning.push(`Studio insights injected`);
  }

  return {
    workflowId,
    designSpec,
    executionMode,
    cuPlan,
    studioInsights,
    reasoning,
    estimatedDurationMs,
  };
};

// ── Execute plan (stub: actual execution depends on CU/Studio implementation) ──

export const executeDesignWorkflow = async (
  plan: DesignExecutionPlan,
): Promise<DesignResult> => {
  const startTime = Date.now();

  log.info(`[Design Master] Executing workflow ${plan.workflowId} (${plan.executionMode})`);

  // TODO: Actual execution
  // - If CU: call CU executor with plan.cuPlan.cuActions
  // - If Studio: return plan.studioInsights to UI

  const result: DesignResult = {
    workflowId: plan.workflowId,
    success: true,
    format: plan.designSpec.dimensions.width + 'x' + plan.designSpec.dimensions.height,
    platform: plan.executionMode,
    outputPath: '/designs/latest.png',
    executionMode: plan.executionMode,
    durationMs: Date.now() - startTime,
    designQualityScore: 85, // TODO: compute from actual output
    feedback: [
      `Design: ${plan.designSpec.layout.pattern} layout`,
      `Colors: ${plan.designSpec.colorPalette.primary}`,
      `Animation: ${plan.designSpec.animation.style}`,
    ],
  };

  return result;
};

// ── Feedback loop: learn from results ──────────────────────────────────────

export const feedbackDesignResult = async (
  result: DesignResult,
  userFeedback?: { quality: number; notes: string },
): Promise<void> => {
  log.info(`[Design Master] Feedback: ${result.workflowId} score=${result.designQualityScore}`);

  if (userFeedback) {
    log.info(`[Design Master] User feedback: ${userFeedback.quality}/100 - ${userFeedback.notes}`);

    // TODO: Update brain memory with success/failure patterns
    // - If score > 85: pattern works well, suggest reuse
    // - If score < 60: pattern needs refinement
    // - Inject learnings into Canva Specialist's pattern library
  }

  // TODO: Retroalimenta al brain:
  // recordEpisodicMemory(workflowId, result);
  // updateDesignPatternRatings(result);
};

// ── Integration: Brain calls orchestrator ────────────────────────────────

export const designMasterAPI = {
  orchestrate: orchestrateDesignWorkflow,
  execute: executeDesignWorkflow,
  feedback: feedbackDesignResult,
};
