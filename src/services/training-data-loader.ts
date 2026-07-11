/**
 * Training Data Loader
 * Feeds FeedIA brain with examples of "good" content
 * Learns patterns: cinematography, artistic quality, product presentation, etc.
 */

import { log } from '../agent/logger.js';
import { feedIADatabase } from '../db/database.js';

interface TrainingExample {
  id: string;
  content_type: 'carousel' | 'reel' | 'story' | 'post';
  prompt_id: string;
  quality_score: number; // 0-100, assessed by humans/AI
  cinematography_notes: string;
  artistic_quality: string;
  technical_specs: string;
  feedback: string;
  metadata: Record<string, any>;
}

interface BrainPattern {
  pattern_name: string;
  description: string;
  examples: string[];
  success_rate: number;
  usage_count: number;
}

class TrainingDataLoader {
  private patterns: Map<string, BrainPattern> = new Map();

  /**
   * Load professional cinema patterns from training data
   */
  async loadCinematographyPatterns(): Promise<BrainPattern[]> {
    const patterns: BrainPattern[] = [
      {
        pattern_name: 'rule-of-thirds',
        description: 'Subject positioned at 1/3 intersections for visual balance',
        examples: [
          'Product positioned at left-third intersection with complementary background at right-third',
          'Human face at upper-third with landscape at lower-third creating depth',
        ],
        success_rate: 0.92,
        usage_count: 0,
      },
      {
        pattern_name: 'negative-space',
        description: 'Intentional empty space to draw attention and create sophistication',
        examples: [
          'Single product with 60% whitespace around it creating luxury feel',
          'Face with significant negative space above (breathing room)',
        ],
        success_rate: 0.88,
        usage_count: 0,
      },
      {
        pattern_name: 'leading-lines',
        description: 'Visual lines that guide viewer eye through composition',
        examples: [
          'Road/path leading into distance, subject at vanishing point',
          'Diagonal lines from corner to product for dynamic composition',
        ],
        success_rate: 0.85,
        usage_count: 0,
      },
      {
        pattern_name: 'depth-layering',
        description: 'Multiple depth layers (foreground, subject, background) for cinematic effect',
        examples: [
          'Out-of-focus foreground plants, sharp product middle ground, soft background',
          'Character in focus mid-ground with blurred interior behind creating depth',
        ],
        success_rate: 0.89,
        usage_count: 0,
      },
      {
        pattern_name: 'color-harmony',
        description: 'Complementary colors creating visual impact without clashing',
        examples: [
          'Product in warm terracotta against cool teal background (complementary)',
          'Character wearing analogous color palette matching environment for cohesion',
        ],
        success_rate: 0.87,
        usage_count: 0,
      },
      {
        pattern_name: 'movement-arc',
        description: 'Visual flow that creates dynamism and guides narrative',
        examples: [
          'Character motion from bottom-left to top-right creating energy',
          'Product reveal following S-curve path through scene for elegance',
        ],
        success_rate: 0.84,
        usage_count: 0,
      },
      {
        pattern_name: 'symmetry-balance',
        description: 'Symmetrical composition for formal/professional feel',
        examples: [
          'Product centered with identical environment on left/right for luxury brands',
          'Mirror-image composition of couple/pair for romantic narrative',
        ],
        success_rate: 0.86,
        usage_count: 0,
      },
      {
        pattern_name: 'frame-within-frame',
        description: 'Natural framing elements that draw focus to subject',
        examples: [
          'Product viewed through window/doorway creating nested frames',
          'Character framed by tree branches, architectural elements creating layered focus',
        ],
        success_rate: 0.83,
        usage_count: 0,
      },
    ];

    for (const pattern of patterns) {
      this.patterns.set(pattern.pattern_name, pattern);
    }

    log.info('[TrainingLoader] Cinematography patterns loaded', { count: patterns.length });
    return patterns;
  }

  /**
   * Load artistic quality standards
   */
  async loadArtisticQualityStandards(): Promise<Record<string, any>> {
    return {
      lighting: {
        professional: [
          'Three-point lighting (key, fill, back light)',
          'Golden hour natural lighting for warmth',
          'Soft diffused light avoiding harsh shadows',
          'High-key for bright/energetic, low-key for dramatic/mystery',
        ],
      },
      composition: {
        professional: [
          'Depth of field manipulation (shallow DOF for subject isolation)',
          'Aspect ratio respect (4:5 carousel, 9:16 vertical, 16:9 landscape)',
          'Empty space intentional, not accidental',
          'No visual clutter, every element serves narrative',
        ],
      },
      color_grading: {
        professional: [
          'Consistent color temperature throughout scene',
          'Saturated highlights, preserved shadows for contrast',
          'LUT applied for film stock aesthetic (Cinematic, Kodak, etc)',
          'HSL adjustments isolating skin tones, product colors',
        ],
      },
      typography: {
        professional: [
          'Readable over background (min 4.5:1 contrast WCAG AA)',
          'Premium font pairing (serif+sans-serif, script+sans-serif)',
          'Alignment intentional (not centered unless design calls for it)',
          'Hierarchy: headline 28-36px, body 14-18px, decoration 12-16px',
        ],
      },
    };
  }

