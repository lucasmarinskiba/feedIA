/**
 * Bot Control — registro de bots y clasificación de jobs del scheduler.
 *
 * Un "bot" es una unidad que el usuario puede prender/apagar: agrupa procesos
 * autónomos que actúan o gastan LLM sin que nadie los pida. La clasificación de
 * jobs es explícita; lo que no esté clasificado cae en `brain-bot` (nunca en
 * "siempre encendido"), para que apagar todo apague de verdad todo el gasto
 * autónomo y un job nuevo no se escape del control sin que nadie lo note.
 *
 * `content-bot` e `intelligence-bot` (versiones anteriores de este registro)
 * eran cajones de sastre — 28 y 67 jobs respectivamente, sin ninguna forma de
 * apagar solo una parte. Separados en 6 bots más chicos y reconocibles para
 * que "Todos los bots" refleje de verdad qué está corriendo.
 *
 * `instagram-bot` existe por simetría con `tiktok-bot`: ambos son chicos a
 * propósito, gobiernan solo automatizaciones específicas de esa plataforma
 * (jobs `ig-*` / `tiktok-*`). El resto del producto es Instagram por
 * defecto y sigue repartido por función (Comentarios, DMs, Comunidad,
 * Diseño, Video, Estrategia, etc.) — un bot "Instagram" que englobara todo
 * eso sería casi todo el registro de nuevo.
 *
 * INFRA = jobs que NO se pueden apagar desde acá: publican lo que una persona
 * ya programó, miden salud o limpian. No gastan LLM o su apagado rompería algo
 * que el usuario espera (un post programado que no sale).
 */

import type { UserTier } from '../../db/user-tiers.js';

export type BotId =
  | 'comment-bot'
  | 'dm-bot'
  | 'community-bot'
  | 'instagram-bot'
  | 'tiktok-bot'
  | 'design-bot'
  | 'video-bot'
  | 'strategy-bot'
  | 'computer-use-bot'
  | 'growth-bot'
  | 'brain-bot'
  | 'quality-bot'
  | 'ads-bot';

export interface BotDefinition {
  id: BotId;
  label: string;
  description: string;
  /** Gasta LLM/APIs pagas al actuar. Sirve para que la UI lo destaque. */
  costly: boolean;
  /** Estado inicial cuando el usuario nunca lo tocó: preserva el comportamiento previo. */
  defaultEnabled: boolean;
  /** Vistas de la SPA donde la barra de herramientas muestra este bot. */
  views: string[];
  /** Plan mínimo que desbloquea este bot. La cuenta lo ve siempre; prenderlo por debajo de esto es lo que se bloquea. */
  minTier: UserTier;
}

/** Orden de los planes, de menor a mayor — para comparar "¿esta cuenta llega al mínimo del bot?". */
export const TIER_RANK: Readonly<Record<UserTier, number>> = { free: 0, starter: 1, pro: 2, agency: 3 };

