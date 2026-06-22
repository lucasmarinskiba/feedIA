/**
 * Talía — Organizational Chart & Employee Directory
 * ─────────────────────────────────────────────────────────────────────────
 * Talía is the Agent Manager: she receives the user's GLOBAL order and, like
 * an HR/operations manager, knows the whole company structure, every
 * "employee" (each agent), their department, their classical agent type (IBM
 * taxonomy), their capabilities, their workload, and their access scope.
 *
 * SECURITY: every employee record is scoped to a brand (the "company").
 * Talía never returns data for a brand other than the one in the request —
 * this prevents information leakage between companies that share the system.
 */

import {
  listClassifiedAgents,
  getClassifiedAgent,
  listDepartments,
  AGENT_TYPES,
  type ClassifiedAgent,
  type AgentType,
} from '../agentTaxonomy/index.js';
import { listTraces } from '../reasoningTrace/index.js';

export interface Employee {
  /** Unique within the company (agentId). */
  id: string;
  name: string;
  department: string;
  /** Classical IBM agent type. */
  agentType: AgentType;
  agentTypeName: string;
  /** Job description derived from capabilities. */
  role: string;
  capabilities: string[];
  /** Seniority inferred from how many decisions they've made with outcomes. */
  seniority: 'junior' | 'semi-senior' | 'senior' | 'lead';
  /** Decisions logged in the last window — proxy for workload. */
  recentWorkload: number;
  /** Brand this employee record belongs to (access scope). */
  companyId: string;
  /** Manager (Talía) always supervises everyone. */
  reportsTo: 'talia';
}

const seniorityFor = (decisions: number): Employee['seniority'] => {
  if (decisions >= 40) return 'lead';
  if (decisions >= 15) return 'senior';
  if (decisions >= 5) return 'semi-senior';
  return 'junior';
};

/**
 * Build the employee directory for ONE company (brand). Workload/seniority
 * are computed from that brand's reasoning traces only — never cross-brand.
 */
export const getEmployeeDirectory = (companyId: string): Employee[] => {
  const traces = listTraces({ brandId: companyId, limit: 1000 });
  const workloadByAgent = new Map<string, number>();
  for (const t of traces) {
    workloadByAgent.set(t.agentId, (workloadByAgent.get(t.agentId) ?? 0) + 1);
  }

  return listClassifiedAgents().map((c: ClassifiedAgent) => {
    const workload = workloadByAgent.get(c.agentId) ?? 0;
    return {
      id: c.agentId,
      name: c.label,
      department: c.department,
      agentType: c.type,
      agentTypeName: AGENT_TYPES[c.type].name,
      role: c.capabilities.slice(0, 3).join(' · '),
      capabilities: c.capabilities,
      seniority: seniorityFor(workload),
      recentWorkload: workload,
      companyId,
      reportsTo: 'talia' as const,
    };
  });
};

/**
 * Get a single employee, scoped to the company. Returns null if the agent
 * doesn't exist — never leaks another company's data because workload is
 * always recomputed from the requested companyId's traces.
 */
export const getEmployee = (companyId: string, employeeId: string): Employee | null => {
  const base = getClassifiedAgent(employeeId);
  if (!base) return null;
  const dir = getEmployeeDirectory(companyId);
  return dir.find((e) => e.id === employeeId) ?? null;
};

export interface OrgChart {
  companyId: string;
  manager: { id: 'talia'; name: 'Talía'; title: string };
  departments: Array<{
    name: string;
    headcount: number;
    employees: Array<Pick<Employee, 'id' | 'name' | 'agentType' | 'agentTypeName' | 'seniority' | 'recentWorkload'>>;
  }>;
  totalEmployees: number;
  byAgentType: Record<AgentType, number>;
}

export const buildOrgChart = (companyId: string): OrgChart => {
  const dir = getEmployeeDirectory(companyId);
  const departments = listDepartments().map((dept) => {
    const employees = dir
      .filter((e) => e.department === dept)
      .map((e) => ({
        id: e.id,
        name: e.name,
        agentType: e.agentType,
        agentTypeName: e.agentTypeName,
        seniority: e.seniority,
        recentWorkload: e.recentWorkload,
      }));
    return { name: dept, headcount: employees.length, employees };
  });

  const byAgentType = {} as Record<AgentType, number>;
  for (const e of dir) {
    byAgentType[e.agentType] = (byAgentType[e.agentType] ?? 0) + 1;
  }

  return {
    companyId,
    manager: {
      id: 'talia',
      name: 'Talía',
      title: 'Agent Manager · Gerente de Operaciones & RR.HH. de Agentes',
    },
    departments,
    totalEmployees: dir.length,
    byAgentType,
  };
};
