/**
 * Auto Create — generación de una pieza (carrusel/reel/historia) de punta a
 * punta: copy branded -> render -> QA estética/safety -> predicción ->
 * publicación opcional. Es el núcleo compartido detrás de "Manos Libres"
 * (voz) y "Piloto automático" (Brújula): ambos front-ends ya mandaban a
 * endpoints que no existían — este módulo es lo que esos endpoints llaman.
 *
 * Todo brand-aware: createCarrusel/createReel/createStorySequence ya leen
 * brand.visual (paleta, tipografía, mood, foto protagonista, elementos
 * visuales) vía brandContext() — ver src/agent/memory.ts.
 */
import { env } from '../../config/index.js';
import { log as appLog } from '../../agent/logger.js';
import type { BrandProfile, ContentFormat } from '../../config/types.js';
import { createCarrusel } from './carrusel.js';
import { createReel } from './reel.js';
import { createStorySequence } from './stories.js';
import {
  renderCarruselSlideSvg,
  renderStoryFrameSvg,
  renderReelStoryboardSvg,
  renderCarruselSlidePng,
  svgToDataUrl,
} from '../render/index.js';
import { scoreAesthetic, type DesignProposal, type AestheticScore } from '../aesthetic/aestheticScorer.js';
import { auditarPrePublicacion } from '../safety/index.js';
import type { SafetyReport } from '../safety/auditor.js';
import { predecirPerformance } from '../predictor/index.js';
import type { PerformancePrediction } from '../predictor/performance.js';
import { uploadToSocial } from '../../integrations/uploadPost.js';

export type AutoCreateFormat = 'carousel' | 'reel' | 'historia';

export interface AutoCreateSlide {
  n: number;
  role: string;
  dataUrl: string;
}

export interface AutoCreateContent {
  angle?: string;
  hook: string;
  caption: string;
  hashtags: string[];
}

export interface AutoCreateResult {
  format: AutoCreateFormat;
  content: AutoCreateContent;
  slides: AutoCreateSlide[];
  aesthetic: AestheticScore;
  safety: SafetyReport;
  prediction: PerformancePrediction;
  publish?: { ok: boolean; mediaId?: string };
  status: 'published' | 'queued' | 'held' | 'ready-for-review';
  note: string;
  log: string[];
}

export interface AutoCreateOptions {
  format?: AutoCreateFormat;
  autoPublish?: boolean;
}

const FORMAT_TO_CONTENT_FORMAT: Record<AutoCreateFormat, ContentFormat> = {
  carousel: 'carrusel',
  reel: 'reel',
  historia: 'historia',
};

export const runAutoCreate = async (
  brand: BrandProfile,
  topic: string,
  opts: AutoCreateOptions = {},
): Promise<AutoCreateResult> => {
  const format = opts.format ?? 'carousel';
  const log: string[] = [`Generando ${format} sobre "${topic.slice(0, 80)}"…`];

  let content: AutoCreateContent;
  let slides: AutoCreateSlide[];
  let pngDataUris: string[] | null = null; // sólo carrusel: necesario para publicar de verdad

  if (format === 'reel') {
    const reel = await createReel(brand, topic, 30);
    content = { hook: reel.hookVisual, caption: reel.caption, hashtags: reel.hashtags };
    slides = renderReelStoryboardSvg(reel.beats, brand).map((svg, i) => ({
      n: i + 1,
      role: 'beat',
      dataUrl: svgToDataUrl(svg),
    }));
  } else if (format === 'historia') {
    const story = await createStorySequence(brand, topic, 5);
    content = { hook: story.slides[0]?.textoPrincipal ?? '', caption: story.notas, hashtags: [] };
    slides = story.slides.map((s) => ({
      n: s.orden,
      role: s.tipo,
      dataUrl: svgToDataUrl(renderStoryFrameSvg(s, brand)),
    }));
  } else {
    const carrusel = await createCarrusel(brand, topic, 'medio');
    content = {
      angle: carrusel.notasDiseno,
      hook: carrusel.slides[0]?.titulo ?? '',
      caption: carrusel.caption,
      hashtags: carrusel.hashtags,
    };
    slides = carrusel.slides.map((s) => ({
      n: s.numero,
      role: s.rolEnNarrativa,
      dataUrl: svgToDataUrl(renderCarruselSlideSvg(s, brand, carrusel.slides.length)),
    }));
    pngDataUris = carrusel.slides.map((s) => renderCarruselSlidePng(s, brand, carrusel.slides.length).dataUri);
  }
  log.push(`✓ ${slides.length} pieza(s) generadas.`);

  const proposal: DesignProposal = {
    title: content.hook,
    format,
    colorsUsed: brand.visual.palette,
    fontsUsed: brand.visual.typography,
    textBlocks: slides.length,
    imageBlocks: slides.length,
    densityEstimate: brand.visual.density,
    description: `${brand.visual.style} ${brand.visual.mood}`.trim(),
  };
  const aesthetic = scoreAesthetic(brand, proposal);
  log.push(`✓ Estética: ${aesthetic.total}/100.`);

  const safety = await auditarPrePublicacion(brand, { caption: content.caption, hooks: [content.hook] });
  log.push(`✓ Safety: ${safety.veredicto}.`);

  const prediction = await predecirPerformance(brand, {
    format: FORMAT_TO_CONTENT_FORMAT[format],
    hook: content.hook,
    caption: content.caption,
    hashtagsCount: content.hashtags.length,
  });
  log.push(`✓ Predicción: score ${prediction.scoreGeneral}/100, riesgo de flop ${prediction.riesgoFlop}.`);

  const passesQA = aesthetic.total >= 60 && safety.veredicto !== 'bloqueado';
  let publish: { ok: boolean; mediaId?: string } | undefined;
  let status: AutoCreateResult['status'] = 'ready-for-review';
  let note = 'Generado y validado. Revisá antes de publicar.';

  if (!passesQA) {
    status = 'held';
    note = `Retenido para revisión: estética ${aesthetic.total}/100${safety.veredicto === 'bloqueado' ? ', safety bloqueó el contenido' : ''}.`;
  } else if (opts.autoPublish) {
    if (format !== 'carousel' || !pngDataUris) {
      note = 'Auto-publicar todavía sólo está disponible para carruseles. Revisá y publicá esta pieza manualmente.';
    } else {
      try {
        const up = await uploadToSocial({
          platforms: ['instagram'],
          mediaType: 'carousel',
          mediaUrls: pngDataUris,
          caption: content.caption,
          hashtags: content.hashtags,
        });
        const igRes = up.perPlatformResults.find((r) => r.platform === 'instagram');
        if (up.ok && (igRes?.status === 'posted' || igRes?.status === 'queued' || igRes?.status === 'scheduled')) {
          status = env.dryRun ? 'queued' : 'published';
          publish = { ok: true, mediaId: igRes?.socialPostId };
          note = env.dryRun ? 'DRY_RUN: validado; publicación simulada.' : `Publicado en Instagram (${igRes?.status}).`;
        } else {
          publish = { ok: false };
          note = `Validado, pero la publicación no se confirmó: ${up.errors.join('; ') || 'sin credenciales configuradas'}.`;
        }
      } catch (err) {
        publish = { ok: false };
        note = `Validado, pero falló la publicación: ${(err as Error).message}`;
        appLog.error(`[autoCreate] publish falló: ${(err as Error).message}`);
      }
    }
  }
  log.push(`✓ ${note}`);

  return { format, content, slides, aesthetic, safety, prediction, publish, status, note, log };
};
