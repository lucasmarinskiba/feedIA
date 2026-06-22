/**
 * Offline Mode — Coordina todos los motores de voz para funcionar
 * 100% sin conexión a internet.
 * ─────────────────────────────────────────────────────────────────────────
 * Motores usados en modo offline:
 *   • Wake word: Porcupine WASM (browser) o regex local (backend)
 *   • STT: Whisper Web WASM (browser) o SAPI (backend)
 *   • TTS: Windows SAPI (backend) o Web Speech API (browser)
 *   • NLU/Intent: Regex local (sin API externas)
 *   • Actions: Solo locales (sin Computer Use que requiere Instagram online)
 *
 * Este módulo actúa como orquestador: detecta qué motores offline están
 * disponibles y enruta todo el tráfico de voz por ellos.
 */

import { log } from '../agent/logger.js';

export interface OfflineEngineStatus {
  wakeWord: boolean;
  stt: boolean;
  tts: boolean;
  nlu: boolean;
  fullyOffline: boolean;
}

/* ── Engine Detection ────────────────────────────────────────────────────── */

export const detectOfflineEngines = (): OfflineEngineStatus => {
  const hasSAPI = process.platform === 'win32';
  const hasWhisperLocal = !!process.env['WHISPER_CPP_PATH'];
  const hasPorcupine = !!process.env['PORCUPINE_ACCESS_KEY'];

  return {
    wakeWord: hasPorcupine || true, // regex fallback siempre disponible
    stt: hasSAPI || hasWhisperLocal,
    tts: hasSAPI,
    nlu: true, // regex-based intent detection siempre funciona offline
    fullyOffline: hasSAPI && hasWhisperLocal,
  };
};

/* ── Offline Router ──────────────────────────────────────────────────────── */

let offlineModeActive = false;

export const isOfflineMode = (): boolean => offlineModeActive;

export const enableOfflineMode = (): void => {
  offlineModeActive = true;
  log.success('[OfflineMode] Modo offline activado. Todas las APIs externas están deshabilitadas.');
};

export const disableOfflineMode = (): void => {
  offlineModeActive = false;
  log.info('[OfflineMode] Modo offline desactivado. APIs externas habilitadas.');
};

/**
 * Ejecuta una función solo si estamos online, o devuelve fallback offline.
 */
export const withOnlineFallback = async <T>(onlineFn: () => Promise<T>, offlineFn: () => Promise<T>): Promise<T> => {
  if (offlineModeActive) {
    return offlineFn();
  }
  try {
    return await onlineFn();
  } catch {
    log.warn('[OfflineMode] Falló la operación online, usando fallback offline.');
    return offlineFn();
  }
};

/* ── Restricted Actions (no funcionan offline) ───────────────────────────── */

const ONLINE_ONLY_ACTIONS = new Set([
  'computer_use:navigate_instagram',
  'computer_use:like_post',
  'computer_use:check_dms',
  'computer_use:check_insights',
  'computer_use:follow_account',
  'computer_use:post_content',
  'agent:free_goal', // Talía requiere API
]);

export const isActionOfflineCompatible = (actionType: string): boolean => {
  if (!offlineModeActive) return true;
  return !ONLINE_ONLY_ACTIONS.has(actionType);
};

export const getOfflineCompatibleActions = (): string[] => [
  'system:status',
  'system:health_check',
  'glassbox:pause',
  'glassbox:resume',
  'glassbox:set_mode',
  'glassbox:show_status',
  'scheduler:list_jobs',
  'content:plan_week',
  'macro:run_macro',
  'macro:list_macros',
];
