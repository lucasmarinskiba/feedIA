import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

/**
 * Brand Validation Agent
 * Post-creation brand consistency verification
 * Checks colors, tone, messaging, visual style
 */

export interface BrandValidationResult {
  compliant: boolean;
  score: number; // 0-100
  violations: Array<{ rule: string; severity: 'error' | 'warning' | 'info'; detail: string }>;
  recommendations: string[];
}

export class BrandValidationAgent {
  /**
   * Validate design against brand guidelines
   */
  validateDesign(
    designContent: string,
    designColors: string[],
    designText: string,
    brand: BrandProfile,
  ): BrandValidationResult {
    const violations: Array<{ rule: string; severity: 'error' | 'warning' | 'info'; detail: string }> = [];
    let score = 100;

    // Check colors
    const colorCompliance = this.validateColors(designColors, brand);
    if (!colorCompliance.valid) {
      violations.push({
        rule: 'Brand Colors',
        severity: 'warning',
        detail: `${colorCompliance.issues.join('; ')}`,
      });
      score -= 15;
    }

    // Check tone
    const toneCompliance = this.validateTone(designText, brand);
    if (!toneCompliance.valid) {
      violations.push({
        rule: 'Brand Voice/Tone',
        severity: toneCompliance.severity,
        detail: `${toneCompliance.issues.join('; ')}`,
      });
      score -= toneCompliance.severity === 'error' ? 25 : 10;
    }

    // Check forbidden words
    const forbiddenCheck = this.checkForbiddenWords(designText, brand);
    if (forbiddenCheck.found.length > 0) {
      violations.push({
        rule: 'Forbidden Words',
        severity: 'error',
        detail: `Found: ${forbiddenCheck.found.join(', ')}`,
      });
      score -= 30;
    }

    // Check CTAs
    const ctaCheck = this.validateCTA(designText, brand);
    if (!ctaCheck.valid) {
      violations.push({
        rule: 'Call-to-Action',
        severity: 'warning',
        detail: ctaCheck.detail,
      });
      score -= 10;
    }

    // Recommendations
    const recommendations: string[] = [];
    if (score < 70) {
      recommendations.push('Design does not meet brand compliance threshold. Revise before posting.');
    }
    if (designText.length < 20) {
      recommendations.push('Caption may be too short. Add more context.');
    }
    if (forbiddenCheck.found.length === 0 && designText.toLowerCase().includes('sorry')) {
      recommendations.push('Avoid apologetic language. Use empowering tone instead.');
    }

    score = Math.max(0, score);

    log.debug(`[BrandValidation] Score: ${score}/100, Violations: ${violations.length}`);

    return {
      compliant: score >= 75 && violations.filter((v) => v.severity === 'error').length === 0,
      score,
      violations,
      recommendations,
    };
  }

  private validateColors(designColors: string[], brand: BrandProfile): { valid: boolean; issues: string[] } {
    const issues: string[] = [];
    const brandColors = brand.visual.palette;
    const primaryColor = brandColors[0] || '#000000';

    // Check if primary brand color is used
    if (!designColors.some((c) => this.colorsMatch(c, primaryColor))) {
      issues.push('Primary brand color not found in design');
    }

    // Check contrast
    const hasGoodContrast = designColors.length >= 2;
    if (!hasGoodContrast) {
      issues.push('Low color variety. Add contrast for visual hierarchy.');
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  }

  private validateTone(
    text: string,
    brand: BrandProfile,
  ): { valid: boolean; severity: 'error' | 'warning'; issues: string[] } {
    const issues: string[] = [];
    const tones = brand.voice.tone;

    // Tone indicators
    const toneMap: Record<string, string[]> = {
      professional: ['efficient', 'innovative', 'strategic', 'results', 'proven', 'expert'],
      casual: ['hey', 'awesome', 'cool', 'vibes', 'fun', 'love'],
      educational: ['learn', 'discover', 'guide', 'tutorial', 'step', 'understand'],
      emotional: ['feel', 'love', 'inspire', 'transform', 'journey', 'heart'],
    };

    const lowerText = text.toLowerCase();
    let matchedTones = 0;

    for (const tone of tones) {
      const indicators = (toneMap[tone as keyof typeof toneMap] || []) as string[];
      if (indicators.some((ind) => lowerText.includes(ind))) {
        matchedTones++;
      }
    }

    if (matchedTones === 0) {
      issues.push(`Expected tone(s): ${tones.join(', ')}. Text does not match brand voice.`);
    }

    return {
      valid: matchedTones > 0,
      severity: matchedTones === 0 ? 'warning' : 'warning',
      issues,
    };
  }

  private checkForbiddenWords(text: string, brand: BrandProfile): { found: string[] } {
    const forbidden = brand.voice.forbidden || [];
    const found: string[] = [];

    const lowerText = text.toLowerCase();
    for (const word of forbidden) {
      if (lowerText.includes(word.toLowerCase())) {
        found.push(word);
      }
    }

    return { found };
  }

  private validateCTA(text: string, brand: BrandProfile): { valid: boolean; detail: string } {
    const lowerText = text.toLowerCase();
    const ctaKeywords = ['click', 'tap', 'learn', 'discover', 'join', 'follow', 'shop', 'get', 'start'];

    const hasCTA = ctaKeywords.some((kw) => lowerText.includes(kw));

    if (!hasCTA) {
      return {
        valid: false,
        detail: 'No clear call-to-action found. Add urgency with action words.',
      };
    }

    return {
      valid: true,
      detail: 'CTA present',
    };
  }

  private colorsMatch(color1: string, color2: string): boolean {
    // Simplified color matching (hex comparison)
    return color1.toLowerCase() === color2.toLowerCase();
  }
}

export const brandValidationAgent = new BrandValidationAgent();
