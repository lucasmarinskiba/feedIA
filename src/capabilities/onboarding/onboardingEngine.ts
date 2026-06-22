/**
 * OnboardingEngine — wizard de 5 pasos + entrevista IA para definir marca.
 *
 * Pasos:
 *  1. Negocio (nombre, tipo, nicho, industria, descripción, propuesta de valor)
 *  2. Audiencia (descripción, dolores, deseos, locale, personas)
 *  3. Voz (tono, palabras prohibidas, frases de referencia)
 *  4. Objetivos (primario, métricas a vigilar)
 *  5. Competidores (handles/urls)
 *
 * Produce un BrandProfile validado, una StrategyPlan y un CompetitorBaseline.
 */

import { randomUUID } from 'node:crypto';
import { BrandProfileSchema, type BrandProfile } from '../../config/types.js';
import { saveBrandProfile } from '../../config/accounts.js';
import { planStrategy, type StrategyPlan } from './strategyPlanner.js';
import { analyzeCompetitors, type CompetitorBaseline } from './competitorBaseline.js';

export type OnboardingStep =
  | 'business'
  | 'audience'
  | 'voice'
  | 'goals'
  | 'competitors'
  | 'strategy'
  | 'complete';

export interface OnboardingAnswers {
  name?: string;
  type?: 'empresa' | 'marca-personal';
  accountCategory?: string;
  industryCategory?: string;
  niche?: string;
  description?: string;
  valueProposition?: string;
  products?: string[];
  audienceDescription?: string;
  pains?: string[];
  desires?: string[];
  locale?: string;
  tone?: string[];
  forbidden?: string[];
  referenceQuotes?: string[];
  primaryGoal?: 'awareness' | 'engagement' | 'leads' | 'ventas' | 'autoridad';
  metricsToWatch?: string[];
  competitors?: string[];
}

export interface OnboardingState {
  accountId: string;
  step: OnboardingStep;
  answers: OnboardingAnswers;
  completedSteps: OnboardingStep[];
}

export interface OnboardingResult {
  ok: boolean;
  accountId: string;
  brandProfile?: BrandProfile;
  strategy?: StrategyPlan;
  competitorBaseline?: CompetitorBaseline;
  missingFields: string[];
  nextQuestions: string[];
  error?: string;
}

const REQUIRED_FIELDS: Array<keyof OnboardingAnswers> = [
  'name',
  'type',
  'niche',
  'description',
  'audienceDescription',
  'pains',
  'desires',
  'tone',
  'primaryGoal',
  'metricsToWatch',
];

export const initialOnboardingState = (accountId: string): OnboardingState => ({
  accountId,
  step: 'business',
  answers: {},
  completedSteps: [],
});

export const applyOnboardingAnswers = (
  state: OnboardingState,
  step: OnboardingStep,
  answers: Partial<OnboardingAnswers>,
): OnboardingState => {
  const ordered: OnboardingStep[] = ['business', 'audience', 'voice', 'goals', 'competitors'];
  const currentIndex = ordered.indexOf(step);
  const nextStep: OnboardingStep = ordered[currentIndex + 1] ?? 'strategy';

  return {
    ...state,
    step: nextStep,
    answers: { ...state.answers, ...answers },
    completedSteps: [...new Set([...state.completedSteps, step])],
  };
};

const hasValue = (v: unknown): boolean => {
  if (Array.isArray(v)) return v.length > 0 && v.some((item) => typeof item === 'string' && item.trim().length > 0);
  if (typeof v === 'string') return v.trim().length > 0;
  return v !== undefined && v !== null;
};

export const getMissingFields = (answers: OnboardingAnswers): string[] =>
  REQUIRED_FIELDS.filter((field) => !hasValue(answers[field]));

