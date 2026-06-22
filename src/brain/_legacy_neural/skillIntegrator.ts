// @ts-nocheck
/**
 * Skill Integrator — orquestador entre cerebro neural y skills.
 *
 * El cerebro detecta:
 *   - cuellos de botella (bottlenecks)
 *   - acciones RL recomendadas
 *   - métricas débiles
 *   - eventos del entorno
 *
 * El integrator mapea esos signals → invocación de skills concretas.
 * Coordina:
 *   - selección de skill apropiada
 *   - chequeo de quota + plan
 *   - dispatch con timeout + retry
 *   - tracking de outcome → memory
 *   - escalada si skill falla
 */

import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import {
  SKILL_REGISTRY,
  findSkillsForMetric,
  findSkillsForAction,
  findSkillsByTrigger,
  type SkillMetadata,
} from './skillRegistry.js';
import type { MetricName, PerformanceEvaluation } from './feedbackLoop.js';
import type { RLAction } from './reinforcementEngine.js';
import type { NeuralInputState } from './neuralKnowledgeBase.js';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface SkillInvocation {
  skillId: string;
  triggerReason: string;
  params: Record<string, unknown>;
  estimatedCostUsd: number;
  expectedMetricImpact: MetricName[];
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface SkillExecutionResult {
  skillId: string;
  success: boolean;
  durationMs: number;
  output?: unknown;
  error?: string;
  costUsd: number;
  metricsBefore?: Partial<Record<MetricName, number>>;
  metricsAfter?: Partial<Record<MetricName, number>>;
}

export interface IntegrationPlan {
  cycleId: string;
  brandId: string;
  selectedSkills: SkillInvocation[];
  totalEstimatedCost: number;
  totalEstimatedDuration: number;
  rationale: string;
}

// ── Selección de skills basada en estado neural ──────────────────────────────

/**
 * Decide qué skills invocar basado en estado actual de la cuenta.
 * Retorna plan ordenado por prioridad.
 */
export const buildIntegrationPlan = (
  brand: BrandProfile,
  state: NeuralInputState,
  evaluation: PerformanceEvaluation,
  recommendedAction: RLAction,
  cycleId: string,
): IntegrationPlan => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const invocations: SkillInvocation[] = [];
  const seen = new Set<string>();

  // 1. Skills mapeadas a la acción RL recomendada
  const actionSkills = findSkillsForAction(recommendedAction);
  for (const skill of actionSkills) {
    if (seen.has(skill.id)) continue;
    seen.add(skill.id);
    invocations.push({
      skillId: skill.id,
      triggerReason: `Acción RL recomendada: ${recommendedAction}`,
      params: buildDefaultParams(skill, state, evaluation),
      estimatedCostUsd: skill.estimatedCostUsd,
      expectedMetricImpact: skill.movesMetrics,
      priority: 'high',
    });
  }

  // 2. Skills para cada bottleneck
  for (const bottleneck of evaluation.bottlenecks as MetricName[]) {
    const skills = findSkillsForMetric(bottleneck);
    for (const skill of skills) {
      if (seen.has(skill.id)) continue;
      seen.add(skill.id);
      invocations.push({
        skillId: skill.id,
        triggerReason: `Bottleneck: ${bottleneck}`,
        params: buildDefaultParams(skill, state, evaluation),
        estimatedCostUsd: skill.estimatedCostUsd,
        expectedMetricImpact: skill.movesMetrics,
        priority: evaluation.urgentIssues.some((u) => u.includes(bottleneck)) ? 'critical' : 'medium',
      });
    }
  }

  // 3. Skills por triggers de evento (basados en context)
  const contextEvents: string[] = [];
  if (state.contextSignals.trendAlignment > 0.7) contextEvents.push('trend-opportunity');
  if (evaluation.overallScore < 30) contextEvents.push('crisis-trigger');
  if (state.accountMetrics.contentFrequencyScore < 0.3) contextEvents.push('content-needed');

  for (const event of contextEvents) {
    const skills = findSkillsByTrigger('event', { event });
    for (const skill of skills) {
      if (seen.has(skill.id)) continue;
      seen.add(skill.id);
      invocations.push({
        skillId: skill.id,
        triggerReason: `Evento: ${event}`,
        params: buildDefaultParams(skill, state, evaluation),
        estimatedCostUsd: skill.estimatedCostUsd,
        expectedMetricImpact: skill.movesMetrics,
        priority: event === 'crisis-trigger' ? 'critical' : 'medium',
      });
    }
  }

  // Ordenar por prioridad
  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  invocations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  const totalCost = invocations.reduce((sum, inv) => sum + inv.estimatedCostUsd, 0);
  const totalDuration = invocations.reduce(
    (sum, inv) => sum + (SKILL_REGISTRY[inv.skillId]?.estimatedDurationMs ?? 0),
    0,
  );

  return {
    cycleId,
    brandId,
    selectedSkills: invocations,
    totalEstimatedCost: totalCost,
    totalEstimatedDuration: totalDuration,
    rationale: `Plan basado en acción RL "${recommendedAction}", ${evaluation.bottlenecks.length} bottlenecks, ${contextEvents.length} eventos`,
  };
};

