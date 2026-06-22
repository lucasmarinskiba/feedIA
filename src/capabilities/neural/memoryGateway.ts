/**
 * Neural Memory Gateway — Gateway unificado de memoria episódica + semántica
 * Los agentes guardan y recuperan experiencias a través de esta capa.
 */

import { log } from '../../agent/logger.js';

export interface EpisodicMemory {
  id: string;
  agentId: string;
  taskId: string;
  action: string;
  outcome: 'success' | 'partial' | 'failure';
  context: string;
  timestamp: string;
  tags: string[];
  importance: number; // 0-1
}

export interface SemanticMemory {
  id: string;
  concept: string;
  definition: string;
  relationships: Array<{ target: string; relation: string }>;
  source: string;
  timestamp: string;
  confidence: number; // 0-1
}

const EPISODIC_KEY = 'neural_episodic_memory';
const SEMANTIC_KEY = 'neural_semantic_memory';

const loadEpisodic = (): EpisodicMemory[] => {
  try {
    const raw = process.env[EPISODIC_KEY];
    return raw ? (JSON.parse(raw) as EpisodicMemory[]) : [];
  } catch {
    return [];
  }
};

const saveEpisodic = (mems: EpisodicMemory[]): void => {
  process.env[EPISODIC_KEY] = JSON.stringify(mems.slice(-500)); // keep last 500
};

const loadSemantic = (): SemanticMemory[] => {
  try {
    const raw = process.env[SEMANTIC_KEY];
    return raw ? (JSON.parse(raw) as SemanticMemory[]) : [];
  } catch {
    return [];
  }
};

const saveSemantic = (mems: SemanticMemory[]): void => {
  process.env[SEMANTIC_KEY] = JSON.stringify(mems.slice(-200)); // keep last 200
};

export const recordEpisodic = (mem: Omit<EpisodicMemory, 'id' | 'timestamp'>): EpisodicMemory => {
  const full: EpisodicMemory = {
    ...mem,
    id: `ep-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  const all = loadEpisodic();
  all.push(full);
  saveEpisodic(all);
  log.info(`[Memory] Episodic recorded: ${full.action} → ${full.outcome}`);
  return full;
};

export const recordSemantic = (mem: Omit<SemanticMemory, 'id' | 'timestamp'>): SemanticMemory => {
  const full: SemanticMemory = {
    ...mem,
    id: `sm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  };
  const all = loadSemantic();
  all.push(full);
  saveSemantic(all);
  log.info(`[Memory] Semantic recorded: ${full.concept}`);
  return full;
};

export const recallEpisodic = (opts: {
  agentId?: string;
  tags?: string[];
  outcome?: 'success' | 'partial' | 'failure';
  limit?: number;
}): EpisodicMemory[] => {
  let results = loadEpisodic();
  if (opts.agentId) results = results.filter((m) => m.agentId === opts.agentId);
  if (opts.outcome) results = results.filter((m) => m.outcome === opts.outcome);
  if (opts.tags) results = results.filter((m) => opts.tags!.every((t) => m.tags.includes(t)));
  return results.sort((a, b) => b.importance - a.importance).slice(0, opts.limit ?? 10);
};

export const recallSemantic = (conceptQuery: string, limit = 5): SemanticMemory[] => {
  const all = loadSemantic();
  // Simple substring matching (replace with embedding search later)
  const results = all.filter(
    (m) =>
      m.concept.toLowerCase().includes(conceptQuery.toLowerCase()) ||
      m.definition.toLowerCase().includes(conceptQuery.toLowerCase()),
  );
  return results.sort((a, b) => b.confidence - a.confidence).slice(0, limit);
};

export const getMemoryStats = (): { episodicCount: number; semanticCount: number; topTags: string[] } => {
  const episodic = loadEpisodic();
  const semantic = loadSemantic();
  const tagCounts = new Map<string, number>();
  for (const m of episodic) {
    for (const t of m.tags) {
      tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
    }
  }
  const topTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([t]) => t);
  return { episodicCount: episodic.length, semanticCount: semantic.length, topTags };
};
