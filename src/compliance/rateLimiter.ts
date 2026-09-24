/**
 * Rate Limiter para acciones de Instagram
 *
 * Instagram detecta y penaliza comportamientos que parecen automatizados.
 * Este módulo impone límites conservadores POR DEBAJO de los rate limits
 * oficiales de la API, para operar de forma segura y natural.
 *
 * Referencia: Meta Graph API Rate Limits
 * - 200 calls/hour per user (conservador para Graph API)
 * - Instagram tiene límites adicionales no documentados públicamente
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../agent/logger.js';

const DEFAULT_RATE_LIMIT_DB_PATH = resolve('data/runtime/rate-limits.json');
let dbPath: string | null = DEFAULT_RATE_LIMIT_DB_PATH;
let memoryState: RateLimitState | null = null;

/**
 * Cambia (o desactiva con null = solo memoria) el archivo. Los tests lo usan
 * para no compartir data/runtime/rate-limits.json entre archivos de test que
 * corren en paralelo — sin esto, tests de distintos archivos pisan la misma
 * ventana de rate limit y se vuelven flaky (mismo problema que
 * botControl/state.ts ya resuelve con configureBotControlStore).
 */
export const configureRateLimitStore = (path: string | null): void => {
  dbPath = path;
  memoryState = null;
};

export type ActionType =
  | 'publish_post'
  | 'send_dm'
  | 'reply_comment'
  | 'reply_dm'
  | 'like_post'
  | 'follow_account'
  | 'unfollow_account'
  | 'comment_external'
  | 'story_reaction'
  | 'api_call'
  | 'tiktok_business_reply'
  | 'tiktok_live_moderate'
  | 'tiktok_publish';

interface ActionWindow {
  /** Acciones en la ventana actual */
  count: number;
  /** Timestamp del primer evento de la ventana */
  windowStart: number;
  /** Último timestamp de acción */
  lastAction: number;
}

interface RateLimitState {
  /** Mapa de usuario -> tipo de acción -> ventana */
  windows: Record<string, ActionWindow>;
  /** Timestamp de último reset global */
  lastReset: number;
}

/** Límites por tipo de acción (conservadores, por debajo de los oficiales) */
export const RATE_LIMITS: Record<ActionType, { maxPerHour: number; minSecondsBetween: number; maxPerDay: number }> = {
  publish_post: { maxPerHour: 5, minSecondsBetween: 600, maxPerDay: 15 },
  send_dm: { maxPerHour: 20, minSecondsBetween: 30, maxPerDay: 100 },
  reply_comment: { maxPerHour: 30, minSecondsBetween: 20, maxPerDay: 200 },
  reply_dm: { maxPerHour: 40, minSecondsBetween: 15, maxPerDay: 300 },
  like_post: { maxPerHour: 60, minSecondsBetween: 10, maxPerDay: 500 },
  follow_account: { maxPerHour: 10, minSecondsBetween: 120, maxPerDay: 50 },
  unfollow_account: { maxPerHour: 10, minSecondsBetween: 120, maxPerDay: 50 },
  comment_external: { maxPerHour: 10, minSecondsBetween: 180, maxPerDay: 30 },
  story_reaction: { maxPerHour: 30, minSecondsBetween: 30, maxPerDay: 200 },
  api_call: { maxPerHour: 150, minSecondsBetween: 5, maxPerDay: 2000 },
  // TikTok Business messaging: solo respuestas 1:1 a alguien que escribió
  // primero — nunca mass-messaging, de ahí el límite conservador.
  tiktok_business_reply: { maxPerHour: 20, minSecondsBetween: 30, maxPerDay: 100 },
  // Moderación de LIVE: solo clasifica/sugiere, no ejecuta acciones reales —
  // límite alto porque el volumen de un chat en vivo puede ser grande.
  tiktok_live_moderate: { maxPerHour: 500, minSecondsBetween: 0, maxPerDay: 5000 },
  // TT-SCHED-001: el límite oficial de la Content Posting API para partners
  // externos es 15 publicaciones/cuenta cada 24h — este tope lo refleja.
  tiktok_publish: { maxPerHour: 5, minSecondsBetween: 300, maxPerDay: 15 },
};

const ensureDb = (path: string): void => {
  const dir = resolve(path, '..');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(path)) {
    writeFileSync(path, JSON.stringify({ windows: {}, lastReset: Date.now() }, null, 2));
  }
};

const loadState = (): RateLimitState => {
  if (!dbPath) return memoryState ?? { windows: {}, lastReset: Date.now() };
  ensureDb(dbPath);
  try {
    const raw = JSON.parse(readFileSync(dbPath, 'utf-8')) as RateLimitState;
    return raw;
  } catch {
    return { windows: {}, lastReset: Date.now() };
  }
};

const saveState = (state: RateLimitState): void => {
  if (!dbPath) {
    memoryState = state;
    return;
  }
  writeFileSync(dbPath, JSON.stringify(state, null, 2));
};

const getUserKey = (actionType: ActionType, userIdentifier?: string): string =>
  `${actionType}:${userIdentifier ?? 'global'}`;

