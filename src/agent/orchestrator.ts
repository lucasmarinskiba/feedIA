import type { ContentBlock, MessageParam } from '@anthropic-ai/sdk/resources/messages.js';
import { claude } from './claude.js';
import { log } from './logger.js';
import { env } from '../config/index.js';
import type { BrandProfile } from '../config/types.js';
import type { AgentDefinition } from './registry.js';
import { getAgent, buildSystemPrompt } from './registry.js';
import { emitAgentTaskRequest, emitAgentTaskComplete } from './bus.js';
import { createCheckpoint, hasPendingCheckpointsForCorrelation, waitForCheckpoint } from './checkpoints.js';
import { buildToolSubset } from './subagent.js';
import { findTool } from './tools.js';

export interface PlaybookTask {
  id: string;
  agentId: string;
  goal: string;
  dependsOn?: string[];
  checkpointType?: string;
  checkpointDescription?: string;
  timeoutMs?: number;
}

export interface PlaybookDefinition {
  id: string;
  name: string;
  description: string;
  tasks: PlaybookTask[];
  maxGlobalIterations?: number;
}

export interface PlaybookRunResult {
  playbookId: string;
  correlationId: string;
  status: 'completed' | 'failed' | 'waiting_checkpoint' | 'timeout';
  taskResults: TaskResult[];
  finalSummary: string;
  checkpointsCreated: string[];
}

export interface TaskResult {
  taskId: string;
  agentId: string;
  status: 'completed' | 'failed' | 'checkpoint_pending' | 'skipped';
  output?: string;
  error?: string;
  checkpointId?: string;
  toolCalls: Array<{ name: string; ok: boolean; durationMs: number }>;
}

let corrSeq = 0;
const nextCorrelationId = (): string => {
  corrSeq += 1;
  return `pb-${Date.now()}-${corrSeq}`;
};

