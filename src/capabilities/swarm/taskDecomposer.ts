/**
 * Task Decomposer — Descompone tareas complejas en sub-tareas asignables a agentes.
 * Analiza dependencias, estima esfuerzo, y asigna agentes óptimos.
 */

import { log } from '../../agent/logger.js';
import type { SwarmTask } from './swarmOrchestrator.js';

export interface DecomposedTask {
  id: string;
  goal: string;
  suggestedAgentId: string;
  estimatedMin: number;
  dependencies: string[];
  complexity: 'low' | 'medium' | 'high';
}

export interface TaskBreakdown {
  originalGoal: string;
  subtasks: DecomposedTask[];
  estimatedTotalMin: number;
  criticalPath: string[];
}

const AGENT_SPECIALTIES: Record<string, string[]> = {
  'content-creator': ['crear contenido', 'generar reel', 'carrusel', 'story', 'diseñar post'],
  'community-manager': ['responder comentarios', 'engagement', 'interacción', 'moderar'],
  'analytics-inspector': ['analizar', 'reporte', 'métricas', 'performance', 'KPI'],
  strategist: ['estrategia', 'planificar', 'nicho', 'posicionar', 'objetivo'],
  communicator: ['copy', 'caption', 'hook', 'CTA', 'mensaje'],
  'trend-radar': ['tendencia', 'viral', 'scout', 'detectar'],
  'tiktok-native-specialist': ['tiktok', 'FYP', 'trend sound', 'challenge'],
  'audio-producer': ['música', 'SFX', 'audio', 'sound design', 'voiceover'],
  'neural-brain-operator': ['memoria', 'aprendizaje', 'decisión', 'priorizar'],
  'brand-memory-keeper': ['knowledge base', 'FAQ', 'RAG', 'información marca'],
};

const detectSpecialty = (goal: string): string => {
  const lower = goal.toLowerCase();
  let bestAgent = 'content-creator';
  let bestScore = 0;

  for (const [agentId, specialties] of Object.entries(AGENT_SPECIALTIES)) {
    const score = specialties.filter((s) => lower.includes(s)).length;
    if (score > bestScore) {
      bestScore = score;
      bestAgent = agentId;
    }
  }

  return bestAgent;
};

export const decomposeTask = (goal: string): TaskBreakdown => {
  // Simple heuristic decomposition based on keywords
  const lower = goal.toLowerCase();
  const subtasks: DecomposedTask[] = [];
  let idx = 1;

  if (lower.includes('contenido') || lower.includes('post') || lower.includes('reel')) {
    subtasks.push({
      id: `st-${idx++}`,
      goal: `Investigar tendencias para: ${goal}`,
      suggestedAgentId: 'trend-radar',
      estimatedMin: 15,
      dependencies: [],
      complexity: 'medium',
    });
    subtasks.push({
      id: `st-${idx++}`,
      goal: `Crear contenido: ${goal}`,
      suggestedAgentId: detectSpecialty(goal),
      estimatedMin: 30,
      dependencies: ['st-1'],
      complexity: 'high',
    });
  }

  if (lower.includes('analizar') || lower.includes('reporte')) {
    subtasks.push({
      id: `st-${idx++}`,
      goal: `Recolectar datos para: ${goal}`,
      suggestedAgentId: 'analytics-inspector',
      estimatedMin: 10,
      dependencies: [],
      complexity: 'low',
    });
    subtasks.push({
      id: `st-${idx++}`,
      goal: `Analizar y reportar: ${goal}`,
      suggestedAgentId: 'analytics-inspector',
      estimatedMin: 20,
      dependencies: subtasks.find((s) => s.goal.includes('Recolectar')) ? [`st-${idx - 2}`] : [],
      complexity: 'medium',
    });
  }

  if (subtasks.length === 0) {
    subtasks.push({
      id: `st-${idx}`,
      goal,
      suggestedAgentId: detectSpecialty(goal),
      estimatedMin: 20,
      dependencies: [],
      complexity: 'medium',
    });
  }

  const estimatedTotalMin = subtasks.reduce((s, t) => s + t.estimatedMin, 0);

  // Simple critical path: tasks with no dependencies first, then dependent ones
  const criticalPath: string[] = [];
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visited.has(id)) return;
    const task = subtasks.find((t) => t.id === id);
    if (!task) return;
    for (const dep of task.dependencies) visit(dep);
    visited.add(id);
    criticalPath.push(id);
  };
  for (const st of subtasks) visit(st.id);

  log.info(`[Decomposer] "${goal.slice(0, 40)}..." → ${subtasks.length} subtasks, ${estimatedTotalMin}min`);

  return { originalGoal: goal, subtasks, estimatedTotalMin, criticalPath };
};

export const toSwarmTasks = (breakdown: TaskBreakdown): SwarmTask[] =>
  breakdown.subtasks.map((st) => ({
    id: st.id,
    goal: st.goal,
    agentId: st.suggestedAgentId,
    priority: st.complexity === 'high' ? 8 : st.complexity === 'medium' ? 5 : 3,
    dependencies: st.dependencies,
  }));
