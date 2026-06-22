/**
 * Workspace Aggregators
 * ─────────────────────────────────────────────────────────────────────────
 * Read-only views that compose data already produced by the system into the
 * new operator tools. No new state — these reuse checkpoints, reasoning
 * traces, directives, crisis state, brand kit, etc.
 *
 *   • getApprovalQueue   → cola única de pendientes (checkpoints + retenidos)
 *   • getBitacora        → trazas en lenguaje humano (diario de la IA)
 *   • getAlertCenter     → crisis + compliance + oportunidades consolidadas
 *   • getKanban          → pipeline de contenido por columnas
 *   • getMoodboard       → identidad de marca (brand kit) resumida
 *   • getReportData      → datos para reporte imprimible
 *   • runSimulation      → "¿qué pasaría si...?" determinista (sin LLM)
 */

import type { BrandProfile } from '../../config/types.js';
import { listCheckpoints, approveCheckpoint, rejectCheckpoint } from '../../agent/checkpoints.js';
import { listTraces, getTraceStats } from '../reasoningTrace/index.js';
import { getCrisisState, isPausado } from '../crisis/index.js';
import { listDirectives, listRuns } from '../directives/index.js';
import { getHistory as busHistory } from '../../agent/bus.js';
import { parseDirective } from '../directives/index.js';
import { env } from '../../config/index.js';

/* ── Bandeja de Aprobaciones ─────────────────────────────────────────────── */

export interface ApprovalItem {
  kind: 'checkpoint' | 'held-content';
  id: string;
  title: string;
  detail: string;
  createdAt: string;
  /** checkpoint id when actionable. */
  actionableId?: string;
}

export const getApprovalQueue = (
  brandId: string,
): {
  count: number;
  items: ApprovalItem[];
} => {
  const cps = listCheckpoints('pending').map<ApprovalItem>((c) => ({
    kind: 'checkpoint',
    id: c.id,
    title: c.description || c.type,
    detail: `Tipo: ${c.type} · correlación ${c.correlationId ?? '—'}`,
    createdAt: c.createdAt,
    actionableId: c.id,
  }));
  // Directive runs that were held for human review (status partial).
  const held = listRuns(undefined, 60)
    .filter((r) => r.status === 'partial')
    .map<ApprovalItem>((r) => ({
      kind: 'held-content',
      id: r.id,
      title: r.summary,
      detail: r.steps.map((s) => `${s.status === 'ok' ? '✓' : '✗'} ${s.label}`).join(' · '),
      createdAt: r.startedAt,
    }));
  void brandId;
  const items = [...cps, ...held].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return { count: items.length, items };
};

export const actOnApproval = (id: string, decision: 'approve' | 'reject', note?: string): { ok: boolean } => {
  const r = decision === 'approve' ? approveCheckpoint(id, note) : rejectCheckpoint(id, note);
  return { ok: Boolean(r) };
};

/* ── Bitácora / Diario de la IA ──────────────────────────────────────────── */

export const getBitacora = (
  brandId: string,
  limit = 60,
): {
  stats: ReturnType<typeof getTraceStats>;
  entries: Array<{ at: string; agent: string; what: string; why: string; outcome?: string }>;
} => {
  const traces = listTraces({ brandId, limit });
  return {
    stats: getTraceStats(brandId),
    entries: traces.map((t) => ({
      at: t.createdAt,
      agent: t.agentId,
      what: `${t.decisionType}: eligió "${t.chosen}"`,
      why: t.reasoning,
      outcome: t.outcome ? `${t.outcome.ranking} (${t.outcome.metric}=${t.outcome.value})` : undefined,
    })),
  };
};

/* ── Centro de Alertas ───────────────────────────────────────────────────── */

export interface AlertEntry {
  level: 'critica' | 'alta' | 'media' | 'info';
  source: string;
  message: string;
  at: string;
}

export const getAlertCenter = (
  brandId: string,
): {
  count: number;
  critical: number;
  alerts: AlertEntry[];
} => {
  const alerts: AlertEntry[] = [];
  const now = new Date().toISOString();

  try {
    if (isPausado()) {
      alerts.push({
        level: 'critica',
        source: 'Crisis',
        message: 'Publicaciones PAUSADAS por crisis activa.',
        at: now,
      });
    }
    const cs = getCrisisState();
    const enObs = cs.postsEnObservacion?.length ?? 0;
    if (enObs > 0)
      alerts.push({ level: 'alta', source: 'Crisis', message: `${enObs} post(s) en observación.`, at: now });
  } catch {
    /* sin crisis */
  }

  // Compliance posture
  const cp = env.compliance;
  alerts.push({
    level: 'info',
    source: 'Compliance',
    message: `Límites: ${cp.maxDailyPublish}/día publicaciones · ${cp.maxDailyDm}/día DMs · ${cp.maxDailyComments}/día comentarios.`,
    at: now,
  });

  // Pending approvals as a soft alert
  const pend = listCheckpoints('pending').length;
  if (pend > 0)
    alerts.push({
      level: pend > 3 ? 'alta' : 'media',
      source: 'Aprobaciones',
      message: `${pend} pendiente(s) de aprobación.`,
      at: now,
    });

  // Viral opportunities / errors from the event bus
  for (const e of busHistory(40)) {
    if (e.type === 'ViralOpportunity') {
      alerts.push({
        level: 'media',
        source: 'Trend Radar',
        message: `Oportunidad viral: ${String(e.payload['topic'] ?? '')}`,
        at: e.timestamp,
      });
    }
    if (e.type === 'DirectiveExecuted' && e.payload['status'] === 'failed') {
      alerts.push({
        level: 'alta',
        source: 'Directivas',
        message: `Directiva falló (${String(e.payload['action'] ?? '')}).`,
        at: e.timestamp,
      });
    }
  }

  void brandId;
  alerts.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  return {
    count: alerts.length,
    critical: alerts.filter((a) => a.level === 'critica').length,
    alerts,
  };
};

