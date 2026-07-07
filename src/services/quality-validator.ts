/**
 * Quality Validator
 * Checks generated content for:
 * - Ortografía errors
 * - Face/product/pet deformación
 * - Environment distortion
 * Returns quality score (0-100). Blocks if < 70.
 */

import { log } from '../agent/logger.js';

interface ValidationResult {
  score: number; // 0-100
  passed: boolean; // score >= 70
  issues: string[];
  metadata: {
    ortografia_check: boolean;
    face_check: boolean;
    product_check: boolean;
    environment_check: boolean;
  };
}

class QualityValidator {
  /**
   * Validate prompt/content for quality issues
   */
  async validatePrompt(promptText: string): Promise<ValidationResult> {
    const issues: string[] = [];
    let score = 100;

    // Check 1: Ortografía (simple regex)
    const ortografiaCheck = this.checkOrtografia(promptText);
    if (!ortografiaCheck.passed) {
      issues.push(...ortografiaCheck.errors);
      score -= ortografiaCheck.penalty;
    }

    // Check 2: Face deformación keywords
    const faceCheck = this.checkFaceDeformation(promptText);
    if (!faceCheck.passed) {
      issues.push(...faceCheck.errors);
      score -= faceCheck.penalty;
    }

    // Check 3: Product deformación keywords
    const productCheck = this.checkProductDeformation(promptText);
    if (!productCheck.passed) {
      issues.push(...productCheck.errors);
      score -= productCheck.penalty;
    }

    // Check 4: Environment issues
    const environmentCheck = this.checkEnvironmentDeformation(promptText);
    if (!environmentCheck.passed) {
      issues.push(...environmentCheck.errors);
      score -= environmentCheck.penalty;
    }

    score = Math.max(0, Math.min(100, score));

    const result: ValidationResult = {
      score,
      passed: score >= 70,
      issues,
      metadata: {
        ortografia_check: ortografiaCheck.passed,
        face_check: faceCheck.passed,
        product_check: productCheck.passed,
        environment_check: environmentCheck.passed,
      },
    };

    if (!result.passed) {
      log.warn('[QualityValidator] Validation failed', { score, issues: issues.slice(0, 3) });
    }

    return result;
  }

  /**
   * Check for ortografía errors (simple regex + dictionary)
   */
  private checkOrtografia(text: string): { passed: boolean; errors: string[]; penalty: number } {
    const errors: string[] = [];
    let penalty = 0;

    // Common Spanish typos
    const typoPatterns = [
      { regex: /\b(q|k)e\b/gi, suggestion: 'que' },
      { regex: /\byy\b/gi, suggestion: 'y' },
      { regex: /\ba un\b/gi, suggestion: 'a un' },
      { regex: /\bxq\b/gi, suggestion: 'porque' },
      { regex: /\bpq\b/gi, suggestion: 'porque' },
    ];

    for (const pattern of typoPatterns) {
      if (pattern.regex.test(text)) {
        errors.push(`Possible typo: "${pattern.suggestion}"`);
        penalty += 5;
      }
    }

    // Check for ALL CAPS (screaming)
    if (/^[A-Z\s]{10,}$/.test(text)) {
      errors.push('Entire text in CAPS (screaming tone)');
      penalty += 10;
    }

    return {
      passed: errors.length === 0,
      errors,
      penalty: Math.min(penalty, 20),
    };
  }

  /**
   * Check for face deformación keywords
   */
  private checkFaceDeformation(text: string): { passed: boolean; errors: string[]; penalty: number } {
    const errors: string[] = [];
    let penalty = 0;

    const deformationKeywords = [
      'distorted face',
      'deformed face',
      'asymmetrical face',
      'twisted features',
      'melted face',
      'warped expression',
      'broken nose',
      'crooked teeth',
      'misaligned eyes',
    ];

    for (const keyword of deformationKeywords) {
      if (text.toLowerCase().includes(keyword)) {
        errors.push(`Face deformation risk: "${keyword}"`);
        penalty += 15;
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      penalty: Math.min(penalty, 30),
    };
  }

  /**
   * Check for product deformación keywords
   */
  private checkProductDeformation(text: string): { passed: boolean; errors: string[]; penalty: number } {
    const errors: string[] = [];
    let penalty = 0;

    const productIssues = [
      'deformed product',
      'broken packaging',
      'melted product',
      'distorted shape',
      'asymmetrical product',
      'malformed',
      'twisted bottle',
      'warped can',
    ];

    for (const issue of productIssues) {
      if (text.toLowerCase().includes(issue)) {
        errors.push(`Product deformation risk: "${issue}"`);
        penalty += 15;
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      penalty: Math.min(penalty, 30),
    };
  }

  /**
   * Check for environment/background issues
   */
  private checkEnvironmentDeformation(text: string): { passed: boolean; errors: string[]; penalty: number } {
    const errors: string[] = [];
    let penalty = 0;

    const envIssues = [
      'blurry background',
      'distorted background',
      'warped environment',
      'deformed landscape',
      'melted architecture',
      'broken perspective',
      'impossible geometry',
    ];

    for (const issue of envIssues) {
      if (text.toLowerCase().includes(issue)) {
        errors.push(`Environment risk: "${issue}"`);
        penalty += 10;
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      penalty: Math.min(penalty, 20),
    };
  }

  /**
   * Validate variation text for consistency with base prompt
   */
  async validateVariationConsistency(
    basePromptText: string,
    variationText: string
  ): Promise<ValidationResult> {
    // Check if core elements preserved
    const baseWords = basePromptText.split(/\s+/).slice(0, 10);
    const variationWords = variationText.split(/\s+/);

    const matchedWords = baseWords.filter(word =>
      variationWords.some(vWord => vWord.includes(word.slice(0, 4)))
    );

    const consistencyRatio = matchedWords.length / Math.max(baseWords.length, 1);

    if (consistencyRatio < 0.4) {
      return {
        score: 50,
        passed: false,
        issues: ['Variation diverged too much from base prompt. Core elements lost.'],
        metadata: {
          ortografia_check: false,
          face_check: false,
          product_check: false,
          environment_check: false,
        },
      };
    }

    // Also validate variation text itself
    return this.validatePrompt(variationText);
  }
}

export const qualityValidator = new QualityValidator();
