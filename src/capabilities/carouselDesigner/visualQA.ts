/**
 * Visual QA — Validate carousel aesthetic against Pinterest standards.
 * Blocks export if score < 70 (configurable).
 */

export interface QAResult {
  score: number; // 0-100
  passed: boolean; // score >= threshold
  issues: string[];
  warnings: string[];
  timestamp: string;
}

/**
 * Validate carousel slides against Pinterest aesthetic standards.
 * Returns score + issues found.
 */
export const validateAesthetic = (slides: unknown[], threshold: number = 70): QAResult => {
  const issues: string[] = [];
  const warnings: string[] = [];
  let scoreDeduction = 0;

  // Check 1: Typography sizing
  slides.forEach((slide, idx) => {
    const headlineSize = slide.typography?.headline?.size || 0;
    const bodySize = slide.typography?.body?.size || 0;

    if (headlineSize < 28 || headlineSize > 36) {
      issues.push(`Slide ${idx + 1}: Headline size ${headlineSize}px not in 28-36px range`);
      scoreDeduction += 5;
    }
    if (bodySize < 14 || bodySize > 18) {
      warnings.push(`Slide ${idx + 1}: Body size ${bodySize}px not in 14-18px range`);
      scoreDeduction += 3;
    }
  });

  // Check 2: Color palette completeness
  slides.forEach((slide, idx) => {
    const palette = slide.colorPalette;
    if (!palette || !palette.primary || !palette.secondary) {
      issues.push(`Slide ${idx + 1}: Missing color palette (primary/secondary)`);
      scoreDeduction += 10;
    }

    // Check for too many colors
    const colors = [palette?.primary, palette?.secondary, palette?.accent].filter(Boolean);
    if (colors.length > 4) {
      warnings.push(`Slide ${idx + 1}: Too many colors (${colors.length}), max 4`);
      scoreDeduction += 5;
    }
  });

  // Check 3: Layout patterns valid
  const validPatterns = [
    'left-aligned-text-right-image',
    'full-bleed-image-overlay',
    'grid-layout',
    'asymmetrical-balance',
  ];

  slides.forEach((slide, idx) => {
    if (!validPatterns.includes(slide.pinterestPattern)) {
      warnings.push(`Slide ${idx + 1}: Unknown layout pattern "${slide.pinterestPattern}"`);
      scoreDeduction += 3;
    }
  });

  // Check 4: Animation validity
  const validAnimations = ['fade', 'slideLeft', 'slideUp', 'zoom', 'rotate'];

  slides.forEach((slide, idx) => {
    const animType = slide.animation?.type;
    if (!validAnimations.includes(animType)) {
      warnings.push(`Slide ${idx + 1}: Invalid animation "${animType}"`);
      scoreDeduction += 2;
    }

    const duration = slide.animation?.duration || 0;
    if (duration < 300 || duration > 600) {
      warnings.push(`Slide ${idx + 1}: Animation duration ${duration}ms not in 300-600ms`);
      scoreDeduction += 2;
    }
  });

  // Check 5: Rounded corners applied
  const cornerRadii = slides.filter((s) => s.cssKeyframes && s.cssKeyframes.includes('border-radius'));
  if (cornerRadii.length < slides.length * 0.7) {
    warnings.push(`Only ${cornerRadii.length}/${slides.length} slides have rounded corners`);
    scoreDeduction += 5;
  }

  // Calculate final score
  const baseScore = 100;
  const score = Math.max(0, baseScore - scoreDeduction);
  const passed = score >= threshold;

  if (!passed) {
    issues.push(`Final score ${score}% below threshold ${threshold}%`);
  }

  return {
    score: Math.round(score),
    passed,
    issues,
    warnings,
    timestamp: new Date().toISOString(),
  };
};

/**
 * Block export if aesthetic validation fails.
 * Throws error if validation doesn't pass.
 */
export const requireAestheticPass = (result: QAResult, threshold: number = 70): void => {
  if (result.score < threshold) {
    const issuesList = result.issues.join('\n  - ');
    throw new Error(
      `Carousel aesthetic validation failed (${result.score}% < ${threshold}% threshold):\n  - ${issuesList}`,
    );
  }
};

/**
 * Auto-fix common aesthetic issues.
 * Returns modified slides + list of fixes applied.
 */
export const autoFixAesthetic = (
  slides: unknown[],
): { slides: unknown[]; fixes: string[] } => {
  const fixes: string[] = [];
  const fixed = JSON.parse(JSON.stringify(slides)); // Deep copy

  fixed.forEach((slide: unknown, idx: number) => {
    // Fix 1: Headline size out of range
    const headlineSize = slide.typography?.headline?.size || 32;
    if (headlineSize < 28) {
      slide.typography.headline.size = 28;
      fixes.push(`Slide ${idx + 1}: Fixed headline size to 28px`);
    } else if (headlineSize > 36) {
      slide.typography.headline.size = 36;
      fixes.push(`Slide ${idx + 1}: Fixed headline size to 36px`);
    }

    // Fix 2: Body size out of range
    const bodySize = slide.typography?.body?.size || 16;
    if (bodySize < 14) {
      slide.typography.body.size = 14;
      fixes.push(`Slide ${idx + 1}: Fixed body size to 14px`);
    } else if (bodySize > 18) {
      slide.typography.body.size = 18;
      fixes.push(`Slide ${idx + 1}: Fixed body size to 18px`);
    }

    // Fix 3: Animation duration out of range
    const duration = slide.animation?.duration || 400;
    if (duration < 300) {
      slide.animation.duration = 300;
      fixes.push(`Slide ${idx + 1}: Fixed animation duration to 300ms`);
    } else if (duration > 600) {
      slide.animation.duration = 600;
      fixes.push(`Slide ${idx + 1}: Fixed animation duration to 600ms`);
    }

    // Fix 4: Invalid pattern → default
    if (!validPatterns.includes(slide.pinterestPattern)) {
      const defaultPattern = 'left-aligned-text-right-image';
      fixes.push(`Slide ${idx + 1}: Fixed layout pattern to ${defaultPattern}`);
      slide.pinterestPattern = defaultPattern;
    }
  });

  const validPatterns = [
    'left-aligned-text-right-image',
    'full-bleed-image-overlay',
    'grid-layout',
    'asymmetrical-balance',
  ];

  return { slides: fixed, fixes };
};

export const visualQA = {
  validateAesthetic,
  requireAestheticPass,
  autoFixAesthetic,
};
