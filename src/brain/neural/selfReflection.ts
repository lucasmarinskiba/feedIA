/**
 * Self Reflection — diario auto-explicable de decisiones del cerebro.
 *
 * Cada decisión importante escribe entrada con:
 *   - Qué decidió
 *   - Por qué (contexto + módulos invocados)
 *   - Qué esperaba
 *   - Qué pasó realmente (cuando hay outcome)
 *   - Lessons learned
 *
 * Permite explainability (XAI) + auditoría humana + debugging del cerebro.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';

const REFLECTION_DIR = path.resolve('data/neural/reflection');

export type ReflectionType = 'decision' | 'outcome' | 'mistake' | 'insight' | 'plan-change';

export interface ReflectionEntry {
  id: string;
  brandId: string;
  type: ReflectionType;
  timestamp: string;
  title: string;
  context: {
    triggers: string[];
    modulesInvoked: string[];
    inputs: Record<string, unknown>;
  };
  decision?: {
    action: string;
    reasoning: string;
    alternatives: string[];
    confidence: number;
    expectedOutcome: string;
  };
  outcome?: {
    actual: string;
    matchedExpectation: boolean;
    reward: number;
    surprise: number; // -1 to 1 (negativo si peor que esperado, positivo si mejor)
  };
  lessons: string[];
  linkedTo: string[]; // IDs de otras reflections relacionadas
}

const reflectionsPath = (brandId: string): string => path.join(REFLECTION_DIR, `${brandId}-journal.json`);

const loadJournal = async (brandId: string): Promise<ReflectionEntry[]> => {
  try {
    return JSON.parse(await fs.readFile(reflectionsPath(brandId), 'utf-8')) as ReflectionEntry[];
  } catch {
    return [];
  }
};

const saveJournal = async (brandId: string, journal: ReflectionEntry[]): Promise<void> => {
  await fs.mkdir(REFLECTION_DIR, { recursive: true });
  await fs.writeFile(reflectionsPath(brandId), JSON.stringify(journal.slice(-1000), null, 2), 'utf-8');
};

export const recordDecision = async (
  brandId: string,
  params: {
    title: string;
    triggers: string[];
    modulesInvoked: string[];
    inputs: Record<string, unknown>;
    action: string;
    reasoning: string;
    alternatives: string[];
    confidence: number;
    expectedOutcome: string;
    linkedTo?: string[];
  },
): Promise<ReflectionEntry> => {
  const entry: ReflectionEntry = {
    id: `refl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    brandId,
    type: 'decision',
    timestamp: new Date().toISOString(),
    title: params.title,
    context: {
      triggers: params.triggers,
      modulesInvoked: params.modulesInvoked,
      inputs: params.inputs,
    },
    decision: {
      action: params.action,
      reasoning: params.reasoning,
      alternatives: params.alternatives,
      confidence: params.confidence,
      expectedOutcome: params.expectedOutcome,
    },
    lessons: [],
    linkedTo: params.linkedTo ?? [],
  };

  const journal = await loadJournal(brandId);
  journal.push(entry);
  await saveJournal(brandId, journal);
  log.info('[selfReflection] decision recorded', { brandId, id: entry.id, action: params.action });
  return entry;
};

export const recordOutcome = async (
  brandId: string,
  decisionId: string,
  outcome: { actual: string; reward: number },
): Promise<ReflectionEntry | null> => {
  const journal = await loadJournal(brandId);
  const decisionEntry = journal.find((e) => e.id === decisionId && e.type === 'decision');
  if (!decisionEntry || !decisionEntry.decision) return null;

  const matchedExpectation = simpleMatch(decisionEntry.decision.expectedOutcome, outcome.actual);
  const surprise = computeSurprise(decisionEntry.decision.confidence, outcome.reward);

  const outcomeEntry: ReflectionEntry = {
    id: `refl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    brandId,
    type: surprise < -0.3 ? 'mistake' : 'outcome',
    timestamp: new Date().toISOString(),
    title: `Outcome: ${decisionEntry.title}`,
    context: decisionEntry.context,
    decision: decisionEntry.decision,
    outcome: {
      actual: outcome.actual,
      matchedExpectation,
      reward: outcome.reward,
      surprise,
    },
    lessons: extractLessons(decisionEntry, outcome.reward, surprise),
    linkedTo: [decisionId],
  };

  journal.push(outcomeEntry);
  await saveJournal(brandId, journal);
  log.info('[selfReflection] outcome recorded', { brandId, id: outcomeEntry.id, surprise: surprise.toFixed(2) });
  return outcomeEntry;
};

const simpleMatch = (expected: string, actual: string): boolean => {
  const e = expected.toLowerCase();
  const a = actual.toLowerCase();
  const eWords = e.split(/\s+/).filter((w) => w.length > 3);
  const matches = eWords.filter((w) => a.includes(w));
  return matches.length / Math.max(1, eWords.length) > 0.4;
};

const computeSurprise = (expectedConfidence: number, actualReward: number): number => {
  const expectedReward = expectedConfidence * 2 - 1;
  return actualReward - expectedReward;
};

const extractLessons = (decision: ReflectionEntry, reward: number, surprise: number): string[] => {
  const lessons: string[] = [];
  if (decision.decision) {
    if (reward > 0.5 && surprise > 0.2) {
      lessons.push(`Acción "${decision.decision.action}" superó expectativas — replicar en contextos similares`);
    }
    if (reward < -0.3) {
      lessons.push(
        `Acción "${decision.decision.action}" fracasó — evitar en contextos: ${Object.keys(decision.context.inputs).join(', ')}`,
      );
    }
    if (surprise < -0.4) {
      lessons.push(`Sobreconfianza: confidence ${decision.decision.confidence.toFixed(2)} fue demasiado optimista`);
    }
    if (surprise > 0.5) {
      lessons.push(`Subestimación: hay potencial mayor del esperado en este tipo de acción`);
    }
  }
  return lessons;
};

export const recordInsight = async (
  brandId: string,
  insight: { title: string; description: string; sourceEntries?: string[] },
): Promise<ReflectionEntry> => {
  const entry: ReflectionEntry = {
    id: `refl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    brandId,
    type: 'insight',
    timestamp: new Date().toISOString(),
    title: insight.title,
    context: { triggers: ['pattern-discovery'], modulesInvoked: ['selfReflection'], inputs: {} },
    lessons: [insight.description],
    linkedTo: insight.sourceEntries ?? [],
  };
  const journal = await loadJournal(brandId);
  journal.push(entry);
  await saveJournal(brandId, journal);
  return entry;
};

export const queryJournal = async (
  brandId: string,
  filter: { type?: ReflectionType; sinceDays?: number; minSurprise?: number } = {},
): Promise<ReflectionEntry[]> => {
  const journal = await loadJournal(brandId);
  return journal.filter((e) => {
    if (filter.type && e.type !== filter.type) return false;
    if (filter.sinceDays) {
      const cutoff = Date.now() - filter.sinceDays * 24 * 60 * 60 * 1000;
      if (new Date(e.timestamp).getTime() < cutoff) return false;
    }
    if (filter.minSurprise !== undefined && e.outcome) {
      if (Math.abs(e.outcome.surprise) < filter.minSurprise) return false;
    }
    return true;
  });
};

export const summarizeJournal = async (
  brandId: string,
  days = 30,
): Promise<{
  totalEntries: number;
  decisions: number;
  outcomes: number;
  mistakes: number;
  insights: number;
  avgReward: number;
  avgSurprise: number;
  topLessons: string[];
}> => {
  const entries = await queryJournal(brandId, { sinceDays: days });
  const outcomes = entries.filter((e) => e.type === 'outcome' || e.type === 'mistake');
  const allLessons = entries.flatMap((e) => e.lessons);
  const lessonCounts = new Map<string, number>();
  for (const l of allLessons) lessonCounts.set(l, (lessonCounts.get(l) ?? 0) + 1);
  const topLessons = [...lessonCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([l]) => l);

  return {
    totalEntries: entries.length,
    decisions: entries.filter((e) => e.type === 'decision').length,
    outcomes: outcomes.length,
    mistakes: entries.filter((e) => e.type === 'mistake').length,
    insights: entries.filter((e) => e.type === 'insight').length,
    avgReward: outcomes.length > 0 ? outcomes.reduce((s, e) => s + (e.outcome?.reward ?? 0), 0) / outcomes.length : 0,
    avgSurprise:
      outcomes.length > 0 ? outcomes.reduce((s, e) => s + Math.abs(e.outcome?.surprise ?? 0), 0) / outcomes.length : 0,
    topLessons,
  };
};
