import { Carousel, CarouselSlide } from '../db/carousel-schema.js';

export interface ValidationResult {
  isValid: boolean;
  score: number;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

interface ValidationError {
  type: string;
  field: string;
  message: string;
  severity: 'critical' | 'high';
}

interface ValidationWarning {
  type: string;
  field: string;
  message: string;
  severity: 'medium' | 'low';
}

class CarouselQualityValidator {
  validate(carousel: Carousel): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: string[] = [];

    this.validateMetadata(carousel, errors, warnings, suggestions);
    this.validateSlides(carousel, errors, warnings, suggestions);
    this.validateContent(carousel, errors, warnings, suggestions);
    this.validateBranding(carousel, errors, warnings, suggestions);

    const criticalErrors = errors.filter(e => e.severity === 'critical');
    const isValid = criticalErrors.length === 0;
    const score = this.calculateScore(carousel, errors, warnings);

    return { isValid, score, errors, warnings, suggestions };
  }

  private validateMetadata(carousel: Carousel, errors: ValidationError[], warnings: ValidationWarning[], suggestions: string[]): void {
    if (!carousel.title || carousel.title.trim().length === 0) {
      errors.push({
        type: 'MISSING_TITLE',
        field: 'title',
        message: 'Carousel title is required',
        severity: 'critical',
      });
    } else if (carousel.title.length < 3) {
      warnings.push({
        type: 'SHORT_TITLE',
        field: 'title',
        message: 'Title is very short (< 3 chars)',
        severity: 'medium',
      });
    } else if (carousel.title.length > 100) {
      warnings.push({
        type: 'LONG_TITLE',
        field: 'title',
        message: 'Title is very long (> 100 chars)',
        severity: 'low',
      });
    }

    if (!carousel.metadata?.platform) {
      errors.push({
        type: 'MISSING_PLATFORM',
        field: 'platform',
        message: 'Platform is required (instagram, tiktok, or linkedin)',
        severity: 'critical',
      });
    }

    if (!carousel.metadata?.status) {
      errors.push({
        type: 'MISSING_STATUS',
        field: 'status',
        message: 'Status is required (draft, published, or archived)',
        severity: 'critical',
      });
    }
  }

  private validateSlides(carousel: Carousel, errors: ValidationError[], warnings: ValidationWarning[], suggestions: string[]): void {
    if (!carousel.slides || carousel.slides.length === 0) {
      errors.push({
        type: 'NO_SLIDES',
        field: 'slides',
        message: 'Carousel must have at least 1 slide',
        severity: 'critical',
      });
      return;
    }

    if (carousel.slides.length > 20) {
      warnings.push({
        type: 'TOO_MANY_SLIDES',
        field: 'slides',
        message: `Too many slides (${carousel.slides.length}). Recommended max is 15.`,
        severity: 'low',
      });
    }

    carousel.slides.forEach((slide: CarouselSlide, idx: number) => {
      this.validateSlide(slide, idx, carousel.slides.length, carousel.metadata.platform, errors, warnings, suggestions);
    });
  }

  private validateSlide(
    slide: CarouselSlide,
    idx: number,
    totalSlides: number,
    platform: string,
    errors: ValidationError[],
    warnings: ValidationWarning[],
    suggestions: string[]
  ): void {
    const field = `slides[${idx}]`;

    if (!slide.headline || slide.headline.trim().length === 0) {
      errors.push({
        type: 'MISSING_HEADLINE',
        field,
        message: `Slide ${idx + 1}: Headline is required`,
        severity: 'critical',
      });
    } else if (slide.headline.length < 3) {
      warnings.push({
        type: 'SHORT_HEADLINE',
        field,
        message: `Slide ${idx + 1}: Headline is very short`,
        severity: 'medium',
      });
    } else if (slide.headline.length > 120) {
      warnings.push({
        type: 'LONG_HEADLINE',
        field,
        message: `Slide ${idx + 1}: Headline is very long (> 120 chars). Consider shortening.`,
        severity: 'low',
      });
    }

    if (!slide.body || slide.body.trim().length === 0) {
      if (idx === 0) {
        warnings.push({
          type: 'MISSING_BODY_FIRST_SLIDE',
          field,
          message: `Slide ${idx + 1}: First slide body is empty`,
          severity: 'medium',
        });
      } else {
        warnings.push({
          type: 'MISSING_BODY',
          field,
          message: `Slide ${idx + 1}: Body is empty`,
          severity: 'low',
        });
      }
    } else if (slide.body.length > 500) {
      warnings.push({
        type: 'LONG_BODY',
        field,
        message: `Slide ${idx + 1}: Body is very long (> 500 chars)`,
        severity: 'low',
      });
    }

    if (!slide.cta || slide.cta.trim().length === 0) {
      if (idx === totalSlides - 1) {
        warnings.push({
          type: 'MISSING_CTA_LAST_SLIDE',
          field,
          message: `Slide ${idx + 1}: Last slide CTA is empty. Add a call-to-action.`,
          severity: 'medium',
        });
      }
    } else if (slide.cta.length > 50) {
      warnings.push({
        type: 'LONG_CTA',
        field,
        message: `Slide ${idx + 1}: CTA is very long. Keep to < 50 chars.`,
        severity: 'low',
      });
    }
  }

