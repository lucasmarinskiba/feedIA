import type { Tool } from '@anthropic-ai/sdk/resources/messages.js';
import { canvaCarouselEngine } from '../../studio/canva/canvaCarouselEngine.js';
import { canvaVisualEngine } from '../../studio/canva/canvaVisualEngine.js';
import {
  CANVA_FORMATS,
  getCarouselFormats,
  getVisualOnlyFormats,
  type CanvaFormatId,
} from '../../studio/canva/canvaFormatRegistry.js';
import { exportDesign, searchBrandTemplates, getDesign } from '../../integrations/canva.js';
import type { BrandProfile } from '../../config/types.js';
import type { NicheCategory } from '../../studio/intelligence/nicheAnalyzer.js';

interface ToolSpec extends Tool {
  description: string;
}

const tools: Record<string, ToolSpec> = {};

// Carousel format enum values (text-in-Canva)
const carouselFormatIds = getCarouselFormats().map((f) => f.id);
// Visual-only format enum values
const visualFormatIds = getVisualOnlyFormats().map((f) => f.id);

// ── Carousel Tools (text in Canva) ───────────────────────────────────────────

tools.canva_create_carousel = {
  name: 'canva_create_carousel',
  description:
    'Create Instagram/TikTok carousel with text baked into slides. Use for educational content, product showcases, step-by-step guides. TEXT LIVES IN CANVA for carousels.',
  input_schema: {
    type: 'object' as const,
    properties: {
      format: {
        type: 'string',
        enum: carouselFormatIds,
        description: 'ig-carousel-square (1080x1080), ig-carousel-portrait (1080x1350), tk-photo-mode (1080x1920)',
      },
      title: { type: 'string', description: 'Design title / topic' },
      slides: {
        type: 'array',
        description: 'Slide content array',
        items: {
          type: 'object',
          properties: {
            slide_index: { type: 'number' },
            headline: { type: 'string', description: 'Max 60 chars' },
            subheadline: { type: 'string', description: 'Max 80 chars' },
            body: { type: 'string', description: 'Max 150 chars' },
            cta: { type: 'string', description: 'Call to action' },
            number: { type: 'string', description: 'Slide number e.g. "1/5"' },
            label: { type: 'string', description: 'Small label text' },
          },
        },
      },
      niche: { type: 'string', description: 'Account niche for template matching' },
      brand_template_id: { type: 'string', description: 'Optional Canva brand template ID (starts with BTM)' },
    },
    required: ['format', 'title', 'slides'],
  },
};

tools.canva_educational_carousel = {
  name: 'canva_educational_carousel',
  description:
    'Auto-generate educational carousel from topic + tips list. Builds all slides automatically with numbers, tips, CTA slide.',
  input_schema: {
    type: 'object' as const,
    properties: {
      topic: { type: 'string', description: 'Carousel topic/headline e.g. "5 protein myths"' },
      tips: { type: 'array', items: { type: 'string' }, description: 'List of tips (tip title: explanation)' },
      niche: { type: 'string', description: 'Account niche' },
      format: { type: 'string', enum: carouselFormatIds },
    },
    required: ['topic', 'tips'],
  },
};

tools.canva_promotional_carousel = {
  name: 'canva_promotional_carousel',
  description:
    'Auto-generate product/offer carousel: cover → benefits → CTA slide. Fully automated from product name + benefits.',
  input_schema: {
    type: 'object' as const,
    properties: {
      product_name: { type: 'string' },
      benefits: { type: 'array', items: { type: 'string' }, description: 'Key benefits/features' },
      cta_text: { type: 'string', description: 'Final CTA e.g. "Shop now – link in bio"' },
      niche: { type: 'string' },
      format: { type: 'string', enum: carouselFormatIds },
    },
    required: ['product_name', 'benefits', 'cta_text'],
  },
};

tools.canva_testimonial_carousel = {
  name: 'canva_testimonial_carousel',
  description: 'Auto-generate social proof carousel from testimonials. Cover → quotes → CTA.',
  input_schema: {
    type: 'object' as const,
    properties: {
      testimonials: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            quote: { type: 'string', description: 'Customer quote max 200 chars' },
            author: { type: 'string' },
            result: { type: 'string', description: 'Measurable result e.g. "-15kg in 90 days"' },
          },
          required: ['quote', 'author'],
        },
      },
      format: { type: 'string', enum: carouselFormatIds },
    },
    required: ['testimonials'],
  },
};

