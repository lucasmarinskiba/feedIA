import { log } from './logger.js';
import { runAgentTask } from './orchestrator.js';
import { getAgent } from './registry.js';
import { emit } from './bus.js';
import { enqueueEvent, dequeueEvents, markEventProcessed } from '../database/index.js';
import type { BrandProfile } from '../config/types.js';

export interface TriggerConfig {
  id: string;
  event: string;
  condition: (payload: Record<string, unknown>) => boolean;
  agentId: string;
  goal: string;
  cooldownMs: number;
}

const lastFired: Record<string, number> = {};

/** Map generic agent IDs to niche-specific ones based on brand profile */
const resolveAgentId = (genericId: string, brand: BrandProfile): string => {
  const nicheMap: Array<{ keywords: string[]; suffix: string }> = [
    { keywords: ['emprendedor', 'startup', 'solitario'], suffix: 'emprendedor' },
    { keywords: ['pyme', 'servicios', 'empresa de servicios'], suffix: 'pyme-servicios' },
    { keywords: ['fábrica', 'fabrica', 'industria', 'manufactura'], suffix: 'fabrica-industria' },
    { keywords: ['inversor', 'fondo', 'inversión', 'inversion'], suffix: 'inversor' },
    { keywords: ['coach', 'consultor', 'consulting'], suffix: 'coach-consultor' },
    { keywords: ['ecommerce', 'e-commerce', 'dropshipping', 'tienda online', 'shopify'], suffix: 'ecommerce' },
    { keywords: ['agencia', 'marketing', 'creativa', 'publicidad'], suffix: 'agencia' },
    { keywords: ['saas', 'software', 'tech'], suffix: 'startup-saas' },
    { keywords: ['restaurante', 'food', 'bebida', 'gastronomía'], suffix: 'restaurante' },
    { keywords: ['profesional', 'freelance', 'independiente'], suffix: 'profesional' },
  ];

  const nicheLower = brand.niche.toLowerCase();
  const match = nicheMap.find((m) => m.keywords.some((kw) => nicheLower.includes(kw)));
  if (!match) return genericId;

  if (genericId === 'community-manager') return `community-manager-${match.suffix}`;
  if (genericId === 'sales-closer') return `dm-sales-closer-${match.suffix}`;
  return genericId;
};

const TRIGGER_REGISTRY: TriggerConfig[] = [
  {
    id: 'auto-reply-inbound',
    event: 'inbound_message_received',
    condition: (p) => p['type'] === 'comentario' || p['type'] === 'mencion',
    agentId: 'community-manager',
    goal: 'Responder al comentario o mención recibida de forma estratégica y alineada con la marca',
    cooldownMs: 60000,
  },
  {
    id: 'auto-dm-triage',
    event: 'inbound_message_received',
    condition: (p) => p['type'] === 'dm',
    agentId: 'sales-closer',
    goal: 'Triage del DM recibido: calificar lead, responder o escalar según corresponda',
    cooldownMs: 120000,
  },
  {
    id: 'anomaly-detected',
    event: 'anomaly_detected',
    condition: () => true,
    agentId: 'analytics-inspector',
    goal: 'Investigar anomalía detectada en métricas, diagnosticar causa raíz y proponer acción correctiva',
    cooldownMs: 300000,
  },
  {
    id: 'new-trend-opportunity',
    event: 'trend_detected',
    condition: (p) => typeof p['growth'] === 'number' && p['growth'] > 30,
    agentId: 'market-intelligence',
    goal: 'Analizar tendencia detectada y proponer ángulo de contenido para capitalizarla antes de la competencia',
    cooldownMs: 3600000,
  },
  {
    id: 'ab-test-completed',
    event: 'ab_test_completed',
    condition: () => true,
    agentId: 'analytics-inspector',
    goal: 'Analizar resultado del A/B test completado, extraer insights y recomendar próximo experimento',
    cooldownMs: 60000,
  },
  {
    id: 'post-published',
    event: 'post_published',
    condition: () => true,
    agentId: 'community-manager',
    goal: 'Monitorear primeros comentarios del post recién publicado y responder estratégicamente',
    cooldownMs: 300000,
  },
  {
    id: 'competitor-viral-detected',
    event: 'competitor_viral_detected',
    condition: (p) => typeof p['competitorLikes'] === 'number' && p['competitorLikes'] > 1000,
    agentId: 'market-intelligence',
    goal: 'Analizar post viral del competidor, identificar qué funcionó, y proponer contrajugada diferenciada',
    cooldownMs: 1800000,
  },
  {
    id: 'weekly-report-trigger',
    event: 'scheduler_weekly',
    condition: () => true,
    agentId: 'email-campaign-manager',
    goal: 'Generar y enviar reporte semanal de métricas a stakeholders',
    cooldownMs: 86400000,
  },
];

export const handleEvent = async (
  event: string,
  payload: Record<string, unknown>,
  brand: BrandProfile,
): Promise<void> => {
  for (const trigger of TRIGGER_REGISTRY) {
    if (trigger.event !== event) continue;

    const now = Date.now();
    const last = lastFired[trigger.id] ?? 0;
    if (now - last < trigger.cooldownMs) {
      log.debug(`[Trigger] ${trigger.id} en cooldown (${Math.round((now - last) / 1000)}s)`);
      continue;
    }

    if (!trigger.condition(payload)) {
      continue;
    }

    const resolvedId = resolveAgentId(trigger.agentId, brand);
    const agent = getAgent(resolvedId);
    if (!agent) {
      log.warn(`[Trigger] Agente ${resolvedId} no encontrado para trigger ${trigger.id}`);
      continue;
    }

    lastFired[trigger.id] = now;
    log.info(`[Trigger] Disparando ${trigger.id} → ${agent.name}`);

    try {
      const result = await runAgentTask(brand, agent, trigger.goal, `trigger-${trigger.id}-${now}`);
      emit({
        type: 'AgentTaskComplete',
        sourceAgent: agent.id,
        priority: 'normal',
        correlationId: `trigger-${trigger.id}-${now}`,
        payload: { agentId: agent.id, taskId: trigger.id, status: 'success', summary: result.summary },
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.error(`[Trigger] Error en ${trigger.id}: ${msg}`);
      emit({
        type: 'AgentTaskComplete',
        sourceAgent: agent.id,
        priority: 'high',
        correlationId: `trigger-${trigger.id}-${now}`,
        payload: { agentId: agent.id, taskId: trigger.id, status: 'failed', summary: msg },
      });
    }
  }
};

/** Persist an event to the durable queue and optionally process immediately */
export const persistEvent = (event: string, payload: Record<string, unknown>, brandId?: string): number =>
  enqueueEvent(event, payload, brandId);

/** Process unprocessed events from the SQLite queue */
export const processEventQueue = async (brand: BrandProfile, limit = 50): Promise<number> => {
  const events = dequeueEvents(limit);
  let processed = 0;
  for (const ev of events) {
    try {
      const payload = JSON.parse(ev.payload) as Record<string, unknown>;
      await handleEvent(ev.event_type, payload, brand);
      markEventProcessed(ev.id, 'ok');
      processed++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      markEventProcessed(ev.id, undefined, msg);
      log.error(`[Trigger] Error procesando evento ${ev.id}: ${msg}`);
    }
  }
  return processed;
};

export const listTriggers = (): Array<{ id: string; event: string; agentId: string; cooldownMinutes: number }> =>
  TRIGGER_REGISTRY.map((t) => ({
    id: t.id,
    event: t.event,
    agentId: t.agentId,
    cooldownMinutes: Math.round(t.cooldownMs / 60000),
  }));
