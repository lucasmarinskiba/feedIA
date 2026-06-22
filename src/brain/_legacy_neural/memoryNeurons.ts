// @ts-nocheck
/**
 * Memory Neurons — Memoria episódica + semántica de la red neural.
 *
 * Simula 2 tipos de memoria del cerebro:
 *   - EPISÓDICA: eventos específicos (qué pasó, cuándo, resultado)
 *   - SEMÁNTICA: conocimiento generalizado (patrones aprendidos)
 *
 * Permite que FeedIA "recuerde" decisiones pasadas y sus consecuencias,
 * generalizando patrones para situaciones similares.
 *
 * Implementa decay (olvido) e importancia (consolidación de memoria fuerte).
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import type { RLAction } from './reinforcementEngine.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const MEMORY_DIR = path.resolve('data/neural/memory');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface EpisodicMemory {
  id: string;
  brandId: string;
  timestamp: string;
  event: string; // descripción del evento ("Posteo carrusel sobre X")
  context: Record<string, unknown>; // contexto en que ocurrió
  action: RLAction;
  outcome: 'success' | 'partial' | 'failure';
  reward: number; // -1 a 1
  emotionalValence: 'positive' | 'neutral' | 'negative'; // tono del resultado
  importance: number; // 0-1 (peso para no olvidar)
  decayFactor: number; // 0-1 (qué tan rápido se olvida)
  tags: string[];
  relatedMemories: string[]; // IDs de memorias relacionadas
  lastAccessed: string;
  accessCount: number;
}

export interface SemanticMemory {
  id: string;
  brandId: string;
  concept: string; // ej "carruseles educativos los martes funcionan"
  evidenceCount: number; // cuántas memorias episódicas lo respaldan
  confidence: number; // 0-1
  contexts: string[]; // contextos donde aplica
  contraEvidence: string[]; // memorias que la contradicen
  derivedFrom: string[]; // IDs de episodic memories que la generaron
  generalization: string; // regla generalizada
  applicability: 'always' | 'conditional' | 'rare';
  createdAt: string;
  reinforcedAt: string;
  reinforcementCount: number;
}

export interface MemoryQuery {
  brandId: string;
  context?: Record<string, unknown>;
  action?: RLAction;
  minImportance?: number;
  minReward?: number;
  tags?: string[];
  limit?: number;
}

export interface MemoryRecallResult {
  episodic: EpisodicMemory[];
  semantic: SemanticMemory[];
  suggestedAction?: RLAction;
  suggestedActionConfidence: number;
  reasoning: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ensureMemoryDir = async (): Promise<void> => {
  await fs.mkdir(MEMORY_DIR, { recursive: true });
};

const episodicPath = (brandId: string): string => path.join(MEMORY_DIR, `${brandId}-episodic.json`);

const semanticPath = (brandId: string): string => path.join(MEMORY_DIR, `${brandId}-semantic.json`);

const loadEpisodic = async (brandId: string): Promise<EpisodicMemory[]> => {
  try {
    return JSON.parse(await fs.readFile(episodicPath(brandId), 'utf-8')) as EpisodicMemory[];
  } catch {
    return [];
  }
};

const saveEpisodic = async (brandId: string, memories: EpisodicMemory[]): Promise<void> => {
  await ensureMemoryDir();
  await fs.writeFile(episodicPath(brandId), JSON.stringify(memories.slice(-2000), null, 2), 'utf-8');
};

const loadSemantic = async (brandId: string): Promise<SemanticMemory[]> => {
  try {
    return JSON.parse(await fs.readFile(semanticPath(brandId), 'utf-8')) as SemanticMemory[];
  } catch {
    return [];
  }
};

const saveSemantic = async (brandId: string, memories: SemanticMemory[]): Promise<void> => {
  await ensureMemoryDir();
  await fs.writeFile(semanticPath(brandId), JSON.stringify(memories.slice(-500), null, 2), 'utf-8');
};

// ── Cálculo de importancia + decay ───────────────────────────────────────────

const calculateImportance = (reward: number, emotionalValence: EpisodicMemory['emotionalValence']): number => {
  // Importancia base por magnitud del reward
  let importance = Math.abs(reward);
  // Bonus por valencia emocional extrema (alta/muy baja recompensa = más memorable)
  if (emotionalValence === 'positive' && reward > 0.7) importance += 0.2;
  if (emotionalValence === 'negative' && reward < -0.5) importance += 0.3;
  return Math.min(1, importance);
};

const applyDecay = (memory: EpisodicMemory): number => {
  const daysOld = (Date.now() - new Date(memory.timestamp).getTime()) / (24 * 60 * 60 * 1000);
  const decayed = memory.importance * Math.exp(-memory.decayFactor * daysOld);
  // Reforzar por acceso reciente
  const daysSinceAccess = (Date.now() - new Date(memory.lastAccessed).getTime()) / (24 * 60 * 60 * 1000);
  const accessBoost =
    memory.accessCount > 0 ? Math.min(0.2, (memory.accessCount * 0.02) / Math.max(1, daysSinceAccess)) : 0;
  return Math.min(1, decayed + accessBoost);
};

// ── API: Memoria Episódica ────────────────────────────────────────────────────

/** Registra un nuevo recuerdo episódico. */
export const recordEpisodicMemory = async (
  brand: BrandProfile,
  params: {
    event: string;
    context: Record<string, unknown>;
    action: RLAction;
    outcome: EpisodicMemory['outcome'];
    reward: number;
    tags?: string[];
  },
): Promise<EpisodicMemory> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const now = new Date().toISOString();
  const valence: EpisodicMemory['emotionalValence'] =
    params.reward > 0.3 ? 'positive' : params.reward < -0.3 ? 'negative' : 'neutral';

  const memory: EpisodicMemory = {
    id: `epi-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    brandId,
    timestamp: now,
    event: params.event,
    context: params.context,
    action: params.action,
    outcome: params.outcome,
    reward: params.reward,
    emotionalValence: valence,
    importance: calculateImportance(params.reward, valence),
    decayFactor: 0.005, // ~200 días de half-life
    tags: params.tags ?? [],
    relatedMemories: [],
    lastAccessed: now,
    accessCount: 0,
  };

  const memories = await loadEpisodic(brandId);
  await saveEpisodic(brandId, [...memories, memory]);

  log.info('[memoryNeurons] episodic memory recorded', {
    brandId,
    event: params.event.slice(0, 50),
    reward: params.reward,
  });
  return memory;
};

/** Recupera memorias relevantes por consulta. */
export const recallMemories = async (query: MemoryQuery): Promise<MemoryRecallResult> => {
  const episodic = await loadEpisodic(query.brandId);
  const semantic = await loadSemantic(query.brandId);

  // Aplicar decay y filtrar por importancia
  const livingMemories = episodic
    .map((m) => ({ ...m, importance: applyDecay(m) }))
    .filter((m) => m.importance >= (query.minImportance ?? 0.1));

  // Filtrar por criterios
  let filteredEpisodic = livingMemories;
  if (query.action) filteredEpisodic = filteredEpisodic.filter((m) => m.action === query.action);
  if (query.minReward !== undefined) filteredEpisodic = filteredEpisodic.filter((m) => m.reward >= query.minReward!);
  if (query.tags?.length)
    filteredEpisodic = filteredEpisodic.filter((m) => query.tags!.some((t) => m.tags.includes(t)));

  // Ranking por relevancia (importancia × similitud de contexto)
  filteredEpisodic.sort((a, b) => b.importance - a.importance);
  filteredEpisodic = filteredEpisodic.slice(0, query.limit ?? 10);

  // Marcar accesos
  const updatedEpisodic = episodic.map((m) => {
    const isRecalled = filteredEpisodic.find((f) => f.id === m.id);
    return isRecalled ? { ...m, lastAccessed: new Date().toISOString(), accessCount: m.accessCount + 1 } : m;
  });
  await saveEpisodic(query.brandId, updatedEpisodic);

  // Filtrar semantic relevante
  const relevantSemantic = semantic.filter((s) => {
    if (query.action && !s.contexts.includes(query.action)) return false;
    return s.confidence > 0.5;
  });

  // Sugerir acción basada en memorias
  const positiveMemories = filteredEpisodic.filter((m) => m.reward > 0.3);
  const actionCounts: Record<string, { count: number; totalReward: number }> = {};
  for (const m of positiveMemories) {
    actionCounts[m.action] = actionCounts[m.action] ?? { count: 0, totalReward: 0 };
    actionCounts[m.action]!.count++;
    actionCounts[m.action]!.totalReward += m.reward;
  }
  const sortedActions = Object.entries(actionCounts)
    .map(([action, data]) => ({
      action: action as RLAction,
      avgReward: data.totalReward / data.count,
      count: data.count,
    }))
    .sort((a, b) => b.avgReward * b.count - a.avgReward * a.count);

  return {
    episodic: filteredEpisodic,
    semantic: relevantSemantic,
    suggestedAction: sortedActions[0]?.action,
    suggestedActionConfidence: sortedActions[0]
      ? Math.min(1, sortedActions[0].avgReward * Math.log10(sortedActions[0].count + 1))
      : 0,
    reasoning: sortedActions[0]
      ? `Acción "${sortedActions[0].action}" produjo reward promedio ${sortedActions[0].avgReward.toFixed(2)} en ${sortedActions[0].count} ocasiones similares`
      : 'Sin patrones suficientes en memoria',
  };
};

// ── API: Memoria Semántica (consolidación) ────────────────────────────────────

/** Consolida memorias episódicas en conocimiento semántico (run periódico). */
export const consolidateMemories = async (brand: BrandProfile): Promise<SemanticMemory[]> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const episodic = await loadEpisodic(brandId);
  if (episodic.length < 10) return [];

  log.info('[memoryNeurons] consolidating memories', { brandId, episodicCount: episodic.length });

  // Pasar últimas 50 memorias a Claude para que extraiga patrones
  const recent = episodic.slice(-50);

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 2500,
    thinking: { type: 'adaptive' },
    system: `Eres un módulo de consolidación de memoria neural.
Tu trabajo: analizar memorias episódicas (eventos individuales) y extraer patrones generalizables (memoria semántica).
Solo genera reglas con al menos 3 evidencias coincidentes.
Devuelves JSON puro.`,
    messages: [
      {
        role: 'user',
        content: `Consolida estos eventos en reglas generalizadas para ${brand.name}:

${recent.map((m, i) => `[${i}] ${m.timestamp.slice(0, 10)} | Acción: ${m.action} | Resultado: ${m.outcome} | Reward: ${m.reward.toFixed(2)} | Evento: ${m.event}`).join('\n')}

Identifica patrones recurrentes y genera reglas semánticas.
Cada regla debe tener mínimo 3 evidencias.

JSON: {
  "rules": [{
    "concept": "patrón identificado",
    "generalization": "regla aplicable",
    "evidenceCount": número,
    "confidence": 0-1,
    "contexts": ["contexto1"],
    "contraEvidence": ["caso que la contradice"],
    "derivedFrom": [índices del array de eventos: 0, 5, 12],
    "applicability": "always|conditional|rare"
  }]
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];

  const generated = JSON.parse(jsonMatch[0]) as {
    rules: Array<{
      concept: string;
      generalization: string;
      evidenceCount: number;
      confidence: number;
      contexts: string[];
      contraEvidence: string[];
      derivedFrom: number[];
      applicability: SemanticMemory['applicability'];
    }>;
  };

  const existing = await loadSemantic(brandId);
  const now = new Date().toISOString();
  const newMemories: SemanticMemory[] = generated.rules.map((r, i) => ({
    id: `sem-${Date.now()}-${i}`,
    brandId,
    concept: r.concept,
    evidenceCount: r.evidenceCount,
    confidence: r.confidence,
    contexts: r.contexts,
    contraEvidence: r.contraEvidence,
    derivedFrom: r.derivedFrom.map((idx) => recent[idx]?.id ?? '').filter(Boolean),
    generalization: r.generalization,
    applicability: r.applicability,
    createdAt: now,
    reinforcedAt: now,
    reinforcementCount: 1,
  }));

  // Reforzar memorias existentes si el concepto se repite
  for (const newMem of newMemories) {
    const existingMatch = existing.find((e) =>
      e.concept.toLowerCase().includes(newMem.concept.toLowerCase().split(' ').slice(0, 3).join(' ')),
    );
    if (existingMatch) {
      existingMatch.reinforcementCount++;
      existingMatch.reinforcedAt = now;
      existingMatch.confidence = Math.min(1, existingMatch.confidence + 0.05);
      existingMatch.evidenceCount += newMem.evidenceCount;
    } else {
      existing.push(newMem);
    }
  }

  await saveSemantic(brandId, existing);
  log.info('[memoryNeurons] consolidation done', { brandId, newRules: newMemories.length });
  return existing;
};

