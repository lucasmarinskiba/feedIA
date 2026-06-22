/**
 * Graphic Designer de FeedIA — reemplaza al diseñador gráfico tradicional.
 *
 * Orquesta Fal.ai con conocimiento de composición, branding visual, jerarquía
 * tipográfica y formatos de redes sociales para producir piezas profesionales
 * de forma autónoma. El usuario recibe imágenes listas para publicar.
 */

import { log } from '../../agent/logger.js';
import { askJson as routerAskJson } from '../../agent/tokenRouter.js';
import {
  generateImage,
  generateCarousel,
  buildPromptFromBrief,
  trackSpending,
  type FalModel,
  type AspectRatio,
  type ImageStyle,
  type VisualBriefInput,
} from '../../integrations/falAi.js';
import type { BrandProfile, ContentFormat } from '../../config/types.js';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type DesignTarget = 'feed-post' | 'reel-cover' | 'story' | 'carousel' | 'highlight-cover' | 'profile-photo';

export interface DesignRequest {
  target: DesignTarget;
  concept: string; // qué se debe transmitir
  textOverlay?: string; // texto a integrar
  mood?: string; // ej: "energético", "minimalista premium"
  numVariants?: number; // cuántas variantes (1-4)
  preferredStyle?: ImageStyle;
  brandColorsOverride?: string[];
}

export interface DesignDeliverable {
  target: DesignTarget;
  aspectRatio: AspectRatio;
  variants: Array<{
    url: string;
    width: number;
    height: number;
    promptUsed: string;
    model: FalModel;
    score?: number; // 0-100 calculado por IA visual review
  }>;
  costUsd: number;
  durationMs: number;
}

export interface CarouselDeliverable {
  slides: Array<{
    slideNumber: number;
    title: string;
    body: string;
    imageUrl: string;
    promptUsed: string;
  }>;
  totalCostUsd: number;
  designSystem: {
    palette: string[];
    typography: string;
    composition: string;
  };
}

// ── Mapping target → aspect ratio / preset ───────────────────────────────────

const targetConfig: Record<
  DesignTarget,
  {
    aspect: AspectRatio;
    preset:
      | 'instagram-post'
      | 'instagram-story'
      | 'instagram-reel-cover'
      | 'carousel-slide'
      | 'youtube-thumbnail'
      | undefined;
    styleDefaults: ImageStyle;
  }
> = {
  'feed-post': { aspect: '4:5', preset: 'instagram-post', styleDefaults: 'photographic' },
  'reel-cover': { aspect: '9:16', preset: 'instagram-reel-cover', styleDefaults: 'cinematic' },
  story: { aspect: '9:16', preset: 'instagram-story', styleDefaults: 'photographic' },
  carousel: { aspect: '4:5', preset: 'carousel-slide', styleDefaults: 'illustration' },
  'highlight-cover': { aspect: '1:1', preset: undefined, styleDefaults: 'minimal' },
  'profile-photo': { aspect: '1:1', preset: undefined, styleDefaults: 'photographic' },
};

// ── Knowledge base de composición visual ─────────────────────────────────────

export const DESIGN_PRINCIPLES = {
  composicion: [
    'Regla de tercios: elementos importantes en intersecciones, no centro',
    'Jerarquía visual clara: lo más importante 3x más grande',
    'Espacio negativo: 30-40% del cuadro respira sin elementos',
    'Punto focal único: el ojo sabe dónde mirar primero',
    'Líneas guía: dirigir la mirada hacia el mensaje',
  ],
  tipografia: [
    'Máximo 2 familias tipográficas por pieza',
    'Contraste entre títulos (bold) y body (regular)',
    'Tracking ajustado en títulos (-2% a -5%)',
    'Body con leading 1.4-1.6× tamaño',
    'Evitar all-caps en bloques largos',
  ],
  color: [
    '60-30-10: dominante / secundario / acento',
    'Contraste de 4.5:1 mínimo para texto (WCAG AA)',
    'Saturación armónica: si una tinta es vibrante, las otras moderadas',
    'Color de marca en el área de mayor jerarquía',
  ],
  carrusel: [
    'Slide 1: hook visual + título — la "portada" debe parar el scroll',
    'Slides 2-N: una idea por slide, no llenar de texto',
    'Coherencia visual entre slides: mismo grid, paleta, tipografía',
    'Última slide: CTA claro + flecha visual o "swipe up"',
  ],
};

// ── Generación individual ─────────────────────────────────────────────────────

