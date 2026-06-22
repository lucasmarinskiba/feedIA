import { log } from '../../agent/logger.js';
import { autofillTemplate, exportDesign, searchBrandTemplates } from '../../integrations/canva.js';
import { executeWithRecovery } from '../computerUse/reliableSession.js';
import { getFormat, type CanvaFormatId } from './canvaFormatRegistry.js';
import type { BrandProfile } from '../../config/types.js';
import type { NicheCategory } from '../intelligence/nicheAnalyzer.js';

/**
 * Canva Visual Engine
 * VISUAL-ONLY designs (no text overlays)
 * For: single posts, stories, reel covers, video covers, highlight covers
 *
 * Rule: textInCanva === false → these formats get text added natively on the platform
 * Why: native platform text = better SEO indexing in Instagram/TikTok search
 */

export interface VisualCreateRequest {
  format: CanvaFormatId;
  visualTheme: string;
  colorOverride?: string[];
  imageAssetId?: string;
  imageUrl?: string;
  niche?: NicheCategory;
  brandTemplateId?: string;
  purpose: 'product' | 'lifestyle' | 'promotional-bg' | 'pattern' | 'gradient' | 'highlight-icon';
  userHandle?: string;
}

export interface VisualCreateResult {
  ok: boolean;
  designId?: string;
  designUrl?: string;
  exportUrls?: string[];
  note?: string;
  error?: string;
}

// Visual style descriptions per niche (no text, just visual direction)
const NICHE_VISUAL_STYLES: Partial<Record<NicheCategory, string>> = {
  'fitness-products':
    'High-contrast gym aesthetic, bold colors, product-focused, clean white space, supplement/equipment photography style',
  'fitness-coaching': 'Motivational, warm tones, transformation-focused, person-centric, before/after split aesthetic',
  'fitness-b2b':
    'Professional, clean, corporate-adjacent but energetic, data visualization elements, authority aesthetic',
  'personal-brand': 'Vibrant, trendy, creator aesthetic, lifestyle photography, bright and engaging',
  ecommerce: 'Product-first, minimal background, commercial photography style, brand-consistent',
  coaching: 'Warm professional, trust-signaling, clean layout, person in action',
  education: 'Clean infographic style, structured, readable, approachable',
  entertainment: 'Bold, loud, high contrast, trend-forward, attention-grabbing',
  beauty: 'Soft, pastel, luxury feel, close-up product photography, aspirational',
  fashion: 'Editorial, moody, trend-forward, clean composition',
  travel: 'Immersive, destination-focused, vibrant nature/cityscape',
  food: 'Warm, inviting, close-up food photography, appetizing',
  finance: 'Clean, trustworthy, minimal, financial credibility aesthetic',
  tech: 'Futuristic, minimal, dark mode or white, precision-focused',
};

// Format-specific visual guidelines
const FORMAT_VISUAL_RULES: Record<string, string> = {
  'ig-post-square':
    'Square composition. Leave center for text (will be added natively). Strong visual edges. Brand colors prominent.',
  'ig-post-portrait':
    'Portrait 4:5. Upper third and lower third safe zones for native text overlay. Rich mid-section visual.',
  'ig-story':
    'Full-bleed 9:16. Top 250px and bottom 250px = safe zones for native stickers. Center is the visual hero.',
  'ig-reel-cover': 'Thumbnail for reel. Bold single image or graphic. Center composition. Will compete in grid view.',
  'ig-highlight-cover': 'Circular crop — design centered square. Single icon or minimal graphic. 1 or 2 colors max.',
  'tk-video-cover': 'TikTok thumbnail. Eye-catching. Center-weighted. Strong color contrast.',
  'tk-story': 'Full-bleed 9:16. Clear visual zones for native TikTok stickers.',
};

export class CanvaVisualEngine {
  /**
   * Create a visual-only design (no in-canvas text)
   * Text is intentionally omitted — will be added natively on platform
   */
  async createVisual(brand: BrandProfile, request: VisualCreateRequest): Promise<VisualCreateResult> {
    const format = getFormat(request.format);

    if (format.textInCanva) {
      return {
        ok: false,
        error: `Format ${request.format} requires text in Canva. Use canvaCarouselEngine instead.`,
      };
    }

    log.info(`[VisualEngine] Creating ${request.format}: ${request.purpose} visual`);

    // Attempt 1: brand template
    const templateResult = await this.tryBrandTemplate(brand, request, format);
    if (templateResult.ok) {
      return {
        ...templateResult,
        note: format.nativeTextNote,
      };
    }

    // Attempt 2: Computer Use
    log.info('[VisualEngine] No brand template → Computer Use');
    return this.generateViaComputerUse(brand, request, format);
  }

  /**
   * Create a set of highlight covers (icon set) for Instagram
   */
  async createHighlightCoverSet(
    brand: BrandProfile,
    categories: string[],
    userHandle?: string,
  ): Promise<VisualCreateResult[]> {
    return Promise.all(
      categories.map((category) =>
        this.createVisual(brand, {
          format: 'ig-highlight-cover',
          visualTheme: `${category} icon, minimal, ${brand.visual.palette[0] ?? '#000'} background`,
          purpose: 'highlight-icon',
          userHandle,
        }),
      ),
    );
  }