  private validateContent(carousel: Carousel, errors: ValidationError[], warnings: ValidationWarning[], suggestions: string[]): void {
    const allText = carousel.slides.map(s => (s.headline + ' ' + s.body + ' ' + s.cta).toLowerCase()).join(' ');

    if (allText.split(' ').length < 10) {
      warnings.push({
        type: 'TOO_LITTLE_TEXT',
        field: 'content',
        message: 'Carousel has very little text content. Consider expanding.',
        severity: 'medium',
      });
    }

    if (allText.includes('xxx') || allText.includes('placeholder') || allText.includes('lorem')) {
      errors.push({
        type: 'PLACEHOLDER_TEXT',
        field: 'content',
        message: 'Carousel contains placeholder text. Replace with real content.',
        severity: 'high',
      });
    }

    const capsMatches = allText.match(/\b[A-Z]{2,}\b/g) || [];
    if (capsMatches.length > allText.split(' ').length * 0.3) {
      warnings.push({
        type: 'TOO_MUCH_CAPS',
        field: 'content',
        message: 'Too much text is in ALL CAPS. Avoid excessive capitalization.',
        severity: 'low',
      });
    }

    const emojiCount = (allText.match(/[^\x00-\x7F]/g) || []).length;
    if (emojiCount > 5) {
      warnings.push({
        type: 'TOO_MANY_EMOJIS',
        field: 'content',
        message: `Too many emojis/special chars (${emojiCount}). Keep it minimal.`,
        severity: 'low',
      });
    }
  }

  private validateBranding(carousel: Carousel, errors: ValidationError[], warnings: ValidationWarning[], suggestions: string[]): void {
    if (carousel.metadata?.platform === 'instagram') {
      if (carousel.slides.length < 3) {
        suggestions.push('Instagram carousels should have at least 3 slides for better engagement.');
      }
      if (carousel.slides.length > 10) {
        suggestions.push('Instagram carousels perform best with 5-10 slides. Consider splitting into 2 carousels.');
      }
    }

    if (carousel.metadata?.platform === 'tiktok') {
      if (carousel.slides.length > 5) {
        warnings.push({
          type: 'TOO_MANY_SLIDES_TIKTOK',
          field: 'slides',
          message: 'TikTok performs best with 3-5 slides. This carousel has too many.',
          severity: 'low',
        });
      }
    }

    if (!carousel.brandIdentity?.primaryColor) {
      suggestions.push('Consider adding brand identity colors for visual consistency.');
    }

    if (!carousel.sourceCategory) {
      suggestions.push('Category would help with content organization and analytics.');
    }
  }

  private calculateScore(carousel: Carousel, errors: ValidationError[], warnings: ValidationWarning[]): number {
    let score = 100;

    errors.forEach(err => {
      if (err.severity === 'critical') score -= 25;
      else if (err.severity === 'high') score -= 15;
    });

    warnings.forEach(warn => {
      if (warn.severity === 'medium') score -= 5;
      else if (warn.severity === 'low') score -= 2;
    });

    return Math.max(0, score);
  }

  async generateReport(carousel: Carousel): Promise<{
    carouselId: string;
    validation: ValidationResult;
    timestamp: string;
    recommendation: 'approve' | 'review' | 'reject';
  }> {
    const validation = this.validate(carousel);

    let recommendation: 'approve' | 'review' | 'reject' = 'approve';
    if (!validation.isValid) recommendation = 'reject';
    else if (validation.score < 75) recommendation = 'review';

    return {
      carouselId: carousel.id,
      validation,
      timestamp: new Date().toISOString(),
      recommendation,
    };
  }
}

export const carouselQualityValidator = new CarouselQualityValidator();
