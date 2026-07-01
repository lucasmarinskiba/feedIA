/**
 * All-In-One Brain Coordinator
 *
 * Enruta 150+ agentes FeedIA a través de un único cerebro.
 * - Analiza instruction
 * - Selecciona agentes relevantes
 * - Ejecuta en paralelo cuando posible
 * - Retroalimenta al brain
 *
 * Entrada: "Diseña un carrusel sobre IA"
 * Output: [carousel-designer-pro] → [art-director] → [publish]
 */

import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

export interface CoordinatorInput {
  instruction: string;
  context?: {
    platform?: 'instagram' | 'tiktok' | 'both';
    format?: 'carousel' | 'reel' | 'story' | 'video' | 'photo';
    urgency?: 'critical' | 'high' | 'medium' | 'low';
    tags?: string[];
  };
  brand: BrandProfile;
}

export interface AgentTask {
  agentId: string;
  agentType: 'designer' | 'copywriter' | 'strategist' | 'operator' | 'analyzer';
  instruction: string;
  dependencies?: string[]; // esperar a otros agentes
  parallel?: boolean;
  priority: number; // 1-10
}

export interface CoordinationResult {
  taskId: string;
  agents: AgentTask[];
  executionPlan: 'sequential' | 'parallel' | 'hybrid';
  estimatedDurationMs: number;
  reasoning: string[];
}

// ── Semantic agent registry ──────────────────────────────────────────────────

const AGENT_REGISTRY: Record<string, { type: AgentTask['agentType']; skills: string[] }> = {
  'carousel-designer-pro': {
    type: 'designer',
    skills: ['canvas-design', 'color-science', 'typography', 'image-curation'],
  },
  'reel-generator': {
    type: 'designer',
    skills: ['video-editing', 'hook-generation', 'trending-audio', 'transitions'],
  },
  'story-engagement-stacker': {
    type: 'designer',
    skills: ['story-design', 'interactive-elements', 'cta-optimization'],
  },
  'art-director': {
    type: 'designer',
    skills: ['visual-hierarchy', 'brand-compliance', 'aesthetic-alignment'],
  },
  'copywriting': {
    type: 'copywriter',
    skills: ['hook-writing', 'call-to-action', 'tone-matching', 'engagement-copy'],
  },
  'hook-generator': {
    type: 'copywriter',
    skills: ['attention-grabbing', 'pattern-interrupt', 'curiosity-gap'],
  },
  'reel-hook-master': {
    type: 'copywriter',
    skills: ['video-captions', 'hook-timing', 'retention-loops'],
  },
  'strategy': {
    type: 'strategist',
    skills: ['content-planning', 'calendar-alignment', 'kpi-targeting'],
  },
  'content-strategy': {
    type: 'strategist',
    skills: ['pillars', 'mix-optimization', 'cadence-planning'],
  },
  'growth-analyst': {
    type: 'analyzer',
    skills: ['metrics-analysis', 'trend-detection', 'gap-identification'],
  },
  'cu': {
    type: 'operator',
    skills: ['browser-automation', 'app-interaction', 'design-execution'],
  },
  'canva': {
    type: 'operator',
    skills: ['canva-design', 'template-editing', 'export-formats'],
  },
  'publish': {
    type: 'operator',
    skills: ['instagram-publishing', 'scheduling', 'multi-platform'],
  },
};

// ── Route instruction → agents ────────────────────────────────────────────────

