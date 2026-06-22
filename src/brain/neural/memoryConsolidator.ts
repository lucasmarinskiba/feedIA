/**
 * Memory Consolidator — destila episodic memories en reglas semánticas.
 *
 * Periodicamente lee data/neural/memory/{brandId}-episodic.json
 * y extrae patrones via heurística estadística (sin Anthropic).
 *
 * Output: data/neural/memory/{brandId}-semantic.json
 *
 * Patrones detectados:
 *   - Acción X tuvo reward promedio Y en N ocasiones
 *   - Acción X funciona en context Y, falla en Z
 *   - Co-occurrencias (acción A seguida de B genera reward Z)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';

const MEMORY_DIR = path.resolve('data/neural/memory');

export interface EpisodicEntry {
  id: string;
  brandId: string;
  event: string;
  action: string;
  outcome: 'success' | 'partial' | 'failure';
  reward: number;
  emotionalValence: 'positive' | 'neutral' | 'negative';
  importance: number;
  tags: string[];
  context: Record<string, unknown>;
  timestamp: string;
}

export interface SemanticRule {
  id: string;
  ruleType: 'action-reward' | 'action-context' | 'co-occurrence' | 'temporal-pattern';
  description: string;
  evidence: number; // # episodes que la soportan
  confidence: number; // 0-1
  averageReward: number;
  context: Record<string, unknown>;
  generatedAt: string;
  lastReinforced: string;
}

export interface ConsolidationReport {
  brandId: string;
  generatedAt: string;
  episodesProcessed: number;
  newRulesCreated: number;
  rulesReinforced: number;
  rulesArchived: number;
  totalSemanticRules: number;
  summary: {
    topPositiveActions: Array<{ action: string; avgReward: number; count: number }>;
    topNegativeActions: Array<{ action: string; avgReward: number; count: number }>;
    mostFrequentContexts: Array<{ key: string; count: number }>;
  };
}

const episodicPath = (brandId: string): string => path.join(MEMORY_DIR, `${brandId}-episodic.json`);
const semanticPath = (brandId: string): string => path.join(MEMORY_DIR, `${brandId}-semantic.json`);

const loadEpisodic = async (brandId: string): Promise<EpisodicEntry[]> => {
  try {
    return JSON.parse(await fs.readFile(episodicPath(brandId), 'utf-8')) as EpisodicEntry[];
  } catch {
    return [];
  }
};

const loadSemantic = async (brandId: string): Promise<SemanticRule[]> => {
  try {
    return JSON.parse(await fs.readFile(semanticPath(brandId), 'utf-8')) as SemanticRule[];
  } catch {
    return [];
  }
};

const saveSemantic = async (brandId: string, rules: SemanticRule[]): Promise<void> => {
  await fs.mkdir(MEMORY_DIR, { recursive: true });
  await fs.writeFile(semanticPath(brandId), JSON.stringify(rules.slice(-500), null, 2), 'utf-8');
};

const groupBy = <T>(items: T[], keyFn: (item: T) => string): Map<string, T[]> => {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
};

const extractActionRewardRules = (episodes: EpisodicEntry[]): SemanticRule[] => {
  const byAction = groupBy(episodes, (e) => e.action);
  const rules: SemanticRule[] = [];
  for (const [action, eps] of byAction.entries()) {
    if (eps.length < 3) continue;
    const avgReward = eps.reduce((s, e) => s + e.reward, 0) / eps.length;
    const stddev = Math.sqrt(eps.reduce((s, e) => s + (e.reward - avgReward) ** 2, 0) / eps.length);
    const confidence = Math.min(1, eps.length / 20) * Math.max(0.1, 1 - stddev);
    rules.push({
      id: `rule-ar-${action}-${Date.now()}`,
      ruleType: 'action-reward',
      description:
        avgReward > 0
          ? `Acción "${action}" produce reward promedio ${avgReward.toFixed(2)} (${eps.length} ocasiones)`
          : `Acción "${action}" tiende a fallar (reward ${avgReward.toFixed(2)} en ${eps.length} ocasiones)`,
      evidence: eps.length,
      confidence,
      averageReward: avgReward,
      context: { action, stddev, sampleSize: eps.length },
      generatedAt: new Date().toISOString(),
      lastReinforced: new Date().toISOString(),
    });
  }
  return rules;
};

const extractCoOccurrenceRules = (episodes: EpisodicEntry[]): SemanticRule[] => {
  // Pairs of consecutive actions
  const sorted = [...episodes].sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  const pairs = new Map<string, EpisodicEntry[]>();
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;
    const key = `${a.action}=>${b.action}`;
    if (!pairs.has(key)) pairs.set(key, []);
    pairs.get(key)!.push(b);
  }
  const rules: SemanticRule[] = [];
  for (const [pair, follows] of pairs.entries()) {
    if (follows.length < 3) continue;
    const avgReward = follows.reduce((s, e) => s + e.reward, 0) / follows.length;
    if (Math.abs(avgReward) < 0.2) continue;
    rules.push({
      id: `rule-co-${pair.replace(/\W/g, '_')}-${Date.now()}`,
      ruleType: 'co-occurrence',
      description: `Después de "${pair.split('=>')[0]}", "${pair.split('=>')[1]}" produce reward ${avgReward.toFixed(2)}`,
      evidence: follows.length,
      confidence: Math.min(1, follows.length / 10),
      averageReward: avgReward,
      context: { sequence: pair },
      generatedAt: new Date().toISOString(),
      lastReinforced: new Date().toISOString(),
    });
  }
  return rules;
};

const extractTemporalPatterns = (episodes: EpisodicEntry[]): SemanticRule[] => {
  // Hour-of-day analysis
  const byHour = new Map<number, EpisodicEntry[]>();
  for (const ep of episodes) {
    const hour = new Date(ep.timestamp).getHours();
    if (!byHour.has(hour)) byHour.set(hour, []);
    byHour.get(hour)!.push(ep);
  }
  const rules: SemanticRule[] = [];
  for (const [hour, eps] of byHour.entries()) {
    if (eps.length < 5) continue;
    const avgReward = eps.reduce((s, e) => s + e.reward, 0) / eps.length;
    const overallAvg = episodes.reduce((s, e) => s + e.reward, 0) / Math.max(1, episodes.length);
    const delta = avgReward - overallAvg;
    if (Math.abs(delta) < 0.15) continue;
    rules.push({
      id: `rule-tp-h${hour}-${Date.now()}`,
      ruleType: 'temporal-pattern',
      description:
        delta > 0
          ? `Hora ${hour}:00 funciona mejor (reward +${delta.toFixed(2)} vs promedio)`
          : `Hora ${hour}:00 funciona peor (reward ${delta.toFixed(2)} vs promedio)`,
      evidence: eps.length,
      confidence: Math.min(1, eps.length / 15),
      averageReward: avgReward,
      context: { hourOfDay: hour, deltaVsAverage: delta },
      generatedAt: new Date().toISOString(),
      lastReinforced: new Date().toISOString(),
    });
  }
  return rules;
};

const mergeRules = (
  existing: SemanticRule[],
  fresh: SemanticRule[],
): { merged: SemanticRule[]; reinforced: number; archived: number } => {
  const merged = [...existing];
  let reinforced = 0;
  let archived = 0;

  for (const f of fresh) {
    const match = merged.find((e) => e.description === f.description);
    if (match) {
      match.evidence += f.evidence;
      match.averageReward = (match.averageReward + f.averageReward) / 2;
      match.confidence = Math.min(1, match.confidence + 0.05);
      match.lastReinforced = new Date().toISOString();
      reinforced++;
    } else {
      merged.push(f);
    }
  }

  // Archive: confidence muy bajo y old
  const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
  const filtered = merged.filter((r) => {
    if (r.confidence < 0.2 && new Date(r.lastReinforced).getTime() < cutoff) {
      archived++;
      return false;
    }
    return true;
  });

  return { merged: filtered, reinforced, archived };
};

export const consolidateMemory = async (brandId: string): Promise<ConsolidationReport> => {
  log.info('[memoryConsolidator] starting', { brandId });
  const episodes = await loadEpisodic(brandId);
  const existing = await loadSemantic(brandId);

  const fresh: SemanticRule[] = [
    ...extractActionRewardRules(episodes),
    ...extractCoOccurrenceRules(episodes),
    ...extractTemporalPatterns(episodes),
  ];

  const { merged, reinforced, archived } = mergeRules(existing, fresh);
  await saveSemantic(brandId, merged);

  // Summary
  const byAction = groupBy(episodes, (e) => e.action);
  const actionStats: Array<{ action: string; avgReward: number; count: number }> = [];
  for (const [action, eps] of byAction.entries()) {
    actionStats.push({ action, avgReward: eps.reduce((s, e) => s + e.reward, 0) / eps.length, count: eps.length });
  }
  const topPositive = [...actionStats].sort((a, b) => b.avgReward - a.avgReward).slice(0, 5);
  const topNegative = [...actionStats].sort((a, b) => a.avgReward - b.avgReward).slice(0, 5);

  const contextCounts = new Map<string, number>();
  for (const ep of episodes) {
    for (const tag of ep.tags) contextCounts.set(tag, (contextCounts.get(tag) ?? 0) + 1);
  }
  const mostFrequent = [...contextCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([key, count]) => ({ key, count }));

  const report: ConsolidationReport = {
    brandId,
    generatedAt: new Date().toISOString(),
    episodesProcessed: episodes.length,
    newRulesCreated: fresh.length - reinforced,
    rulesReinforced: reinforced,
    rulesArchived: archived,
    totalSemanticRules: merged.length,
    summary: {
      topPositiveActions: topPositive,
      topNegativeActions: topNegative,
      mostFrequentContexts: mostFrequent,
    },
  };

  log.info('[memoryConsolidator] done', { brandId, total: merged.length, new: report.newRulesCreated });
  return report;
};

export const queryRules = async (
  brandId: string,
  filter: { ruleType?: SemanticRule['ruleType']; minConfidence?: number; positiveOnly?: boolean } = {},
): Promise<SemanticRule[]> => {
  const all = await loadSemantic(brandId);
  return all.filter((r) => {
    if (filter.ruleType && r.ruleType !== filter.ruleType) return false;
    if (filter.minConfidence && r.confidence < filter.minConfidence) return false;
    if (filter.positiveOnly && r.averageReward <= 0) return false;
    return true;
  });
};
