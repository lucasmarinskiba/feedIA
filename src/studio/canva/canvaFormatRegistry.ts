/**
 * Canva Format Registry
 * All Instagram + TikTok formats with dimensions, text strategy, and template hints
 *
 * TEXT RULE:
 *   textInCanva: true  → Canva bakes in titles, body, CTAs (carousel slides, photo mode)
 *   textInCanva: false → Visual only from Canva; text added natively on the platform (better SEO)
 */

export type CanvaPlatform = 'instagram' | 'tiktok' | 'both';
export type CanvaFormatId =
  | 'ig-carousel-square'
  | 'ig-carousel-portrait'
  | 'ig-post-square'
  | 'ig-post-portrait'
  | 'ig-story'
  | 'ig-reel-cover'
  | 'ig-highlight-cover'
  | 'tk-photo-mode'
  | 'tk-video-cover'
  | 'tk-story';

export interface CanvaFormat {
  id: CanvaFormatId;
  label: string;
  platform: CanvaPlatform;
  width: number;
  height: number;
  aspectRatio: string;
  maxSlides?: number;
  minSlides?: number;
  textInCanva: boolean;
  textInCanvaReason: string;
  nativeTextNote: string;
  canvaDesignType: string;
  exportFormat: 'png' | 'jpg';
  exportQuality: 'regular' | 'pro';
  useCase: string[];
}

