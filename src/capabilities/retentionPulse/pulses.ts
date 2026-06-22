/**
 * Retention Pulse Engine
 * ─────────────────────────────────────────────────────────────────────────
 * Proactive re-engagement scheduler. Inspects the brand's audience signals
 * (cold leads, dormant followers, engaged-but-quiet, recent buyers) and
 * generates a queue of "pulses" — small concrete actions the operator (or
 * the autonomous orchestrator) can fire to bring audience members back:
 *
 *   • personalized DM to a cold lead
 *   • "remember me" story aimed at dormant followers
 *   • callback content piece referencing an old viral post
 *   • re-engagement nurture step
 *
 * Determinism: the segmentation + scheduling logic is non-LLM. The LLM
 * only writes copy for individual pulses if asked.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { BrandProfile } from '../../config/types.js';

export type PulseType =
  | 'cold-lead-dm'
  | 'dormant-story'
  | 'callback-content'
  | 'nurture-reactivation'
  | 'buyer-thanks'
  | 'birthday-callout';

export type PulsePriority = 'alta' | 'media' | 'baja';

export interface PulseTarget {
  /** Anonymous segment id, or specific user handle. */
  segmentId: string;
  /** Approx number of accounts in this segment. */
  segmentSize: number;
  /** Days since last meaningful interaction. */
  daysQuiet: number;
}

export interface RetentionPulse {
  id: string;
  type: PulseType;
  priority: PulsePriority;
  target: PulseTarget;
  /** Human-readable title for the dashboard. */
  title: string;
  /** Concrete action description. */
  actionRequired: string;
  /** Optional copy draft for the action. */
  draftCopy?: string;
  /** Best slot to fire this pulse (ISO). */
  scheduledFor?: string;
  status: 'propuesto' | 'aprobado' | 'enviado' | 'descartado';
  createdAt: string;
  rationale: string;
}

interface PulseStoreShape {
  pulses: RetentionPulse[];
}

const PATH = resolve('data/runtime/retentionPulses.json');

const readStore = (): PulseStoreShape => {
  if (!existsSync(PATH)) return { pulses: [] };
  try {
    return JSON.parse(readFileSync(PATH, 'utf-8')) as PulseStoreShape;
  } catch {
    return { pulses: [] };
  }
};

const writeStore = (s: PulseStoreShape): void => {
  mkdirSync(dirname(PATH), { recursive: true });
  writeFileSync(PATH, JSON.stringify(s, null, 2), 'utf-8');
};

const newId = (prefix: string): string =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

/* ──────────────────────────────────────────────────────────────────────── */

export interface AudienceSignals {
  /** Followers who haven't engaged in N+ days. */
  dormantFollowers: number;
  /** Cold leads from previous campaigns that never converted. */
  coldLeads: number;
  /** Recent buyers (last 30 days). */
  recentBuyers: number;
  /** Engaged users (commented/saved recently) but haven't bought. */
  warmNonBuyers: number;
  /** Last viral post available for callback content. */
  lastViral?: { hookFirstLine: string; daysAgo: number; saves: number };
}

/**
 * Synthesize a default signal set from what the system can observe locally
 * when no integration data is present. Conservative defaults that won't
 * trigger excessive pulses.
 */
export const defaultSignals = (): AudienceSignals => ({
  dormantFollowers: 0,
  coldLeads: 0,
  recentBuyers: 0,
  warmNonBuyers: 0,
});

/**
 * Plan a fresh batch of retention pulses based on the current signals.
 * Returns the newly created pulses (also persisted).
 */
