/**
 * Brand Helpers — construye BrandProfile mínimo desde inputs simples.
 *
 * BrandProfileSchema requiere muchos campos. Cuando un user agrega cuenta IG
 * desde el modal del menú, solo se piden 4 datos (id, name, niche, handle).
 * Este helper rellena defaults razonables para los campos requeridos.
 */

import type { BrandProfile } from '../config/types.js';
import { BrandProfileSchema } from '../config/types.js';

export interface MinimalBrandInput {
  id: string;
  name: string;
  niche?: string;
  handle?: string;
  industryCategory?: string;
  primaryGoal?: 'awareness' | 'engagement' | 'leads' | 'ventas' | 'autoridad';
  tone?: string[];
}

const validIndustryCategories = new Set([
  'fitness-entrenamiento',
  'gastronomia-cocina',
  'cursos-educacion',
  'kiosco-minimercado',
  'plomeria-gas-electricidad',
  'agencia-contenido',
  'modelaje-agencia',
  'finanzas-inversion',
  'psicologia-coaching',
  'inmobiliaria-propiedades',
  'marca-personal-general',
  'influencer-lifestyle',
]);

export const buildMinimalBrandProfile = (input: MinimalBrandInput): BrandProfile => {
  const niche = input.niche ?? 'general';
  const industry =
    input.industryCategory && validIndustryCategories.has(input.industryCategory)
      ? (input.industryCategory as never)
      : undefined;

  const raw = {
    name: input.name,
    type: 'empresa' as const,
    industryCategory: industry,
    niche,
    audience: {
      description: `Audiencia de ${input.name} en el nicho de ${niche}`,
      pains: ['gestión de tiempo', 'falta de claridad'],
      desires: ['crecer en redes', 'automatizar publicaciones'],
      locale: 'es-AR',
    },
    voice: {
      tone: input.tone ?? ['profesional', 'cercano'],
      forbidden: [],
      referenceQuotes: [],
    },
    visual: {
      palette: [],
      typography: [],
      style: 'minimalista',
      mood: 'profesional',
      photographyStyle: 'natural',
      compositionRules: [],
      allowedIconography: [],
      forbiddenIconography: [],
      moodboardUrls: [],
      density: 'medium' as const,
      imageTextRatio: 'balanced' as const,
    },
    goals: {
      primary: input.primaryGoal ?? 'engagement',
      metricsToWatch: ['engagement_rate', 'reach_rate', 'follower_growth'],
    },
    competitors: [],
    hashtagPools: {},
    contentPillars: [],
    complianceRules: [],
    brandStrategy: {},
  };

  return BrandProfileSchema.parse(raw);
};

/** Inyecta brand.handle si la marca lo necesita pero no lo tiene en BrandProfileSchema. */
export const extendWithHandle = (
  profile: BrandProfile,
  handle?: string,
): BrandProfile & { handle?: string; id?: string } => ({
  ...profile,
  ...(handle ? { handle } : {}),
});