export const CANVA_FORMATS: Record<CanvaFormatId, CanvaFormat> = {
  // ── Instagram Carousels ────────────────────────────────────────────────────
  'ig-carousel-square': {
    id: 'ig-carousel-square',
    label: 'Instagram Carousel (1:1)',
    platform: 'instagram',
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
    minSlides: 2,
    maxSlides: 10,
    textInCanva: true,
    textInCanvaReason: 'Carousel slides require in-design text; each slide tells part of the story visually',
    nativeTextNote: 'Add caption and hashtags natively for SEO',
    canvaDesignType: 'presentation',
    exportFormat: 'jpg',
    exportQuality: 'pro',
    useCase: [
      'educational content',
      'step-by-step guides',
      'product showcases',
      'before/after comparisons',
      'quote series',
    ],
  },
  'ig-carousel-portrait': {
    id: 'ig-carousel-portrait',
    label: 'Instagram Carousel (4:5)',
    platform: 'instagram',
    width: 1080,
    height: 1350,
    aspectRatio: '4:5',
    minSlides: 2,
    maxSlides: 10,
    textInCanva: true,
    textInCanvaReason: 'Portrait carousel maximizes screen space; in-design text required for slide narrative',
    nativeTextNote: 'Add caption and hashtags natively for SEO',
    canvaDesignType: 'presentation',
    exportFormat: 'jpg',
    exportQuality: 'pro',
    useCase: ['listicles', 'tutorials', 'testimonials', 'fact series'],
  },

  // ── Instagram Single Posts ─────────────────────────────────────────────────
  'ig-post-square': {
    id: 'ig-post-square',
    label: 'Instagram Post (1:1)',
    platform: 'instagram',
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
    textInCanva: false,
    textInCanvaReason: 'Single posts: visual-only from Canva',
    nativeTextNote: 'Add all text (headline, body, CTA, hashtags) natively in Instagram for better search SEO',
    canvaDesignType: 'instagram_post',
    exportFormat: 'jpg',
    exportQuality: 'pro',
    useCase: ['product photos', 'branded visuals', 'announcement backgrounds', 'lifestyle imagery'],
  },
  'ig-post-portrait': {
    id: 'ig-post-portrait',
    label: 'Instagram Post (4:5)',
    platform: 'instagram',
    width: 1080,
    height: 1350,
    aspectRatio: '4:5',
    textInCanva: false,
    textInCanvaReason: 'Single posts: visual-only from Canva',
    nativeTextNote: 'Add all text natively in Instagram for better search SEO',
    canvaDesignType: 'instagram_post',
    exportFormat: 'jpg',
    exportQuality: 'pro',
    useCase: ['portrait product shots', 'person-focused visuals', 'promotional backgrounds'],
  },

  // ── Instagram Stories ──────────────────────────────────────────────────────
  'ig-story': {
    id: 'ig-story',
    label: 'Instagram Story (9:16)',
    platform: 'instagram',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    textInCanva: false,
    textInCanvaReason: 'Stories: visual background from Canva',
    nativeTextNote:
      'Add text stickers, polls, links, and CTAs natively in the Instagram Story editor for tap-through SEO',
    canvaDesignType: 'your_story',
    exportFormat: 'jpg',
    exportQuality: 'pro',
    useCase: ['product backgrounds', 'promotional backdrops', 'swipe-up visuals', 'highlight covers source'],
  },

  // ── Instagram Reel Cover ───────────────────────────────────────────────────
  'ig-reel-cover': {
    id: 'ig-reel-cover',
    label: 'Instagram Reel Cover (9:16)',
    platform: 'instagram',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    textInCanva: false,
    textInCanvaReason: 'Reel cover: visual thumbnail only',
    nativeTextNote: 'Add text overlay natively when uploading reel; caption and hashtags for SEO',
    canvaDesignType: 'your_story',
    exportFormat: 'jpg',
    exportQuality: 'pro',
    useCase: ['reel thumbnails', 'viral hook visuals', 'before/after reveal covers'],
  },

  // ── Instagram Highlight Cover ──────────────────────────────────────────────
  'ig-highlight-cover': {
    id: 'ig-highlight-cover',
    label: 'Instagram Highlight Cover (1:1)',
    platform: 'instagram',
    width: 1080,
    height: 1080,
    aspectRatio: '1:1',
    textInCanva: false,
    textInCanvaReason: 'Highlight covers are pure icons/visuals',
    nativeTextNote: 'Highlight name is set natively in Instagram',
    canvaDesignType: 'instagram_post',
    exportFormat: 'png',
    exportQuality: 'pro',
    useCase: ['branded icon sets', 'service category icons', 'highlight folder visuals'],
  },

  // ── TikTok Photo Mode ──────────────────────────────────────────────────────
  'tk-photo-mode': {
    id: 'tk-photo-mode',
    label: 'TikTok Photo Mode (9:16)',
    platform: 'tiktok',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    minSlides: 2,
    maxSlides: 35,
    textInCanva: true,
    textInCanvaReason: 'TikTok Photo Mode carousels require visual slide text; narrative must be in the image',
    nativeTextNote: 'Add video caption and hashtags natively in TikTok for FYP SEO',
    canvaDesignType: 'presentation',
    exportFormat: 'jpg',
    exportQuality: 'pro',
    useCase: ['educational series', 'product showcase', 'step-by-step', 'quotes', 'tips & tricks'],
  },

  // ── TikTok Video Cover ─────────────────────────────────────────────────────
  'tk-video-cover': {
    id: 'tk-video-cover',
    label: 'TikTok Video Cover (9:16)',
    platform: 'tiktok',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    textInCanva: false,
    textInCanvaReason: 'Video covers: visual thumbnail only',
    nativeTextNote: 'TikTok adds cover text overlay natively; caption and hashtags for FYP ranking',
    canvaDesignType: 'your_story',
    exportFormat: 'jpg',
    exportQuality: 'pro',
    useCase: ['viral hook thumbnails', 'product close-ups', 'face/reaction shots'],
  },

  // ── TikTok Story ───────────────────────────────────────────────────────────
  'tk-story': {
    id: 'tk-story',
    label: 'TikTok Story (9:16)',
    platform: 'tiktok',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    textInCanva: false,
    textInCanvaReason: 'TikTok Stories: visual background only',
    nativeTextNote: 'Add all text, stickers, and CTAs natively in TikTok Story editor',
    canvaDesignType: 'your_story',
    exportFormat: 'jpg',
    exportQuality: 'pro',
    useCase: ['promotional backgrounds', 'product teasers'],
  },
};

// Helper lookups
export const getCarouselFormats = (): CanvaFormat[] =>
  Object.values(CANVA_FORMATS).filter((f) => f.textInCanva && f.maxSlides);

export const getVisualOnlyFormats = (): CanvaFormat[] => Object.values(CANVA_FORMATS).filter((f) => !f.textInCanva);

export const getFormatsByPlatform = (platform: CanvaPlatform): CanvaFormat[] =>
  Object.values(CANVA_FORMATS).filter((f) => f.platform === platform || f.platform === 'both');

export const getFormat = (id: CanvaFormatId): CanvaFormat => CANVA_FORMATS[id];

// Slide structure templates for carousels
export interface SlideTemplate {
  slideIndex: number;
  role: 'cover' | 'hook' | 'content' | 'data' | 'quote' | 'cta';
  textElements: {
    id: string;
    role: 'headline' | 'subheadline' | 'body' | 'cta' | 'number' | 'label';
    maxChars: number;
    bold: boolean;
    fontSize: 'large' | 'medium' | 'small';
    position: 'top' | 'center' | 'bottom';
  }[];
}