const analyzeInstruction = (instruction: string, context?: CoordinatorInput['context']): string[] => {
  const lowerInst = instruction.toLowerCase();
  const agents: string[] = [];

  // Detectar formato + designer
  if (lowerInst.includes('carrusel') || lowerInst.includes('carousel')) {
    agents.push('carousel-designer-pro');
    agents.push('art-director');
  }
  if (lowerInst.includes('reel') || lowerInst.includes('video')) {
    agents.push('reel-generator');
    agents.push('reel-hook-master');
  }
  if (lowerInst.includes('story') || lowerInst.includes('stories')) {
    agents.push('story-engagement-stacker');
  }

  // Detectar copy
  if (
    lowerInst.includes('escribir') ||
    lowerInst.includes('caption') ||
    lowerInst.includes('copy') ||
    lowerInst.includes('texto')
  ) {
    agents.push('copywriting');
    agents.push('hook-generator');
  }

  // Detectar estrategia
  if (lowerInst.includes('plan') || lowerInst.includes('strategy') || lowerInst.includes('calendario')) {
    agents.push('strategy');
    agents.push('content-strategy');
  }

  // Detectar análisis
  if (lowerInst.includes('analiza') || lowerInst.includes('metrics') || lowerInst.includes('performance')) {
    agents.push('growth-analyst');
  }

  // Detectar ejecución
  if (lowerInst.includes('publica') || lowerInst.includes('agenda') || lowerInst.includes('publica')) {
    agents.push('cu');
    agents.push('publish');
  }

  // Por defecto si no detecta nada: full stack
  if (agents.length === 0) {
    agents.push('carousel-designer-pro');
    agents.push('copywriting');
    agents.push('art-director');
    agents.push('cu');
    agents.push('publish');
  }

  return [...new Set(agents)]; // dedup
};

// ── Build execution plan ─────────────────────────────────────────────────────

export const coordinateAgents = async (input: CoordinatorInput): Promise<CoordinationResult> => {
  const selectedAgents = analyzeInstruction(input.instruction, input.context);

  const tasks: AgentTask[] = selectedAgents
    .filter((agentId) => AGENT_REGISTRY[agentId])
    .map((agentId, idx) => {
      const agent = AGENT_REGISTRY[agentId];
      const isExecutor = agent.type === 'operator';
      const isDesigner = agent.type === 'designer';

      return {
        agentId,
        agentType: agent.type,
        instruction: input.instruction,
        priority: isExecutor ? 1 : isDesigner ? 2 : 3,
        parallel: !isExecutor, // operators run last/sequential
        dependencies: isExecutor ? selectedAgents.filter((a) => AGENT_REGISTRY[a]?.type !== 'operator') : [],
      };
    })
    .sort((a, b) => a.priority - b.priority);

  // Execution plan: designers+strategists en paralelo, operators después secuencial
  const hasOperators = tasks.some((t) => t.agentType === 'operator');
  const executionPlan: CoordinationResult['executionPlan'] = hasOperators ? 'hybrid' : 'parallel';

  const estimatedDurationMs = tasks.length * 1000 + (hasOperators ? 5000 : 0); // rough estimate

  const reasoning = [
    `Detectadas ${selectedAgents.length} agentes relevantes`,
    `Plan: ${executionPlan} (designers/copywriters en paralelo, operators secuencial)`,
    `Duración estimada: ${estimatedDurationMs}ms`,
  ];

  log.info(`[AllInOne] Coordinator: ${selectedAgents.join(', ')}`);

  return {
    taskId: `coord-${Date.now()}`,
    agents: tasks,
    executionPlan,
    estimatedDurationMs,
    reasoning,
  };
};

// ── Execute coordination ─────────────────────────────────────────────────────

export const executeCoordination = async (
  coordination: CoordinationResult,
  brand: BrandProfile,
): Promise<{ success: boolean; results: Map<string, unknown>; durationMs: number }> => {
  const startTime = Date.now();
  const results = new Map<string, unknown>();

  // TODO: Integrate with actual agent executors
  // For now, log the plan
  log.info(`[AllInOne] Executing ${coordination.agents.length} agents: ${coordination.executionPlan}`);

  for (const task of coordination.agents) {
    log.info(`[AllInOne] ${task.agentId}: ${task.instruction.slice(0, 50)}...`);
    // Agent execution would go here via skill invocation or API call
    results.set(task.agentId, { status: 'pending' });
  }

  const durationMs = Date.now() - startTime;

  return {
    success: true,
    results,
    durationMs,
  };
};
