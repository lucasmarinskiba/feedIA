import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

export interface BrandDecision {
  contentType: 'feed' | 'reel' | 'story' | 'carousel';
  platform: 'instagram' | 'tiktok' | 'both';
  reasoning: string;
  brandAlignment: number;
  estimatedReach: number;
  confidenceScore: number;
}

export interface ContentBrief {
  idea: string;
  targetAudience: string;
  goal: 'awareness' | 'engagement' | 'conversion' | 'community';
  tone: string;
  visualStyle: string;
  proposedFormats: string[];
}

export interface BrandConsistencyCheck {
  passedChecks: string[];
  failedChecks: string[];
  overallScore: number;
  recommendations: string[];
}

export class BrandOrchestrator {
  async decideBestFormat(
    brand: BrandProfile,
    brief: ContentBrief,
  ): Promise<{ ok: boolean; decision?: BrandDecision; error?: string }> {
    try {
      log.info(`[BrandOrchestrator] Deciding format for: ${brief.idea}`);

      const formats: BrandDecision[] = [];

      if (brief.proposedFormats.includes('carousel')) {
        formats.push({
          contentType: 'carousel',
          platform: 'instagram',
          reasoning: 'Educational carousels align with strategic positioning',
          brandAlignment: this.calculateBrandAlignment(brand, 'carousel', brief),
          estimatedReach: Math.floor(Math.random() * 50000) + 25000,
          confidenceScore: 0.85,
        });
      }

      if (brief.proposedFormats.includes('reel')) {
        formats.push({
          contentType: 'reel',
          platform: 'both',
          reasoning: 'Reels dominate algorithm on both Instagram & TikTok',
          brandAlignment: this.calculateBrandAlignment(brand, 'reel', brief),
          estimatedReach: Math.floor(Math.random() * 150000) + 50000,
          confidenceScore: 0.92,
        });
      }

      if (brief.proposedFormats.includes('feed')) {
        formats.push({
          contentType: 'feed',
          platform: 'instagram',
          reasoning: 'Feed posts build gallery + credibility',
          brandAlignment: this.calculateBrandAlignment(brand, 'feed', brief),
          estimatedReach: Math.floor(Math.random() * 30000) + 10000,
          confidenceScore: 0.78,
        });
      }

      if (brief.proposedFormats.includes('story')) {
        formats.push({
          contentType: 'story',
          platform: 'instagram',
          reasoning: 'Stories drive engagement + community',
          brandAlignment: this.calculateBrandAlignment(brand, 'story', brief),
          estimatedReach: Math.floor(Math.random() * 40000) + 15000,
          confidenceScore: 0.82,
        });
      }

      const best = formats.sort((a, b) => b.confidenceScore - a.confidenceScore)[0];

      if (!best) {
        return {
          ok: false,
          error: 'Could not determine best format for content',
        };
      }

      return { ok: true, decision: best };
    } catch (error) {
      log.error(`[BrandOrchestrator] Format decision failed: ${error}`);
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async enforceConsistency(
    brand: BrandProfile,
    caption: string,
    _visualAssets: string[],
  ): Promise<{ ok: boolean; check?: BrandConsistencyCheck; error?: string }> {
    try {
      log.info('[BrandOrchestrator] Enforcing brand consistency');

      const checks: string[] = [];
      const failures: string[] = [];

      // Tone check
      const brandTone = brand.voice.tone[0] || 'profesional';
      if (this.matchesTone(caption, brandTone)) {
        checks.push('✓ Caption tone matches brand voice');
      } else {
        failures.push('✗ Caption tone misaligns with brand');
      }

      // Forbidden words check
      const hasForbidden = brand.voice.forbidden.some((word) => caption.toLowerCase().includes(word.toLowerCase()));
      if (!hasForbidden) {
        checks.push('✓ No forbidden words detected');
      } else {
        failures.push('✗ Forbidden word(s) used in caption');
      }

      // Length check (platform specific)
      if (caption.length > 2200) {
        failures.push('✗ Caption exceeds Instagram limit (2200 chars)');
      } else if (caption.length > 100) {
        checks.push('✓ Caption length optimal');
      }

      // CTA check
      if (caption.includes('shop') || caption.includes('link') || caption.includes('link in bio')) {
        checks.push('✓ Strong CTA present');
      }

      // Value signal check
      const valueSignals = ['teach', 'learn', 'discover', 'tips', 'guide', 'insights', 'secrets', 'strategy'];
      const hasValue = valueSignals.some((signal) => caption.toLowerCase().includes(signal));
      if (hasValue) {
        checks.push('✓ Value proposition present');
      } else {
        failures.push('⚠ Could strengthen value proposition');
      }

      const overallScore = (checks.length / (checks.length + failures.length)) * 100;

      const recommendations: string[] = [];
      if (failures.length > 0) {
        recommendations.push(`Fix ${failures.length} consistency issue(s)`);
      }
      if (overallScore < 70) {
        recommendations.push('Rewrite caption to align with brand voice');
      }
      if (!hasValue) {
        recommendations.push('Add value signal: tips, insights, or teachable moment');
      }

      return {
        ok: true,
        check: {
          passedChecks: checks,
          failedChecks: failures,
          overallScore,
          recommendations,
        },
      };
    } catch (error) {
      log.error(`[BrandOrchestrator] Consistency check failed: ${error}`);
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async orchestrateCampaign(
    brand: BrandProfile,
    theme: string,
    contentCount: number,
    days: number,
  ): Promise<{ ok: boolean; campaign?: Record<string, unknown>; error?: string }> {
    try {
      log.info(`[BrandOrchestrator] Orchestrating ${theme} campaign: ${contentCount} posts over ${days} days`);

      const spacing = days / contentCount;
      const formats = ['reel', 'carousel', 'feed', 'story'] as const;
      const contentPlan = Array.from({ length: contentCount }, (_, i) => {
        const dayOffset = i * spacing;
        const format = formats[i % formats.length]!;
        return {
          day: Math.ceil(dayOffset),
          format,
          theme,
          suggested_time: this.optimalPostTime(brand, format),
          brand_focal_point: this.extractBrandFocal(brand, i, contentCount),
        };
      });

      return {
        ok: true,
        campaign: {
          theme,
          duration_days: days,
          content_pieces: contentCount,
          schedule: contentPlan,
          brand_story_arc: this.buildStoryArc(brand, contentCount),
          expected_reach: contentCount * (Math.random() * 100000 + 25000),
        } as Record<string, unknown>,
      };
    } catch (error) {
      log.error(`[BrandOrchestrator] Campaign orchestration failed: ${error}`);
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private calculateBrandAlignment(brand: BrandProfile, format: string, brief: ContentBrief): number {
    let score = 0.5;

    // Alignment based on brand type
    if (brand.type === 'marca-personal' && (format === 'reel' || format === 'carousel')) {
      score += 0.3;
    }
    if (brand.type === 'empresa' && format === 'carousel') {
      score += 0.25;
    }

    // Alignment based on goal
    if (brief.goal === 'awareness' && format === 'reel') {
      score += 0.15;
    }
    if (brief.goal === 'engagement' && format === 'carousel') {
      score += 0.15;
    }
    if (brief.goal === 'conversion' && format === 'feed') {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  private matchesTone(text: string, expectedTone: string): boolean {
    const tonePatterns: Record<string, string[]> = {
      profesional: ['strategy', 'insights', 'analysis', 'expert', 'proven'],
      casual: ['hey', 'lol', 'vibe', 'real', 'vibes'],
      premium: ['exclusive', 'luxury', 'elite', 'curated', 'bespoke'],
      educativo: ['learn', 'teach', 'guide', 'tip', 'secrets', 'formula'],
      humanizado: ['i', 'we', 'you', 'story', 'journey', 'real'],
    };

    const patterns = tonePatterns[expectedTone] || [];
    const matches = patterns.filter((p) => text.toLowerCase().includes(p)).length;
    return matches >= 2;
  }

  private optimalPostTime(_brand: BrandProfile, format: 'reel' | 'carousel' | 'feed' | 'story'): string {
    // Default optimal times by format
    const times: Record<string, string> = {
      reel: '9:30',
      carousel: '11:00',
      feed: '14:00',
      story: '18:00',
    };
    return times[format] || '9:00';
  }

  private extractBrandFocal(_brand: BrandProfile, index: number, _total: number): string {
    const focals = [
      'Brand value proposition',
      'Social proof / testimonial',
      'Educational insight',
      'Community moment',
      'Product highlight',
      'Behind-the-scenes',
    ];
    return focals[index % focals.length]!;
  }

  private buildStoryArc(brand: BrandProfile, contentCount: number): string[] {
    return [
      'Hook: Problem/pain point awareness',
      'Develop: Solution walkthrough or social proof',
      'Climax: Call-to-action or conversion moment',
      'Resolution: Result or community celebration',
    ].slice(0, Math.min(4, contentCount));
  }
}

export const brandOrchestrator = new BrandOrchestrator();
