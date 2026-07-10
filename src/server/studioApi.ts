/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { createCarrusel } from '../capabilities/content/carrusel.js';
import { createReel } from '../capabilities/content/reel.js';
import { createStorySequence } from '../capabilities/content/stories.js';
import { createCaption } from '../capabilities/content/caption.js';
import { createFacelessTriple } from '../capabilities/content/faceless.js';
import {
  renderCarruselToCanva,
  renderReelToCanva,
  renderStorySequenceToCanva,
} from '../capabilities/content/canvaRender.js';
import { generateHooks } from '../capabilities/copywriting/hooks.js';
import { optimizeForRetention } from '../capabilities/copywriting/retencion.js';
import { investigarHashtags } from '../capabilities/hashtags/research.js';
import { auditarPrePublicacion } from '../capabilities/safety/index.js';
import {
  analizarImagen,
  captionDesdeImagen,
  generarAltText,
  type VisionMediaSource,
} from '../capabilities/vision/index.js';
import { predecirPerformance } from '../capabilities/predictor/index.js';
import {
  renderCarruselSlideSvg,
  renderStoryFrameSvg,
  renderReelStoryboardSvg,
  svgToDataUrl,
} from '../capabilities/render/index.js';
import { routeImageGen } from '../services/provider-router.js';
import type { BrandProfile, ContentFormat } from '../config/types.js';
import { json, type RouteDefinition } from './http.js';

interface CarruselBody {
  idea: string;
  longitud?: 'corto' | 'medio' | 'largo';
}
interface ReelBody {
  tema: string;
  duracion?: 15 | 20 | 30 | 45 | 60;
  estilo?: string; // accepted but forwarded as context only
}
interface StoriesBody {
  evento?: string;
  mensaje?: string; // alias for evento (frontend uses this)
  objetivo?: string;
  cantidad?: number;
  cantidadFrames?: number; // alias for cantidad (frontend uses this)
}
interface VisionUnifiedBody {
  imageData: string; // base64 data URL or http URL
  analisis?: boolean;
  caption?: boolean;
  altText?: boolean;
  hashtags?: boolean;
}
interface PredictorFrontendBody {
  formato: string;
  caption: string;
  hashtags?: string[];
  hora?: number;
  dia?: string;
}
interface CaptionBody {
  contexto: string;
  formato: 'reel' | 'carrusel' | 'post-imagen' | 'historia';
}
interface FacelessBody {
  idea: string;
  objetivo?: string;
}
interface HooksBody {
  idea: string;
}
interface RetencionBody {
  contenido: string;
}
interface VisionAnalyzeBody {
  source: VisionMediaSource;
}
interface VisionCaptionBody {
  source: VisionMediaSource;
  contexto?: string;
}
interface VisionAltBody {
  source: VisionMediaSource;
}
interface PredictorBody {
  format: ContentFormat;
  hook: string;
  caption: string;
  cta?: string;
  hashtagsCount?: number;
  primerComentario?: string;
}
interface SafetyBody {
  caption: string;
  hooks?: string[];
}
interface HashtagsBody {
  tema?: string;
}
interface ImageGenBody {
  prompt: string;
  aspectRatio: '1:1' | '4:5' | '9:16' | '16:9';
  style?: string;
  count?: number;
  handle?: string;
}
interface CanvaCarruselBody {
  carrusel: import('../capabilities/content/carrusel.js').CarruselResult;
  titulo: string;
  userHandle?: string;
}
interface CanvaReelBody {
  reel: import('../capabilities/content/reel.js').ReelScript;
  titulo: string;
  userHandle?: string;
}
interface CanvaStoriesBody {
  story: import('../capabilities/content/stories.js').StorySequence;
  titulo: string;
  userHandle?: string;
}

