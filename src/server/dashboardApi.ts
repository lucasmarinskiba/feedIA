/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { listAllContexts, runOnce } from '../capabilities/bot/index.js';
import {
  listarBacklog,
  loadSources,
  addSource,
  aprobarItem,
  marcarUsado,
  procesarTodasLasSources,
} from '../capabilities/curator/index.js';
import { listarPorEstado as listarUgcPorEstado, solicitarPermiso, marcarRespuesta } from '../capabilities/ugc/index.js';
// alias for live-context reads in the assistant chat
const listarUgc = listarUgcPorEstado;
import {
  listarExperimentos,
  lanzarExperimento,
  completarExperimento,
  diseñarExperimentos,
  descartarExperimento,
} from '../capabilities/experiments/index.js';
import { getCrisisState, isPausado, reanudarPublicaciones, ejecutarCrisisCheck } from '../capabilities/crisis/index.js';
import { listarSecuencias, listarEnrollments } from '../capabilities/nurture/index.js';
import {
  listByStatus as listProspects,
  setStatus as setProspectStatus,
  upsertProspect,
} from '../capabilities/collab/index.js';
import { construirDigest } from '../capabilities/digest/index.js';
import { listJobs, recentRuns, runJobByName, loadOverrides, setJobOverride } from '../scheduler/index.js';
import { jobs as schedulerJobs } from '../scheduler/jobs.js';
import { BrandProfileSchema } from '../config/types.js';
import type { BrandProfile } from '../config/types.js';
import { json, type RouteDefinition } from './http.js';
import { createCaption } from '../capabilities/content/caption.js';
import {
  runCarouselFactory,
  listCarouselJobs,
  getCarouselJob,
  readCarouselSlideSvg,
  readCarouselSlidePng,
} from '../capabilities/content/index.js';
import { investigarHashtags } from '../capabilities/hashtags/research.js';
import { generateHooks } from '../capabilities/copywriting/hooks.js';
import { repurposeContent } from '../capabilities/repurposing/index.js';
import { auditarPrePublicacion } from '../capabilities/safety/index.js';
import { optimizarPerfil } from '../capabilities/profile/index.js';
import { generateWeeklyReport, sendWeeklyReportAlert } from '../capabilities/analytics/index.js';
import { askJson, hasApiKey } from '../agent/claude.js';
import { AGENTS, agentChat, executeAgentAction } from '../capabilities/agents/index.js';
import type { AgentMessage } from '../capabilities/agents/index.js';
import { listCheckpoints } from '../agent/checkpoints.js';
import { topPerformers, initMemory } from '../agent/memory.js';
import { runHealthChecks } from '../observability/healthChecks.js';
import { listBrandProfiles, activateBrandProfile, getActiveBrandFile } from '../config/brandRegistry.js';
import { subscribe, publishOp, presenceCount, roomKey, type CollabOp } from './collabHub.js';
import {
  HOOK_PATTERNS,
  scoreHook,
  rankHooks,
  matchAndGenerateHooks,
  getPatternsByCategory,
  type HookCategory,
} from '../capabilities/hookLibrary/index.js';
import {
  extractSuccessPatterns,
  runAutoOptimization,
  recordOptimizationRun,
  listAdjustments,
  listRecommendations,
  updateAdjustmentStatus,
  updateRecommendationStatus,
  getLastOptimizationSummary,
} from '../capabilities/autoOptimize/index.js';
import {
  runWeeklyAudit,
  persistAudit,
  listAudits,
  getLastAudit,
  getAuditTrend,
} from '../capabilities/kpiAudit/index.js';
import { scoreContent } from '../capabilities/contentScorer/index.js';
import { produceContent, produceBatch } from '../capabilities/autonomous/index.js';
import {
  checkOriginality,
  registerPublished,
  listFingerprints,
  clearOldFingerprints,
} from '../capabilities/originality/index.js';
import {
  VISUAL_HOOK_PATTERNS,
  getVisualPatternsByFormat,
  recommendVisualForHook,
  type VisualFormat,
} from '../capabilities/visualHooks/index.js';
import {
  routeMessage,
  detectIntent,
  listFaqs,
  upsertFaq,
  deleteFaq,
  matchFaq,
  aggregateMetrics,
} from '../capabilities/convoRouter/index.js';
import {
  planRetentionPulses,
  defaultSignals,
  listPulses,
  updatePulseStatus,
  getPulseStats,
  type AudienceSignals,
} from '../capabilities/retentionPulse/index.js';
import {
  CONCEPT_TEMPLATES,
  getTemplateById as getConceptTemplate,
  getTemplatesByFormat,
  recommendTemplate,
  fillTemplate,
  flattenToContentDraft,
  type FunnelPosition,
  type TemplateGoal,
} from '../capabilities/conceptTemplates/index.js';
import type { ContentFormat } from '../config/types.js';
import {
  OUTREACH_TEMPLATES,
  getOutreachByCategory,
  recommendOutreach,
  startSequence,
  summarizeOutreach,
  markStepSent,
  markReply,
  markDropped,
  listOutreach,
  type OutreachCategory,
  type OutreachTrigger,
} from '../capabilities/outreach/index.js';
import { recommendPinSlate } from '../capabilities/pinStrategy/index.js';
import {
  ALGORITHM_FACTS,
  FORMAT_SPECS,
  recallFacts,
  listFactTopics,
  captureLearning,
  queryLearnings,
  listLearnings,
  deleteLearning,
  buildGroundingContext,
  type FactTopic,
  type LearningCategory,
  type Confidence,
} from '../capabilities/knowledgeBase/index.js';
import { listTraces, getTraceById, getTraceStats, recordOutcome } from '../capabilities/reasoningTrace/index.js';
import {
  decomposeGoal,
  listPlaybookLibrary,
  createMission,
  markMissionRunning,
  markMissionDone,
  listMissions,
  getMissionById,
} from '../capabilities/goalDecomposer/index.js';
import { runPlaybook } from '../agent/orchestrator.js';
import {
  runMission as runSwarmMission,
  listMissions as listSwarmMissions,
  getMission as getSwarmMission,
  getBlackboard as getSwarmBlackboard,
  runOperationsCycle as runSwarmOps,
  getOperationsStatus as getSwarmOpsStatus,
  recallSimilarMissions as recallSwarmMissions,
} from '../agent/swarm/index.js';
import { getBudgetStatus, getBudgetHistory } from '../agent/budget.js';
import { listBandits, banditStats } from '../capabilities/experiments/index.js';
import { semanticCacheStats } from '../agent/semanticCache.js';
import { digestSnapshot } from '../capabilities/digest/index.js';
import {
  buildExecutiveBrief,
  recapSvg,
  recapPng,
  investorOnePagerHtml,
  getWelcome,
  humanizeActivity,
} from '../capabilities/experience/index.js';
import { routeCommand } from '../capabilities/command/index.js';
import {
  getActivatedState,
  setActivated,
  setModuleEnabled,
  type AutopilotModuleId,
} from '../capabilities/autopilot/index.js';
import { getHistory as getBusHistory, getEventsByCorrelation } from '../agent/bus.js';
import {
  listAgentTypes,
  listClassifiedAgents,
  getAgentsByType,
  listDepartments,
  getPublicSystemView,
  internalsExposed,
  type AgentType,
} from '../capabilities/agentTaxonomy/index.js';
import {
  buildOrgChart,
  getEmployeeDirectory,
  getEmployee,
  delegateGlobalOrder,
  taliaSystemKnowledge,
} from '../capabilities/talia/index.js';
import {
  planComputerUse,
  planInternalNavigation,
  listTargets,
  executePlan,
  isLiveRuntimeAvailable,
  listComputerRuns,
  startWatchSession,
  subscribeWatch,
  listWatchSessions,
  computerUseLiveEnabled,
  isComputerUseLiveAvailable,
  planCanvaCarousel,
  planCapCutVideo,
  type CanvaSlide,
  type CapCutBeat,
} from '../capabilities/computerUse/index.js';
import {
  parseDirective,
  createDirective,
  listDirectives,
  getDirective,
  updateDirectiveStatus,
  deleteDirective,
  executeDirective,
  recordRun,
  computeNextRun,
  listRuns,
} from '../capabilities/directives/index.js';
import {
  getBoard,
  saveBoard,
  applyElementOp,
  listBoards,
  createBoard,
  renameBoard,
  deleteBoard,
  setActiveBoard,
  recordInterpretation,
  interpretBoard,
  interpretBoardVisual,
  listAgenda,
  addAgendaItem,
  setAgendaDone,
  deleteAgendaItem,
  listBoardTemplates,
  buildBoardTemplate,
  saveSnapshot,
  listSnapshots,
  restoreSnapshot,
  listOpLog,
  revertLastOp,
  createInvite,
  listInvites,
  revokeInvite,
  resolveInvite,
  roleFor,
  isMutatingOp,
  type WbElement,
} from '../capabilities/whiteboard/index.js';
import {
  getApprovalQueue,
  actOnApproval,
  getBitacora,
  getAlertCenter,
  getKanban,
  getMoodboard,
  getReportData,
  runSimulation,
} from '../capabilities/workspace/index.js';

// ── Settings: in-memory state ────────────────────────────────────────────────
interface ConnectionState {
  connected: boolean;
  username?: string;
  followers?: number;
  mediaCount?: number;
  teamName?: string;
  designsCreated?: number;
  connectedAt?: string;
}
const connections: Record<string, ConnectionState> = {};
const runtimeApiKeys: Record<string, string> = {};
const SETTINGS_PATH = resolve('data/runtime/settings.json');

const loadSettings = (): void => {
  try {
    const raw = JSON.parse(readFileSync(SETTINGS_PATH, 'utf-8')) as {
      connections?: Record<string, ConnectionState>;
      apiKeys?: Record<string, string>;
    };
    Object.assign(connections, raw.connections ?? {});
    Object.assign(runtimeApiKeys, raw.apiKeys ?? {});
  } catch {
    /* ignore */
  }
};

const saveSettings = (): void => {
  try {
    mkdirSync(dirname(SETTINGS_PATH), { recursive: true });
    writeFileSync(SETTINGS_PATH, JSON.stringify({ connections, apiKeys: runtimeApiKeys }, null, 2), 'utf-8');
  } catch {
    /* ignore */
  }
};

const maskKey = (key: string): string =>
  key.length > 8 ? `${key.slice(0, 6)}${'*'.repeat(key.length - 10)}${key.slice(-4)}` : '****';

// Load persisted settings at startup
loadSettings();

// ── Calendar: in-memory slot store ────────────────────────────────────────────
interface CalendarSlot {
  id: string;
  titulo: string;
  formato: string;
  status: 'borrador' | 'pendiente' | 'publicado' | 'rechazado';
  scheduledFor: string;
  createdAt: string;
}
const calendarSlots: CalendarSlot[] = [];

// Mapping from UI format names to repurposing engine tipo values
const REPURPOSE_TIPO_MAP: Record<
  string,
  'blog' | 'video' | 'transcripcion' | 'newsletter' | 'paper' | 'libro' | 'podcast'
> = {
  blog: 'blog',
  reel: 'video',
  video: 'video',
  newsletter: 'newsletter',
  podcast: 'podcast',
};

