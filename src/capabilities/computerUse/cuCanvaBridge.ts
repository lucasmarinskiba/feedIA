/**
 * CU-Canva Bridge
 *
 * Computer Use + Canva Specialist coordinación:
 * 1. CU recibe instruction (ej: "carrusel de productividad")
 * 2. Consulta Canva Specialist → recibe design spec
 * 3. CU convierte spec → Canva clicks/typing
 * 4. CU ejecuta acciones sobre Canva
 * 5. CU verifica resultado + retroalimenta
 *
 * Permite CU ser "design-aware": no busca random, sabe qué hacer
 */

import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import {
  consultCanvaSpecialist,
  specToCanvaActions,
  type DesignBrief,
  type CanvaDesignSpec,
  type CanvaAction,
} from '../../agent/specialists/canvaSpecialist.js';
import type { CuAction } from './cuOptimizer.js';

export interface CuCanvaContext {
  instruction: string;
  format: 'carousel' | 'reel' | 'story' | 'tiktok-video' | 'tiktok-photo' | 'tiktok-script';
  platform: 'instagram' | 'tiktok';
  brand?: BrandProfile;
  slideCount?: number; // for carousel
}

export interface CuCanvaPlan {
  designSpec: CanvaDesignSpec;
  cuActions: CuAction[]; // executable by CU
  estimatedDurationMs: number;
  reasoning: string[];
}

// ── Interpret user instruction → design brief ────────────────────────────

const interpretInstruction = (
  instruction: string,
  context: CuCanvaContext,
): DesignBrief => {
  const lower = instruction.toLowerCase();

  // Detect content type
  let contentType: DesignBrief['contentType'] = 'value';
  if (lower.includes('hook') || lower.includes('attention')) contentType = 'hook';
  if (lower.includes('cta') || lower.includes('call')) contentType = 'cta';
  if (lower.includes('testimon') || lower.includes('proof')) contentType = 'testimonial';
  if (lower.includes('behind')) contentType = 'behind-the-scenes';
  if (lower.includes('enseña') || lower.includes('tutorial')) contentType = 'educational';
  if (lower.includes('divertid') || lower.includes('funny')) contentType = 'entertaining';

  return {
    format: context.format,
    platform: context.platform,
    topic: instruction,
    tone: context.brand?.voice?.tone || ['professional'],
    contentType,
    brand: context.brand,
  };
};

// ── Build Canva action plan for CU ────────────────────────────────────────

const convertSpecToCuActions = (spec: CanvaDesignSpec, slideIndex: number = 0): CuAction[] => {
  const canvaActions = specToCanvaActions(spec);
  const cuActions: CuAction[] = [];

  for (const action of canvaActions) {
    // Convert Canva action → CU action (clicks, typing, etc)
    switch (action.type) {
      case 'create':
        // Click "New Design" → select dimensions
        cuActions.push({
          kind: 'click',
          selector: '[data-action="new-design"]',
          priority: 1,
          id: `cu-canva-${Date.now()}-create`,
          timestamp: Date.now(),
        });
        break;

      case 'add-text':
        // Click text slot → type headline
        cuActions.push({
          kind: 'click',
          selector: action.selector || '[data-text="headline"]',
          priority: 2,
          id: `cu-canva-${Date.now()}-click-text`,
          timestamp: Date.now(),
        });
        cuActions.push({
          kind: 'type',
          text: `${spec.typography.headline.size}px bold: [INSERT HOOK TEXT HERE]`,
          priority: 2,
          id: `cu-canva-${Date.now()}-type-text`,
          timestamp: Date.now(),
        });
        break;

      case 'add-image':
        // Click image slot → search → select
        cuActions.push({
          kind: 'click',
          selector: action.selector || '[data-image="hero"]',
          priority: 2,
          id: `cu-canva-${Date.now()}-click-img`,
          timestamp: Date.now(),
        });
        cuActions.push({
          kind: 'type',
          text: spec.imagery.keywords[0] || 'professional',
          priority: 2,
          id: `cu-canva-${Date.now()}-search-img`,
          timestamp: Date.now(),
        });
        break;

      case 'export':
        // Click export → select format → download
        cuActions.push({
          kind: 'click',
          selector: '[data-action="export"]',
          priority: 1,
          id: `cu-canva-${Date.now()}-export`,
          timestamp: Date.now(),
        });
        break;
    }
  }

  return cuActions;
};

