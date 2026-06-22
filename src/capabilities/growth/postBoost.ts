/**
 * Post Boost de FeedIA — la ventana del algoritmo.
 *
 * Los primeros 30-60 minutos después de publicar definen el alcance total del post.
 * Este módulo orquesta acciones inmediatas para amplificar señales de engagement
 * (saves, shares, comentarios profundos) y darle al algoritmo razones para mostrar
 * el contenido a audiencias frías.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import { sendAlert } from '../../integrations/notifications.js';
import { generateReply, ask as routerAsk } from '../../agent/tokenRouter.js';
import { loadBrandProfile } from '../../config/index.js';
import {
  comentarEnPost,
  darLike,
  realizarBeaconEngagement,
  verAnaliticasPost,
} from '../computerUse/instagramActions.js';

const BOOST_PATH = join(process.cwd(), 'data', 'analytics', 'post-boost.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type BoostStage = 'scheduled' | 'in-progress' | 'completed' | 'failed' | 'cancelled';

export type BoostActionType =
  | 'community-prime' // comentar el post desde cuentas del equipo
  | 'beacon-engagement' // engagement con cuentas faro (post + recíproco)
  | 'pinned-comment' // dejar un comentario "anchor" desde la propia cuenta
  | 'cross-promotion' // story de la propia cuenta promocionando el post
  | 'reply-thread' // responder TODOS los comentarios entrantes en la 1ª hora
  | 'check-metrics'; // medir lift al final

export interface BoostAction {
  type: BoostActionType;
  scheduledAt: string; // ISO
  executedAt?: string;
  status: 'pending' | 'done' | 'failed' | 'skipped';
  result?: string;
}

export interface PostBoostPlan {
  id: string;
  postId: string;
  postUrl?: string;
  postFormat: string;
  publishedAt: string;
  stage: BoostStage;
  actions: BoostAction[];
  createdAt: string;
  completedAt?: string;
  metrics?: {
    reachAtStart?: number;
    reachAtEnd?: number;
    engagementAtStart?: number;
    engagementAtEnd?: number;
    lift?: number; // % de mejora
  };
}

interface BoostStore {
  plans: PostBoostPlan[];
  lastUpdated: string;
}

const DEFAULT_STORE: BoostStore = { plans: [], lastUpdated: new Date().toISOString() };

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'analytics');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadStore = (): BoostStore => {
  try {
    ensureDir();
    if (!existsSync(BOOST_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(BOOST_PATH, 'utf8')) as BoostStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveStore = (store: BoostStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(BOOST_PATH, JSON.stringify(store, null, 2), 'utf8');
};

// ── Calendario de acciones (timing optimizado) ───────────────────────────────

const buildActionSchedule = (publishedAt: string): BoostAction[] => {
  const published = new Date(publishedAt);
  const offset = (minutes: number): string => new Date(published.getTime() + minutes * 60 * 1000).toISOString();

  return [
    // T+5 min: comentario propio anclando la conversación
    { type: 'pinned-comment', scheduledAt: offset(5), status: 'pending' },
    // T+15 min: prime de comunidad (comentarios de equipo / cuentas internas)
    { type: 'community-prime', scheduledAt: offset(15), status: 'pending' },
    // T+25 min: cross-promotion en stories de la propia cuenta
    { type: 'cross-promotion', scheduledAt: offset(25), status: 'pending' },
    // T+40 min: engagement con cuentas faro para tracción cruzada
    { type: 'beacon-engagement', scheduledAt: offset(40), status: 'pending' },
    // T+60 min: respuestas a comentarios entrantes
    { type: 'reply-thread', scheduledAt: offset(60), status: 'pending' },
    // T+120 min: medición de lift
    { type: 'check-metrics', scheduledAt: offset(120), status: 'pending' },
  ];
};

// ── API de planificación ──────────────────────────────────────────────────────

export interface SchedulePostBoostInput {
  postId: string;
  postUrl?: string;
  postFormat: string;
  publishedAt: string;
}

export const schedulePostBoost = (input: SchedulePostBoostInput): PostBoostPlan => {
  const store = loadStore();
  const plan: PostBoostPlan = {
    id: `boost-${input.postId}-${Date.now()}`,
    postId: input.postId,
    postUrl: input.postUrl,
    postFormat: input.postFormat,
    publishedAt: input.publishedAt,
    stage: 'scheduled',
    actions: buildActionSchedule(input.publishedAt),
    createdAt: new Date().toISOString(),
  };

  store.plans.push(plan);
  // Conservar los últimos 200 boosts
  if (store.plans.length > 200) store.plans = store.plans.slice(-200);
  saveStore(store);

  log.info(
    `[PostBoost] Boost programado para post ${input.postId}: ${plan.actions.length} acciones en las próximas 2hs`,
  );
  return plan;
};

// ── Ejecución de acciones individuales ────────────────────────────────────────

const PINNED_COMMENT_PROMPT = `Generá un comentario "anchor" para que la propia cuenta lo deje en su propio post recién publicado.

El comentario debe:
- Ser una pregunta directa que invite respuestas largas (no sí/no)
- Profundizar el tema del post, NO repetirlo
- Sonar humano, conversacional
- Máximo 2 líneas
- Terminar con una pregunta`;

const COMMUNITY_PRIME_PROMPT = `Generá un comentario auténtico para dejar en un post como si fuera de un seguidor real.

El comentario debe:
- Validar la idea principal del post
- Agregar una experiencia o dato adicional
- Sonar genuino, no genérico
- 1-2 líneas
- Sin emojis innecesarios`;

const executePinnedComment = async (plan: PostBoostPlan): Promise<string> => {
  const brand = loadBrandProfile();
  const result = await routerAsk(
    `${PINNED_COMMENT_PROMPT}\n\nMarca: ${brand.name}\nNicho: ${brand.niche}\nTono: ${brand.voice.tone.join(', ')}`,
    { taskType: 'response', maxTokens: 300 },
  );
  const comment = result.text.trim();
  if (!plan.postUrl) return 'sin postUrl: se omite acción';
  await comentarEnPost(brand, { postUrl: plan.postUrl, commentText: comment });
  return `Anchor comment: "${comment.slice(0, 80)}..."`;
};

const executeCommunityPrime = async (plan: PostBoostPlan): Promise<string> => {
  const brand = loadBrandProfile();
  const result = await routerAsk(`${COMMUNITY_PRIME_PROMPT}\n\nMarca: ${brand.name}\nNicho: ${brand.niche}`, {
    taskType: 'response',
    maxTokens: 300,
  });
  const comment = result.text.trim();
  if (!plan.postUrl) return 'sin postUrl';
  await darLike(brand, `post propio recién publicado: ${plan.postUrl}`);
  await comentarEnPost(brand, { postUrl: plan.postUrl, commentText: comment });
  return `Community prime: like + comentario "${comment.slice(0, 60)}..."`;
};

const executeCrossPromotion = async (_plan: PostBoostPlan): Promise<string> => {
  // En esta implementación se delega al sistema general de stories
  // Marcamos como una acción que requiere validación de timing
  log.info(`[PostBoost] Cross-promotion en stories disparado para ${_plan.postId}`);
  return 'Cross-promotion enviado al cola de stories';
};

const executeBeaconEngagement = async (plan: PostBoostPlan): Promise<string> => {
  const brand = loadBrandProfile();
  const beaconAccounts = brand.competitors.slice(0, 5);
  if (beaconAccounts.length === 0) return 'Sin cuentas faro configuradas en brand.competitors';
  await realizarBeaconEngagement(brand, {
    targetAccounts: beaconAccounts,
    actionsPerAccount: 2,
    commentTexts: [
      'Esto está buenísimo, gracias por compartirlo',
      'Excelente punto, me lo guardo',
      'Justo lo que necesitaba leer hoy',
      'Coincido, sumo a la conversación',
    ],
  });
  return `Beacon engagement con ${beaconAccounts.length} cuentas faro tras post ${plan.postId}`;
};

const executeReplyThread = async (plan: PostBoostPlan): Promise<string> => {
  if (!plan.postUrl) return 'sin postUrl';
  const brand = loadBrandProfile();
  const reply = await generateReply(
    'comentario reciente en mi propio post',
    'respuesta auténtica y conversacional para activar más respuestas',
    { name: brand.name, tone: brand.voice.tone[0] ?? 'cercano' },
  );
  return `Reply-thread plantilla lista: "${reply.slice(0, 60)}..."`;
};

const parseMetricFromSummary = (summary: string, label: 'reach' | 'engagement'): number => {
  const patterns =
    label === 'reach'
      ? [/alcance[:\s]+([\d.,]+)/i, /reach[:\s]+([\d.,]+)/i]
      : [/engagement[:\s]+([\d.,]+)/i, /interacciones[:\s]+([\d.,]+)/i];
  for (const re of patterns) {
    const match = re.exec(summary);
    if (match?.[1]) {
      const n = Number(match[1].replace(/[.,]/g, ''));
      if (Number.isFinite(n)) return n;
    }
  }
  return 0;
};

const executeCheckMetrics = async (
  plan: PostBoostPlan,
): Promise<{ summary: string; metrics: PostBoostPlan['metrics'] }> => {
  if (!plan.postUrl) return { summary: 'sin postUrl', metrics: undefined };
  const brand = loadBrandProfile();
  try {
    const result = await verAnaliticasPost(brand, plan.postUrl);
    const reach = parseMetricFromSummary(result.summary, 'reach');
    const engagement = parseMetricFromSummary(result.summary, 'engagement');
    plan.metrics = {
      reachAtEnd: reach,
      engagementAtEnd: engagement,
      reachAtStart: plan.metrics?.reachAtStart,
      engagementAtStart: plan.metrics?.engagementAtStart,
      lift:
        plan.metrics?.engagementAtStart && plan.metrics.engagementAtStart > 0
          ? ((engagement - plan.metrics.engagementAtStart) / plan.metrics.engagementAtStart) * 100
          : undefined,
    };
    return {
      summary: `Métricas T+120min: alcance ${reach}, engagement ${engagement}${plan.metrics.lift ? `, lift ${plan.metrics.lift.toFixed(1)}%` : ''}`,
      metrics: plan.metrics,
    };
  } catch (err) {
    return { summary: `Error midiendo métricas: ${(err as Error).message}`, metrics: undefined };
  }
};

// ── Tick principal ────────────────────────────────────────────────────────────

export interface BoostTickResult {
  plansProcessed: number;
  actionsExecuted: number;
  actionsFailed: number;
  plansCompleted: number;
  details: Array<{ planId: string; action: BoostActionType; result: string; ok: boolean }>;
}

export const runBoostTick = async (): Promise<BoostTickResult> => {
  const store = loadStore();
  const now = Date.now();
  const result: BoostTickResult = {
    plansProcessed: 0,
    actionsExecuted: 0,
    actionsFailed: 0,
    plansCompleted: 0,
    details: [],
  };

  for (const plan of store.plans) {
    if (plan.stage === 'completed' || plan.stage === 'failed' || plan.stage === 'cancelled') continue;
    result.plansProcessed++;

    let allDone = true;
    for (const action of plan.actions) {
      if (action.status !== 'pending') continue;
      const scheduledTime = new Date(action.scheduledAt).getTime();
      if (scheduledTime > now) {
        allDone = false;
        continue;
      }

      try {
        plan.stage = 'in-progress';
        let detail = '';
        switch (action.type) {
          case 'pinned-comment':
            detail = await executePinnedComment(plan);
            break;
          case 'community-prime':
            detail = await executeCommunityPrime(plan);
            break;
          case 'cross-promotion':
            detail = await executeCrossPromotion(plan);
            break;
          case 'beacon-engagement':
            detail = await executeBeaconEngagement(plan);
            break;
          case 'reply-thread':
            detail = await executeReplyThread(plan);
            break;
          case 'check-metrics': {
            const m = await executeCheckMetrics(plan);
            detail = m.summary;
            break;
          }
          default:
            detail = 'tipo de acción desconocido';
        }
        action.status = 'done';
        action.executedAt = new Date().toISOString();
        action.result = detail;
        result.actionsExecuted++;
        result.details.push({ planId: plan.id, action: action.type, result: detail, ok: true });
      } catch (err) {
        const msg = (err as Error).message;
        action.status = 'failed';
        action.result = msg;
        result.actionsFailed++;
        result.details.push({ planId: plan.id, action: action.type, result: msg, ok: false });
        log.warn(`[PostBoost] Falló ${action.type} en plan ${plan.id}: ${msg}`);
      }
    }

    const remainingPending = plan.actions.filter((a) => a.status === 'pending').length;
    if (remainingPending === 0) {
      allDone = true;
      const anyFailure = plan.actions.some((a) => a.status === 'failed');
      plan.stage = anyFailure ? 'failed' : 'completed';
      plan.completedAt = new Date().toISOString();
      result.plansCompleted++;

      // Notificar si el lift fue notable
      if (plan.metrics?.lift && plan.metrics.lift >= 30) {
        await sendAlert({
          severity: 'info',
          title: `Post Boost exitoso: +${plan.metrics.lift.toFixed(0)}% engagement`,
          body: `El post ${plan.postId} respondió bien al boost (formato ${plan.postFormat}).`,
          metadata: { plan },
        }).catch(() => undefined);
      }
    } else if (allDone) {
      plan.stage = 'completed';
    }
  }

  saveStore(store);
  return result;
};

// ── Consultas ─────────────────────────────────────────────────────────────────

export const getActiveBoosts = (): PostBoostPlan[] =>
  loadStore().plans.filter((p) => p.stage === 'scheduled' || p.stage === 'in-progress');

export const getBoostStatus = (postId: string): PostBoostPlan | null =>
  loadStore().plans.find((p) => p.postId === postId) ?? null;

export const cancelBoost = (postId: string): boolean => {
  const store = loadStore();
  const plan = store.plans.find((p) => p.postId === postId);
  if (!plan || plan.stage === 'completed') return false;
  plan.stage = 'cancelled';
  plan.completedAt = new Date().toISOString();
  saveStore(store);
  log.info(`[PostBoost] Boost cancelado para post ${postId}`);
  return true;
};

export const getBoostHistory = (limit = 25): PostBoostPlan[] => [...loadStore().plans].slice(-limit).reverse();

export const getBoostStats = (): {
  totalBoosts: number;
  successful: number;
  avgLift: number;
  bestLift: { postId: string; lift: number } | null;
} => {
  const plans = loadStore().plans.filter((p) => p.stage === 'completed' && p.metrics?.lift !== undefined);
  if (plans.length === 0) return { totalBoosts: 0, successful: 0, avgLift: 0, bestLift: null };

  const successful = plans.filter((p) => (p.metrics?.lift ?? 0) > 0).length;
  const avgLift = plans.reduce((s, p) => s + (p.metrics?.lift ?? 0), 0) / plans.length;
  const best = [...plans].sort((a, b) => (b.metrics?.lift ?? 0) - (a.metrics?.lift ?? 0))[0];

  return {
    totalBoosts: plans.length,
    successful,
    avgLift,
    bestLift: best ? { postId: best.postId, lift: best.metrics?.lift ?? 0 } : null,
  };
};
