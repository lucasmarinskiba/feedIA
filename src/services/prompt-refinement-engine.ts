/**
 * Prompt Refinement Engine
 * Improves prompts based on quality validation feedback
 * Applies professional cinematography + artistic standards
 */

import { log } from '../agent/logger.js';
import { qualityValidator } from './quality-validator.js';
import { trainingDataLoader } from './training-data-loader.js';
import { creativityWitEngine } from './creativity-wit-engine.js';

interface RefinementResult {
  originalPrompt: string;
  refinedPrompt: string;
  changes: string[];
  qualityScoreImprovement: number; // delta: refined_score - original_score
  appliedPatterns: string[];
  witScore?: number;
  twistApplied?: string;
}

class PromptRefinementEngine {
  /**
   * Refine prompt based on quality validation + artistic standards
   */
  async refinePrompt(basePrompt: string): Promise<RefinementResult> {
    // Step 1: Validate original
    const originalValidation = await qualityValidator.validatePrompt(basePrompt);
    const changes: string[] = [];
    let refinedPrompt = basePrompt;
    const appliedPatterns: string[] = [];

    // Step 2: Load artistic standards
    await trainingDataLoader.loadCinematographyPatterns();
    const artisticStandards = await trainingDataLoader.loadArtisticQualityStandards();
    const productStandards = await trainingDataLoader.loadProductStandards();
    const biologicalSafety = await trainingDataLoader.loadBiologicalSafetyStandards();

    // Step 3: Apply refinements based on issues found
    if (!originalValidation.passed) {
      // Fix ortografía issues
      if (!originalValidation.metadata.ortografia_check) {
        refinedPrompt = this.fixOrtografia(refinedPrompt);
        changes.push('Fixed ortografía errors');
      }

      // Fix face deformation risks
      if (!originalValidation.metadata.face_check) {
        refinedPrompt = this.enforceFaceConsistency(refinedPrompt, biologicalSafety);
        changes.push('Enforced face consistency standards');
      }

      // Fix product deformation risks
      if (!originalValidation.metadata.product_check) {
        refinedPrompt = this.enhanceProductPresentation(refinedPrompt, productStandards);
        changes.push('Enhanced product presentation standards');
      }

      // Fix environment issues
      if (!originalValidation.metadata.environment_check) {
        refinedPrompt = this.improveEnvironment(refinedPrompt, artisticStandards);
        changes.push('Improved environment/background clarity');
      }
    }

    // Step 4: Inject cinematography patterns (always improve)
    refinedPrompt = this.injectCinematography(refinedPrompt, trainingDataLoader.getPatterns());
    changes.push('Injected professional cinematography patterns');
    appliedPatterns.push('rule-of-thirds', 'depth-layering', 'negative-space');

    // Step 5: Enhance artistic quality
    refinedPrompt = this.enhanceArtisticQuality(refinedPrompt, artisticStandards);
    changes.push('Enhanced artistic quality standards');

    // Step 6: Ocurrencia pass — ensure genuine wit, no clichés, unexpected twist
    const witBoost = await creativityWitEngine.boostWit(refinedPrompt);
    refinedPrompt = witBoost.enhancedPrompt;
    if (witBoost.clichesRemoved.length > 0) {
      changes.push(`Removed ${witBoost.clichesRemoved.length} cliché(s), replaced with fresh angle`);
    }
    if (witBoost.twistApplied) {
      changes.push(`Injected creative twist: ${witBoost.twistApplied.twistType}`);
    }

    // Step 7: Validate refined
    const refinedValidation = await qualityValidator.validatePrompt(refinedPrompt);
    const qualityImprovement = refinedValidation.score - originalValidation.score;

    log.info('[RefinementEngine] Prompt refined', {
      originalScore: originalValidation.score,
      refinedScore: refinedValidation.score,
      improvement: qualityImprovement,
      changesApplied: changes.length,
      witScore: witBoost.analysis.witScore,
    });

    return {
      originalPrompt: basePrompt,
      refinedPrompt,
      changes,
      qualityScoreImprovement: qualityImprovement,
      appliedPatterns,
      witScore: Math.round((witBoost.analysis.witScore + witBoost.analysis.originalityScore) / 2),
      twistApplied: witBoost.twistApplied?.twistType,
    };
  }

  /**
   * Fix common ortografía issues
   */
  private fixOrtografia(prompt: string): string {
    let fixed = prompt;

    // Common replacements
    const ortografiaMap: Record<string, string> = {
      '\\bque\\b': 'que',
      '\\bxq\\b': 'porque',
      '\\bpq\\b': 'porque',
      '\\byy\\b': 'y',
    };

    for (const [pattern, replacement] of Object.entries(ortografiaMap)) {
      fixed = fixed.replace(new RegExp(pattern, 'gi'), replacement);
    }

    return fixed;
  }

