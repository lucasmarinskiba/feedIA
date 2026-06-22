// @ts-nocheck
/**
 * Niche Mastery — Dominio profundo de nichos de mercado
 * Conoce cada nicho como un experto de 10 años: tendencias, pain points,
 * lenguaje, competidores, oportunidades de contenido, gaps en el mercado.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';
import * as graph from '../memory/knowledgeGraph.js';
import * as lang from '../memory/languageMemory.js';

const NICHE_PATH = resolve('data/runtime/brain/niche-mastery.json');

export interface NicheProfile {
  name: string;
  description: string;
  size: 'micro' | 'small' | 'medium' | 'large' | 'massive';
  growthRate: number; // % mensual
  saturation: number; // 0-1
  audienceSegments: { name: string; age: string; pain: string; desire: string; size: number }[];
  contentGaps: string[];
  trendingFormats: string[];
  topHashtags: string[];
  competitorHandles: string[];
  pricePoints: { product: string; low: number; mid: number; high: number; currency: string }[];
  seasonalPeaks: { month: number; event: string; opportunity: string }[];
  language: string[];
  updatedAt: string;
}

interface NicheStore {
  niches: NicheProfile[];
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime/brain'), { recursive: true });
};

const loadStore = (): NicheStore => {
  try {
    ensureDir();
    if (!existsSync(NICHE_PATH)) return { niches: [] };
    return JSON.parse(readFileSync(NICHE_PATH, 'utf-8')) as NicheStore;
  } catch {
    return { niches: [] };
  }
};

const saveStore = (store: NicheStore): void => {
  ensureDir();
  writeFileSync(NICHE_PATH, JSON.stringify(store, null, 2), 'utf-8');
};

// ── Pre-loaded niche intelligence ──────────────────────────────────────────

const DEFAULT_NICHES: Partial<NicheProfile>[] = [
  {
    name: 'fitness',
    description: 'Entrenamiento físico, nutrición, bienestar y transformación corporal',
    size: 'massive',
    audienceSegments: [
      {
        name: 'principiantes-gym',
        age: '18-25',
        pain: 'No saben por dónde empezar',
        desire: 'Ver resultados en 30 días',
        size: 0.4,
      },
      { name: 'fit-moms', age: '30-45', pain: 'No tienen tiempo', desire: 'Rutinas de 20 min en casa', size: 0.25 },
      { name: 'advanced-lifters', age: '25-35', pain: 'Estancamiento', desire: 'Romper PRs', size: 0.2 },
      { name: 'weight-loss', age: '30-50', pain: 'Dietas frustrantes', desire: 'Pérdida sostenible', size: 0.15 },
    ],
    contentGaps: [
      'Fitness para personas con discapacidad',
      'Nutrición para turnos nocturnos',
      'Gym para introvertidos',
    ],
    trendingFormats: ['Reels de transformación 30 días', 'Carruseles de mitos vs realidades', 'POV: día de entreno'],
    topHashtags: ['#fitness', '#gymmotivation', '#workout', '#fitnessjourney', '#healthylifestyle'],
    seasonalPeaks: [
      { month: 1, event: 'Año nuevo', opportunity: 'Retos de 30 días' },
      { month: 6, event: 'Verano', opportunity: 'Beach body programs' },
      { month: 9, event: 'Vuelta a la rutina', opportunity: 'Back to gym challenges' },
    ],
  },
  {
    name: 'beauty',
    description: 'Maquillaje, skincare, cabello, moda y estética personal',
    size: 'massive',
    audienceSegments: [
      {
        name: 'skincare-newbies',
        age: '18-25',
        pain: 'Piel problemática',
        desire: 'Rutina simple que funcione',
        size: 0.35,
      },
      { name: 'makeup-lovers', age: '20-35', pain: 'Tutoriales muy largos', desire: 'Looks de 5 minutos', size: 0.3 },
      { name: 'anti-aging', age: '40-55', pain: 'Arrugas y manchas', desire: 'Piel juvenil sin cirugía', size: 0.2 },
      {
        name: 'clean-beauty',
        age: '25-40',
        pain: 'Productos tóxicos',
        desire: 'Cosmética natural efectiva',
        size: 0.15,
      },
    ],
    contentGaps: ['Skincare para hombres', 'Maquillaje para pieles maduras', 'Productos accesibles que funcionan'],
    trendingFormats: ['GRWM rápidos', 'Before/after skincare', 'Product swaps', 'Shelfies'],
    topHashtags: ['#skincare', '#makeup', '#beauty', '#glowup', '#selfcare'],
    seasonalPeaks: [
      { month: 2, event: 'San Valentín', opportunity: 'Looks románticos' },
      { month: 11, event: 'Black Friday', opportunity: 'Reviews de productos' },
      { month: 12, event: 'Fiestas', opportunity: 'Holiday makeup tutorials' },
    ],
  },
  {
    name: 'business',
    description: 'Emprendimiento, marketing digital, ventas y crecimiento empresarial',
    size: 'large',
    audienceSegments: [
      {
        name: 'wannapreneurs',
        age: '22-30',
        pain: 'No saben qué negocio empezar',
        desire: 'Idea validada y rentable',
        size: 0.3,
      },
      {
        name: 'service-providers',
        age: '28-40',
        pain: 'Clientes inconsistentes',
        desire: 'Pipeline lleno',
        size: 0.25,
      },
      {
        name: 'ecommerce-owners',
        age: '25-45',
        pain: 'Costos de adquisición altos',
        desire: 'Ventas orgánicas',
        size: 0.25,
      },
      {
        name: 'coaches-consultants',
        age: '30-50',
        pain: 'Dificultad para escalar',
        desire: 'Grupos y membresías',
        size: 0.2,
      },
    ],
    contentGaps: ['Legalidad para emprendedores', 'Mental health de founders', 'Negocios B2B en Instagram'],
    trendingFormats: ['Carruseles de frameworks', 'Mitos del emprendimiento', 'Día de un CEO', 'Caso de estudio'],
    topHashtags: ['#emprendedor', '#marketingdigital', '#negocio', '#ventas', '#crecimiento'],
    seasonalPeaks: [
      { month: 1, event: 'Año nuevo', opportunity: 'Planificación anual' },
      { month: 5, event: 'Día del emprendedor', opportunity: 'Historias de éxito' },
      { month: 9, event: 'Q4 planning', opportunity: 'Estrategias de fin de año' },
    ],
  },
  {
    name: 'tech',
    description: 'Tecnología, programación, IA, automatización y productividad digital',
    size: 'large',
    audienceSegments: [
      { name: 'dev-juniors', age: '20-28', pain: 'Síndrome del impostor', desire: 'Primer trabajo tech', size: 0.3 },
      {
        name: 'no-code-builders',
        age: '25-40',
        pain: 'Limitaciones técnicas',
        desire: 'Automatizar sin programar',
        size: 0.25,
      },
      {
        name: 'ai-curious',
        age: '30-50',
        pain: 'Miedo a quedar obsoleto',
        desire: 'Usar IA en su trabajo',
        size: 0.25,
      },
      {
        name: 'productivity-nerds',
        age: '25-35',
        pain: 'Sobrecarga de herramientas',
        desire: 'Sistema simple y efectivo',
        size: 0.2,
      },
    ],
    contentGaps: [
      'Tech para personas mayores',
      'Ética en IA explicada simple',
      'Comparativas honestas de herramientas',
    ],
    trendingFormats: ['Setup tours', 'Speed runs de automatización', 'IA vs humano', 'Unboxing tech'],
    topHashtags: ['#tech', '#ia', '#automatización', '#productividad', '#programación'],
    seasonalPeaks: [
      { month: 3, event: 'Launch season', opportunity: 'Reviews de nuevas herramientas' },
      { month: 9, event: 'Apple event', opportunity: 'Cobertura tech' },
      { month: 11, event: 'Black Friday', opportunity: 'Deals de software' },
    ],
  },
];

// ── Initialize or get niche ────────────────────────────────────────────────

export const getNiche = (name: string): NicheProfile => {
  const store = loadStore();
  let niche = store.niches.find((n) => n.name.toLowerCase() === name.toLowerCase());

  if (!niche) {
    const defaults = DEFAULT_NICHES.find((n) => n.name?.toLowerCase() === name.toLowerCase());
    niche = {
      name,
      description: defaults?.description ?? `Nicho: ${name}`,
      size: defaults?.size ?? 'small',
      growthRate: 0.05,
      saturation: 0.5,
      audienceSegments: defaults?.audienceSegments ?? [],
      contentGaps: defaults?.contentGaps ?? [],
      trendingFormats: defaults?.trendingFormats ?? [],
      topHashtags: defaults?.topHashtags ?? [],
      competitorHandles: [],
      pricePoints: [],
      seasonalPeaks: defaults?.seasonalPeaks ?? [],
      language: [],
      updatedAt: new Date().toISOString(),
    };
    store.niches.push(niche);
    saveStore(store);
  }

  return niche;
};

// ── Enrich niche from observations ─────────────────────────────────────────

export const enrichNiche = async (name: string, observation: { type: string; data: string }): Promise<void> => {
  const niche = getNiche(name);

  if (observation.type === 'hashtag') {
    if (!niche.topHashtags.includes(observation.data)) {
      niche.topHashtags.push(observation.data);
      niche.topHashtags = niche.topHashtags.slice(-20);
    }
  }

  if (observation.type === 'competitor') {
    if (!niche.competitorHandles.includes(observation.data)) {
      niche.competitorHandles.push(observation.data);
    }
  }

  if (observation.type === 'content-gap') {
    if (!niche.contentGaps.includes(observation.data)) {
      niche.contentGaps.push(observation.data);
    }
  }

  if (observation.type === 'trending-format') {
    if (!niche.trendingFormats.includes(observation.data)) {
      niche.trendingFormats.push(observation.data);
      niche.trendingFormats = niche.trendingFormats.slice(-15);
    }
  }

  niche.updatedAt = new Date().toISOString();

  const store = loadStore();
  const idx = store.niches.findIndex((n) => n.name === niche.name);
  if (idx >= 0) store.niches[idx] = niche;
  saveStore(store);

  await semantic.storeMemory(
    `Nicho "${name}" enriquecido: ${observation.type} = ${observation.data}`,
    'learning',
    { niche: name },
    0.6,
  );
  graph.addTriple(name, `tiene ${observation.type}`, observation.data, 0.6, 'niche-mastery');

  log.info(`[NicheMastery] Enriched "${name}": ${observation.type}`);
};

// ── Get content opportunities for niche ────────────────────────────────────

export const getOpportunities = (
  name: string,
): { gaps: string[]; formats: string[]; seasonal: string[]; hashtags: string[] } => {
  const niche = getNiche(name);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;

  const seasonal = niche.seasonalPeaks
    .filter((s) => Math.abs(s.month - currentMonth) <= 1)
    .map((s) => `${s.event}: ${s.opportunity}`);

  const langTerms = lang.getTrendingTerms(name, 10).map((t) => t.term);

  return {
    gaps: niche.contentGaps.slice(0, 5),
    formats: niche.trendingFormats.slice(0, 5),
    seasonal,
    hashtags: [...niche.topHashtags.slice(0, 10), ...langTerms.slice(0, 5)],
  };
};

// ── Audience segment selector ──────────────────────────────────────────────

export const getBestSegment = (
  name: string,
  goal: 'engagement' | 'conversion' | 'awareness' | 'community',
): NicheProfile['audienceSegments'][0] | undefined => {
  const niche = getNiche(name);

  const weights = {
    engagement: (s: NicheProfile['audienceSegments'][0]) => s.size * 0.7 + (s.age.includes('18-25') ? 0.3 : 0.1),
    conversion: (s: NicheProfile['audienceSegments'][0]) =>
      s.size * 0.5 + (s.desire.includes('compr') || s.desire.includes('rentable') ? 0.5 : 0.2),
    awareness: (s: NicheProfile['audienceSegments'][0]) => s.size,
    community: (s: NicheProfile['audienceSegments'][0]) =>
      s.size * 0.6 + (s.pain.includes('tiempo') || s.pain.includes('solo') ? 0.4 : 0.2),
  };

  return [...niche.audienceSegments].sort((a, b) => weights[goal](b) - weights[goal](a))[0];
};

export const getAllNiches = (): NicheProfile[] => loadStore().niches;
