/**
 * Meta Learning — Aprende de estrategias exitosas y las transfiere entre contextos.
 * Identifica qué tácticas funcionan en qué situaciones y las replica.
 */

import { log } from '../../agent/logger.js';

export interface StrategyPattern {
  id: string;
  context: string;
  action: string;
  outcome: number; // 0-1
  transferScore: number; // how transferable to other contexts
  usageCount: number;
  lastUsed: string;
}

export interface TransferPrediction {
  sourceContext: string;
  targetContext: string;
  strategy: string;
  predictedOutcome: number;
  confidence: number;
  reasoning: string;
}

const patterns: StrategyPattern[] = [];
const MAX_PATTERNS = 150;

export const recordPattern = (context: string, action: string, outcome: number): StrategyPattern => {
  const existing = patterns.find((p) => p.context === context && p.action === action);
  if (existing) {
    existing.outcome = (existing.outcome * existing.usageCount + outcome) / (existing.usageCount + 1);
    existing.usageCount++;
    existing.lastUsed = new Date().toISOString();
    return existing;
  }

  const pattern: StrategyPattern = {
    id: `meta-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    context,
    action,
    outcome,
    transferScore: Math.random() * 0.5 + 0.5, // simulated
    usageCount: 1,
    lastUsed: new Date().toISOString(),
  };

  patterns.push(pattern);
  if (patterns.length > MAX_PATTERNS) patterns.shift();

  log.info(`[MetaLearn] Pattern recorded: ${context} → ${action} (${outcome})`);
  return pattern;
};

export const predictTransfer = (sourceContext: string, targetContext: string): TransferPrediction[] => {
  const sourcePatterns = patterns.filter((p) => p.context === sourceContext).sort((a, b) => b.outcome - a.outcome);

  const predictions: TransferPrediction[] = [];
  for (const pattern of sourcePatterns.slice(0, 5)) {
    const similarTarget = patterns.filter((p) => p.context === targetContext && p.action === pattern.action);
    const targetAvg =
      similarTarget.length > 0
        ? similarTarget.reduce((s, p) => s + p.outcome, 0) / similarTarget.length
        : pattern.outcome * pattern.transferScore;

    predictions.push({
      sourceContext,
      targetContext,
      strategy: pattern.action,
      predictedOutcome: Math.round(targetAvg * 100) / 100,
      confidence: Math.round(pattern.transferScore * 100) / 100,
      reasoning: `${pattern.action} tuvo ${pattern.outcome} en ${sourceContext}. Transfer score: ${pattern.transferScore}`,
    });
  }

  return predictions.sort((a, b) => b.predictedOutcome - a.predictedOutcome);
};

export const updateTransferScores = (
  sourceContext: string,
  targetContext: string,
  action: string,
  actualOutcome: number,
): void => {
  const source = patterns.find((p) => p.context === sourceContext && p.action === action);
  if (!source) return;

  const diff = Math.abs(source.outcome - actualOutcome);
  source.transferScore = Math.max(0, Math.min(1, source.transferScore - diff * 0.1));

  log.info(
    `[MetaLearn] Transfer score updated: ${action} ${sourceContext}→${targetContext} = ${source.transferScore.toFixed(2)}`,
  );
};

export const getTopPatterns = (context?: string, limit = 10): StrategyPattern[] => {
  let result = patterns.slice();
  if (context) result = result.filter((p) => p.context === context);
  return result.sort((a, b) => b.outcome - a.outcome).slice(0, limit);
};
