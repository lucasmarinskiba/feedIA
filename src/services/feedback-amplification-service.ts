/**
 * Feedback Amplification Loop
 *
 * Closes the viral optimization loop:
 * 1. Measure variant performance
 * 2. Identify winner
 * 3. Extract winning patterns
 * 4. Update Niche Cache
 * 5. Next generation biased toward winners
 *
 * Called post-publication when metrics are available.
 */

import { log } from '../agent/logger.js';
import { variantFrameworkService } from './variant-framework-service.js';
import { nicheCacheService } from './niche-cache-service.js';

export interface FeedbackLoop {
  variantSetId: string;
  nicheId: string;
  winnerId: string;
  winningImprovements: string[];
  winningAngle?: string;
  metrics: {
    winnerReach?: number;
    winnerEngagement?: number;
    controlReach?: number;
    controlEngagement?: number;
    liftVsControl?: number; // % improvement over control
  };
}

class FeedbackAmplificationService {
  /**
   * Process variant performance data and update Niche Cache
   */
  processFeedback(variantSetId: string, nicheId: string): FeedbackLoop | null {
    // Extract variant set from framework
    const variantSet = variantFrameworkService.getVariantSet(variantSetId);
    if (!variantSet) {
      log.warn('[FeedbackAmplification] Variant set not found', { variantSetId });
      return null;
    }

    // Determine winner (requires metrics to be recorded first)
    const winnerId = variantFrameworkService.determineWinner(variantSetId);
    if (!winnerId) {
      log.warn('[FeedbackAmplification] No winner determined (no metrics?)', { variantSetId });
      return null;
    }

    // Extract winning patterns
    const patterns = variantFrameworkService.extractWinningPatterns(variantSetId);
    if (!patterns) {
      log.warn('[FeedbackAmplification] Failed to extract patterns', { variantSetId });
      return null;
    }

    // Record win in Niche Cache
    nicheCacheService.recordWin(nicheId, patterns.improvements, patterns.angle);

    // Calculate lift vs control
    const winner = variantFrameworkService.getVariant(winnerId);
    const control = variantFrameworkService.getVariant(variantSet.controlId);

    const winnerER = winner?.metrics?.engagement || 0;
    const controlER = control?.metrics?.engagement || 0;
    const liftVsControl = controlER > 0 ? ((winnerER - controlER) / controlER) * 100 : 0;

    const feedback: FeedbackLoop = {
      variantSetId,
      nicheId,
      winnerId,
      winningImprovements: patterns.improvements,
      winningAngle: patterns.angle,
      metrics: {
        winnerReach: winner?.metrics?.reach,
        winnerEngagement: winner?.metrics?.engagement,
        controlReach: control?.metrics?.reach,
        controlEngagement: control?.metrics?.engagement,
        liftVsControl,
      },
    };

    log.info('[FeedbackAmplification] Feedback processed', {
      variantSetId,
      nicheId,
      winnerId: winnerId.split(':')[1], // variant type
      liftVsControl: Math.round(liftVsControl * 100) / 100,
      improvementCount: patterns.improvements.length,
    });

    return feedback;
  }

  /**
   * Get recommended improvements for next generation (biased toward winners)
   */
  getRecommendedImprovements(nicheId: string, limit: number = 3): string[] {
    const topPatterns = nicheCacheService.getTopImprovements(nicheId, limit);
    return topPatterns.map((p) => p.improvement);
  }

  /**
   * Get recommended alternative angles for next generation
   */
  getRecommendedAngles(nicheId: string, limit: number = 2): string[] {
    const topAngles = nicheCacheService.getTopAlternativeAngles(nicheId, limit);
    return topAngles.map((p) => p.improvement);
  }

  /**
   * Check if improvement is high-confidence winner (high variance)
   */
  isHighConfidenceWinner(nicheId: string, improvement: string, minVariance: number = 0.6): boolean {
    const prob = nicheCacheService.getSuccessProbability(nicheId, improvement);
    return prob >= minVariance;
  }
}

export const feedbackAmplificationService = new FeedbackAmplificationService();