export const buildStudioRoutes = (brand: BrandProfile): RouteDefinition[] => [
  {
    method: 'POST',
    pattern: '/api/studio/carrusel',
    handler: async ({ res, body }) => {
      const b = body as CarruselBody;
      if (!b.idea) return json(res, 400, { error: 'idea requerida' });
      const carrusel = await createCarrusel(brand, b.idea, b.longitud ?? 'medio');
      const previews = carrusel.slides.map((s) => ({
        numero: s.numero,
        rol: s.rolEnNarrativa,
        dataUrl: svgToDataUrl(renderCarruselSlideSvg(s, brand, carrusel.slides.length)),
      }));
      json(res, 200, { carrusel, previews });
    },
  },
  {
    method: 'POST',
    pattern: '/api/studio/reel',
    handler: async ({ res, body }) => {
      const b = body as ReelBody;
      if (!b.tema) return json(res, 400, { error: 'tema requerido' });
      const rawReel = await createReel(brand, b.tema, b.duracion ?? 30);
      // Map beats to frontend-expected structure
      const BEAT_TIPOS = ['gancho', 'tension', 'desarrollo', 'climax', 'resolucion', 'cta'];
      const mappedBeats = rawReel.beats.map((beat, idx) => ({
        numero: idx + 1,
        tipo: BEAT_TIPOS[Math.min(idx, BEAT_TIPOS.length - 1)] ?? 'desarrollo',
        duracionSegundos:
          beat.segundo > 0 && idx > 0 ? beat.segundo - (rawReel.beats[idx - 1]?.segundo ?? 0) : beat.segundo,
        vozEnOff: beat.voiceover,
        textoEnPantalla: beat.textoEnPantalla,
        bRoll: beat.bRoll,
        transicion: beat.transicion,
      }));
      const reel = {
        ...rawReel,
        beats: mappedBeats,
        hook: rawReel.hookVisual,
        estrategiaRetencion: rawReel.notasRetencion,
      };
      const svgs = renderReelStoryboardSvg(rawReel.beats, brand);
      const previews = svgs.map((svg) => ({ dataUrl: svgToDataUrl(svg) }));
      json(res, 200, { reel, previews });
    },
  },
  {
    method: 'POST',
    pattern: '/api/studio/stories',
    handler: async ({ res, body }) => {
      const b = body as StoriesBody;
      const evento = b.evento ?? b.mensaje;
      if (!evento) return json(res, 400, { error: 'mensaje/evento requerido' });
      const cantidad = b.cantidad ?? b.cantidadFrames ?? 5;
      const rawStory = await createStorySequence(brand, evento, cantidad);
      // Map slides to frontend-expected frame structure
      const frames = rawStory.slides.map((slide) => ({
        numero: slide.orden,
        tipo: slide.tipo,
        textoPrincipal: slide.textoPrincipal,
        textoSecundario: '',
        sticker: slide.sticker ? `${slide.sticker.tipo}: ${slide.sticker.payload}` : undefined,
        cta: slide.sticker?.tipo === 'link' ? slide.sticker.payload : undefined,
        fondoSugerido: slide.visual,
      }));
      const stories = {
        objetivo: b.objetivo ?? rawStory.objetivo,
        frames,
        estrategia: rawStory.notas,
        linkEnBio: undefined as string | undefined,
        horarioSugerido: '9–11 AM o 7–9 PM (mayor actividad de audiencia)',
      };
      const previews = rawStory.slides.map((slide) => ({
        dataUrl: svgToDataUrl(renderStoryFrameSvg(slide, brand)),
      }));
      json(res, 200, { stories, previews });
    },
  },
  {
    method: 'POST',
    pattern: '/api/studio/caption',
    handler: async ({ res, body }) => {
      const b = body as CaptionBody;
      if (!b.contexto || !b.formato) return json(res, 400, { error: 'contexto y formato requeridos' });
      json(res, 200, await createCaption(brand, b.contexto, b.formato));
    },
  },
  {
    method: 'POST',
    pattern: '/api/studio/faceless',
    handler: async ({ res, body }) => {
      const b = body as FacelessBody;
      if (!b.idea) return json(res, 400, { error: 'idea requerida' });
      json(res, 200, await createFacelessTriple(brand, b.idea, b.objetivo));
    },
  },
  {
    method: 'POST',
    pattern: '/api/studio/hooks',
    handler: async ({ res, body }) => {
      const b = body as HooksBody;
      if (!b.idea) return json(res, 400, { error: 'idea requerida' });
      json(res, 200, await generateHooks(brand, b.idea));
    },
  },
  {
    method: 'POST',
    pattern: '/api/studio/retencion',
    handler: async ({ res, body }) => {
      const b = body as RetencionBody;
      if (!b.contenido) return json(res, 400, { error: 'contenido requerido' });
      json(res, 200, await optimizeForRetention(brand, b.contenido));
    },
  },
  {
    method: 'POST',
    pattern: '/api/studio/hashtags',
    handler: async ({ res, body }) => {
      const b = (body ?? {}) as HashtagsBody;
      json(res, 200, await investigarHashtags(brand, b.tema));
    },
  },
  {
    method: 'POST',
    pattern: '/api/studio/safety',
    handler: async ({ res, body }) => {
      const b = body as SafetyBody;
      if (!b.caption) return json(res, 400, { error: 'caption requerido' });
      const safety = await auditarPrePublicacion(brand, {
        caption: b.caption,
        ...(b.hooks ? { hooks: b.hooks } : {}),
      });
      json(res, 200, safety);
    },
  },
  {
    method: 'POST',
    pattern: '/api/studio/predict',
    handler: async ({ res, body }) => {
      const b = body as PredictorBody;
      if (!b.hook || !b.caption || !b.format) {
        return json(res, 400, { error: 'format, hook y caption requeridos' });
      }
      const input: import('../capabilities/predictor/performance.js').PredictionInput = {
        format: b.format,
        hook: b.hook,
        caption: b.caption,
        ...(b.cta !== undefined ? { cta: b.cta } : {}),
        ...(b.hashtagsCount !== undefined ? { hashtagsCount: b.hashtagsCount } : {}),
        ...(b.primerComentario !== undefined ? { primerComentario: b.primerComentario } : {}),
      };
      json(res, 200, await predecirPerformance(brand, input));
    },
  },
  {
    method: 'POST',
    pattern: '/api/studio/vision/analyze',
    handler: async ({ res, body }) => {
      const b = body as VisionAnalyzeBody;
      if (!b.source) return json(res, 400, { error: 'source requerida' });
      json(res, 200, await analizarImagen(brand, b.source));
    },
  },
  {
    method: 'POST',
    pattern: '/api/studio/vision/caption',
    handler: async ({ res, body }) => {
      const b = body as VisionCaptionBody;
      if (!b.source) return json(res, 400, { error: 'source requerida' });
      json(res, 200, await captionDesdeImagen(brand, b.source, b.contexto));
    },
  },
  {
    method: 'POST',
    pattern: '/api/studio/vision/alt',
    handler: async ({ res, body }) => {
      const b = body as VisionAltBody;
      if (!b.source) return json(res, 400, { error: 'source requerida' });
      json(res, 200, await generarAltText(b.source));
    },
  },
  {
    method: 'POST',
    pattern: '/api/studio/imagegen',
    handler: async ({ res, body }) => {
      const b = body as ImageGenBody;
      if (!b.prompt || !b.aspectRatio) {
        return json(res, 400, { error: 'prompt y aspectRatio requeridos' });
      }
      const contentTypeMap: Record<string, import('../services/provider-router.js').ContentType> = {
        '9:16': 'story-image',
        '4:5': 'carousel-frame',
        '1:1': 'post-image',
        '16:9': 'post-image',
      };
      const routeResult = await routeImageGen({
        prompt: b.prompt,
        contentType: contentTypeMap[b.aspectRatio] ?? 'post-image',
        userHandle: b.handle,
        style: b.style,
        count: b.count,
      });
      json(res, 200, {
        ok: routeResult.ok,
        urls: routeResult.urls ?? (routeResult.url ? [routeResult.url] : []),
        provider: routeResult.provider,
        error: routeResult.error,
      });
    },
  },
  {
    method: 'POST',
    pattern: '/api/studio/canva/carrusel',
    handler: async ({ res, body }) => {
      const b = body as CanvaCarruselBody;
      if (!b.carrusel || !b.titulo) return json(res, 400, { error: 'carrusel y titulo requeridos' });
      json(res, 200, await renderCarruselToCanva(b.carrusel, b.titulo, b.userHandle));
    },
  },
  {
    method: 'POST',
    pattern: '/api/studio/canva/reel',
    handler: async ({ res, body }) => {
      const b = body as CanvaReelBody;
      if (!b.reel || !b.titulo) return json(res, 400, { error: 'reel y titulo requeridos' });
      json(res, 200, await renderReelToCanva(b.reel, b.titulo, b.userHandle));
    },
  },
  {
    method: 'POST',
    pattern: '/api/studio/canva/stories',
    handler: async ({ res, body }) => {
      const b = body as CanvaStoriesBody;
      if (!b.story || !b.titulo) return json(res, 400, { error: 'story y titulo requeridos' });
      json(res, 200, await renderStorySequenceToCanva(b.story, b.titulo, b.userHandle));
    },
  },
  // Unified vision endpoint for frontend (combines analyze+caption+altText+hashtags)
  {
    method: 'POST',
    pattern: '/api/studio/vision',
    handler: async ({ res, body }) => {
      const b = body as VisionUnifiedBody;
      if (!b.imageData) return json(res, 400, { error: 'imageData requerida' });
      const source: import('../capabilities/vision/index.js').VisionMediaSource = b.imageData.startsWith('http')
        ? { type: 'url', url: b.imageData }
        : { type: 'base64', data: b.imageData.replace(/^data:[^;]+;base64,/, ''), mediaType: 'image/jpeg' };
      const result: Record<string, unknown> = {};
      const tasks: Promise<void>[] = [];
      if (b.analisis !== false) {
        tasks.push(
          analizarImagen(brand, source).then((r) => {
            result.analisis = r;
          }),
        );
      }
      if (b.caption !== false) {
        tasks.push(
          captionDesdeImagen(brand, source).then((r) => {
            result.caption = r;
          }),
        );
      }
      if (b.altText !== false) {
        tasks.push(
          generarAltText(source).then((r) => {
            result.altText = r;
          }),
        );
      }
      await Promise.allSettled(tasks);
      json(res, 200, result);
    },
  },
  // Frontend-friendly predictor endpoint (simpler params)
  {
    method: 'POST',
    pattern: '/api/studio/predictor',
    handler: async ({ res, body }) => {
      const b = body as PredictorFrontendBody;
      if (!b.formato || !b.caption) return json(res, 400, { error: 'formato y caption requeridos' });
      const input: import('../capabilities/predictor/performance.js').PredictionInput = {
        format: b.formato as import('../config/types.js').ContentFormat,
        hook: b.caption.slice(0, 100),
        caption: b.caption,
        hashtagsCount: b.hashtags?.length ?? 0,
      };
      const prediction = await predecirPerformance(brand, input);
      // Enrich with timing analysis
      const horaScore = typeof b.hora === 'number' ? ([9, 10, 12, 18, 19, 20, 21].includes(b.hora) ? 80 : 40) : 50;
      const diaScore = ['viernes', 'sabado', 'miercoles'].includes(b.dia ?? '') ? 75 : 50;
      json(res, 200, {
        ...prediction,
        ventanaOptima: [
          { dia: 'Lunes', hora: '19:00', score: 65 },
          { dia: 'Miércoles', hora: '12:00', score: 72 },
          { dia: 'Viernes', hora: '18:00', score: 85 },
          { dia: 'Sábado', hora: '10:00', score: 78 },
        ],
        timingBonus: { hora: horaScore, dia: diaScore },
      });
    },
  },
  {
    method: 'GET',
    pattern: '/api/brand',
    handler: ({ res }) => {
      json(res, 200, {
        name: brand.name,
        type: brand.type,
        niche: brand.niche,
        audience: brand.audience.description,
        tone: brand.voice.tone,
        visual: brand.visual,
        goals: brand.goals,
      });
    },
  },
];
