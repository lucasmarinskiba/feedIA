import { z } from 'zod';

// ─── Niche / Industry taxonomy ───────────────────────────────────────────────
export const ACCOUNT_CATEGORIES = [
  'marca-personal',
  'empresa',
  'agencia',
  'creador-de-contenido',
  'profesional-independiente',
  'comercio-local',
  'influencer',
  'educador',
  'artista',
  'servicio-hogar',
  'salud-bienestar',
  'gastronomia',
  'moda-belleza',
  'inmobiliaria',
  'tecnologia',
  'deporte-fitness',
  'viajes-turismo',
  'finanzas',
  'entretenimiento',
  'ong-causa-social',
] as const;

export type AccountCategory = (typeof ACCOUNT_CATEGORIES)[number];

export const INDUSTRY_CATEGORIES = [
  'modelaje-agencia',
  'kiosco-minimercado',
  'agencia-contenido',
  'ingenieria',
  'inteligencia-artificial',
  'marca-personal-general',
  'influencer-lifestyle',
  'youtuber-video',
  'cursos-educacion',
  'plomeria-gas-electricidad',
  'gastronomia-cocina',
  'fitness-entrenamiento',
  'fotografia',
  'musica',
  'moda-ropa',
  'belleza-estetica',
  'psicologia-coaching',
  'arquitectura-diseno',
  'legal-abogacia',
  'salud-medicina',
  'inmobiliaria-propiedades',
  'finanzas-inversion',
  'viajes-turismo',
  'mascotas-veterinaria',
  'ninos-familia',
  'deportes',
  'arte-ilustracion',
  'podcast',
  'politica-social',
  'ong-voluntariado',
] as const;

export type IndustryCategory = (typeof INDUSTRY_CATEGORIES)[number];

export const ContentPillarSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  weight: z.number().min(0).max(100).default(20),
  formats: z.array(z.string()).default([]),
  exampleTopics: z.array(z.string()).default([]),
});
export type ContentPillar = z.infer<typeof ContentPillarSchema>;

export const ComplianceRuleSchema = z.object({
  id: z.string(),
  description: z.string(),
  required: z.boolean().default(false),
  penalty: z.number().default(0),
  example: z.string().optional(),
});
export type ComplianceRule = z.infer<typeof ComplianceRuleSchema>;

// ─────────────────────────────────────────────────────────────────────────────

export const BrandProfileSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  type: z.enum(['empresa', 'marca-personal']),
  accountCategory: z.enum(ACCOUNT_CATEGORIES).optional(),
  industryCategory: z.enum(INDUSTRY_CATEGORIES).optional(),
  niche: z.string(),
  audience: z.object({
    description: z.string(),
    pains: z.array(z.string()),
    desires: z.array(z.string()),
    locale: z.string().default('es-AR'),
  }),
  voice: z.object({
    tone: z.array(z.string()),
    forbidden: z.array(z.string()).default([]),
    referenceQuotes: z.array(z.string()).default([]),
  }),
  visual: z.object({
    palette: z.array(z.string()).default([]),
    typography: z.array(z.string()).default([]),
    style: z.string().default('minimalista'),
    mood: z.string().default('profesional'),
    photographyStyle: z.string().default('natural'),
    compositionRules: z.array(z.string()).default([]),
    allowedIconography: z.array(z.string()).default([]),
    forbiddenIconography: z.array(z.string()).default([]),
    moodboardUrls: z.array(z.string()).default([]),
    density: z.enum(['low', 'medium', 'high']).default('medium'),
    imageTextRatio: z.enum(['image-heavy', 'balanced', 'text-heavy']).default('balanced'),
  }),
  goals: z.object({
    primary: z.enum(['awareness', 'engagement', 'leads', 'ventas', 'autoridad']),
    metricsToWatch: z.array(z.string()),
  }),
  competitors: z.array(z.string()).default([]),
  hashtagPools: z.record(z.string(), z.array(z.string())).default({}),
  contentPillars: z.array(ContentPillarSchema).default([]),
  complianceRules: z.array(ComplianceRuleSchema).default([]),
  nichePackId: z.string().optional(),
  brandStrategy: z
    .object({
      vision: z.string().default(''),
      mission: z.string().default(''),
      values: z.array(z.string()).default([]),
      promise: z.string().default(''),
      positioning: z.string().default(''),
      story: z.string().default(''),
      personality: z.array(z.string()).default([]),
      archetype: z.string().default(''),
      architecture: z.string().default('master-brand'),
      differentiators: z.array(z.string()).default([]),
      experiencePrinciples: z.array(z.string()).default([]),
      targetPersonas: z
        .array(
          z.object({
            name: z.string(),
            description: z.string(),
            pains: z.array(z.string()),
            desires: z.array(z.string()),
            platforms: z.array(z.string()),
          }),
        )
        .default([]),
      brandVoiceRules: z
        .array(
          z.object({
            situation: z.string(),
            tone: z.string(),
            examples: z.array(z.string()),
            forbidden: z.array(z.string()),
          }),
        )
        .default([]),
      visualUsageRules: z
        .array(
          z.object({
            element: z.string(),
            allowedContexts: z.array(z.string()),
            forbiddenContexts: z.array(z.string()),
            usageNotes: z.string(),
          }),
        )
        .default([]),
    })
    .default({}),
});

export type BrandProfile = z.infer<typeof BrandProfileSchema>;

export const ContentFormatSchema = z.enum(['reel', 'carrusel', 'post-imagen', 'historia', 'reel-faceless', 'live']);
export type ContentFormat = z.infer<typeof ContentFormatSchema>;

export const ContentPieceSchema = z.object({
  id: z.string(),
  format: ContentFormatSchema,
  hook: z.string(),
  body: z.string(),
  caption: z.string(),
  cta: z.string(),
  hashtags: z.array(z.string()),
  visualDirection: z.string().optional(),
  scheduledFor: z.string().optional(),
  rationale: z.string(),
});
export type ContentPiece = z.infer<typeof ContentPieceSchema>;

export interface AgentRunOptions {
  goal: string;
  maxIterations?: number;
  dryRun?: boolean;
}

export interface CapabilityResult<T = unknown> {
  capability: string;
  ok: boolean;
  data?: T;
  error?: string;
  tokensUsed?: number;
}
