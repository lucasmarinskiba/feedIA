/**
 * Reactor de eventos en tiempo real para FeedIA.
 * Procesa eventos de Instagram (comentarios, DMs, menciones, virales) y dispara
 * respuestas inteligentes de forma autónoma según reglas configurables por marca.
 */

import { generateReply, ask as routerAsk } from '../agent/tokenRouter.js';
import { loadBrandProfile, env } from '../config/index.js';
import { log } from '../agent/logger.js';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type EventType =
  | 'new_comment'
  | 'new_dm'
  | 'new_follower'
  | 'mention'
  | 'post_going_viral'
  | 'negative_comment'
  | 'lead_detected'
  | 'competitor_activity'
  | 'low_engagement_alert'
  | 'hashtag_trending';

export type EventPriority = 'critical' | 'high' | 'normal' | 'low';

export interface InstagramEvent {
  id: string;
  type: EventType;
  timestamp: string;
  priority: EventPriority;
  data: Record<string, unknown>;
  processed: boolean;
  autoResponse?: string;
  requiresHumanReview: boolean;
}

export interface ReactorStats {
  totalProcessed: number;
  totalResponded: number;
  criticalHandled: number;
  leadsDetected: number;
  avgProcessingMs: number;
}

export interface ReactorConfig {
  autoRespondComments: boolean;
  autoRespondDMs: boolean;
  alertOnViral: boolean;
  alertOnNegative: boolean;
  negativeKeywords: string[];
  leadKeywords: string[];
  escalateToHumanKeywords: string[];
  quietHoursStart: number; // 0-23
  quietHoursEnd: number;
}

// ── Estado global en memoria ──────────────────────────────────────────────────

const queue: InstagramEvent[] = [];
const stats: ReactorStats = {
  totalProcessed: 0,
  totalResponded: 0,
  criticalHandled: 0,
  leadsDetected: 0,
  avgProcessingMs: 0,
};

const DEFAULT_CONFIG: ReactorConfig = {
  autoRespondComments: env.bot.autoReplyEnabled,
  autoRespondDMs: false,
  alertOnViral: true,
  alertOnNegative: true,
  negativeKeywords: ['estafa', 'robo', 'mentira', 'falso', 'pésimo', 'horrible', 'scam', 'fake', 'cuidado', 'denuncia'],
  leadKeywords: [
    'precio',
    'cuánto',
    'costo',
    'comprar',
    'quiero',
    'info',
    'información',
    'disponible',
    'interesa',
    'dónde consigo',
  ],
  escalateToHumanKeywords: [
    'reembolso',
    'devolución',
    'problema con mi pedido',
    'no me llegó',
    'urgente',
    'legal',
    'amenaza',
  ],
  quietHoursStart: env.bot.quietHoursStart,
  quietHoursEnd: env.bot.quietHoursEnd,
};

let config: ReactorConfig = { ...DEFAULT_CONFIG };

// ── Configuración ─────────────────────────────────────────────────────────────

export const configureReactor = (overrides: Partial<ReactorConfig>): void => {
  config = { ...config, ...overrides };
  log.info('[EventReactor] Configuración actualizada');
};

// ── Detección de prioridad ────────────────────────────────────────────────────

const detectPriority = (type: EventType, data: Record<string, unknown>): EventPriority => {
  const text = String(data['text'] ?? data['caption'] ?? '').toLowerCase();

  if (type === 'negative_comment') return 'critical';
  if (type === 'post_going_viral') return 'high';
  if (type === 'lead_detected') return 'high';

  if (config.negativeKeywords.some((k) => text.includes(k))) return 'critical';
  if (config.escalateToHumanKeywords.some((k) => text.includes(k))) return 'critical';
  if (config.leadKeywords.some((k) => text.includes(k))) return 'high';
  if (type === 'new_dm') return 'high';
  if (type === 'mention') return 'normal';
  if (type === 'new_comment') return 'normal';

  return 'low';
};

const requiresHuman = (priority: EventPriority, data: Record<string, unknown>): boolean => {
  const text = String(data['text'] ?? '').toLowerCase();
  return priority === 'critical' || config.escalateToHumanKeywords.some((k) => text.includes(k));
};

