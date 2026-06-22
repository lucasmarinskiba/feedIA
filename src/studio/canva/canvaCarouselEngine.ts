import { log } from '../../agent/logger.js';
import { autofillTemplate, exportDesign, searchBrandTemplates, resizeDesign } from '../../integrations/canva.js';
import { executeWithRecovery } from '../computerUse/reliableSession.js';
import { getFormat, CAROUSEL_SLIDE_STRUCTURES, type CanvaFormatId, type SlideTemplate } from './canvaFormatRegistry.js';
import type { BrandProfile } from '../../config/types.js';
import type { NicheCategory } from '../intelligence/nicheAnalyzer.js';

/**
 * Canva Carousel Engine
 * TEXT-IN-CANVA only (carousels + TikTok Photo Mode)
 * Builds slide-by-slide content, autofills brand templates, exports per slide
 *
 * Rule enforced here: textInCanva === true only for carousel formats
 */

export interface CarouselSlideContent {
  slideIndex: number;
  headline?: string;
  subheadline?: string;
  body?: string;
  cta?: string;
  number?: string;
  label?: string;
  imageAssetId?: string;
}

export interface CarouselCreateRequest {
  format: CanvaFormatId;
  slides: CarouselSlideContent[];
  brandTemplateId?: string;
  niche?: NicheCategory;
  title: string;
  userHandle?: string;
}

export interface CarouselCreateResult {
  ok: boolean;
  designId?: string;
  designUrl?: string;
  slideImageUrls?: string[];
  slideCount?: number;
  error?: string;
}

// Niche → template search query mapping
const NICHE_TEMPLATE_QUERIES: Partial<Record<NicheCategory, string>> = {
  'fitness-products': 'fitness supplement gym product carousel',
  'fitness-coaching': 'fitness transformation coaching carousel',
  'fitness-b2b': 'business coaching professional carousel',
  'personal-brand': 'personal brand creator lifestyle carousel',
  ecommerce: 'product showcase ecommerce carousel',
  coaching: 'coaching tips educational carousel',
  education: 'educational tips steps carousel',
  entertainment: 'bold colorful entertainment carousel',
  finance: 'finance money investment carousel',
  'real-estate': 'real estate property carousel',
  beauty: 'beauty skincare tutorial carousel',
  fashion: 'fashion style lookbook carousel',
  food: 'recipe food step carousel',
  travel: 'travel destination carousel',
  tech: 'tech product minimal carousel',
};

// Slide content generators per niche + purpose
const SLIDE_CONTENT_GENERATORS: Record<
  string,
  (brand: BrandProfile, topic: string, index: number, total: number) => CarouselSlideContent
> = {
  educational: (brand, topic, index, total) => {
    if (index === 0) {
      return {
        slideIndex: 1,
        headline: topic,
        subheadline: `${total - 1} things you need to know`,
        label: brand.name,
      };
    }
    if (index === total - 1) {
      return {
        slideIndex: total,
        headline: 'Want more tips like this?',
        cta: 'Follow for more',
        label: `Save this for later`,
      };
    }
    return {
      slideIndex: index + 1,
      number: `${index}/${total - 1}`,
      headline: `Key point ${index}`,
      body: `Add specific insight here about ${topic}`,
    };
  },

  promotional: (brand, topic, index, total) => {
    if (index === 0) {
      return { slideIndex: 1, headline: topic, subheadline: 'Swipe to see what changed', label: brand.name };
    }
    if (index === total - 1) {
      return { slideIndex: total, headline: 'Ready to start?', cta: 'Shop now – link in bio' };
    }
    return { slideIndex: index + 1, headline: `Benefit ${index}`, body: `Why this matters for ${topic}` };
  },
};

export class CanvaCarouselEngine {
  /**
   * Create a fully-structured carousel with text baked into slides
   * Routes: brand template autofill → Computer Use fallback
   */
  async createCarousel(brand: BrandProfile, request: CarouselCreateRequest): Promise<CarouselCreateResult> {
    const format = getFormat(request.format);

    if (!format.textInCanva) {
      return { ok: false, error: `Format ${request.format} is visual-only. Use canvaVisualEngine instead.` };
    }

    log.info(`[CarouselEngine] Creating ${request.format}: "${request.title}" (${request.slides.length} slides)`);

    // Attempt 1: brand template autofill
    const templateResult = await this.tryBrandTemplateAutofill(brand, request, format);
    if (templateResult.ok) return templateResult;

    // Attempt 2: Computer Use generation (fallback)
    log.info('[CarouselEngine] Brand template not found → Computer Use fallback');
    return this.generateViaComputerUse(brand, request, format);
  }

