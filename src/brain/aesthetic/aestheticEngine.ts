// @ts-nocheck
/**
 * Aesthetic Engine — Cohesión visual total del perfil
 * Armoniza foto de perfil, grid, stories, highlights en una identidad visual única
 * Detecta inconsistencias y sugiere mejoras para un feed "scroll-stopper"
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';
import * as semantic from '../memory/semanticMemory.js';

const AESTHETIC_PATH = resolve('data/runtime/brain/aesthetic-engine.json');

export interface AestheticIdentity {
  brandName: string;
  primaryColors: string[]; // hex
  secondaryColors: string[];
  fonts: string[];
  mood: string; // minimal, vibrant, dark, pastel, boho, corporate, playful
  photoStyle: string; // natural, studio, candid, illustrated, mixed
  gridPattern: 'checkerboard' | 'rows' | 'columns' | 'random' | 'puzzle' | 'none';
  storyTemplates: string[];
  highlightCovers: string[];
  createdAt: string;
  updatedAt: string;
}

export interface VisualCohesionReport {
  overallScore: number;
  colorCohesion: number;
  styleCohesion: number;
  layoutCohesion: number;
  storyCohesion: number;
  issues: string[];
  recommendations: string[];
  moodBoard: string[];
}

interface AestheticStore {
  identities: AestheticIdentity[];
  reports: VisualCohesionReport[];
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime/brain'), { recursive: true });
};

const loadStore = (): AestheticStore => {
  try {
    ensureDir();
    if (!existsSync(AESTHETIC_PATH)) return { identities: [], reports: [] };
    return JSON.parse(readFileSync(AESTHETIC_PATH, 'utf-8')) as AestheticStore;
  } catch {
    return { identities: [], reports: [] };
  }
};

const saveStore = (store: AestheticStore): void => {
  ensureDir();
  writeFileSync(AESTHETIC_PATH, JSON.stringify(store, null, 2), 'utf-8');
};

// ── Create or update aesthetic identity ────────────────────────────────────

export const defineIdentity = (identity: Omit<AestheticIdentity, 'createdAt' | 'updatedAt'>): AestheticIdentity => {
  const store = loadStore();
  const full: AestheticIdentity = {
    ...identity,
    createdAt: identity.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const existingIdx = store.identities.findIndex((i) => i.brandName === identity.brandName);
  if (existingIdx >= 0) {
    store.identities[existingIdx] = { ...store.identities[existingIdx], ...identity, updatedAt: full.updatedAt };
  } else {
    store.identities.push(full);
  }

  saveStore(store);
  log.info(`[AestheticEngine] Identity for "${identity.brandName}" defined: ${identity.mood} + ${identity.photoStyle}`);
  return full;
};

// ── Analyze visual cohesion ────────────────────────────────────────────────

export const analyzeCohesion = async (
  brandName: string,
  recentPosts: { dominantColor: string; style: string; layout: string }[],
  stories: { template: string; color: string }[],
): Promise<VisualCohesionReport> => {
  const store = loadStore();
  const identity = store.identities.find((i) => i.brandName === brandName);

  const issues: string[] = [];
  const recommendations: string[] = [];

  // Color cohesion
  const postColors = recentPosts.map((p) => p.dominantColor);
  const colorMatches = identity
    ? postColors.filter((c) => identity.primaryColors.includes(c) || identity.secondaryColors.includes(c)).length
    : 0;
  const colorCohesion = recentPosts.length > 0 ? colorMatches / recentPosts.length : 0;

  if (colorCohesion < 0.5) {
    issues.push('Colores de posts no alineados con identidad');
    recommendations.push(`Usar filtros que inclinan hacia ${identity?.primaryColors[0] ?? 'tu paleta definida'}`);
  }

  // Style cohesion
  const styles = recentPosts.map((p) => p.style);
  const uniqueStyles = [...new Set(styles)];
  const styleCohesion = uniqueStyles.length <= 2 ? 0.9 : uniqueStyles.length <= 3 ? 0.7 : 0.4;

  if (styleCohesion < 0.6) {
    issues.push('Mezcla de estilos fotográficos inconsistente');
    recommendations.push('Definir 1-2 estilos de fotografía y mantenerlos por 30 días');
  }

  // Layout cohesion
  const layouts = recentPosts.map((p) => p.layout);
  const layoutPattern = detectLayoutPattern(layouts);
  const layoutCohesion = layoutPattern !== 'none' ? 0.8 : 0.4;

  if (layoutPattern === 'none') {
    recommendations.push('Usar un patrón de grid (checkerboard, filas, o puzzle) para cohesión');
  }

  // Story cohesion
  const storyTemplates = stories.map((s) => s.template);
  const uniqueTemplates = [...new Set(storyTemplates)];
  const storyCohesion = uniqueTemplates.length <= 3 ? 0.85 : uniqueTemplates.length <= 5 ? 0.6 : 0.3;

  if (storyCohesion < 0.5) {
    issues.push('Stories sin templates consistentes');
    recommendations.push('Crear 3-4 templates de stories reutilizables');
  }

  const overallScore = (colorCohesion + styleCohesion + layoutCohesion + storyCohesion) / 4;

  const report: VisualCohesionReport = {
    overallScore,
    colorCohesion,
    styleCohesion,
    layoutCohesion,
    storyCohesion,
    issues,
    recommendations,
    moodBoard: identity ? [...identity.primaryColors, ...identity.secondaryColors, identity.mood] : [],
  };

  store.reports.push(report);
  if (store.reports.length > 50) store.reports = store.reports.slice(-50);
  saveStore(store);

  await semantic.storeMemory(
    `Análisis estético "${brandName}": ${(overallScore * 100).toFixed(0)}% cohesión`,
    'learning',
    { brandName, score: overallScore },
    overallScore,
  );

  log.info(`[AestheticEngine] "${brandName}" cohesion: ${(overallScore * 100).toFixed(0)}%`);
  return report;
};

// ── Generate mood-based content direction ──────────────────────────────────

export const getContentDirection = (
  brandName: string,
): { captions: string[]; visualTips: string[]; hashtagVibe: string[] } => {
  const store = loadStore();
  const identity = store.identities.find((i) => i.brandName === brandName);
  if (!identity) return { captions: [], visualTips: [], hashtagVibe: [] };

  const moodDirections: Record<string, { captions: string[]; visualTips: string[]; hashtagVibe: string[] }> = {
    minimal: {
      captions: ['Menos es más.', 'Simplicidad con propósito.', 'Detalles que importan.'],
      visualTips: ['Fondos neutros', 'Espacio negativo', 'Máximo 2 colores por post'],
      hashtagVibe: ['#minimalismo', '#lessismore', '#cleanfeed', '#aesthetic'],
    },
    vibrant: {
      captions: ['Color que inspira.', 'Vibrando alto.', 'Energía pura.'],
      visualTips: ['Colores saturados', 'Contraste alto', 'Elementos dinámicos'],
      hashtagVibe: ['#vibrant', '#colorful', '#energy', '#bold'],
    },
    dark: {
      captions: ['En la oscuridad brilla lo real.', 'Mood.', 'Dark mode on.'],
      visualTips: ['Fondos oscuros', 'Iluminación dramática', 'Texturas'],
      hashtagVibe: ['#darkaesthetic', '#moody', '#night', '#shadow'],
    },
    pastel: {
      captions: ['Suave pero poderoso.', 'Dreamy vibes.', 'Pastel perfection.'],
      visualTips: ['Tonos pastel', 'Luz suave', 'Transiciones suaves'],
      hashtagVibe: ['#pastel', '#soft', '#dreamy', '#aesthetic'],
    },
    boho: {
      captions: ['Alma libre.', 'Naturalmente.', 'Vibes bohemias.'],
      visualTips: ['Texturas naturales', 'Luz dorada', 'Elementos orgánicos'],
      hashtagVibe: ['#boho', '#bohemian', '#freespirit', '#nature'],
    },
    corporate: {
      captions: ['Profesionalismo con propósito.', 'Resultados que hablan.', 'Estrategia + ejecución.'],
      visualTips: ['Tipografía clean', 'Paleta corporativa', 'Iconografía consistente'],
      hashtagVibe: ['#business', '#professional', '#strategy', '#growth'],
    },
    playful: {
      captions: ['Serio nunca fue una opción.', 'Fun first.', 'Jugando en serio.'],
      visualTips: ['Ilustraciones', 'Emojis en diseño', 'Ángulos inesperados'],
      hashtagVibe: ['#fun', '#playful', '#creative', '#joy'],
    },
  };

  return moodDirections[identity.mood] ?? moodDirections.minimal ?? { captions: [], visualTips: [], hashtagVibe: [] };
};

// ── Generate highlight cover suggestions ───────────────────────────────────

export const suggestHighlightCovers = (brandName: string): { name: string; color: string; icon: string }[] => {
  const store = loadStore();
  const identity = store.identities.find((i) => i.brandName === brandName);
  const primary = identity?.primaryColors[0] ?? '#E1306C';

  return [
    { name: 'Sobre mí', color: primary, icon: '👤' },
    { name: 'Servicios', color: identity?.secondaryColors[0] ?? '#F77737', icon: '💼' },
    { name: 'Testimonios', color: primary, icon: '⭐' },
    { name: 'Proceso', color: identity?.secondaryColors[1] ?? '#FCAF45', icon: '⚙️' },
    { name: 'FAQ', color: primary, icon: '❓' },
    { name: 'Contacto', color: identity?.secondaryColors[0] ?? '#F77737', icon: '💬' },
  ];
};

// ── Helpers ────────────────────────────────────────────────────────────────

const detectLayoutPattern = (layouts: string[]): AestheticIdentity['gridPattern'] => {
  if (layouts.length < 6) return 'none';
  // Simple heuristic
  const first3 = layouts.slice(0, 3).join(',');
  const next3 = layouts.slice(3, 6).join(',');
  if (first3 === next3) return 'rows';
  if (layouts[0] === layouts[2] && layouts[1] === layouts[3]) return 'checkerboard';
  return 'random';
};

export const getIdentity = (brandName: string): AestheticIdentity | undefined => {
  return loadStore().identities.find((i) => i.brandName === brandName);
};
