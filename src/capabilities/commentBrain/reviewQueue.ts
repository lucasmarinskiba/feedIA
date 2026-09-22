/**
 * Memoria del Comment Brain: anti-repetición + cola de revisión.
 *
 *  - Últimas respuestas por cuenta (en proceso): alimentan el anti-repetición.
 *    Respuestas calcadas entre comentarios son la firma clásica de un bot (y de
 *    spam para los filtros de Meta).
 *  - Cola de revisión (persistente): borradores, casos escalados y, en modo
 *    sombra, lo que el brain decidió ignorar. Se guarda como JSONL en
 *    `data/runtime/comment-review.jsonl` para sobrevivir reinicios y poder
 *    auditar qué habría hecho el bot antes de darle autonomía.
 *
 * Limitación: es un archivo local. En hosts de filesystem efímero (redeploy) se
 * pierde; una tabla en DB es el siguiente paso si esto pasa a producción real.
 */

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { emit } from '../../agent/bus.js';
import { log } from '../../agent/logger.js';
import type { Classification, PlanAction, ReplyMode } from './types.js';

const MAX_RECENT = 30;
const MAX_QUEUE = 200;
const COMPACT_AFTER_LINES = 1000;
const DEFAULT_STORE = resolve('data/runtime/comment-review.jsonl');

const recentByAccount = new Map<string, string[]>();

export const getRecentReplies = (accountKey: string): string[] => [...(recentByAccount.get(accountKey) ?? [])];

export const rememberReply = (accountKey: string, text: string): void => {
  const list = recentByAccount.get(accountKey) ?? [];
  list.push(text);
  while (list.length > MAX_RECENT) list.shift();
  recentByAccount.set(accountKey, list);
};

export interface ReviewItem {
  id: string;
  createdAt: string;
  accountKey: string;
  commentId?: string;
  handle: string;
  commentText: string;
  action: Extract<PlanAction, 'draft-for-review' | 'escalate' | 'ignore'>;
  mode?: ReplyMode;
  draft?: string;
  reasons: string[];
  classification: Classification;
  /** Solo modo sombra: en `balanced` este comentario se habría respondido solo. */
  wouldHaveReplied?: boolean;
}

type StoreLine = { t: 'add'; item: ReviewItem } | { t: 'resolve'; id: string };

const queue: ReviewItem[] = [];
let storePath: string | null = DEFAULT_STORE;
let hydrated = false;
let seq = 0;

/** Cambia (o desactiva con null) el archivo de persistencia. Los tests lo usan para no escribir en data/. */
export const configureReviewStore = (path: string | null): void => {
  storePath = path;
  hydrated = false;
  queue.length = 0;
};

const persist = (line: StoreLine): void => {
  if (!storePath) return;
  try {
    mkdirSync(dirname(storePath), { recursive: true });
    appendFileSync(storePath, `${JSON.stringify(line)}\n`, 'utf-8');
  } catch (err) {
    // Que falle el disco nunca debe romper el flujo de respuestas.
    log.warn(
      `[CommentBrain] no pude persistir la cola de revisión: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
};

const hydrate = (): void => {
  if (hydrated) return;
  hydrated = true;
  if (!storePath || !existsSync(storePath)) return;
  try {
    const live = new Map<string, ReviewItem>();
    let lines = 0;
    for (const raw of readFileSync(storePath, 'utf-8').split('\n')) {
      if (!raw.trim()) continue;
      lines += 1;
      try {
        const line = JSON.parse(raw) as StoreLine;
        if (line.t === 'add') live.set(line.item.id, line.item);
        else if (line.t === 'resolve') live.delete(line.id);
      } catch {
        // línea corrupta (corte a mitad de escritura): se descarta
      }
    }
    queue.push(...[...live.values()].slice(-MAX_QUEUE));
    if (lines > COMPACT_AFTER_LINES) {
      writeFileSync(
        storePath,
        queue.map((item) => JSON.stringify({ t: 'add', item })).join('\n') + (queue.length ? '\n' : ''),
        'utf-8',
      );
    }
  } catch (err) {
    log.warn(`[CommentBrain] no pude leer la cola de revisión: ${err instanceof Error ? err.message : String(err)}`);
  }
};

export const enqueueReview = (item: Omit<ReviewItem, 'id' | 'createdAt'>): ReviewItem => {
  hydrate();
  seq += 1;
  const full: ReviewItem = { ...item, id: `cr-${Date.now()}-${seq}`, createdAt: new Date().toISOString() };
  queue.push(full);
  while (queue.length > MAX_QUEUE) queue.shift();
  persist({ t: 'add', item: full });

  // Los "ignorados" (modo sombra) son solo para auditoría: no ensucian el bus.
  if (item.action !== 'ignore') {
    emit({
      type: 'CommentReviewRequired',
      sourceAgent: 'comment-brain',
      priority: item.action === 'escalate' ? 'high' : 'normal',
      correlationId: full.id,
      payload: {
        reviewId: full.id,
        handle: full.handle,
        action: full.action,
        kind: full.classification.kind,
        reasons: full.reasons,
        hasDraft: Boolean(full.draft),
      },
    });
  }
  return full;
};

/** Más nuevos primero. */
export const listReviewQueue = (filter: { action?: ReviewItem['action']; limit?: number } = {}): ReviewItem[] => {
  hydrate();
  const items = queue.filter((q) => !filter.action || q.action === filter.action).reverse();
  return filter.limit ? items.slice(0, filter.limit) : items;
};

export const getReviewItem = (id: string): ReviewItem | undefined => {
  hydrate();
  return queue.find((q) => q.id === id);
};

export const resolveReview = (id: string): boolean => {
  hydrate();
  const idx = queue.findIndex((q) => q.id === id);
  if (idx === -1) return false;
  queue.splice(idx, 1);
  persist({ t: 'resolve', id });
  return true;
};

export interface QueueSummary {
  total: number;
  byAction: Record<string, number>;
  byKind: Record<string, number>;
  /** Cuántos de los pendientes se habrían respondido solos en `balanced`. */
  wouldHaveReplied: number;
}

export const summarizeQueue = (): QueueSummary => {
  hydrate();
  const byAction: Record<string, number> = {};
  const byKind: Record<string, number> = {};
  let wouldHaveReplied = 0;
  for (const q of queue) {
    byAction[q.action] = (byAction[q.action] ?? 0) + 1;
    byKind[q.classification.kind] = (byKind[q.classification.kind] ?? 0) + 1;
    if (q.wouldHaveReplied) wouldHaveReplied += 1;
  }
  return { total: queue.length, byAction, byKind, wouldHaveReplied };
};

/** Solo para tests. */
export const resetBrainMemory = (): void => {
  recentByAccount.clear();
  queue.length = 0;
  hydrated = true;
};
