/**
 * Whiteboard Store — multi-pizarra por marca + CRDT LWW-por-elemento
 * ─────────────────────────────────────────────────────────────────────────
 * Cada marca puede tener VARIAS pizarras nombradas. Estructura en disco:
 *
 *   boards:    { [brandId]: { [boardId]: WhiteboardState } }
 *   boardMeta: { [brandId]: { boards: BoardMeta[]; activeBoardId } }
 *
 * Migración hacia atrás: si se encuentra el formato viejo
 * (`boards[brandId]` es un WhiteboardState con `.elements`), se envuelve en
 * un board "default" sin perder nada.
 *
 * Cada WbElement lleva campos CRDT opcionales (`rev`, `updatedBy`) para el
 * merge determinista LWW-element-set en la colaboración en tiempo real.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

export type WbElementType = 'stroke' | 'note' | 'text' | 'image' | 'shape' | 'connector' | 'timeline';

export interface WbElement {
  id: string;
  type: WbElementType;
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  text?: string;
  points?: Array<[number, number]>;
  color?: string;
  src?: string;
  from?: string;
  to?: string;
  milestones?: Array<{ label: string; at?: string }>;
  /** CRDT: revisión lógica (Lamport-ish). Mayor gana. */
  rev?: number;
  /** CRDT: peer que produjo la última escritura (desempate). */
  updatedBy?: string;
}

export interface WhiteboardState {
  brandId: string;
  boardId?: string;
  elements: WbElement[];
  updatedAt: string;
  lastInterpretation?: { at: string; summary: string; directiveIds: string[] };
}

export interface BoardMeta {
  id: string;
  name: string;
  createdAt: string;
}

export interface AgendaItem {
  id: string;
  brandId: string;
  title: string;
  at: string;
  done: boolean;
  directiveId?: string;
  notes?: string;
}

export interface BoardSnapshot {
  id: string;
  brandId: string;
  boardId: string;
  label: string;
  at: string;
  elements: WbElement[];
}

export interface OpLogEntry {
  id: string;
  brandId: string;
  boardId: string;
  at: string;
  by?: string; // peerId
  kind: 'upsert' | 'delete' | 'board-replace';
  elementId?: string;
  /** snapshot del estado ANTES (para revertir/auditar). */
  before?: WbElement | WbElement[] | null;
  /** resumen humano para la auditoría. */
  summary: string;
}

interface Shape {
  /** brandId → boardId → state */
  boards: Record<string, Record<string, WhiteboardState>>;
  boardMeta: Record<string, { boards: BoardMeta[]; activeBoardId: string }>;
  agenda: AgendaItem[];
  snapshots: BoardSnapshot[];
  opLog?: OpLogEntry[];
}

const PATH = resolve('data/runtime/whiteboard.json');
const DEFAULT_BOARD = 'default';

/** Migrate legacy single-board shape → multi-board, non-destructive. */
const migrate = (raw: unknown): Shape => {
  const s = (raw ?? {}) as Partial<Shape> & {
    boards?: Record<string, unknown>;
  };
  const out: Shape = {
    boards: {},
    boardMeta: s.boardMeta ?? {},
    agenda: (s.agenda as AgendaItem[]) ?? [],
    snapshots: (s.snapshots as BoardSnapshot[]) ?? [],
    opLog: (s.opLog as OpLogEntry[]) ?? [],
  };
  const srcBoards = (s.boards ?? {}) as Record<string, unknown>;
  for (const [brandId, val] of Object.entries(srcBoards)) {
    if (val && typeof val === 'object' && 'elements' in (val as object)) {
      // legacy: WhiteboardState directly under brandId
      const st = val as WhiteboardState;
      out.boards[brandId] = { [DEFAULT_BOARD]: { ...st, boardId: DEFAULT_BOARD } };
      out.boardMeta[brandId] ??= {
        boards: [{ id: DEFAULT_BOARD, name: 'Pizarra principal', createdAt: st.updatedAt }],
        activeBoardId: DEFAULT_BOARD,
      };
    } else {
      out.boards[brandId] = val as Record<string, WhiteboardState>;
    }
  }
  // legacy snapshots without boardId → default
  out.snapshots = out.snapshots.map((sn) => ({ ...sn, boardId: sn.boardId ?? DEFAULT_BOARD }));
  return out;
};

