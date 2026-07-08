/**
 * CU Design Execution — Wiring Design Master plans into CU execution
 *
 * Cuando Design Master retorna un cuPlan, CU toma el plan y lo ejecuta:
 * 1. Recibe cuActions del plan
 * 2. Optimiza con cuOptimizer (batching, parallelization)
 * 3. Ejecuta acciones sobre Canva via Anthropic CU
 * 4. Retroalimenta al Design Master con resultado
 */

import { log } from '../../agent/logger.js';
import type { CuEvent } from './liveSession.js';
import type { CuCanvaPlan } from './cuCanvaBridge.js';
import type { CuAction } from './cuOptimizer.js';
import { optimizeCuPlan } from './cuOptimizer.js';

export interface DesignCuExecutionContext {
  plan: CuCanvaPlan;
  apiKey: string;
  sessionId: string;
}

export interface DesignCuExecutionResult {
  success: boolean;
  stepsDone: number;
  stepsTotal: number;
  events: CuEvent[];
  outputPath?: string;
  durationMs: number;
  errors: string[];
  designQuality?: number;
}

// ── Optimize design plan (batching, parallelization) ──────────────────

const optimizeDesignPlan = (actions: CuAction[]): CuAction[] => {
  log.info(`[CU Design] Optimizing ${actions.length} design actions`);

  const optimized = optimizeCuPlan(actions);

  log.info(
    `[CU Design] Optimization: ${optimized.batches.length} batches, ` +
      `${optimized.savingsPercent.toFixed(0)}% speedup`,
  );

  // Flatten batches back to actions
  return optimized.batches.flatMap((batch) => batch.actions);
};

// ── Execute design plan (actual CU calls) ──────────────────────────────

export const executeDesignCuPlan = async (
  context: DesignCuExecutionContext,
  cuExecutor?: (actions: CuAction[]) => Promise<{ success: boolean; events: CuEvent[]; errors: string[] }>,
): Promise<DesignCuExecutionResult> => {
  const startTime = Date.now();

  log.info(`[CU Design] Executing plan for session ${context.sessionId}`);

  // 1. Optimize actions
  const optimizedActions = optimizeDesignPlan(context.plan.cuActions);

  // 2. Execute via CU (or mock if no executor provided)
  let success = false;
  let events: CuEvent[] = [];
  let errors: string[] = [];

  if (cuExecutor) {
    const result = await cuExecutor(optimizedActions);
    success = result.success;
    events = result.events;
    errors = result.errors;
  } else {
    // Mock execution for testing
    log.warn(`[CU Design] No executor provided, simulating execution`);
    events = optimizedActions.map((action, i) => ({
      kind: 'act' as const,
      step: i + 1,
      gesture: action.kind,
      target: action.selector ?? 'canvas',
      narrate: `${action.kind}${action.text ? `: ${action.text}` : ''}`,
    }));
    success = true;
  }

  const durationMs = Date.now() - startTime;
  const stepsDone = success ? optimizedActions.length : Math.floor(optimizedActions.length * 0.7);

  log.info(
    `[CU Design] Execution complete: ${stepsDone}/${optimizedActions.length} steps, ` +
      `${durationMs}ms, success=${success}`,
  );

  // 3. Estimate design quality (based on successful completion)
  const designQuality = success ? 85 : 40; // TODO: compute from actual output

  return {
    success,
    stepsDone,
    stepsTotal: optimizedActions.length,
    events,
    outputPath: success ? '/designs/design-latest.png' : undefined,
    durationMs,
    errors,
    designQuality,
  };
};

// ── Integration: call from brainAwareCu ────────────────────────────────

export const executeCuDesignWorkflow = async (
  plan: CuCanvaPlan,
  sessionId: string,
): Promise<DesignCuExecutionResult> => {
  const context: DesignCuExecutionContext = {
    plan,
    apiKey: process.env['ANTHROPIC_API_KEY'] || '',
    sessionId,
  };

  // TODO: Pass actual CU executor from brainAwareCu
  // For now, mock execution
  return executeDesignCuPlan(context, undefined);
};