tools.canva_tiktok_photo_mode = {
  name: 'canva_tiktok_photo_mode',
  description:
    'Create TikTok Photo Mode carousel (9:16, up to 35 slides). Text in Canva, captions added natively in TikTok.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: { type: 'string' },
      slides: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            slide_index: { type: 'number' },
            headline: { type: 'string', description: 'Max 60 chars for 9:16' },
            body: { type: 'string', description: 'Max 100 chars' },
            cta: { type: 'string' },
          },
        },
      },
      niche: { type: 'string' },
    },
    required: ['title', 'slides'],
  },
};

// ── Visual-Only Tools (no text in Canva) ────────────────────────────────────

tools.canva_create_visual = {
  name: 'canva_create_visual',
  description:
    'Create VISUAL-ONLY Canva design (no text). Text will be added natively in Instagram/TikTok for better SEO. Use for single posts, stories, covers.',
  input_schema: {
    type: 'object' as const,
    properties: {
      format: {
        type: 'string',
        enum: visualFormatIds,
        description:
          'ig-post-square, ig-post-portrait, ig-story, ig-reel-cover, ig-highlight-cover, tk-video-cover, tk-story',
      },
      visual_theme: { type: 'string', description: 'Visual description: colors, mood, subject, style' },
      purpose: {
        type: 'string',
        enum: ['product', 'lifestyle', 'promotional-bg', 'pattern', 'gradient', 'highlight-icon'],
      },
      niche: { type: 'string' },
      color_override: { type: 'array', items: { type: 'string' }, description: 'Hex colors to override brand palette' },
    },
    required: ['format', 'visual_theme', 'purpose'],
  },
};

tools.canva_reel_cover = {
  name: 'canva_reel_cover',
  description:
    'Create visual-only Instagram Reel cover thumbnail. No text — text overlay added natively when uploading the reel.',
  input_schema: {
    type: 'object' as const,
    properties: {
      visual_theme: { type: 'string', description: 'Visual theme/mood for the thumbnail' },
      niche: { type: 'string' },
    },
    required: ['visual_theme'],
  },
};

tools.canva_story_backgrounds = {
  name: 'canva_story_backgrounds',
  description:
    'Create batch of story background visuals (no text). Text stickers added natively. Returns multiple backgrounds for story sequence.',
  input_schema: {
    type: 'object' as const,
    properties: {
      platform: { type: 'string', enum: ['instagram', 'tiktok'] },
      themes: {
        type: 'array',
        items: { type: 'string' },
        description:
          'Visual themes for each background e.g. ["bold red gradient", "minimalist white", "product flat lay"]',
      },
    },
    required: ['platform', 'themes'],
  },
};

tools.canva_highlight_covers = {
  name: 'canva_highlight_covers',
  description: 'Create branded Instagram Highlight cover icon set (circular, 1:1). Category icons, no text.',
  input_schema: {
    type: 'object' as const,
    properties: {
      categories: {
        type: 'array',
        items: { type: 'string' },
        description: 'Highlight categories e.g. ["About", "Products", "Results", "FAQ", "Tips"]',
      },
    },
    required: ['categories'],
  },
};

tools.canva_tiktok_cover = {
  name: 'canva_tiktok_cover',
  description: 'Create visual-only TikTok video cover thumbnail (9:16). No text overlay — added natively in TikTok.',
  input_schema: {
    type: 'object' as const,
    properties: {
      visual_theme: { type: 'string' },
      niche: { type: 'string' },
    },
    required: ['visual_theme'],
  },
};

// ── Design Management Tools ───────────────────────────────────────────────────

tools.canva_list_formats = {
  name: 'canva_list_formats',
  description: 'List all available Instagram/TikTok Canva formats with dimensions, text strategy, and use cases.',
  input_schema: {
    type: 'object' as const,
    properties: {
      platform: { type: 'string', enum: ['instagram', 'tiktok', 'all'] },
      type: { type: 'string', enum: ['carousel', 'visual-only', 'all'] },
    },
  },
};

tools.canva_search_templates = {
  name: 'canva_search_templates',
  description: 'Search Canva brand templates by query. Returns template IDs for use with carousel or visual tools.',
  input_schema: {
    type: 'object' as const,
    properties: {
      query: { type: 'string', description: 'Search query e.g. "fitness carousel dark" or "minimal story background"' },
      limit: { type: 'number', description: 'Max results 1-10' },
    },
    required: ['query'],
  },
};