  /**
   * Generate carousel slides from niche + topic (auto-populates content)
   */
  async generateCarouselContent(
    niche: NicheCategory,
    topic: string,
    purpose: 'educational' | 'promotional' | 'testimonial',
    slideCount: number,
    brand: BrandProfile,
  ): Promise<CarouselSlideContent[]> {
    const generator = SLIDE_CONTENT_GENERATORS[purpose] ?? SLIDE_CONTENT_GENERATORS.educational!;

    return Array.from({ length: slideCount }, (_, i) => generator(brand, topic, i, slideCount));
  }

  private async tryBrandTemplateAutofill(
    brand: BrandProfile,
    request: CarouselCreateRequest,
    format: ReturnType<typeof getFormat>,
  ): Promise<CarouselCreateResult> {
    // If explicit template ID provided, use it
    const templateId = request.brandTemplateId ?? (await this.findBestTemplate(request.niche, request.userHandle));

    if (!templateId) {
      return { ok: false, error: 'No brand template found' };
    }

    // Build autofill data from slide 1 (cover slide)
    const coverSlide = request.slides[0];
    if (!coverSlide) return { ok: false, error: 'No slides provided' };

    const autofillData: Record<string, { type: 'text'; text: string }> = {};

    if (coverSlide.headline) autofillData['headline'] = { type: 'text', text: coverSlide.headline };
    if (coverSlide.subheadline) autofillData['subheadline'] = { type: 'text', text: coverSlide.subheadline };
    if (coverSlide.body) autofillData['body'] = { type: 'text', text: coverSlide.body };
    if (coverSlide.cta) autofillData['cta'] = { type: 'text', text: coverSlide.cta };

    // Add subsequent slides as numbered fields
    request.slides.slice(1).forEach((slide, i) => {
      const n = i + 2;
      if (slide.headline) autofillData[`slide${n}_headline`] = { type: 'text', text: slide.headline };
      if (slide.body) autofillData[`slide${n}_body`] = { type: 'text', text: slide.body ?? '' };
      if (slide.number) autofillData[`slide${n}_number`] = { type: 'text', text: slide.number };
      if (slide.cta) autofillData[`slide${n}_cta`] = { type: 'text', text: slide.cta };
    });

    const result = await autofillTemplate({
      brandTemplateId: templateId,
      title: request.title,
      data: autofillData,
      userHandle: request.userHandle,
    });

    if (!result.ok || !result.designId) {
      return { ok: false, error: result.error ?? 'Autofill failed' };
    }

    // Resize to exact format dimensions
    const resized = await resizeDesign({
      designId: result.designId,
      width: format.width,
      height: format.height,
      userHandle: request.userHandle,
    });

    const finalDesignId = resized.ok && resized.designId ? resized.designId : result.designId;
    const finalDesignUrl = resized.ok && resized.designUrl ? resized.designUrl : (result.designUrl ?? '');

    // Export all pages as images
    const exported = await exportDesign({
      designId: finalDesignId,
      format: format.exportFormat,
      quality: 'high',
      userHandle: request.userHandle,
    });

    return {
      ok: true,
      designId: finalDesignId,
      designUrl: finalDesignUrl,
      slideImageUrls: exported.ok ? exported.urls : undefined,
      slideCount: request.slides.length,
    };
  }

  private async generateViaComputerUse(
    brand: BrandProfile,
    request: CarouselCreateRequest,
    format: ReturnType<typeof getFormat>,
  ): Promise<CarouselCreateResult> {
    const goal = this.buildCarouselGoal(brand, request, format);

    const result = await executeWithRecovery(brand, {
      goal,
      maxIterations: 25,
      operationName: `Canva carousel: ${request.title}`,
      maxRetries: 2,
    });

    const urlMatch = result.summary.match(/canva\.com\/design\/([A-Za-z0-9_-]+)/);
    const designId = urlMatch?.[1] ?? 'unknown';
    const designUrl = urlMatch ? `https://www.canva.com/design/${designId}` : '';

    return {
      ok: result.ok,
      designId,
      designUrl,
      slideCount: request.slides.length,
    };
  }

