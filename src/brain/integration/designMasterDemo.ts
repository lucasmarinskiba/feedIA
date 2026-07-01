/**
 * Design Master End-to-End Demo
 *
 * Flujo completo:
 * 1. Usuario: "Carrusel sobre productividad"
 * 2. Agent llama design_workflow tool
 * 3. Design Master → Canva Specialist → plan
 * 4. Elige CU o Studio
 * 5. Ejecuta → resultado
 */

import { log } from '../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import { orchestrateDesignWorkflow, executeDesignWorkflow } from './designMasterOrchestrator.js';
import { executeCuDesignWorkflow } from '../../capabilities/computerUse/cuDesignExecution.js';
import { injectCanvaInsightsToStudio } from '../../capabilities/computerUse/cuCanvaBridge.js';

export const demoDesignMasterFlow = async (brand: BrandProfile): Promise<void> => {
  log.info('=== DESIGN MASTER END-TO-END DEMO ===');

  // Scenario 1: User requests carousel, CU mode
  log.info('\n[Scenario 1] Carrusel + Computer Use');
  const scenario1 = await orchestrateDesignWorkflow(
    {
      instruction: 'Carrusel sobre 5 tips de productividad, hook fuerte',
      format: 'carousel',
      platform: 'instagram',
      brand,
      useComputerUse: true,
      slideCount: 10,
    },
    true, // CU enabled
  );

  log.info(`Mode: ${scenario1.executionMode}`);
  log.info(`Estimated: ${(scenario1.estimatedDurationMs / 1000).toFixed(1)}s`);
  log.info(`Reasoning: ${scenario1.reasoning.join(' | ')}`);

  if (scenario1.cuPlan) {
    log.info(`CU Plan: ${scenario1.cuPlan.cuActions.length} acciones`);
    log.info(`Design: ${scenario1.designSpec.layout.pattern} layout, ${scenario1.designSpec.imagery.style} imagery`);

    // Execute CU
    const cuResult = await executeCuDesignWorkflow(scenario1.cuPlan, 'demo-session-1');
    log.info(`CU Result: ${cuResult.stepsDone}/${cuResult.stepsTotal} steps, quality=${cuResult.designQuality}`);
  }

  // Scenario 2: User prefers Studio tools (no CU)
  log.info('\n[Scenario 2] Reel + Studio Tools (sin CU)');
  const scenario2 = await orchestrateDesignWorkflow(
    {
      instruction: 'Reel viral sobre tendencias 2026',
      format: 'reel',
      platform: 'instagram',
      brand,
      useComputerUse: false, // User disabled CU
    },
    true, // CU enabled on system
  );

  log.info(`Mode: ${scenario2.executionMode}`);
  log.info(`Estimated: ${(scenario2.estimatedDurationMs / 1000).toFixed(1)}s`);

  if (scenario2.studioInsights) {
    log.info(`Studio Insights injected:`);
    Object.entries(scenario2.studioInsights).forEach(([key, value]) => {
      log.info(`  ${key}: ${typeof value === 'object' ? JSON.stringify(value).slice(0, 80) : value}`);
    });
  }

  // Scenario 3: TikTok with all modes
  log.info('\n[Scenario 3] TikTok Video + Auto-detect mode');
  const scenario3 = await orchestrateDesignWorkflow(
    {
      instruction: 'Video TikTok sobre inteligencia artificial, trending sounds',
      format: 'tiktok-video',
      platform: 'tiktok',
      brand,
      useComputerUse: true,
    },
    true,
  );

  log.info(`Mode: ${scenario3.executionMode}`);
  log.info(`Design Spec:`);
  log.info(`  Colors: ${scenario3.designSpec.colorPalette.primary}`);
  log.info(`  Layout: ${scenario3.designSpec.layout.pattern}`);
  log.info(`  Animation: ${scenario3.designSpec.animation.style}`);
  log.info(`  Duration: ${scenario3.estimatedDurationMs}ms`);

  log.info('\n=== DEMO COMPLETE ===');
  log.info('Scenarios testeadas:');
  log.info('  ✓ Carousel + CU');
  log.info('  ✓ Reel + Studio Tools');
  log.info('  ✓ TikTok Video + Auto');
};

// Export for testing
export default demoDesignMasterFlow;
