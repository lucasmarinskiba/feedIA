/**
 * Knowledge Ledger — los "apuntes" de Instagram del sistema
 * ─────────────────────────────────────────────────────────────────────────
 * `knowledgeBase/facts` es el corpus ESTÁTICO curado a mano (verdad estable).
 * Este ledger es lo OPUESTO complementario: inteligencia VIVA que el sistema
 * se anota a sí mismo cuando estudia el panorama — cambios de políticas,
 * features nuevas, lo que el mercado está pidiendo, ajustes de algoritmo.
 *
 * Cada apunte tiene confianza, fuente, fecha de observación y caducidad: lo
 * que aprendiste hace 6 meses sobre el algoritmo ya no es confiable, así que
 * envejece y se purga. Lo marcado `needsVerification` es una sospecha a
 * confirmar (el equivalente a "preguntarle al profe").
 *
 * No está scopeado por marca: es conocimiento del DOMINIO Instagram, lo usa
 * todo el sistema (planner, crítico, agentes) para razonar con datos frescos.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

export type LedgerTopic =
  | 'policy-change'
  | 'algorithm-shift'
  | 'new-feature'
  | 'market-demand'
  | 'format-trend'
  | 'risk'
  | 'best-practice';

export type LedgerConfidence = 'alta' | 'media' | 'baja';

export interface LedgerEntry {
  id: string;
  topic: LedgerTopic;
  /** El aprendizaje en una o dos frases, accionable. */
  insight: string;
  confidence: LedgerConfidence;
  /** De dónde salió: "estudio-autónomo", una URL, "consulta-experto", etc. */
  source: string;
  observedAt: string;
  /** ISO. Pasada esta fecha, el apunte se considera vencido y se purga. */
  expiresAt: string;
  /** Sospecha sin confirmar — se debería verificar antes de actuar fuerte. */
  needsVerification: boolean;
}

interface Store {
  entries: LedgerEntry[];
}

const PATH = resolve('data/runtime/igKnowledgeLedger.json');
const MAX_ENTRIES = 300;

/** Vida útil por tópico (días). El conocimiento de IG envejece distinto. */
const TTL_DAYS: Record<LedgerTopic, number> = {
  'policy-change': 120,
  'algorithm-shift': 90,
  'new-feature': 180,
  'market-demand': 45,
  'format-trend': 30,
  risk: 60,
  'best-practice': 150,
};

const read = (): Store => {
  if (!existsSync(PATH)) return { entries: [] };
  try {
    return JSON.parse(readFileSync(PATH, 'utf-8')) as Store;
  } catch {
    return { entries: [] };
  }
};

const write = (s: Store): void => {
  mkdirSync(dirname(PATH), { recursive: true });
  if (s.entries.length > MAX_ENTRIES) s.entries.splice(0, s.entries.length - MAX_ENTRIES);
  writeFileSync(PATH, JSON.stringify(s, null, 2), 'utf-8');
};

let _seq = 0;
const newId = (): string => `led-${Date.now().toString(36)}-${(++_seq).toString(36)}`;

const isFresh = (e: LedgerEntry, now: number): boolean => Date.parse(e.expiresAt) > now;

/** Purga apuntes vencidos y devuelve cuántos quedaron. */
export const pruneLedger = (): { kept: number; pruned: number } => {
  const s = read();
  const now = Date.now();
  const before = s.entries.length;
  s.entries = s.entries.filter((e) => isFresh(e, now));
  write(s);
  return { kept: s.entries.length, pruned: before - s.entries.length };
};

export const recordLedgerEntry = (params: {
  topic: LedgerTopic;
  insight: string;
  confidence: LedgerConfidence;
  source: string;
  needsVerification?: boolean;
}): LedgerEntry => {
  const s = read();
  const now = Date.now();
  const ttl = TTL_DAYS[params.topic] ?? 60;
  // Dedup pragmático: mismo tópico + insight muy parecido → refresca el viejo.
  const norm = params.insight.trim().toLowerCase().slice(0, 80);
  const existing = s.entries.find(
    (e) => e.topic === params.topic && e.insight.trim().toLowerCase().slice(0, 80) === norm,
  );
  if (existing) {
    existing.confidence = params.confidence;
    existing.source = params.source;
    existing.observedAt = new Date(now).toISOString();
    existing.expiresAt = new Date(now + ttl * 86_400_000).toISOString();
    existing.needsVerification = params.needsVerification ?? false;
    write(s);
    return existing;
  }
  const entry: LedgerEntry = {
    id: newId(),
    topic: params.topic,
    insight: params.insight.trim(),
    confidence: params.confidence,
    source: params.source,
    observedAt: new Date(now).toISOString(),
    expiresAt: new Date(now + ttl * 86_400_000).toISOString(),
    needsVerification: params.needsVerification ?? false,
  };
  s.entries.push(entry);
  write(s);
  return entry;
};

export const queryLedger = (filter?: {
  topic?: LedgerTopic;
  minConfidence?: LedgerConfidence;
  freshOnly?: boolean;
  search?: string;
  limit?: number;
}): LedgerEntry[] => {
  const rank: Record<LedgerConfidence, number> = { alta: 3, media: 2, baja: 1 };
  const now = Date.now();
  let out = read().entries;
  if (filter?.freshOnly !== false) out = out.filter((e) => isFresh(e, now));
  if (filter?.topic) out = out.filter((e) => e.topic === filter.topic);
  if (filter?.minConfidence) {
    out = out.filter((e) => rank[e.confidence] >= rank[filter.minConfidence!]);
  }
  if (filter?.search) {
    const q = filter.search.toLowerCase();
    out = out.filter((e) => e.insight.toLowerCase().includes(q));
  }
  out = out.sort(
    (a, b) => rank[b.confidence] - rank[a.confidence] || Date.parse(b.observedAt) - Date.parse(a.observedAt),
  );
  return filter?.limit ? out.slice(0, filter.limit) : out;
};

/** Resumen compacto para inyectar en prompts (planner/crítico/agentes). */
export const formatLedgerAsPrompt = (limit = 12): string => {
  const entries = queryLedger({ freshOnly: true, limit });
  if (entries.length === 0) return 'Sin inteligencia reciente registrada.';
  const icon: Record<LedgerTopic, string> = {
    'policy-change': '📜',
    'algorithm-shift': '🔀',
    'new-feature': '✨',
    'market-demand': '🛒',
    'format-trend': '📈',
    risk: '⚠️',
    'best-practice': '✅',
  };
  return entries
    .map((e) => `${icon[e.topic]} (${e.confidence}${e.needsVerification ? ', a verificar' : ''}) ${e.insight}`)
    .join('\n');
};