/** Estadísticas de memoria. */
export const getMemoryStats = async (
  brandId: string,
): Promise<{
  episodicCount: number;
  semanticCount: number;
  avgImportance: number;
  oldestMemory: string | null;
  topConcepts: string[];
}> => {
  const [episodic, semantic] = await Promise.all([loadEpisodic(brandId), loadSemantic(brandId)]);
  const avgImportance = episodic.length > 0 ? episodic.reduce((s, m) => s + applyDecay(m), 0) / episodic.length : 0;
  return {
    episodicCount: episodic.length,
    semanticCount: semantic.length,
    avgImportance,
    oldestMemory: episodic[0]?.timestamp ?? null,
    topConcepts: semantic
      .sort((a, b) => b.confidence * b.evidenceCount - a.confidence * a.evidenceCount)
      .slice(0, 5)
      .map((s) => s.concept),
  };
};

/** Olvida memorias por debajo de un umbral de importancia (limpieza). */
export const pruneWeakMemories = async (brandId: string, threshold = 0.05): Promise<number> => {
  const episodic = await loadEpisodic(brandId);
  const pruned = episodic.filter((m) => applyDecay(m) >= threshold);
  const removedCount = episodic.length - pruned.length;
  await saveEpisodic(brandId, pruned);
  log.info('[memoryNeurons] pruned weak memories', { brandId, removed: removedCount });
  return removedCount;
};
