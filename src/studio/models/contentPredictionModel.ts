import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

/**
 * Content Performance Prediction Model
 * ML-inspired algorithm predicting post engagement + virality potential
 * Input: content characteristics + brand + platform
 * Output: predicted reach, engagement rate, viral probability
 */

export interface ContentMetrics {
  headline: string;
  caption: string;
  imageType: 'photo' | 'carousel' | 'video' | 'text';
  colors: string[];
  hashtags: number;
  mentions: number;
  callToAction: boolean;
  emotionalTrigger: 'fear' | 'joy' | 'surprise' | 'anger' | 'sadness' | 'none';
  topicCategory: string;
}

export interface PredictionResult {
  engagementRateEstimate: number; // 0-100
  reachEstimate: number;
  viralProbability: number; // 0-1
  growthImpact: number; // followers gained estimate
  salesConversionPotential: number; // 0-1
  recommendations: string[];
  confidence: number; // 0-1
}

export class ContentPredictionModel {
  private engagementWeights = {
    headline: 0.25,
    caption: 0.15,
    media: 0.3,
    hashtags: 0.1,
    cta: 0.12,
    emotion: 0.08,
  };

  /**
   * Predict post performance based on content characteristics
   */
  predictPerformance(content: ContentMetrics, brand: BrandProfile, platform: 'instagram' | 'tiktok'): PredictionResult {
    const scores = {
      headline: this.scoreHeadline(content.headline, brand),
      caption: this.scoreCaption(content.caption, brand),
      media: this.scoreMedia(content.imageType, platform),
      hashtags: this.scoreHashtags(content.hashtags, platform),
      cta: content.callToAction ? 0.9 : 0.4,
      emotion: this.scoreEmotion(content.emotionalTrigger),
    };

    const engagement = this.calculateEngagement(scores);
    const reach = this.estimateReach(engagement, platform, content.imageType);
    const viral = this.viralityScore(engagement, content.emotionalTrigger, platform);
    const growth = this.estimateGrowth(engagement, reach, brand);
    const sales = this.salesPotential(content, engagement, brand);

    const recommendations = this.generateRecommendations(engagement, viral, sales, content, brand);

    log.debug(
      `[ContentPrediction] ${platform}: engagement ${engagement.toFixed(1)}%, viral ${(viral * 100).toFixed(1)}%`,
    );

    return {
      engagementRateEstimate: engagement,
      reachEstimate: reach,
      viralProbability: viral,
      growthImpact: growth,
      salesConversionPotential: sales,
      recommendations,
      confidence: 0.75,
    };
  }

  private scoreHeadline(headline: string, brand: BrandProfile): number {
    let score = 0.5;

    // Length (optimal 5-10 words)
    const words = headline.split(' ').length;
    if (words >= 5 && words <= 10) score += 0.25;

    // Emotional words
    const emotionalWords = ['amazing', 'incredible', 'secret', 'must', 'never', 'finally', 'proof', 'revealed'];
    if (emotionalWords.some((w) => headline.toLowerCase().includes(w))) score += 0.15;

    // Numbers (A/B testing shows +30% engagement)
    if (/\d+/.test(headline)) score += 0.1;

    // Forbidden word check
    if (brand.voice.forbidden.some((w) => headline.toLowerCase().includes(w))) score -= 0.3;

    return Math.min(1, score);
  }

  private scoreCaption(caption: string, brand: BrandProfile): number {
    let score = 0.5;

    // Length (100-300 chars sweet spot)
    if (caption.length >= 100 && caption.length <= 300) score += 0.2;

    // Line breaks (improves readability +25%)
    const lineBreaks = caption.split('\n').length - 1;
    if (lineBreaks >= 2) score += 0.15;

    // Question (encourages comments +40%)
    if (caption.includes('?')) score += 0.15;

    // Call-to-action
    const ctaWords = ['click', 'tap', 'shop', 'learn', 'join', 'follow', 'share'];
    if (ctaWords.some((w) => caption.toLowerCase().includes(w))) score += 0.1;

    return Math.min(1, score);
  }

