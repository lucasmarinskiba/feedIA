/**
 * Smart Onboarding AI Guide de FeedIA — guía contextual para nuevos usuarios.
 *
 * Detecta en qué etapa del onboarding está el usuario, identifica qué features
 * todavía no probó, y sugiere los próximos 1-3 pasos más impactantes según
 * su contexto. Persiste el progreso para no repetir tips.
 *
 * Vive dentro de "Consumo" porque es parte del paquete de "cómo aprovechar
 * al máximo lo que pagás".
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { askJson as routerAskJson } from '../../agent/tokenRouter.js';
import { exportAttributionState } from './costAttribution.js';
import { hasCompletedOnboarding } from '../experience/welcomeExperience.js';
import { buildUsageSnapshot } from './planRecommendation.js';
import type { BrandProfile } from '../../config/types.js';

const GUIDE_PATH = join(process.cwd(), 'data', 'consumption', 'onboarding-guide.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type OnboardingStage =
  | 'fresh' // recién creó cuenta
  | 'first-config' // completó welcome
  | 'first-post' // publicó primera vez
  | 'first-week' // pasaron 7 días
  | 'active' // usa varias features
  | 'power-user' // usa la mayoría
  | 'graduated'; // domina el sistema

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  cta: string; // call-to-action concreto
  estimatedMinutes: number;
  impactLevel: 'low' | 'medium' | 'high' | 'game-changer';
  requiresFeatures?: string[];
  completedCheck: 'feature-used' | 'manual' | 'time-based';
  featureKey?: string;
  category: 'setup' | 'content' | 'community' | 'growth' | 'optimization';
}

export interface OnboardingProgress {
  userId: string;
  brandName: string;
  currentStage: OnboardingStage;
  startedAt: string;
  completedStepIds: string[];
  skippedStepIds: string[];
  lastCheckedAt: string;
  nextSuggestion?: OnboardingStep;
  customPath?: string[]; // override del flujo recomendado
}

interface GuideStore {
  version: number;
  progress: OnboardingProgress[];
  catalogs: { steps: OnboardingStep[] };
  lastUpdated: string;
}

// ── Catálogo de pasos ────────────────────────────────────────────────────────

const STEP_CATALOG: OnboardingStep[] = [
  // Setup
  {
    id: 'connect-instagram',
    title: 'Conectá tu Instagram',
    description: 'Vinculá tu cuenta para que el sistema pueda publicar y leer métricas.',
    cta: 'Settings → Cuentas',
    estimatedMinutes: 3,
    impactLevel: 'game-changer',
    completedCheck: 'feature-used',
    featureKey: 'meta-connection',
    category: 'setup',
  },
  {
    id: 'brand-interview',
    title: 'Hacé la entrevista de marca',
    description: '9 preguntas que afinan el tono y la estrategia. 20 minutos cambia todo.',
    cta: 'Iniciar entrevista',
    estimatedMinutes: 20,
    impactLevel: 'game-changer',
    completedCheck: 'feature-used',
    featureKey: 'brand-interview',
    category: 'setup',
  },
  {
    id: 'set-goals',
    title: 'Definí metas trimestrales',
    description: 'Sin objetivos, el sistema no sabe dónde apuntar.',
    cta: 'Goals → Crear meta',
    estimatedMinutes: 5,
    impactLevel: 'high',
    completedCheck: 'feature-used',
    featureKey: 'goal-set',
    category: 'setup',
  },
  {
    id: 'personalize',
    title: 'Personalizá la apariencia',
    description: 'Mascot, tema, voz. Hacelo tuyo.',
    cta: 'Personalización',
    estimatedMinutes: 3,
    impactLevel: 'medium',
    completedCheck: 'feature-used',
    featureKey: 'personalization-init',
    category: 'setup',
  },

  // Content
  {
    id: 'first-canva-post',
    title: 'Diseñá tu primer post con Canva→IG',
    description: 'El cursor diseña solo y publica. La forma más rápida de ver el sistema operar.',
    cta: 'Canva → IG',
    estimatedMinutes: 8,
    impactLevel: 'game-changer',
    completedCheck: 'feature-used',
    featureKey: 'canva-pipeline',
    category: 'content',
  },
  {
    id: 'use-hook-lab',
    title: 'Probá el Hook Lab',
    description: 'Genera 8 hooks y elegí el ganador. Multiplica el alcance.',
    cta: 'Tools → Hooks',
    estimatedMinutes: 5,
    impactLevel: 'high',
    completedCheck: 'feature-used',
    featureKey: 'hook-generate',
    category: 'content',
  },
  {
    id: 'plan-daily-stories',
    title: 'Planificá stories del día',
    description: 'Ejecuta planDailyStories — 3 secuencias con polls/quizzes automáticas.',
    cta: 'Stories → Plan del día',
    estimatedMinutes: 3,
    impactLevel: 'high',
    completedCheck: 'feature-used',
    featureKey: 'stories-daily',
    category: 'content',
  },
  {
    id: 'create-carousel',
    title: 'Producí un carrusel completo',
    description: 'Copy + visual + design system, todo coherente.',
    cta: 'Studio → Carrusel',
    estimatedMinutes: 10,
    impactLevel: 'high',
    completedCheck: 'feature-used',
    featureKey: 'carousel-create',
    category: 'content',
  },

  // Community
  {
    id: 'inbox-tick',
    title: 'Procesá el inbox por primera vez',
    description: 'Triage automático + respuestas sugeridas. Reemplazá CM en 10 min.',
    cta: 'Community Hub → Procesar cola',
    estimatedMinutes: 5,
    impactLevel: 'high',
    completedCheck: 'feature-used',
    featureKey: 'inbox-tick',
    category: 'community',
  },
  {
    id: 'faq-mining',
    title: 'Detectá FAQs recurrentes',
    description: 'El sistema mina tus DMs y propone respuestas tipo.',
    cta: 'Community → FAQ → Detectar',
    estimatedMinutes: 4,
    impactLevel: 'medium',
    completedCheck: 'feature-used',
    featureKey: 'faq-detect',
    category: 'community',
  },
  {
    id: 'fans-welcome',
    title: 'Activá bienvenidas automáticas',
    description: 'DM personalizado a cada nuevo follower. Sin esfuerzo.',
    cta: 'Community → Fans → Procesar',
    estimatedMinutes: 2,
    impactLevel: 'medium',
    completedCheck: 'feature-used',
    featureKey: 'fan-welcome',
    category: 'community',
  },

  // Growth
  {
    id: 'run-viral-scan',
    title: 'Surfeá una ola viral',
    description: 'Detecta lo que viraliza en tu nicho y adapta a tu marca.',
    cta: 'Tools → Viral Scan',
    estimatedMinutes: 6,
    impactLevel: 'high',
    completedCheck: 'feature-used',
    featureKey: 'viral-ride-wave',
    category: 'growth',
  },
  {
    id: 'first-boost',
    title: 'Ejecutá un Post Boost',
    description: 'La primera hora del post define el alcance total. No lo dejes al azar.',
    cta: 'Después de publicar',
    estimatedMinutes: 3,
    impactLevel: 'high',
    completedCheck: 'feature-used',
    featureKey: 'boost-schedule',
    category: 'growth',
  },
  {
    id: 'review-growth-dash',
    title: 'Mirá tu dashboard de growth',
    description: 'KPIs, predicciones, lo que falta para tu próximo hito.',
    cta: 'Imperio → Growth',
    estimatedMinutes: 5,
    impactLevel: 'medium',
    completedCheck: 'feature-used',
    featureKey: 'growth-dashboard',
    category: 'growth',
  },

  // Optimization
  {
    id: 'review-cost-attr',
    title: 'Revisá Cost Attribution',
    description: 'Entendé en qué se va tu gasto para optimizar.',
    cta: 'Settings → Consumo',
    estimatedMinutes: 4,
    impactLevel: 'medium',
    completedCheck: 'feature-used',
    featureKey: 'cost-attribution',
    category: 'optimization',
  },
  {
    id: 'monthly-period-report',
    title: 'Generá un Period Report',
    description: 'Reporte ejecutivo con KPIs, narrativa y recomendaciones.',
    cta: 'Reportes → Mensual',
    estimatedMinutes: 5,
    impactLevel: 'high',
    completedCheck: 'feature-used',
    featureKey: 'period-report',
    category: 'optimization',
  },
];

const DEFAULT_STORE: GuideStore = {
  version: 1,
  progress: [],
  catalogs: { steps: STEP_CATALOG },
  lastUpdated: new Date().toISOString(),
};

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'consumption');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadStore = (): GuideStore => {
  try {
    ensureDir();
    if (!existsSync(GUIDE_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(GUIDE_PATH, 'utf8')) as GuideStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveStore = (store: GuideStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(GUIDE_PATH, JSON.stringify(store, null, 2), 'utf8');
};

// ── Detección de etapa ──────────────────────────────────────────────────────

const detectStage = (progress: OnboardingProgress): OnboardingStage => {
  const completed = progress.completedStepIds.length;
  const daysSinceStart = (Date.now() - new Date(progress.startedAt).getTime()) / 86400000;
  if (completed >= 12) return 'graduated';
  if (completed >= 8) return 'power-user';
  if (completed >= 5 || daysSinceStart >= 14) return 'active';
  if (completed >= 3 || daysSinceStart >= 7) return 'first-week';
  if (completed >= 1) return 'first-post';
  if (hasCompletedOnboarding(progress.userId)) return 'first-config';
  return 'fresh';
};

const checkFeatureUsage = (featureKey: string): boolean => {
  const events = exportAttributionState().events;
  return events.some((e) => e.dimensions.feature === featureKey);
};

// ── Sync automático: marca pasos como completos según uso real ───────────

export const syncProgress = (userId: string, brandName: string): OnboardingProgress => {
  const store = loadStore();
  let progress = store.progress.find((p) => p.userId === userId);
  if (!progress) {
    progress = {
      userId,
      brandName,
      currentStage: 'fresh',
      startedAt: new Date().toISOString(),
      completedStepIds: [],
      skippedStepIds: [],
      lastCheckedAt: new Date().toISOString(),
    };
    store.progress.push(progress);
  }

  // Marcar pasos según feature-used
  for (const step of store.catalogs.steps) {
    if (step.completedCheck === 'feature-used' && step.featureKey && !progress.completedStepIds.includes(step.id)) {
      if (checkFeatureUsage(step.featureKey)) {
        progress.completedStepIds.push(step.id);
      }
    }
  }

  progress.currentStage = detectStage(progress);
  progress.lastCheckedAt = new Date().toISOString();
  saveStore(store);
  return progress;
};

// ── Próximos pasos sugeridos ─────────────────────────────────────────────────

export interface NextStepsResult {
  progress: OnboardingProgress;
  nextSteps: OnboardingStep[]; // hasta 3
  completionPct: number;
  stageMessage: string;
  encouragement: string;
}

const STAGE_MESSAGES: Record<OnboardingStage, string> = {
  fresh: 'Acabás de empezar. Hagamos que el primer "wow" llegue rápido.',
  'first-config': 'El setup base está. Hora del primer impacto visible.',
  'first-post': 'Ya publicaste con el sistema. Sigamos sumando features de alto impacto.',
  'first-week': 'Tenés ritmo. Es momento de activar las features que separan a los buenos de los mejores.',
  active: 'Estás usando el sistema bien. Vamos a sacarle el jugo final.',
  'power-user': 'Sos power user. Quedan algunas joyas que no probaste.',
  graduated: '✨ Sos un graduado del sistema. Lo dominás. Cualquier feature nuevo que salga, te llega notificación.',
};

const ENCOURAGEMENTS = [
  'Cada paso te ahorra horas la próxima semana.',
  'Esto se nota en el alcance, no en el "me gusta".',
  'No es magia: es ejecución consistente.',
  'Lo que estás armando es un activo, no una tarea más.',
];

export const getNextSteps = (userId: string, brandName: string): NextStepsResult => {
  const progress = syncProgress(userId, brandName);
  const store = loadStore();
  const available = store.catalogs.steps.filter(
    (s) => !progress.completedStepIds.includes(s.id) && !progress.skippedStepIds.includes(s.id),
  );

  // Prioridad: game-changer > high > medium > low, dentro de cada nivel los más cortos primero
  const priority = { 'game-changer': 0, high: 1, medium: 2, low: 3 };
  const sorted = available.sort((a, b) => {
    const pa = priority[a.impactLevel] - priority[b.impactLevel];
    if (pa !== 0) return pa;
    return a.estimatedMinutes - b.estimatedMinutes;
  });

  const nextSteps = sorted.slice(0, 3);
  const completionPct = Number(((progress.completedStepIds.length / store.catalogs.steps.length) * 100).toFixed(1));
  const stageMessage = STAGE_MESSAGES[progress.currentStage];
  const encouragement = ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]!;

  progress.nextSuggestion = nextSteps[0];
  const persistStore = loadStore();
  const idx = persistStore.progress.findIndex((p) => p.userId === userId);
  if (idx >= 0) persistStore.progress[idx] = progress;
  saveStore(persistStore);

  return { progress, nextSteps, completionPct, stageMessage, encouragement };
};

// ── Marcar manualmente ───────────────────────────────────────────────────────

export const markStepDone = (userId: string, stepId: string): OnboardingProgress | null => {
  const store = loadStore();
  const progress = store.progress.find((p) => p.userId === userId);
  if (!progress) return null;
  if (!progress.completedStepIds.includes(stepId)) progress.completedStepIds.push(stepId);
  progress.currentStage = detectStage(progress);
  saveStore(store);
  return progress;
};

export const skipStep = (userId: string, stepId: string): OnboardingProgress | null => {
  const store = loadStore();
  const progress = store.progress.find((p) => p.userId === userId);
  if (!progress) return null;
  if (!progress.skippedStepIds.includes(stepId)) progress.skippedStepIds.push(stepId);
  saveStore(store);
  return progress;
};

// ── Tip contextual con IA (opcional) ────────────────────────────────────────

export const generateContextualTip = async (userId: string, brand: BrandProfile): Promise<string> => {
  const { progress, nextSteps } = getNextSteps(userId, brand.name);
  const usage = buildUsageSnapshot(7);

  const prompt = `Generá un tip corto (1 frase) y contextual para el usuario de FeedIA.

ESTADO ACTUAL:
- Etapa: ${progress.currentStage}
- Pasos completados: ${progress.completedStepIds.length}
- Próximo paso sugerido: ${nextSteps[0]?.title ?? 'ninguno pendiente'}
- Llamadas IA últimos 7 días: ${usage.totalCallsLastWindow}

MARCA: ${brand.name} | NICHO: ${brand.niche}

Devolvé SOLO la frase (1 línea, ≤120 caracteres). Tono: cómplice, no condescendiente.`;

  try {
    const result = await routerAskJson<{ tip: string }>(prompt + '\n\nJSON: { "tip": "..." }', {
      taskType: 'response',
      maxTokens: 200,
      freeOnly: true,
    });
    return result.tip;
  } catch {
    return nextSteps[0]?.cta ?? 'Estás haciendo bien. Seguí explorando.';
  }
};

// ── Snapshot global ──────────────────────────────────────────────────────────

export const getOnboardingSnapshot = (): {
  totalUsers: number;
  byStage: Record<OnboardingStage, number>;
  avgCompletionPct: number;
  graduatedCount: number;
} => {
  const store = loadStore();
  const byStage: Record<OnboardingStage, number> = {
    fresh: 0,
    'first-config': 0,
    'first-post': 0,
    'first-week': 0,
    active: 0,
    'power-user': 0,
    graduated: 0,
  };
  let totalCompletion = 0;
  for (const p of store.progress) {
    byStage[p.currentStage]++;
    totalCompletion += (p.completedStepIds.length / store.catalogs.steps.length) * 100;
  }
  return {
    totalUsers: store.progress.length,
    byStage,
    avgCompletionPct: store.progress.length > 0 ? Number((totalCompletion / store.progress.length).toFixed(1)) : 0,
    graduatedCount: byStage.graduated,
  };
};

export const getAllSteps = (): OnboardingStep[] => loadStore().catalogs.steps;
export const getProgressForUser = (userId: string): OnboardingProgress | null =>
  loadStore().progress.find((p) => p.userId === userId) ?? null;
