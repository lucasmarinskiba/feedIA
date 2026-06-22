/**
 * Crisis Predictor — Predicción de crisis antes de que exploten
 * Detecta señales tempranas: comentarios negativos en aumento,
 * menciones tóxicas, caída de engagement anormal, competidor moviéndose.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';
import * as episodic from '../memory/episodicMemory.js';
import * as causal from './causalEngine.js';

const CRISIS_PATH = resolve('data/runtime/brain/crisis-predictor.json');

export interface CrisisSignal {
  id: string;
  type:
    | 'sentiment_drop'
    | 'comment_spike'
    | 'engagement_crash'
    | 'competitor_attack'
    | 'viral_negative'
    | 'hashtag_hijack';
  severity: 'watch' | 'warning' | 'critical';
  metric: string;
  baseline: number;
  current: number;
  delta: number;
  detectedAt: string;
  predictedPeak: string;
  recommendedActions: string[];
  status: 'open' | 'mitigated' | 'escalated' | 'false_alarm';
}

interface CrisisStore {
  signals: CrisisSignal[];
  baselines: Record<string, number>;
  lastCheck: string;
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime/brain'), { recursive: true });
};

const loadStore = (): CrisisStore => {
  try {
    ensureDir();
    if (!existsSync(CRISIS_PATH)) return { signals: [], baselines: {}, lastCheck: new Date().toISOString() };
    return JSON.parse(readFileSync(CRISIS_PATH, 'utf-8')) as CrisisStore;
  } catch {
    return { signals: [], baselines: {}, lastCheck: new Date().toISOString() };
  }
};

const saveStore = (store: CrisisStore): void => {
  ensureDir();
  writeFileSync(CRISIS_PATH, JSON.stringify(store, null, 2), 'utf-8');
};

// ── Detect crisis signals ──────────────────────────────────────────────────

export const scan = (
  metrics: {
    avgSentiment: number; // -1 to 1
    commentVelocity: number; // comments per hour
    engagementRate: number; // %
    negativeMentions: number;
    competitorMentions: number;
    unfollowRate: number; // %
  },
  brand: string,
): CrisisSignal[] => {
  const store = loadStore();
  const signals: CrisisSignal[] = [];

  // Baseline management
  store.baselines.sentiment = store.baselines.sentiment ?? metrics.avgSentiment;
  store.baselines.commentVelocity = store.baselines.commentVelocity ?? metrics.commentVelocity;
  store.baselines.engagementRate = store.baselines.engagementRate ?? metrics.engagementRate;

  // Moving averages
  store.baselines.sentiment = store.baselines.sentiment * 0.8 + metrics.avgSentiment * 0.2;
  store.baselines.commentVelocity = store.baselines.commentVelocity * 0.8 + metrics.commentVelocity * 0.2;
  store.baselines.engagementRate = store.baselines.engagementRate * 0.8 + metrics.engagementRate * 0.2;

  // 1. Sentiment drop
  const sentimentDelta = store.baselines.sentiment - metrics.avgSentiment;
  if (sentimentDelta > 0.3) {
    signals.push(
      createSignal(
        'sentiment_drop',
        sentimentDelta > 0.5 ? 'critical' : 'warning',
        'sentiment',
        store.baselines.sentiment,
        metrics.avgSentiment,
        sentimentDelta,
        [
          'Publicar contenido positivo / testimonios',
          'Responder rápido a comentarios negativos',
          'Activar modo crisis si continúa',
        ],
      ),
    );
  }

  // 2. Comment spike (could be negative viral)
  const commentDelta = metrics.commentVelocity / (store.baselines.commentVelocity || 1);
  if (commentDelta > 3 && metrics.avgSentiment < 0) {
    signals.push(
      createSignal(
        'comment_spike',
        'critical',
        'commentVelocity',
        store.baselines.commentVelocity,
        metrics.commentVelocity,
        commentDelta,
        ['Pausar publicaciones programadas', 'Revisar comentarios manualmente', 'Preparar respuesta de crisis'],
      ),
    );
  }

  // 3. Engagement crash
  const engagementDelta = store.baselines.engagementRate - metrics.engagementRate;
  if (engagementDelta > store.baselines.engagementRate * 0.5) {
    signals.push(
      createSignal(
        'engagement_crash',
        engagementDelta > store.baselines.engagementRate * 0.7 ? 'critical' : 'warning',
        'engagementRate',
        store.baselines.engagementRate,
        metrics.engagementRate,
        engagementDelta,
        ['Auditar últimos 5 posts', 'Verificar shadowban', 'Probar nuevo formato'],
      ),
    );
  }

  // 4. Competitor attack
  if (metrics.competitorMentions > 10 && metrics.avgSentiment < 0) {
    signals.push(
      createSignal(
        'competitor_attack',
        'warning',
        'competitorMentions',
        0,
        metrics.competitorMentions,
        metrics.competitorMentions,
        ['No responder directamente al ataque', 'Reforzar propuesta de valor', 'Activar defensores de marca'],
      ),
    );
  }

  // 5. Viral negative
  if (metrics.negativeMentions > 50) {
    signals.push(
      createSignal(
        'viral_negative',
        'critical',
        'negativeMentions',
        0,
        metrics.negativeMentions,
        metrics.negativeMentions,
        ['Activar crisis protocol', 'Pausar todo publishing', 'Contactar legal si es difamación'],
      ),
    );
  }

  // 6. Unfollow spike
  if (metrics.unfollowRate > 2) {
    signals.push(
      createSignal('engagement_crash', 'warning', 'unfollowRate', 0, metrics.unfollowRate, metrics.unfollowRate, [
        'Revisar último contenido controversial',
        'Publicar contenido de valor puro',
        'Hacer encuesta para entender qué pasa',
      ]),
    );
  }

  // Store signals
  for (const signal of signals) {
    const existing = store.signals.find((s) => s.type === signal.type && s.status === 'open');
    if (!existing) {
      store.signals.push(signal);

      causal.inferCause({
        action: `señal de crisis: ${signal.type}`,
        outcome: `severidad ${signal.severity}`,
        before: signal.baseline,
        after: signal.current,
        context: 'crisis-prediction',
        niche: 'general',
      });

      episodic.recordEpisode('crisis-signal', `${signal.type}: ${signal.severity}`, {
        tags: ['crisis', signal.severity],
        emotion: signal.severity === 'critical' ? 'negative' : 'neutral',
      });

      semantic.storeMemory(
        `CRISIS SIGNAL: ${signal.type} [${signal.severity}] — ${signal.metric}: ${signal.current} (baseline: ${signal.baseline})`,
        'learning',
        { type: signal.type, severity: signal.severity, metric: signal.metric },
        signal.severity === 'critical' ? 0.95 : 0.7,
      );
    }
  }

  store.lastCheck = new Date().toISOString();
  saveStore(store);

  if (signals.length > 0) {
    log.warn(`[CrisisPredictor] ${signals.length} signals detected: ${signals.map((s) => s.type).join(', ')}`);
  }

  return signals;
};

// ── Create signal helper ───────────────────────────────────────────────────

const createSignal = (
  type: CrisisSignal['type'],
  severity: CrisisSignal['severity'],
  metric: string,
  baseline: number,
  current: number,
  delta: number,
  actions: string[],
): CrisisSignal => ({
  id: `crisis-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
  type,
  severity,
  metric,
  baseline,
  current,
  delta,
  detectedAt: new Date().toISOString(),
  predictedPeak: new Date(Date.now() + (severity === 'critical' ? 6 : 24) * 3600_000).toISOString(),
  recommendedActions: actions,
  status: 'open',
});

// ── Get active threats ─────────────────────────────────────────────────────

export const getActiveThreats = (): CrisisSignal[] => {
  return loadStore()
    .signals.filter((s) => s.status === 'open')
    .sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, watch: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
};

// ── Resolve signal ─────────────────────────────────────────────────────────

export const resolveSignal = (signalId: string, resolution: 'mitigated' | 'escalated' | 'false_alarm'): void => {
  const store = loadStore();
  const signal = store.signals.find((s) => s.id === signalId);
  if (signal) {
    signal.status = resolution;
    saveStore(store);
    log.info(`[CrisisPredictor] Signal ${signalId} resolved: ${resolution}`);
  }
};

// ── Stats ──────────────────────────────────────────────────────────────────

export const getStats = (): { totalSignals: number; active: number; critical: number; lastCheck: string } => {
  const store = loadStore();
  return {
    totalSignals: store.signals.length,
    active: store.signals.filter((s) => s.status === 'open').length,
    critical: store.signals.filter((s) => s.status === 'open' && s.severity === 'critical').length,
    lastCheck: store.lastCheck,
  };
};