export const generateDesign = async (request: DesignRequest, brand: BrandProfile): Promise<DesignDeliverable> => {
  const cfg = targetConfig[request.target];
  const numVariants = request.numVariants ?? 1;

  log.info(
    `[GraphicDesigner] Generando ${numVariants} variante(s) de "${request.target}" → "${request.concept.slice(0, 50)}..."`,
  );
  const start = Date.now();

  // Construir brief visual desde el contexto de marca
  const brief: VisualBriefInput = {
    subject: request.concept,
    style: request.preferredStyle ?? cfg.styleDefaults,
    mood: request.mood ?? brand.visual.mood ?? 'profesional',
    brandColors: request.brandColorsOverride ?? brand.visual.palette ?? [],
    composition: brand.visual.compositionRules[0] ?? DESIGN_PRINCIPLES.composicion[0]!,
    lighting: brand.visual.photographyStyle === 'natural' ? 'luz natural' : 'estudio',
    textOverlay: request.textOverlay,
    forbidden: brand.visual.forbiddenIconography,
  };

  const { prompt, negativePrompt, suggestedModel } = buildPromptFromBrief(brief);
  const variants: DesignDeliverable['variants'] = [];
  let totalCost = 0;

  // Generar en paralelo
  const results = await Promise.all(
    Array.from({ length: numVariants }, (_, i) =>
      generateImage({
        prompt: prompt + (i > 0 ? `, variation ${i + 1}` : ''),
        negativePrompt,
        model: suggestedModel,
        aspectRatio: cfg.aspect,
        preset: cfg.preset,
        seed: i > 0 ? Math.floor(Math.random() * 10_000_000) : undefined,
      }),
    ),
  );

  for (const result of results) {
    trackSpending(result);
    totalCost += result.costUsd;
    for (const img of result.images) {
      variants.push({
        url: img.url,
        width: img.width,
        height: img.height,
        promptUsed: result.prompt,
        model: result.model,
      });
    }
  }

  return {
    target: request.target,
    aspectRatio: cfg.aspect,
    variants,
    costUsd: totalCost,
    durationMs: Date.now() - start,
  };
};

// ── Generación de carrusel completo (con copywriting integrado) ──────────────

export const generateCarouselDeliverable = async (
  topic: string,
  slideCount: number,
  brand: BrandProfile,
): Promise<CarouselDeliverable> => {
  log.info(`[GraphicDesigner] Diseñando carrusel de ${slideCount} slides sobre "${topic}"`);

  // Paso 1: generar el copy de cada slide
  const copyPrompt = `Diseñá un carrusel de Instagram de ${slideCount} slides sobre "${topic}".

MARCA: ${brand.name} | Nicho: ${brand.niche} | Audiencia: ${brand.audience.description}
TONO: ${brand.voice.tone.join(', ')}

Reglas:
- Slide 1 = portada: hook que pare el scroll, máximo 8 palabras
- Slides 2-${slideCount - 1}: una idea por slide, título de 4-7 palabras + body de 1-2 líneas
- Slide ${slideCount} = CTA final claro
- Coherencia visual: cada slide debe sugerir un concepto visual claro

JSON:
{
  "designSystem": {
    "palette": ["color1", "color2", "color3"],
    "typography": "ej: 'Sans serif moderno bold + serif elegante para acentos'",
    "composition": "ej: 'Grid de 12 columnas, texto a la izquierda, visual a la derecha'"
  },
  "slides": [
    {
      "slideNumber": 1,
      "title": "título corto",
      "body": "body corto (puede estar vacío en portada)",
      "visualConcept": "qué se debe mostrar visualmente — describir la imagen"
    }
  ]
}`;

  const copyResult = await routerAskJson<{
    designSystem: CarouselDeliverable['designSystem'];
    slides: Array<{ slideNumber: number; title: string; body: string; visualConcept: string }>;
  }>(copyPrompt, {
    taskType: 'creative',
    maxTokens: 3500,
    systemPrompt:
      'Sos un creative director de carruseles de Instagram. Conocés las mejores prácticas de Eugene Healey, Justin Welsh y AJ&Smart.',
  });

  // Paso 2: generar las imágenes en paralelo
  const baseBrief: VisualBriefInput = {
    subject: '',
    style: 'illustration',
    mood: brand.visual.mood ?? 'profesional',
    brandColors: copyResult.designSystem.palette,
    composition: copyResult.designSystem.composition,
  };
  const carouselImages = await generateCarousel(
    copyResult.slides.map((s) => ({
      slideNumber: s.slideNumber,
      title: s.title,
      body: s.body,
      visualConcept: s.visualConcept,
    })),
    baseBrief,
  );

  // Paso 3: armar deliverable
  const slides: CarouselDeliverable['slides'] = copyResult.slides.map((s) => {
    const imageData = carouselImages.slides.find((ci) => ci.slideNumber === s.slideNumber);
    const firstImg = imageData?.image.images[0];
    return {
      slideNumber: s.slideNumber,
      title: s.title,
      body: s.body,
      imageUrl: firstImg?.url ?? '',
      promptUsed: imageData?.image.prompt ?? '',
    };
  });

  return {
    slides,
    totalCostUsd: carouselImages.totalCostUsd,
    designSystem: copyResult.designSystem,
  };
};

