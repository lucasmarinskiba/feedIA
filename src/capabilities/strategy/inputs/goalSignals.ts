/**
 * Goal Signals — interpreta las metas de la marca para priorizar briefs.
 */

import type { BrandProfile } from '../../../config/types.js';
import type { ContentPillar } from '../output/strategicBrief.js';

// Derivado del schema (config/types.ts) en vez de una unión duplicada a mano,
// para que agregar una meta ahí no vuelva a desincronizarse acá en silencio.
export type BrandGoal = BrandProfile['goals']['primary'];

export interface GoalSignals {
  primary: BrandGoal;
  secondary: BrandGoal;
  metricsToWatch: string[];
  pillarWeights: Record<ContentPillar, number>;
  preferredFormats: string[];
}

const GOAL_TO_PILLARS: Record<BrandGoal, ContentPillar[]> = {
  awareness: ['awareness', 'entertainment', 'education'],
  engagement: ['community', 'entertainment', 'education'],
  leads: ['conversion', 'authority', 'education'],
  ventas: ['conversion', 'authority', 'awareness'],
  autoridad: ['authority', 'education', 'conversion'],
  trafico: ['conversion', 'awareness', 'education'],
  comunidad: ['community', 'entertainment', 'authority'],
  retencion: ['community', 'education', 'authority'],
};

const GOAL_TO_FORMATS: Record<BrandGoal, string[]> = {
  awareness: ['reel', 'reel-faceless', 'historia'],
  engagement: ['carrusel', 'reel', 'historia'],
  leads: ['carrusel', 'reel', 'post-imagen'],
  ventas: ['carrusel', 'reel', 'post-imagen'],
  autoridad: ['carrusel', 'reel', 'post-imagen'],
  trafico: ['carrusel', 'reel', 'historia'],
  comunidad: ['historia', 'reel', 'carrusel'],
  retencion: ['carrusel', 'historia', 'reel'],
};

const GOAL_SECONDARY: Record<BrandGoal, BrandGoal> = {
  awareness: 'engagement',
  engagement: 'leads',
  leads: 'autoridad',
  ventas: 'autoridad',
  autoridad: 'leads',
  trafico: 'leads',
  comunidad: 'retencion',
  retencion: 'comunidad',
};

export const gatherGoalSignals = (brand: BrandProfile): GoalSignals => {
  const primary = brand.goals.primary ?? 'awareness';
  const secondary = GOAL_SECONDARY[primary];
  const primaryPillars = GOAL_TO_PILLARS[primary];

  const weights = Object.fromEntries(
    (['authority', 'education', 'entertainment', 'community', 'conversion', 'awareness'] as ContentPillar[]).map(
      (p) => {
        if (p === primaryPillars[0]) return [p, 40];
        if (primaryPillars.includes(p)) return [p, 25];
        return [p, 10];
      },
    ),
  ) as Record<ContentPillar, number>;

  return {
    primary,
    secondary,
    metricsToWatch: brand.goals.metricsToWatch ?? [],
    pillarWeights: weights,
    preferredFormats: GOAL_TO_FORMATS[primary],
  };
};