export const BOTS: readonly BotDefinition[] = [
  {
    id: 'comment-bot',
    label: 'Comentarios',
    description: 'Lee y responde comentarios públicos (Comment Brain: tipo + sarcasmo + riesgo).',
    costly: true,
    defaultEnabled: true,
    views: ['inbox', 'community', 'community-manager', 'revision', 'crisis', 'home', 'feed'],
    minTier: 'starter',
  },
  {
    id: 'dm-bot',
    label: 'DMs e inbox',
    description: 'Triage, respuestas automáticas y seguimiento de mensajes directos y leads.',
    costly: true,
    defaultEnabled: true,
    views: ['inbox', 'community', 'community-manager', 'crisis'],
    minTier: 'starter',
  },
  {
    id: 'community-bot',
    label: 'Comunidad',
    description: 'Engagement diario, bienvenidas a fans, re-engagement y comentarios faro.',
    costly: true,
    defaultEnabled: true,
    views: ['community', 'community-manager', 'collab', 'ugc', 'inbox'],
    minTier: 'starter',
  },
  {
    id: 'instagram-bot',
    label: 'Instagram',
    description: 'Automatizaciones propias de Instagram: notificaciones, engagement diario y crecimiento semanal.',
    costly: true,
    defaultEnabled: true,
    views: ['inbox', 'community', 'community-manager', 'home', 'feed'],
    minTier: 'starter',
  },
  {
    id: 'tiktok-bot',
    label: 'TikTok',
    description: 'Detecta tendencias, optimiza FYP y produce contenido nativo de TikTok.',
    costly: true,
    defaultEnabled: true,
    views: ['studio-tiktok', 'studio-tiktok-script', 'studio-tiktok-photo', 'community-manager'],
    minTier: 'starter',
  },
  {
    id: 'design-bot',
    label: 'Diseño y Carruseles',
    description: 'Curaduría de assets, stories y render de carruseles/diseños del studio.',
    costly: true,
    defaultEnabled: true,
    views: ['studio-carousel', 'studio-stories', 'curator', 'brandkit', 'diseñador', 'forge'],
    minTier: 'pro',
  },
  {
    id: 'video-bot',
    label: 'Video y Reels',
    description: 'Edición y producción de video: Canva, CapCut, audio, efectos AR y reels.',
    costly: true,
    defaultEnabled: true,
    views: ['studio-reel', 'hooks'],
    minTier: 'pro',
  },
  {
    id: 'strategy-bot',
    label: 'Estrategia y Calendario',
    description: 'Planifica el calendario, rota hashtags, corre playbooks y el ciclo CMO/autopilot.',
    costly: true,
    defaultEnabled: true,
    views: ['calendar', 'scheduler', 'autopilot', 'mission'],
    minTier: 'pro',
  },
  {
    id: 'computer-use-bot',
    label: 'Computer Use',
    description: 'Maneja el navegador solo: rutinas de Instagram, stories, exploración y crecimiento.',
    costly: true,
    defaultEnabled: true,
    views: ['pantalla', 'replay', 'vision', 'visión', 'studio-manager', 'canva-runner', 'handsfree'],
    minTier: 'pro',
  },
  {
    id: 'growth-bot',
    label: 'Growth y Analytics',
    description: 'KPIs, reportes periódicos, tendencias, competidores y seguimiento de objetivos.',
    costly: true,
    defaultEnabled: true,
    views: ['predictor', 'optimize', 'inteligencia', 'brujula'],
    minTier: 'agency',
  },
  {
    id: 'brain-bot',
    label: 'Cerebro y Memoria',
    description: 'Orquestación central, memoria semántica/RAG, swarm de agentes y evolución del sistema.',
    costly: true,
    defaultEnabled: true,
    views: ['agents', 'skills', 'assistant', 'glassbox'],
    minTier: 'agency',
  },
  {
    id: 'quality-bot',
    label: 'Calidad y Compliance',
    description: 'Modera contenido, revisa caras/duplicados, consistencia de marca y cumplimiento de promesas.',
    costly: true,
    defaultEnabled: true,
    views: ['audit'],
    minTier: 'agency',
  },
  {
    id: 'ads-bot',
    label: 'Anuncios y ventas',
    description: 'Campañas, presupuesto, boosts, funnel y atribución de ingresos.',
    costly: true,
    defaultEnabled: true,
    views: ['analytics', 'experiments', 'reportes', 'imperio'],
    minTier: 'agency',
  },
];

/** ¿La cuenta con este plan puede prender este bot? */
export const tierUnlocksBot = (tier: UserTier, bot: BotDefinition): boolean =>
  TIER_RANK[tier] >= TIER_RANK[bot.minTier];

export const BOT_IDS: readonly BotId[] = BOTS.map((b) => b.id);

export const isBotId = (value: string): value is BotId => (BOT_IDS as readonly string[]).includes(value);

export const getBotDefinition = (id: BotId): BotDefinition => {
  const def = BOTS.find((b) => b.id === id);
  if (!def) throw new Error(`Bot desconocido: ${id}`);
  return def;
};

/** Jobs que nunca se apagan desde el panel de bots. */
export const INFRA_JOBS: ReadonlySet<string> = new Set([
  // Publican lo que una persona ya programó
  'calendar-dispatcher',
  'instagram-publish-queue',
  'cross-platform-publish-queue',
  // Salud, limpieza y plomería (sin LLM)
  'platform-health-check',
  'video-engine-health',
  'canva-template-health',
  'realtime-health-pulse',
  'event-bus-cleanup',
  'webhook-retry-failed',
  'realtime-analytics-flush',
  'push-digest-realtime',
  'live-stream-monitor',
  'vector-store-cleanup',
  'originality-fingerprint-prune',
  'trigger-event-bus',
  'agent-checkpoints-reminder',
  'ugc-expirar',
  // Gobierno del gasto: apagar los bots no puede apagar el guardián del costo
  'cost-guardian-daily-check',
  // Lecturas de métricas (APIs gratuitas) que alimentan dashboards
  'performance-sync',
  'growth-daily-snapshot',
  'goals-progress-sync',
  'ig-read-insights',
  'tiktok-analytics-sync',
  'smart-reply-daily',
]);

