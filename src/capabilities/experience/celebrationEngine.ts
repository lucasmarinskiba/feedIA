/**
 * Celebration Engine de FeedIA — los momentos de alegría visible.
 *
 * Cada vez que pasa algo bueno (logro desbloqueado, milestone, hit, sale,
 * primer 1000, etc), el sistema lo CELEBRA con confetti, sonido, animación
 * y narrativa. Las celebraciones también son SHARE-ABLES — un click y se
 * convierten en una pieza para Instagram.
 *
 * Filosofía: las wins compartidas se sienten más grandes.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import { sendAlert } from '../../integrations/notifications.js';
import { askJson as routerAskJson } from '../../agent/tokenRouter.js';
import { getPersonalization } from './personalizationEngine.js';
import type { BrandProfile } from '../../config/types.js';

const CELEBRATIONS_PATH = join(process.cwd(), 'data', 'experience', 'celebrations.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type CelebrationKind =
  | 'milestone' // hito de números
  | 'achievement' // logro desbloqueado
  | 'streak' // racha
  | 'first-time' // primera vez de algo
  | 'top-post' // post tope
  | 'goal-completed' // meta cumplida
  | 'level-up' // subida de nivel
  | 'surprise' // celebración sorpresa
  | 'anniversary' // aniversario de la cuenta
  | 'comeback' // volvió después de tiempo
  | 'collab-success'; // colab exitosa

export type CelebrationIntensity = 'subtle' | 'moderate' | 'fiesta' | 'épica';

export interface CelebrationEvent {
  id: string;
  kind: CelebrationKind;
  intensity: CelebrationIntensity;
  triggeredAt: string;
  forBrand: string;
  context: {
    metricName?: string;
    metricValue?: number | string;
    relatedEntityId?: string; // achievement.id, goal.id, post.id, etc.
    description: string;
  };

  // Componentes visuales/sensoriales
  visual: {
    animation:
      | 'confetti-burst'
      | 'fireworks'
      | 'sparkle-rain'
      | 'phoenix-rise'
      | 'cosmic-explosion'
      | 'gentle-glow'
      | 'screen-flash';
    primaryColor: string;
    secondaryColor: string;
    durationMs: number;
    intensityScore: number; // 1-10
  };
  audio: {
    soundFile: string;
    volume: number; // 0-1
    durationMs: number;
  };
  haptic?: 'light' | 'medium' | 'strong';

  // Mensaje narrativo
  narrative: {
    headline: string;
    body: string;
    flavorQuote?: string;
  };

  // Para compartir como contenido
  shareableAsset?: {
    designConcept: string;
    socialCopy: string;
    hashtags: string[];
    suggestedHook: string;
  };

  delivered: boolean;
  acknowledged: boolean;
  shared: boolean;
}

interface CelebrationStore {
  version: number;
  celebrations: CelebrationEvent[];
  config: {
    enabledKinds: CelebrationKind[];
    minimumIntensity: CelebrationIntensity;
    cooldownMinutes: number; // evitar spam
  };
  lastUpdated: string;
}

const DEFAULT_STORE: CelebrationStore = {
  version: 1,
  celebrations: [],
  config: {
    enabledKinds: [
      'milestone',
      'achievement',
      'streak',
      'first-time',
      'top-post',
      'goal-completed',
      'level-up',
      'surprise',
      'anniversary',
      'comeback',
      'collab-success',
    ],
    minimumIntensity: 'subtle',
    cooldownMinutes: 30,
  },
  lastUpdated: new Date().toISOString(),
};

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'experience');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadStore = (): CelebrationStore => {
  try {
    ensureDir();
    if (!existsSync(CELEBRATIONS_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(CELEBRATIONS_PATH, 'utf8')) as CelebrationStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveStore = (store: CelebrationStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(CELEBRATIONS_PATH, JSON.stringify(store, null, 2), 'utf8');
};

// ── Configuración estética por tipo + intensidad ─────────────────────────────

const VISUAL_PRESETS: Record<
  CelebrationIntensity,
  {
    animation: CelebrationEvent['visual']['animation'];
    durationMs: number;
    intensityScore: number;
  }
> = {
  subtle: { animation: 'gentle-glow', durationMs: 800, intensityScore: 2 },
  moderate: { animation: 'sparkle-rain', durationMs: 1500, intensityScore: 5 },
  fiesta: { animation: 'confetti-burst', durationMs: 3000, intensityScore: 8 },
  épica: { animation: 'cosmic-explosion', durationMs: 5000, intensityScore: 10 },
};

const AUDIO_PRESETS: Record<CelebrationIntensity, { soundFile: string; volume: number; durationMs: number }> = {
  subtle: { soundFile: 'chime-soft.mp3', volume: 0.4, durationMs: 800 },
  moderate: { soundFile: 'fanfare-short.mp3', volume: 0.6, durationMs: 1500 },
  fiesta: { soundFile: 'celebration-trumpets.mp3', volume: 0.8, durationMs: 3000 },
  épica: { soundFile: 'orchestral-victory.mp3', volume: 1.0, durationMs: 5000 },
};

const PALETTE_BY_KIND: Record<CelebrationKind, { primary: string; secondary: string }> = {
  milestone: { primary: '#FFD700', secondary: '#FF8E72' }, // dorado + naranja
  achievement: { primary: '#3FB8C9', secondary: '#A78BFA' }, // cyan + violeta
  streak: { primary: '#F97316', secondary: '#EF4444' }, // naranja + rojo
  'first-time': { primary: '#22D3EE', secondary: '#A7F3D0' }, // cyan claro + verde menta
  'top-post': { primary: '#F472B6', secondary: '#FBBF24' }, // rosa + amarillo
  'goal-completed': { primary: '#4ADE80', secondary: '#3FB8C9' }, // verde + cyan
  'level-up': { primary: '#A78BFA', secondary: '#F472B6' }, // violeta + rosa
  surprise: { primary: '#F0F', secondary: '#0FF' }, // magenta + cyan
  anniversary: { primary: '#FBBF24', secondary: '#F472B6' }, // dorado + rosa
  comeback: { primary: '#EF4444', secondary: '#F97316' }, // rojo + naranja (fénix)
  'collab-success': { primary: '#A78BFA', secondary: '#22D3EE' },
};

// ── Cooldown check ────────────────────────────────────────────────────────────

const isWithinCooldown = (kind: CelebrationKind): boolean => {
  const store = loadStore();
  const cooldownMs = store.config.cooldownMinutes * 60 * 1000;
  const lastSame = store.celebrations
    .filter((c) => c.kind === kind)
    .sort((a, b) => b.triggeredAt.localeCompare(a.triggeredAt))[0];
  if (!lastSame) return false;
  return Date.now() - new Date(lastSame.triggeredAt).getTime() < cooldownMs;
};

// ── Triggering ────────────────────────────────────────────────────────────────

export interface TriggerInput {
  kind: CelebrationKind;
  intensity?: CelebrationIntensity;
  context: CelebrationEvent['context'];
  brand: BrandProfile;
  userId?: string;
  bypassCooldown?: boolean;
  generateShareable?: boolean;
}

export const triggerCelebration = async (input: TriggerInput): Promise<CelebrationEvent | null> => {
  // Respect personalization
  if (input.userId) {
    const personalization = getPersonalization(input.userId);
    if (personalization?.enableCelebrations === false) {
      log.debug(`[CelebrationEngine] Celebrations off para ${input.userId}`);
      return null;
    }
  }

  // Check cooldown
  if (!input.bypassCooldown && isWithinCooldown(input.kind)) {
    log.debug(`[CelebrationEngine] ${input.kind} en cooldown, skip`);
    return null;
  }

  // Determine intensity automáticamente si no se especifica
  let intensity = input.intensity;
  if (!intensity) {
    intensity =
      input.kind === 'milestone' || input.kind === 'anniversary'
        ? 'fiesta'
        : input.kind === 'achievement' || input.kind === 'goal-completed'
          ? 'moderate'
          : input.kind === 'first-time'
            ? 'subtle'
            : input.kind === 'top-post'
              ? 'moderate'
              : 'subtle';
  }

  // Ajustar según user preference
  if (input.userId) {
    const personalization = getPersonalization(input.userId);
    if (personalization?.celebrationIntensity === 'subtle' && intensity === 'fiesta') intensity = 'moderate';
    if (personalization?.celebrationIntensity === 'fiesta' && intensity === 'subtle') intensity = 'moderate';
  }

  // Build visual + audio
  const visualPreset = VISUAL_PRESETS[intensity];
  const audioPreset = AUDIO_PRESETS[intensity];
  const palette = PALETTE_BY_KIND[input.kind];

  // Generate narrative con AI
  const narrative = await buildNarrative(input.kind, input.context, input.brand);

  // Generate shareable si lo pidieron
  let shareableAsset: CelebrationEvent['shareableAsset'] | undefined;
  if (input.generateShareable) {
    shareableAsset = await buildShareableAsset(input.kind, input.context, input.brand);
  }

  const event: CelebrationEvent = {
    id: `celeb-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    kind: input.kind,
    intensity,
    triggeredAt: new Date().toISOString(),
    forBrand: input.brand.name,
    context: input.context,
    visual: {
      animation: visualPreset.animation,
      primaryColor: palette.primary,
      secondaryColor: palette.secondary,
      durationMs: visualPreset.durationMs,
      intensityScore: visualPreset.intensityScore,
    },
    audio: audioPreset,
    haptic: intensity === 'fiesta' || intensity === 'épica' ? 'strong' : intensity === 'moderate' ? 'medium' : 'light',
    narrative,
    shareableAsset,
    delivered: false,
    acknowledged: false,
    shared: false,
  };

  const store = loadStore();
  store.celebrations.push(event);
  if (store.celebrations.length > 300) store.celebrations = store.celebrations.slice(-300);
  saveStore(store);

  log.info(`[CelebrationEngine] 🎉 ${input.kind} celebrado (${intensity}): "${narrative.headline}"`);

  // Disparar alert para celebraciones fiesta/épicas
  if (intensity === 'fiesta' || intensity === 'épica') {
    await sendAlert({
      severity: 'info',
      title: `🎉 ${narrative.headline}`,
      body: `${narrative.body}\n\n${narrative.flavorQuote ?? ''}`,
      metadata: { celebrationId: event.id, kind: input.kind, intensity },
    }).catch(() => undefined);
  }

  return event;
};

// ── Narrative generation ──────────────────────────────────────────────────────

const buildNarrative = async (
  kind: CelebrationKind,
  context: CelebrationEvent['context'],
  brand: BrandProfile,
): Promise<CelebrationEvent['narrative']> => {
  const prompt = `Generá el copy de una celebración tipo "${kind}" para @${brand.name}.

Contexto: ${context.description}
${context.metricName ? `Métrica: ${context.metricName} = ${context.metricValue}` : ''}

El copy debe ser cálido, memorable, y sentirse merecido (NO un "felicitaciones" genérico).

JSON:
{
  "headline": "1 línea poderosa (max 60 chars)",
  "body": "2-3 líneas que reconozcan el logro con calidez",
  "flavorQuote": "1 frase poética o memorable (opcional pero recomendada)"
}`;

  return routerAskJson<CelebrationEvent['narrative']>(prompt, {
    taskType: 'response',
    maxTokens: 600,
    systemPrompt: 'Sos un copywriter especialista en momentos emocionales. NO genéricos. Calidez real.',
  }).catch(() => ({
    headline: `¡${kind} desbloqueado!`,
    body: context.description,
    flavorQuote: '',
  }));
};

// ── Shareable asset generation ───────────────────────────────────────────────

const buildShareableAsset = async (
  kind: CelebrationKind,
  context: CelebrationEvent['context'],
  brand: BrandProfile,
): Promise<CelebrationEvent['shareableAsset']> => {
  const prompt = `Generá una pieza compartible para Instagram celebrando esta milestone.

Marca: @${brand.name} (${brand.niche})
Tipo: ${kind}
Detalles: ${context.description}
${context.metricName ? `Número clave: ${context.metricValue}` : ''}

JSON:
{
  "designConcept": "Cómo se ve la pieza visualmente (1-2 líneas)",
  "socialCopy": "Caption para publicar (60-150 palabras, emotivo, agradeciendo)",
  "hashtags": ["array de 8-12 hashtags"],
  "suggestedHook": "Hook impactante para la primera línea (max 80 chars)"
}`;

  return routerAskJson<NonNullable<CelebrationEvent['shareableAsset']>>(prompt, {
    taskType: 'creative',
    maxTokens: 1200,
    systemPrompt: 'Sos creative director. Las piezas que producís se ven profesionales y emotivas.',
  }).catch(() => ({
    designConcept: `Pieza visual con el número grande y la palabra clave de ${kind}`,
    socialCopy: `Hoy celebramos algo. Gracias a ustedes que están desde el día uno.`,
    hashtags: ['gracias', 'milestone', 'comunidad'],
    suggestedHook: '¡Lo logramos!',
  }));
};

// ── Helpers de alto nivel para casos comunes ─────────────────────────────────

export const celebrateMilestone = (
  value: number,
  metricName: string,
  brand: BrandProfile,
  userId?: string,
): Promise<CelebrationEvent | null> =>
  triggerCelebration({
    kind: 'milestone',
    intensity: value >= 100000 ? 'épica' : value >= 10000 ? 'fiesta' : 'moderate',
    context: {
      metricName,
      metricValue: value,
      description: `${value.toLocaleString('es-AR')} ${metricName}`,
    },
    brand,
    userId,
    generateShareable: true,
  });

export const celebrateAchievement = (
  achievementName: string,
  rarity: string,
  brand: BrandProfile,
  userId?: string,
): Promise<CelebrationEvent | null> =>
  triggerCelebration({
    kind: 'achievement',
    intensity:
      rarity === 'mítica' ? 'épica' : rarity === 'legendaria' ? 'fiesta' : rarity === 'épica' ? 'moderate' : 'subtle',
    context: {
      description: `Logro ${rarity}: ${achievementName}`,
      relatedEntityId: achievementName,
    },
    brand,
    userId,
    generateShareable: rarity === 'épica' || rarity === 'legendaria' || rarity === 'mítica',
  });

export const celebrateGoalCompleted = (
  goalTitle: string,
  brand: BrandProfile,
  userId?: string,
): Promise<CelebrationEvent | null> =>
  triggerCelebration({
    kind: 'goal-completed',
    intensity: 'moderate',
    context: { description: `Meta completada: "${goalTitle}"` },
    brand,
    userId,
  });

export const celebrateStreak = (days: number, brand: BrandProfile, userId?: string): Promise<CelebrationEvent | null> =>
  triggerCelebration({
    kind: 'streak',
    intensity: days >= 30 ? 'fiesta' : days >= 7 ? 'moderate' : 'subtle',
    context: { description: `${days} días seguidos`, metricValue: days },
    brand,
    userId,
  });

export const celebrateFirstTime = (
  whatDescription: string,
  brand: BrandProfile,
  userId?: string,
): Promise<CelebrationEvent | null> =>
  triggerCelebration({
    kind: 'first-time',
    intensity: 'subtle',
    context: { description: `Primera vez: ${whatDescription}` },
    brand,
    userId,
  });

export const celebrateTopPost = (
  postHook: string,
  reach: number,
  brand: BrandProfile,
  userId?: string,
): Promise<CelebrationEvent | null> =>
  triggerCelebration({
    kind: 'top-post',
    intensity: reach >= 100000 ? 'fiesta' : reach >= 10000 ? 'moderate' : 'subtle',
    context: {
      description: `Post viral: "${postHook}" — ${reach.toLocaleString('es-AR')} alcance`,
      metricValue: reach,
    },
    brand,
    userId,
    generateShareable: reach >= 10000,
  });

export const celebrateSurprise = async (brand: BrandProfile, userId?: string): Promise<CelebrationEvent | null> => {
  const surprises = [
    'Hoy es un buen día. No hay razón concreta, solo lo es.',
    'Llevás un día sin distraerte. Eso ya es win.',
    'Notamos que entrás a esta hora siempre. Buena rutina.',
    'Pequeño dato: el algoritmo te está empujando 12% más esta semana.',
    'Tu mejor post de siempre vino después de uno malo. Patrón interesante.',
  ];
  return triggerCelebration({
    kind: 'surprise',
    intensity: 'subtle',
    context: { description: surprises[Math.floor(Math.random() * surprises.length)] ?? surprises[0]! },
    brand,
    userId,
    bypassCooldown: false,
  });
};

export const celebrateAnniversary = (
  yearsActive: number,
  brand: BrandProfile,
  userId?: string,
): Promise<CelebrationEvent | null> =>
  triggerCelebration({
    kind: 'anniversary',
    intensity: 'épica',
    context: { description: `${yearsActive} año${yearsActive > 1 ? 's' : ''} de la cuenta` },
    brand,
    userId,
    generateShareable: true,
  });

export const celebrateComeback = (
  daysAway: number,
  brand: BrandProfile,
  userId?: string,
): Promise<CelebrationEvent | null> =>
  triggerCelebration({
    kind: 'comeback',
    intensity: 'moderate',
    context: { description: `Volviste después de ${daysAway} días` },
    brand,
    userId,
  });

// ── Consultas / vistas ───────────────────────────────────────────────────────

export const getRecentCelebrations = (limit = 20, kind?: CelebrationKind): CelebrationEvent[] => {
  const store = loadStore();
  let events = store.celebrations;
  if (kind) events = events.filter((e) => e.kind === kind);
  return events.sort((a, b) => b.triggeredAt.localeCompare(a.triggeredAt)).slice(0, limit);
};

export const getCelebration = (id: string): CelebrationEvent | null =>
  loadStore().celebrations.find((c) => c.id === id) ?? null;

export const markCelebrationAcknowledged = (id: string): boolean => {
  const store = loadStore();
  const c = store.celebrations.find((celeb) => celeb.id === id);
  if (!c) return false;
  c.acknowledged = true;
  saveStore(store);
  return true;
};

export const markCelebrationShared = (id: string): boolean => {
  const store = loadStore();
  const c = store.celebrations.find((celeb) => celeb.id === id);
  if (!c) return false;
  c.shared = true;
  saveStore(store);
  return true;
};

export const getUnacknowledgedCelebrations = (): CelebrationEvent[] =>
  loadStore().celebrations.filter((c) => !c.acknowledged);

export const getCelebrationSnapshot = (): {
  total: number;
  byKind: Record<string, number>;
  byIntensity: Record<string, number>;
  pendingAcknowledge: number;
  sharedCount: number;
  last7Days: number;
} => {
  const store = loadStore();
  const byKind: Record<string, number> = {};
  const byIntensity: Record<string, number> = {};
  const cutoff = Date.now() - 7 * 86400000;
  let last7 = 0;
  let sharedCount = 0;
  let pendingAck = 0;

  for (const c of store.celebrations) {
    byKind[c.kind] = (byKind[c.kind] ?? 0) + 1;
    byIntensity[c.intensity] = (byIntensity[c.intensity] ?? 0) + 1;
    if (new Date(c.triggeredAt).getTime() >= cutoff) last7++;
    if (c.shared) sharedCount++;
    if (!c.acknowledged) pendingAck++;
  }

  return {
    total: store.celebrations.length,
    byKind,
    byIntensity,
    pendingAcknowledge: pendingAck,
    sharedCount,
    last7Days: last7,
  };
};

// ── Config ────────────────────────────────────────────────────────────────────

export const updateConfig = (updates: Partial<CelebrationStore['config']>): CelebrationStore['config'] => {
  const store = loadStore();
  store.config = { ...store.config, ...updates };
  saveStore(store);
  return store.config;
};

export const getConfig = (): CelebrationStore['config'] => loadStore().config;

export const exportCelebrationState = (): CelebrationStore => loadStore();
