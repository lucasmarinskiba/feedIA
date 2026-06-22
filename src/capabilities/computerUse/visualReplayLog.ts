/**
 * Visual Replay Log de FeedIA — registro paso-a-paso con screenshots.
 *
 * Cada sesión de Computer Use deja un trail completo: qué se hizo, cuándo, qué
 * se vio en pantalla, qué decisión tomó el agente. El usuario puede revisar
 * la sesión como si fuera una grabación, con narrativa adjunta.
 *
 * Complementa `liveSession.ts` (que stream en tiempo real) con persistencia
 * histórica para auditoría.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import { takeScreenshot } from './controller.js';

const REPLAY_PATH = join(process.cwd(), 'data', 'replays');
const REPLAY_INDEX_PATH = join(REPLAY_PATH, 'index.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type StepActionType =
  | 'launch-app'
  | 'navigate-url'
  | 'click'
  | 'type'
  | 'scroll'
  | 'drag'
  | 'screenshot'
  | 'wait'
  | 'detect-element'
  | 'decision' // razonamiento del agente
  | 'export-file'
  | 'upload-file'
  | 'verify'
  | 'error';

export interface ReplayStep {
  stepNumber: number;
  at: string; // ISO
  actionType: StepActionType;
  description: string;
  rationale?: string;
  screenshotPath?: string;
  coords?: { x: number; y: number };
  text?: string; // si typed
  durationMs: number;
  ok: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface ReplaySession {
  id: string;
  workflowName: string;
  brandName: string;
  startedAt: string;
  endedAt?: string;
  totalDurationMs?: number;
  steps: ReplayStep[];
  summary?: string;
  outcome: 'in-progress' | 'success' | 'partial' | 'failed' | 'cancelled';
  outputs?: {
    files?: string[];
    publishedUrls?: string[];
    metrics?: Record<string, unknown>;
  };
  tags: string[];
}

interface ReplayIndex {
  sessions: Array<{
    id: string;
    workflowName: string;
    brandName: string;
    startedAt: string;
    endedAt?: string;
    outcome: ReplaySession['outcome'];
    stepCount: number;
  }>;
  lastUpdated: string;
}

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  if (!existsSync(REPLAY_PATH)) mkdirSync(REPLAY_PATH, { recursive: true });
};

const sessionPath = (id: string): string => join(REPLAY_PATH, `${id}.json`);
const sessionFolderPath = (id: string): string => join(REPLAY_PATH, id);

const loadIndex = (): ReplayIndex => {
  try {
    ensureDir();
    if (!existsSync(REPLAY_INDEX_PATH)) return { sessions: [], lastUpdated: new Date().toISOString() };
    return JSON.parse(readFileSync(REPLAY_INDEX_PATH, 'utf8')) as ReplayIndex;
  } catch {
    return { sessions: [], lastUpdated: new Date().toISOString() };
  }
};

const saveIndex = (index: ReplayIndex): void => {
  ensureDir();
  index.lastUpdated = new Date().toISOString();
  writeFileSync(REPLAY_INDEX_PATH, JSON.stringify(index, null, 2), 'utf8');
};

const loadSession = (id: string): ReplaySession | null => {
  try {
    const path = sessionPath(id);
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf8')) as ReplaySession;
  } catch {
    return null;
  }
};

const saveSession = (session: ReplaySession): void => {
  ensureDir();
  writeFileSync(sessionPath(session.id), JSON.stringify(session, null, 2), 'utf8');
};

// ── API: iniciar / cerrar sesión ──────────────────────────────────────────────

export const startReplaySession = (workflowName: string, brandName: string, tags: string[] = []): ReplaySession => {
  const id = `replay-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
  ensureDir();

  // Carpeta dedicada a screenshots de esta sesión
  const folder = sessionFolderPath(id);
  if (!existsSync(folder)) mkdirSync(folder, { recursive: true });

  const session: ReplaySession = {
    id,
    workflowName,
    brandName,
    startedAt: new Date().toISOString(),
    steps: [],
    outcome: 'in-progress',
    tags,
  };
  saveSession(session);

  const index = loadIndex();
  index.sessions.unshift({
    id,
    workflowName,
    brandName,
    startedAt: session.startedAt,
    outcome: 'in-progress',
    stepCount: 0,
  });
  if (index.sessions.length > 200) index.sessions = index.sessions.slice(0, 200);
  saveIndex(index);

  log.info(`[VisualReplayLog] Sesión iniciada: ${id} (${workflowName})`);
  return session;
};

export const endReplaySession = (
  id: string,
  outcome: 'success' | 'partial' | 'failed' | 'cancelled',
  summary?: string,
  outputs?: ReplaySession['outputs'],
): ReplaySession | null => {
  const session = loadSession(id);
  if (!session) return null;
  const endedAt = new Date().toISOString();
  session.endedAt = endedAt;
  session.totalDurationMs = new Date(endedAt).getTime() - new Date(session.startedAt).getTime();
  session.outcome = outcome;
  if (summary) session.summary = summary;
  if (outputs) session.outputs = outputs;
  saveSession(session);

  const index = loadIndex();
  const idxEntry = index.sessions.find((s) => s.id === id);
  if (idxEntry) {
    idxEntry.outcome = outcome;
    idxEntry.endedAt = endedAt;
    idxEntry.stepCount = session.steps.length;
  }
  saveIndex(index);

  log.info(
    `[VisualReplayLog] Sesión cerrada: ${id} (${outcome}, ${session.steps.length} pasos, ${Math.round((session.totalDurationMs ?? 0) / 1000)}s)`,
  );
  return session;
};

// ── Registrar un paso ─────────────────────────────────────────────────────────

export interface LogStepInput {
  sessionId: string;
  actionType: StepActionType;
  description: string;
  rationale?: string;
  captureScreenshot?: boolean;
  coords?: { x: number; y: number };
  text?: string;
  durationMs?: number;
  ok?: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

export const logStep = (input: LogStepInput): ReplayStep | null => {
  const session = loadSession(input.sessionId);
  if (!session) {
    log.warn(`[VisualReplayLog] Sesión ${input.sessionId} no encontrada`);
    return null;
  }

  let screenshotPath: string | undefined;
  if (input.captureScreenshot) {
    try {
      const shot = takeScreenshot();
      const dest = join(sessionFolderPath(input.sessionId), `step-${session.steps.length + 1}.png`);
      copyFileSync(shot.path, dest);
      screenshotPath = dest;
    } catch (err) {
      log.debug(`[VisualReplayLog] No se pudo capturar screenshot: ${(err as Error).message}`);
    }
  }

  const step: ReplayStep = {
    stepNumber: session.steps.length + 1,
    at: new Date().toISOString(),
    actionType: input.actionType,
    description: input.description,
    rationale: input.rationale,
    screenshotPath,
    coords: input.coords,
    text: input.text,
    durationMs: input.durationMs ?? 0,
    ok: input.ok ?? true,
    error: input.error,
    metadata: input.metadata,
  };
  session.steps.push(step);
  saveSession(session);

  return step;
};

// ── Vistas / consultas ────────────────────────────────────────────────────────

export const getReplaySession = (id: string): ReplaySession | null => loadSession(id);

export const listReplaySessions = (limit = 30): ReplayIndex['sessions'] => {
  const index = loadIndex();
  return index.sessions.slice(0, limit);
};

export const searchReplays = (filters: {
  workflowName?: string;
  brandName?: string;
  outcome?: ReplaySession['outcome'];
  fromDate?: string;
}): ReplayIndex['sessions'] => {
  const index = loadIndex();
  return index.sessions.filter((s) => {
    if (filters.workflowName && !s.workflowName.toLowerCase().includes(filters.workflowName.toLowerCase()))
      return false;
    if (filters.brandName && s.brandName !== filters.brandName) return false;
    if (filters.outcome && s.outcome !== filters.outcome) return false;
    if (filters.fromDate && s.startedAt < filters.fromDate) return false;
    return true;
  });
};

// ── Narrativa: genera texto narrativo de la sesión ───────────────────────────

export const generateNarrative = (sessionId: string): string => {
  const session = loadSession(sessionId);
  if (!session) return 'Sesión no encontrada.';

  const lines: string[] = [];
  lines.push(`# Replay de "${session.workflowName}" para @${session.brandName}`);
  lines.push('');
  lines.push(`📅 Iniciado: ${new Date(session.startedAt).toLocaleString('es-AR')}`);
  if (session.endedAt) {
    lines.push(
      `✅ Cerrado: ${new Date(session.endedAt).toLocaleString('es-AR')} (${Math.round((session.totalDurationMs ?? 0) / 1000)}s)`,
    );
  }
  lines.push(`🏁 Resultado: ${session.outcome.toUpperCase()}`);
  if (session.summary) {
    lines.push('');
    lines.push(`> ${session.summary}`);
  }
  lines.push('');
  lines.push(`## ${session.steps.length} pasos ejecutados`);
  lines.push('');

  for (const step of session.steps) {
    const icon =
      step.actionType === 'click'
        ? '🖱️'
        : step.actionType === 'type'
          ? '⌨️'
          : step.actionType === 'scroll'
            ? '↕️'
            : step.actionType === 'drag'
              ? '🤚'
              : step.actionType === 'screenshot'
                ? '📸'
                : step.actionType === 'launch-app'
                  ? '🚀'
                  : step.actionType === 'navigate-url'
                    ? '🌐'
                    : step.actionType === 'decision'
                      ? '🧠'
                      : step.actionType === 'export-file'
                        ? '💾'
                        : step.actionType === 'upload-file'
                          ? '📤'
                          : step.actionType === 'verify'
                            ? '✓'
                            : step.actionType === 'error'
                              ? '❌'
                              : '•';
    const okMark = step.ok ? '' : ' ⚠️';
    lines.push(`**Paso ${step.stepNumber}** ${icon} ${step.description}${okMark}`);
    if (step.rationale) lines.push(`   _${step.rationale}_`);
    if (step.coords) lines.push(`   → en (${step.coords.x}, ${step.coords.y})`);
    if (step.text) lines.push(`   → texto: "${step.text.slice(0, 80)}${step.text.length > 80 ? '...' : ''}"`);
    if (step.error) lines.push(`   ❌ error: ${step.error}`);
    if (step.screenshotPath) lines.push(`   📷 ${step.screenshotPath}`);
    lines.push('');
  }

  if (session.outputs?.files) {
    lines.push('## Archivos producidos');
    for (const f of session.outputs.files) lines.push(`- ${f}`);
    lines.push('');
  }
  if (session.outputs?.publishedUrls) {
    lines.push('## URLs publicadas');
    for (const u of session.outputs.publishedUrls) lines.push(`- ${u}`);
  }

  return lines.join('\n');
};

// ── Stats ─────────────────────────────────────────────────────────────────────

export const getReplayStats = (): {
  totalSessions: number;
  byOutcome: Record<string, number>;
  byWorkflow: Record<string, number>;
  avgStepsPerSession: number;
  avgDurationMs: number;
  diskUsageMB: number;
} => {
  const index = loadIndex();
  const byOutcome: Record<string, number> = {};
  const byWorkflow: Record<string, number> = {};
  let totalSteps = 0;
  let totalDuration = 0;
  let withDuration = 0;

  for (const s of index.sessions) {
    byOutcome[s.outcome] = (byOutcome[s.outcome] ?? 0) + 1;
    byWorkflow[s.workflowName] = (byWorkflow[s.workflowName] ?? 0) + 1;
    totalSteps += s.stepCount;
    if (s.endedAt) {
      totalDuration += new Date(s.endedAt).getTime() - new Date(s.startedAt).getTime();
      withDuration++;
    }
  }

  // Calcular uso de disco
  let diskBytes = 0;
  try {
    ensureDir();
    const files = readdirSync(REPLAY_PATH);
    for (const f of files) {
      const path = join(REPLAY_PATH, f);
      try {
        const stat = statSync(path);
        if (stat.isFile()) {
          diskBytes += stat.size;
        } else if (stat.isDirectory()) {
          const inner = readdirSync(path);
          for (const innerFile of inner) {
            try {
              const innerStat = statSync(join(path, innerFile));
              if (innerStat.isFile()) diskBytes += innerStat.size;
            } catch {
              /* skip */
            }
          }
        }
      } catch {
        /* skip */
      }
    }
  } catch {
    /* skip */
  }

  return {
    totalSessions: index.sessions.length,
    byOutcome,
    byWorkflow,
    avgStepsPerSession: index.sessions.length > 0 ? totalSteps / index.sessions.length : 0,
    avgDurationMs: withDuration > 0 ? totalDuration / withDuration : 0,
    diskUsageMB: Math.round((diskBytes / (1024 * 1024)) * 10) / 10,
  };
};

// ── Cleanup de replays viejos ─────────────────────────────────────────────────

export const pruneOldReplays = (maxAgeDays = 30): number => {
  const cutoff = Date.now() - maxAgeDays * 86400000;
  const index = loadIndex();
  const before = index.sessions.length;
  index.sessions = index.sessions.filter((s) => new Date(s.startedAt).getTime() >= cutoff);
  saveIndex(index);
  // Nota: por simplicidad no eliminamos los archivos JSON ni screenshots, solo los quitamos del índice
  // En producción real, se eliminarían también los archivos físicos
  const removed = before - index.sessions.length;
  if (removed > 0) log.info(`[VisualReplayLog] ${removed} sesiones podadas del índice`);
  return removed;
};
