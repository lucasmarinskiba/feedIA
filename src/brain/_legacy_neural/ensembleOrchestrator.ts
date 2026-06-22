// @ts-nocheck
/**
 * Ensemble Orchestrator — Voto entre múltiples "expertos neuronales".
 *
 * Implementa ensemble learning: en vez de confiar en un solo modelo,
 * consulta a varios expertos especializados y agrega sus decisiones.
 *
 * Expertos:
 *   1. Strategic Expert    → optimiza objetivos a largo plazo
 *   2. Growth Expert       → maximiza crecimiento de seguidores
 *   3. Engagement Expert   → maximiza interacción
 *   4. Conversion Expert   → maximiza ventas/leads
 *   5. Safety Expert       → minimiza riesgo de baneo
 *
 * Combina votos con pesos dinámicos según el contexto.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import type { RLAction } from './reinforcementEngine.js';
import type { NeuralInputState } from './neuralKnowledgeBase.js';
import type { PerformanceEvaluation } from './feedbackLoop.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const ENSEMBLE_DIR = path.resolve('data/neural/ensemble');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type ExpertName = 'strategic' | 'growth' | 'engagement' | 'conversion' | 'safety';

export interface ExpertVote {
  expert: ExpertName;
  recommendedAction: RLAction;
  confidence: number; // 0-1
  reasoning: string;
  votedAt: string;
}

export interface EnsembleDecision {
  brandId: string;
  timestamp: string;
  votes: ExpertVote[];
  expertWeights: Record<ExpertName, number>;
  weightedScores: Record<RLAction, number>;
  consensusAction: RLAction;
  consensusConfidence: number;
  dissent: ExpertVote[]; // expertos en desacuerdo con el consenso
  rationale: string;
}

export interface ExpertConfig {
  name: ExpertName;
  systemPrompt: string;
  priorityMetrics: string[];
  baseWeight: number;
}

// ── Configuración de expertos ─────────────────────────────────────────────────

const EXPERTS: Record<ExpertName, ExpertConfig> = {
  strategic: {
    name: 'strategic',
    systemPrompt: `Eres el Experto Estratégico de FeedIA.
Tu prioridad: objetivos a 6-12 meses, posicionamiento de marca, sostenibilidad del crecimiento.
Penalizas decisiones cortoplacistas que dañan la marca a largo plazo.`,
    priorityMetrics: ['brand_coherence', 'audience_alignment', 'content_frequency'],
    baseWeight: 0.2,
  },
  growth: {
    name: 'growth',
    systemPrompt: `Eres el Experto en Crecimiento de FeedIA.
Tu prioridad: nuevos seguidores, alcance, viralización.
Sugieres acciones que maximizan exposición a audiencias nuevas.`,
    priorityMetrics: ['follower_growth', 'reach_rate', 'hashtag_effectiveness'],
    baseWeight: 0.25,
  },
  engagement: {
    name: 'engagement',
    systemPrompt: `Eres el Experto en Engagement de FeedIA.
Tu prioridad: likes, comentarios, guardados, shares, tiempo de visualización.
Optimizas para maximizar la interacción de la comunidad existente.`,
    priorityMetrics: ['engagement_rate', 'caption_performance', 'posting_time_score'],
    baseWeight: 0.25,
  },
  conversion: {
    name: 'conversion',
    systemPrompt: `Eres el Experto en Conversión de FeedIA.
Tu prioridad: leads, ventas, clics al link en bio, DMs comerciales.
Cada acción debe contribuir al funnel de ventas.`,
    priorityMetrics: ['conversion_rate'],
    baseWeight: 0.15,
  },
  safety: {
    name: 'safety',
    systemPrompt: `Eres el Experto en Seguridad de FeedIA.
Tu prioridad: evitar baneos, shadowban, violaciones de políticas de Meta.
Vetas acciones de alto riesgo aunque tengan upside grande.`,
    priorityMetrics: [],
    baseWeight: 0.15,
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const ensureEnsembleDir = async (): Promise<void> => {
  await fs.mkdir(ENSEMBLE_DIR, { recursive: true });
};

const decisionsPath = (brandId: string): string => path.join(ENSEMBLE_DIR, `${brandId}-decisions.json`);

// ── Voto de un experto individual ─────────────────────────────────────────────

const consultExpert = async (
  expert: ExpertConfig,
  brand: BrandProfile,
  inputState: NeuralInputState,
  evaluation: PerformanceEvaluation,
  candidateActions: RLAction[],
): Promise<ExpertVote> => {
  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 400,
    thinking: { type: 'adaptive' },
    system: expert.systemPrompt,
    messages: [
      {
        role: 'user',
        content: `Marca: ${brand.name} | Industria: ${brand.industryCategory ?? 'general'}

Estado actual:
- Engagement: ${(inputState.accountMetrics.engagementRate * 100).toFixed(1)}%
- Crecimiento: ${(inputState.accountMetrics.followerGrowthRate * 100).toFixed(1)}%
- Alcance: ${(inputState.accountMetrics.reachRate * 100).toFixed(1)}%
- Coherencia de marca: ${(inputState.accountMetrics.brandCoherenceScore * 100).toFixed(0)}/100
- Score global: ${evaluation.overallScore}/100
- Cuellos de botella: ${evaluation.bottlenecks.join(', ') || 'ninguno'}

Acciones candidatas:
${candidateActions.map((a, i) => `${i + 1}. ${a}`).join('\n')}

¿Cuál acción recomiendas desde tu especialidad? Responde JSON:
{ "recommendedAction": "<acción>", "confidence": 0-1, "reasoning": "razón breve en 1 oración" }`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);

  const parsed = jsonMatch
    ? (JSON.parse(jsonMatch[0]) as { recommendedAction: string; confidence: number; reasoning: string })
    : {
        recommendedAction: candidateActions[0] ?? 'post-carousel-educational',
        confidence: 0.5,
        reasoning: 'Sin respuesta del experto',
      };

  return {
    expert: expert.name,
    recommendedAction: parsed.recommendedAction as RLAction,
    confidence: parsed.confidence,
    reasoning: parsed.reasoning,
    votedAt: new Date().toISOString(),
  };
};

// ── Cálculo dinámico de pesos por contexto ────────────────────────────────────

const calculateDynamicWeights = (
  inputState: NeuralInputState,
  evaluation: PerformanceEvaluation,
): Record<ExpertName, number> => {
  const weights: Record<ExpertName, number> = {
    ...(Object.fromEntries(Object.entries(EXPERTS).map(([k, v]) => [k, v.baseWeight])) as Record<ExpertName, number>),
  };

  // Si score muy bajo → safety expert pesa más
  if (evaluation.overallScore < 40) weights.safety += 0.15;

  // Si crecimiento estancado → growth expert pesa más
  if (inputState.accountMetrics.followerGrowthRate < 0.3) weights.growth += 0.1;

  // Si engagement bajo → engagement expert pesa más
  if (inputState.accountMetrics.engagementRate < 0.3) weights.engagement += 0.1;

  // Si conversión baja → conversion expert pesa más
  if (inputState.accountMetrics.conversionRate < 0.3) weights.conversion += 0.1;

  // Si coherencia baja → strategic expert pesa más
  if (inputState.accountMetrics.brandCoherenceScore < 0.5) weights.strategic += 0.1;

  // Normalizar para que sumen 1
  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  for (const k of Object.keys(weights) as ExpertName[]) {
    weights[k] = weights[k]! / total;
  }

  return weights;
};

// ── API pública ───────────────────────────────────────────────────────────────

/** Ejecuta voto ensemble entre todos los expertos. */
export const runEnsembleVote = async (
  brand: BrandProfile,
  inputState: NeuralInputState,
  evaluation: PerformanceEvaluation,
  candidateActions: RLAction[],
): Promise<EnsembleDecision> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  log.info('[ensemble] running vote', { brandId, candidates: candidateActions.length });

  // Consultar a todos los expertos en paralelo
  const votes = await Promise.all(
    Object.values(EXPERTS).map((expert) => consultExpert(expert, brand, inputState, evaluation, candidateActions)),
  );

  // Calcular pesos dinámicos según contexto
  const expertWeights = calculateDynamicWeights(inputState, evaluation);

  // Acumular votos ponderados por acción
  const weightedScores: Record<string, number> = {};
  for (const vote of votes) {
    const weight = expertWeights[vote.expert] * vote.confidence;
    weightedScores[vote.recommendedAction] = (weightedScores[vote.recommendedAction] ?? 0) + weight;
  }

  // Acción ganadora
  const sorted = Object.entries(weightedScores).sort((a, b) => b[1] - a[1]);
  const consensusAction = (sorted[0]?.[0] ?? candidateActions[0] ?? 'post-carousel-educational') as RLAction;
  const consensusScore = sorted[0]?.[1] ?? 0;
  const totalScore = sorted.reduce((s, [, v]) => s + v, 0);
  const consensusConfidence = totalScore > 0 ? consensusScore / totalScore : 0;

  // Expertos en desacuerdo (votaron diferente al consenso)
  const dissent = votes.filter((v) => v.recommendedAction !== consensusAction);

  const decision: EnsembleDecision = {
    brandId,
    timestamp: new Date().toISOString(),
    votes,
    expertWeights,
    weightedScores: weightedScores as Record<RLAction, number>,
    consensusAction,
    consensusConfidence,
    dissent,
    rationale: `Consenso: ${consensusAction} (confianza ${(consensusConfidence * 100).toFixed(0)}%). ${dissent.length} expertos en desacuerdo: ${dissent.map((d) => `${d.expert}→${d.recommendedAction}`).join(', ')}`,
  };

  // Persistir
  await ensureEnsembleDir();
  let history: EnsembleDecision[] = [];
  try {
    history = JSON.parse(await fs.readFile(decisionsPath(brandId), 'utf-8')) as EnsembleDecision[];
  } catch {
    /* noop */
  }
  history.push(decision);
  await fs.writeFile(decisionsPath(brandId), JSON.stringify(history.slice(-100), null, 2), 'utf-8');

  log.info('[ensemble] decision', {
    brandId,
    consensus: consensusAction,
    confidence: consensusConfidence.toFixed(2),
    dissent: dissent.length,
  });
  return decision;
};