const read = (): Shape => {
  if (!existsSync(PATH)) return { boards: {}, boardMeta: {}, agenda: [], snapshots: [] };
  try {
    return migrate(JSON.parse(readFileSync(PATH, 'utf-8')));
  } catch {
    return { boards: {}, boardMeta: {}, agenda: [], snapshots: [] };
  }
};
const write = (s: Shape): void => {
  mkdirSync(dirname(PATH), { recursive: true });
  if (s.agenda.length > 500) s.agenda.splice(0, s.agenda.length - 500);
  if (s.opLog && s.opLog.length > 400) s.opLog.splice(0, s.opLog.length - 400);
  writeFileSync(PATH, JSON.stringify(s, null, 2), 'utf-8');
};

let _olseq = 0;
const logOp = (s: Shape, e: Omit<OpLogEntry, 'id' | 'at'>): void => {
  s.opLog ??= [];
  s.opLog.push({ ...e, id: `op-${Date.now().toString(36)}-${(++_olseq).toString(36)}`, at: new Date().toISOString() });
};

const ensureMeta = (s: Shape, brandId: string): { boards: BoardMeta[]; activeBoardId: string } => {
  if (!s.boardMeta[brandId]) {
    s.boardMeta[brandId] = {
      boards: [{ id: DEFAULT_BOARD, name: 'Pizarra principal', createdAt: new Date().toISOString() }],
      activeBoardId: DEFAULT_BOARD,
    };
  }
  return s.boardMeta[brandId]!;
};

const resolveBoardId = (s: Shape, brandId: string, boardId?: string): string => {
  if (boardId) return boardId;
  return ensureMeta(s, brandId).activeBoardId;
};

/* ── Board CRUD ──────────────────────────────────────────────────────────── */

let _bseq = 0;
const bid = (): string => `bd-${Date.now().toString(36)}-${(++_bseq).toString(36)}`;

export const listBoards = (brandId: string): { boards: BoardMeta[]; activeBoardId: string } => {
  const s = read();
  const meta = ensureMeta(s, brandId);
  write(s);
  return meta;
};

export const createBoard = (brandId: string, name: string): BoardMeta => {
  const s = read();
  const meta = ensureMeta(s, brandId);
  const board: BoardMeta = {
    id: bid(),
    name: name || `Pizarra ${meta.boards.length + 1}`,
    createdAt: new Date().toISOString(),
  };
  meta.boards.push(board);
  meta.activeBoardId = board.id;
  s.boards[brandId] ??= {};
  s.boards[brandId]![board.id] = { brandId, boardId: board.id, elements: [], updatedAt: new Date().toISOString() };
  write(s);
  return board;
};

export const renameBoard = (brandId: string, boardId: string, name: string): boolean => {
  const s = read();
  const meta = ensureMeta(s, brandId);
  const b = meta.boards.find((x) => x.id === boardId);
  if (!b) return false;
  b.name = name;
  write(s);
  return true;
};

export const deleteBoard = (brandId: string, boardId: string): boolean => {
  const s = read();
  const meta = ensureMeta(s, brandId);
  if (meta.boards.length <= 1) return false; // siempre queda al menos una
  meta.boards = meta.boards.filter((x) => x.id !== boardId);
  if (s.boards[brandId]) delete s.boards[brandId]![boardId];
  if (meta.activeBoardId === boardId) meta.activeBoardId = meta.boards[0]!.id;
  s.snapshots = s.snapshots.filter((sn) => !(sn.brandId === brandId && sn.boardId === boardId));
  write(s);
  return true;
};

export const setActiveBoard = (brandId: string, boardId: string): boolean => {
  const s = read();
  const meta = ensureMeta(s, brandId);
  if (!meta.boards.some((x) => x.id === boardId)) return false;
  meta.activeBoardId = boardId;
  write(s);
  return true;
};