  private scoreMedia(imageType: string, platform: string): number {
    const scores: Record<string, Record<string, number>> = {
      instagram: {
        carousel: 0.9,
        video: 0.85,
        photo: 0.7,
        text: 0.4,
      },
      tiktok: {
        video: 0.95,
        carousel: 0.6,
        photo: 0.5,
        text: 0.3,
      },
    };

    return scores[platform]?.[imageType] ?? 0.5;
  }

  private scoreHashtags(count: number, platform: string): number {
    // Instagram: 8-15 optimal, TikTok: 3-5 optimal
    const optimal = platform === 'instagram' ? [8, 15] : [3, 5];
    if (count >= optimal[0] && count <= optimal[1]) return 0.9;
    if (count >= optimal[0] - 2 && count <= optimal[1] + 2) return 0.7;
    if (count < 1) return 0.2;
    return 0.4;
  }

  private scoreEmotion(trigger: string): number {
    const emotionScores: Record<string, number> = {
      surprise: 0.95,
      joy: 0.9,
      fear: 0.85,
      anger: 0.7,
      sadness: 0.6,
      none: 0.4,
    };

    return emotionScores[trigger] ?? 0.4;
  }

  private calculateEngagement(scores: Record<string, number>): number {
    let total = 0;
    for (const [key, value] of Object.entries(scores)) {
      const weight = this.engagementWeights[key as keyof typeof this.engagementWeights] || 0.1;
      total += value * weight;
    }

    return Math.min(100, total * 100);
  }

  private estimateReach(engagement: number, platform: string, mediaType: string): number {
    // Base reach varies by platform + media type
    const baseReach: Record<string, Record<string, number>> = {
      instagram: { carousel: 5000, video: 8000, photo: 3000, text: 1000 },
      tiktok: { video: 15000, carousel: 3000, photo: 2000, text: 500 },
    };

    const base = baseReach[platform]?.[mediaType] ?? 3000;
    const multiplier = 1 + engagement / 100;

    return Math.floor(base * multiplier);
  }

  private viralityScore(engagement: number, emotion: string, platform: string): number {
    let score = engagement / 100;

    // Emotion boost
    if (['surprise', 'joy', 'fear'].includes(emotion)) score *= 1.3;

    // Platform variance
    if (platform === 'tiktok') score *= 1.5; // TikTok has higher viral coefficient

    // Cap at 1
    return Math.min(1, score);
  }

  private estimateGrowth(engagement: number, reach: number, brand: BrandProfile): number {
    // Typical conversion: 0.5-2% of reach to followers
    const conversionRate = engagement > 60 ? 0.02 : engagement > 40 ? 0.01 : 0.005;
    const newFollowers = reach * conversionRate;

    return Math.floor(newFollowers);
  }

  private salesPotential(content: ContentMetrics, engagement: number, brand: BrandProfile): number {
    let score = 0.3;

    // CTA presence
    if (content.callToAction) score += 0.3;

    // High engagement = higher sales potential
    if (engagement > 70) score += 0.2;

    // Product-focused content
    if (['product', 'service', 'offer', 'promotion'].some((w) => content.topicCategory.includes(w))) {
      score += 0.15;
    }

    return Math.min(1, score);
  }

  private generateRecommendations(
    engagement: number,
    viral: number,
    sales: number,
    content: ContentMetrics,
    brand: BrandProfile,
  ): string[] {
    const recommendations: string[] = [];

    if (engagement < 40) {
      recommendations.push('Engagement low. Add emotional hook or clearer CTA.');
    }

    if (viral < 0.3) {
      recommendations.push('Viral potential low. Consider trending topic or surprise element.');
    }

    if (sales < 0.4 && brand.goals.includes('revenue')) {
      recommendations.push('Sales conversion weak. Add product link or special offer.');
    }

    if (content.hashtags < 5) {
      recommendations.push('Too few hashtags. Add 8-15 for reach.');
    }

    if (!content.callToAction) {
      recommendations.push('No CTA found. Add action word (shop, learn, join).');
    }

    if (engagement > 70 && recommendations.length === 0) {
      recommendations.push('Excellent predicted performance. Post as planned.');
    }

    return recommendations.length > 0 ? recommendations : ['Post is solid. Monitor metrics.'];
  }
}

export const contentPredictionModel = new ContentPredictionModel();