/** Carga historial de decisiones ensemble. */
export const getEnsembleHistory = async (brandId: string, limit = 20): Promise<EnsembleDecision[]> => {
  try {
    const all = JSON.parse(await fs.readFile(decisionsPath(brandId), 'utf-8')) as EnsembleDecision[];
    return all.slice(-limit);
  } catch {
    return [];
  }
};

/** Estadísticas del ensemble: cuál experto acierta más. */
export const getExpertAccuracy = async (brandId: string): Promise<Record<ExpertName, number>> => {
  const history = await getEnsembleHistory(brandId, 100);
  const accuracy: Record<ExpertName, { hits: number; total: number }> = {
    strategic: { hits: 0, total: 0 },
    growth: { hits: 0, total: 0 },
    engagement: { hits: 0, total: 0 },
    conversion: { hits: 0, total: 0 },
    safety: { hits: 0, total: 0 },
  };

  for (const decision of history) {
    for (const vote of decision.votes) {
      accuracy[vote.expert].total++;
      if (vote.recommendedAction === decision.consensusAction) {
        accuracy[vote.expert].hits++;
      }
    }
  }

  const result: Record<ExpertName, number> = {} as Record<ExpertName, number>;
  for (const [expert, data] of Object.entries(accuracy)) {
    result[expert as ExpertName] = data.total > 0 ? data.hits / data.total : 0;
  }
  return result;
};
