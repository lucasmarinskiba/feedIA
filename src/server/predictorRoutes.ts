/* eslint-disable @typescript-eslint/explicit-function-return-type */
import type { BrandProfile } from '../config/types.js';
import { json, type RouteDefinition } from './http.js';
import { adaptRoutesToExpress } from './expressRouteAdapter.js';
import { marcaDeCuentas } from './marcaDeCuentas.js';
import { estadoPredictor, predecirParaMarca } from '../capabilities/executive/predictorEjecutivo.js';
import type {
  EntradaContenido,
  FormatoContenido,
  PlataformaContenido,
} from '../capabilities/executive/predictorModelo.js';

const PLATAFORMAS: readonly PlataformaContenido[] = ['instagram', 'tiktok'];
const FORMATOS: readonly FormatoContenido[] = ['reel', 'carrusel', 'imagen', 'video'];
const DIAS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
const MAX_CAPTION = 2200;
const MAX_HASHTAGS = 30;
const MAX_HASHTAG = 60;
const MAX_DURACION_SEG = 600;

const textoLimpio = (v: unknown, max: number): string =>
  typeof v === 'string'
    ? v
        .replace(/\u0000/g, '')
        .trim()
        .slice(0, max)
    : '';

const enLista = <T extends string>(v: unknown, lista: readonly T[]): T | null =>
  typeof v === 'string' && (lista as readonly string[]).includes(v) ? (v as T) : null;

const enteroEnRango = (v: unknown, min: number, max: number): number | null => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isInteger(n) && n >= min && n <= max ? n : null;
};

const hashtagsDe = (v: unknown): string[] => {
  const crudo = Array.isArray(v)
    ? v.filter((x): x is string => typeof x === 'string')
    : typeof v === 'string'
      ? v.split(/[\s\n]+/)
      : [];
  return crudo
    .map((h) => h.trim())
    .filter((h) => h.length > 0 && h.length <= MAX_HASHTAG && /^#?[\p{L}\p{N}_]+$/u.test(h))
    .slice(0, MAX_HASHTAGS);
};

const entradaDesde = (body: unknown): EntradaContenido | { error: string } => {
  const b = (body ?? {}) as Record<string, unknown>;
  const formato = enLista(b.formato, FORMATOS);
  if (!formato) return { error: 'formato inválido (reel|carrusel|imagen|video)' };
  const caption = textoLimpio(b.caption, MAX_CAPTION);
  if (!caption) return { error: 'caption requerido' };
  const dia = typeof b.dia === 'string' && DIAS.includes(b.dia.toLowerCase()) ? b.dia.toLowerCase() : null;
  return {
    plataforma: enLista(b.plataforma, PLATAFORMAS) ?? 'instagram',
    formato,
    caption,
    hashtags: hashtagsDe(b.hashtags),
    hora: enteroEnRango(b.hora, 0, 23),
    dia,
    duracionSeg: enteroEnRango(b.duracionSeg, 1, MAX_DURACION_SEG),
  };
};

const buildPredictorRoutes = (brand: BrandProfile): RouteDefinition[] => [
  {
    method: 'POST',
    pattern: '/api/executive/predictor',
    handler: async ({ req, res, body }) => {
      const entrada = entradaDesde(body);
      if ('error' in entrada) {
        json(res, 400, { error: entrada.error });
        return;
      }
      json(res, 200, await predecirParaMarca(await marcaDeCuentas(req, brand), entrada));
    },
  },
  {
    method: 'GET',
    pattern: '/api/executive/predictor/estado',
    handler: async ({ req, res }) => {
      json(res, 200, await estadoPredictor(await marcaDeCuentas(req, brand)));
    },
  },
];

const createPredictorRoutes = (brand: BrandProfile): ReturnType<typeof adaptRoutesToExpress> =>
  adaptRoutesToExpress(buildPredictorRoutes(brand));

export default createPredictorRoutes;