/* ── Board content ───────────────────────────────────────────────────────── */

export const getBoard = (brandId: string, boardId?: string): WhiteboardState => {
  const s = read();
  const id = resolveBoardId(s, brandId, boardId);
  const st = s.boards[brandId]?.[id];
  write(s); // persist any meta init
  return st ?? { brandId, boardId: id, elements: [], updatedAt: new Date().toISOString() };
};

export const saveBoard = (brandId: string, elements: WbElement[], boardId?: string, by?: string): WhiteboardState => {
  const s = read();
  const id = resolveBoardId(s, brandId, boardId);
  const prev = s.boards[brandId]?.[id];
  logOp(s, {
    brandId,
    boardId: id,
    by,
    kind: 'board-replace',
    before: prev?.elements ? JSON.parse(JSON.stringify(prev.elements)) : [],
    summary: `Reemplazo de board (${prev?.elements?.length ?? 0} → ${elements.length} elementos)`,
  });
  const next: WhiteboardState = {
    brandId,
    boardId: id,
    elements,
    updatedAt: new Date().toISOString(),
    lastInterpretation: prev?.lastInterpretation,
  };
  s.boards[brandId] ??= {};
  s.boards[brandId]![id] = next;
  write(s);
  return next;
};

/**
 * Merge de texto 3-way pragmático (union-merge tipo git, a nivel palabra).
 * Edits NO solapados de dos peers sobreviven ambos; solapados pueden
 * duplicar tokens (aceptable y documentado — para char-level fino se
 * requeriría una CRDT de texto tipo Yjs).
 */
const mergeText = (a: string, b: string): string => {
  if (a === b) return a;
  if (!a) return b;
  if (!b) return a;
  if (a.includes(b)) return a;
  if (b.includes(a)) return b;
  const ta = a.split(/(\s+)/);
  const tb = b.split(/(\s+)/);
  // LCS palabra a palabra
  const m = ta.length;
  const n = tb.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = m - 1; i >= 0; i--)
    for (let j = n - 1; j >= 0; j--)
      dp[i]![j] = ta[i] === tb[j] ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!);
  const out: string[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (ta[i] === tb[j]) {
      out.push(ta[i]!);
      i++;
      j++;
    } else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) {
      out.push(ta[i]!);
      i++;
    } else {
      out.push(tb[j]!);
      j++;
    }
  }
  while (i < m) out.push(ta[i++]!);
  while (j < n) out.push(tb[j++]!);
  return out.join('');
};

/**
 * CRDT merge — aplica una operación por-elemento sobre el board y devuelve el
 * estado resultante. Regla LWW-element-set: gana mayor `rev`; empate → mayor
 * `updatedBy` (string). Los deletes dejan el elemento fuera (sin tombstone
 * persistente: el board completo es la verdad, los deletes se propagan por op).
 */
