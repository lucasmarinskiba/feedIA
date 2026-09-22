/**
 * Bot Control — registro de bots y clasificación de jobs del scheduler.
 *
 * Un "bot" es una unidad que el usuario puede prender/apagar: agrupa procesos
 * autónomos que actúan o gastan LLM sin que nadie los pida. La clasificación de
 * jobs es explícita; lo que no esté clasificado cae en `intelligence-bot` (nunca
 * en "siempre encendido"), para que apagar todo apague de verdad todo el gasto
 * autónomo y un job nuevo no se escape del control sin que nadie lo note.
 *
 * INFRA = jobs que NO se pueden apagar desde acá: publican lo que una persona
 * ya programó, miden salud o limpian. No gastan LLM o su apagado rompería algo
 * que el usuario espera (un post programado que no sale).
 */

export type BotId =
  | 'comment-bot'
  | 'dm-bot'
  | 'community-bot'
  | 'content-bot'
  | 'tiktok-bot'
  | 'computer-use-bot'
  | 'ads-bot'
  | 'intelligence-bot';

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
}

export const BOTS: readonly BotDefinition[] = [
  {
    id: 'comment-bot',
    label: 'Comentarios',
    description: 'Lee y responde comentarios públicos (Comment Brain: tipo + sarcasmo + riesgo).',
    costly: true,
    defaultEnabled: true,
    views: ['inbox', 'community', 'community-manager', 'revision', 'crisis', 'home', 'feed'],
  },
  {
    id: 'dm-bot',
    label: 'DMs e inbox',
    description: 'Triage, respuestas automáticas y seguimiento de mensajes directos y leads.',
    costly: true,
    defaultEnabled: true,
    views: ['inbox', 'community', 'community-manager', 'crisis'],
  },
  {
    id: 'community-bot',
    label: 'Comunidad',
    description: 'Engagement diario, bienvenidas a fans, re-engagement y comentarios faro.',
    costly: true,
    defaultEnabled: true,
    views: ['community', 'community-manager', 'collab', 'ugc', 'inbox'],
  },
  {
    id: 'content-bot',
    label: 'Contenido',
    description: 'Crea contenido solo: ciclo CMO, autopilot semanal, stories, diseños, videos y reels.',
    costly: true,
    defaultEnabled: true,
    views: [
      'calendar',
      'scheduler',
      'autopilot',
      'studio-carousel',
      'studio-reel',
      'studio-stories',
      'curator',
      'forge',
      'mission',
      'hooks',
      'brandkit',
      'diseñador',
    ],
  },
  {
    id: 'tiktok-bot',
    label: 'TikTok',
    description: 'Detecta tendencias, optimiza FYP y produce contenido nativo de TikTok.',
    costly: true,
    defaultEnabled: true,
    views: ['studio-tiktok', 'studio-tiktok-script', 'studio-tiktok-photo', 'community-manager'],
  },
  {
    id: 'computer-use-bot',
    label: 'Computer Use',
    description: 'Maneja el navegador solo: rutinas de Instagram, stories, exploración y crecimiento.',
    costly: true,
    defaultEnabled: true,
    views: ['pantalla', 'replay', 'vision', 'visión', 'studio-manager', 'canva-runner', 'handsfree'],
  },
  {
    id: 'ads-bot',
    label: 'Anuncios y ventas',
    description: 'Campañas, presupuesto, boosts, funnel y atribución de ingresos.',
    costly: true,
    defaultEnabled: true,
    views: ['analytics', 'experiments', 'reportes', 'imperio'],
  },
  {
    id: 'intelligence-bot',
    label: 'Inteligencia y reportes',
    description: 'Cerebro, análisis, predicciones, competidores y reportes periódicos.',
    costly: true,
    defaultEnabled: true,
    views: ['agents', 'skills', 'predictor', 'audit', 'optimize', 'inteligencia', 'brujula', 'assistant', 'glassbox'],
  },
];

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

