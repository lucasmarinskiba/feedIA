/**
 * Task Board de FeedIA — tablero tipo Kanban donde se distribuyen tareas a los agentes.
 *
 * Cada meta del goalManager se descompone en tareas accionables que el sistema asigna
 * a un agente específico (nova, lia, scout, etc.). El board permite ver qué hace cada
 * "empleado" del equipo, qué está bloqueado y qué se completó.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import { askJson as routerAskJson } from '../../agent/tokenRouter.js';
import { getGoal } from './goalManager.js';
import type { BrandProfile } from '../../config/types.js';

const BOARD_PATH = join(process.cwd(), 'data', 'goals', 'task-board.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type TaskStatus = 'todo' | 'doing' | 'done' | 'blocked' | 'cancelled';
export type TaskPriority = 'critical' | 'high' | 'normal' | 'low';

export type AgentId = 'talia' | 'nova' | 'scout' | 'lia' | 'luca' | 'pixel' | 'analytics' | 'gard' | 'max' | 'vero';

export interface BoardTask {
  id: string;
  goalId?: string;
  title: string;
  description: string;
  assignedTo: AgentId;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  estimatedHours: number;
  actualHours?: number;
  artifacts: string[]; // IDs de outputs producidos (post IDs, archivos, etc.)
  blockedReason?: string;
  blockedSince?: string;
  recurrence?: 'daily' | 'weekly' | 'monthly' | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
  notes: string[];
}

interface BoardStore {
  version: number;
  tasks: BoardTask[];
  lastUpdated: string;
}

const DEFAULT_STORE: BoardStore = {
  version: 1,
  tasks: [],
  lastUpdated: new Date().toISOString(),
};

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'goals');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadBoard = (): BoardStore => {
  try {
    ensureDir();
    if (!existsSync(BOARD_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(BOARD_PATH, 'utf8')) as BoardStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveBoard = (store: BoardStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(BOARD_PATH, JSON.stringify(store, null, 2), 'utf8');
};

// ── Especialidades del equipo (para auto-asignación) ─────────────────────────

export const AGENT_SPECIALTIES: Record<AgentId, { name: string; focus: string; capabilities: string[] }> = {
  talia: {
    name: 'Talía',
    focus: 'Coordinación general y orquestación',
    capabilities: ['planificación', 'decisiones estratégicas', 'cross-team'],
  },
  nova: {
    name: 'Nova',
    focus: 'Creación de contenido (captions, scripts, ideas)',
    capabilities: ['copywriting', 'caption', 'reels', 'carruseles', 'stories'],
  },
  scout: {
    name: 'Scout',
    focus: 'Investigación de mercado, tendencias y competencia',
    capabilities: ['hashtag research', 'competitor analysis', 'tendencias', 'audiencia'],
  },
  lia: {
    name: 'Lía',
    focus: 'Gestión de comunidad (DMs, comentarios, engagement)',
    capabilities: ['respuestas', 'moderación', 'fans', 'CRM'],
  },
  luca: {
    name: 'Luca',
    focus: 'Ventas, leads y conversión',
    capabilities: ['lead qualification', 'sales', 'closing', 'follow-ups'],
  },
  pixel: {
    name: 'Pixel',
    focus: 'Diseño visual y producción gráfica',
    capabilities: ['Canva briefs', 'identidad visual', 'composiciones', 'mockups'],
  },
  analytics: {
    name: 'Analytics',
    focus: 'Métricas, KPIs y reportes',
    capabilities: ['insights', 'benchmarks', 'reportes', 'anomalías'],
  },
  gard: {
    name: 'Gard',
    focus: 'Compliance, protección de marca, moderación legal',
    capabilities: ['compliance', 'términos legales', 'moderación contenido', 'protección de imagen'],
  },
  max: {
    name: 'Max',
    focus: 'Growth hacking y optimización de conversión',
    capabilities: ['A/B testing', 'funnels', 'CRO', 'experimentos'],
  },
  vero: {
    name: 'Vero',
    focus: 'UGC, colaboraciones y embajadores',
    capabilities: ['collabs', 'UGC', 'campañas de afiliados', 'partnerships'],
  },
};

// ── CRUD ──────────────────────────────────────────────────────────────────────

export interface CreateTaskInput {
  goalId?: string;
  title: string;
  description?: string;
  assignedTo?: AgentId;
  priority?: TaskPriority;
  dueDate?: string;
  estimatedHours?: number;
  recurrence?: BoardTask['recurrence'];
  tags?: string[];
}

const autoAssign = (title: string, description: string): AgentId => {
  const text = `${title} ${description}`.toLowerCase();
  const scores: Record<AgentId, number> = {
    talia: 1,
    nova: 0,
    scout: 0,
    lia: 0,
    luca: 0,
    pixel: 0,
    analytics: 0,
    gard: 0,
    max: 0,
    vero: 0,
  };
  for (const [agentId, info] of Object.entries(AGENT_SPECIALTIES)) {
    for (const cap of info.capabilities) {
      if (text.includes(cap.toLowerCase().split(' ')[0]!)) scores[agentId as AgentId] += 3;
    }
  }
  // Patrones explícitos
  if (/dm|mensaje|comentario|comunidad/i.test(text)) scores.lia += 5;
  if (/reel|caption|story|carrusel|copy/i.test(text)) scores.nova += 5;
  if (/competidor|tendencia|hashtag|investigar/i.test(text)) scores.scout += 5;
  if (/venta|lead|conversion|cliente/i.test(text)) scores.luca += 5;
  if (/diseño|visual|grafica|canva|identidad/i.test(text)) scores.pixel += 5;
  if (/metric|reporte|kpi|analitica|insight/i.test(text)) scores.analytics += 5;
  if (/compliance|legal|moderar/i.test(text)) scores.gard += 5;
  if (/funnel|experimento|test|optimizar/i.test(text)) scores.max += 5;
  if (/ugc|colab|embajador|influencer/i.test(text)) scores.vero += 5;

  const best = (Object.entries(scores) as Array<[AgentId, number]>).sort((a, b) => b[1] - a[1])[0];
  return best?.[0] ?? 'talia';
};

export const createTask = (input: CreateTaskInput): BoardTask => {
  const store = loadBoard();
  const assignedTo = input.assignedTo ?? autoAssign(input.title, input.description ?? '');
  const task: BoardTask = {
    id: `task-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    goalId: input.goalId,
    title: input.title,
    description: input.description ?? input.title,
    assignedTo,
    status: 'todo',
    priority: input.priority ?? 'normal',
    dueDate: input.dueDate,
    estimatedHours: input.estimatedHours ?? 1,
    artifacts: [],
    recurrence: input.recurrence ?? null,
    tags: input.tags ?? [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    notes: [],
  };
  store.tasks.push(task);
  saveBoard(store);
  log.info(`[TaskBoard] Tarea creada: "${task.title}" → @${AGENT_SPECIALTIES[assignedTo].name} (${task.priority})`);
  return task;
};

export const updateTaskStatus = (taskId: string, status: TaskStatus, note?: string): BoardTask | null => {
  const store = loadBoard();
  const task = store.tasks.find((t) => t.id === taskId);
  if (!task) return null;

  const previousStatus = task.status;
  task.status = status;
  task.updatedAt = new Date().toISOString();
  if (status === 'doing' && !task.startedAt) task.startedAt = new Date().toISOString();
  if (status === 'done' && !task.completedAt) task.completedAt = new Date().toISOString();
  if (status === 'blocked') task.blockedSince = new Date().toISOString();
  if (previousStatus === 'blocked' && status !== 'blocked') {
    task.blockedSince = undefined;
    task.blockedReason = undefined;
  }
  if (note) task.notes.push(`[${new Date().toISOString()}] ${note}`);

  saveBoard(store);
  return task;
};

export const blockTask = (taskId: string, reason: string): BoardTask | null => {
  const store = loadBoard();
  const task = store.tasks.find((t) => t.id === taskId);
  if (!task) return null;
  task.status = 'blocked';
  task.blockedReason = reason;
  task.blockedSince = new Date().toISOString();
  task.updatedAt = new Date().toISOString();
  saveBoard(store);
  return task;
};

export const addArtifact = (taskId: string, artifactId: string): BoardTask | null => {
  const store = loadBoard();
  const task = store.tasks.find((t) => t.id === taskId);
  if (!task) return null;
  if (!task.artifacts.includes(artifactId)) task.artifacts.push(artifactId);
  task.updatedAt = new Date().toISOString();
  saveBoard(store);
  return task;
};

export const reassignTask = (taskId: string, newAgent: AgentId, reason?: string): BoardTask | null => {
  const store = loadBoard();
  const task = store.tasks.find((t) => t.id === taskId);
  if (!task) return null;
  const prev = task.assignedTo;
  task.assignedTo = newAgent;
  task.updatedAt = new Date().toISOString();
  task.notes.push(`[${new Date().toISOString()}] Reasignada de ${prev} a ${newAgent}${reason ? `: ${reason}` : ''}`);
  saveBoard(store);
  return task;
};

// ── Consultas ─────────────────────────────────────────────────────────────────

export const listTasks = (
  filters: {
    status?: TaskStatus;
    agent?: AgentId;
    goalId?: string;
    priority?: TaskPriority;
    dueBefore?: string;
  } = {},
): BoardTask[] => {
  let tasks = loadBoard().tasks;
  if (filters.status) tasks = tasks.filter((t) => t.status === filters.status);
  if (filters.agent) tasks = tasks.filter((t) => t.assignedTo === filters.agent);
  if (filters.goalId) tasks = tasks.filter((t) => t.goalId === filters.goalId);
  if (filters.priority) tasks = tasks.filter((t) => t.priority === filters.priority);
  if (filters.dueBefore) {
    tasks = tasks.filter((t) => t.dueDate && t.dueDate <= filters.dueBefore!);
  }
  return tasks.sort((a, b) => {
    const order: Record<TaskPriority, number> = { critical: 0, high: 1, normal: 2, low: 3 };
    if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority];
    return (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999');
  });
};

export const getKanbanView = (): Record<TaskStatus, BoardTask[]> => {
  const all = loadBoard().tasks;
  return {
    todo: all.filter((t) => t.status === 'todo'),
    doing: all.filter((t) => t.status === 'doing'),
    done: all.filter((t) => t.status === 'done'),
    blocked: all.filter((t) => t.status === 'blocked'),
    cancelled: all.filter((t) => t.status === 'cancelled'),
  };
};

export const getAgentView = (agent: AgentId): { agent: AgentId; name: string; tasks: BoardTask[]; load: number } => {
  const tasks = listTasks({ agent });
  const active = tasks.filter((t) => t.status === 'todo' || t.status === 'doing');
  const load = active.reduce((sum, t) => sum + t.estimatedHours, 0);
  return { agent, name: AGENT_SPECIALTIES[agent].name, tasks, load };
};

export const getTeamWorkload = (): Array<{
  agent: AgentId;
  name: string;
  activeTasks: number;
  load: number;
  blockedTasks: number;
}> => {
  const agents = Object.keys(AGENT_SPECIALTIES) as AgentId[];
  return agents.map((a) => {
    const tasks = listTasks({ agent: a });
    const active = tasks.filter((t) => t.status === 'todo' || t.status === 'doing');
    return {
      agent: a,
      name: AGENT_SPECIALTIES[a].name,
      activeTasks: active.length,
      load: active.reduce((s, t) => s + t.estimatedHours, 0),
      blockedTasks: tasks.filter((t) => t.status === 'blocked').length,
    };
  });
};

// ── Decomposición automática de una meta en tareas ──────────────────────────

export const decomposeGoalIntoTasks = async (goalId: string, brand: BrandProfile): Promise<BoardTask[]> => {
  const goal = getGoal(goalId);
  if (!goal) throw new Error(`Goal ${goalId} no encontrado`);

  const agentsList = Object.entries(AGENT_SPECIALTIES)
    .map(([id, info]) => `- ${id} (${info.name}): ${info.focus}`)
    .join('\n');

  const prompt = `Descomponé esta meta en 5-12 tareas accionables asignadas al equipo de agentes especialistas.

META:
- Título: ${goal.title}
- Descripción: ${goal.description}
- Horizonte: ${goal.horizon}
- Categoría: ${goal.category}
- Target: ${goal.target.value} ${goal.target.unit} (${goal.target.metric})
- Período: ${goal.startsAt.split('T')[0]} → ${goal.endsAt.split('T')[0]}

MARCA: ${brand.name} | Nicho: ${brand.niche}

EQUIPO DISPONIBLE:
${agentsList}

Cada tarea debe:
- Ser concreta (verbo + objeto específico)
- Tener un agente claramente responsable
- Tener prioridad realista (no todas pueden ser critical)
- Estimar horas (1-8h máx por tarea — si es más, dividir)
- Tener fecha de vencimiento dentro del período de la meta
- Si la tarea se repite (ej: "publicar 3 reels por semana"), marcar recurrence

JSON:
{
  "tasks": [
    {
      "title": "verbo + objeto",
      "description": "1-2 líneas de detalle",
      "assignedTo": "nova|scout|lia|luca|pixel|analytics|gard|max|vero|talia",
      "priority": "critical|high|normal|low",
      "dueDate": "YYYY-MM-DD",
      "estimatedHours": número 1-8,
      "recurrence": "daily|weekly|monthly|null",
      "tags": ["tag1", "tag2"]
    }
  ]
}`;

  const result = await routerAskJson<{
    tasks: Array<{
      title: string;
      description: string;
      assignedTo: AgentId;
      priority: TaskPriority;
      dueDate: string;
      estimatedHours: number;
      recurrence: 'daily' | 'weekly' | 'monthly' | null;
      tags: string[];
    }>;
  }>(prompt, {
    taskType: 'planning',
    maxTokens: 3000,
    systemPrompt:
      'Sos un director de operaciones. Descomponés metas en tareas claras y delegables, sin huecos ni redundancias.',
  });

  const created: BoardTask[] = [];
  for (const t of result.tasks ?? []) {
    const task = createTask({
      goalId: goal.id,
      title: t.title,
      description: t.description,
      assignedTo: t.assignedTo,
      priority: t.priority,
      dueDate: t.dueDate,
      estimatedHours: t.estimatedHours,
      recurrence: t.recurrence,
      tags: t.tags,
    });
    created.push(task);
  }
  log.info(`[TaskBoard] Meta "${goal.title}" descompuesta en ${created.length} tareas`);
  return created;
};

// ── Daily standup (qué hace hoy cada agente) ─────────────────────────────────

export interface DailyStandup {
  date: string;
  agentReports: Array<{
    agent: AgentId;
    name: string;
    todayTasks: BoardTask[];
    blockedTasks: BoardTask[];
    completedYesterday: BoardTask[];
    load: number;
  }>;
  totalDoing: number;
  totalBlocked: number;
  criticalDueToday: BoardTask[];
}

export const buildDailyStandup = (): DailyStandup => {
  const today = new Date().toISOString().split('T')[0]!;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0]!;
  const agents = Object.keys(AGENT_SPECIALTIES) as AgentId[];

  const board = loadBoard();
  const agentReports = agents.map((a) => {
    const myTasks = board.tasks.filter((t) => t.assignedTo === a);
    const todayTasks = myTasks.filter((t) => (t.dueDate ?? '').startsWith(today) || t.status === 'doing');
    const blockedTasks = myTasks.filter((t) => t.status === 'blocked');
    const completedYesterday = myTasks.filter((t) => t.completedAt?.startsWith(yesterday));
    const load = todayTasks.reduce((s, t) => s + t.estimatedHours, 0);
    return { agent: a, name: AGENT_SPECIALTIES[a].name, todayTasks, blockedTasks, completedYesterday, load };
  });

  const totalDoing = board.tasks.filter((t) => t.status === 'doing').length;
  const totalBlocked = board.tasks.filter((t) => t.status === 'blocked').length;
  const criticalDueToday = board.tasks.filter((t) => t.priority === 'critical' && (t.dueDate ?? '').startsWith(today));

  return { date: today, agentReports, totalDoing, totalBlocked, criticalDueToday };
};

// ── Burndown estadístico ─────────────────────────────────────────────────────

export const getBurndownForGoal = (
  goalId: string,
): { totalTasks: number; doneTasks: number; doneRatio: number; blockedTasks: number; overdueTasks: number } => {
  const tasks = listTasks({ goalId });
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === 'done').length;
  const blocked = tasks.filter((t) => t.status === 'blocked').length;
  const overdue = tasks.filter(
    (t) => t.dueDate && t.dueDate < new Date().toISOString() && t.status !== 'done' && t.status !== 'cancelled',
  ).length;
  return {
    totalTasks: total,
    doneTasks: done,
    doneRatio: total > 0 ? (done / total) * 100 : 0,
    blockedTasks: blocked,
    overdueTasks: overdue,
  };
};

export const exportBoardState = (): BoardStore => loadBoard();
