/**
 * SessionPool — Gestiona múltiples sesiones de navegador por marca/plataforma.
 * Permite rotación round-robin y warm-up automático.
 */
import type { OperatorSession } from './browserOperatorBase.js';
import { log } from '../../agent/logger.js';

interface PoolEntry {
  session: OperatorSession;
  brandId: string;
  platform: string;
  lastAssignedAt: number;
  useCount: number;
}

const pool: PoolEntry[] = [];
const MAX_POOL_SIZE = 10;
const MAX_AGE_MS = 60 * 60 * 1000; // 1 hora

export const addSessionToPool = (session: OperatorSession): void => {
  // Limpiar sesiones viejas del mismo brand/platform
  const existingIdx = pool.findIndex((e) => e.brandId === session.brandId && e.platform === session.platform);
  if (existingIdx >= 0) {
    pool.splice(existingIdx, 1);
  }

  // Evitar overflow
  if (pool.length >= MAX_POOL_SIZE) {
    const oldest = pool.sort((a, b) => a.lastAssignedAt - b.lastAssignedAt)[0];
    if (oldest) {
      const idx = pool.indexOf(oldest);
      pool.splice(idx, 1);
      log.info(`[SessionPool] Eliminada sesión antigua ${oldest.session.id}`);
    }
  }

  pool.push({
    session,
    brandId: session.brandId,
    platform: session.platform,
    lastAssignedAt: Date.now(),
    useCount: 0,
  });
};

export const getSessionFromPool = (brandId: string, platform: string): OperatorSession | undefined => {
  const candidates = pool.filter(
    (e) => e.brandId === brandId && e.platform === platform && Date.now() - e.session.lastUsedAt < MAX_AGE_MS,
  );
  if (candidates.length === 0) return undefined;

  // Round-robin: elegir el menos usado recientemente
  const entry = candidates.sort((a, b) => a.lastAssignedAt - b.lastAssignedAt)[0]!;
  entry.lastAssignedAt = Date.now();
  entry.useCount++;
  return entry.session;
};

export const removeSessionFromPool = (sessionId: string): boolean => {
  const idx = pool.findIndex((e) => e.session.id === sessionId);
  if (idx >= 0) {
    pool.splice(idx, 1);
    return true;
  }
  return false;
};

export const getPoolStats = (): { total: number; byPlatform: Record<string, number> } => {
  const byPlatform: Record<string, number> = {};
  for (const entry of pool) {
    byPlatform[entry.platform] = (byPlatform[entry.platform] ?? 0) + 1;
  }
  return { total: pool.length, byPlatform };
};

export const pruneStaleSessions = (): number => {
  const now = Date.now();
  const before = pool.length;
  for (let i = pool.length - 1; i >= 0; i--) {
    if (now - pool[i]!.session.lastUsedAt > MAX_AGE_MS) {
      pool.splice(i, 1);
    }
  }
  return before - pool.length;
};
