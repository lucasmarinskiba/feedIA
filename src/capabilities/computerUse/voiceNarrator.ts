/**
 * Voice Narrator de FeedIA — narración en vivo de lo que el sistema está haciendo.
 *
 * Mientras el cursor se mueve por Canva o Instagram, el sistema dice en voz alta
 * "Estoy abriendo Canva...", "Eligiendo template motivacional...", "Subiendo a
 * Instagram...". El usuario puede desactivar la narración para ahorrar tokens
 * de TTS (especialmente con ElevenLabs que tiene costo por carácter).
 *
 * Niveles:
 *   - off: silencio total
 *   - quiet: solo wins importantes (~5 narraciones por workflow)
 *   - normal: cada paso significativo (~15 por workflow)
 *   - verbose: cada acción del cursor (~50+ por workflow)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import { speakAsync, speak, type TTSOptions, type TTSLanguage } from '../../voice/tts.js';

const NARRATOR_CONFIG_PATH = join(process.cwd(), 'data', 'voice-narrator.json');
const NARRATOR_STATS_PATH = join(process.cwd(), 'data', 'voice-narrator-stats.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type NarrationLevel = 'off' | 'quiet' | 'normal' | 'verbose';

export type NarrationCategory =
  | 'workflow-start' // "Iniciando workflow Canva→Instagram"
  | 'app-launch' // "Abriendo Canva en el navegador"
  | 'navigation' // "Buscando templates..."
  | 'editing' // "Editando el texto principal"
  | 'export' // "Descargando archivo"
  | 'publishing' // "Publicando en Instagram"
  | 'success' // "Listo. Post publicado."
  | 'error' // "Hubo un problema..."
  | 'thinking' // "Decidiendo qué template usar..."
  | 'milestone' // "Acabamos de sumar 100 seguidores"
  | 'alert'; // "Atención: comentario crítico"

export interface NarratorConfig {
  level: NarrationLevel;
  language: TTSLanguage;
  provider: TTSOptions['provider']; // 'sapi' (gratis Win), 'browser', 'elevenlabs', 'google_unofficial'
  voice?: string;
  rate?: number; // 0.5 a 2.0
  pitch?: number; // 0.5 a 2.0
  volume?: number; // 0 a 1
  maxNarrationsPerWorkflow: number;
  enabledCategories: NarrationCategory[];
  costAlertThresholdUsd: number; // alertar si gastamos más de X en TTS por día
  saveAudio: boolean; // guardar archivos de audio para review
  whisperMode: boolean; // hablar en voz baja
}

const DEFAULT_CONFIG: NarratorConfig = {
  level: 'normal',
  language: 'es-AR',
  provider: 'sapi', // Default a SAPI (gratis en Windows, sin tokens)
  rate: 1.0,
  pitch: 1.0,
  volume: 0.8,
  maxNarrationsPerWorkflow: 20,
  enabledCategories: [
    'workflow-start',
    'app-launch',
    'editing',
    'export',
    'publishing',
    'success',
    'error',
    'milestone',
    'alert',
  ],
  costAlertThresholdUsd: 0.5,
  saveAudio: false,
  whisperMode: false,
};

interface NarratorStats {
  totalNarrationsAllTime: number;
  totalTokensSpent: number; // estimación de tokens (chars / 4)
  totalUsdEstimate: number;
  byCategory: Record<string, number>;
  byProvider: Record<string, number>;
  byDay: Record<string, { count: number; usdEstimate: number }>;
  lastNarratedAt?: string;
  lastUpdated: string;
}

const DEFAULT_STATS: NarratorStats = {
  totalNarrationsAllTime: 0,
  totalTokensSpent: 0,
  totalUsdEstimate: 0,
  byCategory: {},
  byProvider: {},
  byDay: {},
  lastUpdated: new Date().toISOString(),
};

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadConfig = (): NarratorConfig => {
  try {
    ensureDir();
    if (!existsSync(NARRATOR_CONFIG_PATH)) return { ...DEFAULT_CONFIG };
    return {
      ...DEFAULT_CONFIG,
      ...(JSON.parse(readFileSync(NARRATOR_CONFIG_PATH, 'utf8')) as Partial<NarratorConfig>),
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
};

const saveConfig = (config: NarratorConfig): void => {
  ensureDir();
  writeFileSync(NARRATOR_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf8');
};

const loadStats = (): NarratorStats => {
  try {
    ensureDir();
    if (!existsSync(NARRATOR_STATS_PATH)) return structuredClone(DEFAULT_STATS);
    return JSON.parse(readFileSync(NARRATOR_STATS_PATH, 'utf8')) as NarratorStats;
  } catch {
    return structuredClone(DEFAULT_STATS);
  }
};

const saveStats = (stats: NarratorStats): void => {
  ensureDir();
  stats.lastUpdated = new Date().toISOString();
  writeFileSync(NARRATOR_STATS_PATH, JSON.stringify(stats, null, 2), 'utf8');
};

// ── Cost estimation por provider ──────────────────────────────────────────────

const COST_PER_1K_CHARS_USD: Record<string, number> = {
  elevenlabs: 0.3, // varía según plan
  google_unofficial: 0, // gratis (uso no oficial)
  sapi: 0, // gratis Windows
  browser: 0, // gratis (Web Speech API)
  cloned: 0.5, // estimación alta (suele usar ElevenLabs)
};

const estimateCostUsd = (text: string, provider: string): number => {
  const perK = COST_PER_1K_CHARS_USD[provider] ?? 0;
  return (text.length / 1000) * perK;
};

// ── Configuración pública ─────────────────────────────────────────────────────

export const getNarratorConfig = (): NarratorConfig => loadConfig();

export const setNarratorLevel = (level: NarrationLevel): NarratorConfig => {
  const config = loadConfig();
  config.level = level;
  saveConfig(config);
  log.info(`[VoiceNarrator] Level set: ${level}`);
  return config;
};

export const updateNarratorConfig = (updates: Partial<NarratorConfig>): NarratorConfig => {
  const config = { ...loadConfig(), ...updates };
  saveConfig(config);
  log.info(`[VoiceNarrator] Config actualizado: ${Object.keys(updates).join(', ')}`);
  return config;
};

export const toggleCategory = (category: NarrationCategory, enabled: boolean): NarratorConfig => {
  const config = loadConfig();
  if (enabled && !config.enabledCategories.includes(category)) {
    config.enabledCategories.push(category);
  } else if (!enabled) {
    config.enabledCategories = config.enabledCategories.filter((c) => c !== category);
  }
  saveConfig(config);
  return config;
};

// ── Decisión de si narrar según level + category ──────────────────────────────

const shouldNarrate = (category: NarrationCategory, config: NarratorConfig): boolean => {
  if (config.level === 'off') return false;
  if (!config.enabledCategories.includes(category)) return false;

  // Quiet = solo wins importantes
  if (config.level === 'quiet') {
    return ['workflow-start', 'success', 'error', 'milestone', 'alert'].includes(category);
  }

  // Normal = pasos significativos (excluye thinking)
  if (config.level === 'normal') {
    return category !== 'thinking';
  }

  // Verbose = todo
  return true;
};

// ── Narrar ────────────────────────────────────────────────────────────────────

export interface NarrationContext {
  workflowName?: string;
  brandName?: string;
  step?: number;
  totalSteps?: number;
  metadata?: Record<string, unknown>;
}

export const narrate = async (
  text: string,
  category: NarrationCategory = 'navigation',
  context: NarrationContext = {},
): Promise<{ spoken: boolean; reason?: string; costUsdEstimate: number }> => {
  const config = loadConfig();

  if (!shouldNarrate(category, config)) {
    return { spoken: false, reason: `nivel ${config.level} no incluye ${category}`, costUsdEstimate: 0 };
  }

  const costEstimate = estimateCostUsd(text, config.provider ?? 'sapi');

  // Chequeo de límite diario para providers de pago
  if (costEstimate > 0) {
    const stats = loadStats();
    const today = new Date().toISOString().split('T')[0]!;
    const todayUsage = stats.byDay[today] ?? { count: 0, usdEstimate: 0 };
    if (todayUsage.usdEstimate + costEstimate > config.costAlertThresholdUsd) {
      log.warn(
        `[VoiceNarrator] Skip narración: excede threshold diario ($${config.costAlertThresholdUsd}, hoy $${todayUsage.usdEstimate.toFixed(3)})`,
      );
      return { spoken: false, reason: 'excede threshold diario de costo', costUsdEstimate: 0 };
    }
  }

  // Construir texto con prefijo de contexto si aplica
  let finalText = text;
  if (category === 'workflow-start' && context.workflowName) {
    finalText = `Iniciando ${context.workflowName}. ${text}`;
  } else if (context.step !== undefined && context.totalSteps !== undefined && config.level === 'verbose') {
    finalText = `Paso ${context.step} de ${context.totalSteps}. ${text}`;
  }

  // Whisper mode = volumen más bajo + voz más suave
  const opts: TTSOptions = {
    provider: config.provider ?? 'sapi',
    language: config.language,
    rate: config.whisperMode ? Math.max(0.7, (config.rate ?? 1) - 0.15) : config.rate,
    volume: config.whisperMode ? Math.max(30, (config.volume ?? 0.8) * 100 - 30) : (config.volume ?? 0.8) * 100,
    emotion: config.whisperMode ? 'warm' : 'professional',
  };

  try {
    if (config.saveAudio) {
      // Modo síncrono para guardar el audio
      await speak(finalText, opts);
    } else {
      // Fire-and-forget
      speakAsync(finalText, opts);
    }

    // Update stats
    const stats = loadStats();
    stats.totalNarrationsAllTime++;
    stats.totalTokensSpent += Math.ceil(finalText.length / 4); // aprox tokens
    stats.totalUsdEstimate += costEstimate;
    stats.byCategory[category] = (stats.byCategory[category] ?? 0) + 1;
    stats.byProvider[opts.provider ?? 'sapi'] = (stats.byProvider[opts.provider ?? 'sapi'] ?? 0) + 1;
    const today = new Date().toISOString().split('T')[0]!;
    const todayStats = stats.byDay[today] ?? { count: 0, usdEstimate: 0 };
    todayStats.count++;
    todayStats.usdEstimate += costEstimate;
    stats.byDay[today] = todayStats;
    stats.lastNarratedAt = new Date().toISOString();
    saveStats(stats);

    log.debug(`[VoiceNarrator] "${finalText.slice(0, 60)}..." (${category}, $${costEstimate.toFixed(4)})`);
    return { spoken: true, costUsdEstimate: costEstimate };
  } catch (err) {
    log.warn(`[VoiceNarrator] Error narrando: ${(err as Error).message}`);
    return { spoken: false, reason: (err as Error).message, costUsdEstimate: 0 };
  }
};

// ── Stats y monitoreo ─────────────────────────────────────────────────────────

export const getNarratorStats = (): NarratorStats => loadStats();

export const getDailyUsage = (date?: string): { date: string; count: number; usdEstimate: number } => {
  const stats = loadStats();
  const d = date ?? new Date().toISOString().split('T')[0]!;
  const entry = stats.byDay[d] ?? { count: 0, usdEstimate: 0 };
  return { date: d, ...entry };
};

export const resetStats = (): void => {
  saveStats(structuredClone(DEFAULT_STATS));
  log.info('[VoiceNarrator] Stats reseteadas');
};

// ── Helpers de narración pre-armada por contexto ─────────────────────────────

export const narrateWorkflowStart = (workflowName: string, brandName: string): Promise<unknown> =>
  narrate(`Iniciando workflow ${workflowName} para ${brandName}.`, 'workflow-start', { workflowName, brandName });

export const narrateAppLaunch = (appName: string): Promise<unknown> => narrate(`Abriendo ${appName}.`, 'app-launch');

export const narrateNavigation = (destination: string): Promise<unknown> =>
  narrate(`Navegando a ${destination}.`, 'navigation');

export const narrateEditing = (what: string): Promise<unknown> => narrate(`Editando ${what}.`, 'editing');

export const narrateExport = (format: string): Promise<unknown> =>
  narrate(`Descargando archivo en formato ${format}.`, 'export');

export const narratePublishing = (platform: string): Promise<unknown> =>
  narrate(`Publicando en ${platform}.`, 'publishing');

export const narrateSuccess = (what: string): Promise<unknown> => narrate(`Listo. ${what}.`, 'success');

export const narrateError = (what: string): Promise<unknown> => narrate(`Hubo un problema. ${what}.`, 'error');

export const narrateMilestone = (achievement: string): Promise<unknown> =>
  narrate(`Logro alcanzado. ${achievement}.`, 'milestone');

export const narrateAlert = (alert: string): Promise<unknown> => narrate(`Atención. ${alert}.`, 'alert');

// ── Disable/enable rápido (para UI toggle) ───────────────────────────────────

export const disable = (): NarratorConfig => setNarratorLevel('off');
export const enable = (level: NarrationLevel = 'normal'): NarratorConfig => setNarratorLevel(level);
export const isEnabled = (): boolean => loadConfig().level !== 'off';

// ── Switch a provider gratis si gasto supera límite ──────────────────────────

export const enforceCostLimit = (): { switched: boolean; from: string; to: string; reason: string } => {
  const config = loadConfig();
  const stats = loadStats();
  const today = new Date().toISOString().split('T')[0]!;
  const todayUsage = stats.byDay[today] ?? { count: 0, usdEstimate: 0 };

  if (
    todayUsage.usdEstimate > config.costAlertThresholdUsd &&
    config.provider !== 'sapi' &&
    config.provider !== 'browser' &&
    config.provider !== 'google_unofficial'
  ) {
    const from = config.provider ?? 'elevenlabs';
    config.provider = 'sapi'; // fallback gratuito
    saveConfig(config);
    log.warn(
      `[VoiceNarrator] Switch automático a sapi (gratis) por exceder threshold $${config.costAlertThresholdUsd}`,
    );
    return {
      switched: true,
      from,
      to: 'sapi',
      reason: `Hoy gastaste $${todayUsage.usdEstimate.toFixed(3)} > threshold $${config.costAlertThresholdUsd}`,
    };
  }

  return { switched: false, from: config.provider ?? '', to: config.provider ?? '', reason: 'Dentro del límite' };
};

// ── Modo conversacional con el usuario ───────────────────────────────────────

export const narrateConversation = async (turn: { role: 'system' | 'user'; text: string }): Promise<void> => {
  // Solo narramos lo del sistema; user input no se vuelve a leer
  if (turn.role !== 'system') return;
  await narrate(turn.text, 'navigation');
};