export const applyElementOp = (
  brandId: string,
  op: { kind: 'upsert'; element: WbElement } | { kind: 'delete'; id: string; rev?: number; by?: string },
  boardId?: string,
): WhiteboardState => {
  const s = read();
  const id = resolveBoardId(s, brandId, boardId);
  s.boards[brandId] ??= {};
  const st = s.boards[brandId]![id] ?? { brandId, boardId: id, elements: [], updatedAt: new Date().toISOString() };
  const els = st.elements;
  if (op.kind === 'upsert') {
    const incoming = { ...op.element };
    const i = els.findIndex((e) => e.id === incoming.id);
    if (i < 0) {
      logOp(s, {
        brandId,
        boardId: id,
        by: incoming.updatedBy,
        kind: 'upsert',
        elementId: incoming.id,
        before: null,
        summary: `Creó ${incoming.type} ${incoming.id}`,
      });
      els.push(incoming);
    } else {
      const cur = els[i]!;
      const cr = cur.rev ?? 0;
      const ir = incoming.rev ?? 0;
      const incomingWins = ir > cr || (ir === cr && (incoming.updatedBy ?? '') >= (cur.updatedBy ?? ''));
      // Merge de texto 3-way para note/text con ediciones concurrentes:
      // en vez de descartar al perdedor, unimos ambos textos.
      if (
        (incoming.type === 'note' || incoming.type === 'text') &&
        typeof cur.text === 'string' &&
        typeof incoming.text === 'string' &&
        cur.text !== incoming.text
      ) {
        const merged = mergeText(cur.text, incoming.text);
        const winner = incomingWins ? incoming : { ...cur };
        winner.text = merged;
        winner.rev = Math.max(cr, ir) + 1;
        logOp(s, {
          brandId,
          boardId: id,
          by: incoming.updatedBy,
          kind: 'upsert',
          elementId: incoming.id,
          before: JSON.parse(JSON.stringify(cur)),
          summary: `Merge de texto en ${incoming.id}`,
        });
        els[i] = winner;
      } else if (incomingWins) {
        logOp(s, {
          brandId,
          boardId: id,
          by: incoming.updatedBy,
          kind: 'upsert',
          elementId: incoming.id,
          before: JSON.parse(JSON.stringify(cur)),
          summary: `Actualizó ${incoming.type} ${incoming.id}`,
        });
        els[i] = incoming;
      }
    }
  } else {
    const removed = els.find((e) => e.id === op.id) ?? null;
    if (removed)
      logOp(s, {
        brandId,
        boardId: id,
        by: op.by,
        kind: 'delete',
        elementId: op.id,
        before: JSON.parse(JSON.stringify(removed)),
        summary: `Borró ${removed.type} ${op.id}`,
      });
    st.elements = els.filter((e) => e.id !== op.id);
  }
  st.updatedAt = new Date().toISOString();
  st.brandId = brandId;
  st.boardId = id;
  s.boards[brandId]![id] = st;
  write(s);
  return st;
};

/* ── Op-log / auditoría + revertir última op ─────────────────────────────── */

export const listOpLog = (brandId: string, boardId?: string, limit = 50): OpLogEntry[] => {
  const s = read();
  const id = resolveBoardId(s, brandId, boardId);
  return (s.opLog ?? [])
    .filter((o) => o.brandId === brandId && o.boardId === id)
    .slice(-limit)
    .reverse();
};

export interface RevertResult {
  ok: boolean;
  reverted?: OpLogEntry;
  reason?: string;
}

/** Revierte la última op registrada de la pizarra (undo colaborativo básico). */
export const revertLastOp = (brandId: string, boardId?: string): RevertResult => {
  const s = read();
  const id = resolveBoardId(s, brandId, boardId);
  s.opLog ??= [];
  const idx = [...s.opLog]
    .map((o, i) => ({ o, i }))
    .filter(({ o }) => o.brandId === brandId && o.boardId === id && !o.summary.startsWith('REVERT'))
    .pop();
  if (!idx) return { ok: false, reason: 'sin operaciones para revertir' };
  const entry = idx.o;
  const st = s.boards[brandId]?.[id] ?? { brandId, boardId: id, elements: [], updatedAt: new Date().toISOString() };

  if (entry.kind === 'board-replace') {
    st.elements = Array.isArray(entry.before) ? JSON.parse(JSON.stringify(entry.before)) : [];
  } else if (entry.kind === 'upsert') {
    if (entry.before == null) {
      st.elements = st.elements.filter((e) => e.id !== entry.elementId); // era creación → borrar
    } else if (!Array.isArray(entry.before)) {
      const i = st.elements.findIndex((e) => e.id === entry.elementId);
      if (i >= 0) st.elements[i] = JSON.parse(JSON.stringify(entry.before));
      else st.elements.push(JSON.parse(JSON.stringify(entry.before)));
    }
  } else if (entry.kind === 'delete' && entry.before && !Array.isArray(entry.before)) {
    st.elements.push(JSON.parse(JSON.stringify(entry.before))); // re-insertar el borrado
  }
  st.updatedAt = new Date().toISOString();
  s.boards[brandId] ??= {};
  s.boards[brandId]![id] = st;
  logOp(s, { brandId, boardId: id, kind: 'board-replace', before: null, summary: `REVERT de "${entry.summary}"` });
  write(s);
  return { ok: true, reverted: entry };
};