export const buildBrandProfileFromState = (
  state: OnboardingState,
): { profile?: BrandProfile; missing: string[] } => {
  const missing = getMissingFields(state.answers);
  if (missing.length > 0) return { missing };

  const raw: BrandProfile = {
    id: state.accountId,
    name: state.answers.name!,
    type: state.answers.type ?? 'empresa',
    accountCategory: (state.answers.accountCategory as BrandProfile['accountCategory']) ?? undefined,
    industryCategory: (state.answers.industryCategory as BrandProfile['industryCategory']) ?? undefined,
    niche: state.answers.niche!,
    audience: {
      description: state.answers.audienceDescription!,
      pains: state.answers.pains!,
      desires: state.answers.desires!,
      locale: state.answers.locale ?? 'es-AR',
    },
    voice: {
      tone: state.answers.tone!,
      forbidden: state.answers.forbidden ?? [],
      referenceQuotes: state.answers.referenceQuotes ?? [],
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
      density: 'medium',
      imageTextRatio: 'balanced',
    },
    goals: {
      primary: state.answers.primaryGoal!,
      metricsToWatch: state.answers.metricsToWatch!,
    },
    competitors: state.answers.competitors ?? [],
    hashtagPools: {},
    contentPillars: [],
    complianceRules: [],
    brandStrategy: {
      vision: '',
      mission: '',
      values: [],
      promise: state.answers.valueProposition ?? '',
      positioning: '',
      story: state.answers.description!,
      personality: state.answers.tone!,
      archetype: '',
      architecture: 'master-brand',
      differentiators: state.answers.valueProposition ? [state.answers.valueProposition] : [],
      experiencePrinciples: [],
      targetPersonas: [],
      brandVoiceRules: [],
      visualUsageRules: [],
    },
  };

  const parsed = BrandProfileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      missing: parsed.error.issues.map((i) => i.path.join('.')),
    };
  }

  return { profile: parsed.data, missing: [] };
};

export const generateOnboardingQuestions = (state: OnboardingState): string[] => {
  const missing = getMissingFields(state.answers);
  const questions: string[] = [];

  const questionMap: Record<string, string> = {
    name: '¿Cómo se llama tu marca o negocio?',
    type: '¿Es una empresa o una marca personal?',
    niche: '¿En qué nicho o industria te moves?',
    description: 'Describí en 2-3 oraciones qué hace tu marca.',
    audienceDescription: '¿Quién es tu audiencia ideal?',
    pains: '¿Cuáles son los 3 dolores principales de tu audiencia?',
    desires: '¿Cuáles son los 3 deseos principales de tu audiencia?',
    tone: '¿Con qué tono de voz debería hablar tu marca? (elegí 3 adjetivos)',
    primaryGoal: '¿Cuál es tu objetivo principal en Instagram?',
    metricsToWatch: '¿Qué métricas te importan seguir?',
  };

  for (const field of missing) {
    const q = questionMap[field];
    if (q) questions.push(q);
  }

  if (questions.length === 0) {
    questions.push(
      '¿Hay algún competidor directo que quieras tener de referencia?',
      '¿Tenés frases o palabras que tu marca NUNCA debería usar?',
      '¿Querés agregar alguna propuesta de valor diferencial?',
    );
  }

  return questions.slice(0, 3);
};

export const completeOnboarding = async (
  state: OnboardingState,
  opts: { persist?: boolean } = {},
): Promise<OnboardingResult> => {
  const { profile, missing } = buildBrandProfileFromState(state);
  if (!profile) {
    return {
      ok: false,
      accountId: state.accountId,
      missingFields: missing,
      nextQuestions: generateOnboardingQuestions(state),
      error: `Faltan campos obligatorios: ${missing.join(', ')}`,
    };
  }

  const [strategy, competitorBaseline] = await Promise.all([
    planStrategy(profile),
    analyzeCompetitors(profile, state.answers.competitors ?? []),
  ]);

  const enriched: BrandProfile = {
    ...profile,
    contentPillars: strategy.pillars,
  };

  if (opts.persist) {
    saveBrandProfile(state.accountId, enriched);
  }

  return {
    ok: true,
    accountId: state.accountId,
    brandProfile: enriched,
    strategy,
    competitorBaseline,
    missingFields: [],
    nextQuestions: generateOnboardingQuestions({ ...state, answers: state.answers }),
  };
};

export const quickOnboarding = async (
  accountId: string,
  answers: OnboardingAnswers,
  opts: { persist?: boolean } = {},
): Promise<OnboardingResult> => {
  let state = initialOnboardingState(accountId);
  const ordered: OnboardingStep[] = ['business', 'audience', 'voice', 'goals', 'competitors'];
  for (const step of ordered) {
    state = applyOnboardingAnswers(state, step, answers);
  }
  return completeOnboarding(state, opts);
};

export const generateAccountId = (name: string): string =>
  `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${randomUUID().slice(0, 8)}`;
