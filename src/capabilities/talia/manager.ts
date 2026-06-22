/**
 * Talía — Agent Manager (delegation engine)
 * ─────────────────────────────────────────────────────────────────────────
 * Talía receives the user's GLOBAL order ("FeedIA, ayudame a crecer la
 * cuenta"), and like a real operations manager:
 *
 *   1. Decomposes it into a playbook (via the Goal Decomposer)
 *   2. For EACH task, selects the best-fit employee considering:
 *        • the IBM agent type the task needs (inferBestTypeForTask)
 *        • department alignment
 *        • capability overlap
 *        • current workload (load-balancing — she doesn't overload her best)
 *   3. Produces a delegation plan with a clear rationale per assignment
 *   4. Logs a reasoning trace and emits a bus event so the assignment is
 *      auditable and other agents can react
 *
 * She knows the company structure, every employee, and the system she
 * operates — but always within ONE company scope (no cross-brand leakage).
 */

import type { BrandProfile } from '../../config/types.js';
import { decomposeGoal, createMission, type GoalIntent } from '../goalDecomposer/index.js';
import { inferBestTypeForTask, AGENT_TYPES, type AgentType } from '../agentTaxonomy/index.js';
import { recordTrace } from '../reasoningTrace/index.js';
import { emit } from '../../agent/bus.js';
import { getEmployeeDirectory, type Employee } from './orgChart.js';

export interface Assignment {
  taskId: string;
  taskGoal: string;
  /** Agent type the task fundamentally needs. */
  requiredType: AgentType;
  requiredTypeName: string;
  /** Chosen employee. */
  assignee: { id: string; name: string; department: string; agentType: AgentType };
  /** Score Talía computed for the chosen assignee. */
  fitScore: number;
  /** Why Talía picked this employee over others. */
  rationale: string;
  /** Other candidates considered (for the audit trail). */
  considered: Array<{ id: string; name: string; score: number }>;
  dependsOn?: string[];
}

export interface DelegationPlan {
  companyId: string;
  globalOrder: string;
  matchedIntent: GoalIntent | 'unknown';
  playbookName: string;
  managerBriefing: string;
  assignments: Assignment[];
  missionId?: string;
  /** Talía's executive note to the user. */
  managerNote: string;
}

/* ──────────────────────────────────────────────────────────────────────── */

const scoreEmployeeForTask = (
  emp: Employee,
  requiredType: AgentType,
  preferredDepartment: string,
  taskText: string,
): { score: number; reasons: string[] } => {
  const reasons: string[] = [];
  let score = 0;

  if (emp.agentType === requiredType) {
    score += 40;
    reasons.push(`tipo ${AGENT_TYPES[requiredType].name} (match exacto)`);
  } else {
    // Adjacent types still partially fit.
    score += 8;
  }

  if (emp.department === preferredDepartment) {
    score += 20;
    reasons.push(`departamento ${emp.department}`);
  }

  // Capability keyword overlap with the task.
  const tl = taskText.toLowerCase();
  const capHits = emp.capabilities.filter((c) =>
    c
      .toLowerCase()
      .split(/\s+/)
      .some((w) => w.length >= 4 && tl.includes(w)),
  );
  if (capHits.length > 0) {
    score += Math.min(25, capHits.length * 9);
    reasons.push(`capacidades: ${capHits.slice(0, 2).join(', ')}`);
  }

  // Load-balancing: penalise an already-busy employee so Talía spreads work.
  const loadPenalty = Math.min(18, emp.recentWorkload * 1.5);
  score -= loadPenalty;
  if (emp.recentWorkload > 10) reasons.push(`(carga alta: ${emp.recentWorkload}, balanceo)`);

  // Seniority bonus for harder (goal/utility/learning) tasks.
  if (['goal-based', 'utility-based', 'learning'].includes(requiredType)) {
    const senBonus = { junior: 0, 'semi-senior': 4, senior: 8, lead: 12 }[emp.seniority];
    score += senBonus;
    if (senBonus >= 8) reasons.push(`seniority ${emp.seniority}`);
  }

  return { score: Math.max(0, Math.round(score)), reasons };
};

/**
 * Map a goal intent to the department most likely to own it — guides Talía's
 * preferred-department weighting.
 */
const intentToDepartment: Record<string, string> = {
  'crecer-autoridad': 'Estrategia',
  'abrir-funnel-leads': 'Conversión',
  'salir-bache-alcance': 'Distribución & Alcance',
  'lanzar-oferta': 'Conversión',
  'reactivar-audiencia-dormida': 'Comunidad',
  'planificar-semana': 'Estrategia',
};

