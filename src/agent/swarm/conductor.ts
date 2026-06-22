/**
 * Swarm Conductor — bucle de control autónomo (sense → plan → act → reflect)
 * ─────────────────────────────────────────────────────────────────────────
 * Es el corazón del framework orquestador. Dado un objetivo libre:
 *   1. PLAN   — el planner arma crew + DAG de tareas
 *   2. ACT    — ejecuta cada tarea con el agente asignado (reusa runAgentTask)
 *   3. REFLECT— el crítico evalúa: accept / retry / replan / escalate
 *   4. LEARN  — todo lo relevante va a la pizarra y al reasoning-trace
 *
 * Compone piezas existentes (orchestrator.runAgentTask, checkpoints,
 * reasoningTrace, bus) en lugar de reimplementarlas. Acotado por diseño:
 * tope de tareas, de reintentos por tarea, de replanificaciones y de
 * iteraciones globales — nunca entra en loop infinito ni gasta sin techo.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { log } from '../logger.js';
import type { BrandProfile } from '../../config/types.js';
import { getAgent } from '../registry.js';
import { runAgentTask } from '../orchestrator.js';
import type { PlaybookTask } from '../orchestrator.js';
import { createCheckpoint, waitForCheckpoint } from '../checkpoints.js';
import type { CheckpointType } from '../registry.js';
import { emit } from '../bus.js';
import { recordTrace } from '../../capabilities/reasoningTrace/index.js';
import { planMission, type MissionPlan } from './planner.js';
import { critique } from './critic.js';
import { initBlackboard, post, summarizeBlackboard, getBlackboard } from './blackboard.js';

export interface MissionStepLog {
  taskId: string;
  agentId: string;
  attempts: number;
  status: 'completed' | 'failed' | 'escalated';
  score: number;
  verdict: string;
  note: string;
}

export interface MissionRecord {
  id: string;
  correlationId: string;
  brandId: string;
  objective: string;
  status: 'completed' | 'partial' | 'failed';
  planSource: MissionPlan['source'];
  crew: MissionPlan['crew'];
  rationale: string;
  steps: MissionStepLog[];
  summary: string;
  startedAt: string;
  finishedAt: string;
  replans: number;
}

export interface RunMissionOptions {
  maxAttemptsPerTask?: number;
  maxReplans?: number;
  /** Minutos de espera de un checkpoint humano antes de marcar la tarea fallida. */
  checkpointTimeoutMin?: number;
}

const STORE = resolve('data/runtime/swarmMissions.json');
const MAX_RECORDS = 80;

const readStore = (): { missions: MissionRecord[] } => {
  if (!existsSync(STORE)) return { missions: [] };
  try {
    return JSON.parse(readFileSync(STORE, 'utf-8')) as { missions: MissionRecord[] };
  } catch {
    return { missions: [] };
  }
};

const saveRecord = (rec: MissionRecord): void => {
  const s = readStore();
  const i = s.missions.findIndex((m) => m.id === rec.id);
  if (i >= 0) s.missions[i] = rec;
  else s.missions.push(rec);
  if (s.missions.length > MAX_RECORDS) s.missions.splice(0, s.missions.length - MAX_RECORDS);
  mkdirSync(dirname(STORE), { recursive: true });
  writeFileSync(STORE, JSON.stringify(s, null, 2), 'utf-8');
};

export const listMissions = (brandId?: string): MissionRecord[] =>
  readStore()
    .missions.filter((m) => !brandId || m.brandId === brandId)
    .reverse();

export const getMission = (id: string): MissionRecord | undefined => readStore().missions.find((m) => m.id === id);

let _seq = 0;
const newId = (): string => `msn-${Date.now().toString(36)}-${(++_seq).toString(36)}`;

const depsSatisfied = (task: PlaybookTask, done: Map<string, MissionStepLog>): boolean =>
  !task.dependsOn || task.dependsOn.length === 0 || task.dependsOn.every((d) => done.get(d)?.status === 'completed');

interface TaskExecOutcome {
  step: MissionStepLog;
  replanRequested: boolean;
}

/**
 * Ejecuta UNA tarea (checkpoint → act → reflect con reintentos acotados).
 * Aislada para poder correr tareas independientes del DAG en paralelo.
 */
