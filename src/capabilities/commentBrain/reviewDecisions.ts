/**
 * Registro de decisiones humanas sobre los borradores del Comment Brain.
 *
 * Es lo que convierte el modo sombra en evidencia: cada aprobación, edición o
 * rechazo queda guardado (append-only, JSONL) y de ahí sale la métrica de
 * graduación — de lo que `balanced` habría enviado SIN supervisión, ¿cuánto
 * aprobó una persona tal cual? Sin ese dato, pasar de `suggest` a `balanced`
 * sería una apuesta.
 *
 * Además queda el par (borrador → texto final) de cada edición: es el material
 * para mejorar los prompts con ejemplos reales de cómo corrige el equipo.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { log } from '../../agent/logger.js';
import type { CommentKind, ReplyMode, SarcasmStance } from './types.js';

export type ReviewOutcome = 'approved-as-is' | 'approved-edited' | 'rejected' | 'handled-elsewhere';

export interface DecisionRecord {
  id: string;
  decidedAt: string;
  outcome: ReviewOutcome;
  itemId: string;
  accountKey: string;
  handle: string;
  commentText: string;
  kind: CommentKind;
  sarcasm: SarcasmStance | null;
  mode?: ReplyMode;
  /** En modo sombra: `balanced` lo habría enviado solo. */
  wouldHaveReplied?: boolean;
  draft?: string;
  finalText?: string;
  reason?: string;
  /** Salió de verdad por la red (false con DRY_RUN activo). */
  sent?: boolean;
}

/**
 * Umbrales para recomendar pasar a `balanced`. Son un punto de partida razonable, no una verdad:
 * conviene ajustarlos con el criterio de quien conoce a la marca.
 */
export const GRADUATION_THRESHOLDS = {
  minSample: 50,
  minAsIsRate: 0.9,
  maxRejectedRate: 0.02,
} as const;

const MAX_IN_MEMORY = 5000;
const COMPACT_AFTER_LINES = 6000;
const DEFAULT_PATH = resolve('data/runtime/comment-review-decisions.jsonl');

let storePath: string | null = DEFAULT_PATH;
let hydrated = false;
let seq = 0;
const decisions: DecisionRecord[] = [];

/** Cambia (o desactiva con null) el archivo. Los tests lo usan para no escribir en data/. */
export const configureDecisionStore = (path: string | null): void => {
  storePath = path;
  hydrated = false;
  decisions.length = 0;
};

const hydrate = (): void => {
  if (hydrated) return;
  hydrated = true;
  if (!storePath || !existsSync(storePath)) return;
  try {
    const lines = readFileSync(storePath, 'utf-8')
      .split('\n')
      .filter((l) => l.trim());
    for (const raw of lines) {
      try {
        decisions.push(JSON.parse(raw) as DecisionRecord);
      } catch {
        // línea corrupta (corte a mitad de escritura): se descarta
      }
    }
    if (decisions.length > MAX_IN_MEMORY) decisions.splice(0, decisions.length - MAX_IN_MEMORY);
    if (lines.length > COMPACT_AFTER_LINES) {
      writeFileSync(storePath, decisions.map((d) => JSON.stringify(d)).join('\n') + '\n', 'utf-8');
    }
  } catch (err) {
    log.warn(`[CommentBrain] no pude leer las decisiones: ${err instanceof Error ? err.message : String(err)}`);
  }
};

