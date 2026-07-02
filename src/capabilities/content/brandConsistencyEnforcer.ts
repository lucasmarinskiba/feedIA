/**
 * Phase 15: Brand Consistency Enforcer
 *
 * Locks brand elements (fonts, colors, tone, logo)
 * Validates all content matches brand identity
 */

import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

export interface BrandLockdown {
  locked: boolean;
  typography: {
    headline: {font: string; weights: number[]};
    body: {font: string; weights: number[]};
    accent?: {font: string; weights: number[]};
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    neutral: string;
  };
  logoPlacement: {
    position: 'top-left' | 'top-right' | 'bottom-right' | 'center';
    size: number; // % of slide
    opacity: number; // 0-1
  };
  voiceTone: {
    primary: string;
    secondary?: string;
    avoidTerms: string[];
    requiredTerms: string[];
  };
  contentRules: {
    minSlides: number;
    maxSlides: number;
    requiredElements: string[]; // CTA, testimonial, etc
    prohibitedElements: string[]; // Corporate jargon, etc
  };
}

export const createBrandLockdown = (brand: BrandProfile): BrandLockdown => {
  log.info(`[Brand Lockdown] Creating constraints for: ${brand.name}`);

  const lockdown: BrandLockdown = {
    locked: true,
    typography: {
      headline: {
        font: brand.fonts?.headline || 'Poppins',
        weights: [600, 700, 800], // Allow limited weights
      },
      body: {
        font: brand.fonts?.body || 'Inter',
        weights: [400, 500],
      },
      accent: brand.fonts?.accent
        ? {font: brand.fonts.accent, weights: [400, 600]}
        : undefined,
    },
    colors: {
      primary: brand.colors?.primary || '#E91E8C',
      secondary: brand.colors?.secondary || '#00D9FF',
      accent: brand.colors?.accent || '#FFFFFF',
      neutral: brand.colors?.neutral || '#1A1A1A',
    },
    logoPlacement: {
      position: 'top-right',
      size: 8, // 8% of slide
      opacity: 0.8,
    },
    voiceTone: {
      primary: brand.voice?.tone?.[0] || 'professional',
      secondary: brand.voice?.tone?.[1],
      avoidTerms: ['synergize', 'leverage', 'paradigm', 'utilize', 'very unique'],
      requiredTerms: brand.voice?.tone || [],
    },
    contentRules: {
      minSlides: 5,
      maxSlides: 15,
      requiredElements: ['hook', 'value', 'cta'],
      prohibitedElements: ['clickbait', 'false-claim', 'misleading-stat'],
    },
  };

  return lockdown;
};

// ── Validate content against lockdown ────────────────────────────────

export interface ValidationResult {
  compliant: boolean;
  score: number; // 0-100
  violations: string[];
  warnings: string[];
}

export const validateContentCompliance = (
  content: {
    headline: string;
    body: string;
    font?: string;
    textColor?: string;
    slideCount?: number;
  }[],
  lockdown: BrandLockdown,
): ValidationResult => {
  log.info(`[Validation] Checking ${content.length} slides against brand lockdown`);

  const violations: string[] = [];
  const warnings: string[] = [];

  // Check slide count
  if (content.length < lockdown.contentRules.minSlides) {
    violations.push(
      `Carousel too short (${content.length}/${lockdown.contentRules.minSlides} min).`,
    );
  }
  if (content.length > lockdown.contentRules.maxSlides) {
    violations.push(
      `Carousel too long (${content.length}/${lockdown.contentRules.maxSlides} max).`,
    );
  }

  // Check each slide
  content.forEach((slide, idx) => {
    // Typography check
    if (slide.font && !lockdown.typography.headline.font.includes(slide.font)) {
      warnings.push(`Slide ${idx + 1}: Font "${slide.font}" not in brand lockdown.`);
    }

    // Color check
    if (slide.textColor && ![lockdown.colors.primary, lockdown.colors.secondary].includes(slide.textColor)) {
      warnings.push(`Slide ${idx + 1}: Color "${slide.textColor}" not in brand palette.`);
    }

    // Tone check
    const avoidedTerm = lockdown.voiceTone.avoidTerms.find((t) => slide.headline.toLowerCase().includes(t));
    if (avoidedTerm) {
      violations.push(
        `Slide ${idx + 1}: Prohibited term "${avoidedTerm}" in headline. Use brand-approved language.`,
      );
    }

    // Required elements check
    if (idx === 0) {
      if (!slide.headline.match(/hook|stop|wait|question/i)) {
        warnings.push('Slide 1: Hook may be weak. Use attention-grabbing opener.');
      }
    }
  });

  // Check for required elements
  const hasRequiredElements = lockdown.contentRules.requiredElements.every((req) =>
    content.some((s) => s.headline.toLowerCase().includes(req) || s.body.toLowerCase().includes(req)),
  );
  if (!hasRequiredElements) {
    violations.push('Missing required content elements (hook, value, CTA).');
  }

  // Calculate compliance score
  const score = Math.max(0, 100 - violations.length * 20 - warnings.length * 5);
  const compliant = violations.length === 0 && score >= 80;

  log.info(`[Validation] Score: ${score}/100. Violations: ${violations.length}. Warnings: ${warnings.length}`);

  return {
    compliant,
    score,
    violations,
    warnings,
  };
};

