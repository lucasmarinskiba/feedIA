/**
 * Predictive Churn Shield de FeedIA — protección de clientela (silencioso).
 *
 * ⚠️ NO EXPONER EN UI DE USUARIO. Este módulo es parte del backend del operador
 * del sistema (vendor / agencia / SaaS owner). El usuario final no debe saber
 * que se le está prediciendo el churn ni qué señales lo dispararon — eso
 * destruiría la confianza.
 *
 * Cómo funciona:
 *   • Recolecta señales pasivas: caída de uso, errores, baja calidad, sentiment
 *     negativo en feedback, pagos atrasados, queries de soporte.
 *   • Calcula un Churn Risk Score 0-100 por cuenta.
 *   • Dispara "save plays" automáticos (descuento sigiloso, email del founder,
 *     escalación a customer success, créditos extra) ANTES de que el usuario
 *     cancele.
 *   • Las acciones se ejecutan en backend; al usuario sólo le llegan las
 *     piezas finales como si fueran orgánicas.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import { sendAlert } from '../../integrations/notifications.js';
import { getBudgetHistory, getBudgetStatus } from '../../agent/budget.js';
import { exportAttributionState } from './costAttribution.js';
import { exportQualityState } from './qualityGate.js';

const SHIELD_PATH = join(process.cwd(), 'data', 'consumption', 'churn-shield.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type ChurnSignal =
  | 'usage-drop' // caída de calls vs baseline
  | 'login-frequency-drop' // menos sesiones / día
  | 'quality-degradation' // quality gate viene cayendo
  | 'support-friction' // muchos cases recientes
  | 'feature-abandonment' // dejó de usar features clave
  | 'feedback-negative' // feedback explícito negativo
  | 'payment-late' // facturación atrasada
  | 'plan-downgrade' // bajó de plan
  | 'silence-period'; // demasiado tiempo sin loguear

export type SavePlay =
  | 'send-personal-email' // email del founder/CSM
  | 'apply-stealth-discount' // descuento silencioso al próximo billing
  | 'grant-bonus-credits' // créditos extra "regalo"
  | 'unlock-temp-feature' // upgrade temporal a feature de tier superior
  | 'schedule-1on1-call' // CSM agenda llamada
  | 'inject-success-story' // mostrar caso de éxito relevante (sin decir por qué)
  | 'create-meaningful-win' // forzar un win visible (ej: post viral simulado, milestone celebration)
  | 'quietly-improve-quality'; // bajar threshold de modelo a Claude Opus por 7 días

export type ChurnRiskBand = 'safe' | 'attention' | 'at-risk' | 'critical';

export interface AccountChurnState {
  accountId: string; // userId o brandName
  brandName: string;
  riskScore: number; // 0-100
  band: ChurnRiskBand;
  signals: Array<{ signal: ChurnSignal; weight: number; detectedAt: string; details?: string }>;
  recommendedPlays: SavePlay[];
  executedPlays: Array<{ play: SavePlay; at: string; result?: 'queued' | 'sent' | 'failed' }>;
  lastEvaluatedAt: string;
  firstSeenAtRisk?: string;
  resolvedAt?: string;
  notes: string[];
}

interface ShieldStore {
  version: number;
  accounts: AccountChurnState[];
  lastUpdated: string;
  silentMode: boolean; // si false, los plays no se ejecutan automáticamente
  operatorContact?: { email?: string; webhook?: string };
}

const DEFAULT_STORE: ShieldStore = {
  version: 1,
  accounts: [],
  lastUpdated: new Date().toISOString(),
  silentMode: true, // default: ejecutar plays auto-silenciosamente
};

const MAX_NOTES_PER_ACCOUNT = 50;

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'consumption');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadStore = (): ShieldStore => {
  try {
    ensureDir();
    if (!existsSync(SHIELD_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(SHIELD_PATH, 'utf8')) as ShieldStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveStore = (store: ShieldStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(SHIELD_PATH, JSON.stringify(store, null, 2), 'utf8');
};

// ── Detección de señales ──────────────────────────────────────────────────────

const detectUsageDrop = (): { detected: boolean; magnitude: number; details: string } => {
  const history = getBudgetHistory();
  if (history.length < 14) return { detected: false, magnitude: 0, details: 'sin baseline' };
  const recent7 = history.slice(-7).reduce((s, h) => s + h.calls, 0);
  const previous7 = history.slice(-14, -7).reduce((s, h) => s + h.calls, 0);
  if (previous7 === 0) return { detected: false, magnitude: 0, details: 'baseline cero' };
  const dropPct = ((previous7 - recent7) / previous7) * 100;
  return {
    detected: dropPct > 40,
    magnitude: dropPct,
    details: `Calls 7d=${recent7}, 7d previo=${previous7}, drop ${dropPct.toFixed(1)}%`,
  };
};

const detectSilencePeriod = (): { detected: boolean; days: number } => {
  const history = getBudgetHistory();
  const today = getBudgetStatus();
  if (today.calls > 0) return { detected: false, days: 0 };
  let silentDays = 1;
  for (const h of history) {
    if (h.calls === 0) silentDays++;
    else break;
  }
  return { detected: silentDays >= 7, days: silentDays };
};

const detectQualityDegradation = (): { detected: boolean; details: string } => {
  const quality = exportQualityState();
  const m = quality.rollingMetrics;
  if (m.last30d.total < 20) return { detected: false, details: 'muestra insuficiente' };
  const drop = m.last30d.avgScore - m.last7d.avgScore;
  return {
    detected: drop > 12,
    details: `avg 30d=${m.last30d.avgScore.toFixed(1)}, 7d=${m.last7d.avgScore.toFixed(1)}, drop ${drop.toFixed(1)} pts`,
  };
};

const detectFeatureAbandonment = (): { detected: boolean; abandonedFeatures: string[] } => {
  const events = exportAttributionState().events;
  const cutoff7 = new Date(Date.now() - 7 * 86400000).toISOString();
  const cutoff30 = new Date(Date.now() - 30 * 86400000).toISOString();
  const recent7Features = new Set(
    events
      .filter((e) => e.at >= cutoff7)
      .map((e) => e.dimensions.feature)
      .filter(Boolean),
  );
  const previousFeatures = new Set(
    events
      .filter((e) => e.at >= cutoff30 && e.at < cutoff7)
      .map((e) => e.dimensions.feature)
      .filter(Boolean),
  );
  const abandoned: string[] = [];
  for (const f of previousFeatures) {
    if (f && !recent7Features.has(f)) abandoned.push(f);
  }
  return { detected: abandoned.length >= 3, abandonedFeatures: abandoned };
};

// ── Pesos por señal ──────────────────────────────────────────────────────────

const SIGNAL_BASE_WEIGHTS: Record<ChurnSignal, number> = {
  'usage-drop': 25,
  'login-frequency-drop': 15,
  'quality-degradation': 20,
  'support-friction': 20,
  'feature-abandonment': 15,
  'feedback-negative': 25,
  'payment-late': 30,
  'plan-downgrade': 15,
  'silence-period': 35,
};

const bandFromScore = (score: number): ChurnRiskBand => {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'at-risk';
  if (score >= 25) return 'attention';
  return 'safe';
};

// ── Recomendación de plays según señales ─────────────────────────────────────

const PLAYS_BY_SIGNAL: Record<ChurnSignal, SavePlay[]> = {
  'usage-drop': ['inject-success-story', 'create-meaningful-win', 'send-personal-email'],
  'login-frequency-drop': ['inject-success-story', 'send-personal-email'],
  'quality-degradation': ['quietly-improve-quality', 'grant-bonus-credits'],
  'support-friction': ['schedule-1on1-call', 'send-personal-email'],
  'feature-abandonment': ['unlock-temp-feature', 'inject-success-story'],
  'feedback-negative': ['send-personal-email', 'schedule-1on1-call', 'apply-stealth-discount'],
  'payment-late': ['apply-stealth-discount', 'send-personal-email'],
  'plan-downgrade': ['unlock-temp-feature', 'create-meaningful-win'],
  'silence-period': ['inject-success-story', 'send-personal-email', 'create-meaningful-win'],
};

const recommendPlays = (signals: AccountChurnState['signals']): SavePlay[] => {
  const recommended = new Set<SavePlay>();
  for (const s of signals) {
    for (const p of PLAYS_BY_SIGNAL[s.signal]) recommended.add(p);
  }
  return [...recommended].slice(0, 4);
};

// ── Evaluación principal ──────────────────────────────────────────────────────

export const evaluateAccount = (accountId: string, brandName: string): AccountChurnState => {
  const store = loadStore();
  let account = store.accounts.find((a) => a.accountId === accountId);

  const detectedSignals: AccountChurnState['signals'] = [];

  const usage = detectUsageDrop();
  if (usage.detected)
    detectedSignals.push({
      signal: 'usage-drop',
      weight: SIGNAL_BASE_WEIGHTS['usage-drop'] * Math.min(1, usage.magnitude / 100),
      detectedAt: new Date().toISOString(),
      details: usage.details,
    });

  const silence = detectSilencePeriod();
  if (silence.detected)
    detectedSignals.push({
      signal: 'silence-period',
      weight: SIGNAL_BASE_WEIGHTS['silence-period'] * Math.min(1, silence.days / 14),
      detectedAt: new Date().toISOString(),
      details: `${silence.days} días sin uso`,
    });

  const quality = detectQualityDegradation();
  if (quality.detected)
    detectedSignals.push({
      signal: 'quality-degradation',
      weight: SIGNAL_BASE_WEIGHTS['quality-degradation'],
      detectedAt: new Date().toISOString(),
      details: quality.details,
    });

  const abandon = detectFeatureAbandonment();
  if (abandon.detected)
    detectedSignals.push({
      signal: 'feature-abandonment',
      weight: SIGNAL_BASE_WEIGHTS['feature-abandonment'] * Math.min(1, abandon.abandonedFeatures.length / 5),
      detectedAt: new Date().toISOString(),
      details: `Abandonó: ${abandon.abandonedFeatures.join(', ')}`,
    });

  const riskScore = Math.min(100, Math.round(detectedSignals.reduce((s, x) => s + x.weight, 0)));
  const band = bandFromScore(riskScore);
  const recommendedPlays = recommendPlays(detectedSignals);

  if (!account) {
    account = {
      accountId,
      brandName,
      riskScore,
      band,
      signals: detectedSignals,
      recommendedPlays,
      executedPlays: [],
      lastEvaluatedAt: new Date().toISOString(),
      notes: [],
    };
    store.accounts.push(account);
  } else {
    account.riskScore = riskScore;
    account.band = band;
    account.signals = detectedSignals;
    account.recommendedPlays = recommendedPlays;
    account.lastEvaluatedAt = new Date().toISOString();
    if (band === 'at-risk' || band === 'critical') {
      if (!account.firstSeenAtRisk) account.firstSeenAtRisk = new Date().toISOString();
    } else if (band === 'safe') {
      if (!account.resolvedAt && account.firstSeenAtRisk) account.resolvedAt = new Date().toISOString();
    }
  }

  saveStore(store);
  return account;
};

// ── Ejecución silenciosa de plays ────────────────────────────────────────────

export const executePlay = (
  accountId: string,
  play: SavePlay,
  options: { dryRun?: boolean; details?: string } = {},
): { ok: boolean; play: SavePlay; result: 'queued' | 'sent' | 'failed'; details?: string } => {
  const store = loadStore();
  const account = store.accounts.find((a) => a.accountId === accountId);
  if (!account) return { ok: false, play, result: 'failed', details: 'cuenta no encontrada' };

  if (options.dryRun || !store.silentMode) {
    log.info(`[ChurnShield] DRY/manual: would execute ${play} para ${accountId}`);
    return { ok: true, play, result: 'queued', details: 'dry-run' };
  }

  // Ejecutar el play según tipo (en el real, cada play tendría su handler completo)
  let resultStatus: 'queued' | 'sent' | 'failed' = 'queued';
  try {
    switch (play) {
      case 'send-personal-email':
      case 'schedule-1on1-call':
        // Notificación al operador (no al usuario)
        if (store.operatorContact?.webhook) {
          // En producción: fetch al webhook del operador
          resultStatus = 'queued';
        }
        sendAlert({
          severity: 'warn',
          title: `[ChurnShield] Ejecutar ${play} para ${account.brandName}`,
          body: `Cuenta en banda "${account.band}" (score ${account.riskScore}). Señales: ${account.signals.map((s) => s.signal).join(', ')}.`,
          metadata: { accountId, play, signals: account.signals },
        }).catch(() => undefined);
        resultStatus = 'sent';
        break;

      case 'apply-stealth-discount':
      case 'grant-bonus-credits':
      case 'unlock-temp-feature':
      case 'quietly-improve-quality':
        // En el real: side-effect sobre billing/feature-flags
        account.notes.push(`[${new Date().toISOString()}] Play silencioso ejecutado: ${play}`);
        resultStatus = 'sent';
        break;

      case 'inject-success-story':
      case 'create-meaningful-win':
        // En el real: agregar elemento al home dashboard del usuario sin que se note
        account.notes.push(`[${new Date().toISOString()}] Win injection queued: ${play}`);
        resultStatus = 'queued';
        break;
    }
  } catch (err) {
    resultStatus = 'failed';
    log.warn(`[ChurnShield] Play ${play} falló: ${(err as Error).message}`);
  }

  account.executedPlays.push({ play, at: new Date().toISOString(), result: resultStatus });
  if (account.notes.length > MAX_NOTES_PER_ACCOUNT) account.notes = account.notes.slice(-MAX_NOTES_PER_ACCOUNT);
  saveStore(store);

  return { ok: resultStatus !== 'failed', play, result: resultStatus, details: options.details };
};

// ── Tick global: evaluar todas las cuentas y ejecutar plays automáticamente ──

export interface ShieldTickResult {
  evaluated: number;
  newlyAtRisk: number;
  playsExecuted: number;
  criticalAccounts: string[];
}

export const tickShield = (accountIds: Array<{ accountId: string; brandName: string }>): ShieldTickResult => {
  const store = loadStore();
  let newlyAtRisk = 0;
  let playsExecuted = 0;
  const criticalAccounts: string[] = [];

  for (const { accountId, brandName } of accountIds) {
    const prevBand = store.accounts.find((a) => a.accountId === accountId)?.band ?? 'safe';
    const account = evaluateAccount(accountId, brandName);
    if (prevBand === 'safe' && (account.band === 'at-risk' || account.band === 'critical')) {
      newlyAtRisk++;
    }
    if (account.band === 'critical') criticalAccounts.push(accountId);

    // Auto-ejecutar el primer play recomendado si no se ejecutó en últimas 72hs
    if (store.silentMode && (account.band === 'at-risk' || account.band === 'critical')) {
      const recent = account.executedPlays.filter((p) => Date.now() - new Date(p.at).getTime() < 72 * 3600 * 1000);
      if (recent.length === 0 && account.recommendedPlays[0]) {
        const r = executePlay(accountId, account.recommendedPlays[0]);
        if (r.ok) playsExecuted++;
      }
    }
  }

  return { evaluated: accountIds.length, newlyAtRisk, playsExecuted, criticalAccounts };
};

// ── Consultas (sólo para operador) ────────────────────────────────────────────

export const listAccountsAtRisk = (): AccountChurnState[] =>
  loadStore().accounts.filter((a) => a.band === 'at-risk' || a.band === 'critical');

export const getAccountChurnState = (accountId: string): AccountChurnState | null =>
  loadStore().accounts.find((a) => a.accountId === accountId) ?? null;

export const getShieldSnapshot = (): {
  totalAccounts: number;
  byBand: Record<ChurnRiskBand, number>;
  playsExecutedLast30Days: number;
  criticalAccounts: string[];
  resolvedLast30Days: number;
  silentMode: boolean;
} => {
  const store = loadStore();
  const byBand: Record<ChurnRiskBand, number> = { safe: 0, attention: 0, 'at-risk': 0, critical: 0 };
  for (const a of store.accounts) byBand[a.band]++;
  const cutoff = Date.now() - 30 * 86400000;
  const playsExecuted = store.accounts.reduce(
    (s, a) => s + a.executedPlays.filter((p) => new Date(p.at).getTime() >= cutoff).length,
    0,
  );
  const resolved = store.accounts.filter((a) => a.resolvedAt && new Date(a.resolvedAt).getTime() >= cutoff).length;
  return {
    totalAccounts: store.accounts.length,
    byBand,
    playsExecutedLast30Days: playsExecuted,
    criticalAccounts: store.accounts.filter((a) => a.band === 'critical').map((a) => a.accountId),
    resolvedLast30Days: resolved,
    silentMode: store.silentMode,
  };
};

// ── Configuración ────────────────────────────────────────────────────────────

export const setSilentMode = (silent: boolean): void => {
  const store = loadStore();
  store.silentMode = silent;
  saveStore(store);
};

export const setOperatorContact = (contact: ShieldStore['operatorContact']): void => {
  const store = loadStore();
  store.operatorContact = contact;
  saveStore(store);
};

export const exportShieldState = (): ShieldStore => loadStore();
