/**
 * Sala Tools Master — Expert knowledge injection for all Sala tools
 *
 * Cada herramienta de Sala recibe guidance de múltiples expertos según su propósito:
 * - Home: Admin + Strategy + Psychology
 * - Calendar: Admin + Marketing + Data
 * - Brújula: Strategy + Marketing + Psychology
 * - Intelligence: Data + Strategy + Branding
 * - Empire: Admin + Strategy + Sales + Data
 * - Forge: Design + Visual + Branding + Psychology
 * - Pizarra: Design + Strategy + Visual + Admin
 * - Assistant: Marketing + Psychology + Admin
 * - Etc.
 */

import { log } from '../../agent/logger.js';
import {
  getAllExpertAdvice,
  getMultiExpertAdvice,
  type ExpertAdvice,
} from '../experts/expertRegistry.js';

export interface SalaToolContext {
  tool: string;
  task: string;
  objective: string;
}

export interface SalaToolGuidance {
  tool: string;
  task: string;
  expertAdvice: ExpertAdvice[];
  recommendations: string[];
  qualityThresholds: { [key: string]: number | string };
  nextSteps: string[];
}

// ── Tool-specific expert assignments ──────────────────────────────────

const toolExpertMapping: Record<string, (keyof typeof import('../experts/expertRegistry.ts').expertRegistry)[]> = {
  home: ['admin', 'strategy', 'psychology'],
  calendar: ['admin', 'marketing', 'data'],
  brujula: ['strategy', 'marketing', 'psychology'],
  inteligencia: ['data', 'strategy', 'branding'],
  imperio: ['admin', 'strategy', 'sales', 'data'],
  forge: ['design', 'visual', 'branding', 'psychology'],
  pizarra: ['design', 'strategy', 'visual', 'admin'],
  assistant: ['marketing', 'psychology', 'admin'],
  workspace: ['admin', 'strategy', 'data'],
  cuToolbox: ['design', 'psychology', 'sales'],
  achievements: ['psychology', 'marketing', 'branding'],
  personalization: ['psychology', 'branding', 'marketing'],
};

// ── Get expert guidance for tool ────────────────────────────────────

export const getToolGuidance = async (context: SalaToolContext): Promise<SalaToolGuidance> => {
  log.info(`[Sala Master] ${context.tool}: ${context.task}`);

  // Get relevant experts for this tool
  const experts = toolExpertMapping[context.tool] || ['admin', 'strategy', 'psychology'];
  const expertise = getMultiExpertAdvice(experts as any);

  if (expertise.length === 0) {
    log.warn(`[Sala Master] No experts found for ${context.tool}`);
  }

  // Consolidate recommendations
  const recommendations = expertise.flatMap((e) => e.guidance.slice(0, 3)); // Top 3 from each expert

  // Define quality thresholds based on experts
  const qualityThresholds = {
    'completion-time': '< 15min',
    'error-rate': '< 2%',
    'user-satisfaction': '> 4.5/5',
    'data-accuracy': '> 98%',
    'consistency': '100%',
    'accessibility': 'WCAG AA minimum',
  };

  return {
    tool: context.tool,
    task: context.task,
    expertAdvice: expertise,
    recommendations,
    qualityThresholds,
    nextSteps: [
      `Follow ${expertise.length} expert guidance paths`,
      `Execute with ${expertise.map((e) => e.discipline).join(', ')} principles`,
      `Validate against quality thresholds`,
      `Track metrics for continuous improvement`,
    ],
  };
};

// ── Tool-specific guidance builders ───────────────────────────────────

/**
 * Home: Dashboard + Overview
 * Experts: Admin, Strategy, Psychology
 */
export const getHomeGuidance = async (): Promise<SalaToolGuidance> =>
  getToolGuidance({
    tool: 'home',
    task: 'Create dashboard that guides user to next best action',
    objective: 'Maximize engagement + clarity + action orientation',
  });

/**
 * Calendar: Planning + Scheduling
 * Experts: Admin, Marketing, Data
 */
export const getCalendarGuidance = async (): Promise<SalaToolGuidance> =>
  getToolGuidance({
    tool: 'calendar',
    task: 'Schedule content optimally across channels + time',
    objective: 'Maximum reach + consistency + engagement rhythm',
  });

/**
 * Brújula: Daily Direction + Priorities
 * Experts: Strategy, Marketing, Psychology
 */
export const getBrujulaGuidance = async (): Promise<SalaToolGuidance> =>
  getToolGuidance({
    tool: 'brujula',
    task: 'Guide user to high-impact actions daily',
    objective: 'Focus fire on what matters most',
  });

/**
 * Intelligence: Analytics + Insights
 * Experts: Data, Strategy, Branding
 */
export const getIntelligenceGuidance = async (): Promise<SalaToolGuidance> =>
  getToolGuidance({
    tool: 'inteligencia',
    task: 'Surface actionable insights from data',
    objective: 'Data-driven decision making',
  });

/**
 * Empire: Business Dashboard
 * Experts: Admin, Strategy, Sales, Data
 */
export const getEmpireGuidance = async (): Promise<SalaToolGuidance> =>
  getToolGuidance({
    tool: 'imperio',
    task: 'Show business health + growth trajectory',
    objective: 'Executive-level clarity on business state',
  });

/**
 * Forge: Creative Creation
 * Experts: Design, Visual, Branding, Psychology
 */
export const getForgeGuidance = async (): Promise<SalaToolGuidance> =>
  getToolGuidance({
    tool: 'forge',
    task: 'Create branded content that resonates emotionally',
    objective: 'Maximum impact + consistency + authenticity',
  });

/**
 * Pizarra: Whiteboard + Strategy
 * Experts: Design, Strategy, Visual, Admin
 */
export const getPizarraGuidance = async (): Promise<SalaToolGuidance> =>
  getToolGuidance({
    tool: 'pizarra',
    task: 'Visualize strategy + ideas + workflows',
    objective: 'Clear communication + alignment',
  });

/**
 * Assistant: AI Chat
 * Experts: Marketing, Psychology, Admin
 */
export const getAssistantGuidance = async (): Promise<SalaToolGuidance> =>
  getToolGuidance({
    tool: 'assistant',
    task: 'Provide helpful, persuasive, actionable advice',
    objective: 'User feels supported + empowered',
  });

/**
 * Workspace: Task Management
 * Experts: Admin, Strategy, Data
 */
export const getWorkspaceGuidance = async (): Promise<SalaToolGuidance> =>
  getToolGuidance({
    tool: 'workspace',
    task: 'Organize tasks + collaborate + track progress',
    objective: 'Team alignment + productivity',
  });

/**
 * CU Toolbox: Computer Use Tools
 * Experts: Design, Psychology, Sales
 */
export const getCuToolboxGuidance = async (): Promise<SalaToolGuidance> =>
  getToolGuidance({
    tool: 'cuToolbox',
    task: 'Enable automation that delights users',
    objective: 'Effortless + reliable automation',
  });

// ── Unified Sala Tools API ────────────────────────────────────────────

export const salaToolsAPI = {
  home: getHomeGuidance,
  calendar: getCalendarGuidance,
  brujula: getBrujulaGuidance,
  inteligencia: getIntelligenceGuidance,
  imperio: getEmpireGuidance,
  forge: getForgeGuidance,
  pizarra: getPizarraGuidance,
  assistant: getAssistantGuidance,
  workspace: getWorkspaceGuidance,
  cuToolbox: getCuToolboxGuidance,
};

log.info('[Sala Tools Master] Initialized with 10 expert-powered tools');