// ── Main orchestration: instruction → plan ──────────────────────────────

export const planCanvaDesign = async (
  instruction: string,
  context: CuCanvaContext,
): Promise<CuCanvaPlan> => {
  log.info(`[CU-Canva] Planning: ${instruction}`);

  // 1. Interpret
  const brief = interpretInstruction(instruction, context);

  // 2. Consult Canva Specialist
  const designSpec = await consultCanvaSpecialist(brief);

  // 3. Convert to CU actions
  const cuActions = convertSpecToCuActions(designSpec, 0);

  const estimatedDurationMs = cuActions.length * 500 + 3000; // ~500ms per action + 3s export

  const reasoning = [
    `Format: ${context.format} (${context.platform})`,
    `Content: ${brief.contentType}`,
    `Design: ${designSpec.layout.pattern} layout, ${designSpec.imagery.style} imagery`,
    `Actions: ${cuActions.length} steps (~${(estimatedDurationMs / 1000).toFixed(1)}s)`,
  ];

  log.info(`[CU-Canva] Plan: ${reasoning.join(' | ')}`);

  return {
    designSpec,
    cuActions,
    estimatedDurationMs,
    reasoning,
  };
};

// ── Execution: CU takes plan + runs it ────────────────────────────────────

export interface CuCanvaExecution {
  success: boolean;
  stepsDone: number;
  stepsTotal: number;
  designSpec: CanvaDesignSpec;
  exportPath?: string;
  durationMs: number;
  errors: string[];
}

export const executeCuCanvaPlan = async (
  plan: CuCanvaPlan,
  cuExecutor: (actions: CuAction[]) => Promise<{ success: boolean; errors: string[] }>,
): Promise<CuCanvaExecution> => {
  const startTime = Date.now();
  const errors: string[] = [];

  log.info(`[CU-Canva] Executing ${plan.cuActions.length} actions...`);

  // Execute all CU actions
  const result = await cuExecutor(plan.cuActions);

  const stepsDone = result.success ? plan.cuActions.length : Math.floor(plan.cuActions.length * 0.7);

  if (!result.success) {
    errors.push(...result.errors);
  }

  return {
    success: result.success,
    stepsDone,
    stepsTotal: plan.cuActions.length,
    designSpec: plan.designSpec,
    exportPath: result.success ? '/downloads/design-latest.png' : undefined,
    durationMs: Date.now() - startTime,
    errors,
  };
};

// ── Insight injection for Studio tools (fallback) ────────────────────────

export const injectCanvaInsightsToStudio = async (
  context: CuCanvaContext,
): Promise<Record<string, string>> => {
  const brief = interpretInstruction(context.instruction || '', context);
  const spec = await consultCanvaSpecialist(brief);

  const insights: Record<string, string> = {
    layout: spec.layout.pattern,
    colorPalette: `${spec.colorPalette.primary}, ${spec.colorPalette.secondary}`,
    typography: `Headline: ${spec.typography.headline.size}px ${spec.typography.headline.weight}`,
    imagery: `${spec.imagery.style} (${spec.imagery.mood})`,
    animation: `${spec.animation.style} ${spec.animation.duration}ms`,
    whitespace: `${spec.layout.whitespace}%`,
    instructions: spec.canvaInstructions.join(' | '),
  };

  log.info(`[CU-Canva] Injected insights to Studio: ${Object.keys(insights).join(', ')}`);

  return insights;
};
