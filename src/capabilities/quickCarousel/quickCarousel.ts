// @ts-nocheck
/**
 * Quick Carousel — Carrusel completo desde un prompt mínimo.
 *
 * Input: { prompt: string } — cualquier descripción libre (incluso 3 palabras)
 * Output: paquete carrusel listo-para-publicar (slides + briefs + caption + hashtags + cover)
 *
 * Pipeline interno (auto):
 *   1. Refinar prompt → tema + ángulo + audiencia (Claude expande contexto)
 *   2. Generar guion N slides (aidaCopywriter.generateCarouselScript)
 *   3. Generar design briefs por slide (canvaDesignSkill.generateCarouselBriefs)
 *   4. Generar caption AIDA + CTA (aidaCopywriter.generateAIDACopy)
 *   5. Humanizar caption (textHumanizer)
 *   6. Investigar hashtags (hashtagScientist.researchHashtags) — pirámide estratégica
 *   7. Componer cover frame
 *   8. Generar instrucciones Canva paso-a-paso
 *
 * Todo paralelizado donde posible. Único punto de entrada para crear carrusel.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import { generateCarouselScript, generateAIDACopy } from '../aidaCopywriter/aidaCopywriter.js';
import { generateCarouselBriefs, getCanvaInstructions, type DesignBrief } from '../canvaSkill/canvaDesignSkill.js';
import { humanizeText } from '../humanizer/textHumanizer.js';
import { researchHashtags, flattenSet, type HashtagResearch } from '../hashtagScientist/deepResearch.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const QC_DIR = path.resolve('data/quick-carousel');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface QuickCarouselPrompt {
  prompt: string; // único campo obligatorio
  slideCount?: number; // default 7 (3-20 IG max)
  formula?: 'AIDA' | 'PAS'; // default AIDA
  tone?: string; // override del tono de marca
  includeData?: Record<string, number | string>; // datos a visualizar (opcional)
  targetAudience?: string; // override de audiencia (opcional)
  goal?: 'educar' | 'vender' | 'inspirar' | 'entretener' | 'viralizar';
  aspectRatio?: '1:1' | '4:5' | '1.91:1'; // 4:5 ideal IG (default), 1:1 cuadrado, 1.91:1 horizontal
}

export interface RefinedBrief {
  refinedTopic: string; // tema concreto extraído del prompt
  angle: string; // ángulo diferenciador
  audience: string; // a quién va
  hook: string; // gancho propuesto
  promise: string; // qué va a aprender el lector
  keyTakeaway: string; // mensaje principal
  goal: NonNullable<QuickCarouselPrompt['goal']>;
}

export interface CarouselSlide {
  slide: number;
  visualText: string;
  designNotes: string;
  wordCount: number;
  designBrief: DesignBrief;
  canvaInstructions: string[];
}

export interface QuickCarouselPackage {
  id: string;
  brandId: string;
  generatedAt: string;
  originalPrompt: string;
  refinedBrief: RefinedBrief;
  slides: CarouselSlide[];
  cover: {
    slideIndex: number;
    text: string;
    designBrief: DesignBrief;
  };
  caption: {
    full: string;
    short: string;
    cta: string;
    formula: 'AIDA' | 'PAS';
    humanScore: number;
  };
  hashtags: {
    flat: string[]; // 25-30 hashtags listos para copiar
    research: HashtagResearch;
  };
  postingRecommendation: {
    bestTime: string;
    bestDay: string;
    reasoning: string;
  };
  estimatedDesignMinutes: number;
  totalProductionMinutes: number;
  readyToPublish: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ensureQCDir = async (): Promise<void> => {
  await fs.mkdir(QC_DIR, { recursive: true });
};

const packagePath = (brandId: string, id: string): string => path.join(QC_DIR, `${brandId}-${id}.json`);

// ── Paso 1: refinar prompt → brief completo ──────────────────────────────────

const refinePrompt = async (brand: BrandProfile, input: QuickCarouselPrompt): Promise<RefinedBrief> => {
  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 800,
    thinking: { type: 'adaptive' },
    system: `Especialista en convertir ideas vagas en briefs accionables para carruseles de Instagram.
Tomas prompts mínimos (a veces 1 palabra) y los conviertes en briefs específicos y conversion-oriented.
Devuelves JSON puro.`,
    messages: [
      {
        role: 'user',
        content: `Refina este prompt en brief completo de carrusel para ${brand.name}:

Industria: ${brand.industryCategory ?? 'general'}
Tono base: ${brand.toneOfVoice ?? 'cercano profesional'}
${input.tone ? `Tono override: ${input.tone}` : ''}
${input.targetAudience ? `Audiencia override: ${input.targetAudience}` : ''}
${input.goal ? `Objetivo: ${input.goal}` : 'Objetivo: deducir del prompt'}

PROMPT DEL USUARIO:
"${input.prompt}"

Devuelve:
{
  "refinedTopic": "tema concreto y específico (no genérico)",
  "angle": "ángulo diferenciador que nadie más está usando",
  "audience": "audiencia específica con dolores claros",
  "hook": "gancho propuesto para slide 1 (máx 10 palabras)",
  "promise": "qué va a aprender/ganar el lector concretamente",
  "keyTakeaway": "mensaje principal en 1 oración",
  "goal": "educar|vender|inspirar|entretener|viralizar"
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      refinedTopic: input.prompt,
      angle: '',
      audience: brand.targetAudience ?? 'audiencia general',
      hook: '',
      promise: '',
      keyTakeaway: input.prompt,
      goal: input.goal ?? 'educar',
    };
  }

  const generated = JSON.parse(jsonMatch[0]) as Partial<RefinedBrief>;
  return {
    refinedTopic: generated.refinedTopic ?? input.prompt,
    angle: generated.angle ?? '',
    audience: generated.audience ?? brand.targetAudience ?? 'audiencia general',
    hook: generated.hook ?? '',
    promise: generated.promise ?? '',
    keyTakeaway: generated.keyTakeaway ?? '',
    goal: (generated.goal ?? input.goal ?? 'educar') as RefinedBrief['goal'],
  };
};

// ── Paso 8: recomendación de horario ─────────────────────────────────────────

const recommendPostingTime = (goal: RefinedBrief['goal']): { bestTime: string; bestDay: string; reasoning: string } => {
  const recs: Record<RefinedBrief['goal'], { bestTime: string; bestDay: string; reasoning: string }> = {
    educar: { bestTime: '12:00', bestDay: 'Martes', reasoning: 'Mediodía martes — pico de consumo educativo' },
    vender: {
      bestTime: '20:00',
      bestDay: 'Jueves',
      reasoning: 'Tarde-noche jueves — ventana pre-fin de semana de decisión',
    },
    inspirar: { bestTime: '08:00', bestDay: 'Lunes', reasoning: 'Mañana lunes — momento de set intenciones semanales' },
    entretener: { bestTime: '21:00', bestDay: 'Viernes', reasoning: 'Noche viernes — modo relax' },
    viralizar: {
      bestTime: '18:00',
      bestDay: 'Miércoles',
      reasoning: 'Miércoles 18h — sweet spot algorítmico mid-week',
    },
  };
  return recs[goal];
};

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Genera carrusel completo desde prompt mínimo.
 *
 * Ejemplo de uso:
 *   await createQuickCarousel(brand, { prompt: "errores comunes al hacer ejercicio" })
 *
 * Pipeline completo en 1 llamada. ~30-60s end-to-end.
 */