  private buildCarouselGoal(
    brand: BrandProfile,
    request: CarouselCreateRequest,
    format: ReturnType<typeof getFormat>,
  ): string {
    const slideList = request.slides
      .map((s) =>
        [
          `SLIDE ${s.slideIndex}:`,
          s.headline ? `  Headline: "${s.headline}"` : '',
          s.subheadline ? `  Subheadline: "${s.subheadline}"` : '',
          s.body ? `  Body: "${s.body}"` : '',
          s.number ? `  Number: "${s.number}"` : '',
          s.cta ? `  CTA: "${s.cta}"` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      )
      .join('\n\n');

    return `Create a ${format.label} carousel in Canva for Instagram/TikTok:

BRAND: ${brand.name}
COLORS: ${brand.visual.palette.slice(0, 3).join(', ')}
FONTS: ${brand.visual.typography.slice(0, 2).join(', ')}
TONE: ${brand.voice.tone[0] ?? 'professional'}
DIMENSIONS: ${format.width}×${format.height}px

CAROUSEL TITLE: "${request.title}"
SLIDES (${request.slides.length} total):
${slideList}

DESIGN RULES:
1. Go to canva.com → Create design → Presentation
2. Change canvas size to ${format.width}×${format.height}px via Resize
3. Use brand colors: ${brand.visual.palette[0] ?? '#000000'} (primary), ${brand.visual.palette[1] ?? '#FFFFFF'} (secondary)
4. Create ${request.slides.length} slides with the exact text content above
5. Text must be readable: min 48px for headlines, 28px for body
6. Each slide must have clear visual hierarchy: headline dominant
7. Add brand logo or name on first and last slides
8. Export URL and confirm in summary

CRITICAL: Text in the design is intentional — this is a carousel format where copy lives inside the slides.
Output: DESIGN_URL: https://www.canva.com/design/[id]`;
  }

  private async findBestTemplate(niche: NicheCategory | undefined, userHandle?: string): Promise<string | null> {
    const query = niche ? (NICHE_TEMPLATE_QUERIES[niche] ?? 'social media carousel') : 'social media carousel';

    const result = await searchBrandTemplates({ query, userHandle, limit: 5 });
    if (!result.ok || !result.templates?.length) return null;

    const first = result.templates[0];
    return first ? first.id : null;
  }

  /**
   * Build a 5-slide educational carousel from topic + niche (full automation)
   */
  async buildEducationalCarousel(
    topic: string,
    tips: string[],
    niche: NicheCategory,
    brand: BrandProfile,
    format: CanvaFormatId = 'ig-carousel-square',
    userHandle?: string,
  ): Promise<CarouselCreateResult> {
    const slides: CarouselSlideContent[] = [
      { slideIndex: 1, headline: topic, subheadline: `${tips.length} things to know`, label: brand.name },
      ...tips.slice(0, 8).map((tip, i) => ({
        slideIndex: i + 2,
        number: `${i + 1}`,
        headline: tip.split(':')[0] ?? tip.slice(0, 50),
        body: tip.includes(':') ? tip.split(':').slice(1).join(':').trim().slice(0, 120) : undefined,
      })),
      {
        slideIndex: tips.length + 2,
        headline: 'Save this for later',
        cta: 'Follow for more tips',
        label: brand.name,
      },
    ];

    return this.createCarousel(brand, {
      format,
      slides,
      niche,
      title: topic,
      userHandle,
    });
  }

  /**
   * Build a product/offer carousel (promotional)
   */
  async buildPromotionalCarousel(
    productName: string,
    benefits: string[],
    ctaText: string,
    niche: NicheCategory,
    brand: BrandProfile,
    format: CanvaFormatId = 'ig-carousel-square',
    userHandle?: string,
  ): Promise<CarouselCreateResult> {
    const slides: CarouselSlideContent[] = [
      { slideIndex: 1, headline: `Introducing: ${productName}`, subheadline: 'Swipe to see why →', label: brand.name },
      ...benefits.slice(0, 7).map((benefit, i) => ({
        slideIndex: i + 2,
        number: `${i + 1}`,
        headline: benefit.split(':')[0]?.trim() ?? benefit.slice(0, 60),
        body: benefit.includes(':') ? benefit.split(':').slice(1).join(':').trim().slice(0, 120) : undefined,
      })),
      { slideIndex: benefits.length + 2, headline: productName, cta: ctaText, label: brand.name },
    ];

    return this.createCarousel(brand, {
      format,
      slides,
      niche,
      title: productName,
      userHandle,
    });
  }

  /**
   * Build a testimonial/social proof carousel
   */
  async buildTestimonialCarousel(
    testimonials: Array<{ quote: string; author: string; result?: string }>,
    brand: BrandProfile,
    format: CanvaFormatId = 'ig-carousel-square',
    userHandle?: string,
  ): Promise<CarouselCreateResult> {
    const slides: CarouselSlideContent[] = [
      {
        slideIndex: 1,
        headline: 'Real results. Real people.',
        subheadline: 'Swipe for their stories →',
        label: brand.name,
      },
      ...testimonials.slice(0, 8).map((t, i) => ({
        slideIndex: i + 2,
        body: `"${t.quote.slice(0, 200)}"`,
        label: `— ${t.author}${t.result ? ` · ${t.result}` : ''}`,
      })),
      { slideIndex: testimonials.length + 2, headline: 'Want results like these?', cta: 'DM us to start' },
    ];

    return this.createCarousel(brand, {
      format,
      slides,
      title: 'Testimonials',
      userHandle,
    });
  }
}

export const canvaCarouselEngine = new CanvaCarouselEngine();

// Helper: enforce text-in-canva rule
export const isCarouselFormat = (formatId: CanvaFormatId): boolean => getFormat(formatId).textInCanva === true;
