/**
 * Design Master Tool — Agente puede llamar para diseño
 *
 * Uso: agente llama "design_workflow" con instrucción + formato
 * Retorna: plan ejecutable (CU o Studio) o resultado final
 */

import { log } from '../logger.js';
import type { BrandProfile } from '../../config/types.js';
import {
  orchestrateDesignWorkflow,
  type DesignWorkflow,
  type DesignResult,
} from '../../brain/integration/designMasterOrchestrator.js';

export interface DesignMasterToolInput {
  instruction: string;
  format: 'carousel' | 'reel' | 'story' | 'tiktok-video' | 'tiktok-photo' | 'tiktok-script';
  platform: 'instagram' | 'tiktok';
  useComputerUse?: boolean;
  slideCount?: number;
  brand?: BrandProfile;
}

export interface DesignMasterToolOutput {
  workflowId: string;
  status: 'planned' | 'executing' | 'completed' | 'requires-human';
  executionMode: 'computer-use' | 'studio-tools' | 'hybrid';
  estimatedDurationMs: number;
  result?: DesignResult;
  studioInsights?: Record<string, unknown>;
  humanReview?: boolean;
  reasoning: string[];
  nextSteps: string[];
}

// ── Tool handler (called by agent) ──────────────────────────────────────

export const handleDesignMasterTool = async (input: DesignMasterToolInput): Promise<DesignMasterToolOutput> => {
  log.info(`[Design Master Tool] Recibió: ${input.instruction} (${input.format}/${input.platform})`);

  const workflow: DesignWorkflow = {
    instruction: input.instruction,
    format: input.format,
    platform: input.platform,
    brand: input.brand,
    useComputerUse: input.useComputerUse !== false,
    slideCount: input.slideCount,
  };

  try {
    // 1. Orchestrate
    const plan = await orchestrateDesignWorkflow(workflow, input.useComputerUse !== false);

    // 2. Determine if needs human review
    const needsHumanReview = plan.executionMode === 'computer-use' && !input.useComputerUse;

    // 3. If Studio mode: return insights to agent
    if (plan.executionMode === 'studio-tools') {
      return {
        workflowId: plan.workflowId,
        status: 'planned',
        executionMode: 'studio-tools',
        estimatedDurationMs: plan.estimatedDurationMs,
        studioInsights: plan.studioInsights,
        humanReview: false,
        reasoning: plan.reasoning,
        nextSteps: [
          'Herramientas Studio enriquecidas con insights de Canva Specialist',
          `Usuario diseña manualmente con guidance (${input.format})`,
          'Agente puede revisar resultado cuando esté listo',
        ],
      };
    }

    // 4. If CU mode: return plan ready for execution
    if (plan.executionMode === 'computer-use' && plan.cuPlan) {
      return {
        workflowId: plan.workflowId,
        status: 'planned',
        executionMode: 'computer-use',
        estimatedDurationMs: plan.estimatedDurationMs,
        result: undefined, // será completado por CU
        humanReview: needsHumanReview,
        reasoning: plan.reasoning,
        nextSteps: [
          `Computer Use abrirá Canva`,
          `Ejecutará ${plan.cuPlan.cuActions.length} acciones`,
          `Exportará diseño`,
          'Agente validará resultado',
        ],
      };
    }

    throw new Error('No execution mode determined');
  } catch (error) {
    log.error(`[Design Master Tool] Error: ${error}`);

    return {
      workflowId: `design-error-${Date.now()}`,
      status: 'requires-human',
      executionMode: 'studio-tools', // fallback
      estimatedDurationMs: 0,
      humanReview: true,
      reasoning: [`Error en Design Master: ${error}`, 'Fallback a Studio Tools manual'],
      nextSteps: ['User: abre herramienta Studio correspondiente', 'Agente espera resultado'],
    };
  }
};

// ── Tool spec for agent tools registry ──────────────────────────────────

export const designMasterToolSpec = {
  name: 'design_workflow',
  description:
    'Inicia workflow de diseño: Consulta Canva Specialist, planifica ejecución (CU o Studio), retorna plan o insights',
  input_schema: {
    type: 'object' as const,
    properties: {
      instruction: {
        type: 'string',
        description: 'Instrucción de diseño. Ej: "carrusel sobre productividad con hook fuerte"',
      },
      format: {
        type: 'string' as const,
        enum: ['carousel', 'reel', 'story', 'tiktok-video', 'tiktok-photo', 'tiktok-script'] as const,
        description: 'Formato de contenido',
      },
      platform: {
        type: 'string' as const,
        enum: ['instagram', 'tiktok'] as const,
        description: 'Red social destino',
      },
      useComputerUse: {
        type: 'boolean',
        description: 'Usar Computer Use (default true). Si false: Studio Tools insights',
      },
      slideCount: {
        type: 'number',
        description: 'Solo para carousel: cuántos slides (default 10)',
      },
    },
    required: ['instruction', 'format', 'platform'],
  },
};

// ── Integration with agent tools ───────────────────────────────────────

export const registerDesignMasterTool = (toolRegistry: Map<string, Function>): void => {
  toolRegistry.set('design_workflow', handleDesignMasterTool);
  log.info(`[Design Master] Registered tool: design_workflow`);
};