/* ── Tablero Kanban de contenido ─────────────────────────────────────────── */

export const getKanban = (
  brandId: string,
): {
  columns: Array<{ key: string; title: string; cards: Array<{ id: string; title: string; meta: string }> }>;
} => {
  const dirs = listDirectives(brandId);
  const runs = listRuns(undefined, 80);

  const ideas = dirs
    .filter((d) => d.status === 'active' && d.runCount === 0)
    .map((d) => ({ id: d.id, title: d.rawText, meta: d.interpretation }));
  const producing = dirs
    .filter((d) => d.runCount > 0 && d.status === 'active')
    .map((d) => ({ id: d.id, title: d.rawText, meta: `${d.runCount} ejecución(es)` }));
  const review = runs
    .filter((r) => r.status === 'partial')
    .map((r) => ({ id: r.id, title: r.summary, meta: 'retenido para revisión' }));
  const done = runs
    .filter((r) => r.status === 'ok')
    .slice(0, 30)
    .map((r) => ({ id: r.id, title: r.summary, meta: new Date(r.startedAt).toLocaleDateString('es-AR') }));

  return {
    columns: [
      { key: 'idea', title: '💡 Idea', cards: ideas },
      { key: 'producing', title: '⚙️ Producción', cards: producing },
      { key: 'review', title: '👀 Aprobación', cards: review },
      { key: 'done', title: '✅ Publicado', cards: done },
    ],
  };
};

/* ── Moodboard / Brand Board ─────────────────────────────────────────────── */

export const getMoodboard = (
  brand: BrandProfile,
): {
  name: string;
  niche: string;
  palette: string[];
  typography: string[];
  style: string;
  mood: string;
  voiceTone: string[];
  forbidden: string[];
  allowedIconography: string[];
  forbiddenIconography: string[];
} => ({
  name: brand.name,
  niche: brand.niche,
  palette: brand.visual.palette,
  typography: brand.visual.typography,
  style: brand.visual.style,
  mood: brand.visual.mood,
  voiceTone: brand.voice.tone,
  forbidden: brand.voice.forbidden,
  allowedIconography: brand.visual.allowedIconography,
  forbiddenIconography: brand.visual.forbiddenIconography,
});

/* ── Datos para Reporte imprimible ───────────────────────────────────────── */

export const getReportData = (
  brand: BrandProfile,
): {
  brand: string;
  generatedAt: string;
  directives: { total: number; active: number };
  runs: { total: number; ok: number; partial: number; failed: number };
  decisions: ReturnType<typeof getTraceStats>;
  approvalsPending: number;
  crisisActive: boolean;
} => {
  const dirs = listDirectives(brand.name);
  const runs = listRuns(undefined, 200);
  return {
    brand: brand.name,
    generatedAt: new Date().toISOString(),
    directives: { total: dirs.length, active: dirs.filter((d) => d.status === 'active').length },
    runs: {
      total: runs.length,
      ok: runs.filter((r) => r.status === 'ok').length,
      partial: runs.filter((r) => r.status === 'partial').length,
      failed: runs.filter((r) => r.status === 'failed').length,
    },
    decisions: getTraceStats(brand.name),
    approvalsPending: listCheckpoints('pending').length,
    crisisActive: ((): boolean => {
      try {
        return isPausado();
      } catch {
        return false;
      }
    })(),
  };
};

/* ── Simulador "¿Qué pasaría si...?" ─────────────────────────────────────── */

export const runSimulation = (
  instruction: string,
): {
  understood: string;
  action: string;
  recurrence: string;
  projection: {
    perWeek: number;
    perMonth: number;
    autoPublish: boolean;
    estImpact: string;
  };
} => {
  const { directive } = parseDirective(instruction);
  const r = directive.recurrence;
  const perWeek =
    r.kind === 'daily'
      ? r.times * 7
      : r.kind === 'weekly'
        ? r.times
        : r.kind === 'hourly'
          ? Math.round((24 / r.everyHours) * 7)
          : r.kind === 'continuous'
            ? 0
            : 0;
  const isPublish = directive.action.startsWith('publish-');
  const estImpact = !isPublish
    ? 'Acción operativa (no genera piezas) — mantiene la cuenta atendida.'
    : perWeek >= 7
      ? 'Cadencia alta: fuerte presencia, vigilar fatiga de audiencia y calidad.'
      : perWeek >= 3
        ? 'Cadencia saludable: buen balance presencia/calidad.'
        : 'Cadencia baja: consistencia mínima, complementar con otras directivas.';
  return {
    understood: directive.interpretation,
    action: directive.action,
    recurrence: r.kind,
    projection: {
      perWeek,
      perMonth: perWeek * 4,
      autoPublish: directive.contentSpec.autoPublish,
      estImpact,
    },
  };
};
