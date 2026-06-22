/**
 * Swarm Planner — descompone un objetivo libre en un plan multi-agente
 * ─────────────────────────────────────────────────────────────────────────
 * En vez de playbooks hardcodeados, este planner usa el modelo para:
 *   1. Armar la "crew" (qué agentes registrados son los indicados)
 *   2. Producir un DAG de tareas con dependencias y checkpoints
 *
 * Devuelve un PlaybookDefinition válido (ids de agentes verificados contra
 * el registry). Si el LLM falla o entrega algo inválido, cae a un plan
 * heurístico mínimo que igual deja la misión accionable.
 */

import type { ContentBlock } from '@anthropic-ai/sdk/resources/messages.js';
import { claude } from '../claude.js';
import { log } from '../logger.js';
import { env } from '../../config/index.js';
import type { BrandProfile } from '../../config/types.js';
import { listAgents, type AgentDefinition } from '../registry.js';
import type { PlaybookDefinition, PlaybookTask } from '../orchestrator.js';
import { formatLedgerAsPrompt } from '../../capabilities/research/ledger.js';
import { formatRecallForPrompt } from './recall.js';

export interface MissionPlan {
  playbook: PlaybookDefinition;
  crew: Array<{ agentId: string; role: string }>;
  rationale: string;
  source: 'llm' | 'heuristic';
}

const agentCard = (a: AgentDefinition): string =>
  `- ${a.id} — ${a.name}: ${a.tagline}. Especialidades: ${a.specialties.slice(0, 6).join(', ')}. Autonomía: ${a.autonomyLevel}. Checkpoints: ${a.humanCheckpoints.join('/') || 'ninguno'}`;

interface RawPlan {
  rationale?: string;
  crew?: Array<{ agentId?: string; role?: string }>;
  tasks?: Array<{
    id?: string;
    agentId?: string;
    goal?: string;
    dependsOn?: string[];
    checkpointType?: string;
    checkpointDescription?: string;
  }>;
}

const extractJson = (text: string): RawPlan | null => {
  const fenced = text.match(/```json\s*([\s\S]*?)\s*```/);
  const body = fenced?.[1] ?? text;
  const start = body.indexOf('{');
  const end = body.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1)) as RawPlan;
  } catch {
    return null;
  }
};

const heuristicPlan = (objective: string, agents: AgentDefinition[]): MissionPlan => {
  // Estratega → Productor → Auditor: pipeline mínimo que casi siempre aplica.
  const pick = (kw: string[], fallbackIdx: number): AgentDefinition =>
    agents.find((a) =>
      kw.some(
        (k) =>
          a.specialties.some((s) => s.toLowerCase().includes(k)) ||
          a.tagline.toLowerCase().includes(k) ||
          a.id.includes(k),
      ),
    ) ?? agents[Math.min(fallbackIdx, agents.length - 1)]!;

  const strategist = pick(['estrateg', 'plan', 'growth', 'crecim'], 0);
  const producer = pick(['contenido', 'copy', 'creat', 'design', 'visual'], 1);
  const auditor = pick(['auditor', 'analytic', 'métric', 'metric', 'compliance', 'calidad'], 2);

  const tasks: PlaybookTask[] = [
    { id: 't1', agentId: strategist.id, goal: `Analizá el objetivo y definí el ángulo/estrategia: ${objective}` },
    {
      id: 't2',
      agentId: producer.id,
      goal: `Ejecutá la producción concreta para cumplir: ${objective}`,
      dependsOn: ['t1'],
    },
    {
      id: 't3',
      agentId: auditor.id,
      goal: `Auditá la calidad y el alineamiento con el objetivo: ${objective}`,
      dependsOn: ['t2'],
    },
  ];

  return {
    playbook: {
      id: `mission-${Date.now().toString(36)}`,
      name: objective.slice(0, 60),
      description: objective,
      tasks,
      maxGlobalIterations: 20,
    },
    crew: [
      { agentId: strategist.id, role: 'estratega' },
      { agentId: producer.id, role: 'productor' },
      { agentId: auditor.id, role: 'auditor' },
    ],
    rationale: 'Plan heurístico (LLM no disponible o inválido): estrategia → producción → auditoría.',
    source: 'heuristic',
  };
};