export const runPlaybook = async (brand: BrandProfile, playbook: PlaybookDefinition): Promise<PlaybookRunResult> => {
  const correlationId = nextCorrelationId();
  log.info(`[ORCHESTRATOR] Iniciando playbook ${playbook.id} (${correlationId})`);

  const completedTasks = new Map<string, TaskResult>();
  const checkpointsCreated: string[] = [];
  const taskQueue = [...playbook.tasks];
  const maxIter = playbook.maxGlobalIterations ?? 30;
  let iter = 0;

  const canRun = (task: PlaybookTask): boolean => {
    if (!task.dependsOn || task.dependsOn.length === 0) return true;
    return task.dependsOn.every((dep) => {
      const res = completedTasks.get(dep);
      return res && res.status === 'completed';
    });
  };

  while (iter < maxIter && completedTasks.size < playbook.tasks.length) {
    iter++;
    const ready = taskQueue.filter((t) => !completedTasks.has(t.id) && canRun(t));

    if (ready.length === 0) {
      // Check if we are stuck because of checkpoints
      const pendingCp = playbook.tasks.some(
        (t) =>
          completedTasks.get(t.id)?.status === 'checkpoint_pending' &&
          hasPendingCheckpointsForCorrelation(correlationId),
      );
      if (pendingCp) {
        log.info(`[ORCHESTRATOR] Esperando checkpoints para ${correlationId}`);
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      break;
    }

    // Run ready tasks in parallel
    const batchResults = await Promise.all(ready.map((task) => runTask(brand, task, correlationId)));

    for (const res of batchResults) {
      completedTasks.set(res.taskId, res);
      if (res.checkpointId) checkpointsCreated.push(res.checkpointId);
    }
  }

  const allCompleted = playbook.tasks.every((t) => completedTasks.get(t.id)?.status === 'completed');

  const status: PlaybookRunResult['status'] = allCompleted
    ? 'completed'
    : hasPendingCheckpointsForCorrelation(correlationId)
      ? 'waiting_checkpoint'
      : 'failed';

  const finalSummary = buildSummary(playbook, completedTasks, status);

  log.info(
    `[ORCHESTRATOR] Playbook ${playbook.id} finalizado: ${status} (${completedTasks.size}/${playbook.tasks.length} tasks)`,
  );

  return {
    playbookId: playbook.id,
    correlationId,
    status,
    taskResults: playbook.tasks.map((t) => completedTasks.get(t.id)!),
    finalSummary,
    checkpointsCreated,
  };
};

const runTask = async (brand: BrandProfile, task: PlaybookTask, correlationId: string): Promise<TaskResult> => {
  const agent = getAgent(task.agentId);
  if (!agent) {
    return {
      taskId: task.id,
      agentId: task.agentId,
      status: 'failed',
      error: `Agente ${task.agentId} no registrado`,
      toolCalls: [],
    };
  }

  log.step(`[TASK] ${task.id} → ${agent.name}: ${task.goal.slice(0, 60)}...`);

  // Emit event that task started
  emitAgentTaskRequest('orchestrator', agent.id, task.goal, {}, correlationId);

  // Checkpoint before task if agent requires it for this action type
  if (task.checkpointType && agent.humanCheckpoints.includes(task.checkpointType as never)) {
    const cp = createCheckpoint(
      task.checkpointType as never,
      task.checkpointDescription ?? `Aprobación requerida para: ${task.goal}`,
      correlationId,
      { taskId: task.id, agentId: agent.id },
    );

    // Wait for resolution
    const resolved = await waitForCheckpoint(cp.id, 5000, task.timeoutMs ?? 300000);
    if (!resolved || resolved.status === 'rejected' || resolved.status === 'expired') {
      return {
        taskId: task.id,
        agentId: agent.id,
        status: 'checkpoint_pending',
        error: `Checkpoint ${cp.id} ${resolved?.status ?? 'timeout'}`,
        checkpointId: cp.id,
        toolCalls: [],
      };
    }
  }

  try {
    const result = await runAgentTask(brand, agent, task.goal, correlationId);

    // If agent returned checkpointRequired in output, create one
    if (result.checkpointRequired && result.checkpointType) {
      const cp = createCheckpoint(
        result.checkpointType as never,
        result.checkpointDescription ?? 'Aprobación requerida por agente',
        correlationId,
        { taskId: task.id, agentId: agent.id, agentOutput: result.summary },
      );
      const resolved = await waitForCheckpoint(cp.id, 5000, task.timeoutMs ?? 300000);
      if (!resolved || resolved.status !== 'approved') {
        return {
          taskId: task.id,
          agentId: agent.id,
          status: 'checkpoint_pending',
          error: `Checkpoint agente ${cp.id} no aprobado`,
          checkpointId: cp.id,
          toolCalls: result.toolCalls,
        };
      }
    }

    emitAgentTaskComplete(agent.id, 'orchestrator', result, correlationId);

    return {
      taskId: task.id,
      agentId: agent.id,
      status: 'completed',
      output: result.summary,
      toolCalls: result.toolCalls,
    };
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[TASK] ${task.id} falló: ${msg}`);
    return {
      taskId: task.id,
      agentId: agent.id,
      status: 'failed',
      error: msg,
      toolCalls: [],
    };
  }
};

interface AgentTaskOutput {
  summary: string;
  artifacts: unknown[];
  nextSteps: string[];
  checkpointRequired: boolean;
  checkpointType?: string;
  checkpointDescription?: string;
  toolCalls: Array<{ name: string; ok: boolean; durationMs: number }>;
  [key: string]: unknown;
}

export const runAgentTask = async (
  brand: BrandProfile,
  agent: AgentDefinition,
  goal: string,
  _correlationId: string,
): Promise<AgentTaskOutput> => {
  const subset = buildToolSubset(agent.toolNames);
  const model = agent.preferFastModel ? env.modelFast : env.modelPrimary;
  const messages: MessageParam[] = [{ role: 'user', content: goal }];
  const toolCalls: AgentTaskOutput['toolCalls'] = [];
  let finalText = '';
  const maxIter = agent.maxIterations;

  for (let iter = 0; iter < maxIter; iter++) {
    const response = await claude.messages.create({
      model,
      max_tokens: 4500,
      system: buildSystemPrompt(agent, brand),
      tools: subset,
      messages,
    });
    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'end_turn' || response.stop_reason === 'stop_sequence') {
      finalText = response.content
        .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
        .map((b) => b.text)
        .join('\n');
      break;
    }
    if (response.stop_reason !== 'tool_use') {
      log.warn(`Agente ${agent.id}: stop_reason=${response.stop_reason}`);
      break;
    }

    const toolResults: Array<{
      type: 'tool_result';
      tool_use_id: string;
      content: string;
      is_error?: boolean;
    }> = [];

    for (const block of response.content) {
      if (block.type !== 'tool_use') continue;
      const tool = findTool(block.name);
      const start = Date.now();
      if (!tool) {
        toolCalls.push({ name: block.name, ok: false, durationMs: Date.now() - start });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify({ error: `Tool ${block.name} no registrada` }),
          is_error: true,
        });
        continue;
      }
      try {
        const data = await tool.handler(block.input as Record<string, unknown>, brand);
        const durationMs = Date.now() - start;
        toolCalls.push({ name: block.name, ok: true, durationMs });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify(data).slice(0, 10000),
        });
      } catch (err) {
        const durationMs = Date.now() - start;
        toolCalls.push({ name: block.name, ok: false, durationMs });
        toolResults.push({
          type: 'tool_result',
          tool_use_id: block.id,
          content: JSON.stringify({ error: (err as Error).message }),
          is_error: true,
        });
      }
    }
    messages.push({ role: 'user', content: toolResults });
  }

  if (!finalText) finalText = `[${agent.id}: max iteraciones sin cierre]`;

  // Parse structured output from agent
  const parsed = parseAgentOutput(finalText);
  return {
    summary: parsed.summary || finalText,
    artifacts: parsed.artifacts || [],
    nextSteps: parsed.nextSteps || [],
    checkpointRequired: parsed.checkpointRequired ?? false,
    checkpointType: parsed.checkpointType,
    checkpointDescription: parsed.checkpointDescription,
    toolCalls,
  };
};

const parseAgentOutput = (text: string): Partial<AgentTaskOutput> => {
  try {
    // Try to find a JSON block
    const match = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (match && match[1]) {
      return JSON.parse(match[1]) as Partial<AgentTaskOutput>;
    }
    // Try whole text as JSON
    const trimmed = text.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return JSON.parse(trimmed) as Partial<AgentTaskOutput>;
    }
  } catch {
    // ignore
  }
  return { summary: text };
};

const buildSummary = (
  playbook: PlaybookDefinition,
  completed: Map<string, TaskResult>,
  status: PlaybookRunResult['status'],
): string => {
  const lines: string[] = [
    `Playbook: ${playbook.name}`,
    `Estado: ${status}`,
    `Tasks: ${completed.size}/${playbook.tasks.length}`,
    '',
    'Resultados por task:',
  ];
  for (const task of playbook.tasks) {
    const res = completed.get(task.id);
    if (!res) {
      lines.push(`- ${task.id}: NO EJECUTADO`);
      continue;
    }
    lines.push(`- ${task.id} (${res.agentId}): ${res.status}${res.error ? ` — ${res.error}` : ''}`);
  }
  return lines.join('\n');
};

export const resumePlaybookAfterCheckpoint = async (
  brand: BrandProfile,
  playbook: PlaybookDefinition,
  correlationId: string,
): Promise<PlaybookRunResult> => {
  // Re-run the playbook but only for tasks that were pending due to checkpoints
  log.info(`[ORCHESTRATOR] Reanudando playbook ${playbook.id} (${correlationId})`);
  return runPlaybook(brand, playbook);
};