export const createQuickCarousel = async (
  brand: BrandProfile,
  input: QuickCarouselPrompt,
): Promise<QuickCarouselPackage> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const id = `qc-${Date.now()}`;
  const slideCount = input.slideCount ?? 7;
  const formula = input.formula ?? 'AIDA';

  log.info('[quickCarousel] starting pipeline', { brandId, id, prompt: input.prompt.slice(0, 60) });

  // ── Paso 1: refinar prompt ─────────────────────────────────────────────────
  const refined = await refinePrompt(brand, input);
  log.info('[quickCarousel] prompt refined', { topic: refined.refinedTopic, angle: refined.angle });

  // ── Paso 2-3-4-5-6: paralelizar lo posible ─────────────────────────────────
  const [slidesScript, captionRaw, hashtagResearch] = await Promise.all([
    // Slides
    generateCarouselScript(
      brand,
      `${refined.refinedTopic}. Ángulo: ${refined.angle}. Audiencia: ${refined.audience}`,
      slideCount,
    ),

    // Caption AIDA
    generateAIDACopy(brand, {
      product: refined.refinedTopic,
      feature: refined.keyTakeaway,
      benefit: refined.promise,
      audience: refined.audience,
      format: 'caption-instagram',
      formula,
      includeCTA: true,
      includeHashtags: false, // hashtags vienen separados de hashtagScientist
      urgency: refined.goal === 'vender' ? 'high' : 'medium',
    }),

    // Hashtags (pirámide estratégica)
    researchHashtags(brand, {
      topic: refined.refinedTopic,
      contentType: `carrusel-${refined.goal}`,
    }).catch((err) => {
      log.warn('[quickCarousel] hashtag research failed, using empty', { err: String(err) });
      return null;
    }),
  ]);

  // ── Paso 5: humanizar caption ──────────────────────────────────────────────
  const humanized = await humanizeText(brand, captionRaw.assembled).catch(() => ({
    humanized: captionRaw.assembled,
    humanScore: 70,
    aiScore: 30,
    original: captionRaw.assembled,
    changes: [],
  }));

  // ── Paso 3 (cont): design briefs por slide ─────────────────────────────────
  const briefs = await generateCarouselBriefs(
    brand,
    slidesScript.map((s) => ({ text: s.visualText, designNotes: s.designNotes })),
  );

  // ── Componer slides con todo el contexto ───────────────────────────────────
  const slides: CarouselSlide[] = slidesScript.map((s, i) => {
    const brief = briefs[i] ?? briefs[0]!;
    return {
      slide: s.slide,
      visualText: s.visualText,
      designNotes: s.designNotes,
      wordCount: s.wordCount,
      designBrief: brief,
      canvaInstructions: getCanvaInstructions(brief),
    };
  });

  // ── Cover frame (slide 0 = cover) ──────────────────────────────────────────
  const coverSlide = slides[0]!;
  const cover = {
    slideIndex: 0,
    text: coverSlide.visualText,
    designBrief: coverSlide.designBrief,
  };

  // ── Hashtags flat list (lista plana lista para copiar) ────────────────────
  const flatHashtags = hashtagResearch ? flattenSet(hashtagResearch.recommendedSet, 28) : [];

  // ── Recomendación de horario ───────────────────────────────────────────────
  const postingRec = recommendPostingTime(refined.goal);

  // ── Estimación de tiempos ──────────────────────────────────────────────────
  const estimatedDesignMinutes = briefs.reduce((sum, b) => sum + b.estimatedDesignMinutes, 0);
  const totalProductionMinutes = estimatedDesignMinutes + 15; // +15 para revisión + publicación

  // ── Package final ──────────────────────────────────────────────────────────
  const pkg: QuickCarouselPackage = {
    id,
    brandId,
    generatedAt: new Date().toISOString(),
    originalPrompt: input.prompt,
    refinedBrief: refined,
    slides,
    cover,
    caption: {
      full: humanized.humanized,
      short: humanized.humanized.split('\n')[0] ?? humanized.humanized.slice(0, 150),
      cta: captionRaw.action,
      formula,
      humanScore: humanized.humanScore,
    },
    hashtags: {
      flat: flatHashtags,
      research: hashtagResearch ?? {
        brandId,
        topic: refined.refinedTopic,
        generatedAt: new Date().toISOString(),
        recommendedSet: {
          id: 'empty',
          brandId,
          name: '',
          description: '',
          contentType: '',
          pyramid: { mega: [], macro: [], medio: [], micro: [], nicho: [] },
          totalCount: 0,
          estimatedReach: 0,
          optimalRotation: [],
          createdAt: '',
          performanceHistory: [],
        },
        variantSets: [],
        competitorHashtags: [],
        trendingNow: [],
        shouldAvoid: [],
      },
    },
    postingRecommendation: postingRec,
    estimatedDesignMinutes,
    totalProductionMinutes,
    readyToPublish: slides.length > 0 && flatHashtags.length > 0 && humanized.humanized.length > 0,
  };

  // ── Persistir ──────────────────────────────────────────────────────────────
  await ensureQCDir();
  await fs.writeFile(packagePath(brandId, id), JSON.stringify(pkg, null, 2), 'utf-8');

  log.info('[quickCarousel] pipeline done', {
    brandId,
    id,
    slideCount: slides.length,
    humanScore: humanized.humanScore,
    readyToPublish: pkg.readyToPublish,
  });

  return pkg;
};