const executeTask = async (
  brand: BrandProfile,
  ctx: { missionId: string; objective: string; correlationId: string; maxAttempts: number; cpTimeoutMs: number },
  task: PlaybookTask,
): Promise<TaskExecOutcome> => {
  const { missionId: id, objective, correlationId, maxAttempts, cpTimeoutMs } = ctx;
  const agent = getAgent(task.agentId);
  if (!agent) {
    return {
      step: {
        taskId: task.id,
        agentId: task.agentId,
        attempts: 0,
        status: 'failed',
        score: 0,
        verdict: 'failed',
        note: `Agente ${task.agentId} no registrado`,
      },
      replanRequested: false,
    };
  }

  // ── Checkpoint humano previo si la tarea lo exige ─────────────────────
  if (task.checkpointType && agent.humanCheckpoints.includes(task.checkpointType as CheckpointType)) {
    const cp = createCheckpoint(
      task.checkpointType as CheckpointType,
      task.checkpointDescription ?? `Aprobación para: ${task.goal}`,
      correlationId,
      { missionId: id, taskId: task.id, agentId: agent.id },
    );
    post(id, { kind: 'risk', by: 'conductor', label: `checkpoint:${task.id}`, value: cp.type });
    const resolved = await waitForCheckpoint(cp.id, 5000, cpTimeoutMs);
    if (!resolved || resolved.status !== 'approved') {
      return {
        step: {
          taskId: task.id,
          agentId: agent.id,
          attempts: 0,
          status: 'escalated',
          score: 0,
          verdict: 'escalate',
          note: `Checkpoint ${cp.id}: ${resolved?.status ?? 'timeout'}`,
        },
        replanRequested: false,
      };
    }
  }

  // ── ACT + REFLECT con reintentos acotados ─────────────────────────────
  let attempt = 0;
  let goal = task.goal;

  while (attempt < maxAttempts) {
    attempt += 1;
    const context = summarizeBlackboard(id);
    const enrichedGoal = `${goal}

— Contexto compartido de la misión "${objective}" —
${context}

Entregá el resultado concreto (no describas lo que harías).`;

    let output = '';
    try {
      const res = await runAgentTask(brand, agent, enrichedGoal, correlationId);
      output = res.summary;
    } catch (err) {
      output = `error: ${(err as Error).message}`;
    }

    const verdict = await critique(brand, {
      objective,
      taskGoal: task.goal,
      agentId: agent.id,
      output,
      attempt,
      maxAttempts,
    });

    if (verdict.verdict === 'accept') {
      post(id, { kind: 'artifact', by: agent.id, label: task.id, value: output.slice(0, 600) });
      return {
        step: {
          taskId: task.id,
          agentId: agent.id,
          attempts: attempt,
          status: 'completed',
          score: verdict.score,
          verdict: 'accept',
          note: verdict.reasoning,
        },
        replanRequested: false,
      };
    }
    if (verdict.verdict === 'retry') {
      post(id, { kind: 'fact', by: 'critic', label: `retry:${task.id}`, value: verdict.reasoning });
      goal = verdict.improvedGoal ?? `${task.goal} (reintento ${attempt + 1})`;
      continue;
    }
    if (verdict.verdict === 'escalate') {
      post(id, { kind: 'risk', by: 'critic', label: `escalate:${task.id}`, value: verdict.reasoning });
      return {
        step: {
          taskId: task.id,
          agentId: agent.id,
          attempts: attempt,
          status: 'escalated',
          score: verdict.score,
          verdict: 'escalate',
          note: verdict.reasoning,
        },
        replanRequested: false,
      };
    }
    // replan
    post(id, { kind: 'decision', by: 'critic', label: `replan:${task.id}`, value: verdict.reasoning });
    return {
      step: {
        taskId: task.id,
        agentId: agent.id,
        attempts: attempt,
        status: 'failed',
        score: verdict.score,
        verdict: 'replan',
        note: verdict.reasoning,
      },
      replanRequested: true,
    };
  }

  return {
    step: {
      taskId: task.id,
      agentId: agent.id,
      attempts: attempt,
      status: 'failed',
      score: 0,
      verdict: 'exhausted',
      note: 'Se agotaron los reintentos sin aceptación.',
    },
    replanRequested: false,
  };
};

/**
 * Ejecuta una misión autónoma de punta a punta.
 * Nunca lanza: cualquier fallo queda capturado en el MissionRecord.
 */