export const planMission = async (brand: BrandProfile, objective: string): Promise<MissionPlan> => {
  const agents = listAgents();
  if (agents.length === 0) {
    throw new Error('No hay agentes registrados; no se puede planificar la misión.');
  }
  const validIds = new Set(agents.map((a) => a.id));

  let raw: RawPlan | null = null;
  try {
    const response = await claude.messages.create({
      model: env.modelFast,
      max_tokens: 2000,
      system: `Sos el Planner del framework de orquestación autónoma de FeedIA (sistema de IA para Instagram de ${brand.name}).
Descomponés un objetivo en un DAG de tareas asignadas a agentes registrados reales.

Inteligencia reciente de Instagram (apuntes vivos — tenelos en cuenta al planificar):
${formatLedgerAsPrompt(8)}

Misiones previas similares (aprendé de lo que funcionó/falló — no repitas errores):
${formatRecallForPrompt(objective, brand.name)}

Agentes disponibles (usá SOLO estos ids):
${agents.map(agentCard).join('\n')}

Reglas:
- 2 a 6 tareas. Cada tarea: id corto (t1,t2…), agentId válido, goal accionable en español rioplatense, dependsOn (ids previos) opcional.
- Poné checkpointType solo si la tarea publica/gasta/responde crisis: "publish" | "ad_spend" | "crisis_response" | "strategy_change".
- Las tareas independientes NO deben depender entre sí (para que corran en paralelo).
- Respondé SOLO un bloque \`\`\`json con: { "rationale": string, "crew": [{"agentId","role"}], "tasks": [{"id","agentId","goal","dependsOn?","checkpointType?","checkpointDescription?"}] }`,
      messages: [{ role: 'user', content: `Objetivo: ${objective}` }],
    });
    const text = response.content
      .filter((b): b is Extract<ContentBlock, { type: 'text' }> => b.type === 'text')
      .map((b) => b.text)
      .join('\n');
    raw = extractJson(text);
  } catch (err) {
    log.warn(`[SWARM Planner] LLM falló: ${(err as Error).message}`);
  }

  if (!raw || !Array.isArray(raw.tasks) || raw.tasks.length === 0) {
    return heuristicPlan(objective, agents);
  }

  const tasks: PlaybookTask[] = [];
  for (const [i, t] of raw.tasks.entries()) {
    const agentId = t.agentId && validIds.has(t.agentId) ? t.agentId : agents[0]!.id;
    const id = t.id?.trim() || `t${i + 1}`;
    if (!t.goal || !t.goal.trim()) continue;
    tasks.push({
      id,
      agentId,
      goal: t.goal.trim(),
      dependsOn: Array.isArray(t.dependsOn) ? t.dependsOn.filter((d): d is string => typeof d === 'string') : undefined,
      checkpointType: t.checkpointType,
      checkpointDescription: t.checkpointDescription,
    });
  }
  if (tasks.length === 0) return heuristicPlan(objective, agents);

  // Sanea dependencias: eliminá referencias a ids inexistentes.
  const taskIds = new Set(tasks.map((t) => t.id));
  for (const t of tasks) {
    if (t.dependsOn) t.dependsOn = t.dependsOn.filter((d) => taskIds.has(d));
  }

  const crew = (raw.crew ?? [])
    .filter((c): c is { agentId: string; role: string } => typeof c.agentId === 'string' && validIds.has(c.agentId))
    .map((c) => ({ agentId: c.agentId, role: c.role || 'colaborador' }));

  return {
    playbook: {
      id: `mission-${Date.now().toString(36)}`,
      name: objective.slice(0, 60),
      description: objective,
      tasks,
      maxGlobalIterations: Math.min(40, tasks.length * 6),
    },
    crew:
      crew.length > 0
        ? crew
        : [...new Set(tasks.map((t) => t.agentId))].map((agentId) => ({ agentId, role: 'colaborador' })),
    rationale: raw.rationale?.trim() || 'Plan generado por el LLM planner.',
    source: 'llm',
  };
};