  /**
   * Load product presentation standards
   */
  async loadProductStandards(): Promise<Record<string, any>> {
    return {
      angles: [
        'Hero shot: 45° angle showing product dimensionality',
        'Lifestyle: Product in use context, hands-on engagement',
        'Detail: Macro close-up showing texture, craftsmanship',
        'Packaging: Full packaging visible, readable labels',
        'Comparison: Side-by-side with similar products or before/after',
      ],
      lighting: [
        'Product-specific: Jewelry = bright highlights, cosmetics = soft, tech = architectural',
        'Edge lighting for dimensionality (separation from background)',
        'No shadows obscuring product details unless intentional mood',
      ],
      background: [
        'Complementary, not competing (negative space dominant)',
        'Minimal props (1-2 supporting elements max)',
        'Consistent surface/material (wood, concrete, white, gradient)',
        'No distracting textures unless brand aesthetic dictates',
      ],
      styling: [
        'Hands/fingers natural and manicured',
        'Props relevant to product category',
        'No packaging logos competing for attention if product star',
        'Consistency across carousel frames (same setting, styling, lighting)',
      ],
    };
  }

  /**
   * Load face/pet safety standards (deformation avoidance)
   */
  async loadBiologicalSafetyStandards(): Promise<Record<string, any>> {
    return {
      faces: {
        critical_checks: [
          'Symmetry maintained (eyes same size, aligned)',
          'Skin continuity (no warping, stretching, melting)',
          'Feature proportions realistic (nose-to-face ratio, eye-to-head ratio)',
          'Teeth/mouth natural (no duplicated teeth, normal expression)',
          'Hair flow logical (gravity respected, no floating)',
        ],
        prompting_best_practices: [
          'Specify style: "photorealistic face" or "illustrated portrait"',
          'Include age range if relevant',
          'Reference emotion, not description (joy, concentration, surprise)',
          'Avoid ambiguous angles that encourage artifacts',
        ],
      },
      pets: {
        critical_checks: [
          'Limbs correct count and attached properly',
          'Face proportions breed-accurate',
          'Fur/texture consistent, not melted/warped',
          'Eyes clear and properly positioned',
          'Ears, tail, other features normal anatomy',
        ],
        prompting_best_practices: [
          'Specify breed explicitly if needed',
          'Action poses clear (sitting, running, sleeping)',
          'Lighting matches environment (no floating pets)',
        ],
      },
      people_in_scenes: {
        critical_checks: [
          'Body proportions realistic (no extra limbs, merged bodies)',
          'Interaction natural (hands on table, not floating)',
          'Clothing realistic (seams aligned, fabric drapes naturally)',
          'Multiple people: correct count, proper spacing',
        ],
      },
    };
  }

  /**
   * Register training example (human-assessed good content)
   */
  registerTrainingExample(example: TrainingExample): boolean {
    try {
      // TODO: Store in database for feedback loop
      log.info('[TrainingLoader] Training example registered', {
        id: example.id,
        type: example.content_type,
        qualityScore: example.quality_score,
      });
      return true;
    } catch (error) {
      log.error('[TrainingLoader] Register example failed', error);
      return false;
    }
  }

  /**
   * Get all loaded patterns
   */
  getPatterns(): Map<string, BrainPattern> {
    return this.patterns;
  }

  /**
   * Get pattern by name
   */
  getPattern(patternName: string): BrainPattern | undefined {
    return this.patterns.get(patternName);
  }

  /**
   * Update pattern usage (feedback loop)
   */
  updatePatternUsage(patternName: string, success: boolean): void {
    const pattern = this.patterns.get(patternName);
    if (pattern) {
      pattern.usage_count++;
      if (success) {
        pattern.success_rate = (pattern.success_rate * (pattern.usage_count - 1) + 1) / pattern.usage_count;
      }
    }
  }
}

export const trainingDataLoader = new TrainingDataLoader();