/** KPIs, reportes periódicos, tendencias, competidores, objetivos y auto-tuning de performance. */
const GROWTH_JOBS: readonly string[] = [
  'playbook-viral-scan',
  'discipline-audit',
  'predictor-weekly',
  'competitor-monitor',
  'weekly-kpi-audit',
  'auto-optimization',
  'performance-weekly-digest',
  'growth-milestone-check',
  'growth-daily-recommendations',
  'viral-scan-daily',
  'growth-dashboard-monday',
  'goals-health-monitor',
  'period-report-weekly',
  'period-report-monthly',
  'period-report-quarterly',
  'period-report-annual',
  'brand-audit-monthly',
  'bandit-sync',
  'competitor-weekly-intelligence',
  'profile-monthly-audit',
  'audience-monthly-segment',
  'anomaly-scan',
  'brain-competitor-track',
  'brain-revenue-sync',
  'anomaly-daily-scan',
  'trend-forecast-weekly',
  'engagement-model-train',
  'performance-weekly-review',
  'strategy-auto-tune',
];

/** Orquestación central, memoria (RAG/semántica), swarm de agentes y evolución del sistema. */
const BRAIN_JOBS: readonly string[] = [
  'digest-diario',
  'os-tick',
  'timing-model-rebuild',
  'ig-knowledge-study',
  'trigger-autonomous',
  'agent-evolution-weekly',
  'brain-orchestrator-daily',
  'brain-crisis-scan',
  'brain-recycler-scan',
  'brain-lifecycle-sync',
  'brain-social-listening',
  'brain-crossbrand-sync',
  'brain-dream-nightly',
  'brain-emotional-sync',
  'brain-forecast-weekly',
  'brain-evolution-weekly',
  'brain-loop-optimize',
  'brain-hashtag-sync',
  'neural-memory-consolidate',
  'neural-learning-sync',
  'rag-knowledge-sync',
  'semantic-search-index',
  'attention-routing-daily',
  'swarm-daily-orchestration',
  'predictive-content-score',
  'swarm-consensus-daily',
];

/** Moderación, revisión de caras/duplicados, consistencia visual de marca y cumplimiento de promesas. */
const QUALITY_JOBS: readonly string[] = [
  'aesthetic-audit',
  'brand-consistency-check',
  'vision-daily-content-audit',
  'auto-moderation-scan',
  'visual-palette-sync',
  'ocr-batch-extract',
  'face-check-compliance',
  'similar-content-detection',
  'feedback-daily-collect',
  'promise-daily-check',
  'promise-weekly-report',
  'anti-promise-audit',
];