const isQuietHours = (): boolean => {
  const hour = new Date().getHours();
  if (config.quietHoursStart < config.quietHoursEnd) {
    return hour >= config.quietHoursStart && hour < config.quietHoursEnd;
  }
  // wrap-around (ej: 23-8)
  return hour >= config.quietHoursStart || hour < config.quietHoursEnd;
};

// ── Enqueue ───────────────────────────────────────────────────────────────────

export const enqueueEvent = (raw: Omit<InstagramEvent, 'priority' | 'processed' | 'requiresHumanReview'>): void => {
  const priority = detectPriority(raw.type, raw.data);
  const requiresHumanReview = requiresHuman(priority, raw.data);

  const event: InstagramEvent = { ...raw, priority, processed: false, requiresHumanReview };
  queue.push(event);

  // Cola ordenada: critical → high → normal → low
  queue.sort((a, b) => {
    const order: Record<EventPriority, number> = { critical: 0, high: 1, normal: 2, low: 3 };
    return order[a.priority] - order[b.priority];
  });

  log.debug(`[EventReactor] Evento encolado: ${event.type} (${event.priority}) | queue=${queue.length}`);

  if (priority === 'critical') {
    log.warn(`[EventReactor] ⚠️ EVENTO CRÍTICO: ${event.type} — datos: ${JSON.stringify(event.data).slice(0, 200)}`);
  }
};

// ── Handlers por tipo ─────────────────────────────────────────────────────────

const handleComment = async (event: InstagramEvent): Promise<string | null> => {
  if (!config.autoRespondComments || isQuietHours()) return null;

  const brand = loadBrandProfile();
  const text = String(event.data['text'] ?? '');
  const tone = brand.voice.tone[0] ?? 'profesional';
  const isNeg = config.negativeKeywords.some((k) => text.toLowerCase().includes(k));
  const isLead = config.leadKeywords.some((k) => text.toLowerCase().includes(k));

  if (isNeg) {
    return generateReply(
      text,
      'comentario negativo — respondé con empatía y profesionalismo, sin ponerse a la defensiva',
      {
        name: brand.name,
        tone: 'empático y calmado',
      },
    );
  }

  if (isLead) {
    return generateReply(text, 'comentario con intención de compra — invitá a continuar por DM', {
      name: brand.name,
      tone,
    });
  }

  if (text.includes('?')) {
    return generateReply(text, 'pregunta en comentario — respondé de forma útil y breve', { name: brand.name, tone });
  }

  // Comentario positivo corto (emoji o elogio)
  if (text.length < 50) {
    return generateReply(text, 'comentario positivo corto — agradecé de forma auténtica', { name: brand.name, tone });
  }

  return null; // Sin respuesta automática para comentarios largos neutros
};

const handleDM = async (event: InstagramEvent): Promise<string | null> => {
  if (!config.autoRespondDMs || isQuietHours()) return null;
  if (event.requiresHumanReview) return null;

  const brand = loadBrandProfile();
  const text = String(event.data['text'] ?? '');
  const isLead = config.leadKeywords.some((k) => text.toLowerCase().includes(k));

  if (!isLead) return null;

  return generateReply(
    text,
    'DM con interés de compra — respondé amablemente y pedí más información para personalizar la propuesta',
    {
      name: brand.name,
      tone: 'cálido y comercial',
    },
  );
};

const handleViral = async (event: InstagramEvent): Promise<string | null> => {
  const postId = String(event.data['postId'] ?? 'desconocido');
  const reach = Number(event.data['currentReach'] ?? 0);
  const multiple = Number(event.data['reachMultiple'] ?? 2);

  log.info(`[EventReactor] 🚀 POST VIRAL: ${postId} — alcance ${reach.toLocaleString()} (${multiple}x promedio)`);

  // Sugerir acción de amplificación
  const brand = loadBrandProfile();
  const advice = await routerAsk(
    `Un post de @${brand.name} está viralizando: ${multiple}x el alcance promedio. ¿Qué 3 acciones concretas hacer en las próximas 2 horas para amplificar este momento? Máximo 2 líneas por acción.`,
    { taskType: 'strategy', freeOnly: true },
  );
  log.info(`[EventReactor] Acciones sugeridas para viral:\n${advice.text}`);
  return null; // No auto-respond, solo loggear
};

