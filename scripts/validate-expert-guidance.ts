/**
 * Phase 8: Validate expert guidance injection
 * Tests that all enriched endpoints return correct structure
 */

import { salaToolsAPI } from '../src/brain/integration/salaToolsMaster.js';
import { log } from '../src/agent/logger.js';

const tools = [
  'home',
  'calendar',
  'inteligencia',
  'imperio',
  'forge',
  'cuToolbox',
  'quality',
] as const;

type ToolName = (typeof tools)[number];

const validateToolGuidance = async (toolName: ToolName): Promise<boolean> => {
  try {
    const toolGetter = salaToolsAPI[toolName as keyof typeof salaToolsAPI];

    if (!toolGetter) {
      log.error(`[Validation] Tool not found: ${toolName}`);
      return false;
    }

    const guidance = await toolGetter();

    // Validate structure
    if (!guidance.expertAdvice || !Array.isArray(guidance.expertAdvice)) {
      log.error(`[Validation] ${toolName}: Missing expertAdvice array`);
      return false;
    }

    if (!guidance.recommendations || !Array.isArray(guidance.recommendations)) {
      log.error(`[Validation] ${toolName}: Missing recommendations array`);
      return false;
    }

    if (!guidance.qualityThresholds || typeof guidance.qualityThresholds !== 'object') {
      log.error(`[Validation] ${toolName}: Missing qualityThresholds`);
      return false;
    }

    if (!guidance.nextSteps || !Array.isArray(guidance.nextSteps)) {
      log.error(`[Validation] ${toolName}: Missing nextSteps array`);
      return false;
    }

    // Validate expert advice content
    const validDisciplines = guidance.expertAdvice.map((e) => e.discipline);
    log.info(`[Validation] ✓ ${toolName}: ${validDisciplines.join(' + ')}`);
    log.info(
      `[Validation]   Recommendations: ${guidance.recommendations.length}, Thresholds: ${Object.keys(guidance.qualityThresholds).length}`,
    );

    return true;
  } catch (error) {
    log.error(`[Validation] ${toolName} error: ${error}`);
    return false;
  }
};

export const validateAllTools = async (): Promise<void> => {
  log.info('[Phase 8] Starting expert guidance validation...\n');

  const results = await Promise.all(tools.map(validateToolGuidance));

  const passed = results.filter(Boolean).length;
  const total = results.length;

  log.info(`\n[Phase 8] Results: ${passed}/${total} tools validated`);

  if (passed === total) {
    log.info('[Phase 8] ✓ All expert guidance structures valid');
  } else {
    log.error(`[Phase 8] ✗ ${total - passed} tools failed validation`);
    process.exit(1);
  }
};

// Run if invoked directly
validateAllTools().catch(console.error);