/** Clasificación explícita (gana sobre los prefijos). Un job puede pertenecer a varios bots: corre si ALGUNO está prendido. */
const EXPLICIT: Readonly<Record<string, readonly BotId[]>> = {
  // ── Comentarios / DMs ────────────────────────────────────────────────────
  'bot-poll': ['comment-bot', 'dm-bot'],
  'events-processor': ['comment-bot', 'dm-bot'],
  'cm-inbox-tick': ['dm-bot'],
  'dm-triage-hourly': ['dm-bot'],
  'cm-leads-followups': ['dm-bot'],
  'lead-nurture-batch': ['dm-bot'],
  'nurture-ejecutar': ['dm-bot'],
  'playbook-lead-nurture': ['dm-bot'],
  'cm-fan-welcomes': ['dm-bot'],
  'cm-faq-mining-weekly': ['dm-bot'],
  // ── Comunidad ────────────────────────────────────────────────────────────
  'community-daily-engagement': ['community-bot'],
  'playbook-community-sprint': ['community-bot'],
  'cm-fan-refresh': ['community-bot'],
  'cm-fan-churning-detect': ['community-bot'],
  'cm-community-snapshot': ['community-bot'],
  'post-boost-tick': ['community-bot'],
  'retention-pulse-plan': ['community-bot'],
  // ── Instagram ────────────────────────────────────────────────────────────
  'ig-process-notifications': ['instagram-bot'],
  'ig-community-daily': ['instagram-bot'],
  'ig-weekly-growth': ['instagram-bot'],
  // ── Diseño y Carruseles ──────────────────────────────────────────────────
  'content-pipeline-daily': ['design-bot'],
  'studio-daily-render': ['design-bot'],
  'cm-stories-daily': ['design-bot'],
  'repurpose-daily': ['design-bot'],
  'asset-curation': ['design-bot'],
  'curator-fetch': ['design-bot'],
  // ── Video y Reels ────────────────────────────────────────────────────────
  'autonomous-producer-batch': ['video-bot'],
  // ── Estrategia y Calendario ──────────────────────────────────────────────
  'cmo-daily-cycle': ['strategy-bot'],
  'autopilot-semanal': ['strategy-bot'],
  'autopilot-weekly': ['strategy-bot'],
  'directives-tick': ['strategy-bot'],
  'custom-playbook-scheduler': ['strategy-bot'],
  'calendar-prep-processor': ['strategy-bot'],
  'strategy-plan-weekly': ['strategy-bot'],
  'hashtag-rotation': ['strategy-bot'],
  'ritual-weekly-plan': ['strategy-bot'],
  // ── Growth y Analytics ───────────────────────────────────────────────────
  ...Object.fromEntries(GROWTH_JOBS.map((n) => [n, ['growth-bot'] as const])),
  // ── Cerebro y Memoria ────────────────────────────────────────────────────
  ...Object.fromEntries(BRAIN_JOBS.map((n) => [n, ['brain-bot'] as const])),
  // ── Calidad y Compliance ─────────────────────────────────────────────────
  ...Object.fromEntries(QUALITY_JOBS.map((n) => [n, ['quality-bot'] as const])),
  // ── Anuncios y ventas ────────────────────────────────────────────────────
  'sales-funnel-daily': ['ads-bot'],
  'lead-score-sync': ['ads-bot'],
  'conversion-weekly-funnel': ['ads-bot'],
  'revenue-attribution-weekly': ['ads-bot'],
};

/** Prefijos → bot. Se evalúan en orden; el primero que coincide gana. */
const PREFIX_RULES: ReadonlyArray<readonly [RegExp, BotId]> = [
  [/^tiktok-/, 'tiktok-bot'],
  [/^(cu-|browser-|antidetect-)/, 'computer-use-bot'],
  [/^(campaign-|budget-|smart-boost|revenue-)/, 'ads-bot'],
  [/^canva-/, 'design-bot'],
  [/^(capcut-|video-|audio-|fomo-|ar-)/, 'video-bot'],
];

/** Todos los nombres de job clasificados a mano (infraestructura + explícitos). Sirve para detectar typos en los tests. */
export const CLASSIFIED_JOB_NAMES: readonly string[] = [...INFRA_JOBS, ...Object.keys(EXPLICIT)];

export type JobClassification =
  | { kind: 'infra' }
  | { kind: 'bots'; bots: readonly BotId[]; via: 'explicit' | 'prefix' | 'fallback' };

export const classifyJob = (jobName: string): JobClassification => {
  if (INFRA_JOBS.has(jobName)) return { kind: 'infra' };

  const explicit = EXPLICIT[jobName];
  if (explicit) return { kind: 'bots', bots: explicit, via: 'explicit' };

  for (const [re, bot] of PREFIX_RULES) {
    if (re.test(jobName)) return { kind: 'bots', bots: [bot], via: 'prefix' };
  }
  return { kind: 'bots', bots: ['brain-bot'], via: 'fallback' };
};

/**
 * Eventos del bus que despiertan agentes (triggerConnector). Un evento no tiene que gastar
 * LLM si los bots que lo atienden están apagados. Lo no listado cae en `brain-bot`.
 */
const EVENT_BOTS: Readonly<Record<string, readonly BotId[]>> = {
  inbound_message_received: ['comment-bot', 'dm-bot'],
};

export const botsForEvent = (eventType: string): readonly BotId[] => EVENT_BOTS[eventType] ?? ['brain-bot'];

/** Bots que gobiernan un job. Vacío = infraestructura (siempre corre). */
export const botsForJob = (jobName: string): readonly BotId[] => {
  const c = classifyJob(jobName);
  return c.kind === 'infra' ? [] : c.bots;
};