/** Lista carruseles generados. */
export const listQuickCarousels = async (brandId: string, limit = 20): Promise<QuickCarouselPackage[]> => {
  try {
    await ensureQCDir();
    const files = await fs.readdir(QC_DIR);
    const brandFiles = files.filter((f) => f.startsWith(`${brandId}-qc-`)).slice(-limit);
    const pkgs: QuickCarouselPackage[] = [];
    for (const f of brandFiles) {
      const raw = await fs.readFile(path.join(QC_DIR, f), 'utf-8');
      pkgs.push(JSON.parse(raw) as QuickCarouselPackage);
    }
    return pkgs.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));
  } catch {
    return [];
  }
};

/** Carga un carrusel específico por ID. */
export const getQuickCarousel = async (brandId: string, id: string): Promise<QuickCarouselPackage | null> => {
  try {
    return JSON.parse(await fs.readFile(packagePath(brandId, id), 'utf-8')) as QuickCarouselPackage;
  } catch {
    return null;
  }
};

/**
 * Variante: genera 3 carruseles distintos del mismo prompt para A/B testing.
 * Cada variante tiene ángulo y tono distintos.
 */
export const createCarouselVariants = async (
  brand: BrandProfile,
  input: QuickCarouselPrompt,
): Promise<QuickCarouselPackage[]> => {
  log.info('[quickCarousel] generating 3 variants for A/B', { prompt: input.prompt.slice(0, 60) });

  // 3 ángulos distintos del mismo prompt
  const variants = await Promise.all([
    createQuickCarousel(brand, { ...input, formula: 'AIDA', goal: input.goal ?? 'educar' }),
    createQuickCarousel(brand, { ...input, formula: 'PAS', goal: input.goal ?? 'vender' }),
    createQuickCarousel(brand, { ...input, formula: 'AIDA', goal: input.goal ?? 'viralizar' }),
  ]);

  return variants;
};

