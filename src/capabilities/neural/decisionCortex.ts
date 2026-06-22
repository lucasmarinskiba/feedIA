/**
 * Decision Cortex — Toma de decisiones cognitivas
 * Combina memoria, atención y aprendizaje en una decisión con confidence score.
 */

import { log } from '../../agent/logger.js';

export interface DecisionInput {
  memoryContext?: string;
  attentionScore?: number;
  learningBias?: number;
  options: DecisionOption[];
}

export interface DecisionOption {
  id: string;
  label: string;
  expectedOutcome: number; // 0-1
  risk: number; // 0-1
  effort: number; // 0-1
}

export interface DecisionResult {
  decision: string;
  confidence: number;
  reasoning: string;
  optionChosen?: DecisionOption;
}

export const DECISION_THRESHOLD = 0.65;

const calculateOptionScore = (opt: DecisionOption, context: DecisionInput): number => {
  const memoryWeight = context.memoryContext ? 0.2 : 0;
  const attentionWeight = context.attentionScore ? 0.25 : 0;
  const learningWeight = context.learningBias ? 0.15 : 0;
  const outcomeWeight = 0.4;

  const riskPenalty = 1 - opt.risk;
  const effortPenalty = 1 - opt.effort;
  const adjustedOutcome = opt.expectedOutcome * riskPenalty * effortPenalty;

  const attentionBoost = (context.attentionScore ?? 0.5) * attentionWeight;
  const learningBoost = (context.learningBias ?? 0.5) * learningWeight;
  const memoryBoost = memoryWeight * 0.5; // neutral if no context

  return Math.min(1, adjustedOutcome * outcomeWeight + attentionBoost + learningBoost + memoryBoost);
};

export const makeDecision = (inputs: DecisionInput): DecisionResult => {
  if (!inputs.options || inputs.options.length === 0) {
    return {
      decision: 'no_action',
      confidence: 0,
      reasoning: 'No options provided',
    };
  }

  const scored = inputs.options.map((opt) => ({
    option: opt,
    score: calculateOptionScore(opt, inputs),
  }));

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0]!;

  const confidence = Math.round(best.score * 100) / 100;
  const reasoning = `Option "${best.option.label}" scored ${confidence} (outcome=${best.option.expectedOutcome}, risk=${best.option.risk}, effort=${best.option.effort})`;

  log.info(`[DecisionCortex] Decision: ${best.option.id} | Confidence: ${confidence}`);

  return {
    decision: best.option.id,
    confidence,
    reasoning,
    optionChosen: best.option,
  };
};

export const evaluateOptions = (
  options: DecisionOption[],
  context: string,
): Array<{ option: DecisionOption; score: number }> => {
  const inputs: DecisionInput = {
    memoryContext: context,
    options,
  };

  return options
    .map((opt) => ({
      option: opt,
      score: calculateOptionScore(opt, inputs),
    }))
    .sort((a, b) => b.score - a.score);
};