export const buildDashboardRoutes = (brand: BrandProfile): RouteDefinition[] => [
  {
    method: 'GET',
    pattern: '/api/health',
    handler: async ({ res }) => {
      const report = await runHealthChecks();
      json(res, report.ok ? 200 : 503, { ...report, brand: brand.name });
    },
  },
  {
    method: 'GET',
    pattern: '/api/digest',
    handler: async ({ res }) => json(res, 200, await construirDigest(brand)),
  },
  {
    method: 'GET',
    pattern: '/api/conversations',
    handler: ({ res }) => json(res, 200, listAllContexts()),
  },
  {
    method: 'GET',
    pattern: '/api/curator/sources',
    handler: ({ res }) => json(res, 200, loadSources()),
  },
  {
    method: 'GET',
    pattern: '/api/curator/backlog',
    handler: ({ res, query }) => {
      type S = import('../capabilities/curator/sources.js').BacklogItem['status'];
      const status = query['status'] as S | undefined;
      json(res, 200, listarBacklog(status));
    },
  },
  {
    method: 'POST',
    pattern: '/api/curator/backlog/:id/approve',
    handler: ({ res, params }) => json(res, 200, { ok: !!aprobarItem(params['id']!) }),
  },
  {
    method: 'POST',
    pattern: '/api/curator/backlog/:id/used',
    handler: ({ res, params }) => json(res, 200, { ok: !!marcarUsado(params['id']!) }),
  },
  {
    method: 'GET',
    pattern: '/api/ugc',
    handler: ({ res, query }) => {
      type S = import('../capabilities/ugc/repostFlow.js').PermissionStatus;
      const status = (query['status'] as S | undefined) ?? 'no-solicitado';
      json(res, 200, listarUgcPorEstado(status));
    },
  },
  {
    method: 'POST',
    pattern: '/api/ugc/:id/request-permission',
    handler: async ({ res, params }) => json(res, 200, await solicitarPermiso(params['id']!)),
  },
  {
    method: 'POST',
    pattern: '/api/ugc/:id/answer',
    handler: ({ res, params, body }) => {
      const b = body as { status: 'aprobado' | 'rechazado'; nota?: string };
      json(res, 200, marcarRespuesta(params['id']!, b.status, b.nota));
    },
  },
  {
    method: 'GET',
    pattern: '/api/experiments',
    handler: ({ res, query }) => {
      type S = import('../capabilities/experiments/runner.js').ExperimentStatus;
      json(res, 200, listarExperimentos(query['status'] as S | undefined));
    },
  },
  {
    method: 'POST',
    pattern: '/api/experiments/:id/launch',
    handler: ({ res, params }) => json(res, 200, lanzarExperimento(params['id']!)),
  },
  {
    method: 'POST',
    pattern: '/api/experiments/:id/discard',
    handler: ({ res, params, body }) => {
      const motivo = (body as { motivo?: string } | null)?.motivo ?? 'descartado por dashboard';
      json(res, 200, descartarExperimento(params['id']!, motivo));
    },
  },
  {
    method: 'GET',
    pattern: '/api/crisis',
    handler: ({ res }) => json(res, 200, getCrisisState()),
  },
  {
    method: 'POST',
    pattern: '/api/crisis/resume',
    handler: ({ res }) => json(res, 200, reanudarPublicaciones()),
  },
  {
    method: 'GET',
    pattern: '/api/nurture/sequences',
    handler: ({ res }) => json(res, 200, listarSecuencias()),
  },
  {
    method: 'GET',
    pattern: '/api/nurture/enrollments',
    handler: ({ res, query }) => {
      type S = import('../capabilities/nurture/sequences.js').SequenceEnrollment['status'];
      json(res, 200, listarEnrollments(query['status'] as S | undefined));
    },
  },
  {
    method: 'GET',
    pattern: '/api/collab',
    handler: ({ res, query }) => {
      type S = import('../capabilities/collab/prospects.js').ProspectStatus;
      json(res, 200, listProspects(query['status'] as S | undefined));
    },
  },
  {
    method: 'POST',
    pattern: '/api/collab/:id/status',
    handler: ({ res, params, body }) => {
      type S = import('../capabilities/collab/prospects.js').ProspectStatus;
      const b = body as { status: S; nota?: string };
      json(res, 200, setProspectStatus(params['id']!, b.status, b.nota));
    },
  },
  {
    method: 'GET',
    pattern: '/api/scheduler/jobs',
    handler: ({ res }) => json(res, 200, listJobs()),
  },
  {
    method: 'GET',
    pattern: '/api/scheduler/runs',
    handler: ({ res, query }) => {
      const limit = query['limit'] ? Number(query['limit']) : 50;
      json(res, 200, recentRuns(limit));
    },
  },
  {
    method: 'POST',
    pattern: '/api/scheduler/run/:name',
    handler: async ({ res, params }) => json(res, 200, await runJobByName(params['name']!, brand)),
  },

  // ── Frontend bridge routes ─────────────────────────────────────────────────

  // Memory / feed data
  {
    method: 'GET',
    pattern: '/api/memory',
    handler: ({ res }) => json(res, 200, { kpis: {}, recentActivity: [], storiesHoy: [] }),
  },

  // Curator (frontend-facing aliases)
  {
    method: 'POST',
    pattern: '/api/curator/fetch',
    handler: async ({ res }) => {
      const items = await procesarTodasLasSources(brand);
      json(res, 200, { added: items.length });
    },
  },
  {
    method: 'POST',
    pattern: '/api/curator/approve',
    handler: ({ res, body }) => {
      const b = body as { id?: string };
      json(res, 200, { ok: b.id ? !!aprobarItem(b.id) : false });
    },
  },
  {
    method: 'POST',
    pattern: '/api/curator/sources',
    handler: ({ res, body }) => {
      const b = body as { url?: string; name?: string };
      if (!b.url) return json(res, 400, { error: 'url requerida' });
      addSource({ tipo: 'url', nombre: b.name ?? b.url, url: b.url, activo: true });
      json(res, 200, { ok: true });
    },
  },

  // UGC (frontend-facing aliases)
  {
    method: 'GET',
    pattern: '/api/ugc/list',
    handler: ({ res }) => json(res, 200, { items: listarUgcPorEstado('no-solicitado') }),
  },
  {
    method: 'POST',
    pattern: '/api/ugc/scan',
    handler: async ({ res }) => json(res, 200, { found: 0 }),
  },
  {
    method: 'POST',
    pattern: '/api/ugc/approve',
    handler: ({ res, body }) => {
      const b = body as { id?: string };
      json(res, 200, b.id ? marcarRespuesta(b.id, 'aprobado') : { ok: false });
    },
  },
  {
    method: 'POST',
    pattern: '/api/ugc/reject',
    handler: ({ res, body }) => {
      const b = body as { id?: string };
      json(res, 200, b.id ? marcarRespuesta(b.id, 'rechazado') : { ok: false });
    },
  },
  {
    method: 'POST',
    pattern: '/api/ugc/contact',
    handler: async ({ res, body }) => {
      const b = body as { id?: string; handle?: string };
      if (!b.id) return json(res, 400, { error: 'id requerido' });
      await solicitarPermiso(b.id);
      json(res, 200, { ok: true, handle: b.handle });
    },
  },

  // Experiments (frontend-facing aliases)
  {
    method: 'GET',
    pattern: '/api/experiments/list',
    handler: ({ res }) => json(res, 200, { experiments: listarExperimentos() }),
  },
  {
    method: 'POST',
    pattern: '/api/experiments/design',
    handler: async ({ res, body }) => {
      const b = body as { objetivo?: string };
      if (!b.objetivo) return json(res, 400, { error: 'objetivo requerido' });
      const experiment = await diseñarExperimentos(brand, b.objetivo);
      json(res, 200, { experiment });
    },
  },
  {
    method: 'POST',
    pattern: '/api/experiments/launch',
    handler: ({ res, body }) => {
      const b = body as { experimentId?: string };
      if (!b.experimentId) return json(res, 400, { error: 'experimentId requerido' });
      json(res, 200, lanzarExperimento(b.experimentId));
    },
  },
  {
    method: 'POST',
    pattern: '/api/experiments/complete',
    handler: async ({ res, body }) => {
      const b = body as { experimentId?: string };
      if (!b.experimentId) return json(res, 400, { error: 'experimentId requerido' });
      json(res, 200, await completarExperimento(brand, b.experimentId, {}));
    },
  },

  // Collab (frontend-facing aliases)
  {
    method: 'GET',
    pattern: '/api/collab/prospects',
    handler: ({ res }) => json(res, 200, { prospects: listProspects() }),
  },
  {
    method: 'POST',
    pattern: '/api/collab/find',
    handler: async ({ res, body }) => {
      const b = body as { nicho?: string };
      if (!b.nicho) return json(res, 400, { error: 'nicho requerido' });
      const ok = await procesarObservacionesCollab(brand, b.nicho);
      json(res, 200, { found: ok ? 1 : 0 });
    },
  },
  {
    method: 'POST',
    pattern: '/api/collab/outreach',
    handler: ({ res, body }) => {
      const b = body as { prospectId?: string };
      if (!b.prospectId) return json(res, 400, { error: 'prospectId requerido' });
      // Mark as outreach sent (fire-and-forget the actual email/DM via cron)
      setProspectStatus(b.prospectId, 'outreach-enviado');
      json(res, 200, { ok: true });
    },
  },
  {
    method: 'POST',
    pattern: '/api/collab/respond',
    handler: ({ res, body }) => {
      const b = body as { prospectId?: string; observaciones?: string };
      if (!b.prospectId) return json(res, 400, { error: 'prospectId requerido' });
      // Transition to negotiation
      const updated = setProspectStatus(b.prospectId, 'en-conversacion', b.observaciones);
      json(res, 200, updated ?? { ok: false });
    },
  },
  {
    method: 'POST',
    pattern: '/api/collab/confirm',
    handler: ({ res, body }) => {
      const b = body as { prospectId?: string };
      if (!b.prospectId) return json(res, 400, { error: 'prospectId requerido' });
      json(res, 200, setProspectStatus(b.prospectId, 'aceptado'));
    },
  },

  // Inbox (frontend-facing aliases)
  {
    method: 'GET',
    pattern: '/api/inbox/conversations',
    handler: ({ res }) => {
      const ctxList = listAllContexts();
      const conversations = ctxList.map((ctx) => ({
        id: ctx.userId,
        handle: ctx.handle ?? ctx.userId,
        lastMessage: ctx.turnos.at(-1)?.texto ?? '',
        updatedAt: ctx.ultimoContacto ?? new Date().toISOString(),
        unread: false,
        intent: ctx.intentHistory.at(-1),
      }));
      json(res, 200, { conversations });
    },
  },
  {
    method: 'GET',
    pattern: '/api/inbox/messages',
    handler: ({ res, query }) => {
      const id = query['conversationId'];
      const ctxList = listAllContexts();
      const ctx = id ? ctxList.find((c) => c.userId === id) : undefined;
      const messages = ctx
        ? ctx.turnos.map((t) => ({
            text: t.texto,
            fromUs: t.rol === 'bot' || t.rol === 'marca',
            createdAt: t.timestamp,
          }))
        : [];
      json(res, 200, { messages });
    },
  },
  {
    method: 'POST',
    pattern: '/api/inbox/suggest',
    handler: ({ res, body }) => {
      const b = body as { conversationId?: string };
      const ctxList = listAllContexts();
      const ctx = b.conversationId ? ctxList.find((c) => c.userId === b.conversationId) : null;
      const lastMessage = ctx?.turnos.at(-1)?.texto ?? '';
      const suggestion = lastMessage
        ? `Gracias por escribirnos. ${lastMessage.includes('precio') ? 'Te cuento los detalles por privado.' : 'Te respondo a la brevedad.'}`
        : 'Hola, ¿en qué te puedo ayudar?';
      json(res, 200, { suggestion });
    },
  },
  {
    method: 'POST',
    pattern: '/api/inbox/reply',
    handler: async ({ res, body }) => {
      const b = body as { conversationId?: string; text?: string };
      if (!b.text) return json(res, 400, { error: 'text requerido' });
      json(res, 200, { ok: true, sent: b.text });
    },
  },
  {
    method: 'POST',
    pattern: '/api/inbox/mark-read',
    handler: ({ res }) => json(res, 200, { ok: true }),
  },
  {
    method: 'POST',
    pattern: '/api/bot/run',
    handler: async ({ res }) => {
      await runOnce(brand);
      json(res, 200, { ok: true });
    },
  },

  // Crisis (frontend-facing aliases)
  {
    method: 'GET',
    pattern: '/api/crisis/status',
    handler: ({ res }) => json(res, 200, getCrisisState()),
  },
  {
    method: 'POST',
    pattern: '/api/crisis/check',
    handler: async ({ res }) => {
      // Run a check with synthetic input when triggered from dashboard
      const result = await ejecutarCrisisCheck(brand, {
        postId: `manual-check-${Date.now()}`,
        comentariosRecientes: [],
      });
      json(res, 200, { crisisDetectada: result.state.publicacionesPausadas, estado: result.state });
    },
  },
  {
    method: 'GET',
    pattern: '/api/crisis/historial',
    handler: ({ res }) => json(res, 200, { historial: [] }),
  },
  {
    method: 'POST',
    pattern: '/api/crisis/simulate',
    handler: ({ res }) => json(res, 200, { ok: true, simulated: true }),
  },

  // Scheduler (frontend-facing aliases)
  {
    method: 'POST',
    pattern: '/api/scheduler/run',
    handler: async ({ res, body }) => {
      const b = body as { jobName?: string };
      if (!b.jobName) return json(res, 400, { error: 'jobName requerido' });
      json(res, 200, await runJobByName(b.jobName, brand));
    },
  },
  {
    method: 'POST',
    pattern: '/api/scheduler/override',
    handler: ({ res, body }) => {
      const b = body as { jobName?: string; cronExpr?: string };
      json(res, 200, { ok: true, applied: b });
    },
  },

  // ── Brand profile ──────────────────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/brand',
    handler: ({ res }) => json(res, 200, brand),
  },
  {
    method: 'PUT',
    pattern: '/api/brand',
    handler: ({ res, body }) => {
      try {
        const b = body as Partial<
          BrandProfile & { handle?: string; bio?: string; targetAudience?: string; valueProp?: string }
        >;
        // Deep-merge into existing brand fields
        const updated: BrandProfile = {
          ...brand,
          name: b.name ?? brand.name,
          niche: b.niche ?? brand.niche,
          voice: { ...brand.voice, ...(b.voice ?? {}) },
          visual: { ...brand.visual, ...(b.visual ?? {}) },
        };
        // Validate with zod (throws on bad data)
        const validated = BrandProfileSchema.parse(updated);
        // Persist to brand.json
        const brandPath = resolve('data/brand.json');
        writeFileSync(brandPath, JSON.stringify(validated, null, 2), 'utf-8');
        // Update runtime copy
        Object.assign(brand, validated);
        json(res, 200, { ok: true, brand: validated });
      } catch (err) {
        json(res, 400, { error: (err as Error).message });
      }
    },
  },

  // ── Settings: Connections ──────────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/settings/connections',
    handler: ({ res }) => json(res, 200, connections),
  },
  {
    method: 'POST',
    pattern: '/api/settings/connect',
    handler: ({ res, body }) => {
      const b = body as { service?: string; code?: string; accessToken?: string };
      if (!b.service) return json(res, 400, { error: 'service requerido' });

      // If token/code provided — mark as connected
      if (b.accessToken || b.code) {
        connections[b.service] = {
          connected: true,
          connectedAt: new Date().toISOString(),
          // stub stats (real flow would exchange code for token + call API)
          username: b.service === 'instagram' ? '@cuenta_conectada' : undefined,
          followers: b.service === 'instagram' ? 0 : undefined,
          mediaCount: b.service === 'instagram' ? 0 : undefined,
          teamName: b.service === 'canva' ? 'Mi equipo' : undefined,
          designsCreated: b.service === 'canva' ? 0 : undefined,
        };
        saveSettings();
        return json(res, 200, { connected: true, ...connections[b.service] });
      }

      // Otherwise return OAuth URL for the service
      const OAUTH_URLS: Record<string, string> = {
        instagram: `https://api.instagram.com/oauth/authorize?client_id=${process.env['INSTAGRAM_APP_ID'] ?? 'INSTAGRAM_APP_ID'}&redirect_uri=${encodeURIComponent(process.env['OAUTH_CALLBACK_URL'] ?? 'http://localhost:3000/auth/callback')}&scope=user_profile,user_media&response_type=code`,
        canva: `https://www.canva.com/api/oauth/authorize?client_id=${process.env['CANVA_CLIENT_ID'] ?? 'CANVA_CLIENT_ID'}&redirect_uri=${encodeURIComponent(process.env['OAUTH_CALLBACK_URL'] ?? 'http://localhost:3000/auth/callback')}&scope=design:content:read design:content:write&response_type=code`,
        meta: `https://www.facebook.com/v19.0/dialog/oauth?client_id=${process.env['META_APP_ID'] ?? 'META_APP_ID'}&redirect_uri=${encodeURIComponent(process.env['OAUTH_CALLBACK_URL'] ?? 'http://localhost:3000/auth/callback')}&scope=instagram_basic,instagram_content_publish,pages_read_engagement&response_type=code`,
      };
      const authUrl = OAUTH_URLS[b.service];
      if (!authUrl) return json(res, 400, { error: `Servicio desconocido: ${b.service}` });
      json(res, 200, { authUrl });
    },
  },
  {
    method: 'POST',
    pattern: '/api/settings/disconnect',
    handler: ({ res, body }) => {
      const b = body as { service?: string };
      if (!b.service) return json(res, 400, { error: 'service requerido' });
      connections[b.service] = { connected: false };
      saveSettings();
      json(res, 200, { ok: true });
    },
  },

  // OAuth callback (popup redirect target)
  {
    method: 'GET',
    pattern: '/auth/callback',
    handler: ({ res, query }) => {
      const service = (query['state'] as string | undefined) ?? 'unknown';
      const code = query['code'] as string | undefined;
      if (code && service !== 'unknown') {
        connections[service] = {
          connected: true,
          connectedAt: new Date().toISOString(),
        };
        saveSettings();
      }
      // Close popup and signal parent
      const html = `<!DOCTYPE html><html><head><title>Conectado</title></head><body>
        <script>window.opener?.postMessage({service:'${service}',connected:${!!code}},'*');window.close();</script>
        <p style="font-family:sans-serif;text-align:center;padding:40px;">Conectado. Podés cerrar esta ventana.</p>
        </body></html>`;
      res.writeHead(200, { 'content-type': 'text/html' });
      res.end(html);
    },
  },

  // ── Settings: API Keys ─────────────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/settings/apikeys',
    handler: ({ res }) => {
      const masked: Record<string, string> = {};
      for (const [k, v] of Object.entries(runtimeApiKeys)) {
        if (v) masked[k] = maskKey(v);
      }
      json(res, 200, masked);
    },
  },
  {
    method: 'POST',
    pattern: '/api/settings/apikeys',
    handler: ({ res, body }) => {
      const b = body as { service?: string; key?: string };
      if (!b.service || !b.key) return json(res, 400, { error: 'service y key requeridos' });
      runtimeApiKeys[b.service] = b.key;
      // Also update process.env so it takes effect immediately
      const ENV_MAP: Record<string, string> = {
        openai: 'OPENAI_API_KEY',
        replicate: 'REPLICATE_API_TOKEN',
        anthropic: 'ANTHROPIC_API_KEY',
      };
      const envKey = ENV_MAP[b.service];
      if (envKey) process.env[envKey] = b.key;
      saveSettings();
      json(res, 200, { ok: true, masked: maskKey(b.key) });
    },
  },

  // ── Settings: Automations ──────────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/settings/automations',
    handler: ({ res }) => {
      const overrides = loadOverrides();
      const runs = recentRuns(50);
      const automations = schedulerJobs.map((job) => {
        const override = overrides.find((o) => o.name === job.name);
        const lastRunRecord = runs.filter((r) => r.name === job.name).at(-1);
        return {
          id: job.name,
          description: job.description,
          defaultCron: job.defaultCron,
          enabled: override ? override.enabled : true,
          lastRun: lastRunRecord?.finishedAt ?? null,
          lastOk: lastRunRecord?.ok ?? null,
          nextRun: null, // cron-next calc omitted for simplicity
        };
      });
      json(res, 200, { automations });
    },
  },
  {
    method: 'POST',
    pattern: '/api/settings/automations/toggle',
    handler: ({ res, body }) => {
      const b = body as { id?: string; enabled?: boolean };
      if (!b.id) return json(res, 400, { error: 'id requerido' });
      const job = schedulerJobs.find((j) => j.name === b.id);
      if (!job) return json(res, 404, { error: `Job no encontrado: ${b.id}` });
      setJobOverride({ name: job.name, cron: job.defaultCron, enabled: b.enabled ?? true });
      json(res, 200, { ok: true, id: b.id, enabled: b.enabled });
    },
  },

  // ── Settings: Schedule ─────────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/settings/schedule',
    handler: ({ res, body }) => {
      const b = body as { timezone?: string; digestTime?: string };
      if (b.timezone) process.env['TIMEZONE'] = b.timezone;
      if (b.digestTime) {
        const [hh, mm] = b.digestTime.split(':');
        const digestJob = schedulerJobs.find((j) => j.name === 'digest-diario');
        if (digestJob) {
          setJobOverride({ name: 'digest-diario', cron: `${mm ?? '0'} ${hh ?? '8'} * * *`, enabled: true });
        }
      }
      json(res, 200, { ok: true });
    },
  },

  // ── Settings: Notifications ────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/settings/notifications',
    handler: ({ res, body }) => {
      const b = body as { prefs?: Record<string, boolean>; email?: string; webhook?: string };
      if (b.webhook) process.env['NOTIFICATIONS_WEBHOOK_URL'] = b.webhook;
      json(res, 200, { ok: true });
    },
  },

  // ── Tools: Caption IA ──────────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/tools/caption',
    handler: async ({ res, body }) => {
      const b = body as { contexto?: string; formato?: string };
      if (!b.contexto) return json(res, 400, { error: 'contexto requerido' });
      try {
        const result = await createCaption(
          brand,
          b.contexto,
          (b.formato ?? 'post-imagen') as 'reel' | 'carrusel' | 'post-imagen' | 'historia',
        );
        json(res, 200, result);
      } catch (err) {
        json(res, 500, { error: String(err) });
      }
    },
  },

  // ── Tools: Hashtags ────────────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/tools/hashtags',
    handler: async ({ res, body }) => {
      const b = body as { tema?: string };
      try {
        const result = await investigarHashtags(brand, b.tema);
        json(res, 200, result);
      } catch (err) {
        json(res, 500, { error: String(err) });
      }
    },
  },

  // ── Tools: Hooks ──────────────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/tools/hooks',
    handler: async ({ res, body }) => {
      const b = body as { idea?: string };
      if (!b.idea) return json(res, 400, { error: 'idea requerida' });
      try {
        const result = await generateHooks(brand, b.idea);
        json(res, 200, result);
      } catch (err) {
        json(res, 500, { error: String(err) });
      }
    },
  },

  // ── Tools: Repurpose ──────────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/tools/repurpose',
    handler: async ({ res, body }) => {
      const b = body as { url?: string; content?: string; fromFormat?: string };
      if (!b.content && !b.url) return json(res, 400, { error: 'content o url requerido' });
      const tipo = REPURPOSE_TIPO_MAP[b.fromFormat ?? ''] ?? 'blog';
      try {
        const result = await repurposeContent(brand, {
          tipo,
          titulo: 'Contenido para repurposing',
          texto: b.content ?? '',
          url: b.url,
        });
        json(res, 200, result);
      } catch (err) {
        json(res, 500, { error: String(err) });
      }
    },
  },

  // ── Tools: Safety Check ───────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/tools/safety',
    handler: async ({ res, body }) => {
      const b = body as { caption?: string; hashtags?: string[] };
      if (!b.caption) return json(res, 400, { error: 'caption requerida' });
      try {
        const result = await auditarPrePublicacion(brand, {
          caption: b.caption,
          otros: b.hashtags ?? [],
        });
        json(res, 200, result);
      } catch (err) {
        json(res, 500, { error: String(err) });
      }
    },
  },

  // ── Tools: Profile AI ─────────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/tools/profile',
    handler: async ({ res, body }) => {
      const b = body as { bio?: string; username?: string; link?: string };
      try {
        const result = await optimizarPerfil(brand, {
          bio: b.bio ?? '',
          nombreVisible: b.username ?? brand.name,
          enlaceEnBio: b.link,
          pinneadosResumen: [],
          highlights: [],
          ultimaActualizacion: new Date().toISOString(),
        });
        json(res, 200, result);
      } catch (err) {
        json(res, 500, { error: String(err) });
      }
    },
  },

  // ── Analytics: Overview ───────────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/analytics/overview',
    handler: async ({ res }) => {
      try {
        const from = new Date(Date.now() - 30 * 86400000).toISOString();
        const { buildSnapshot } = await import('../capabilities/analytics/index.js');
        const snapshot = await buildSnapshot(from);
        const acct = snapshot.cuenta;
        const avgEng = snapshot.posts.length
          ? snapshot.posts.reduce(
              (s, p) => s + ((p.metrics.likes + p.metrics.comments) / Math.max(acct?.followers ?? 1, 1)) * 100,
              0,
            ) / snapshot.posts.length
          : 0;
        json(res, 200, {
          followers: acct?.followers ?? 0,
          followersDelta: acct?.followersDelta ?? 0,
          reach: acct?.reach ?? 0,
          reachDelta: 0,
          engagementRate: parseFloat(avgEng.toFixed(2)),
          engagementDelta: 0,
          saves: snapshot.benchmarks.savesProm,
          savesDelta: 0,
          shares: snapshot.benchmarks.sharesProm,
          sharesDelta: 0,
          impressions: acct?.impressions ?? 0,
          impressionsDelta: 0,
        });
      } catch (err) {
        // Return graceful zeroes when Instagram API unavailable
        json(res, 200, {
          followers: 0,
          followersDelta: 0,
          reach: 0,
          reachDelta: 0,
          engagementRate: 0,
          engagementDelta: 0,
          saves: 0,
          savesDelta: 0,
          shares: 0,
          sharesDelta: 0,
          impressions: 0,
          impressionsDelta: 0,
          _error: String(err),
        });
      }
    },
  },

  // ── Analytics: Engagement timeline ────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/analytics/engagement',
    handler: async ({ res }) => {
      try {
        const from = new Date(Date.now() - 14 * 86400000).toISOString();
        const { buildSnapshot } = await import('../capabilities/analytics/index.js');
        const snapshot = await buildSnapshot(from);
        const followers = snapshot.cuenta?.followers ?? 1;
        const data = snapshot.posts.map((p) => ({
          fecha: p.publishedAt.slice(0, 10),
          engagementRate: parseFloat((((p.metrics.likes + p.metrics.comments) / followers) * 100).toFixed(2)),
        }));
        json(res, 200, { data });
      } catch {
        json(res, 200, { data: [] });
      }
    },
  },

  // ── Analytics: Formats performance ────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/analytics/formats',
    handler: async ({ res }) => {
      try {
        const from = new Date(Date.now() - 30 * 86400000).toISOString();
        const { buildSnapshot } = await import('../capabilities/analytics/index.js');
        const snapshot = await buildSnapshot(from);
        const followers = snapshot.cuenta?.followers ?? 1;
        // Group posts by format and compute average engagement
        const groups: Record<string, { totalEng: number; count: number }> = {};
        for (const p of snapshot.posts) {
          const fmt = p.format ?? 'POST';
          groups[fmt] ??= { totalEng: 0, count: 0 };
          groups[fmt].totalEng += ((p.metrics.likes + p.metrics.comments) / followers) * 100;
          groups[fmt].count += 1;
        }
        const formats = Object.entries(groups).map(([fmt, { totalEng, count }]) => {
          const avgEng = totalEng / count;
          return {
            formato: fmt,
            score: Math.min(100, Math.round(avgEng * 20)),
            posts: count,
            avgEng: parseFloat(avgEng.toFixed(2)),
          };
        });
        json(res, 200, { formats });
      } catch {
        json(res, 200, { formats: [] });
      }
    },
  },

  // ── Analytics: Weekly report ───────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/analytics/report',
    handler: async ({ res }) => {
      try {
        const from = new Date(Date.now() - 7 * 86400000).toISOString();
        const { buildSnapshot } = await import('../capabilities/analytics/index.js');
        const snapshot = await buildSnapshot(from);
        const report = await generateWeeklyReport(brand, snapshot, []);
        await sendWeeklyReportAlert(brand, report, snapshot);
        json(res, 200, { ok: true });
      } catch (err) {
        json(res, 500, { error: String(err) });
      }
    },
  },

  // ── Assistant Chat ─────────────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/assistant/chat',
    handler: async ({ res, body }) => {
      const b = body as { message?: string; history?: Array<{ role: string; content: string }> };
      if (!b.message) return json(res, 400, { error: 'message requerido' });
      try {
        type AssistantResponse = {
          reply: string;
          replyHtml?: string;
          tools?: Array<{ label: string; route: string; icon: string }>;
        };

        // ── Live system context ────────────────────────────────────────────
        const crisis = (() => {
          try {
            return getCrisisState();
          } catch {
            return null;
          }
        })();
        const pausado = (() => {
          try {
            return isPausado();
          } catch {
            return false;
          }
        })();
        const backlog = (() => {
          try {
            return listarBacklog(undefined);
          } catch {
            return [];
          }
        })();
        const ugcPendiente = (() => {
          try {
            return listarUgc('no-solicitado').length;
          } catch {
            return 0;
          }
        })();
        const ugcAprobado = (() => {
          try {
            return listarUgc('aprobado').length;
          } catch {
            return 0;
          }
        })();
        const experimentos = (() => {
          try {
            return listarExperimentos();
          } catch {
            return [];
          }
        })();
        const pendingCp = (() => {
          try {
            return listCheckpoints('pending');
          } catch {
            return [];
          }
        })();
        const performers = (() => {
          try {
            return topPerformers(3);
          } catch {
            return [];
          }
        })();
        const prospectos = (() => {
          try {
            return listProspects('nuevo').length + listProspects('evaluado').length;
          } catch {
            return 0;
          }
        })();
        const secuencias = (() => {
          try {
            return listarSecuencias().length;
          } catch {
            return 0;
          }
        })();
        const enrollments = (() => {
          try {
            return listarEnrollments().length;
          } catch {
            return 0;
          }
        })();
        const sources = (() => {
          try {
            return loadSources().length;
          } catch {
            return 0;
          }
        })();

        const liveCtx = [
          `Estado: ${pausado ? '⚠️ publicaciones PAUSADAS' : '✅ sistema activo'}${crisis?.publicacionesPausadas ? ' (crisis activa)' : ''}`,
          `Backlog de contenido: ${backlog.length} ítems (${backlog.filter((i) => i.status === 'aprobado').length} aprobados)`,
          `UGC: ${ugcPendiente} pendientes de solicitar permiso, ${ugcAprobado} aprobados por publicar`,
          `Experimentos A/B: ${experimentos.length} (${experimentos.filter((e) => e.status === 'corriendo').length} corriendo)`,
          `Checkpoints pendientes de aprobación: ${pendingCp.length}`,
          `Prospectos de collab: ${prospectos}`,
          `Nurture: ${secuencias} secuencias activas, ${enrollments} contactos enrolados`,
          `Fuentes del curador: ${sources}`,
          performers.length
            ? `Top performers: ${performers.map((p) => `[${p.format}] saves=${p.metrics.saves}`).join(' | ')}`
            : 'Sin historial de performance aún.',
        ].join('\n');

        // ── Agentes disponibles ───────────────────────────────────────────
        const agentesDisponibles = AGENTS.map((a) => `${a.emoji} ${a.name} (route: agents)`).join(', ');

        const systemPrompt = `Sos FeedIA, agente IA de nivel experto especialista en Instagram y TikTok. Tenés acceso completo al sistema, datos en tiempo real, modelos predictivos de data science y un equipo de agentes especializados.

PERFIL DE MARCA:
• Marca: ${brand.name} (${brand.type ?? 'marca'})
• Nicho: ${brand.niche}
• Audiencia: ${brand.audience.description}
• Dolores: ${brand.audience.pains.join(' · ')}
• Deseos: ${brand.audience.desires.join(' · ')}
• Tono: ${brand.voice.tone.join(', ')}
• Prohibido: ${brand.voice.forbidden.join(', ') || 'ninguna restricción'}
• Objetivo: ${brand.goals.primary}
• Métricas clave: ${brand.goals.metricsToWatch.join(', ')}

ESTADO ACTUAL DEL SISTEMA:
${liveCtx}

AGENTES ESPECIALIZADOS (mencioná cuál usarías y por qué):
${agentesDisponibles}

CAPACIDADES COMPLETAS:
Studio: Carruseles · Reels · Stories · TikTok Scripts
Análisis: Predictor engagement · Analytics · Feed visual · KPIs
Automatizaciones: ManyChat triggers · UGC · Experimentos A/B · Collabs
Contenido: Curator · Hooks · Captions · Hashtags · Repurposing · Optimización
Garantía de Crecimiento (7 tiers): Nano (+200 seg) · Starter (+500) · Growth (+2K) · Scale (+5K) · Authority (+10K) · Viral (+25K) · Elite (+50K + revenue)

MODELOS PREDICTIVOS DISPONIBLES:
• Predictor Viralidad: R₀ epidemiológico + curva-S logística + Bayesian update → probabilidad viral antes de publicar
• Simulador Embudo Ventas: Monte Carlo 1000 iter → P10/P50/P90 ingresos, LTV, CAC, ROAS, cuello de botella
• Content Scoring Matrix: 7 dimensiones (Hook 28%, Retención 20%, Algoritmo 18%, Audiencia 14%, Conversión 10%, Producción 6%, Timing 4%) → GO / CONDITIONAL / NO-GO
• Risk Assessment: scoring actuarial de riesgo de garantía con precio ajustado

REGLAS DE RESPUESTA:
- Español rioplatense. Conciso, práctico, orientado a resultados.
- Ante preguntas de contenido: recomendá hooks concretos, formatos con datos de engagement, scores reales.
- Ante preguntas de crecimiento: mencioná tier de garantía recomendado con KPIs específicos.
- Ante preguntas de ventas/ingresos: aplicá lógica de embudo con benchmarks del nicho ${brand.niche}.
- Siempre incluí ≥1 tool chip con route correcta cuando sugerís actuar.
- Si detectás problema (bajo engagement, sin leads, falta CTA): diagnosticá + 3 acciones concretas con impacto estimado.`;

        const historyLines = (b.history ?? [])
          .map((m) => `${m.role === 'user' ? 'Usuario' : 'FeedIA'}: ${m.content}`)
          .join('\n');

        const result = await askJson<AssistantResponse>(
          `${systemPrompt}\n\n${historyLines ? `Historial:\n${historyLines}\n\n` : ''}Usuario: ${b.message}\n\nRespondé con JSON:\n{ "reply": string (respuesta concisa en texto plano), "replyHtml": string (misma respuesta como HTML rico con <strong><ul><li><em><br> — incluí datos numéricos, scores, porcentajes cuando sean relevantes), "tools": [{ "label": string, "route": "feed|studio-carousel|studio-reel|studio-stories|vision|predictor|curator|ugc|experiments|collab|inbox|crisis|scheduler|settings|tools|analytics|assistant|calendar|agents|growth|hooks|optimize|mission", "icon": string (emoji) }] }`,
          { maxTokens: 1600 },
        );
        json(res, 200, result);
      } catch (err) {
        json(res, 500, { error: String(err) });
      }
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // VOICE — hands-free command interpreter (multilingual)
  // Interprets a spoken transcript and decides: navigate / launch mission /
  // chat answer. Returns a short spokenReply optimised for TTS.
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/voice/command',
    handler: async ({ res, body }) => {
      const b = body as {
        transcript?: string;
        lang?: string;
        history?: Array<{ role: string; content: string }>;
      };
      if (!b.transcript) return json(res, 400, { error: 'transcript requerido' });

      const lang = (b.lang ?? 'es').slice(0, 2);
      const LANG_NAME: Record<string, string> = {
        es: 'español rioplatense',
        en: 'English',
        pt: 'português brasileiro',
        fr: 'français',
        it: 'italiano',
        de: 'Deutsch',
      };
      const langName = LANG_NAME[lang] ?? 'español';

      type VoiceAction =
        | { type: 'navigate'; route: string }
        | { type: 'mission'; freeIntent: string }
        | { type: 'chat' }
        | { type: 'none' };

      interface VoiceResult {
        spokenReply: string;
        reply: string;
        replyHtml?: string;
        action: VoiceAction;
        tools?: Array<{ label: string; route: string; icon: string }>;
      }

      const routes = [
        'feed',
        'studio-carousel',
        'studio-reel',
        'studio-stories',
        'vision',
        'predictor',
        'curator',
        'ugc',
        'experiments',
        'collab',
        'inbox',
        'crisis',
        'scheduler',
        'settings',
        'tools',
        'analytics',
        'assistant',
        'calendar',
        'agents',
        'audit',
        'optimize',
        'hooks',
        'autopilot',
        'mission',
      ];

      try {
        // First, try a deterministic mission match — if the user clearly stated
        // a growth goal, we can route to a mission without burning an LLM call.
        const lower = b.transcript.toLowerCase();
        const looksLikeMission =
          /\b(crec|grow|aumenta|escala|funnel|leads|lanz|launch|autoridad|authority|bache|alcance|reactiv|planific|plan de|semana)\b/.test(
            lower,
          );

        const historyLines = (b.history ?? [])
          .slice(-6)
          .map((m) => `${m.role === 'user' ? 'User' : 'FeedIA'}: ${m.content}`)
          .join('\n');

        const prompt = `You are FeedIA, a warm, human-sounding voice assistant specialised in Instagram growth for the brand "${brand.name}" (niche: ${brand.niche}).

The user spoke to you (speech-to-text, may have minor errors). Interpret intent and decide ONE action:
- "navigate": user wants to go to a section. Pick the best route from: ${routes.join(', ')}.
- "mission": user expressed a growth GOAL (grow account, get leads, build authority, recover reach, launch offer, plan the week, reactivate audience). Provide a concise freeIntent string capturing the goal.
- "chat": user asked a question or wants advice — answer it directly and helpfully.
- "none": unintelligible or off-topic.

Deterministic hint: transcript ${looksLikeMission ? 'LIKELY contains a growth goal → prefer "mission"' : 'does not obviously contain a growth goal'}.

Reply MUST be in ${langName}. The "spokenReply" is read aloud by TTS so keep it natural, warm, 1-2 sentences, no markdown, no emojis, no URLs. Speak like a helpful human assistant.

${historyLines ? `Conversation so far:\n${historyLines}\n` : ''}
User said: "${b.transcript}"

Respond ONLY with JSON:
{
  "spokenReply": "short natural sentence to read aloud in ${langName}",
  "reply": "same content, can be slightly longer, plain text",
  "replyHtml": "optional HTML version with <strong><ul><li><em>",
  "action": { "type": "navigate|mission|chat|none", "route": "one of the routes if navigate", "freeIntent": "goal text if mission" },
  "tools": [{ "label": "string", "route": "valid route", "icon": "emoji" }]
}`;

        const result = await askJson<VoiceResult>(prompt, { maxTokens: 900 });

        // Safety: validate navigate route, else downgrade to chat.
        if (result.action?.type === 'navigate' && !routes.includes(result.action.route)) {
          result.action = { type: 'chat' };
        }
        json(res, 200, result);
      } catch (err) {
        json(res, 500, { error: String(err) });
      }
    },
  },

  // ── Calendar: Slots ────────────────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/calendar/slots',
    handler: ({ res }) => {
      json(res, 200, { slots: calendarSlots });
    },
  },
  {
    method: 'POST',
    pattern: '/api/calendar/slots',
    handler: ({ res, body }) => {
      const b = body as {
        scheduledFor?: string;
        formato?: string;
        titulo?: string;
        status?: string;
      };
      if (!b.scheduledFor || !b.titulo) {
        return json(res, 400, { error: 'scheduledFor y titulo requeridos' });
      }
      const slot: CalendarSlot = {
        id: `slot_${Date.now()}`,
        titulo: b.titulo,
        formato: b.formato ?? 'post-imagen',
        status: (b.status ?? 'borrador') as CalendarSlot['status'],
        scheduledFor: b.scheduledFor,
        createdAt: new Date().toISOString(),
      };
      calendarSlots.push(slot);
      json(res, 200, { ok: true, slot });
    },
  },

  // ── Calendar: AI Plan Week ─────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/calendar/ai-plan',
    handler: async ({ res, body }) => {
      const b = body as { weekOffset?: number };
      const offset = b.weekOffset ?? 0;
      try {
        type WeekPlan = { plan: Array<{ dayOffset: number; titulo: string; formato: string; hora: string }> };
        const plan = await askJson<WeekPlan>(
          `Actuá como estratega de contenido para Instagram. Creá un plan de 7 publicaciones para la semana ${offset === 0 ? 'actual' : `con offset ${offset}`}.

Marca: ${brand.name} | Nicho: ${brand.niche} | Tono: ${brand.voice.tone.join(', ')}
Objetivo: ${brand.goals.primary} | Audiencia: ${brand.audience.description}

Respondé con JSON: { "plan": [{ "dayOffset": 0-6, "titulo": string, "formato": "reel"|"carrusel"|"post-imagen"|"historia", "hora": "HH:MM" }] }
Generá exactamente 7 entradas, una por día (dayOffset 0=lunes ... 6=domingo).`,
        );
        // Compute actual dates from weekOffset
        const monday = new Date();
        monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + offset * 7);
        for (const item of plan.plan ?? []) {
          const date = new Date(monday);
          date.setDate(monday.getDate() + (item.dayOffset ?? 0));
          const [hh, mm] = (item.hora ?? '09:00').split(':');
          date.setHours(parseInt(hh ?? '9', 10), parseInt(mm ?? '0', 10), 0, 0);
          calendarSlots.push({
            id: `ai_${Date.now()}_${item.dayOffset}`,
            titulo: item.titulo,
            formato: item.formato ?? 'post-imagen',
            status: 'borrador',
            scheduledFor: date.toISOString(),
            createdAt: new Date().toISOString(),
          });
        }
        json(res, 200, { ok: true, created: plan.plan?.length ?? 0 });
      } catch (err) {
        json(res, 500, { error: String(err) });
      }
    },
  },
  // ── Agents Hub: list ──────────────────────────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/agents',
    handler: ({ res }) => {
      const agents = AGENTS.map((a) => ({
        id: a.id,
        name: a.name,
        emoji: a.emoji,
        gradient: a.gradient,
        tagline: a.tagline,
        description: a.description,
        specialties: a.specialties,
        actions: a.actions.map((ac) => ({
          id: ac.id,
          icon: ac.icon,
          label: ac.label,
          description: ac.description,
          params: ac.params,
        })),
      }));
      json(res, 200, { agents });
    },
  },

  // ── Agents Hub: chat ──────────────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/agents/:agentId/chat',
    handler: async ({ res, body, params }) => {
      const agentId = params['agentId'] ?? '';
      const b = body as { message?: string; history?: AgentMessage[] };
      if (!b.message?.trim()) return json(res, 400, { error: 'message requerido' });
      try {
        const result = await agentChat(agentId, brand, b.message, b.history ?? []);
        json(res, 200, result);
      } catch (err) {
        json(res, 500, { error: String(err) });
      }
    },
  },

  // ── Agents Hub: execute action ────────────────────────────────────────────
  {
    method: 'POST',
    pattern: '/api/agents/:agentId/action',
    handler: async ({ res, body, params }) => {
      const agentId = params['agentId'] ?? '';
      const b = body as { actionId?: string; params?: Record<string, string> };
      if (!b.actionId) return json(res, 400, { error: 'actionId requerido' });
      try {
        const result = await executeAgentAction(agentId, b.actionId, brand, b.params ?? {});
        json(res, 200, result);
      } catch (err) {
        json(res, 500, { error: String(err) });
      }
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // HOOK LIBRARY — curated patterns + scorer + matcher
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'GET',
    pattern: '/api/hooks/patterns',
    handler: ({ res, query }) => {
      const category = query['category'] as HookCategory | undefined;
      const patterns = category ? getPatternsByCategory(category) : [...HOOK_PATTERNS];
      json(res, 200, { count: patterns.length, patterns });
    },
  },
  {
    method: 'POST',
    pattern: '/api/hooks/score',
    handler: ({ res, body }) => {
      const b = body as { hook?: string; format?: string };
      if (!b.hook) return json(res, 400, { error: 'hook requerido' });
      const score = scoreHook(b.hook, { format: b.format as never });
      json(res, 200, score);
    },
  },
  {
    method: 'POST',
    pattern: '/api/hooks/rank',
    handler: ({ res, body }) => {
      const b = body as { hooks?: string[]; format?: string };
      if (!Array.isArray(b.hooks)) return json(res, 400, { error: 'hooks debe ser array' });
      json(res, 200, rankHooks(b.hooks, { format: b.format as never }));
    },
  },
  {
    method: 'POST',
    pattern: '/api/hooks/generate',
    handler: async ({ res, body }) => {
      const b = body as { idea?: string; format?: string };
      if (!b.idea) return json(res, 400, { error: 'idea requerida' });
      try {
        const result = await matchAndGenerateHooks(brand, b.idea, {
          format: b.format as never,
        });
        json(res, 200, result);
      } catch (err) {
        json(res, 500, { error: String(err) });
      }
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // CONTENT SCORER — pre-publish shareability/saveability
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/content/score',
    handler: ({ res, body }) => {
      const b = body as Parameters<typeof scoreContent>[0];
      if (!b?.format) return json(res, 400, { error: 'format requerido' });
      json(res, 200, scoreContent(b));
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // AUTO-OPTIMIZATION — success patterns + strategy adjustments
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'GET',
    pattern: '/api/optimize/patterns',
    handler: ({ res, query }) => {
      const window = Number(query['windowDays'] ?? '60');
      json(res, 200, extractSuccessPatterns(Number.isFinite(window) ? window : 60));
    },
  },
  {
    method: 'POST',
    pattern: '/api/optimize/run',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { windowDays?: number; persist?: boolean };
      try {
        const result = await runAutoOptimization(brand, b.windowDays ?? 60);
        if (b.persist !== false) recordOptimizationRun(result);
        json(res, 200, result);
      } catch (err) {
        json(res, 500, { error: String(err) });
      }
    },
  },
  {
    method: 'GET',
    pattern: '/api/optimize/adjustments',
    handler: ({ res, query }) => {
      const status = query['status'] as never;
      json(res, 200, listAdjustments(status ? { status } : undefined));
    },
  },
  {
    method: 'POST',
    pattern: '/api/optimize/adjustments/:id/status',
    handler: ({ res, body, params }) => {
      const b = body as { status?: 'propuesto' | 'aprobado' | 'rechazado' | 'aplicado' | 'reverted' };
      if (!b.status) return json(res, 400, { error: 'status requerido' });
      const updated = updateAdjustmentStatus(params['id']!, b.status);
      if (!updated) return json(res, 404, { error: 'ajuste no encontrado' });
      json(res, 200, updated);
    },
  },
  {
    method: 'GET',
    pattern: '/api/optimize/recommendations',
    handler: ({ res, query }) => {
      const status = query['status'] as never;
      json(res, 200, listRecommendations(status ? { status } : undefined));
    },
  },
  {
    method: 'POST',
    pattern: '/api/optimize/recommendations/:id/status',
    handler: ({ res, body, params }) => {
      const b = body as { status?: 'propuesto' | 'producido' | 'publicado' | 'descartado'; publishedPostId?: string };
      if (!b.status) return json(res, 400, { error: 'status requerido' });
      const updated = updateRecommendationStatus(params['id']!, b.status, b.publishedPostId);
      if (!updated) return json(res, 404, { error: 'recomendación no encontrada' });
      json(res, 200, updated);
    },
  },
  {
    method: 'GET',
    pattern: '/api/optimize/summary',
    handler: ({ res }) => json(res, 200, getLastOptimizationSummary()),
  },

  // ════════════════════════════════════════════════════════════════════════
  // KPI AUDIT — weekly system-wide audit + history
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/audit/run',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { windowDays?: number; persist?: boolean };
      try {
        const audit = await runWeeklyAudit(brand, b.windowDays ?? 7);
        if (b.persist !== false) persistAudit(audit);
        json(res, 200, audit);
      } catch (err) {
        json(res, 500, { error: String(err) });
      }
    },
  },
  {
    method: 'GET',
    pattern: '/api/audit/history',
    handler: ({ res, query }) => {
      const limit = Number(query['limit'] ?? '12');
      json(res, 200, listAudits(Number.isFinite(limit) ? limit : 12));
    },
  },
  {
    method: 'GET',
    pattern: '/api/audit/latest',
    handler: ({ res }) => {
      const last = getLastAudit();
      if (!last) return json(res, 404, { error: 'sin auditorías' });
      json(res, 200, last);
    },
  },
  {
    method: 'GET',
    pattern: '/api/audit/trend',
    handler: ({ res }) => json(res, 200, getAuditTrend()),
  },

  // ════════════════════════════════════════════════════════════════════════
  // AUTONOMOUS PRODUCER — produce content end-to-end with no human in loop
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/autonomous/produce',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as {
        kind?: 'recommendation' | 'idea' | 'backlog';
        idea?: string;
        format?: string;
        recommendationId?: string;
        backlogId?: string;
      };
      try {
        let trigger: Parameters<typeof produceContent>[1];
        if (b.kind === 'idea' && b.idea) {
          trigger = { kind: 'idea', idea: b.idea, format: b.format as never };
        } else if (b.kind === 'backlog' && b.backlogId) {
          trigger = { kind: 'backlog', backlogId: b.backlogId };
        } else {
          trigger = { kind: 'recommendation', recommendationId: b.recommendationId };
        }
        const result = await produceContent(brand, trigger);
        json(res, 200, result);
      } catch (err) {
        json(res, 500, { error: String(err) });
      }
    },
  },
  {
    method: 'POST',
    pattern: '/api/autonomous/produce-batch',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as { count?: number };
      try {
        const results = await produceBatch(brand, Math.max(1, Math.min(5, b.count ?? 3)));
        json(res, 200, { count: results.length, results });
      } catch (err) {
        json(res, 500, { error: String(err) });
      }
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // ORIGINALITY ENGINE — content uniqueness guarantee
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/originality/check',
    handler: ({ res, body }) => {
      const b = body as Parameters<typeof checkOriginality>[0];
      if (!b || (!b.hook && !b.body && !b.caption)) {
        return json(res, 400, { error: 'requiere hook, body o caption' });
      }
      json(res, 200, checkOriginality(b));
    },
  },
  {
    method: 'POST',
    pattern: '/api/originality/register',
    handler: ({ res, body }) => {
      const b = body as Parameters<typeof registerPublished>[0];
      if (!b?.id) return json(res, 400, { error: 'id requerido' });
      json(res, 200, registerPublished(b));
    },
  },
  {
    method: 'GET',
    pattern: '/api/originality/fingerprints',
    handler: ({ res, query }) => {
      const limit = Number(query['limit'] ?? '50');
      json(res, 200, listFingerprints(Number.isFinite(limit) ? limit : 50));
    },
  },
  {
    method: 'POST',
    pattern: '/api/originality/prune',
    handler: ({ res, body }) => {
      const b = (body ?? {}) as { olderThanDays?: number };
      const removed = clearOldFingerprints(b.olderThanDays ?? 365);
      json(res, 200, { removed });
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // VISUAL HOOK LIBRARY — composition patterns
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'GET',
    pattern: '/api/visual-hooks/patterns',
    handler: ({ res, query }) => {
      const format = query['format'] as VisualFormat | undefined;
      const patterns = format ? getVisualPatternsByFormat(format) : [...VISUAL_HOOK_PATTERNS];
      json(res, 200, { count: patterns.length, patterns });
    },
  },
  {
    method: 'POST',
    pattern: '/api/visual-hooks/recommend',
    handler: ({ res, body }) => {
      const b = body as { format?: VisualFormat; hookText?: string; textualCategory?: string };
      if (!b?.format || !b?.hookText) {
        return json(res, 400, { error: 'format y hookText requeridos' });
      }
      json(res, 200, recommendVisualForHook(b.format, b.hookText, b.textualCategory));
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // CONVERSATIONAL ROUTER — intent detection + FAQ + routing
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/convo/detect-intent',
    handler: ({ res, body }) => {
      const b = body as { text?: string };
      if (!b?.text) return json(res, 400, { error: 'text requerido' });
      json(res, 200, detectIntent(b.text));
    },
  },
  {
    method: 'POST',
    pattern: '/api/convo/route',
    handler: ({ res, body }) => {
      const b = body as { text?: string };
      if (!b?.text) return json(res, 400, { error: 'text requerido' });
      json(res, 200, routeMessage(b.text));
    },
  },
  {
    method: 'POST',
    pattern: '/api/convo/route-batch',
    handler: ({ res, body }) => {
      const b = body as { messages?: string[] };
      if (!Array.isArray(b?.messages)) return json(res, 400, { error: 'messages debe ser array' });
      const decisions = b.messages.map((m) => routeMessage(m));
      json(res, 200, { decisions, metrics: aggregateMetrics(decisions) });
    },
  },
  {
    method: 'GET',
    pattern: '/api/convo/faqs',
    handler: ({ res }) => json(res, 200, listFaqs()),
  },
  {
    method: 'POST',
    pattern: '/api/convo/faqs',
    handler: ({ res, body }) => {
      const b = body as Parameters<typeof upsertFaq>[0];
      if (!b?.topic || !Array.isArray(b.questionVariants) || !b?.answer) {
        return json(res, 400, { error: 'topic, questionVariants y answer requeridos' });
      }
      json(res, 200, upsertFaq(b));
    },
  },
  {
    method: 'POST',
    pattern: '/api/convo/faqs/:id/delete',
    handler: ({ res, params }) => json(res, 200, { ok: deleteFaq(params['id']!) }),
  },
  {
    method: 'POST',
    pattern: '/api/convo/faq-match',
    handler: ({ res, body }) => {
      const b = body as { text?: string };
      if (!b?.text) return json(res, 400, { error: 'text requerido' });
      json(res, 200, matchFaq(b.text) ?? { match: null });
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // RETENTION PULSE ENGINE — proactive re-engagement scheduler
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/retention/plan',
    handler: ({ res, body }) => {
      const b = (body ?? {}) as Partial<AudienceSignals>;
      const signals: AudienceSignals = { ...defaultSignals(), ...b };
      const pulses = planRetentionPulses(brand, signals);
      json(res, 200, { created: pulses.length, pulses });
    },
  },
  {
    method: 'GET',
    pattern: '/api/retention/pulses',
    handler: ({ res, query }) => {
      const status = query['status'] as never;
      const filter = status ? { status } : undefined;
      json(res, 200, listPulses(filter));
    },
  },
  {
    method: 'POST',
    pattern: '/api/retention/pulses/:id/status',
    handler: ({ res, body, params }) => {
      const b = body as { status?: 'propuesto' | 'aprobado' | 'enviado' | 'descartado' };
      if (!b?.status) return json(res, 400, { error: 'status requerido' });
      const updated = updatePulseStatus(params['id']!, b.status);
      if (!updated) return json(res, 404, { error: 'pulse no encontrado' });
      json(res, 200, updated);
    },
  },
  {
    method: 'GET',
    pattern: '/api/retention/stats',
    handler: ({ res }) => json(res, 200, getPulseStats()),
  },

  // ════════════════════════════════════════════════════════════════════════
  // CONCEPT TEMPLATES — Plantillas conceptuales completas
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'GET',
    pattern: '/api/templates/list',
    handler: ({ res, query }) => {
      const format = query['format'] as ContentFormat | undefined;
      const list = format ? getTemplatesByFormat(format) : [...CONCEPT_TEMPLATES];
      json(res, 200, { count: list.length, templates: list });
    },
  },
  {
    method: 'GET',
    pattern: '/api/templates/:id',
    handler: ({ res, params }) => {
      const t = getConceptTemplate(params['id']!);
      if (!t) return json(res, 404, { error: 'template no encontrado' });
      json(res, 200, t);
    },
  },
  {
    method: 'POST',
    pattern: '/api/templates/recommend',
    handler: ({ res, body }) => {
      const b = body as { format?: ContentFormat; funnelPosition?: FunnelPosition; primaryGoal?: TemplateGoal };
      if (!b?.format) return json(res, 400, { error: 'format requerido' });
      const t = recommendTemplate({
        format: b.format,
        funnelPosition: b.funnelPosition,
        primaryGoal: b.primaryGoal,
      });
      json(res, 200, t ?? { match: null });
    },
  },
  {
    method: 'POST',
    pattern: '/api/templates/:id/fill',
    handler: async ({ res, body, params }) => {
      const b = body as { idea?: string };
      if (!b?.idea) return json(res, 400, { error: 'idea requerida' });
      const t = getConceptTemplate(params['id']!);
      if (!t) return json(res, 404, { error: 'template no encontrado' });
      try {
        const filled = await fillTemplate(brand, t, b.idea);
        json(res, 200, {
          filled,
          asDraft: flattenToContentDraft(filled),
        });
      } catch (err) {
        json(res, 500, { error: String(err) });
      }
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // OUTREACH DM ENGINE — sequences + A/B + variant tracking
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'GET',
    pattern: '/api/outreach/templates',
    handler: ({ res, query }) => {
      const category = query['category'] as OutreachCategory | undefined;
      const list = category ? getOutreachByCategory(category) : [...OUTREACH_TEMPLATES];
      json(res, 200, { count: list.length, templates: list });
    },
  },
  {
    method: 'POST',
    pattern: '/api/outreach/recommend',
    handler: ({ res, body }) => {
      const b = body as { trigger?: OutreachTrigger; intensity?: 'baja' | 'media' | 'alta' };
      if (!b?.trigger) return json(res, 400, { error: 'trigger requerido' });
      const t = recommendOutreach(b.trigger, b.intensity);
      json(res, 200, t ?? { match: null });
    },
  },
  {
    method: 'POST',
    pattern: '/api/outreach/start',
    handler: ({ res, body }) => {
      const b = body as Parameters<typeof startSequence>[0];
      if (!b?.recipientHandle) return json(res, 400, { error: 'recipientHandle requerido' });
      const instance = startSequence(b);
      if (!instance) return json(res, 400, { error: 'no se pudo iniciar — template no encontrado' });
      json(res, 200, instance);
    },
  },
  {
    method: 'POST',
    pattern: '/api/outreach/:id/step-sent',
    handler: ({ res, body, params }) => {
      const b = body as { stepNumber?: number };
      if (!b?.stepNumber) return json(res, 400, { error: 'stepNumber requerido' });
      const updated = markStepSent(params['id']!, b.stepNumber);
      if (!updated) return json(res, 404, { error: 'outreach no encontrado' });
      json(res, 200, updated);
    },
  },
  {
    method: 'POST',
    pattern: '/api/outreach/:id/reply',
    handler: ({ res, params }) => {
      const updated = markReply(params['id']!);
      if (!updated) return json(res, 404, { error: 'outreach no encontrado' });
      json(res, 200, updated);
    },
  },
  {
    method: 'POST',
    pattern: '/api/outreach/:id/drop',
    handler: ({ res, body, params }) => {
      const b = (body ?? {}) as { reason?: string };
      const updated = markDropped(params['id']!, b.reason);
      if (!updated) return json(res, 404, { error: 'outreach no encontrado' });
      json(res, 200, updated);
    },
  },
  {
    method: 'GET',
    pattern: '/api/outreach/list',
    handler: ({ res, query }) => {
      json(
        res,
        200,
        listOutreach({
          templateId: query['templateId'] || undefined,
          outcome: query['outcome'] as never,
          recipientHandle: query['handle'] || undefined,
        }),
      );
    },
  },
  {
    method: 'GET',
    pattern: '/api/outreach/summary',
    handler: ({ res }) => json(res, 200, summarizeOutreach()),
  },

  // ════════════════════════════════════════════════════════════════════════
  // PIN STRATEGY — 3 ideal pinned posts (awareness / consideration / conversion)
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'GET',
    pattern: '/api/pins/recommend',
    handler: ({ res }) => json(res, 200, recommendPinSlate(brand)),
  },

  // ════════════════════════════════════════════════════════════════════════
  // KNOWLEDGE BASE — algorithm facts + format specs + brand learnings
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'GET',
    pattern: '/api/kb/facts',
    handler: ({ res, query }) => {
      const topic = query['topic'] as FactTopic | undefined;
      const list = topic ? ALGORITHM_FACTS.filter((f) => f.topic === topic) : [...ALGORITHM_FACTS];
      json(res, 200, { count: list.length, facts: list });
    },
  },
  {
    method: 'GET',
    pattern: '/api/kb/topics',
    handler: ({ res }) => json(res, 200, listFactTopics()),
  },
  {
    method: 'GET',
    pattern: '/api/kb/format-specs',
    handler: ({ res }) => json(res, 200, FORMAT_SPECS),
  },
  {
    method: 'POST',
    pattern: '/api/kb/recall',
    handler: ({ res, body }) => {
      const b = (body ?? {}) as Parameters<typeof recallFacts>[0];
      json(res, 200, recallFacts(b ?? {}));
    },
  },
  {
    method: 'POST',
    pattern: '/api/kb/grounding',
    handler: ({ res, body }) => {
      const b = body as Parameters<typeof buildGroundingContext>[0];
      if (!b?.intent) return json(res, 400, { error: 'intent requerido' });
      json(res, 200, buildGroundingContext({ ...b, brandId: b.brandId ?? brand.name }));
    },
  },
  {
    method: 'GET',
    pattern: '/api/kb/learnings',
    handler: ({ res }) => json(res, 200, listLearnings(brand.name)),
  },
  {
    method: 'POST',
    pattern: '/api/kb/learnings/query',
    handler: ({ res, body }) => {
      const b = (body ?? {}) as {
        category?: LearningCategory;
        keywords?: string[];
        limit?: number;
        minConfidence?: Confidence;
      };
      json(res, 200, queryLearnings({ brandId: brand.name, ...b }));
    },
  },
  {
    method: 'POST',
    pattern: '/api/kb/learnings/capture',
    handler: ({ res, body }) => {
      const b = body as {
        category?: LearningCategory;
        insight?: string;
        evidence?: string;
        tags?: string[];
        confidence?: Confidence;
      };
      if (!b?.category || !b?.insight || !b?.evidence) {
        return json(res, 400, { error: 'category, insight y evidence requeridos' });
      }
      json(res, 200, captureLearning({ brandId: brand.name, ...b } as Parameters<typeof captureLearning>[0]));
    },
  },
  {
    method: 'POST',
    pattern: '/api/kb/learnings/:id/delete',
    handler: ({ res, params }) => json(res, 200, { ok: deleteLearning(params['id']!) }),
  },

  // ════════════════════════════════════════════════════════════════════════
  // REASONING TRACES — auditable decision log
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'GET',
    pattern: '/api/traces/list',
    handler: ({ res, query }) => {
      const limit = Number(query['limit'] ?? '50');
      json(
        res,
        200,
        listTraces({
          brandId: brand.name,
          agentId: query['agent'] || undefined,
          decisionType: query['type'] as never,
          correlationId: query['correlationId'] || undefined,
          limit: Number.isFinite(limit) ? limit : 50,
        }),
      );
    },
  },
  {
    method: 'GET',
    pattern: '/api/traces/stats',
    handler: ({ res }) => json(res, 200, getTraceStats(brand.name)),
  },
  {
    method: 'GET',
    pattern: '/api/traces/:id',
    handler: ({ res, params }) => {
      const t = getTraceById(params['id']!);
      if (!t) return json(res, 404, { error: 'trace no encontrada' });
      json(res, 200, t);
    },
  },
  {
    method: 'POST',
    pattern: '/api/traces/:id/outcome',
    handler: ({ res, body, params }) => {
      const b = body as { metric?: string; value?: number; ranking?: 'better' | 'same' | 'worse'; notes?: string };
      if (!b?.metric || typeof b.value !== 'number' || !b.ranking) {
        return json(res, 400, { error: 'metric, value y ranking requeridos' });
      }
      const updated = recordOutcome(params['id']!, {
        metric: b.metric,
        value: b.value,
        ranking: b.ranking,
        notes: b.notes,
        measuredAt: new Date().toISOString(),
      });
      if (!updated) return json(res, 404, { error: 'trace no encontrada' });
      json(res, 200, updated);
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // MISSIONS — high-level goals decomposed + executed by orchestrator
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'GET',
    pattern: '/api/missions/library',
    handler: ({ res }) => json(res, 200, listPlaybookLibrary()),
  },
  {
    method: 'POST',
    pattern: '/api/missions/decompose',
    handler: ({ res, body }) => {
      const b = body as { freeIntent?: string; horizonDays?: number };
      if (!b?.freeIntent) return json(res, 400, { error: 'freeIntent requerido' });
      json(
        res,
        200,
        decomposeGoal({
          brandName: brand.name,
          freeIntent: b.freeIntent,
          horizonDays: b.horizonDays,
        }),
      );
    },
  },
  {
    method: 'POST',
    pattern: '/api/missions/launch',
    handler: async ({ res, body }) => {
      const b = body as { freeIntent?: string; horizonDays?: number; runNow?: boolean };
      if (!b?.freeIntent) return json(res, 400, { error: 'freeIntent requerido' });
      const decomp = decomposeGoal({
        brandName: brand.name,
        freeIntent: b.freeIntent,
        horizonDays: b.horizonDays,
      });
      const mission = createMission({
        brandId: brand.name,
        freeIntent: b.freeIntent,
        matchedIntent: decomp.matchedIntent,
        playbook: decomp.playbook,
      });
      if (b.runNow === false) {
        return json(res, 200, { mission, planOnly: true });
      }
      // Fire-and-forget run with the existing orchestrator. We don't block the
      // request — return mission immediately, update store async.
      void (async (): Promise<void> => {
        try {
          markMissionRunning(mission.id, decomp.playbook.id);
          const result = await runPlaybook(brand, decomp.playbook);
          markMissionDone(
            mission.id,
            result.status === 'completed' ? 'completed' : result.status === 'failed' ? 'failed' : 'completed',
            result.finalSummary,
            result.taskResults.filter((t) => t.status === 'completed').length,
          );
        } catch (err) {
          markMissionDone(mission.id, 'failed', String(err));
        }
      })();
      json(res, 202, { mission, planOnly: false, status: 'running' });
    },
  },
  {
    method: 'GET',
    pattern: '/api/missions/list',
    handler: ({ res, query }) => {
      json(
        res,
        200,
        listMissions({
          brandId: brand.name,
          status: query['status'] as never,
          limit: Number(query['limit'] ?? '20'),
        }),
      );
    },
  },
  {
    method: 'GET',
    pattern: '/api/missions/:id',
    handler: ({ res, params }) => {
      const m = getMissionById(params['id']!);
      if (!m) return json(res, 404, { error: 'mission no encontrada' });
      json(res, 200, m);
    },
  },
  {
    method: 'POST',
    pattern: '/api/missions/:id/cancel',
    handler: ({ res, params }) => {
      const updated = markMissionDone(params['id']!, 'cancelled', 'Cancelada por usuario');
      if (!updated) return json(res, 404, { error: 'mission no encontrada' });
      json(res, 200, updated);
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // BUDGET — gobierno de tokens/costo de LLM
  // ════════════════════════════════════════════════════════════════════════
  {
    // Cerebro Activado del Computer Use — estado de los 6 subsistemas.
    method: 'GET',
    pattern: '/api/autopilot/activated',
    handler: ({ res }) => json(res, 200, getActivatedState()),
  },
  {
    method: 'POST',
    pattern: '/api/autopilot/activated',
    handler: ({ res, body }) => {
      const b = (body ?? {}) as { activated?: boolean; moduleId?: AutopilotModuleId; enabled?: boolean };
      if (typeof b.activated === 'boolean') return json(res, 200, setActivated(b.activated));
      if (b.moduleId && typeof b.enabled === 'boolean') {
        return json(res, 200, setModuleEnabled(b.moduleId, b.enabled));
      }
      json(res, 400, { error: 'Enviá { activated: bool } o { moduleId, enabled: bool }' });
    },
  },
  {
    method: 'GET',
    pattern: '/api/system/ai-status',
    handler: ({ res }) => {
      const anthropic = hasApiKey();
      const groq = Boolean(process.env['GROQ_API_KEY']);
      const openrouter = Boolean(process.env['OPENROUTER_API_KEY']);
      const openai = Boolean(process.env['OPENAI_API_KEY']);
      const deepseek = Boolean(process.env['DEEPSEEK_API_KEY']);
      // El contenido (carruseles/reels) sólo necesita un LLM. Con cualquier
      // proveedor (gratis o barato) alcanza — Anthropic NO es obligatorio.
      const ready = anthropic || groq || openrouter || openai || deepseek;
      const activeName = anthropic
        ? 'Claude'
        : groq
          ? 'Groq (gratis)'
          : deepseek
            ? 'DeepSeek (~$0.27/Mtok)'
            : openrouter
              ? 'OpenRouter'
              : openai
                ? 'OpenAI'
                : 'ninguno';
      json(res, 200, {
        aiReady: ready,
        providers: { anthropic, groq, openrouter, openai, deepseek },
        reason: ready ? null : 'no_llm_provider',
        message: ready
          ? `IA operativa (${activeName}).`
          : 'IA desactivada: no hay ningún proveedor configurado. Opciones (de gratis a premium): GROQ_API_KEY (gratis · console.groq.com) · DEEPSEEK_API_KEY (~$0.27/Mtok · platform.deepseek.com) · OPENROUTER_API_KEY · ANTHROPIC_API_KEY. Agregá UNA en .env y reiniciá el servidor.',
      });
    },
  },
  {
    method: 'GET',
    pattern: '/api/budget',
    handler: ({ res }) => {
      json(res, 200, { actual: getBudgetStatus(), historial: getBudgetHistory() });
    },
  },
  {
    method: 'GET',
    pattern: '/api/bandits',
    handler: ({ res }) => {
      json(
        res,
        200,
        listBandits().map((id) => banditStats(id)),
      );
    },
  },
  {
    method: 'GET',
    pattern: '/api/cache/stats',
    handler: ({ res }) => {
      json(res, 200, semanticCacheStats());
    },
  },
  {
    method: 'GET',
    pattern: '/api/experience/brief',
    handler: async ({ res, query }) => {
      const brief = await buildExecutiveBrief(brand, {
        fundador: typeof query['fundador'] === 'string' ? query['fundador'] : undefined,
        conNarrativaIA: query['ia'] === '1',
      });
      json(res, 200, brief);
    },
  },
  {
    method: 'POST',
    pattern: '/api/command/route',
    handler: ({ res, body }) => {
      const b = (body ?? {}) as { text?: string };
      json(res, 200, routeCommand(brand, String(b.text ?? '')));
    },
  },
  {
    method: 'GET',
    pattern: '/api/experience/welcome',
    handler: ({ res }) => json(res, 200, getWelcome(brand)),
  },
  {
    method: 'GET',
    pattern: '/api/experience/activity',
    handler: ({ res }) => json(res, 200, humanizeActivity(brand.name, 30)),
  },
  {
    method: 'GET',
    pattern: '/api/experience/recap.svg',
    handler: ({ res }) => {
      res.statusCode = 200;
      res.setHeader('content-type', 'image/svg+xml; charset=utf-8');
      res.setHeader('content-disposition', `inline; filename="feedia-recap-${brand.name}.svg"`);
      res.end(recapSvg(brand));
    },
  },
  {
    method: 'GET',
    pattern: '/api/experience/recap.png',
    handler: ({ res }) => {
      const png = recapPng(brand);
      res.statusCode = 200;
      res.setHeader('content-type', 'image/png');
      res.setHeader('content-disposition', `attachment; filename="feedia-recap-${brand.name}.png"`);
      res.end(Buffer.from(png.buffer));
    },
  },
  {
    method: 'GET',
    pattern: '/api/experience/onepager',
    handler: ({ res }) => {
      res.statusCode = 200;
      res.setHeader('content-type', 'text/html; charset=utf-8');
      res.end(investorOnePagerHtml(brand));
    },
  },
  {
    method: 'GET',
    pattern: '/api/intelligence',
    handler: ({ res }) => {
      json(res, 200, {
        budget: getBudgetStatus(),
        bandits: listBandits().map((id) => banditStats(id)),
        cache: semanticCacheStats(),
        digest: digestSnapshot(brand),
      });
    },
  },
  {
    method: 'GET',
    pattern: '/api/swarm/recall',
    handler: ({ res, query }) => {
      const obj = typeof query['objetivo'] === 'string' ? query['objetivo'] : '';
      if (!obj) return json(res, 400, { error: 'objetivo requerido' });
      json(res, 200, recallSwarmMissions(obj, brand.name, 5));
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // CARRUSEL — fábrica de carruseles 100% automática
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/carousel/run',
    handler: ({ res, body }) => {
      const b = (body ?? {}) as { tema?: string; autoPublicar?: boolean; longitud?: 'corto' | 'medio' | 'largo' };
      void (async (): Promise<void> => {
        try {
          await runCarouselFactory(brand, {
            topic: b.tema,
            autoPublish: b.autoPublicar !== false,
            longitud: b.longitud ?? 'medio',
          });
        } catch {
          /* el job queda persistido por la fábrica */
        }
      })();
      json(res, 202, { status: 'running' });
    },
  },
  {
    method: 'GET',
    pattern: '/api/carousel/list',
    handler: ({ res }) => {
      json(res, 200, listCarouselJobs(brand.name).slice(0, 30));
    },
  },
  {
    method: 'GET',
    pattern: '/api/carousel/:id',
    handler: ({ res, params }) => {
      const j = getCarouselJob(params['id']!);
      if (!j) return json(res, 404, { error: 'carrusel no encontrado' });
      json(res, 200, j);
    },
  },
  {
    method: 'GET',
    pattern: '/api/carousel/:id/slide/:n',
    handler: ({ res, params, query }) => {
      if (query['fmt'] === 'png') {
        const png = readCarouselSlidePng(params['id']!, Number(params['n']));
        if (!png) return json(res, 404, { error: 'slide PNG no encontrado' });
        res.statusCode = 200;
        res.setHeader('content-type', 'image/png');
        res.setHeader('cache-control', 'public, max-age=3600');
        res.end(png);
        return;
      }
      const svg = readCarouselSlideSvg(params['id']!, Number(params['n']));
      if (!svg) return json(res, 404, { error: 'slide no encontrado' });
      res.statusCode = 200;
      res.setHeader('content-type', 'image/svg+xml; charset=utf-8');
      res.setHeader('cache-control', 'public, max-age=3600');
      res.end(svg);
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // SWARM — framework orquestador de agentes autónomos
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/swarm/mission',
    handler: async ({ res, body }) => {
      const b = body as { objetivo?: string; maxReintentosPorTarea?: number; maxReplanificaciones?: number };
      if (!b?.objetivo) return json(res, 400, { error: 'objetivo requerido' });
      // Fire-and-forget: la misión corre async; el cliente la sigue por GET.
      void (async (): Promise<void> => {
        try {
          await runSwarmMission(brand, b.objetivo!, {
            maxAttemptsPerTask: b.maxReintentosPorTarea,
            maxReplans: b.maxReplanificaciones,
          });
        } catch {
          /* el record queda persistido por el conductor */
        }
      })();
      json(res, 202, { status: 'running', objetivo: b.objetivo });
    },
  },
  {
    method: 'GET',
    pattern: '/api/swarm/missions',
    handler: ({ res }) => {
      json(res, 200, listSwarmMissions(brand.name).slice(0, 30));
    },
  },
  {
    method: 'GET',
    pattern: '/api/swarm/mission/:id',
    handler: ({ res, params }) => {
      const m = getSwarmMission(params['id']!);
      if (!m) return json(res, 404, { error: 'misión no encontrada' });
      json(res, 200, m);
    },
  },
  {
    method: 'GET',
    pattern: '/api/swarm/operations',
    handler: ({ res }) => {
      json(res, 200, getSwarmOpsStatus());
    },
  },
  {
    method: 'POST',
    pattern: '/api/swarm/operations/run',
    handler: ({ res, body }) => {
      const b = (body ?? {}) as { maxMisiones?: number };
      void (async (): Promise<void> => {
        try {
          await runSwarmOps(brand, { autonomy: 'fully_autonomous', maxMissions: b.maxMisiones });
        } catch {
          /* las misiones quedan persistidas por el conductor */
        }
      })();
      json(res, 202, { status: 'running' });
    },
  },
  {
    method: 'GET',
    pattern: '/api/swarm/blackboard/:id',
    handler: ({ res, params }) => {
      const bb = getSwarmBlackboard(params['id']!);
      if (!bb) return json(res, 404, { error: 'pizarra de misión no encontrada' });
      json(res, 200, bb);
    },
  },
  {
    // SSE: empuja lista de misiones (+ detalle/pizarra si se pasa ?id=)
    // cada 2s. Bridge poll→push: simple y confiable para Mission Control,
    // sin pub/sub adicional. Sólo emite cuando algo cambió.
    method: 'GET',
    pattern: '/api/swarm/stream',
    handler: ({ req, res, query }) => {
      res.statusCode = 200;
      res.setHeader('content-type', 'text/event-stream; charset=utf-8');
      res.setHeader('cache-control', 'no-cache, no-transform');
      res.setHeader('connection', 'keep-alive');
      res.setHeader('access-control-allow-origin', '*');
      if (typeof (res as { flushHeaders?: () => void }).flushHeaders === 'function') {
        (res as { flushHeaders: () => void }).flushHeaders();
      }
      const focusId = query['id'];
      let lastSnapshot = '';
      const push = (): void => {
        const missions = listSwarmMissions(brand.name).slice(0, 30);
        const detail = focusId ? getSwarmMission(focusId) : undefined;
        const board = focusId ? getSwarmBlackboard(focusId) : undefined;
        const snapshot = JSON.stringify({ missions, detail, board });
        if (snapshot === lastSnapshot) return;
        lastSnapshot = snapshot;
        try {
          res.write('event: swarm\n');
          res.write(`data: ${snapshot}\n\n`);
        } catch {
          /* peer cerrado */
        }
      };
      push();
      const tick = setInterval(push, 2000);
      const ping = setInterval(() => {
        try {
          res.write(': ping\n\n');
        } catch {
          /* cerrado */
        }
      }, 25_000);
      const cleanup = (): void => {
        clearInterval(tick);
        clearInterval(ping);
        try {
          res.end();
        } catch {
          /* ya cerrado */
        }
      };
      req.on('aborted', cleanup);
      res.on('close', cleanup);
      res.on('error', cleanup);
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // BUS — event history for observability
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'GET',
    pattern: '/api/bus/history',
    handler: ({ res, query }) => {
      const limit = Number(query['limit'] ?? '50');
      json(res, 200, getBusHistory(Number.isFinite(limit) ? limit : 50));
    },
  },
  {
    method: 'GET',
    pattern: '/api/bus/correlation/:id',
    handler: ({ res, params }) => json(res, 200, getEventsByCorrelation(params['id']!)),
  },

  // ════════════════════════════════════════════════════════════════════════
  // AGENT TAXONOMY — IBM 5-tier classification of every subsystem
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'GET',
    pattern: '/api/taxonomy/types',
    handler: ({ res }) =>
      internalsExposed() ? json(res, 200, listAgentTypes()) : json(res, 200, getPublicSystemView()),
  },
  {
    method: 'GET',
    pattern: '/api/taxonomy/agents',
    handler: ({ res, query }) => {
      if (!internalsExposed()) return json(res, 200, getPublicSystemView());
      const type = query['type'] as AgentType | undefined;
      const list = type ? getAgentsByType(type) : listClassifiedAgents();
      json(res, 200, { count: list.length, agents: list });
    },
  },
  {
    method: 'GET',
    pattern: '/api/taxonomy/departments',
    handler: ({ res }) =>
      internalsExposed() ? json(res, 200, listDepartments()) : json(res, 200, getPublicSystemView()),
  },

  // ════════════════════════════════════════════════════════════════════════
  // TALÍA — Agent Manager: org chart, employees, global-order delegation
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'GET',
    pattern: '/api/talia/org-chart',
    handler: ({ res }) =>
      internalsExposed() ? json(res, 200, buildOrgChart(brand.name)) : json(res, 200, getPublicSystemView()),
  },
  {
    method: 'GET',
    pattern: '/api/talia/employees',
    handler: ({ res }) =>
      internalsExposed() ? json(res, 200, getEmployeeDirectory(brand.name)) : json(res, 200, getPublicSystemView()),
  },
  {
    method: 'GET',
    pattern: '/api/talia/employees/:id',
    handler: ({ res, params }) => {
      if (!internalsExposed()) return json(res, 200, getPublicSystemView());
      const emp = getEmployee(brand.name, params['id']!);
      if (!emp) return json(res, 404, { error: 'empleado no encontrado en esta empresa' });
      json(res, 200, emp);
    },
  },
  {
    method: 'GET',
    pattern: '/api/talia/knowledge',
    handler: ({ res }) =>
      internalsExposed() ? json(res, 200, taliaSystemKnowledge(brand.name)) : json(res, 200, getPublicSystemView()),
  },
  {
    method: 'POST',
    pattern: '/api/talia/delegate',
    handler: ({ res, body }) => {
      const b = body as { order?: string; horizonDays?: number; createMission?: boolean };
      if (!b?.order) return json(res, 400, { error: 'order requerido' });
      try {
        const plan = delegateGlobalOrder({
          brand,
          globalOrder: b.order,
          horizonDays: b.horizonDays,
          createMissionRecord: b.createMission !== false,
        });
        if (internalsExposed()) {
          json(res, 200, plan);
        } else {
          // Sanitized: the user sees the order was understood and how many
          // steps it became — but NOT which internal agents/types handle it.
          json(res, 200, {
            understood: true,
            order: plan.globalOrder,
            steps: plan.assignments.length,
            plan: plan.assignments.map((a, i) => ({ step: i + 1, task: a.taskGoal })),
            missionId: plan.missionId,
            note: 'FeedIA recibió tu orden y la está ejecutando con su equipo de especialistas.',
          });
        }
      } catch (err) {
        json(res, 500, { error: String(err) });
      }
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // COMPUTER USE — cursor/keyboard control, Instagram navigation
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'GET',
    pattern: '/api/computer/targets',
    handler: ({ res }) => json(res, 200, { count: listTargets().length, targets: listTargets() }),
  },
  {
    method: 'GET',
    pattern: '/api/computer/runtime',
    handler: async ({ res }) =>
      json(res, 200, {
        liveRuntimeAvailable: await isLiveRuntimeAvailable(),
        computerUseEnabled: computerUseLiveEnabled(),
        computerUseLiveAvailable: await isComputerUseLiveAvailable(),
      }),
  },
  {
    method: 'POST',
    pattern: '/api/computer/plan',
    handler: ({ res, body }) => {
      const b = body as { instruction?: string; internalRoutes?: string[] };
      if (b?.internalRoutes?.length) {
        return json(res, 200, planInternalNavigation(b.internalRoutes));
      }
      if (!b?.instruction) return json(res, 400, { error: 'instruction o internalRoutes requerido' });
      json(res, 200, planComputerUse(b.instruction));
    },
  },
  {
    method: 'POST',
    pattern: '/api/computer/execute',
    handler: async ({ res, body }) => {
      const b = body as { instruction?: string; force?: boolean; baseUrl?: string };
      if (!b?.instruction) return json(res, 400, { error: 'instruction requerido' });
      try {
        const plan = planComputerUse(b.instruction);
        const result = await executePlan(plan, {
          brandId: brand.name,
          force: b.force === true,
          baseUrl: b.baseUrl,
        });
        json(res, 200, { plan, result });
      } catch (err) {
        json(res, 500, { error: String(err) });
      }
    },
  },
  {
    // Teatro en vivo: el usuario MIRA al sistema operar paso a paso.
    method: 'POST',
    pattern: '/api/computer/watch',
    handler: ({ res, body }) => {
      const b = body as { instruction?: string; speed?: number };
      if (!b?.instruction) return json(res, 400, { error: 'instruction requerido' });
      const r = startWatchSession(b.instruction, { brandId: brand.name, speed: b.speed });
      json(res, 202, r);
    },
  },
  {
    // Crear un carrusel en Canva EN VIVO — el agente abre Canva, tipea cada
    // slide, exporta. El usuario lo mira desde "Pantalla en vivo".
    method: 'POST',
    pattern: '/api/computer/watch-canva',
    handler: ({ res, body }) => {
      const b = (body ?? {}) as { slides?: CanvaSlide[]; titulo?: string; speed?: number; autoExportar?: boolean };
      if (!Array.isArray(b.slides) || b.slides.length === 0) {
        return json(res, 400, { error: 'slides requerido (array con {titulo,cuerpo})' });
      }
      const plan = planCanvaCarousel(b.slides, { titulo: b.titulo, autoExportar: b.autoExportar });
      const r = startWatchSession(plan.instruction, { brandId: brand.name, speed: b.speed, plan });
      json(res, 202, r);
    },
  },
  {
    // Editar un reel/video en CapCut Web EN VIVO (el agente arma la línea de
    // tiempo, agrega texto y exporta; el usuario lo mira en Pantalla en vivo).
    method: 'POST',
    pattern: '/api/computer/watch-capcut',
    handler: ({ res, body }) => {
      const b = (body ?? {}) as {
        beats?: CapCutBeat[];
        titulo?: string;
        relacion?: '9:16' | '1:1' | '16:9';
        speed?: number;
        autoExportar?: boolean;
      };
      if (!Array.isArray(b.beats) || b.beats.length === 0) {
        return json(res, 400, { error: 'beats requerido (array con {texto,segundos?,notaVisual?})' });
      }
      const plan = planCapCutVideo(b.beats, {
        titulo: b.titulo,
        relacion: b.relacion,
        autoExportar: b.autoExportar,
      });
      const r = startWatchSession(plan.instruction, { brandId: brand.name, speed: b.speed, plan });
      json(res, 202, r);
    },
  },
  {
    method: 'GET',
    pattern: '/api/computer/stream',
    handler: ({ req, res, query }) => {
      const sid = typeof query['session'] === 'string' ? query['session'] : '';
      subscribeWatch(sid, res);
      req.on('aborted', () => {
        try {
          res.end();
        } catch {
          /* cerrado */
        }
      });
    },
  },
  {
    method: 'GET',
    pattern: '/api/computer/sessions',
    handler: ({ res }) => {
      json(res, 200, listWatchSessions());
    },
  },
  {
    method: 'GET',
    pattern: '/api/computer/runs',
    handler: ({ res, query }) => {
      const limit = Number(query['limit'] ?? '20');
      json(res, 200, listComputerRuns(Number.isFinite(limit) ? limit : 20));
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // DIRECTIVES — Pizarra: standing instructions ("subí 1 carrusel por día")
  // parsed, scheduled and executed end-to-end by the autonomous system.
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'POST',
    pattern: '/api/directives/preview',
    handler: ({ res, body }) => {
      const b = body as { text?: string };
      if (!b?.text) return json(res, 400, { error: 'text requerido' });
      const { directive } = parseDirective(b.text);
      json(res, 200, {
        action: directive.action,
        recurrence: directive.recurrence,
        contentSpec: directive.contentSpec,
        interpretation: directive.interpretation,
      });
    },
  },
  {
    method: 'POST',
    pattern: '/api/directives',
    handler: ({ res, body }) => {
      const b = body as { text?: string; source?: string };
      if (!b?.text) return json(res, 400, { error: 'text requerido' });
      const source = (
        ['voz', 'pizarra', 'calendario', 'agenda', 'texto'].includes(b.source ?? '') ? b.source : 'pizarra'
      ) as Parameters<typeof createDirective>[2];
      json(res, 200, createDirective(brand.name, b.text, source));
    },
  },
  {
    method: 'GET',
    pattern: '/api/directives',
    handler: ({ res, query }) => {
      const status = query['status'] as Parameters<typeof listDirectives>[1];
      json(res, 200, listDirectives(brand.name, status));
    },
  },
  {
    method: 'POST',
    pattern: '/api/directives/:id/status',
    handler: ({ res, params, body }) => {
      const b = body as { status?: 'active' | 'paused' | 'completed' | 'error' };
      if (!b?.status) return json(res, 400, { error: 'status requerido' });
      const d = updateDirectiveStatus(params['id']!, b.status);
      if (!d) return json(res, 404, { error: 'directiva no encontrada' });
      json(res, 200, d);
    },
  },
  {
    method: 'POST',
    pattern: '/api/directives/:id/run',
    handler: async ({ res, params }) => {
      const d = getDirective(params['id']!);
      if (!d) return json(res, 404, { error: 'directiva no encontrada' });
      try {
        const run = await executeDirective(brand, d);
        recordRun(run, computeNextRun(d.recurrence));
        json(res, 200, run);
      } catch (err) {
        json(res, 500, { error: String(err) });
      }
    },
  },
  {
    method: 'POST',
    pattern: '/api/directives/:id/delete',
    handler: ({ res, params }) => json(res, 200, { ok: deleteDirective(params['id']!) }),
  },
  {
    method: 'GET',
    pattern: '/api/directives/runs',
    handler: ({ res, query }) => {
      const limit = Number(query['limit'] ?? '30');
      json(res, 200, listRuns(query['directiveId'] || undefined, Number.isFinite(limit) ? limit : 30));
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // WHITEBOARD — Pizarra virtual (dibujo, notas, mapas, timelines) + interpret
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'GET',
    pattern: '/api/whiteboard',
    handler: ({ res, query }) => json(res, 200, getBoard(brand.name, query['board'] || undefined)),
  },
  {
    method: 'PUT',
    pattern: '/api/whiteboard',
    handler: ({ res, body, query }) => {
      const b = body as { elements?: WbElement[] };
      if (!Array.isArray(b?.elements)) return json(res, 400, { error: 'elements[] requerido' });
      json(res, 200, saveBoard(brand.name, b.elements, query['board'] || undefined));
    },
  },
  // ── Multi-pizarra: listar / crear / renombrar / borrar / activar ───────
  {
    method: 'GET',
    pattern: '/api/whiteboard/boards',
    handler: ({ res }) => json(res, 200, listBoards(brand.name)),
  },
  {
    method: 'POST',
    pattern: '/api/whiteboard/boards',
    handler: ({ res, body }) => {
      const b = body as { name?: string };
      json(res, 200, createBoard(brand.name, b?.name ?? ''));
    },
  },
  {
    method: 'POST',
    pattern: '/api/whiteboard/boards/:id/rename',
    handler: ({ res, params, body }) => {
      const b = body as { name?: string };
      if (!b?.name) return json(res, 400, { error: 'name requerido' });
      json(res, 200, { ok: renameBoard(brand.name, params['id']!, b.name) });
    },
  },
  {
    method: 'POST',
    pattern: '/api/whiteboard/boards/:id/delete',
    handler: ({ res, params }) => json(res, 200, { ok: deleteBoard(brand.name, params['id']!) }),
  },
  {
    method: 'POST',
    pattern: '/api/whiteboard/boards/:id/activate',
    handler: ({ res, params }) => json(res, 200, { ok: setActiveBoard(brand.name, params['id']!) }),
  },
  {
    method: 'POST',
    pattern: '/api/whiteboard/interpret',
    handler: async ({ res, body }) => {
      const b = body as { elements?: WbElement[] };
      const elements = Array.isArray(b?.elements) ? b.elements : getBoard(brand.name).elements;
      try {
        if (Array.isArray(b?.elements)) saveBoard(brand.name, b.elements);
        const result = await interpretBoard(brand, elements);
        recordInterpretation(
          brand.name,
          result.understood,
          result.createdDirectives.map((d) => d.id),
        );
        json(res, 200, result);
      } catch (err) {
        json(res, 500, { error: String(err) });
      }
    },
  },
  {
    method: 'POST',
    pattern: '/api/whiteboard/interpret-visual',
    handler: async ({ res, body }) => {
      const b = body as { imageBase64?: string };
      if (!b?.imageBase64) return json(res, 400, { error: 'imageBase64 requerido' });
      try {
        const result = await interpretBoardVisual(brand, b.imageBase64);
        recordInterpretation(
          brand.name,
          result.understood,
          result.createdDirectives.map((d) => d.id),
        );
        json(res, 200, result);
      } catch (err) {
        json(res, 500, { error: String(err) });
      }
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // AGENDA — cronograma de directivas + items manuales
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'GET',
    pattern: '/api/agenda',
    handler: ({ res }) => {
      const manual = listAgenda(brand.name);
      // Merge upcoming directive runs into the agenda view.
      const fromDirectives = listDirectives(brand.name, 'active')
        .filter((d) => d.nextRunAt)
        .map((d) => ({
          id: `dir:${d.id}`,
          brandId: brand.name,
          title: d.interpretation,
          at: d.nextRunAt!,
          done: false,
          directiveId: d.id,
          notes: `"${d.rawText}"`,
          fromDirective: true,
        }));
      const merged = [...manual.map((m) => ({ ...m, fromDirective: false })), ...fromDirectives].sort(
        (a, b) => Date.parse(a.at) - Date.parse(b.at),
      );
      json(res, 200, merged);
    },
  },
  {
    method: 'POST',
    pattern: '/api/agenda',
    handler: ({ res, body }) => {
      const b = body as { title?: string; at?: string; notes?: string };
      if (!b?.title || !b?.at) return json(res, 400, { error: 'title y at requeridos' });
      json(res, 200, addAgendaItem(brand.name, b.title, b.at, b.notes));
    },
  },
  {
    method: 'POST',
    pattern: '/api/agenda/:id/done',
    handler: ({ res, params, body }) => {
      const b = (body ?? {}) as { done?: boolean };
      const it = setAgendaDone(params['id']!, b.done !== false);
      if (!it) return json(res, 404, { error: 'item no encontrado' });
      json(res, 200, it);
    },
  },
  {
    method: 'POST',
    pattern: '/api/agenda/:id/delete',
    handler: ({ res, params }) => json(res, 200, { ok: deleteAgendaItem(params['id']!) }),
  },

  // ── Pizarra: plantillas + versionado ───────────────────────────────────
  {
    method: 'GET',
    pattern: '/api/whiteboard/templates',
    handler: ({ res }) => json(res, 200, listBoardTemplates()),
  },
  {
    method: 'GET',
    pattern: '/api/whiteboard/templates/:id',
    handler: ({ res, params }) => {
      const els = buildBoardTemplate(params['id']!);
      if (!els) return json(res, 404, { error: 'plantilla no encontrada' });
      json(res, 200, { elements: els });
    },
  },
  {
    method: 'POST',
    pattern: '/api/whiteboard/snapshot',
    handler: ({ res, body }) => {
      const b = (body ?? {}) as { label?: string };
      json(res, 200, saveSnapshot(brand.name, b.label ?? ''));
    },
  },
  {
    method: 'GET',
    pattern: '/api/whiteboard/snapshots',
    handler: ({ res }) => json(res, 200, listSnapshots(brand.name)),
  },
  {
    method: 'POST',
    pattern: '/api/whiteboard/snapshots/:id/restore',
    handler: ({ res, params }) => {
      const r = restoreSnapshot(brand.name, params['id']!);
      if (!r) return json(res, 404, { error: 'versión no encontrada' });
      json(res, 200, r);
    },
  },

  // ════════════════════════════════════════════════════════════════════════
  // WORKSPACE TOOLS — aprobaciones, bitácora, alertas, kanban, moodboard,
  // reportes, simulador (componen datos ya existentes, solo lectura)
  // ════════════════════════════════════════════════════════════════════════
  {
    method: 'GET',
    pattern: '/api/approvals',
    handler: ({ res }) => json(res, 200, getApprovalQueue(brand.name)),
  },
  {
    method: 'POST',
    pattern: '/api/approvals/:id/:decision',
    handler: ({ res, params, body }) => {
      const dec = params['decision'] === 'approve' ? 'approve' : 'reject';
      const b = (body ?? {}) as { note?: string };
      json(res, 200, actOnApproval(params['id']!, dec, b.note));
    },
  },
  {
    method: 'GET',
    pattern: '/api/bitacora',
    handler: ({ res, query }) => {
      const limit = Number(query['limit'] ?? '60');
      json(res, 200, getBitacora(brand.name, Number.isFinite(limit) ? limit : 60));
    },
  },
  {
    method: 'GET',
    pattern: '/api/alerts',
    handler: ({ res }) => json(res, 200, getAlertCenter(brand.name)),
  },
  {
    method: 'GET',
    pattern: '/api/kanban',
    handler: ({ res }) => json(res, 200, getKanban(brand.name)),
  },
  {
    method: 'GET',
    pattern: '/api/moodboard',
    handler: ({ res }) => json(res, 200, getMoodboard(brand)),
  },
  {
    method: 'GET',
    pattern: '/api/report',
    handler: ({ res }) => json(res, 200, getReportData(brand)),
  },
  {
    method: 'POST',
    pattern: '/api/simulate',
    handler: ({ res, body }) => {
      const b = body as { instruction?: string };
      if (!b?.instruction) return json(res, 400, { error: 'instruction requerido' });
      json(res, 200, runSimulation(b.instruction));
    },
  },

  // ── Modo Cliente: resumen sanitizado, sin exponer la operación interna ──
  {
    method: 'GET',
    pattern: '/api/client-view',
    handler: ({ res }) => {
      const r = getReportData(brand);
      const q = getApprovalQueue(brand.name);
      json(res, 200, {
        brand: r.brand,
        niche: brand.niche,
        generatedAt: r.generatedAt,
        contenidoActivo: r.directives.active,
        piezasPublicadas: r.runs.ok,
        enRevision: r.runs.partial,
        pendientesDeTuOk: q.count,
        estado: r.crisisActive ? 'requiere-atencion' : 'saludable',
        // Deliberadamente NO se exponen: agentes, trazas, taxonomía,
        // org-chart ni cantidad de motores internos.
      });
    },
  },

  // ── Multi-tenant EN CALIENTE: lista + cambio de cuenta sin reiniciar ────
  {
    method: 'GET',
    pattern: '/api/brand-profiles',
    handler: ({ res }) => {
      json(res, 200, {
        profiles: listBrandProfiles(),
        active: brand.name,
        activeFile: getActiveBrandFile(),
        note: 'Cambio de cuenta EN CALIENTE: se aplica al instante, sin reiniciar el daemon.',
      });
    },
  },
  {
    method: 'POST',
    pattern: '/api/brand-profiles/activate',
    handler: ({ res, body }) => {
      const b = body as { file?: string };
      if (!b?.file) return json(res, 400, { error: 'file requerido' });
      const result = activateBrandProfile(b.file);
      if (!result.ok) return json(res, 400, result);
      // re-inicializar memoria scopeada a la nueva marca
      try {
        initMemory(brand);
      } catch {
        /* no bloquea */
      }
      json(res, 200, result);
    },
  },

  // ── Pizarra colaborativa en tiempo real (SSE) — sala por pizarra ───────
  {
    method: 'GET',
    pattern: '/api/whiteboard/stream',
    handler: ({ req, res, query }) => {
      const peerId = query['peerId'] || `peer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const name = query['name'] || 'Invitado';
      const boardId = query['board'] || getBoard(brand.name).boardId || 'default';
      subscribe(roomKey(brand.name, boardId), peerId, name, res);
      req.on('aborted', () => {
        try {
          res.end();
        } catch {
          /* ya cerrado */
        }
      });
    },
  },
  {
    method: 'POST',
    pattern: '/api/whiteboard/op',
    handler: ({ res, body, query }) => {
      const b = body as { peerId?: string; op?: CollabOp; invite?: string };
      if (!b?.peerId || !b?.op) return json(res, 400, { error: 'peerId y op requeridos' });
      const boardId = query['board'] || getBoard(brand.name).boardId || 'default';
      const key = roomKey(brand.name, boardId);
      const op = b.op;
      // Enforcement de rol: un viewer sólo puede cursor/selección.
      const role = roleFor(b.invite || query['invite'] || undefined);
      if (role === 'viewer' && isMutatingOp(op.kind)) {
        return json(res, 403, { error: 'Solo lectura: tu invitación no permite editar.' });
      }
      // Persistir ops CRDT por-elemento en el store (verdad servidor).
      if (op.kind === 'element-upsert')
        applyElementOp(brand.name, { kind: 'upsert', element: op.element as WbElement }, boardId);
      else if (op.kind === 'element-delete') applyElementOp(brand.name, { kind: 'delete', id: op.id }, boardId);
      else if (op.kind === 'board-replace') saveBoard(brand.name, op.elements as WbElement[], boardId, b.peerId);
      const r = publishOp(key, b.peerId, op);
      json(res, 200, { ...r, online: presenceCount(key) });
    },
  },
  {
    method: 'GET',
    pattern: '/api/whiteboard/presence',
    handler: ({ res, query }) => {
      const boardId = query['board'] || getBoard(brand.name).boardId || 'default';
      json(res, 200, { online: presenceCount(roomKey(brand.name, boardId)) });
    },
  },

  // ── Permisos por pizarra: links de invitación con scope ───────────────
  {
    method: 'POST',
    pattern: '/api/whiteboard/invite',
    handler: ({ res, body, query }) => {
      const b = (body ?? {}) as { role?: 'editor' | 'viewer'; expiresInHours?: number; label?: string };
      const boardId = query['board'] || getBoard(brand.name).boardId || 'default';
      json(
        res,
        200,
        createInvite({
          brandId: brand.name,
          boardId,
          role: b.role === 'viewer' ? 'viewer' : 'editor',
          expiresInHours: b.expiresInHours,
          label: b.label,
        }),
      );
    },
  },
  {
    method: 'GET',
    pattern: '/api/whiteboard/invites',
    handler: ({ res, query }) => {
      const boardId = query['board'] || undefined;
      json(res, 200, listInvites(brand.name, boardId));
    },
  },
  {
    method: 'POST',
    pattern: '/api/whiteboard/invites/:token/revoke',
    handler: ({ res, params }) => json(res, 200, { ok: revokeInvite(params['token']!) }),
  },
  {
    method: 'GET',
    pattern: '/api/whiteboard/invite/:token',
    handler: ({ res, params }) => json(res, 200, resolveInvite(params['token']!)),
  },

  // ── Op-log / auditoría + revertir última op (undo colaborativo) ───────
  {
    method: 'GET',
    pattern: '/api/whiteboard/oplog',
    handler: ({ res, query }) => {
      const boardId = query['board'] || undefined;
      const limit = Number(query['limit'] ?? '60');
      json(res, 200, listOpLog(brand.name, boardId, Number.isFinite(limit) ? limit : 60));
    },
  },
  {
    method: 'POST',
    pattern: '/api/whiteboard/revert-last',
    handler: ({ res, body, query }) => {
      const boardId = query['board'] || getBoard(brand.name).boardId || 'default';
      const r = revertLastOp(brand.name, boardId);
      if (!r.ok) return json(res, 400, r);
      // notificar a los peers con el board nuevo
      const st = getBoard(brand.name, boardId);
      const b = (body ?? {}) as { peerId?: string };
      publishOp(roomKey(brand.name, boardId), b.peerId || 'server', { kind: 'board-replace', elements: st.elements });
      json(res, 200, r);
    },
  },

  // ── Preview de impacto al cambiar de cuenta (sin activar) ──────────────
  {
    method: 'GET',
    pattern: '/api/brand-profiles/:file/preview',
    handler: ({ res, params }) => {
      const file = decodeURIComponent(params['file']!);
      const target = listBrandProfiles().find((p) => p.file === file);
      if (!target) return json(res, 404, { error: 'perfil no encontrado o inválido' });
      // Todos los stores son por-brandId (JSON en disco): consultamos por el
      // NOMBRE de la cuenta destino SIN activarla.
      let directivasActivas = 0;
      let aprobacionesPend = 0;
      let pizarras = 0;
      try {
        directivasActivas = listDirectives(target.name, 'active').length;
      } catch {
        /* nuevo */
      }
      try {
        aprobacionesPend = getApprovalQueue(target.name).count;
      } catch {
        /* nuevo */
      }
      try {
        pizarras = listBoards(target.name).boards.length;
      } catch {
        /* nuevo */
      }
      json(res, 200, {
        file: target.file,
        name: target.name,
        niche: target.niche,
        impacto: {
          directivasActivas,
          aprobacionesPendientes: aprobacionesPend,
          pizarras,
        },
        aviso: 'Al activar, TODO el sistema pasa a operar esta cuenta al instante.',
      });
    },
  },
];

// Internal helper — adds a stub prospect for discovery requests
async function procesarObservacionesCollab(_brand: BrandProfile, nicho: string): Promise<boolean> {
  try {
    upsertProspect({
      id: `discovery_${Date.now()}`,
      handle: `@busqueda_${nicho.replace(/\s+/g, '_')}`,
      nicho,
      alineacion: 0,
      riesgoMarca: 'bajo',
      motivacion: `Búsqueda automática por nicho: ${nicho}`,
      formatoColabSugerido: 'menciones-cruzadas',
      status: 'nuevo',
      notas: `Generado por búsqueda de nicho desde dashboard`,
      capturadoEn: new Date().toISOString(),
    });
    return true;
  } catch {
    return false;
  }
}
