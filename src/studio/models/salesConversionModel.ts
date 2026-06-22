import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

/**
 * Sales Conversion Model
 * Predicts sales conversion probability from social content
 * Analyzes: CTA strength, product fit, audience alignment, urgency
 */

export interface ConversionFactors {
  contentType: 'testimonial' | 'product_demo' | 'lifestyle' | 'educational' | 'promotional';
  ctaType: 'link' | 'dms' | 'website' | 'call' | 'none';
  ctaUrgency: 'high' | 'medium' | 'low';
  productPrice: number;
  audienceIntent: 'high' | 'medium' | 'low';
  socialProof: number; // likes/comments ratio
  conversionHistory: number; // past conversion rate %
}

export interface ConversionPrediction {
  conversionProbability: number; // 0-1
  estimatedSales: number;
  conversionRate: number; // expected %
  revenue: number;
  bottleneck: string;
  optimization: string[];
  confidence: number;
}

export class SalesConversionModel {
  /**
   * Predict sales conversion from content
   */
  predictConversion(factors: ConversionFactors, brand: BrandProfile, projectedReach: number): ConversionPrediction {
    const baseConversion = 0.02; // 2% baseline

    // Factor weights
    let conversionScore = baseConversion;

    // Content type impact
    conversionScore *= this.contentTypeMultiplier(factors.contentType);

    // CTA strength
    conversionScore *= this.ctaStrengthMultiplier(factors.ctaType, factors.ctaUrgency);

    // Price fit
    conversionScore *= this.priceFitMultiplier(factors.productPrice, brand);

    // Audience intent
    conversionScore *= this.audienceIntentMultiplier(factors.audienceIntent);

    // Social proof
    conversionScore *= this.socialProofMultiplier(factors.socialProof);

    // Historical performance
    conversionScore *= 1 + factors.conversionHistory / 100;

    // Clamp to valid range
    conversionScore = Math.min(0.25, Math.max(0.001, conversionScore));

    const expectedSales = Math.floor(projectedReach * conversionScore);
    const revenue = expectedSales * factors.productPrice;
    const bottleneck = this.identifyBottleneck(factors, conversionScore);
    const optimizations = this.generateOptimizations(factors, bottleneck);

    log.debug(
      `[SalesConversion] Probability: ${(conversionScore * 100).toFixed(2)}%, Sales: ${expectedSales}, Revenue: $${revenue.toFixed(0)}`,
    );

    return {
      conversionProbability: conversionScore,
      estimatedSales: expectedSales,
      conversionRate: conversionScore * 100,
      revenue,
      bottleneck,
      optimization: optimizations,
      confidence: 0.68,
    };
  }

  private contentTypeMultiplier(type: string): number {
    const multipliers: Record<string, number> = {
      testimonial: 2.0, // +100% (social proof)
      product_demo: 1.8, // +80%
      promotional: 1.5, // +50%
      educational: 1.2, // +20%
      lifestyle: 0.9, // -10%
    };

    return multipliers[type] ?? 1.0;
  }

  private ctaStrengthMultiplier(ctaType: string, urgency: string): number {
    const baseMultipliers: Record<string, number> = {
      link: 1.6, // Direct purchase link
      dms: 1.3, // DM for info
      website: 1.5, // Shop link
      call: 1.2, // Phone call
      none: 0.4, // No CTA
    };

    let multiplier = baseMultipliers[ctaType] ?? 1.0;

    // Urgency boost
    if (urgency === 'high') multiplier *= 1.3;
    if (urgency === 'medium') multiplier *= 1.1;

    return multiplier;
  }

  private priceFitMultiplier(price: number, brand: BrandProfile): number {
    // Lower price = higher conversion
    if (price < 50) return 1.5;
    if (price < 100) return 1.3;
    if (price < 500) return 1.1;
    if (price < 2000) return 0.9;
    return 0.6;
  }

  private audienceIntentMultiplier(intent: string): number {
    const multipliers: Record<string, number> = {
      high: 2.0,
      medium: 1.0,
      low: 0.4,
    };

    return multipliers[intent] ?? 1.0;
  }

  private socialProofMultiplier(ratio: number): number {
    // Engagement ratio: comments/likes ratio
    if (ratio > 0.05) return 1.5; // High engagement
    if (ratio > 0.02) return 1.2;
    if (ratio > 0.01) return 1.0;
    return 0.7;
  }

  private identifyBottleneck(factors: ConversionFactors, score: number): string {
    if (score < 0.01) {
      if (factors.ctaType === 'none') return 'No CTA - Add clear call-to-action';
      if (factors.audienceIntent === 'low') return 'Low audience intent - Wrong audience';
      if (factors.contentType === 'lifestyle') return 'Content type weak for sales - Use testimonials/demos';
    }

    if (factors.socialProof < 0.01) return 'Low social proof - Needs engagement boost';
    if (factors.productPrice > 2000) return 'High price point - Consider financing/bundles';

    return 'No major bottleneck identified';
  }

  private generateOptimizations(factors: ConversionFactors, bottleneck: string): string[] {
    const optimizations: string[] = [];

    if (factors.ctaType === 'none') {
      optimizations.push('Add direct product link in bio');
      optimizations.push('Use "Shop" CTA button (Instagram)');
    }

    if (factors.ctaUrgency === 'low') {
      optimizations.push('Add scarcity/urgency ("Limited time", "Last 5 spots")');
      optimizations.push('Show countdown timer or stock levels');
    }

    if (factors.contentType === 'lifestyle') {
      optimizations.push('Replace with product demo or testimonial');
      optimizations.push('Show customer success stories');
    }

    if (factors.audienceIntent === 'low') {
      optimizations.push('Refocus audience segment (targeting)');
      optimizations.push('Create educational content to build intent');
    }

    if (factors.socialProof < 0.02) {
      optimizations.push('Encourage user-generated content');
      optimizations.push('Tag customers in posts');
    }

    if (!optimizations.length) {
      optimizations.push('Performance optimal - Increase ad spend');
    }

    return optimizations;
  }
}

export const salesConversionModel = new SalesConversionModel();
