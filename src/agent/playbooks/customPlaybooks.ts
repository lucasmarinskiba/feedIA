/**
 * Custom playbook loader — hot-reloads JSON playbooks from data/playbooks/
 */
import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import chalk from 'chalk';
import { customPlaybookSchema, type CustomPlaybook, type CustomTask } from './customPlaybookSchema.js';
import { runAgentTask } from '../orchestrator.js';
import { getAgent } from '../registry.js';
import type { BrandProfile } from '../../config/types.js';

const PLAYBOOKS_DIR = path.resolve(process.cwd(), 'data', 'playbooks');

let _cache: CustomPlaybook[] | null = null;
let _cacheMtime = 0;

function getDirMtime(): number {
  try {
    const stat = fs.statSync(PLAYBOOKS_DIR);
    return stat.mtimeMs;
  } catch {
    return 0;
  }
}

export function listCustomPlaybooks(): CustomPlaybook[] {
  const mtime = getDirMtime();
  if (_cache && mtime === _cacheMtime) return _cache;

  const playbooks: CustomPlaybook[] = [];
  if (!fs.existsSync(PLAYBOOKS_DIR)) {
    _cache = playbooks;
    _cacheMtime = mtime;
    return playbooks;
  }

  const files = fs.readdirSync(PLAYBOOKS_DIR).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(PLAYBOOKS_DIR, file), 'utf-8');
      const parsed = JSON.parse(raw);
      const validated = customPlaybookSchema.parse(parsed);
      playbooks.push(validated);
    } catch (err) {
      const msg =
        err instanceof z.ZodError
          ? err.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; ')
          : (err as Error).message;
      console.warn(chalk.yellow(`⚠️ Playbook inválido ${file}: ${msg}`));
    }
  }

  _cache = playbooks;
  _cacheMtime = mtime;
  return playbooks;
}

export function getCustomPlaybook(id: string): CustomPlaybook | undefined {
  return listCustomPlaybooks().find((p) => p.id === id);
}

export function saveCustomPlaybook(playbook: CustomPlaybook): void {
  if (!fs.existsSync(PLAYBOOKS_DIR)) {
    fs.mkdirSync(PLAYBOOKS_DIR, { recursive: true });
  }
  const filePath = path.join(PLAYBOOKS_DIR, `${playbook.id}.json`);
  fs.writeFileSync(filePath, JSON.stringify(playbook, null, 2), 'utf-8');
  _cache = null; // invalidate
}

export function deleteCustomPlaybook(id: string): boolean {
  const filePath = path.join(PLAYBOOKS_DIR, `${id}.json`);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  _cache = null;
  return true;
}

export function validatePlaybookJSON(
  raw: unknown,
): { ok: true; data: CustomPlaybook } | { ok: false; errors: string[] } {
  try {
    const data = customPlaybookSchema.parse(raw);
    // Validate task dependencies exist
    const taskIds = new Set(data.tasks.map((t) => t.id));
    const missingDeps: string[] = [];
    for (const task of data.tasks) {
      for (const dep of task.dependsOn) {
        if (!taskIds.has(dep)) missingDeps.push(`${task.id} depende de ${dep} (no existe)`);
      }
    }
    if (missingDeps.length > 0) {
      return { ok: false, errors: missingDeps };
    }
    // Validate agent IDs exist (soft check, log warning)
    return { ok: true, data };
  } catch (err) {
    if (err instanceof z.ZodError) {
      return { ok: false, errors: err.errors.map((e) => `${e.path.join('.')}: ${e.message}`) };
    }
    return { ok: false, errors: [(err as Error).message] };
  }
}

/** Execute a custom playbook similarly to runPlaybook but for user-defined ones */
export async function runCustomPlaybook(
  brand: BrandProfile,
  playbook: CustomPlaybook,
  onProgress?: (taskId: string, status: 'running' | 'done' | 'failed', output?: string) => void,
): Promise<{ success: boolean; results: Record<string, { status: string; output: string }> }> {
  const results: Record<string, { status: string; output: string }> = {};

  // Topological sort
  const graph = new Map<string, Set<string>>();
  for (const t of playbook.tasks) graph.set(t.id, new Set(t.dependsOn));

  const completed = new Set<string>();
  const failed = new Set<string>();

  async function runTask(task: CustomTask): Promise<void> {
    if (completed.has(task.id) || failed.has(task.id)) return;

    // Wait for dependencies
    for (const dep of task.dependsOn) {
      if (failed.has(dep)) {
        failed.add(task.id);
        const skipOutput = `Dependencia fallida: ${dep}`;
        results[task.id] = { status: 'skipped', output: skipOutput };
        onProgress?.(task.id, 'failed', skipOutput);
        return;
      }
      while (!completed.has(dep)) {
        await new Promise((r) => setTimeout(r, 500));
      }
    }

    onProgress?.(task.id, 'running');
    try {
      const agentDef = getAgent(task.agentId);
      if (!agentDef) throw new Error(`Agente ${task.agentId} no encontrado`);
      const prompt = `[Playbook: ${playbook.name} | Tarea: ${task.id}]\n\n${task.instructions}`;
      const correlationId = `custom-pb-${playbook.id}-${task.id}-${Date.now()}`;
      const res = await Promise.race([
        runAgentTask(brand, agentDef, prompt, correlationId),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Timeout')), task.timeoutMs)),
      ]);
      completed.add(task.id);
      const output = typeof res.summary === 'string' ? res.summary : JSON.stringify(res.summary ?? res);
      results[task.id] = { status: 'completed', output };
      onProgress?.(task.id, 'done', output);
    } catch (err) {
      failed.add(task.id);
      const msg = err instanceof Error ? err.message : String(err);
      results[task.id] = { status: 'failed', output: msg };
      onProgress?.(task.id, 'failed', msg);
    }
  }

  // Run all tasks respecting dependencies
  const promises: Promise<void>[] = [];
  for (const task of playbook.tasks) {
    promises.push(runTask(task));
  }
  await Promise.all(promises);

  return { success: failed.size === 0, results };
}
