/**
 * Action Log — registro de cada acción del cerebro con narración humana.
 *
 * Cada acción se loguea con:
 *   - qué hizo (technical)
 *   - cómo se lo cuenta al user (narrative)
 *   - cómo suena hablado (voice script)
 *
 * Permite UI mostrar timeline + voiceNarrator leer en voz alta.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';

const ACTION_LOG_DIR = path.resolve('data/neural/action-log');

export type ActionCategory =
  | 'content-created'
  | 'content-published'
  | 'analysis-done'
  | 'crisis-handled'
  | 'experiment-launched'
  | 'memory-consolidated'
  | 'goal-progress'
  | 'trigger-fired'
  | 'agent-assigned'
  | 'skill-invoked'
  | 'task-completed'
  | 'system-health';

export type ActionImportance = 'critical' | 'high' | 'medium' | 'low' | 'info';

export interface ActionEntry {
  id: string;
  brandId: string;
  category: ActionCategory;
  importance: ActionImportance;
  technicalSummary: string;
  narrativeUser: string; // 1-2 frases legibles para humano
  voiceScript: string; // versión optimizada para voz hablada
  emoji: string;
  module: string;
  metadata: Record<string, unknown>;
  outcome?: 'success' | 'partial' | 'failure' | 'pending';
  timestamp: string;
}

const logPath = (brandId: string): string => path.join(ACTION_LOG_DIR, `${brandId}-actions.json`);

const loadLog = async (brandId: string): Promise<ActionEntry[]> => {
  try {
    return JSON.parse(await fs.readFile(logPath(brandId), 'utf-8')) as ActionEntry[];
  } catch {
    return [];
  }
};

const saveLog = async (brandId: string, entries: ActionEntry[]): Promise<void> => {
  await fs.mkdir(ACTION_LOG_DIR, { recursive: true });
  await fs.writeFile(logPath(brandId), JSON.stringify(entries.slice(-2000), null, 2), 'utf-8');
};

const CATEGORY_EMOJI: Record<ActionCategory, string> = {
  'content-created': '✍️',
  'content-published': '📤',
  'analysis-done': '📊',
  'crisis-handled': '🛡️',
  'experiment-launched': '🧪',
  'memory-consolidated': '🧠',
  'goal-progress': '🎯',
  'trigger-fired': '⚡',
  'agent-assigned': '🤖',
  'skill-invoked': '🔧',
  'task-completed': '✅',
  'system-health': '💚',
};

const buildVoiceScript = (narrative: string): string => {
  return narrative
    .replace(/[*_`~#]/g, '')
    .replace(/https?:\/\/\S+/g, 'link')
    .replace(/@(\w+)/g, '$1')
    .replace(/#(\w+)/g, 'hashtag $1')
    .replace(/(\d+)%/g, '$1 por ciento')
    .replace(/\s+/g, ' ')
    .trim();
};

export const recordAction = async (params: {
  brandId: string;
  category: ActionCategory;
  importance?: ActionImportance;
  technicalSummary: string;
  narrativeUser: string;
  module: string;
  metadata?: Record<string, unknown>;
  outcome?: ActionEntry['outcome'];
}): Promise<ActionEntry> => {
  const entry: ActionEntry = {
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    brandId: params.brandId,
    category: params.category,
    importance: params.importance ?? 'medium',
    technicalSummary: params.technicalSummary,
    narrativeUser: params.narrativeUser,
    voiceScript: buildVoiceScript(params.narrativeUser),
    emoji: CATEGORY_EMOJI[params.category],
    module: params.module,
    metadata: params.metadata ?? {},
    outcome: params.outcome,
    timestamp: new Date().toISOString(),
  };

  const entries = await loadLog(params.brandId);
  entries.push(entry);
  await saveLog(params.brandId, entries);
  log.info('[actionLog] recorded', { brandId: params.brandId, category: params.category, id: entry.id });
  return entry;
};

export const queryActions = async (
  brandId: string,
  filter: {
    category?: ActionCategory;
    importance?: ActionImportance;
    module?: string;
    sinceHours?: number;
    limit?: number;
  } = {},
): Promise<ActionEntry[]> => {
  let entries = await loadLog(brandId);
  if (filter.category) entries = entries.filter((e) => e.category === filter.category);
  if (filter.importance) entries = entries.filter((e) => e.importance === filter.importance);
  if (filter.module) entries = entries.filter((e) => e.module === filter.module);
  if (filter.sinceHours) {
    const cutoff = Date.now() - filter.sinceHours * 60 * 60 * 1000;
    entries = entries.filter((e) => new Date(e.timestamp).getTime() >= cutoff);
  }
  entries = entries.slice(-(filter.limit ?? 50)).reverse();
  return entries;
};

export const getActionTimeline = async (
  brandId: string,
  hours = 24,
): Promise<{
  entries: ActionEntry[];
  summary: { total: number; byCategory: Record<string, number>; byImportance: Record<string, number> };
}> => {
  const entries = await queryActions(brandId, { sinceHours: hours, limit: 200 });
  const byCategory: Record<string, number> = {};
  const byImportance: Record<string, number> = {};
  for (const e of entries) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + 1;
    byImportance[e.importance] = (byImportance[e.importance] ?? 0) + 1;
  }
  return { entries, summary: { total: entries.length, byCategory, byImportance } };
};

export const composeDailyBriefing = async (
  brandId: string,
): Promise<{
  textBrief: string;
  voiceBrief: string;
  entries: ActionEntry[];
}> => {
  const { entries, summary } = await getActionTimeline(brandId, 24);
  const critical = entries.filter((e) => e.importance === 'critical');
  const high = entries.filter((e) => e.importance === 'high');
  const published = entries.filter((e) => e.category === 'content-published');

  const lines: string[] = [];
  lines.push(`Briefing diario · ${summary.total} acciones en 24h`);
  if (critical.length > 0) lines.push(`Críticas: ${critical.length}`);
  if (published.length > 0) lines.push(`Publicaciones: ${published.length}`);
  if (high.length > 0) lines.push(`Importantes: ${high.length}`);
  lines.push('');
  for (const e of [...critical, ...high].slice(0, 5)) {
    lines.push(`${e.emoji} ${e.narrativeUser}`);
  }
  const textBrief = lines.join('\n');
  const voiceBrief = buildVoiceScript(
    `Hoy hice ${summary.total} cosas. ${critical.length} críticas, ${published.length} publicaciones. Lo más importante: ${[
      ...critical,
      ...high,
    ]
      .slice(0, 3)
      .map((e) => e.narrativeUser)
      .join('. ')}`,
  );

  return { textBrief, voiceBrief, entries: [...critical, ...high].slice(0, 10) };
};

export const getUnacknowledgedCriticals = async (brandId: string): Promise<ActionEntry[]> => {
  return queryActions(brandId, { importance: 'critical', sinceHours: 24, limit: 50 });
};