tools.canva_export_design = {
  name: 'canva_export_design',
  description: 'Export an existing Canva design by ID. Returns download URLs.',
  input_schema: {
    type: 'object' as const,
    properties: {
      design_id: { type: 'string', description: 'Canva design ID (starts with D)' },
      format: { type: 'string', enum: ['png', 'jpg', 'pdf', 'mp4', 'gif'] },
      pages: {
        type: 'array',
        items: { type: 'number' },
        description: 'Page numbers to export (1-based). Omit for all.',
      },
    },
    required: ['design_id', 'format'],
  },
};

tools.canva_get_design = {
  name: 'canva_get_design',
  description: 'Get metadata and URL for an existing Canva design by ID.',
  input_schema: {
    type: 'object' as const,
    properties: {
      design_id: { type: 'string' },
    },
    required: ['design_id'],
  },
};

export const canvaTools = tools;

export const executeCanvaTool = async (
  toolName: string,
  input: Record<string, unknown>,
  brand?: BrandProfile,
): Promise<string> => {
  if (!brand) {
    return JSON.stringify({ ok: false, error: 'Brand profile required' });
  }

  try {
    switch (toolName) {
      case 'canva_create_carousel': {
        const rawSlides = (input.slides as Array<Record<string, unknown>>) || [];
        const slides = rawSlides.map((s, i) => ({
          slideIndex: (s.slide_index as number) || i + 1,
          headline: s.headline as string | undefined,
          subheadline: s.subheadline as string | undefined,
          body: s.body as string | undefined,
          cta: s.cta as string | undefined,
          number: s.number as string | undefined,
          label: s.label as string | undefined,
        }));

        const result = await canvaCarouselEngine.createCarousel(brand, {
          format: (input.format as CanvaFormatId) || 'ig-carousel-square',
          title: (input.title as string) || 'Carousel',
          slides,
          niche: input.niche as NicheCategory | undefined,
          brandTemplateId: input.brand_template_id as string | undefined,
        });

        const format = CANVA_FORMATS[(input.format as CanvaFormatId) || 'ig-carousel-square']!;
        return JSON.stringify({
          ...result,
          format_info: {
            label: format.label,
            dimensions: `${format.width}×${format.height}`,
            text_rule: 'Text in Canva slides',
          },
          seo_note: format.nativeTextNote,
        });
      }

      case 'canva_educational_carousel': {
        const result = await canvaCarouselEngine.buildEducationalCarousel(
          (input.topic as string) || 'Tips',
          (input.tips as string[]) || [],
          (input.niche as NicheCategory) || 'personal-brand',
          brand,
          (input.format as CanvaFormatId) || 'ig-carousel-square',
        );
        return JSON.stringify({ ...result, type: 'educational_carousel' });
      }

      case 'canva_promotional_carousel': {
        const result = await canvaCarouselEngine.buildPromotionalCarousel(
          (input.product_name as string) || 'Product',
          (input.benefits as string[]) || [],
          (input.cta_text as string) || 'Shop now',
          (input.niche as NicheCategory) || 'ecommerce',
          brand,
          (input.format as CanvaFormatId) || 'ig-carousel-square',
        );
        return JSON.stringify({ ...result, type: 'promotional_carousel' });
      }

      case 'canva_testimonial_carousel': {
        const testimonials = ((input.testimonials as Array<Record<string, string>>) || []).map((t) => ({
          quote: t.quote || '',
          author: t.author || '',
          result: t.result,
        }));
        const result = await canvaCarouselEngine.buildTestimonialCarousel(
          testimonials,
          brand,
          (input.format as CanvaFormatId) || 'ig-carousel-square',
        );
        return JSON.stringify({ ...result, type: 'testimonial_carousel' });
      }

      case 'canva_tiktok_photo_mode': {
        const rawSlides = (input.slides as Array<Record<string, unknown>>) || [];
        const slides = rawSlides.map((s, i) => ({
          slideIndex: (s.slide_index as number) || i + 1,
          headline: s.headline as string | undefined,
          body: s.body as string | undefined,
          cta: s.cta as string | undefined,
        }));

        const result = await canvaCarouselEngine.createCarousel(brand, {
          format: 'tk-photo-mode',
          title: (input.title as string) || 'TikTok Photo Mode',
          slides,
          niche: input.niche as NicheCategory | undefined,
        });

        return JSON.stringify({
          ...result,
          type: 'tiktok_photo_mode',
          seo_note: 'Add caption and hashtags natively in TikTok for FYP ranking',
        });
      }

      case 'canva_create_visual': {
        const result = await canvaVisualEngine.createVisual(brand, {
          format: (input.format as CanvaFormatId) || 'ig-post-square',
          visualTheme: (input.visual_theme as string) || '',
          purpose: (input.purpose as 'product') || 'product',
          niche: input.niche as NicheCategory | undefined,
          colorOverride: input.color_override as string[] | undefined,
        });

        const format = CANVA_FORMATS[(input.format as CanvaFormatId) || 'ig-post-square']!;
        return JSON.stringify({
          ...result,
          format_info: { label: format.label, dimensions: `${format.width}×${format.height}` },
          seo_note: format.nativeTextNote,
          text_rule: 'NO text in this design — add natively on platform for SEO',
        });
      }

      case 'canva_reel_cover': {
        const result = await canvaVisualEngine.createReelCover(
          brand,
          (input.visual_theme as string) || 'bold gym thumbnail',
          (input.niche as NicheCategory) || 'fitness-products',
        );
        return JSON.stringify({ ...result, seo_note: 'Add text overlay natively when uploading reel to Instagram' });
      }

      case 'canva_story_backgrounds': {
        const themes = (input.themes as string[]) || ['bold gradient'];
        const platform = (input.platform as 'instagram' | 'tiktok') || 'instagram';
        const results = await canvaVisualEngine.createStoryBackgroundBatch(brand, themes, platform);
        return JSON.stringify({
          ok: results.every((r) => r.ok),
          count: results.length,
          designs: results,
          seo_note: 'Add all text stickers, polls, links natively in the story editor',
        });
      }

      case 'canva_highlight_covers': {
        const categories = (input.categories as string[]) || ['About', 'Products', 'FAQ'];
        const results = await canvaVisualEngine.createHighlightCoverSet(brand, categories);
        return JSON.stringify({
          ok: results.every((r) => r.ok),
          count: results.length,
          categories,
          designs: results,
        });
      }

      case 'canva_tiktok_cover': {
        const result = await canvaVisualEngine.createTikTokCover(
          brand,
          (input.visual_theme as string) || 'bold TikTok thumbnail',
          (input.niche as NicheCategory) || 'personal-brand',
        );
        return JSON.stringify({ ...result, seo_note: 'Add text overlay natively in TikTok video cover editor' });
      }

      case 'canva_list_formats': {
        const platform = (input.platform as string) || 'all';
        const type = (input.type as string) || 'all';

        const allFormats = Object.values(CANVA_FORMATS);
        const filtered = allFormats.filter((f) => {
          const platformMatch = platform === 'all' || f.platform === platform || f.platform === 'both';
          const typeMatch =
            type === 'all' || (type === 'carousel' && f.textInCanva) || (type === 'visual-only' && !f.textInCanva);
          return platformMatch && typeMatch;
        });

        return JSON.stringify({
          ok: true,
          count: filtered.length,
          formats: filtered.map((f) => ({
            id: f.id,
            label: f.label,
            platform: f.platform,
            dimensions: `${f.width}×${f.height}`,
            aspect_ratio: f.aspectRatio,
            text_in_canva: f.textInCanva,
            slides: f.maxSlides ? `${f.minSlides ?? 2}-${f.maxSlides}` : '1',
            use_cases: f.useCase,
            seo_note: f.nativeTextNote,
          })),
        });
      }

      case 'canva_search_templates': {
        const result = await searchBrandTemplates({
          query: (input.query as string) || '',
          limit: (input.limit as number) || 5,
        });
        return JSON.stringify({
          ok: result.ok,
          templates: result.templates?.map((t) => ({
            id: t.id,
            title: t.title,
            usage: 'Pass id as brand_template_id in carousel/visual tools',
          })),
        });
      }

      case 'canva_export_design': {
        const result = await exportDesign({
          designId: (input.design_id as string) || '',
          format: (input.format as 'png' | 'jpg' | 'pdf' | 'mp4' | 'gif') || 'jpg',
          quality: 'high',
        });
        return JSON.stringify(result);
      }

      case 'canva_get_design': {
        const result = await getDesign({ designId: (input.design_id as string) || '' });
        return JSON.stringify(result);
      }

      default:
        return JSON.stringify({ ok: false, error: `Unknown Canva tool: ${toolName}` });
    }
  } catch (error) {
    return JSON.stringify({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