export const planRetentionPulses = (brand: BrandProfile, signals: AudienceSignals): RetentionPulse[] => {
  const now = new Date();
  const created: RetentionPulse[] = [];

  // ── Cold lead DMs: 1 high-priority pulse if there are 5+ ────────────
  if (signals.coldLeads >= 5) {
    created.push({
      id: newId('pulse'),
      type: 'cold-lead-dm',
      priority: signals.coldLeads >= 20 ? 'alta' : 'media',
      target: {
        segmentId: 'cold-leads',
        segmentSize: signals.coldLeads,
        daysQuiet: 60,
      },
      title: `Reactivar ${signals.coldLeads} leads fríos con DM personalizado`,
      actionRequired:
        'Generar copy de DM personalizado con la oferta más nueva. Lotear de 5 a 10 por día para evitar marca de spam.',
      draftCopy: `Hola! Vi que mostraste interés hace un tiempo en lo que hacemos en ${brand.name}. Cambiamos varias cosas desde entonces — ¿te interesa que te cuente qué es lo más nuevo para ${brand.niche}? Sin compromiso.`,
      scheduledFor: now.toISOString(),
      status: 'propuesto',
      createdAt: now.toISOString(),
      rationale:
        'Volumen significativo de leads sin contacto reciente — baja muy probable de re-engagement con 1 DM bien escrito.',
    });
  }

  // ── Dormant follower story: if >100 dormant, schedule a re-hook story
  if (signals.dormantFollowers >= 100) {
    created.push({
      id: newId('pulse'),
      type: 'dormant-story',
      priority: 'media',
      target: {
        segmentId: 'dormant-followers',
        segmentSize: signals.dormantFollowers,
        daysQuiet: 30,
      },
      title: `Story de re-enganche para ${signals.dormantFollowers} seguidores dormidos`,
      actionRequired:
        'Subir story con un slider/poll que dispare interacción rápida + frase abierta que cuestione al lector.',
      draftCopy: '¿Te acordás cuándo fue la última vez que aprendiste algo de mí? Movele al slider 👉 (te leo todo)',
      scheduledFor: new Date(now.getTime() + 4 * 3600_000).toISOString(),
      status: 'propuesto',
      createdAt: now.toISOString(),
      rationale: 'Las stories con interacción reactivan el ranking del algoritmo para ese segmento dormido en 24-48h.',
    });
  }

  // ── Callback content if there's a recent-ish viral that still matters
  if (signals.lastViral && signals.lastViral.daysAgo > 21 && signals.lastViral.daysAgo < 90) {
    created.push({
      id: newId('pulse'),
      type: 'callback-content',
      priority: 'alta',
      target: {
        segmentId: 'returning-audience',
        segmentSize: 0,
        daysQuiet: signals.lastViral.daysAgo,
      },
      title: `Callback al post viral de hace ${signals.lastViral.daysAgo} días`,
      actionRequired: `Producir un nuevo carrusel/reel que cite explícitamente el viral previo ("hace unos meses te dije que..." → "ahora te muestro qué pasó"). Reactivación de la audiencia que lo guardó.`,
      draftCopy: `[hook] Hace ${signals.lastViral.daysAgo} días te dije "${signals.lastViral.hookFirstLine.slice(0, 70)}". Hoy te muestro qué cambió.`,
      scheduledFor: new Date(now.getTime() + 24 * 3600_000).toISOString(),
      status: 'propuesto',
      createdAt: now.toISOString(),
      rationale: `Viral previo tuvo ${signals.lastViral.saves} guardados — esa audiencia es alta probabilidad de re-enganche.`,
    });
  }

  // ── Buyer thanks: high-NPS gesture for the last 30d buyers ──────────
  if (signals.recentBuyers >= 3) {
    created.push({
      id: newId('pulse'),
      type: 'buyer-thanks',
      priority: 'media',
      target: {
        segmentId: 'recent-buyers',
        segmentSize: signals.recentBuyers,
        daysQuiet: 0,
      },
      title: `Mensaje de gracias + recurso bonus a ${signals.recentBuyers} compradores recientes`,
      actionRequired:
        'Mandar un DM corto + un recurso valioso no comprometido (ebook, plantilla, checklist) en agradecimiento.',
      draftCopy: `Gracias por confiar! Como bonus interno, dejá te paso ${brand.goals.primary === 'autoridad' ? 'una mini-guía' : 'una plantilla'} que armé para clientes nuevos.`,
      scheduledFor: new Date(now.getTime() + 12 * 3600_000).toISOString(),
      status: 'propuesto',
      createdAt: now.toISOString(),
      rationale: 'Buyers recientes tienen el mayor LTV potencial; un gesto de valor no comercial sube NPS y referidos.',
    });
  }

  // ── Nurture reactivation: warm non-buyers ───────────────────────────
  if (signals.warmNonBuyers >= 10) {
    created.push({
      id: newId('pulse'),
      type: 'nurture-reactivation',
      priority: 'media',
      target: {
        segmentId: 'warm-non-buyers',
        segmentSize: signals.warmNonBuyers,
        daysQuiet: 14,
      },
      title: `Enrolar a ${signals.warmNonBuyers} fans engagiados en secuencia de conversión`,
      actionRequired:
        'Identificar a quienes comentaron/guardaron en los últimos 14d sin pasar al funnel. Enrolarlos en la secuencia "warm → consult".',
      scheduledFor: now.toISOString(),
      status: 'propuesto',
      createdAt: now.toISOString(),
      rationale: 'Audiencia con señal de calor sin oferta clara — pierde momentum sin acción.',
    });
  }

  if (created.length > 0) {
    const store = readStore();
    store.pulses.push(...created);
    // Keep last 200 pulses on disk.
    if (store.pulses.length > 200) {
      store.pulses.splice(0, store.pulses.length - 200);
    }
    writeStore(store);
  }

  return created;
};

export const listPulses = (filter?: {
  status?: RetentionPulse['status'];
  type?: PulseType;
  priority?: PulsePriority;
}): RetentionPulse[] => {
  const all = readStore().pulses;
  return all.filter(
    (p) =>
      (!filter?.status || p.status === filter.status) &&
      (!filter?.type || p.type === filter.type) &&
      (!filter?.priority || p.priority === filter.priority),
  );
};

export const updatePulseStatus = (id: string, status: RetentionPulse['status']): RetentionPulse | null => {
  const s = readStore();
  const p = s.pulses.find((x) => x.id === id);
  if (!p) return null;
  p.status = status;
  writeStore(s);
  return p;
};

export const getPulseStats = (): {
  total: number;
  byStatus: Record<RetentionPulse['status'], number>;
  byType: Record<PulseType, number>;
  highPriorityPending: number;
} => {
  const all = readStore().pulses;
  const byStatus = { propuesto: 0, aprobado: 0, enviado: 0, descartado: 0 } as Record<RetentionPulse['status'], number>;
  const byType = {
    'cold-lead-dm': 0,
    'dormant-story': 0,
    'callback-content': 0,
    'nurture-reactivation': 0,
    'buyer-thanks': 0,
    'birthday-callout': 0,
  } as Record<PulseType, number>;
  let highPriorityPending = 0;
  for (const p of all) {
    byStatus[p.status] += 1;
    byType[p.type] += 1;
    if (p.priority === 'alta' && p.status === 'propuesto') highPriorityPending += 1;
  }
  return { total: all.length, byStatus, byType, highPriorityPending };
};
