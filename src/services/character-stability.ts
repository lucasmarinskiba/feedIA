/**
 * Character Stability Service
 * Ensures character consistency across carousel frames
 * Validates + enforces visual trait locks
 */

import { log } from '../agent/logger.js';
import { consistencyLockManager } from './consistency-lock.js';
import { qualityValidator } from './quality-validator.js';

interface StabilityReport {
  seriesId: string;
  frameCount: number;
  consistencyScore: number; // 0-100
  issues: string[];
  recommendations: string[];
  locksApplied: string[];
}

class CharacterStabilityService {
  /**
   * Validate character consistency across prompts
   */
  async validateCharacterConsistency(
    seriesId: string,
    prompts: string[]
  ): Promise<StabilityReport> {
    const seriesLock = consistencyLockManager.getSeriesLock(seriesId);

    if (!seriesLock) {
      return {
        seriesId,
        frameCount: prompts.length,
        consistencyScore: 0,
        issues: ['Series lock not found'],
        recommendations: ['Create series lock first'],
        locksApplied: [],
      };
    }

    let consistencyScore = 100;
    const issues: string[] = [];
    const locksApplied: string[] = [];

    // Check character locks
    if (seriesLock.characterLock) {
      const charLock = seriesLock.characterLock;
      locksApplied.push(`Character: ${charLock.characterName}`);

      for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i]!;

        // Check if character traits present
        if (!prompt.toLowerCase().includes(charLock.characterName.toLowerCase())) {
          issues.push(`Frame ${i + 1}: Character name missing`);
          consistencyScore -= 5;
        }

        // Check for contradicting descriptions
        if (prompt.toLowerCase().includes('different outfit')) {
          issues.push(`Frame ${i + 1}: Outfit inconsistency detected`);
          consistencyScore -= 10;
        }

        if (prompt.toLowerCase().includes('different skin') || prompt.toLowerCase().includes('skin change')) {
          issues.push(`Frame ${i + 1}: Skin tone change detected`);
          consistencyScore -= 15;
        }

        // Validate ortografia
        const validation = await qualityValidator.validatePrompt(prompt);
        if (!validation.passed) {
          issues.push(`Frame ${i + 1}: Quality issues (score: ${validation.score})`);
          consistencyScore -= validation.score < 70 ? 10 : 3;
        }
      }
    }

    // Check product locks
    if (seriesLock.productLock) {
      const prodLock = seriesLock.productLock;
      locksApplied.push(`Product: ${prodLock.productName}`);

      for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i]!;

        // Check if product present
        if (!prompt.toLowerCase().includes(prodLock.productName.toLowerCase())) {
          issues.push(`Frame ${i + 1}: Product missing`);
          consistencyScore -= 5;
        }

        // Check for shape/color changes
        if (
          prompt.toLowerCase().includes('different shape') ||
          prompt.toLowerCase().includes('different color')
        ) {
          issues.push(`Frame ${i + 1}: Product appearance changed`);
          consistencyScore -= 12;
        }
      }
    }

    // Check environment locks
    if (seriesLock.environmentLock) {
      const envLock = seriesLock.environmentLock;
      locksApplied.push(`Environment: ${envLock.settingName}`);

      for (let i = 0; i < prompts.length; i++) {
        const prompt = prompts[i]!;

        // Check for setting changes
        if (prompt.toLowerCase().includes('different location') || prompt.toLowerCase().includes('new setting')) {
          issues.push(`Frame ${i + 1}: Setting changed`);
          consistencyScore -= 10;
        }

        // Check for lighting changes
        if (
          prompt.toLowerCase().includes('different lighting') ||
          prompt.toLowerCase().includes('different time')
        ) {
          issues.push(`Frame ${i + 1}: Lighting/time inconsistency`);
          consistencyScore -= 8;
        }
      }
    }

    consistencyScore = Math.max(0, Math.min(100, consistencyScore));

    // Generate recommendations
    const recommendations: string[] = [];
    if (consistencyScore < 70) {
      recommendations.push('Consider regenerating frames with stricter lock instructions');
      recommendations.push('Review frame prompts for contradicting descriptions');
    }
    if (issues.length > 3) {
      recommendations.push('Multiple consistency issues found. Use quality refinement endpoint.');
    }
    if (consistencyScore < 50) {
      recommendations.push('Series consistency critical. Regenerate all frames.');
    }

    log.info('[CharacterStability] Consistency validation complete', {
      seriesId,
      score: consistencyScore,
      issueCount: issues.length,
    });

    return {
      seriesId,
      frameCount: prompts.length,
      consistencyScore,
      issues: issues.slice(0, 5), // Top 5 issues
      recommendations,
      locksApplied,
    };
  }

  /**
   * Generate carousel prompts with stability reinforcement
   */
  async generateStableCarouselPrompts(
    basePrompt: string,
    seriesId: string,
    frameCount: number,
    narrativeArc?: string[]
  ): Promise<string[]> {
    const seriesLock = consistencyLockManager.getSeriesLock(seriesId);

    if (!seriesLock) {
      throw new Error('Series lock not found');
    }

    const stablePrompts: string[] = [];
    const narrativeSteps = narrativeArc || Array(frameCount).fill('progression');

    for (let frameNum = 0; frameNum < frameCount; frameNum++) {
      let framePrompt = basePrompt;

      // Inject consistency lock
      framePrompt = consistencyLockManager.injectLockInstructions(framePrompt, seriesLock);

      // Add frame context
      framePrompt += `\n[CAROUSEL CONTEXT]
Frame: ${frameNum + 1}/${frameCount}
Narrative: ${narrativeSteps[frameNum]}
[CRITICAL] Maintain ALL consistency locks. Character, product, environment MUST be identical to Frame 1.`;

      stablePrompts.push(framePrompt);
    }

    log.info('[CharacterStability] Stable carousel prompts generated', {
      seriesId,
      frameCount,
      narrativeArc: narrativeArc?.length || 0,
    });

    return stablePrompts;
  }

  /**
   * Suggest stability improvements for existing prompts
   */
  async suggestStabilityImprovements(
    seriesId: string,
    prompts: string[]
  ): Promise<Record<string, any>> {
    const validation = await this.validateCharacterConsistency(seriesId, prompts);

    if (validation.consistencyScore >= 80) {
      return {
        status: 'stable',
        score: validation.consistencyScore,
        message: 'Carousel is stable. No changes needed.',
      };
    }

    const seriesLock = consistencyLockManager.getSeriesLock(seriesId);

    return {
      status: 'needs_refinement',
      score: validation.consistencyScore,
      issues: validation.issues,
      improvements: [
        {
          issue: 'Character consistency',
          fix: seriesLock?.characterLock
            ? `Ensure all frames describe: "${seriesLock.characterLock.characterName}", age ${seriesLock.characterLock.ageRange}, outfit "${seriesLock.characterLock.outfitDescription}"`
            : 'No character lock',
        },
        {
          issue: 'Product consistency',
          fix: seriesLock?.productLock
            ? `All frames must show: ${seriesLock.productLock.productName}, ${seriesLock.productLock.color}, ${seriesLock.productLock.material}`
            : 'No product lock',
        },
        {
          issue: 'Environment consistency',
          fix: seriesLock?.environmentLock
            ? `Maintain: ${seriesLock.environmentLock.settingName}, ${seriesLock.environmentLock.lighting} lighting, ${seriesLock.environmentLock.timeOfDay}`
            : 'No environment lock',
        },
      ],
      nextStep: 'Use /api/consistency/regenerate-stable to regenerate with strict locks',
    };
  }
}

export const characterStabilityService = new CharacterStabilityService();