export const runMission = async (
  brand: BrandProfile,
  objective: string,
  opts: RunMissionOptions = {},
): Promise<MissionRecord> => {
  const maxAttempts = Math.max(1, opts.maxAttemptsPerTask ?? 2);
  const maxReplans = Math.max(0, opts.maxReplans ?? 1);
  const cpTimeoutMs = (opts.checkpointTimeoutMin ?? 30) * 60_000;

  const id = newId();
  const correlationId = `swarm-${id}`;
  const brandId = brand.name;
  const startedAt = new Date().toISOString();

  log.info(`[SWARM] Misión ${id}: "${objective.slice(0, 80)}"`);
  initBlackboard(id, objective, brandId);
  emit({
    type: 'SwarmMissionStarted',
    sourceAgent: 'swarm-conductor',
    priority: 'normal',
    correlationId,
    payload: { missionId: id, objective },
  });

  let plan: MissionPlan;
  try {
    plan = await planMission(brand, objective);
  } catch (err) {
    const rec: MissionRecord = {
      id,
      correlationId,
      brandId,
      objective,
      status: 'failed',
      planSource: 'heuristic',
      crew: [],
      rationale: '',
      steps: [],
      summary: `No se pudo planificar: ${(err as Error).message}`,
      startedAt,
      finishedAt: new Date().toISOString(),
      replans: 0,
    };
    saveRecord(rec);
    return rec;
  }

  post(id, { kind: 'decision', by: 'planner', label: 'plan', value: plan.rationale });
  log.info(
    `[SWARM] Plan (${plan.source}): ${plan.playbook.tasks.length} tareas, crew ${plan.crew.map((c) => c.agentId).join('/')}`,
  );

  let tasks = [...plan.playbook.tasks];
  const done = new Map<string, MissionStepLog>();
  const steps: MissionStepLog[] = [];
  let replans = 0;
  const globalCap = plan.playbook.maxGlobalIterations ?? 30;
  let guard = 0;

  const execCtx = { missionId: id, objective, correlationId, maxAttempts, cpTimeoutMs };

  while (done.size < tasks.length && guard < globalCap) {
    guard += 1;

    // Todas las tareas listas (deps OK) corren EN PARALELO: son independientes
    // entre sí por definición del DAG.
    const ready = tasks.filter((t) => !done.has(t.id) && depsSatisfied(t, done));
    if (ready.length === 0) {
      // Tareas restantes son inalcanzables: una dependencia previa falló.
      for (const t of tasks) {
        if (done.has(t.id)) continue;
        const step: MissionStepLog = {
          taskId: t.id,
          agentId: t.agentId,
          attempts: 0,
          status: 'failed',
          score: 0,
          verdict: 'skipped',
          note: 'Saltada: una dependencia previa no se completó.',
        };
        done.set(t.id, step);
        steps.push(step);
      }
      log.warn(
        `[SWARM] Dependencias previas fallaron — ${steps.filter((s) => s.verdict === 'skipped').length} tarea(s) saltada(s).`,
      );
      break;
    }

    log.info(`[SWARM] Lote de ${ready.length} tarea(s) en paralelo: ${ready.map((t) => t.id).join(', ')}`);
    const outcomes = await Promise.all(ready.map((t) => executeTask(brand, execCtx, t)));

    let replanRequested = false;
    for (const o of outcomes) {
      done.set(o.step.taskId, o.step);
      steps.push(o.step);
      if (o.replanRequested) replanRequested = true;
    }

    // ── Replanificación acotada de lo que falta ───────────────────────────
    if (replanRequested && replans < maxReplans) {
      replans += 1;
      log.info(`[SWARM] Replanificando (#${replans}) por veredicto del crítico.`);
      try {
        const fresh = await planMission(
          brand,
          `${objective}

Contexto ya logrado:
${summarizeBlackboard(id)}

Replanificá SOLO lo que falta para cumplir el objetivo.`,
        );
        const remap = fresh.playbook.tasks.map((t, i) => ({
          ...t,
          id: `r${replans}-${i + 1}`,
          dependsOn: undefined,
        }));
        tasks = [...tasks.filter((t) => done.has(t.id)), ...remap];
        post(id, { kind: 'decision', by: 'planner', label: `replan#${replans}`, value: fresh.rationale });
      } catch (err) {
        log.warn(`[SWARM] Replan falló: ${(err as Error).message}`);
      }
    }
  }

  // ── Cierre + agregación ─────────────────────────────────────────────────
  const completed = steps.filter((s) => s.status === 'completed').length;
  const escalated = steps.filter((s) => s.status === 'escalated').length;
  const status: MissionRecord['status'] =
    completed === tasks.length ? 'completed' : completed > 0 ? 'partial' : 'failed';

  const bb = getBlackboard(id);
  const artifacts = (bb?.entries ?? [])
    .filter((e) => e.kind === 'artifact')
    .map((e) => `• ${e.by}/${e.label}: ${typeof e.value === 'string' ? e.value.slice(0, 160) : ''}`)
    .join('\n');
  const summary = `Misión "${objective.slice(0, 60)}" → ${status}. ${completed}/${tasks.length} tareas OK${escalated ? `, ${escalated} escaladas a humano` : ''}. Replans: ${replans}.${artifacts ? `\nEntregables:\n${artifacts}` : ''}`;

  const rec: MissionRecord = {
    id,
    correlationId,
    brandId,
    objective,
    status,
    planSource: plan.source,
    crew: plan.crew,
    rationale: plan.rationale,
    steps,
    summary,
    startedAt,
    finishedAt: new Date().toISOString(),
    replans,
  };
  saveRecord(rec);

  recordTrace({
    agentId: 'swarm-conductor',
    decisionType: 'goal-decomposition',
    context: { objective, planSource: plan.source, tasks: tasks.length },
    alternatives: plan.crew.map((c) => ({
      option: c.agentId,
      score: status === 'completed' ? 100 : status === 'partial' ? 60 : 0,
    })),
    chosen: plan.crew[0]?.agentId ?? 'n/a',
    reasoning: summary,
    brandId,
    correlationId,
  });

  emit({
    type: 'SwarmMissionFinished',
    sourceAgent: 'swarm-conductor',
    priority: status === 'failed' ? 'high' : 'normal',
    correlationId,
    payload: { missionId: id, status, completed, total: tasks.length },
  });

  log.success(`[SWARM] Misión ${id} → ${status} (${completed}/${tasks.length})`);
  return rec;
};