/**
 * Exporta carrusel como markdown para revisión humana antes de publicar.
 */
export const exportCarouselAsMarkdown = (pkg: QuickCarouselPackage): string => {
  return `# Carrusel: ${pkg.refinedBrief.refinedTopic}

**Prompt original:** "${pkg.originalPrompt}"
**Ángulo:** ${pkg.refinedBrief.angle}
**Audiencia:** ${pkg.refinedBrief.audience}
**Objetivo:** ${pkg.refinedBrief.goal}

## Slides

${pkg.slides
  .map(
    (s) => `### Slide ${s.slide}
**Texto:** ${s.visualText}
**Diseño:** ${s.designNotes}
**Brief visual:** ${s.designBrief.imageDirection}
**Paleta:** ${s.designBrief.colorPalette.primary} / ${s.designBrief.colorPalette.accent}
`,
  )
  .join('\n')}

## Caption

${pkg.caption.full}

## CTA
${pkg.caption.cta}

## Hashtags (${pkg.hashtags.flat.length})

${pkg.hashtags.flat.join(' ')}

## Recomendación de publicación

- **Mejor horario:** ${pkg.postingRecommendation.bestDay} a las ${pkg.postingRecommendation.bestTime}
- **Razón:** ${pkg.postingRecommendation.reasoning}

## Producción

- Tiempo de diseño estimado: ${pkg.estimatedDesignMinutes} minutos
- Tiempo total: ${pkg.totalProductionMinutes} minutos
- Listo para publicar: ${pkg.readyToPublish ? '✅' : '⚠️ requiere ajustes'}
- Human score del caption: ${pkg.caption.humanScore}/100

---
*Generado por FeedIA QuickCarousel · ${pkg.generatedAt}*`;
};