  /**
   * Enforce face consistency + safety standards
   */
  private enforceFaceConsistency(prompt: string, standards: Record<string, any>): string {
    let improved = prompt;

    // Add safety instructions
    const faceChecks = standards.faces.critical_checks;
    const safetyInjection = `
[CRITICAL FACE SAFETY]
- Symmetry: Both eyes same size, aligned horizontally
- Skin: No warping, stretching, melting. Continuous natural texture
- Proportions: Realistic facial ratios. No duplicated features
- Expression: Natural, anatomically possible
- Hair: Gravity respected, logical flow
${faceChecks.map((check: string) => `- ${check}`).join('\n')}
`;

    if (!improved.includes('CRITICAL FACE SAFETY')) {
      improved += '\n' + safetyInjection;
    }

    return improved;
  }

  /**
   * Enhance product presentation
   */
  private enhanceProductPresentation(prompt: string, standards: Record<string, any>): string {
    let improved = prompt;

    const productInjection = `
[PRODUCT PHOTOGRAPHY STANDARDS]
Angles: Use professional hero shot (45° angle), lifestyle context, detail macro, or packaging shot
Lighting: Product-specific lighting. Edge lighting for dimensionality. No shadow obscuring details
Background: Minimal, complementary. Negative space dominant. Consistent surface/material
Styling: Natural hands if product in-hand. Relevant props (max 2). No distracting elements
Consistency: Match lighting/styling/setting across series frames
`;

    if (!improved.includes('PRODUCT PHOTOGRAPHY STANDARDS')) {
      improved += '\n' + productInjection;
    }

    return improved;
  }

  /**
   * Improve environment clarity
   */
  private improveEnvironment(prompt: string, standards: Record<string, any>): string {
    let improved = prompt;

    const colorGrading = standards.color_grading.professional;
    const envInjection = `
[ENVIRONMENT CLARITY]
- Background clarity: Sharp or intentionally blurred (not accidental blur)
- Color consistency: Unified color temperature, consistent grading
- Perspective: Realistic geometry, logical spatial relationships
- No artifacts: No warped walls, impossible architecture, distorted elements
Grading standards:
${colorGrading.map((grade: string) => `- ${grade}`).join('\n')}
`;

    if (!improved.includes('ENVIRONMENT CLARITY')) {
      improved += '\n' + envInjection;
    }

    return improved;
  }

  /**
   * Inject cinematography patterns
   */
  private injectCinematography(prompt: string, patterns: Map<string, any>): string {
    let improved = prompt;

    const cinematographyInjection = `
[CINEMATOGRAPHY PATTERNS - Apply 2-3]
- Rule of Thirds: Position subject at 1/3 intersections
- Depth Layering: Multiple focus layers (foreground, subject, background with DOF)
- Negative Space: 40-60% empty space for sophistication
- Leading Lines: Natural lines guiding viewer to subject
- Frame Within Frame: Natural framing elements (windows, branches, doorways)
`;

    if (!improved.includes('CINEMATOGRAPHY PATTERNS')) {
      improved += '\n' + cinematographyInjection;
    }

    return improved;
  }

  /**
   * Enhance artistic quality
   */
  private enhanceArtisticQuality(prompt: string, standards: Record<string, any>): string {
    let improved = prompt;

    const artisticInjection = `
[ARTISTIC QUALITY STANDARDS]
Lighting: Three-point lighting or golden hour. Soft diffused light. High-key (bright) or low-key (dramatic)
Color: Complementary or analogous harmony. Consistent saturation. LUT applied for film aesthetic
Composition: Intentional empty space. Depth of field. Aspect ratio respected (4:5 carousel, 9:16 vertical)
Typography (if present): Min 4.5:1 contrast. Premium font pairing. Clear hierarchy (28-36px headline, 14-18px body)
No clutter: Every element serves narrative. Professional, minimalista aesthetic
`;

    if (!improved.includes('ARTISTIC QUALITY STANDARDS')) {
      improved += '\n' + artisticInjection;
    }

    return improved;
  }

  /**
   * Batch refine prompts
   */
  async refineBatch(prompts: string[]): Promise<RefinementResult[]> {
    const results: RefinementResult[] = [];

    for (const prompt of prompts) {
      const result = await this.refinePrompt(prompt);
      results.push(result);
    }

    log.info('[RefinementEngine] Batch refined', {
      count: prompts.length,
      avgImprovement: results.reduce((sum, r) => sum + r.qualityScoreImprovement, 0) / results.length,
    });

    return results;
  }
}

export const promptRefinementEngine = new PromptRefinementEngine();