// ── Default params por skill ─────────────────────────────────────────────────

const buildDefaultParams = (
  skill: SkillMetadata,
  state: NeuralInputState,
  evaluation: PerformanceEvaluation,
): Record<string, unknown> => {
  // Mapping skill → params apropiados según el estado
  switch (skill.id) {
    case 'feedIA-quick-carousel':
      return {
        prompt: deriveContentPrompt(state, evaluation),
        slideCount: 7,
        formula: evaluation.overallScore < 50 ? 'PAS' : 'AIDA',
        goal: deriveGoal(state, evaluation),
        publish: false, // requiere aprobación
      };
    case 'feedIA-reel-studio':
      return {
        topic: deriveContentPrompt(state, evaluation),
        duration: 30,
        style: 'storytelling',
      };
    case 'feedIA-quick-story':
      return {
        prompt: deriveContentPrompt(state, evaluation),
        frameCount: 4,
        goal: 'engagement',
        includeInteractive: true,
      };
    case 'feedIA-hashtag-science':
      return {
        topic: evaluation.bottlenecks[0] ?? 'general',
        contentType: 'carrusel-educativo',
      };
    case 'feedIA-bio-optimizer':
      return {
        primaryGoal: deriveGoal(state, evaluation),
      };
    case 'feedIA-competitor-profiling':
      return { handles: [] }; // se cargan desde brand.competitors
    case 'feedIA-buyer-persona':
      return { personaCount: 2 };
    case 'feedIA-explore-optimizer':
      return { audit: true };
    case 'feedIA-content-strategy':
      return { months: 1 };
    case 'feedIA-meta-ads':
      return { budgetUSD: 50, objective: 'engagement' };
    case 'feedIA-cu-brain-aware':
      return {
        instruction: `Operar Instagram para ${deriveContentPrompt(state, evaluation)}`,
        baseUrl: 'https://www.instagram.com',
        rlAction: 'post-carousel-educational',
        notifyUser: true,
        abortOnSafetyFail: true,
      };
    default:
      return {};
  }
};

const deriveContentPrompt = (state: NeuralInputState, evaluation: PerformanceEvaluation): string => {
  const weakestMetric = evaluation.bottlenecks[0];
  const topFormat = state.accountMetrics.contentFrequencyScore < 0.5 ? 'contenido educativo' : 'contenido entretenido';
  return `${topFormat} sobre ${weakestMetric ?? 'temas del nicho'} para ${state.accountType}`;
};

const deriveGoal = (
  state: NeuralInputState,
  evaluation: PerformanceEvaluation,
): 'educar' | 'vender' | 'inspirar' | 'entretener' | 'viralizar' => {
  if (state.accountMetrics.engagementRate < 0.2) return 'viralizar';
  if (state.accountMetrics.conversionRate < 0.3) return 'vender';
  if (evaluation.overallScore < 50) return 'educar';
  return 'entretener';
};

// ── Dispatch dinámico ────────────────────────────────────────────────────────

/**
 * Ejecuta una skill via su modulePath dinámicamente.
 * Importa el módulo, encuentra la función principal, la invoca.
 */
