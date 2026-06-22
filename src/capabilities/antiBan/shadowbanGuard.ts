/**
 * Shadowban Guard
 *
 * Detecta señales tempranas de posible shadowban y toma acciones preventivas.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';
import { sendAlert } from '../../integrations/notifications.js';

const SHADOWBAN_FILE = resolve('data/runtime/shadowban-guard.json');

interface ShadowbanState {
  lastCheck: string;
  postHistory: Array<{
    postId: string;
    timestamp: string;
    reach: number;
    engagementRate: number;
  }>;
  alertsSent: number;
  cooldownUntil?: string;
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime'), { recursive: true });
};

const loadState = (): ShadowbanState => {
  if (!existsSync(SHADOWBAN_FILE)) {
    return { lastCheck: new Date().toISOString(), postHistory: [], alertsSent: 0 };
  }
  try {
    return JSON.parse(readFileSync(SHADOWBAN_FILE, 'utf-8')) as ShadowbanState;
  } catch {
    return { lastCheck: new Date().toISOString(), postHistory: [], alertsSent: 0 };
  }
};

const saveState = (state: ShadowbanState): void => {
  ensureDir();
  writeFileSync(SHADOWBAN_FILE, JSON.stringify(state, null, 2), 'utf-8');
};

/**
 * Registra métricas de un post para análisis posterior.
 */
export const recordPostMetrics = (postId: string, reach: number, engagementRate: number): void => {
  const state = loadState();
  state.postHistory.push({
    postId,
    timestamp: new Date().toISOString(),
    reach,
    engagementRate,
  });
  // Keep last 30 posts
  state.postHistory = state.postHistory.slice(-30);
  saveState(state);
};

/**
 * Analiza si hay señales de shadowban comparando con el promedio histórico.
 */
export const checkShadowbanSignals = async (): Promise<{
  suspected: boolean;
  confidence: number;
  reasons: string[];
}> => {
  const state = loadState();
  const history = state.postHistory;

  if (history.length < 5) {
    return { suspected: false, confidence: 0, reasons: ['Datos insuficientes (mínimo 5 posts)'] };
  }

  const reasons: string[] = [];
  let confidence = 0;

  // Calculate averages from first 70% of history (baseline)
  const baselineCount = Math.floor(history.length * 0.7);
  const baseline = history.slice(0, baselineCount);
  const recent = history.slice(baselineCount);

  const avgReach = baseline.reduce((s, p) => s + p.reach, 0) / baseline.length;
  const avgEngagement = baseline.reduce((s, p) => s + p.engagementRate, 0) / baseline.length;

  const recentAvgReach = recent.reduce((s, p) => s + p.reach, 0) / recent.length;
  const recentAvgEngagement = recent.reduce((s, p) => s + p.engagementRate, 0) / recent.length;

  // Check reach drop > 30%
  if (avgReach > 0 && recentAvgReach / avgReach < 0.7) {
    const drop = ((avgReach - recentAvgReach) / avgReach) * 100;
    reasons.push(`Alcance cayó ${drop.toFixed(0)}% respecto al baseline`);
    confidence += 40;
  }

  // Check engagement drop > 40%
  if (avgEngagement > 0 && recentAvgEngagement / avgEngagement < 0.6) {
    const drop = ((avgEngagement - recentAvgEngagement) / avgEngagement) * 100;
    reasons.push(`Engagement cayó ${drop.toFixed(0)}% respecto al baseline`);
    confidence += 35;
  }

  // Check if latest post is significantly lower
  const latest = history[history.length - 1];
  if (latest && avgReach > 0 && latest.reach / avgReach < 0.5) {
    reasons.push(`Último post con alcance ${latest.reach} vs promedio ${Math.round(avgReach)}`);
    confidence += 25;
  }

  const suspected = confidence >= 50;

  if (suspected && (!state.cooldownUntil || new Date() > new Date(state.cooldownUntil))) {
    state.alertsSent += 1;
    state.cooldownUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    saveState(state);

    await sendAlert({
      severity: 'warn',
      title: 'Shadowban Guard: posible restricción detectada',
      body: `Confianza: ${confidence}%\nRazones:\n${reasons.map((r) => `• ${r}`).join('\n')}\n\nRecomendaciones:\n• Pausar acciones automatizadas por 24-48h\n• Publicar solo contenido orgánico de alto valor\n• Evitar hashtags repetidos\n• No usar engagement pods`,
    });
  } else {
    saveState(state);
  }

  return { suspected, confidence, reasons };
};

/**
 * Recomienda acciones preventivas basadas en el estado actual.
 */
export const getPreventionRecommendations = (): string[] => [
  'Rotar hashtags: nunca repetir el mismo set en posts consecutivos',
  'Diversificar CTAs: no siempre "link en bio"',
  'Balance 60/40: 60% contenido propio, 40% interacción orgánica genuina',
  'Pausas naturales: no publicar ni interactuar en horarios robóticos',
  'Evitar engagement pods y likes reciprocidad masiva',
  'No borrar posts recientes (señal negativa para el algoritmo)',
  'Si se detecta caída >30%, reducir frecuencia a 3 posts/semana por 1-2 semanas',
];

export const resetShadowbanState = (): void => {
  saveState({ lastCheck: new Date().toISOString(), postHistory: [], alertsSent: 0 });
  log.info('[SHADOWBAN] Estado reseteado');
};
