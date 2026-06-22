/**
 * Swarm Orchestrator — Orquesta múltiples agentes en paralelo sobre una meta compleja.
 * Divide el trabajo, ejecuta agentes concurrentes, y consolida resultados.
 */

import { log } from '../../agent/logger.js';

export interface SwarmTask {
  id: string;
  goal: string;
  agentId: string;
  priority: number; // 1-10
  dependencies?: string[];
}

export interface SwarmResult {
  taskId: string;
  agentId: string;
  status: 'success' | 'partial' | 'failure' | 'skipped';
  output: unknown;
  durationMs: number;
}

export interface SwarmRun {
  runId: string;
  goal: string;
  tasks: SwarmTask[];
  results: SwarmResult[];
  startedAt: string;
  finishedAt?: string;
  status: 'running' | 'completed' | 'failed';
}

const activeSwarms = new Map<string, SwarmRun>();
const SWARM_STORAGE_KEY = 'swarm_runs';

const loadRuns = (): SwarmRun[] => {
  try {
    const raw = process.env[SWARM_STORAGE_KEY];
    return raw ? (JSON.parse(raw) as SwarmRun[]) : [];
  } catch {
    return [];
  }
};

const saveRuns = (runs: SwarmRun[]): void => {
  process.env[SWARM_STORAGE_KEY] = JSON.stringify(runs.slice(-50));
};

export const createSwarm = (goal: string, tasks: SwarmTask[]): SwarmRun => {
  const run: SwarmRun = {
    runId: `swarm-${Date.now()}`,
    goal,
    tasks,
    results: [],
    startedAt: new Date().toISOString(),
    status: 'running',
  };
  activeSwarms.set(run.runId, run);
  log.info(`[Swarm] Created ${run.runId} with ${tasks.length} tasks`);
  return run;
};

export const runSwarm = async (
  runId: string,
  executeTask: (task: SwarmTask) => Promise<unknown>,
): Promise<SwarmRun> => {
  const run = activeSwarms.get(runId);
  if (!run) throw new Error(`Swarm ${runId} not found`);

  const completed = new Set<string>();
  const pending = new Set(run.tasks.map((t) => t.id));

  while (pending.size > 0) {
    const ready = run.tasks.filter(
      (t) =>
        !completed.has(t.id) && !pending.has(t.id) === false && (t.dependencies ?? []).every((d) => completed.has(d)),
    );

    if (ready.length === 0 && pending.size > 0) {
      log.warn(`[Swarm] Deadlock detected in ${runId}`);
      break;
    }

    await Promise.all(
      ready.map(async (task) => {
        pending.delete(task.id);
        const start = Date.now();
        try {
          const output = await executeTask(task);
          run.results.push({
            taskId: task.id,
            agentId: task.agentId,
            status: 'success',
            output,
            durationMs: Date.now() - start,
          });
        } catch (err) {
          run.results.push({
            taskId: task.id,
            agentId: task.agentId,
            status: 'failure',
            output: (err as Error).message,
            durationMs: Date.now() - start,
          });
        }
        completed.add(task.id);
      }),
    );
  }

  run.status = run.results.some((r) => r.status === 'failure') ? 'failed' : 'completed';
  run.finishedAt = new Date().toISOString();

  const allRuns = loadRuns();
  allRuns.push(run);
  saveRuns(allRuns);

  log.info(
    `[Swarm] ${runId} finished: ${run.results.filter((r) => r.status === 'success').length}/${run.tasks.length} success`,
  );
  return run;
};

export const getSwarmStatus = (runId: string): SwarmRun | undefined =>
  activeSwarms.get(runId) ?? loadRuns().find((r) => r.runId === runId);

export const listSwarms = (limit = 10): SwarmRun[] => loadRuns().slice(-limit);
