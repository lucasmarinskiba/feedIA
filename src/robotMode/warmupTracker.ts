/**
 * WarmupTracker — Persistencia del estado de gradual warmup por marca.
 *
 * Cada cuenta nueva empieza con límites muy bajos y ramp-up progresivo
 * durante varias semanas. Este módulo guarda y recupera ese estado.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../agent/logger.js';
import type { BrandProfile } from '../config/types.js';

const WARMUP_DB_PATH = resolve('data/runtime/warmup-state.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface WarmupState {
  /** Día actual de operación (0 = primer día) */
  currentDay: number;
  /** Timestamp del primer día de operación */
  firstOperationAt: string;
  /** Timestamp de la última operación */
  lastOperationAt: string;
  /** Contador de acciones por día (YYYY-MM-DD -> count) */
  actionsPerDay: Record<string, number>;
  /** Total de acciones exitosas */
  totalSuccessfulActions: number;
  /** Total de acciones fallidas */
  totalFailedActions: number;
  /** Historial de alertas/warnings */
  alerts: string[];
}

interface WarmupStore {
  version: number;
  brands: Record<string, WarmupState>;
  lastUpdated: string;
}

// ── Persistencia ──────────────────────────────────────────────────────────────

const DEFAULT_STORE: WarmupStore = {
  version: 1,
  brands: {},
  lastUpdated: new Date().toISOString(),
};

const ensureDb = (): void => {
  const dir = resolve('data/runtime');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  if (!existsSync(WARMUP_DB_PATH)) {
    writeFileSync(WARMUP_DB_PATH, JSON.stringify(DEFAULT_STORE, null, 2), 'utf-8');
  }
};

const loadStore = (): WarmupStore => {
  ensureDb();
  try {
    return JSON.parse(readFileSync(WARMUP_DB_PATH, 'utf-8')) as WarmupStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveStore = (store: WarmupStore): void => {
  ensureDb();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(WARMUP_DB_PATH, JSON.stringify(store, null, 2), 'utf-8');
};

const getBrandKey = (brand: BrandProfile): string => brand.name;

const getTodayKey = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Obtiene el estado de warmup de una marca.
 * Si no existe, lo inicializa automáticamente.
 */
export const getWarmupState = (brand: BrandProfile): WarmupState => {
  const store = loadStore();
  const key = getBrandKey(brand);

  if (!store.brands[key]) {
    const now = new Date().toISOString();
    store.brands[key] = {
      currentDay: 0,
      firstOperationAt: now,
      lastOperationAt: now,
      actionsPerDay: {},
      totalSuccessfulActions: 0,
      totalFailedActions: 0,
      alerts: [],
    };
    saveStore(store);
  }

  return store.brands[key]!;
};

/**
 * Actualiza el contador de acciones de hoy.
 */
export const recordWarmupAction = (brand: BrandProfile, success: boolean): void => {
  const store = loadStore();
  const key = getBrandKey(brand);
  const state = store.brands[key];

  if (!state) {
    // Inicializar si no existe
    getWarmupState(brand);
    return recordWarmupAction(brand, success);
  }

  const today = getTodayKey();
  state.actionsPerDay[today] = (state.actionsPerDay[today] ?? 0) + 1;
  state.lastOperationAt = new Date().toISOString();

  if (success) {
    state.totalSuccessfulActions++;
  } else {
    state.totalFailedActions++;
  }

  // Recalcular currentDay basado en firstOperationAt
  const firstDay = new Date(state.firstOperationAt);
  const now = new Date();
  const diffMs = now.getTime() - firstDay.getTime();
  state.currentDay = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  saveStore(store);
};

/**
 * Agrega una alerta al historial de la marca.
 */
export const addWarmupAlert = (brand: BrandProfile, alert: string): void => {
  const store = loadStore();
  const key = getBrandKey(brand);
  const state = store.brands[key];

  if (!state) {
    getWarmupState(brand);
    return addWarmupAlert(brand, alert);
  }

  state.alerts.push(`[${new Date().toISOString()}] ${alert}`);
  // Mantener solo las últimas 50 alertas
  if (state.alerts.length > 50) {
    state.alerts = state.alerts.slice(-50);
  }

  saveStore(store);
};

/**
 * Obtiene estadísticas de warmup para una marca.
 */
export const getWarmupStats = (
  brand: BrandProfile,
): {
  currentDay: number;
  totalActions: number;
  successRate: number;
  actionsToday: number;
  alertsCount: number;
} => {
  const state = getWarmupState(brand);
  const total = state.totalSuccessfulActions + state.totalFailedActions;
  const today = getTodayKey();

  return {
    currentDay: state.currentDay,
    totalActions: total,
    successRate: total > 0 ? state.totalSuccessfulActions / total : 1,
    actionsToday: state.actionsPerDay[today] ?? 0,
    alertsCount: state.alerts.length,
  };
};

/**
 * Construye el AccountContext para el UnifiedRateLimiter basado en el estado de warmup.
 */
export const buildAccountContext = (
  brand: BrandProfile,
  followerCount?: number,
): import('./unifiedRateLimiter.js').AccountContext => {
  const state = getWarmupState(brand);
  return {
    followerCount,
    robotAgeDays: state.currentDay,
    warmup: {
      currentDay: state.currentDay,
      warmupDays: 21,
      initialFactor: 0.1,
    },
  };
};

/**
 * Resetea el estado de warmup de una marca (útil para tests o reinicios).
 */
export const resetWarmupState = (brand: BrandProfile): void => {
  const store = loadStore();
  const key = getBrandKey(brand);
  delete store.brands[key];
  saveStore(store);
  log.info(`[WarmupTracker] Estado de warmup reseteado para ${brand.name}`);
};