export const delegateGlobalOrder = (params: {
  brand: BrandProfile;
  globalOrder: string;
  horizonDays?: number;
  createMissionRecord?: boolean;
}): DelegationPlan => {
  const companyId = params.brand.name;
  const decomp = decomposeGoal({
    brandName: companyId,
    freeIntent: params.globalOrder,
    horizonDays: params.horizonDays,
  });

  const directory = getEmployeeDirectory(companyId);
  const preferredDept = intentToDepartment[decomp.matchedIntent] ?? 'Estrategia';

  const assignments: Assignment[] = decomp.playbook.tasks.map((task) => {
    const requiredType = inferBestTypeForTask(task.goal);
    const scored = directory
      .map((emp) => {
        const { score, reasons } = scoreEmployeeForTask(emp, requiredType, preferredDept, task.goal);
        return { emp, score, reasons };
      })
      .sort((a, b) => b.score - a.score);

    const winner = scored[0]!;
    return {
      taskId: task.id,
      taskGoal: task.goal,
      requiredType,
      requiredTypeName: AGENT_TYPES[requiredType].name,
      assignee: {
        id: winner.emp.id,
        name: winner.emp.name,
        department: winner.emp.department,
        agentType: winner.emp.agentType,
      },
      fitScore: winner.score,
      rationale: `Talía asigna a ${winner.emp.name} — ${winner.reasons.join(', ') || 'mejor disponible'}.`,
      considered: scored.slice(0, 4).map((s) => ({ id: s.emp.id, name: s.emp.name, score: s.score })),
      dependsOn: task.dependsOn,
    };
  });

  // Persist a mission record if requested so it shows in Mission Control.
  let missionId: string | undefined;
  if (params.createMissionRecord) {
    const m = createMission({
      brandId: companyId,
      freeIntent: params.globalOrder,
      matchedIntent: decomp.matchedIntent,
      playbook: decomp.playbook,
    });
    missionId = m.id;
  }

  // Audit trail.
  recordTrace({
    agentId: 'talia',
    decisionType: 'goal-decomposition',
    context: { globalOrder: params.globalOrder, matchedIntent: decomp.matchedIntent, tasks: assignments.length },
    alternatives: assignments.map((a) => ({
      option: `${a.taskId}→${a.assignee.name}`,
      score: a.fitScore,
      reasoning: a.rationale,
    })),
    chosen: `${decomp.playbook.name} (${assignments.length} delegaciones)`,
    reasoning: `Talía fragmentó la orden en ${assignments.length} tareas y las repartió por tipo de agente + departamento + carga.`,
    brandId: companyId,
    correlationId: missionId,
  });

  emit({
    type: 'TaliaDelegation',
    sourceAgent: 'talia',
    priority: 'high',
    correlationId: missionId ?? `talia-${Date.now()}`,
    payload: {
      globalOrder: params.globalOrder,
      intent: decomp.matchedIntent,
      assignments: assignments.map((a) => ({ task: a.taskId, to: a.assignee.id })),
    },
  });

  const deptCount = new Set(assignments.map((a) => a.assignee.department)).size;
  const managerNote =
    decomp.matchedIntent === 'unknown'
      ? `Recibí tu pedido. No matchea un playbook canónico, así que armé un plan exploratorio y lo repartí entre ${assignments.length} agentes.`
      : `Recibí tu orden "${params.globalOrder}". La fragmenté en ${assignments.length} tareas y las delegué a ${deptCount} departamento(s). Cada agente fue elegido por su tipo (taxonomía IBM), especialidad y carga actual.`;

  return {
    companyId,
    globalOrder: params.globalOrder,
    matchedIntent: decomp.matchedIntent,
    playbookName: decomp.playbook.name,
    managerBriefing: decomp.playbook.description,
    assignments,
    missionId,
    managerNote,
  };
};

/**
 * Talía's self-knowledge: a structured description of the system she manages.
 * Used by the UI and by her own briefings so she "knows the company".
 */
export const taliaSystemKnowledge = (
  companyId: string,
): {
  manager: string;
  company: string;
  whatSheManages: string[];
  agentTypesSheUses: Array<{ type: AgentType; name: string; delegateWhen: string }>;
  headcount: number;
} => {
  const dir = getEmployeeDirectory(companyId);
  return {
    manager: 'Talía — Agent Manager (Gerente de Operaciones & RR.HH. de Agentes)',
    company: companyId,
    whatSheManages: [
      'Recibe la orden global del usuario y la fragmenta entre los agentes desarrollados',
      'Conoce la estructura completa del sistema (departamentos, agentes, motores autónomos)',
      'Conoce a cada empleado: rol, tipo IBM, capacidades, seniority y carga',
      'Accede SOLO a los datos de empleados de esta empresa (sin filtración entre marcas)',
      'Balancea la carga de trabajo entre agentes al delegar',
      'Audita cada delegación con trazas de razonamiento y eventos del bus',
    ],
    agentTypesSheUses: Object.values(AGENT_TYPES).map((t) => ({
      type: t.type,
      name: t.name,
      delegateWhen: t.delegateWhen,
    })),
    headcount: dir.length,
  };
};
