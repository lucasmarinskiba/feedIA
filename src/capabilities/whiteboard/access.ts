/**
 * Whiteboard Access — permisos por pizarra + links de invitación con scope
 * ─────────────────────────────────────────────────────────────────────────
 * El dueño de la marca siempre es 'editor'. Puede emitir links de invitación
 * con un rol acotado:
 *   • 'viewer' → ve la pizarra y la presencia, NO puede mutar elementos.
 *   • 'editor' → colabora con todos los permisos.
 *
 * Cada link es un token opaco con rol, pizarra destino y expiración opcional.
 * El enforcement vive en el endpoint /api/whiteboard/op: un viewer sólo
 * puede emitir cursor/selección, nunca element-* / board-replace.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

export type BoardRole = 'editor' | 'viewer';

export interface BoardInvite {
  token: string;
  brandId: string;
  boardId: string;
  role: BoardRole;
  createdAt: string;
  expiresAt?: string;
  /** etiqueta libre para identificar a quién se le compartió. */
  label?: string;
  uses: number;
}

interface AccessStore {
  invites: BoardInvite[];
}

const PATH = resolve('data/runtime/boardAccess.json');

const read = (): AccessStore => {
  if (!existsSync(PATH)) return { invites: [] };
  try {
    return JSON.parse(readFileSync(PATH, 'utf-8')) as AccessStore;
  } catch {
    return { invites: [] };
  }
};
const write = (s: AccessStore): void => {
  mkdirSync(dirname(PATH), { recursive: true });
  if (s.invites.length > 300) s.invites.splice(0, s.invites.length - 300);
  writeFileSync(PATH, JSON.stringify(s, null, 2), 'utf-8');
};

const newToken = (): string => `inv_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;

export const createInvite = (params: {
  brandId: string;
  boardId: string;
  role: BoardRole;
  expiresInHours?: number;
  label?: string;
}): BoardInvite => {
  const s = read();
  const inv: BoardInvite = {
    token: newToken(),
    brandId: params.brandId,
    boardId: params.boardId,
    role: params.role === 'viewer' ? 'viewer' : 'editor',
    createdAt: new Date().toISOString(),
    expiresAt: params.expiresInHours
      ? new Date(Date.now() + params.expiresInHours * 3_600_000).toISOString()
      : undefined,
    label: params.label,
    uses: 0,
  };
  s.invites.push(inv);
  write(s);
  return inv;
};

export const listInvites = (brandId: string, boardId?: string): BoardInvite[] =>
  read().invites.filter((i) => i.brandId === brandId && (!boardId || i.boardId === boardId));

export const revokeInvite = (token: string): boolean => {
  const s = read();
  const i = s.invites.findIndex((x) => x.token === token);
  if (i < 0) return false;
  s.invites.splice(i, 1);
  write(s);
  return true;
};

export interface ResolvedInvite {
  valid: boolean;
  role: BoardRole;
  brandId?: string;
  boardId?: string;
  reason?: string;
}

/** Resuelve un token a su rol; lo cuenta como usado si es válido. */
export const resolveInvite = (token: string): ResolvedInvite => {
  if (!token) return { valid: false, role: 'viewer', reason: 'sin token' };
  const s = read();
  const inv = s.invites.find((x) => x.token === token);
  if (!inv) return { valid: false, role: 'viewer', reason: 'token desconocido' };
  if (inv.expiresAt && Date.parse(inv.expiresAt) < Date.now()) {
    return { valid: false, role: 'viewer', reason: 'expirado' };
  }
  inv.uses += 1;
  write(s);
  return { valid: true, role: inv.role, brandId: inv.brandId, boardId: inv.boardId };
};

/** Rol efectivo de una petición. Sin token ⇒ dueño ⇒ editor. */
export const roleFor = (token?: string): BoardRole => {
  if (!token) return 'editor';
  const r = resolveInvite(token);
  return r.valid ? r.role : 'viewer';
};

/** ¿Esta operación muta el board? (los viewers no pueden). */
export const isMutatingOp = (kind: string): boolean =>
  kind === 'element-upsert' ||
  kind === 'element-delete' ||
  kind === 'board-replace' ||
  kind === 'lock' ||
  kind === 'unlock';