export const recordDecision = (input: Omit<DecisionRecord, 'id' | 'decidedAt'>): DecisionRecord => {
  hydrate();
  seq += 1;
  const record: DecisionRecord = { ...input, id: `dec-${Date.now()}-${seq}`, decidedAt: new Date().toISOString() };
  decisions.push(record);
  if (decisions.length > MAX_IN_MEMORY) decisions.shift();
  if (storePath) {
    try {
      mkdirSync(dirname(storePath), { recursive: true });
      appendFileSync(storePath, `${JSON.stringify(record)}\n`, 'utf-8');
    } catch (err) {
      // Perder el registro en disco no debe frenar la respuesta ya enviada: queda en memoria.
      log.warn(`[CommentBrain] no pude persistir la decisión: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
  return record;
};

/** Más nuevas primero. */
export const listDecisions = (limit = 50): DecisionRecord[] => {
  hydrate();
  return decisions.slice(-limit).reverse();
};

export interface ShadowStats {
  sample: number;
  approvedAsIs: number;
  approvedEdited: number;
  rejected: number;
  /** null mientras no hay muestra. */
  asIsRate: number | null;
  rejectedRate: number | null;
}

export interface DecisionSummary {
  total: number;
  approvedAsIs: number;
  approvedEdited: number;
  rejected: number;
  handledElsewhere: number;
  /** Solo los casos que `balanced` habría enviado sin supervisión: la evidencia que importa. */
  shadow: ShadowStats;
  byMode: Record<string, { sample: number; approvedAsIs: number }>;
}

const REVIEWED: ReadonlySet<ReviewOutcome> = new Set<ReviewOutcome>(['approved-as-is', 'approved-edited', 'rejected']);

export const summarizeDecisions = (): DecisionSummary => {
  hydrate();
  const s: DecisionSummary = {
    total: decisions.length,
    approvedAsIs: 0,
    approvedEdited: 0,
    rejected: 0,
    handledElsewhere: 0,
    shadow: { sample: 0, approvedAsIs: 0, approvedEdited: 0, rejected: 0, asIsRate: null, rejectedRate: null },
    byMode: {},
  };

  for (const d of decisions) {
    if (d.outcome === 'approved-as-is') s.approvedAsIs += 1;
    else if (d.outcome === 'approved-edited') s.approvedEdited += 1;
    else if (d.outcome === 'rejected') s.rejected += 1;
    else s.handledElsewhere += 1;

    if (!REVIEWED.has(d.outcome)) continue;

    if (d.mode) {
      const m = (s.byMode[d.mode] ??= { sample: 0, approvedAsIs: 0 });
      m.sample += 1;
      if (d.outcome === 'approved-as-is') m.approvedAsIs += 1;
    }
    if (d.wouldHaveReplied) {
      s.shadow.sample += 1;
      if (d.outcome === 'approved-as-is') s.shadow.approvedAsIs += 1;
      else if (d.outcome === 'approved-edited') s.shadow.approvedEdited += 1;
      else s.shadow.rejected += 1;
    }
  }
  if (s.shadow.sample > 0) {
    s.shadow.asIsRate = s.shadow.approvedAsIs / s.shadow.sample;
    s.shadow.rejectedRate = s.shadow.rejected / s.shadow.sample;
  }
  return s;
};

export interface Graduation {
  /** ¿Hay evidencia suficiente para pasar a `balanced`? */
  ready: boolean;
  sample: number;
  needed: number;
  asIsRate: number | null;
  rejectedRate: number | null;
  thresholds: typeof GRADUATION_THRESHOLDS;
  /** Por qué todavía no (vacío si está listo). */
  blockers: string[];
}

const pct = (n: number): string => `${Math.round(n * 100)}%`;

export const evaluateGraduation = (summary: DecisionSummary = summarizeDecisions()): Graduation => {
  const { sample, asIsRate, rejectedRate } = summary.shadow;
  const t = GRADUATION_THRESHOLDS;
  const blockers: string[] = [];

  if (sample < t.minSample) {
    // Con una muestra chica las tasas son ruido (1 de 2 = 50%): primero hace falta volumen.
    blockers.push(`faltan revisiones: ${sample}/${t.minSample}`);
  } else {
    if (asIsRate !== null && asIsRate < t.minAsIsRate) {
      blockers.push(`solo ${pct(asIsRate)} aprobado sin cambios (mínimo ${pct(t.minAsIsRate)})`);
    }
    if (rejectedRate !== null && rejectedRate > t.maxRejectedRate) {
      blockers.push(`${pct(rejectedRate)} rechazado (máximo ${pct(t.maxRejectedRate)})`);
    }
  }

  return {
    ready: blockers.length === 0,
    sample,
    needed: Math.max(0, t.minSample - sample),
    asIsRate,
    rejectedRate,
    thresholds: t,
    blockers,
  };
};