export interface RateLimitCheck {
  allowed: boolean;
  reason?: string;
  nextAvailableInSeconds?: number;
  currentCount: number;
  limit: number;
}

/**
 * Verifica si una acción está dentro de los límites permitidos.
 * NO registra la acción (es solo consulta).
 */
export const checkRateLimit = (actionType: ActionType, userIdentifier?: string): RateLimitCheck => {
  const limits = RATE_LIMITS[actionType];
  const state = loadState();
  const key = getUserKey(actionType, userIdentifier);
  const now = Date.now();
  const window = state.windows[key];

  // Si no hay ventana previa, está permitido
  if (!window) {
    return { allowed: true, currentCount: 0, limit: limits.maxPerHour };
  }

  const hourAgo = now - 60 * 60 * 1000;
  const dayAgo = now - 24 * 60 * 60 * 1000;

  // Si la ventana es de hace más de 1 hora, se resetea
  if (window.windowStart < hourAgo) {
    return { allowed: true, currentCount: 0, limit: limits.maxPerHour };
  }

  // Verificar min seconds between
  if (window.lastAction && now - window.lastAction < limits.minSecondsBetween * 1000) {
    const waitSeconds = Math.ceil((limits.minSecondsBetween * 1000 - (now - window.lastAction)) / 1000);
    return {
      allowed: false,
      reason: `Debe esperar ${waitSeconds}s entre acciones de tipo ${actionType} (límite de seguridad)`,
      nextAvailableInSeconds: waitSeconds,
      currentCount: window.count,
      limit: limits.maxPerHour,
    };
  }

  // Verificar límite por hora
  if (window.count >= limits.maxPerHour) {
    const resetInSeconds = Math.ceil((window.windowStart + 60 * 60 * 1000 - now) / 1000);
    return {
      allowed: false,
      reason: `Límite de ${limits.maxPerHour} acciones/hora alcanzado para ${actionType}`,
      nextAvailableInSeconds: resetInSeconds,
      currentCount: window.count,
      limit: limits.maxPerHour,
    };
  }

  // Verificar límite por día (aproximado - contamos desde la ventana actual)
  // Nota: esto es una aproximación conservadora
  if (window.windowStart > dayAgo && window.count >= limits.maxPerDay) {
    return {
      allowed: false,
      reason: `Límite diario de ${limits.maxPerDay} acciones alcanzado para ${actionType}`,
      nextAvailableInSeconds: Math.ceil((window.windowStart + 24 * 60 * 60 * 1000 - now) / 1000),
      currentCount: window.count,
      limit: limits.maxPerDay,
    };
  }

  return {
    allowed: true,
    currentCount: window.count,
    limit: limits.maxPerHour,
  };
};

/**
 * Registra una acción en el rate limiter.
 * Debe llamarse DESPUÉS de que la acción se ejecute exitosamente.
 */
export const recordAction = (actionType: ActionType, userIdentifier?: string): void => {
  const state = loadState();
  const key = getUserKey(actionType, userIdentifier);
  const now = Date.now();
  const hourAgo = now - 60 * 60 * 1000;

  const existing = state.windows[key];

  if (!existing || existing.windowStart < hourAgo) {
    // Nueva ventana
    state.windows[key] = {
      count: 1,
      windowStart: now,
      lastAction: now,
    };
  } else {
    existing.count += 1;
    existing.lastAction = now;
  }

  saveState(state);
  log.debug(
    `Rate limit: ${actionType} registrado para ${userIdentifier ?? 'global'} (count: ${state.windows[key]?.count ?? 1})`,
  );
};

/**
 * Verifica y registra en un solo paso.
 * Retorna true si se permitió y registró.
 */
export const checkAndRecord = (actionType: ActionType, userIdentifier?: string): RateLimitCheck => {
  const check = checkRateLimit(actionType, userIdentifier);
  if (check.allowed) {
    recordAction(actionType, userIdentifier);
  }
  return check;
};

/**
 * Resetea los contadores (útil para tests o situaciones excepcionales).
 */
export const resetRateLimits = (): void => {
  saveState({ windows: {}, lastReset: Date.now() });
  log.warn('Rate limits reiniciados manualmente');
};

/**
 * Obtiene estadísticas actuales de uso.
 */
export const getRateLimitStats = (): Record<string, { count: number; limit: number; resetsIn: string }> => {
  const state = loadState();
  const now = Date.now();
  const stats: Record<string, { count: number; limit: number; resetsIn: string }> = {};

  for (const [key, window] of Object.entries(state.windows)) {
    if (!window) continue;
    const [actionType] = key.split(':') as [ActionType];
    const limit = RATE_LIMITS[actionType]?.maxPerHour ?? 0;
    const resetsInMs = window.windowStart + 60 * 60 * 1000 - now;
    stats[key] = {
      count: window.count,
      limit,
      resetsIn: resetsInMs > 0 ? `${Math.ceil(resetsInMs / 1000)}s` : 'expirado',
    };
  }

  return stats;
};