/** Análisis, predicción, aprendizaje, auditorías y reportes periódicos: el grueso del gasto autónomo de LLM. */
const INTELLIGENCE_JOBS: readonly string[] = [
  'digest-diario',
  'aesthetic-audit',
  'playbook-viral-scan',
  'discipline-audit',
  'predictor-weekly',
  'brand-consistency-check',
  'competitor-monitor',
  'weekly-kpi-audit',
  'auto-optimization',
  'os-tick',
  'timing-model-rebuild',
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
  'ig-knowledge-study',
  'trigger-autonomous',
  'agent-evolution-weekly',
  'competitor-weekly-intelligence',
  'profile-monthly-audit',
  'audience-monthly-segment',
  'anomaly-scan',
  'brain-orchestrator-daily',
  'brain-crisis-scan',
  'brain-competitor-track',
  'brain-recycler-scan',
  'brain-revenue-sync',
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
  'anomaly-daily-scan',
  'trend-forecast-weekly',
  'engagement-model-train',
  'swarm-consensus-daily',
  'vision-daily-content-audit',
  'auto-moderation-scan',
  'visual-palette-sync',
  'ocr-batch-extract',
  'face-check-compliance',
  'similar-content-detection',
  'feedback-daily-collect',
  'performance-weekly-review',
  'strategy-auto-tune',
  'promise-daily-check',
  'promise-weekly-report',
  'anti-promise-audit',
];

/** Clasificación explícita (gana sobre los prefijos). Un job puede pertenecer a varios bots: corre si ALGUNO está prendido. */
const EXPLICIT: Readonly<Record<string, readonly BotId[]>> = {
  // ── Comentarios / DMs ────────────────────────────────────────────────────
  'bot-poll': ['comment-bot', 'dm-bot'],
  'events-processor': ['comment-bot', 'dm-bot'],
  'ig-process-notifications': ['comment-bot'],
  'ig-community-daily': ['comment-bot', 'dm-bot', 'community-bot'],
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
  'ig-beacon-engagement': ['community-bot', 'computer-use-bot'],
  'post-boost-tick': ['community-bot'],
  'retention-pulse-plan': ['community-bot'],
  // ── Contenido ────────────────────────────────────────────────────────────
  'cmo-daily-cycle': ['content-bot'],
  'autopilot-semanal': ['content-bot'],
  'autopilot-weekly': ['content-bot'],
  'autonomous-producer-batch': ['content-bot'],
  'content-pipeline-daily': ['content-bot'],
  'studio-daily-render': ['content-bot'],
  'cm-stories-daily': ['content-bot'],
  'repurpose-daily': ['content-bot'],
  'asset-curation': ['content-bot'],
  'curator-fetch': ['content-bot'],
  'directives-tick': ['content-bot'],
  'custom-playbook-scheduler': ['content-bot'],
  'calendar-prep-processor': ['content-bot'],
  'strategy-plan-weekly': ['content-bot'],
  'hashtag-rotation': ['content-bot'],
  'ritual-weekly-plan': ['content-bot'],
  // ── Computer Use ─────────────────────────────────────────────────────────
  'ig-weekly-growth': ['computer-use-bot'],
  // ── Inteligencia y reportes ──────────────────────────────────────────────
  ...Object.fromEntries(INTELLIGENCE_JOBS.map((n) => [n, ['intelligence-bot'] as const])),
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
  [/^(canva-|capcut-|video-|audio-|fomo-|ar-)/, 'content-bot'],
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
  return { kind: 'bots', bots: ['intelligence-bot'], via: 'fallback' };
};

/**
 * Eventos del bus que despiertan agentes (triggerConnector). Un evento no tiene que gastar
 * LLM si los bots que lo atienden están apagados. Lo no listado cae en `intelligence-bot`.
 */
const EVENT_BOTS: Readonly<Record<string, readonly BotId[]>> = {
  inbound_message_received: ['comment-bot', 'dm-bot'],
};

export const botsForEvent = (eventType: string): readonly BotId[] => EVENT_BOTS[eventType] ?? ['intelligence-bot'];

/** Bots que gobiernan un job. Vacío = infraestructura (siempre corre). */
export const botsForJob = (jobName: string): readonly BotId[] => {
  const c = classifyJob(jobName);
  return c.kind === 'infra' ? [] : c.bots;
};
