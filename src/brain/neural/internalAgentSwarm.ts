/**
 * Internal Agent Swarm — N agentes IA especializados deliberan + actúan.
 *
 * Cada agent:
 *   - rol especializado (estratega, copywriter, designer, etc)
 *   - skill set propio
 *   - bandwidth (cuántas tasks concurrentes)
 *   - reputation score (basado en outcomes pasados)
 *
 * Coordinator distribuye tasks → agents bid → highest bidder wins → ejecuta.
 *
 * Local-only, sin LLM en routing.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';

const SWARM_DIR = path.resolve('data/neural/swarm');

export type AgentRole =
  | 'strategist'
  | 'copywriter'
  | 'designer'
  | 'analyst'
  | 'community-manager'
  | 'growth-hacker'
  | 'media-buyer'
  | 'researcher'
  | 'editor'
  | 'producer'
  | 'crisis-handler'
  | 'curator';

export interface InternalAgent {
  id: string;
  role: AgentRole;
  name: string;
  skills: string[];
  bandwidth: number;
  currentLoad: number;
  reputationScore: number; // 0-1
  totalTasksHandled: number;
  totalSuccesses: number;
  totalFailures: number;
  avgRewardLast20: number;
  lastActive: string;
  specialization: string;
}

export interface AgentTask {
  id: string;
  brandId: string;
  type: string;
  payload: Record<string, unknown>;
  requiredSkills: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'queued' | 'assigned' | 'in-progress' | 'completed' | 'failed';
  assignedTo?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  result?: unknown;
  reward?: number;
}

export interface AgentBid {
  agentId: string;
  taskId: string;
  bidScore: number;
  reasoning: string;
}

const DEFAULT_AGENTS: InternalAgent[] = [
  {
    id: 'agt-strategist-01',
    role: 'strategist',
    name: 'Nova',
    skills: ['planning', 'okr', 'positioning'],
    bandwidth: 3,
    currentLoad: 0,
    reputationScore: 0.85,
    totalTasksHandled: 0,
    totalSuccesses: 0,
    totalFailures: 0,
    avgRewardLast20: 0,
    lastActive: '',
    specialization: 'Long-term planning + brand positioning',
  },
  {
    id: 'agt-copywriter-01',
    role: 'copywriter',
    name: 'Lía',
    skills: ['copy', 'hooks', 'captions', 'aida', 'pas'],
    bandwidth: 5,
    currentLoad: 0,
    reputationScore: 0.82,
    totalTasksHandled: 0,
    totalSuccesses: 0,
    totalFailures: 0,
    avgRewardLast20: 0,
    lastActive: '',
    specialization: 'Copy persuasivo + storytelling',
  },
  {
    id: 'agt-designer-01',
    role: 'designer',
    name: 'Gard',
    skills: ['visual', 'composition', 'color', 'typography', 'canva'],
    bandwidth: 4,
    currentLoad: 0,
    reputationScore: 0.78,
    totalTasksHandled: 0,
    totalSuccesses: 0,
    totalFailures: 0,
    avgRewardLast20: 0,
    lastActive: '',
    specialization: 'Diseño visual + dirección de arte',
  },
  {
    id: 'agt-analyst-01',
    role: 'analyst',
    name: 'Luca',
    skills: ['metrics', 'kpi', 'attribution', 'experiments'],
    bandwidth: 3,
    currentLoad: 0,
    reputationScore: 0.88,
    totalTasksHandled: 0,
    totalSuccesses: 0,
    totalFailures: 0,
    avgRewardLast20: 0,
    lastActive: '',
    specialization: 'Data analysis + experiment design',
  },
  {
    id: 'agt-cm-01',
    role: 'community-manager',
    name: 'Mira',
    skills: ['dms', 'comments', 'moderation', 'engagement'],
    bandwidth: 8,
    currentLoad: 0,
    reputationScore: 0.8,
    totalTasksHandled: 0,
    totalSuccesses: 0,
    totalFailures: 0,
    avgRewardLast20: 0,
    lastActive: '',
    specialization: 'Community engagement 24/7',
  },
  {
    id: 'agt-growth-01',
    role: 'growth-hacker',
    name: 'Ruvo',
    skills: ['viral', 'reach', 'hashtags', 'collabs'],
    bandwidth: 3,
    currentLoad: 0,
    reputationScore: 0.75,
    totalTasksHandled: 0,
    totalSuccesses: 0,
    totalFailures: 0,
    avgRewardLast20: 0,
    lastActive: '',
    specialization: 'Growth hacks + viral mechanics',
  },
  {
    id: 'agt-mediabuyer-01',
    role: 'media-buyer',
    name: 'Kael',
    skills: ['ads', 'meta-ads', 'targeting', 'creatives'],
    bandwidth: 2,
    currentLoad: 0,
    reputationScore: 0.82,
    totalTasksHandled: 0,
    totalSuccesses: 0,
    totalFailures: 0,
    avgRewardLast20: 0,
    lastActive: '',
    specialization: 'Paid media + ad optimization',
  },
  {
    id: 'agt-research-01',
    role: 'researcher',
    name: 'Sayo',
    skills: ['competitor', 'trends', 'niche', 'audit'],
    bandwidth: 4,
    currentLoad: 0,
    reputationScore: 0.79,
    totalTasksHandled: 0,
    totalSuccesses: 0,
    totalFailures: 0,
    avgRewardLast20: 0,
    lastActive: '',
    specialization: 'Competitive intelligence + trend forecasting',
  },
  {
    id: 'agt-editor-01',
    role: 'editor',
    name: 'Tova',
    skills: ['video', 'capcut', 'subtitles', 'beat-sync'],
    bandwidth: 3,
    currentLoad: 0,
    reputationScore: 0.74,
    totalTasksHandled: 0,
    totalSuccesses: 0,
    totalFailures: 0,
    avgRewardLast20: 0,
    lastActive: '',
    specialization: 'Video editing + post-production',
  },
  {
    id: 'agt-producer-01',
    role: 'producer',
    name: 'Bren',
    skills: ['orchestration', 'scheduling', 'workflows'],
    bandwidth: 6,
    currentLoad: 0,
    reputationScore: 0.83,
    totalTasksHandled: 0,
    totalSuccesses: 0,
    totalFailures: 0,
    avgRewardLast20: 0,
    lastActive: '',
    specialization: 'Workflow orchestration + delivery',
  },
  {
    id: 'agt-crisis-01',
    role: 'crisis-handler',
    name: 'Vael',
    skills: ['crisis', 'reputation', 'damage-control', 'comms'],
    bandwidth: 2,
    currentLoad: 0,
    reputationScore: 0.86,
    totalTasksHandled: 0,
    totalSuccesses: 0,
    totalFailures: 0,
    avgRewardLast20: 0,
    lastActive: '',
    specialization: 'Crisis response + reputation defense',
  },
  {
    id: 'agt-curator-01',
    role: 'curator',
    name: 'Tindra',
    skills: ['curation', 'newsjacking', 'monitoring'],
    bandwidth: 4,
    currentLoad: 0,
    reputationScore: 0.77,
    totalTasksHandled: 0,
    totalSuccesses: 0,
    totalFailures: 0,
    avgRewardLast20: 0,
    lastActive: '',
    specialization: 'Content curation + real-time monitoring',
  },
];

const ROLE_TASK_MAP: Record<string, AgentRole[]> = {
  'plan-strategy': ['strategist', 'analyst'],
  'write-copy': ['copywriter'],
  'design-visual': ['designer'],
  'analyze-metrics': ['analyst'],
  'respond-dm': ['community-manager'],
  'moderate-comments': ['community-manager'],
  'find-viral-opportunity': ['growth-hacker', 'researcher'],
  'launch-ad-campaign': ['media-buyer'],
  'research-competitor': ['researcher', 'analyst'],
  'edit-video': ['editor'],
  'orchestrate-publish': ['producer'],
  'handle-crisis': ['crisis-handler', 'community-manager'],
  'curate-content': ['curator', 'researcher'],
};

const swarmPath = (brandId: string): string => path.join(SWARM_DIR, `${brandId}-swarm.json`);
const tasksPath = (brandId: string): string => path.join(SWARM_DIR, `${brandId}-tasks.json`);

const loadSwarm = async (brandId: string): Promise<InternalAgent[]> => {
  try {
    return JSON.parse(await fs.readFile(swarmPath(brandId), 'utf-8')) as InternalAgent[];
  } catch {
    return [...DEFAULT_AGENTS];
  }
};

const saveSwarm = async (brandId: string, swarm: InternalAgent[]): Promise<void> => {
  await fs.mkdir(SWARM_DIR, { recursive: true });
  await fs.writeFile(swarmPath(brandId), JSON.stringify(swarm, null, 2), 'utf-8');
};

const loadTasks = async (brandId: string): Promise<AgentTask[]> => {
  try {
    return JSON.parse(await fs.readFile(tasksPath(brandId), 'utf-8')) as AgentTask[];
  } catch {
    return [];
  }
};

const saveTasks = async (brandId: string, tasks: AgentTask[]): Promise<void> => {
  await fs.mkdir(SWARM_DIR, { recursive: true });
  await fs.writeFile(tasksPath(brandId), JSON.stringify(tasks.slice(-500), null, 2), 'utf-8');
};

const computeBid = (agent: InternalAgent, task: AgentTask): AgentBid | null => {
  if (agent.currentLoad >= agent.bandwidth) return null;

  const eligibleRoles = ROLE_TASK_MAP[task.type] ?? [];
  if (eligibleRoles.length > 0 && !eligibleRoles.includes(agent.role)) return null;

  const skillMatch = task.requiredSkills.filter((s) => agent.skills.includes(s)).length;
  const skillRatio = task.requiredSkills.length > 0 ? skillMatch / task.requiredSkills.length : 0.5;

  const loadFactor = 1 - agent.currentLoad / agent.bandwidth;
  const bidScore = agent.reputationScore * 0.4 + skillRatio * 0.4 + loadFactor * 0.2;

  return {
    agentId: agent.id,
    taskId: task.id,
    bidScore,
    reasoning: `Rep ${agent.reputationScore.toFixed(2)} · Skills ${(skillRatio * 100).toFixed(0)}% · Load ${(loadFactor * 100).toFixed(0)}%`,
  };
};

export const submitTask = async (
  brandId: string,
  task: Omit<AgentTask, 'id' | 'createdAt' | 'status' | 'assignedTo'>,
): Promise<{ task: AgentTask; bids: AgentBid[]; assignedTo: string | null }> => {
  const newTask: AgentTask = {
    ...task,
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
    status: 'queued',
  };

  const swarm = await loadSwarm(brandId);
  const bids = swarm.map((a) => computeBid(a, newTask)).filter((b): b is AgentBid => b !== null);
  bids.sort((a, b) => b.bidScore - a.bidScore);

  let assignedTo: string | null = null;
  if (bids.length > 0) {
    assignedTo = bids[0]!.agentId;
    newTask.assignedTo = assignedTo;
    newTask.status = 'assigned';
    const winner = swarm.find((a) => a.id === assignedTo);
    if (winner) {
      winner.currentLoad++;
      winner.lastActive = new Date().toISOString();
      await saveSwarm(brandId, swarm);
    }
  }

  const tasks = await loadTasks(brandId);
  tasks.push(newTask);
  await saveTasks(brandId, tasks);

  log.info('[internalAgentSwarm] task submitted', {
    brandId,
    taskId: newTask.id,
    type: task.type,
    assignedTo,
    bids: bids.length,
  });
  return { task: newTask, bids, assignedTo };
};

export const completeTask = async (
  brandId: string,
  taskId: string,
  outcome: { result: unknown; reward: number },
): Promise<AgentTask | null> => {
  const tasks = await loadTasks(brandId);
  const task = tasks.find((t) => t.id === taskId);
  if (!task) return null;

  task.status = outcome.reward >= 0 ? 'completed' : 'failed';
  task.completedAt = new Date().toISOString();
  task.result = outcome.result;
  task.reward = outcome.reward;
  if (!task.startedAt) task.startedAt = task.completedAt;

  const swarm = await loadSwarm(brandId);
  const agent = swarm.find((a) => a.id === task.assignedTo);
  if (agent) {
    agent.currentLoad = Math.max(0, agent.currentLoad - 1);
    agent.totalTasksHandled++;
    if (outcome.reward >= 0) agent.totalSuccesses++;
    else agent.totalFailures++;
    agent.avgRewardLast20 = (agent.avgRewardLast20 * 19 + outcome.reward) / 20;
    const totalAttempts = agent.totalSuccesses + agent.totalFailures;
    agent.reputationScore = totalAttempts > 0 ? agent.totalSuccesses / totalAttempts : agent.reputationScore;
    await saveSwarm(brandId, swarm);
  }

  await saveTasks(brandId, tasks);
  log.info('[internalAgentSwarm] task completed', { brandId, taskId, reward: outcome.reward.toFixed(2) });
  return task;
};

export const getSwarmStatus = async (
  brandId: string,
): Promise<{
  agents: InternalAgent[];
  totalCapacity: number;
  currentLoad: number;
  utilizationPct: number;
  topPerformers: InternalAgent[];
  underperformers: InternalAgent[];
}> => {
  const swarm = await loadSwarm(brandId);
  const totalCapacity = swarm.reduce((s, a) => s + a.bandwidth, 0);
  const currentLoad = swarm.reduce((s, a) => s + a.currentLoad, 0);
  return {
    agents: swarm,
    totalCapacity,
    currentLoad,
    utilizationPct: totalCapacity > 0 ? (currentLoad / totalCapacity) * 100 : 0,
    topPerformers: [...swarm].sort((a, b) => b.reputationScore - a.reputationScore).slice(0, 3),
    underperformers: [...swarm]
      .filter((a) => a.totalTasksHandled > 5)
      .sort((a, b) => a.reputationScore - b.reputationScore)
      .slice(0, 3),
  };
};

export const getTaskQueue = async (brandId: string, status?: AgentTask['status']): Promise<AgentTask[]> => {
  const tasks = await loadTasks(brandId);
  return status ? tasks.filter((t) => t.status === status) : tasks;
};

export const getAgentsByRole = async (brandId: string, role: AgentRole): Promise<InternalAgent[]> => {
  const swarm = await loadSwarm(brandId);
  return swarm.filter((a) => a.role === role);
};