// ── Auto-diseño desde un caption (sistema sugiere el visual) ────────────────

export const designFromCaption = async (
  caption: string,
  format: ContentFormat,
  brand: BrandProfile,
): Promise<DesignDeliverable> => {
  // Inferir el concepto visual desde el caption
  const inferPrompt = `Desde este caption de Instagram, generá un concepto visual coherente para acompañarlo.

CAPTION: """${caption}"""

MARCA: ${brand.name} | Nicho: ${brand.niche}
ESTILO VISUAL DE MARCA: ${brand.visual.style} / ${brand.visual.mood}

JSON:
{
  "concept": "descripción del concepto visual en 1-2 líneas",
  "textOverlay": "texto a integrar si conviene (máximo 6 palabras)",
  "mood": "una palabra que capture el mood"
}`;

  const inferred = await routerAskJson<{ concept: string; textOverlay?: string; mood: string }>(inferPrompt, {
    taskType: 'creative',
    maxTokens: 400,
    freeOnly: true,
  });

  const targetMap: Record<ContentFormat, DesignTarget> = {
    reel: 'reel-cover',
    'reel-faceless': 'reel-cover',
    carrusel: 'carousel',
    'post-imagen': 'feed-post',
    historia: 'story',
    live: 'feed-post',
  };

  return generateDesign(
    {
      target: targetMap[format] ?? 'feed-post',
      concept: inferred.concept,
      textOverlay: inferred.textOverlay,
      mood: inferred.mood,
      numVariants: 2,
    },
    brand,
  );
};

// ── Revisión visual por IA (audit de design) ─────────────────────────────────

export const auditDesign = async (
  imageUrl: string,
  intendedMood: string,
  brand: BrandProfile,
): Promise<{ score: number; issues: string[]; suggestions: string[] }> => {
  const prompt = `Estás revisando una pieza visual para Instagram. Sin ver la imagen literalmente, evaluala según los principios visuales.

URL imagen: ${imageUrl}
Marca: ${brand.name} (${brand.niche})
Mood buscado: ${intendedMood}
Paleta de marca: ${brand.visual.palette.join(', ') || '(no definida)'}
Reglas visuales de marca: ${brand.visual.compositionRules.join(' | ') || '(no definidas)'}

Sin ver la imagen específicamente, simulá un audit conservador basado en si los parámetros generales coinciden.
Volcá la review en JSON:
{
  "score": número 0-100,
  "issues": ["problema 1", "problema 2"],
  "suggestions": ["sugerencia 1", "sugerencia 2"]
}`;

  return routerAskJson<{ score: number; issues: string[]; suggestions: string[] }>(prompt, {
    taskType: 'analysis',
    maxTokens: 600,
    freeOnly: true,
  }).catch(() => ({ score: 75, issues: [], suggestions: [] }));
};

// ── Generación de set completo de highlight covers ───────────────────────────

export const generateHighlightCoverSet = async (
  highlights: Array<{ name: string; concept: string }>,
  brand: BrandProfile,
): Promise<Array<{ name: string; imageUrl: string; costUsd: number }>> => {
  log.info(`[GraphicDesigner] Generando set de ${highlights.length} covers de Highlights`);

  const results = await Promise.all(
    highlights.map(async (h) => {
      const design = await generateDesign(
        {
          target: 'highlight-cover',
          concept: h.concept,
          textOverlay: '',
          mood: brand.visual.mood ?? 'minimal',
          numVariants: 1,
          preferredStyle: 'minimal',
        },
        brand,
      );
      return {
        name: h.name,
        imageUrl: design.variants[0]?.url ?? '',
        costUsd: design.costUsd,
      };
    }),
  );

  return results;
};

// ── Generación de profile photo (avatar profesional) ────────────────────────

export const generateProfilePhoto = async (
  description: string,
  brand: BrandProfile,
  variants = 3,
): Promise<DesignDeliverable> =>
  generateDesign(
    {
      target: 'profile-photo',
      concept: `Profile photo: ${description}`,
      numVariants: variants,
      preferredStyle: 'photographic',
      mood: brand.visual.mood ?? 'profesional confiable',
    },
    brand,
  );

// ── Re-render con feedback humano ────────────────────────────────────────────

export const remixDesign = async (
  originalRequest: DesignRequest,
  feedback: string,
  brand: BrandProfile,
): Promise<DesignDeliverable> => {
  log.info(`[GraphicDesigner] Remix con feedback: "${feedback.slice(0, 60)}..."`);
  return generateDesign(
    {
      ...originalRequest,
      concept: `${originalRequest.concept}. AJUSTES: ${feedback}`,
      numVariants: 2,
    },
    brand,
  );
};