const handleNewFollower = async (event: InstagramEvent): Promise<string | null> => {
  // Opcional: enviar DM de bienvenida si está habilitado
  if (!config.autoRespondDMs) return null;
  if (isQuietHours()) return null;

  const brand = loadBrandProfile();
  const username = String(event.data['username'] ?? 'nuevo seguidor');

  return generateReply(
    `Hola, acabo de seguirte`,
    `DM de bienvenida para nuevo seguidor @${username}. Sé auténtico, breve, y no vendas nada todavía.`,
    { name: brand.name, tone: brand.voice.tone[0] ?? 'amigable' },
  );
};

// ── Procesamiento del queue ───────────────────────────────────────────────────

export const processQueue = async (
  maxBatch = 15,
): Promise<{
  processed: number;
  responded: number;
  criticalHandled: number;
  pendingCritical: number;
}> => {
  const pending = queue.filter((e) => !e.processed).slice(0, maxBatch);
  let responded = 0;
  let criticalHandled = 0;
  const times: number[] = [];

  for (const event of pending) {
    const t0 = Date.now();
    try {
      let response: string | null = null;

      switch (event.type) {
        case 'new_comment':
        case 'negative_comment':
          response = await handleComment(event);
          break;
        case 'new_dm':
          response = await handleDM(event);
          break;
        case 'post_going_viral':
          response = await handleViral(event);
          break;
        case 'new_follower':
          response = await handleNewFollower(event);
          break;
        case 'lead_detected':
          log.info(`[EventReactor] 🎯 Lead detectado: ${JSON.stringify(event.data).slice(0, 150)}`);
          stats.leadsDetected++;
          break;
        default:
          break;
      }

      event.processed = true;
      event.autoResponse = response ?? undefined;
      if (response) responded++;
      if (event.priority === 'critical') criticalHandled++;
    } catch (err) {
      log.error(`[EventReactor] Error procesando ${event.type}: ${(err as Error).message}`);
    }
    times.push(Date.now() - t0);
  }

  // Actualizar stats globales
  stats.totalProcessed += pending.length;
  stats.totalResponded += responded;
  stats.criticalHandled += criticalHandled;
  if (times.length > 0) {
    stats.avgProcessingMs = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  }

  // Limpiar procesados con más de 2 horas de antigüedad
  const cutoff = Date.now() - 2 * 60 * 60 * 1000;
  let i = queue.length - 1;
  while (i >= 0) {
    const e = queue[i]!;
    if (e.processed && new Date(e.timestamp).getTime() < cutoff) queue.splice(i, 1);
    i--;
  }

  const pendingCritical = queue.filter((e) => !e.processed && e.priority === 'critical').length;
  return { processed: pending.length, responded, criticalHandled, pendingCritical };
};

// ── Consulta de estado ────────────────────────────────────────────────────────

export const getQueueStatus = (): {
  queueSize: number;
  pendingCount: number;
  criticalPending: number;
  byType: Partial<Record<EventType, number>>;
  stats: ReactorStats;
  isQuietHours: boolean;
} => {
  const pending = queue.filter((e) => !e.processed);
  const byType: Partial<Record<EventType, number>> = {};
  pending.forEach((e) => {
    byType[e.type] = (byType[e.type] ?? 0) + 1;
  });

  return {
    queueSize: queue.length,
    pendingCount: pending.length,
    criticalPending: pending.filter((e) => e.priority === 'critical').length,
    byType,
    stats: { ...stats },
    isQuietHours: isQuietHours(),
  };
};

export const getPendingCritical = (): InstagramEvent[] =>
  queue.filter((e) => !e.processed && e.priority === 'critical');

export const getResponsesGenerated = (): Array<{ eventId: string; type: EventType; response: string }> =>
  queue
    .filter((e) => e.processed && e.autoResponse)
    .map((e) => ({ eventId: e.id, type: e.type, response: e.autoResponse! }));