  /**
   * Create a reel cover thumbnail
   * Visual-only: native Instagram adds the text overlay
   */
  async createReelCover(
    brand: BrandProfile,
    visualTheme: string,
    niche: NicheCategory,
    userHandle?: string,
  ): Promise<VisualCreateResult> {
    return this.createVisual(brand, {
      format: 'ig-reel-cover',
      visualTheme,
      niche,
      purpose: 'promotional-bg',
      userHandle,
    });
  }

  /**
   * Create story background set (batch)
   * Returns multiple visual backgrounds for story sequences
   */
  async createStoryBackgroundBatch(
    brand: BrandProfile,
    themes: string[],
    platform: 'instagram' | 'tiktok',
    userHandle?: string,
  ): Promise<VisualCreateResult[]> {
    const format = platform === 'instagram' ? 'ig-story' : 'tk-story';
    return Promise.all(
      themes.map((theme) =>
        this.createVisual(brand, {
          format: format as CanvaFormatId,
          visualTheme: theme,
          purpose: 'promotional-bg',
          userHandle,
        }),
      ),
    );
  }

  /**
   * Create a TikTok video cover thumbnail
   */
  async createTikTokCover(
    brand: BrandProfile,
    visualTheme: string,
    niche: NicheCategory,
    userHandle?: string,
  ): Promise<VisualCreateResult> {
    return this.createVisual(brand, {
      format: 'tk-video-cover',
      visualTheme,
      niche,
      purpose: 'promotional-bg',
      userHandle,
    });
  }

  private async tryBrandTemplate(
    brand: BrandProfile,
    request: VisualCreateRequest,
    format: ReturnType<typeof getFormat>,
  ): Promise<VisualCreateResult> {
    const templateId =
      request.brandTemplateId ?? (await this.findVisualTemplate(request.niche, request.format, request.userHandle));

    if (!templateId) return { ok: false, error: 'No template found' };

    const data: Record<string, { type: 'text'; text: string }> = {};

    const result = await autofillTemplate({
      brandTemplateId: templateId,
      title: `${brand.name} ${format.label}`,
      data,
      userHandle: request.userHandle,
    });

    if (!result.ok || !result.designId) return { ok: false, error: result.error };

    const exported = await exportDesign({
      designId: result.designId,
      format: format.exportFormat,
      quality: 'high',
      userHandle: request.userHandle,
    });

    return {
      ok: true,
      designId: result.designId,
      designUrl: result.designUrl,
      exportUrls: exported.ok ? exported.urls : undefined,
    };
  }

  private async generateViaComputerUse(
    brand: BrandProfile,
    request: VisualCreateRequest,
    format: ReturnType<typeof getFormat>,
  ): Promise<VisualCreateResult> {
    const nicheStyle = (request.niche && NICHE_VISUAL_STYLES[request.niche]) ?? 'clean, modern, brand-consistent';
    const formatRule = FORMAT_VISUAL_RULES[request.format] ?? 'full bleed visual, no text';
    const colors = (request.colorOverride ?? brand.visual.palette).slice(0, 3).join(', ');

    const goal = `Create a VISUAL-ONLY design in Canva for ${format.label}:

IMPORTANT: NO TEXT in this design. Text will be added natively on ${format.platform} for SEO.

BRAND: ${brand.name}
COLORS: ${colors}
DIMENSIONS: ${format.width}×${format.height}px
PURPOSE: ${request.purpose}

VISUAL THEME: ${request.visualTheme}
NICHE STYLE: ${nicheStyle}
FORMAT RULES: ${formatRule}

STEPS:
1. Go to canva.com → Create design → Custom size: ${format.width}×${format.height}px
2. Search templates: "${request.visualTheme} ${format.label}"
3. Apply niche visual style: ${nicheStyle}
4. Use brand colors: ${colors}
5. DO NOT add any text elements
6. Use visual elements only: photos, shapes, patterns, gradients, stickers, icons
7. Export as ${format.exportFormat.toUpperCase()} at highest quality
8. Output: DESIGN_URL: https://www.canva.com/design/[id]

NOTE: ${format.nativeTextNote}`;

    const result = await executeWithRecovery(brand, {
      goal,
      maxIterations: 20,
      operationName: `Canva visual: ${request.format}`,
      maxRetries: 2,
    });

    const urlMatch = result.summary.match(/canva\.com\/design\/([A-Za-z0-9_-]+)/);
    const designId = urlMatch?.[1] ?? 'unknown';

    return {
      ok: result.ok,
      designId,
      designUrl: urlMatch ? `https://www.canva.com/design/${designId}` : undefined,
      note: format.nativeTextNote,
    };
  }

  private async findVisualTemplate(
    niche: NicheCategory | undefined,
    formatId: CanvaFormatId,
    userHandle?: string,
  ): Promise<string | null> {
    const nicheQuery = niche ? (NICHE_VISUAL_STYLES[niche]?.split(',')[0] ?? '') : '';
    const query = `${nicheQuery} ${formatId.replace('-', ' ')} visual background`.trim();

    const result = await searchBrandTemplates({ query, userHandle, limit: 3 });
    if (!result.ok || !result.templates?.length) return null;

    return result.templates[0]?.id ?? null;
  }
}

export const canvaVisualEngine = new CanvaVisualEngine();