export const CAROUSEL_SLIDE_STRUCTURES: Record<string, SlideTemplate[]> = {
  // Educational 5-slide carousel
  educational_5: [
    {
      slideIndex: 1,
      role: 'cover',
      textElements: [
        { id: 'headline', role: 'headline', maxChars: 50, bold: true, fontSize: 'large', position: 'center' },
        { id: 'subheadline', role: 'subheadline', maxChars: 80, bold: false, fontSize: 'medium', position: 'bottom' },
      ],
    },
    {
      slideIndex: 2,
      role: 'content',
      textElements: [
        { id: 'number', role: 'number', maxChars: 4, bold: true, fontSize: 'large', position: 'top' },
        { id: 'headline', role: 'headline', maxChars: 60, bold: true, fontSize: 'medium', position: 'center' },
        { id: 'body', role: 'body', maxChars: 120, bold: false, fontSize: 'small', position: 'bottom' },
      ],
    },
    {
      slideIndex: 3,
      role: 'content',
      textElements: [
        { id: 'number', role: 'number', maxChars: 4, bold: true, fontSize: 'large', position: 'top' },
        { id: 'headline', role: 'headline', maxChars: 60, bold: true, fontSize: 'medium', position: 'center' },
        { id: 'body', role: 'body', maxChars: 120, bold: false, fontSize: 'small', position: 'bottom' },
      ],
    },
    {
      slideIndex: 4,
      role: 'content',
      textElements: [
        { id: 'number', role: 'number', maxChars: 4, bold: true, fontSize: 'large', position: 'top' },
        { id: 'headline', role: 'headline', maxChars: 60, bold: true, fontSize: 'medium', position: 'center' },
        { id: 'body', role: 'body', maxChars: 120, bold: false, fontSize: 'small', position: 'bottom' },
      ],
    },
    {
      slideIndex: 5,
      role: 'cta',
      textElements: [
        { id: 'headline', role: 'headline', maxChars: 50, bold: true, fontSize: 'large', position: 'center' },
        { id: 'cta', role: 'cta', maxChars: 60, bold: true, fontSize: 'medium', position: 'bottom' },
      ],
    },
  ],

  // Product showcase 4-slide carousel
  product_4: [
    {
      slideIndex: 1,
      role: 'cover',
      textElements: [
        { id: 'label', role: 'label', maxChars: 30, bold: false, fontSize: 'small', position: 'top' },
        { id: 'headline', role: 'headline', maxChars: 40, bold: true, fontSize: 'large', position: 'center' },
      ],
    },
    {
      slideIndex: 2,
      role: 'content',
      textElements: [
        { id: 'headline', role: 'headline', maxChars: 50, bold: true, fontSize: 'medium', position: 'top' },
        { id: 'body', role: 'body', maxChars: 150, bold: false, fontSize: 'small', position: 'center' },
      ],
    },
    {
      slideIndex: 3,
      role: 'data',
      textElements: [
        { id: 'number', role: 'number', maxChars: 15, bold: true, fontSize: 'large', position: 'center' },
        { id: 'label', role: 'label', maxChars: 40, bold: false, fontSize: 'medium', position: 'bottom' },
      ],
    },
    {
      slideIndex: 4,
      role: 'cta',
      textElements: [
        { id: 'headline', role: 'headline', maxChars: 50, bold: true, fontSize: 'large', position: 'center' },
        { id: 'cta', role: 'cta', maxChars: 50, bold: true, fontSize: 'medium', position: 'bottom' },
      ],
    },
  ],

  // Quote/testimonial 3-slide
  testimonial_3: [
    {
      slideIndex: 1,
      role: 'hook',
      textElements: [
        { id: 'headline', role: 'headline', maxChars: 80, bold: true, fontSize: 'large', position: 'center' },
      ],
    },
    {
      slideIndex: 2,
      role: 'quote',
      textElements: [
        { id: 'body', role: 'body', maxChars: 200, bold: false, fontSize: 'medium', position: 'center' },
        { id: 'label', role: 'label', maxChars: 40, bold: false, fontSize: 'small', position: 'bottom' },
      ],
    },
    {
      slideIndex: 3,
      role: 'cta',
      textElements: [
        { id: 'headline', role: 'headline', maxChars: 60, bold: true, fontSize: 'medium', position: 'center' },
        { id: 'cta', role: 'cta', maxChars: 50, bold: true, fontSize: 'medium', position: 'bottom' },
      ],
    },
  ],
};