export const recordInterpretation = (
  brandId: string,
  summary: string,
  directiveIds: string[],
  boardId?: string,
): void => {
  const s = read();
  const id = resolveBoardId(s, brandId, boardId);
  s.boards[brandId] ??= {};
  const b = s.boards[brandId]![id] ?? { brandId, boardId: id, elements: [], updatedAt: new Date().toISOString() };
  b.lastInterpretation = { at: new Date().toISOString(), summary, directiveIds };
  s.boards[brandId]![id] = b;
  write(s);
};

/* ── Agenda ──────────────────────────────────────────────────────────────── */

let _seq = 0;
const aid = (): string => `ag-${Date.now().toString(36)}-${(++_seq).toString(36)}`;

export const listAgenda = (brandId: string): AgendaItem[] =>
  read()
    .agenda.filter((a) => a.brandId === brandId)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));

export const addAgendaItem = (
  brandId: string,
  title: string,
  at: string,
  notes?: string,
  directiveId?: string,
): AgendaItem => {
  const s = read();
  const item: AgendaItem = { id: aid(), brandId, title, at, done: false, notes, directiveId };
  s.agenda.push(item);
  write(s);
  return item;
};

export const setAgendaDone = (id: string, done: boolean): AgendaItem | null => {
  const s = read();
  const it = s.agenda.find((a) => a.id === id);
  if (!it) return null;
  it.done = done;
  write(s);
  return it;
};

export const deleteAgendaItem = (id: string): boolean => {
  const s = read();
  const i = s.agenda.findIndex((a) => a.id === id);
  if (i < 0) return false;
  s.agenda.splice(i, 1);
  write(s);
  return true;
};

/* ── Snapshots (versionado por pizarra) ──────────────────────────────────── */

let _sseq = 0;
const sid = (): string => `snap-${Date.now().toString(36)}-${(++_sseq).toString(36)}`;

export const saveSnapshot = (brandId: string, label: string, boardId?: string): BoardSnapshot => {
  const s = read();
  const id = resolveBoardId(s, brandId, boardId);
  const board = s.boards[brandId]?.[id];
  const snap: BoardSnapshot = {
    id: sid(),
    brandId,
    boardId: id,
    label: label || new Date().toLocaleString('es-AR'),
    at: new Date().toISOString(),
    elements: board?.elements ? JSON.parse(JSON.stringify(board.elements)) : [],
  };
  s.snapshots.push(snap);
  const mine = s.snapshots.filter((x) => x.brandId === brandId && x.boardId === id);
  if (mine.length > 30) {
    const drop = new Set(mine.slice(0, mine.length - 30).map((x) => x.id));
    s.snapshots = s.snapshots.filter((x) => !drop.has(x.id));
  }
  write(s);
  return snap;
};

export const listSnapshots = (brandId: string, boardId?: string): Array<Omit<BoardSnapshot, 'elements'>> => {
  const s = read();
  const id = resolveBoardId(s, brandId, boardId);
  write(s);
  return s.snapshots
    .filter((x) => x.brandId === brandId && x.boardId === id)
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .map(({ elements, ...meta }) => {
      void elements;
      return meta;
    });
};

export const restoreSnapshot = (brandId: string, snapId: string, boardId?: string): WhiteboardState | null => {
  const s = read();
  const id = resolveBoardId(s, brandId, boardId);
  const snap = s.snapshots.find((x) => x.id === snapId && x.brandId === brandId);
  if (!snap) return null;
  const next: WhiteboardState = {
    brandId,
    boardId: id,
    elements: JSON.parse(JSON.stringify(snap.elements)),
    updatedAt: new Date().toISOString(),
    lastInterpretation: s.boards[brandId]?.[id]?.lastInterpretation,
  };
  s.boards[brandId] ??= {};
  s.boards[brandId]![id] = next;
  write(s);
  return next;
};