export const dispatchSkill = async (
  invocation: SkillInvocation,
  brand: BrandProfile,
): Promise<SkillExecutionResult> => {
  const skill = SKILL_REGISTRY[invocation.skillId];
  if (!skill) {
    return {
      skillId: invocation.skillId,
      success: false,
      durationMs: 0,
      error: `Skill no registrada: ${invocation.skillId}`,
      costUsd: 0,
    };
  }
  if (!skill.modulePath) {
    return {
      skillId: invocation.skillId,
      success: false,
      durationMs: 0,
      error: `Skill sin modulePath (manual-only): ${invocation.skillId}`,
      costUsd: 0,
    };
  }

  const startTime = Date.now();
  log.info('[skillIntegrator] dispatching', { skillId: invocation.skillId, params: Object.keys(invocation.params) });

  try {
    // Import dinámico del módulo
    const mod = (await import(`../../${skill.modulePath}`)) as Record<string, (...args: unknown[]) => Promise<unknown>>;
    // Buscar función principal por convention
    const mainFn = findMainFunction(mod, skill.id);
    if (!mainFn) {
      return {
        skillId: invocation.skillId,
        success: false,
        durationMs: Date.now() - startTime,
        error: `No se encontró función principal en ${skill.modulePath}`,
        costUsd: 0,
      };
    }

    const output = await mainFn(brand, invocation.params);
    return {
      skillId: invocation.skillId,
      success: true,
      durationMs: Date.now() - startTime,
      output,
      costUsd: skill.estimatedCostUsd,
    };
  } catch (err) {
    log.warn('[skillIntegrator] dispatch failed', { skillId: invocation.skillId, err: String(err) });
    return {
      skillId: invocation.skillId,
      success: false,
      durationMs: Date.now() - startTime,
      error: err instanceof Error ? err.message : String(err),
      costUsd: 0,
    };
  }
};

const findMainFunction = (
  mod: Record<string, (...args: unknown[]) => Promise<unknown>>,
  skillId: string,
): ((...args: unknown[]) => Promise<unknown>) | null => {
  // Mapping skill → función exportada
  const fnMap: Record<string, string[]> = {
    'feedIA-quick-carousel': ['createQuickCarousel'],
    'feedIA-reel-studio': ['createQuickReel', 'generateReelScript'],
    'feedIA-quick-story': ['createQuickStory'],
    'feedIA-buyer-persona': ['buildBuyerPersonas', 'auditAccount'],
    'feedIA-bio-optimizer': ['optimizeProfile'],
    'feedIA-hashtag-science': ['researchHashtags'],
    'feedIA-humanizer': ['humanizeText'],
    'feedIA-faq': ['answerQuestion'],
    'feedIA-competitor-profiling': ['analyzeCompetitors'],
    'feedIA-calendar': ['buildMonthlyCalendar'],
    'feedIA-meta-ads': ['createCampaign'],
    'feedIA-cu-brain-aware': ['runBrainAwareCu'],
  };

  const candidates = fnMap[skillId] ?? [];
  for (const fnName of candidates) {
    if (typeof mod[fnName] === 'function') return mod[fnName];
  }
  // Fallback: buscar primera función exportada
  for (const [key, val] of Object.entries(mod)) {
    if (typeof val === 'function' && key.startsWith('run')) return val;
  }
  return null;
};

// ── Ejecutar plan completo ───────────────────────────────────────────────────

export const executeIntegrationPlan = async (
  plan: IntegrationPlan,
  brand: BrandProfile,
  options: { maxConcurrent?: number; maxTotalCost?: number; dryRun?: boolean } = {},
): Promise<SkillExecutionResult[]> => {
  const cfg = { maxConcurrent: 3, maxTotalCost: 5.0, dryRun: false, ...options };
  const results: SkillExecutionResult[] = [];
  let accumulatedCost = 0;

  log.info('[skillIntegrator] executing plan', {
    cycleId: plan.cycleId,
    skills: plan.selectedSkills.length,
    estimatedCost: plan.totalEstimatedCost,
  });

  if (cfg.dryRun) {
    log.info('[skillIntegrator] DRY RUN — no se ejecutan skills');
    return plan.selectedSkills.map((inv) => ({
      skillId: inv.skillId,
      success: true,
      durationMs: 0,
      output: { dryRun: true, params: inv.params },
      costUsd: 0,
    }));
  }

  // Ejecutar en chunks paralelos
  for (let i = 0; i < plan.selectedSkills.length; i += cfg.maxConcurrent) {
    const chunk = plan.selectedSkills.slice(i, i + cfg.maxConcurrent);
    const filteredChunk = chunk.filter((inv) => {
      if (accumulatedCost + inv.estimatedCostUsd > cfg.maxTotalCost) {
        log.warn('[skillIntegrator] skipping skill — cost cap reached', { skillId: inv.skillId });
        return false;
      }
      return true;
    });

    const chunkResults = await Promise.all(filteredChunk.map((inv) => dispatchSkill(inv, brand)));
    for (const r of chunkResults) {
      accumulatedCost += r.costUsd;
      results.push(r);
    }
  }

  log.info('[skillIntegrator] plan complete', {
    cycleId: plan.cycleId,
    totalSkills: results.length,
    successful: results.filter((r) => r.success).length,
    failed: results.filter((r) => !r.success).length,
    actualCost: accumulatedCost,
  });

  return results;
};
