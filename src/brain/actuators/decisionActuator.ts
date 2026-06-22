// @ts-nocheck
/**
 * Decision Actuator — Toma decisiones estratégicas usando todo el cerebro
 * Decide: qué postear, cuándo, cómo responder, si escalar
 */

import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';
import * as episodic from '../memory/episodicMemory.js';
import * as causal from '../reasoning/causalEngine.js';
import * as viral from '../reasoning/viralScoring.js';

export interface DecisionRequest {
  type: 'post' | 'reply' | 'campaign' | 'strategy' | 'escalation';
  options: string[];
  context: Record<string, unknown>;
  niche: string;
  brandName: string;
  deadline?: string;
}

export interface BrainDecision {
  chosen: string;
  confidence: number;
  reasoning: string[];
  alternatives: { option: string; score: number; why: string }[];
  risks: string[];
  expectedOutcome: string;
}

export const makeDecision = async (req: DecisionRequest): Promise<BrainDecision> => {
  const { type, options, context, niche } = req;

  const alternatives: { option: string; score: number; why: string }[] = [];
  const reasoning: string[] = [];

  for (const option of options) {
    let score = 0.5;
    const why: string[] = [];

    // 1. Check past decisions
    const past = await semantic.recall(`decision ${type} ${option}`, 3, ['decision', 'learning']);
    if (past.length > 0 && past[0]) {
      const best = past[0];
      score = (best.entry.importance ?? 0.5) * 0.4 + 0.3;
      why.push(`Decisión similar en el pasado (importancia=${(best.entry.importance ?? 0.5).toFixed(2)})`);
    }

    // 2. Check causal rules
    const rules = await causal.whatDoesItCause(option, niche);
    if (rules.length > 0 && rules[0]) {
      const topRule = rules[0];
      score += topRule.confidence * 0.3;
      why.push(`Regla causal: ${topRule.cause} → ${topRule.effect} (+${topRule.confidence.toFixed(2)})`);
    }

    // 3. Check viral potential if content-related
    if (type === 'post' || type === 'campaign') {
      const pred = await viral.predictViralPotential(option, niche);
      score += pred.score * 0.3;
      why.push(`Potencial viral: ${(pred.score * 100).toFixed(0)}%`);
    }

    // 4. Check recent episodes
    const episodes = episodic.recallLastDays(7);
    const relevantEpisodes = episodes.filter((e) => e.tags.includes(type) || e.what.includes(option));
    if (relevantEpisodes.length > 0) {
      const positive = relevantEpisodes.filter((e) => e.emotion === 'positive').length;
      const ratio = positive / relevantEpisodes.length;
      score += (ratio - 0.5) * 0.2;
      why.push(`Experiencias recientes: ${positive}/${relevantEpisodes.length} positivas`);
    }

    alternatives.push({ option, score: Math.min(1, score), why: why.join('; ') });
  }

  if (alternatives.length === 0) {
    return {
      chosen: 'none',
      confidence: 0,
      reasoning: ['No se proporcionaron opciones'],
      alternatives: [],
      risks: ['Sin opciones disponibles'],
      expectedOutcome: 'Indeterminado',
    };
  }

  // Sort by score
  alternatives.sort((a, b) => b.score - a.score);
  const chosen = alternatives[0]!;

  // Identify risks
  const risks: string[] = [];
  if (chosen.score < 0.5) risks.push('Confianza baja — considerar prueba A/B');
  if (
    alternatives.length > 1 &&
    alternatives[1] &&
    alternatives[0] &&
    alternatives[0].score - alternatives[1].score < 0.1
  ) {
    risks.push('Diferencia mínima entre opciones — necesita más datos');
  }
  if (type === 'escalation' && chosen.score > 0.7) {
    risks.push('Alta confianza en escalamiento — verificar manualmente');
  }

  reasoning.push(`Opción elegida: "${chosen.option}" con score ${chosen.score.toFixed(2)}`);
  for (const alt of alternatives.slice(1)) {
    reasoning.push(`  Rechazada "${alt.option}": ${alt.why} (score=${alt.score.toFixed(2)})`);
  }

  const decision: BrainDecision = {
    chosen: chosen.option,
    confidence: chosen.score,
    reasoning,
    alternatives,
    risks,
    expectedOutcome: inferOutcome(chosen.option, await causal.whatDoesItCause(chosen.option, niche)),
  };

  // Store decision
  await semantic.storeMemory(
    `Decisión ${type}: "${chosen.option}" (conf=${chosen.score.toFixed(2)})`,
    'decision',
    {
      decisionType: type,
      chosen: chosen.option,
      alternatives: alternatives.map((a) => a.option),
      context,
      niche,
    },
    chosen.score,
  );

  log.info(`[DecisionActuator] ${type}: "${chosen.option}" (conf=${chosen.score.toFixed(2)})`);
  return decision;
};

const inferOutcome = (action: string, rules: causal.CausalRule[]): string => {
  if (rules.length === 0 || !rules[0]) return 'Resultado incierto — sin reglas causales previas';
  const top = rules[0];
  const direction = top.typicalDelta > 0 ? 'mejora' : 'deterioro';
  return `${direction} esperado de ~${Math.abs(top.typicalDelta).toFixed(0)}% en ${top.effect}`;
};

// Should we escalate to human?
export const shouldEscalate = async (
  content: string,
  intent: string,
  emotion: string,
  userHandle: string,
): Promise<{ escalate: boolean; reason: string; urgency: number }> => {
  let urgency = 0;

  // Content-based urgency
  if (content.toLowerCase().match(/\b(urgente|emergencia|quéj|reclamo|abogado|denuncia)\b/)) urgency += 0.4;
  if (emotion === 'negative') urgency += 0.3;
  if (intent === 'feedback-negativo') urgency += 0.2;

  // User history
  const pastNegative = await semantic.recall(`@${userHandle} negative`, 3, ['conversation']);
  if (pastNegative.length > 2) urgency += 0.2;

  const escalate = urgency > 0.5;

  return {
    escalate,
    reason: escalate
      ? `Urgencia ${(urgency * 100).toFixed(0)}%: contenido sensible + historial negativo`
      : 'Dentro de parámetros normales',
    urgency,
  };
};
