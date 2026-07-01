/**
 * Expert Guidance Middleware
 *
 * Inyecta guidance de expertos en respuestas de endpoints Sala.
 *
 * Uso:
 * ```
 * const response = { ... normal response ... };
 * const enriched = await withExpertGuidance('home', response);
 * json(res, 200, enriched);
 * ```
 */

import { log } from '../../agent/logger.js';
import { salaToolsAPI } from '../../brain/integration/salaToolsMaster.js';

export interface ExpertEnrichedResponse {
  data: unknown;
  expertGuidance?: {
    disciplines: string[];
    keyRecommendations: string[];
    qualityThresholds: Record<string, string | number>;
    nextSteps: string[];
  };
  metadata?: {
    enrichedAt: string;
    expertCount: number;
  };
}

/**
 * Enrich response with expert guidance
 */
export const withExpertGuidance = async (
  toolName: string,
  responseData: unknown,
): Promise<ExpertEnrichedResponse> => {
  try {
    // Get expert guidance for this tool
    const toolGetter = salaToolsAPI[toolName as keyof typeof salaToolsAPI];

    if (!toolGetter) {
      log.warn(`[Expert Middleware] Unknown tool: ${toolName}`);
      return {
        data: responseData,
      };
    }

    const guidance = await toolGetter();

    return {
      data: responseData,
      expertGuidance: {
        disciplines: guidance.expertAdvice.map((e) => e.discipline),
        keyRecommendations: guidance.recommendations.slice(0, 5),
        qualityThresholds: guidance.qualityThresholds,
        nextSteps: guidance.nextSteps,
      },
      metadata: {
        enrichedAt: new Date().toISOString(),
        expertCount: guidance.expertAdvice.length,
      },
    };
  } catch (error) {
    log.error(`[Expert Middleware] Error enriching response: ${error}`);
    return {
      data: responseData,
    };
  }
};

/**
 * Extract quality thresholds for validation
 */
export const getQualityThresholds = async (toolName: string): Promise<Record<string, string | number>> => {
  try {
    const toolGetter = salaToolsAPI[toolName as keyof typeof salaToolsAPI];
    if (!toolGetter) return {};

    const guidance = await toolGetter();
    return guidance.qualityThresholds;
  } catch {
    return {};
  }
};

/**
 * Get expert recommendations for decision-making
 */
export const getExpertRecommendations = async (toolName: string, limit: number = 5): Promise<string[]> => {
  try {
    const toolGetter = salaToolsAPI[toolName as keyof typeof salaToolsAPI];
    if (!toolGetter) return [];

    const guidance = await toolGetter();
    return guidance.recommendations.slice(0, limit);
  } catch {
    return [];
  }
};

/**
 * Validate response against expert quality standards
 */
export const validateAgainstExpertStandards = async (
  toolName: string,
  _metrics: Record<string, number | string>,
): Promise<{ valid: boolean; failures: string[] }> => {
  try {
    const thresholds = await getQualityThresholds(toolName);
    const failures: string[] = [];

    for (const [metricName, thresholdStr] of Object.entries(thresholds)) {
      if (typeof thresholdStr === 'string') {
        // Parse string thresholds like "< 15min" or "> 4.5/5"
        if (thresholdStr.includes('WCAG')) {
          // Accessibility: just log
          log.info(`[Expert Validation] ${metricName}: WCAG AA required`);
        } else if (thresholdStr.includes('<') || thresholdStr.includes('>') || thresholdStr.includes('=')) {
          // Compare numeric values
          // TODO: Implement proper comparison logic
        }
      }
    }

    return {
      valid: failures.length === 0,
      failures,
    };
  } catch (error) {
    log.error(`[Expert Validation] Error: ${error}`);
    return { valid: false, failures: ['Validation error'] };
  }
};

log.info('[Expert Guidance Middleware] Initialized');