// ── Enforce lockdown (rewrite violating content) ──────────────────────

export const enforceComplianceAutomated = (
  content: string,
  lockdown: BrandLockdown,
): string => {
  log.info('[Enforcement] Auto-correcting content for brand compliance');

  let fixed = content;

  // Replace avoided terms
  lockdown.voiceTone.avoidTerms.forEach((term) => {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    fixed = fixed.replace(regex, `[use brand-approved synonym]`);
  });

  // Ensure required terms are present (if not already)
  if (lockdown.voiceTone.requiredTerms.length > 0) {
    const requiredTerm = lockdown.voiceTone.requiredTerms[0];
    if (!fixed.toLowerCase().includes(requiredTerm)) {
      fixed = `${fixed} (${requiredTerm})`;
    }
  }

  return fixed;
};

// ── Compare posts for cross-carousel coherence ──────────────────────

export interface ContentCorrelation {
  posts: number;
  visualCoherence: number; // 0-100
  messagingCoherence: number; // 0-100
  brandCoherence: number; // 0-100
  overallCoherence: number; // 0-100
  issues: string[];
  recommendations: string[];
}

export const validateContentCorrelation = (
  posts: Array<{content: string; emotion: string; colors: string[]; fonts: string[]}>,
  lockdown: BrandLockdown,
): ContentCorrelation => {
  log.info(`[Correlation] Checking ${posts.length} posts for brand coherence`);

  const issues: string[] = [];
  const recommendations: string[] = [];

  // Visual coherence: Do colors/fonts align?
  const uniqueColors = new Set(posts.flatMap((p) => p.colors));
  const uniqueFonts = new Set(posts.flatMap((p) => p.fonts));

  let visualCoherence = 80;
  if (uniqueColors.size > 4) {
    visualCoherence -= 20;
    issues.push(`Too many colors (${uniqueColors.size}). Lock to 2-4.`);
  }
  if (uniqueFonts.size > 3) {
    visualCoherence -= 20;
    issues.push(`Too many fonts (${uniqueFonts.size}). Lock to max 3.`);
  }

  // Messaging coherence: Similar emotions/tones?
  const emotions = new Set(posts.map((p) => p.emotion));
  let messagingCoherence = emotions.size === 1 ? 95 : emotions.size === 2 ? 75 : 50;

  if (emotions.size > 2) {
    issues.push('Posts jump between emotions. Stick to 1-2 primary emotions.');
    recommendations.push('Reorder posts or adjust tone for flow.');
  }

  // Brand coherence: All using locked fonts/colors?
  let brandCoherence = 90;
  posts.forEach((post, idx) => {
    if (!post.fonts.includes(lockdown.typography.headline.font)) {
      brandCoherence -= 10;
      issues.push(`Post ${idx + 1}: Not using locked headline font.`);
    }
    if (!post.colors.some((c) => Object.values(lockdown.colors).includes(c))) {
      brandCoherence -= 10;
      issues.push(`Post ${idx + 1}: Colors not from brand palette.`);
    }
  });

  const overallCoherence = (visualCoherence + messagingCoherence + brandCoherence) / 3;

  log.info(
    `[Correlation] Visual=${visualCoherence}, Messaging=${messagingCoherence}, Brand=${brandCoherence}`,
  );

  return {
    posts: posts.length,
    visualCoherence,
    messagingCoherence,
    brandCoherence,
    overallCoherence: Math.round(overallCoherence),
    issues,
    recommendations,
  };
};
