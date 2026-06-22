/**
 * Achievement System de FeedIA — trofeos, badges, hitos desbloqueables.
 *
 * Más de 60 achievements en 8 categorías. Cada uno con su narrativa, condición
 * de desbloqueo, rareza y recompensa visual (badge + animación + ringtone).
 *
 * Filosofía: cada vez que el usuario logra algo, lo hacemos sentir. Que vea su
 * progreso como una colección. Que vuelva a entrar para ver "qué desbloqueé".
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import { sendAlert } from '../../integrations/notifications.js';
import { getAccountSummary, getRecentPosts, getTopPerformers } from '../analytics/performanceDB.js';
import { getRecentDailyMetrics } from '../growth/growthEngine.js';
import { listGoals } from '../goals/goalManager.js';
import { getInboxSnapshot } from '../community/dmInbox.js';
import { getPipelineSnapshot } from '../community/leadPipeline.js';
import { getStoriesSnapshot } from '../community/storiesStudio.js';
import { getFanSnapshot } from '../community/fanRecognition.js';
import { getBoostStats } from '../growth/postBoost.js';
import type { BrandProfile } from '../../config/types.js';

const ACHIEVEMENTS_PATH = join(process.cwd(), 'data', 'experience', 'achievements.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type AchievementCategory =
  | 'crecimiento' // followers, alcance
  | 'engagement' // likes, saves, comentarios
  | 'contenido' // posts publicados, calidad
  | 'comunidad' // DMs respondidos, fans
  | 'ventas' // leads, conversions
  | 'rituales' // streak diario, consistencia
  | 'maestría' // dominio del sistema
  | 'especiales'; // momentos únicos

export type AchievementRarity = 'común' | 'rara' | 'épica' | 'legendaria' | 'mítica';

export interface AchievementDefinition {
  id: string;
  name: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  emoji: string;
  badgeIcon: string; // ícono SVG o nombre
  flavorText: string; // frase poética/memorable
  unlockCondition: string; // descripción legible
  evaluator: () => boolean | Promise<boolean>;
  points: number;
  hidden: boolean; // si se muestra como "???" hasta desbloquear
  unlockSound: 'common-chime' | 'rare-fanfare' | 'epic-orchestra' | 'legendary-choir' | 'mythic-revelation';
  unlockAnimation: 'sparkle' | 'confetti-burst' | 'star-explosion' | 'phoenix-rise' | 'cosmic-reveal';
  shareableText: string;
}

export interface UnlockedAchievement {
  achievementId: string;
  unlockedAt: string;
  context?: string;
  shared: boolean;
  acknowledged: boolean;
}

interface AchievementsStore {
  version: number;
  unlocked: UnlockedAchievement[];
  totalPoints: number;
  byCategory: Record<AchievementCategory, number>;
  byRarity: Record<AchievementRarity, number>;
  lastEvaluatedAt?: string;
  lastUnlockedAt?: string;
}

const DEFAULT_STORE: AchievementsStore = {
  version: 1,
  unlocked: [],
  totalPoints: 0,
  byCategory: {
    crecimiento: 0,
    engagement: 0,
    contenido: 0,
    comunidad: 0,
    ventas: 0,
    rituales: 0,
    maestría: 0,
    especiales: 0,
  },
  byRarity: { común: 0, rara: 0, épica: 0, legendaria: 0, mítica: 0 },
};

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'experience');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadStore = (): AchievementsStore => {
  try {
    ensureDir();
    if (!existsSync(ACHIEVEMENTS_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(ACHIEVEMENTS_PATH, 'utf8')) as AchievementsStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveStore = (store: AchievementsStore): void => {
  ensureDir();
  writeFileSync(ACHIEVEMENTS_PATH, JSON.stringify(store, null, 2), 'utf8');
};

// ── Catálogo de achievements ──────────────────────────────────────────────────

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // ── CRECIMIENTO ─────────────────────────────────────────────────────────────
  {
    id: 'primeros-100',
    name: 'Primeros 100',
    description: 'Llegaste a 100 seguidores',
    category: 'crecimiento',
    rarity: 'común',
    emoji: '🌱',
    badgeIcon: 'sprout',
    flavorText: 'Toda planta empieza por una semilla.',
    unlockCondition: 'Alcanzar 100 seguidores',
    evaluator: (): boolean => {
      const last = getRecentDailyMetrics(60).pop();
      return (last?.followers ?? 0) >= 100;
    },
    points: 10,
    hidden: false,
    unlockSound: 'common-chime',
    unlockAnimation: 'sparkle',
    shareableText: 'Acabo de cruzar 100 seguidores 🌱',
  },
  {
    id: 'club-mil',
    name: 'Club de los Mil',
    description: '1.000 seguidores reales',
    category: 'crecimiento',
    rarity: 'rara',
    emoji: '🚀',
    badgeIcon: 'rocket',
    flavorText: 'Mil ojos. Mil corazones. Esto es real.',
    unlockCondition: 'Alcanzar 1.000 seguidores',
    evaluator: (): boolean => {
      const last = getRecentDailyMetrics(60).pop();
      return (last?.followers ?? 0) >= 1000;
    },
    points: 50,
    hidden: false,
    unlockSound: 'rare-fanfare',
    unlockAnimation: 'confetti-burst',
    shareableText: '¡1.000 seguidores! 🚀',
  },
  {
    id: 'cinco-mil',
    name: '5K',
    description: '5.000 seguidores',
    category: 'crecimiento',
    rarity: 'rara',
    emoji: '⭐',
    badgeIcon: 'star',
    flavorText: 'Ya no es casualidad. Es construcción.',
    unlockCondition: 'Alcanzar 5.000 seguidores',
    evaluator: (): boolean => {
      const last = getRecentDailyMetrics(60).pop();
      return (last?.followers ?? 0) >= 5000;
    },
    points: 100,
    hidden: false,
    unlockSound: 'rare-fanfare',
    unlockAnimation: 'confetti-burst',
    shareableText: 'Llegamos a 5K ⭐',
  },
  {
    id: 'diez-mil',
    name: 'Membresía 10K',
    description: '10.000 seguidores · gold tier',
    category: 'crecimiento',
    rarity: 'épica',
    emoji: '🏆',
    badgeIcon: 'trophy',
    flavorText: 'Diez mil personas eligieron escucharte.',
    unlockCondition: 'Alcanzar 10.000 seguidores',
    evaluator: (): boolean => {
      const last = getRecentDailyMetrics(60).pop();
      return (last?.followers ?? 0) >= 10000;
    },
    points: 250,
    hidden: false,
    unlockSound: 'epic-orchestra',
    unlockAnimation: 'star-explosion',
    shareableText: '10K seguidores 🏆 Gracias a cada uno.',
  },
  {
    id: 'cien-mil',
    name: 'Élite 100K',
    description: 'Seis cifras. Una comunidad gigante.',
    category: 'crecimiento',
    rarity: 'legendaria',
    emoji: '👑',
    badgeIcon: 'crown',
    flavorText: 'Te lo ganaste con esfuerzo. Bienvenido a la élite.',
    unlockCondition: 'Alcanzar 100.000 seguidores',
    evaluator: (): boolean => {
      const last = getRecentDailyMetrics(60).pop();
      return (last?.followers ?? 0) >= 100000;
    },
    points: 1000,
    hidden: false,
    unlockSound: 'legendary-choir',
    unlockAnimation: 'phoenix-rise',
    shareableText: '100.000 seguidores 👑 Histórico.',
  },
  {
    id: 'millon',
    name: 'Un Millón',
    description: 'Un millón de personas',
    category: 'crecimiento',
    rarity: 'mítica',
    emoji: '💎',
    badgeIcon: 'diamond',
    flavorText: 'Esto se cuenta a los nietos.',
    unlockCondition: 'Alcanzar 1.000.000 seguidores',
    evaluator: (): boolean => {
      const last = getRecentDailyMetrics(60).pop();
      return (last?.followers ?? 0) >= 1000000;
    },
    points: 5000,
    hidden: false,
    unlockSound: 'mythic-revelation',
    unlockAnimation: 'cosmic-reveal',
    shareableText: 'UN MILLÓN 💎',
  },
  {
    id: 'racha-7',
    name: 'Semana ganadora',
    description: '7 días seguidos sumando seguidores',
    category: 'crecimiento',
    rarity: 'común',
    emoji: '🔥',
    badgeIcon: 'flame',
    flavorText: 'Una semana entera para arriba.',
    unlockCondition: '7 días seguidos con delta positivo',
    evaluator: (): boolean => {
      const last7 = getRecentDailyMetrics(7);
      return last7.length === 7 && last7.every((d) => d.followersDelta > 0);
    },
    points: 30,
    hidden: false,
    unlockSound: 'common-chime',
    unlockAnimation: 'sparkle',
    shareableText: '7 días seguidos creciendo 🔥',
  },
  {
    id: 'racha-30',
    name: 'Mes Inquebrantable',
    description: '30 días seguidos sumando seguidores',
    category: 'crecimiento',
    rarity: 'épica',
    emoji: '🌋',
    badgeIcon: 'volcano',
    flavorText: 'Un mes entero sin pausa.',
    unlockCondition: '30 días seguidos con delta positivo',
    evaluator: (): boolean => {
      const last30 = getRecentDailyMetrics(30);
      return last30.length === 30 && last30.every((d) => d.followersDelta > 0);
    },
    points: 200,
    hidden: false,
    unlockSound: 'epic-orchestra',
    unlockAnimation: 'star-explosion',
    shareableText: '30 días creciendo sin parar 🌋',
  },

  // ── ENGAGEMENT ──────────────────────────────────────────────────────────────
  {
    id: 'primer-mil-likes',
    name: 'Primer mil likes',
    description: '1000 likes acumulados',
    category: 'engagement',
    rarity: 'común',
    emoji: '❤️',
    badgeIcon: 'heart',
    flavorText: 'Mil corazoncitos. No es poco.',
    unlockCondition: 'Acumular 1000 likes',
    evaluator: (): boolean => {
      const posts = getRecentPosts(365);
      return posts.reduce((s, p) => s + p.metrics.likes, 0) >= 1000;
    },
    points: 15,
    hidden: false,
    unlockSound: 'common-chime',
    unlockAnimation: 'sparkle',
    shareableText: '1K likes ❤️',
  },
  {
    id: 'engagement-5pct',
    name: 'Engagement de fuego',
    description: 'Engagement rate sostenido > 5%',
    category: 'engagement',
    rarity: 'rara',
    emoji: '🔥',
    badgeIcon: 'fire',
    flavorText: 'Tu audiencia te ama.',
    unlockCondition: 'Engagement rate promedio > 5% con 10+ posts',
    evaluator: (): boolean => {
      const summary = getAccountSummary();
      return summary.avgEngagementRate >= 5 && summary.totalPosts >= 10;
    },
    points: 80,
    hidden: false,
    unlockSound: 'rare-fanfare',
    unlockAnimation: 'confetti-burst',
    shareableText: 'Engagement rate +5% sostenido 🔥',
  },
  {
    id: 'engagement-10pct',
    name: 'Engagement de leyenda',
    description: 'ER promedio > 10%',
    category: 'engagement',
    rarity: 'legendaria',
    emoji: '⚡',
    badgeIcon: 'lightning',
    flavorText: 'Esto es performance de top 1% mundial.',
    unlockCondition: 'Engagement rate promedio > 10% con 20+ posts',
    evaluator: (): boolean => {
      const summary = getAccountSummary();
      return summary.avgEngagementRate >= 10 && summary.totalPosts >= 20;
    },
    points: 500,
    hidden: false,
    unlockSound: 'legendary-choir',
    unlockAnimation: 'phoenix-rise',
    shareableText: 'ER promedio +10% 🤯',
  },
  {
    id: 'cien-saves',
    name: 'Save Master',
    description: '100 saves en un solo post',
    category: 'engagement',
    rarity: 'rara',
    emoji: '🔖',
    badgeIcon: 'bookmark',
    flavorText: 'Que guarden es la mejor métrica.',
    unlockCondition: 'Un post con 100+ saves',
    evaluator: (): boolean => {
      const posts = getRecentPosts(365);
      return posts.some((p) => p.metrics.saves >= 100);
    },
    points: 60,
    hidden: false,
    unlockSound: 'rare-fanfare',
    unlockAnimation: 'confetti-burst',
    shareableText: 'Mi post fue guardado 100+ veces 🔖',
  },
  {
    id: 'mil-saves',
    name: 'Maestro del Save',
    description: '1000+ saves en un post',
    category: 'engagement',
    rarity: 'épica',
    emoji: '📚',
    badgeIcon: 'books',
    flavorText: 'Tu contenido se vuelve referencia.',
    unlockCondition: 'Un post con 1000+ saves',
    evaluator: (): boolean => {
      const posts = getRecentPosts(365);
      return posts.some((p) => p.metrics.saves >= 1000);
    },
    points: 300,
    hidden: false,
    unlockSound: 'epic-orchestra',
    unlockAnimation: 'star-explosion',
    shareableText: '1000+ saves en un post 📚',
  },

  // ── CONTENIDO ───────────────────────────────────────────────────────────────
  {
    id: 'primer-post',
    name: 'Primera Pieza',
    description: 'Publicaste tu primer post',
    category: 'contenido',
    rarity: 'común',
    emoji: '🎬',
    badgeIcon: 'clapboard',
    flavorText: 'El que arranca, gana.',
    unlockCondition: 'Publicar 1+ post',
    evaluator: () => getAccountSummary().totalPosts >= 1,
    points: 5,
    hidden: false,
    unlockSound: 'common-chime',
    unlockAnimation: 'sparkle',
    shareableText: 'Empecé 🎬',
  },
  {
    id: 'diez-posts',
    name: '10 piezas',
    description: 'Publicaste 10 posts',
    category: 'contenido',
    rarity: 'común',
    emoji: '✏️',
    badgeIcon: 'pencil',
    flavorText: 'La consistencia es difícil. Lo estás haciendo.',
    unlockCondition: 'Publicar 10+ posts',
    evaluator: () => getAccountSummary().totalPosts >= 10,
    points: 20,
    hidden: false,
    unlockSound: 'common-chime',
    unlockAnimation: 'sparkle',
    shareableText: '10 piezas publicadas ✏️',
  },
  {
    id: 'cien-posts',
    name: 'Productor',
    description: '100 posts publicados',
    category: 'contenido',
    rarity: 'rara',
    emoji: '🎯',
    badgeIcon: 'target',
    flavorText: 'Cien piezas. Cien chances de ser visto.',
    unlockCondition: 'Publicar 100+ posts',
    evaluator: () => getAccountSummary().totalPosts >= 100,
    points: 150,
    hidden: false,
    unlockSound: 'rare-fanfare',
    unlockAnimation: 'confetti-burst',
    shareableText: '100 posts 🎯',
  },
  {
    id: 'mil-posts',
    name: 'Maquinista',
    description: '1000 posts publicados',
    category: 'contenido',
    rarity: 'épica',
    emoji: '⚙️',
    badgeIcon: 'gear',
    flavorText: 'Tu cuenta es una máquina. Y la manejás.',
    unlockCondition: 'Publicar 1000+ posts',
    evaluator: () => getAccountSummary().totalPosts >= 1000,
    points: 800,
    hidden: false,
    unlockSound: 'epic-orchestra',
    unlockAnimation: 'star-explosion',
    shareableText: '1000 piezas publicadas ⚙️',
  },
  {
    id: 'top-performer-uno',
    name: 'Tu Primer Top',
    description: 'Tu primer post top performer',
    category: 'contenido',
    rarity: 'común',
    emoji: '🌟',
    badgeIcon: 'star-twinkle',
    flavorText: 'Algo conectó. Recordalo.',
    unlockCondition: 'Tener 1+ post marcado como top performer',
    evaluator: () => getTopPerformers().length >= 1,
    points: 25,
    hidden: false,
    unlockSound: 'common-chime',
    unlockAnimation: 'sparkle',
    shareableText: 'Mi primer top post 🌟',
  },
  {
    id: 'top-performer-cinco',
    name: 'Quinto Top',
    description: '5 posts top performers',
    category: 'contenido',
    rarity: 'rara',
    emoji: '⭐',
    badgeIcon: 'stars',
    flavorText: 'No fue suerte. Es patrón.',
    unlockCondition: 'Tener 5+ top performers',
    evaluator: () => getTopPerformers().length >= 5,
    points: 100,
    hidden: false,
    unlockSound: 'rare-fanfare',
    unlockAnimation: 'confetti-burst',
    shareableText: '5 top posts ⭐',
  },
  {
    id: 'stories-diaria',
    name: 'Story Daily',
    description: '7 días seguidos publicando stories',
    category: 'contenido',
    rarity: 'rara',
    emoji: '📱',
    badgeIcon: 'phone',
    flavorText: 'Estar todos los días no es fácil. Vos sí.',
    unlockCondition: '7 días consecutivos con stories',
    evaluator: (): boolean => {
      const stories = getStoriesSnapshot();
      return stories.publishedLast7Days >= 21; // 3/día x 7
    },
    points: 70,
    hidden: false,
    unlockSound: 'rare-fanfare',
    unlockAnimation: 'confetti-burst',
    shareableText: '7 días de stories diarias 📱',
  },

  // ── COMUNIDAD ───────────────────────────────────────────────────────────────
  {
    id: 'primera-respuesta',
    name: 'Primera Respuesta',
    description: 'Respondiste tu primer DM',
    category: 'comunidad',
    rarity: 'común',
    emoji: '💬',
    badgeIcon: 'message-circle',
    flavorText: 'Empezó la conversación.',
    unlockCondition: 'Responder al menos 1 DM',
    evaluator: (): boolean => {
      const inbox = getInboxSnapshot();
      return inbox.totalActive >= 1;
    },
    points: 5,
    hidden: false,
    unlockSound: 'common-chime',
    unlockAnimation: 'sparkle',
    shareableText: '',
  },
  {
    id: 'cien-respuestas',
    name: 'Conversador',
    description: '100 DMs respondidos',
    category: 'comunidad',
    rarity: 'rara',
    emoji: '🗣️',
    badgeIcon: 'speech',
    flavorText: 'Cada DM contestado es un voto de confianza.',
    unlockCondition: 'Responder 100+ DMs',
    evaluator: (): boolean => {
      const inbox = getInboxSnapshot();
      // approx: si hay >100 conversations totales con respuesta nuestra
      return inbox.totalActive >= 100;
    },
    points: 50,
    hidden: false,
    unlockSound: 'rare-fanfare',
    unlockAnimation: 'confetti-burst',
    shareableText: '100 conversaciones 🗣️',
  },
  {
    id: 'primer-embajador',
    name: 'Tu Primer Embajador',
    description: 'Promoviste un fan a tier embajador',
    category: 'comunidad',
    rarity: 'rara',
    emoji: '🤝',
    badgeIcon: 'handshake',
    flavorText: 'Alguien defiende tu marca sin que se lo pidas.',
    unlockCondition: '1+ fan en tier "embajador"',
    evaluator: (): boolean => {
      const fans = getFanSnapshot();
      return (fans.byTier.embajador ?? 0) >= 1;
    },
    points: 80,
    hidden: false,
    unlockSound: 'rare-fanfare',
    unlockAnimation: 'confetti-burst',
    shareableText: '',
  },
  {
    id: 'diez-superfans',
    name: 'Núcleo Caliente',
    description: '10 super-fans activos',
    category: 'comunidad',
    rarity: 'épica',
    emoji: '💛',
    badgeIcon: 'heart-pulse',
    flavorText: 'Diez personas hablan de vos sin que las pinches.',
    unlockCondition: '10+ super-fans',
    evaluator: (): boolean => {
      const fans = getFanSnapshot();
      return (fans.byTier['super-fan'] ?? 0) >= 10;
    },
    points: 200,
    hidden: false,
    unlockSound: 'epic-orchestra',
    unlockAnimation: 'star-explosion',
    shareableText: '10 super-fans 💛',
  },

  // ── VENTAS ──────────────────────────────────────────────────────────────────
  {
    id: 'primer-lead',
    name: 'Primer Lead',
    description: 'Detectaste tu primer lead calificado',
    category: 'ventas',
    rarity: 'común',
    emoji: '🎯',
    badgeIcon: 'target',
    flavorText: 'Detrás de cada lead hay una vida.',
    unlockCondition: 'Crear 1+ lead en pipeline',
    evaluator: (): boolean => {
      const pipeline = getPipelineSnapshot();
      return pipeline.totalLeads >= 1;
    },
    points: 15,
    hidden: false,
    unlockSound: 'common-chime',
    unlockAnimation: 'sparkle',
    shareableText: '',
  },
  {
    id: 'primer-cierre',
    name: 'Primera Venta',
    description: 'Tu primera venta cerrada',
    category: 'ventas',
    rarity: 'rara',
    emoji: '💰',
    badgeIcon: 'money-bag',
    flavorText: 'El primer cliente nunca se olvida.',
    unlockCondition: '1+ lead en stage "won"',
    evaluator: (): boolean => {
      const pipeline = getPipelineSnapshot();
      return (pipeline.byStage.won ?? 0) >= 1;
    },
    points: 100,
    hidden: false,
    unlockSound: 'rare-fanfare',
    unlockAnimation: 'confetti-burst',
    shareableText: 'Primera venta cerrada 💰',
  },
  {
    id: 'mil-usd',
    name: 'Mil dólares',
    description: 'Facturaste $1000+ acumulados',
    category: 'ventas',
    rarity: 'rara',
    emoji: '💵',
    badgeIcon: 'cash',
    flavorText: 'Mil USD. Empieza lo serio.',
    unlockCondition: 'Revenue acumulado >= $1000',
    evaluator: (): boolean => {
      const pipeline = getPipelineSnapshot();
      return pipeline.revenueLast30Days >= 1000;
    },
    points: 200,
    hidden: false,
    unlockSound: 'rare-fanfare',
    unlockAnimation: 'confetti-burst',
    shareableText: '',
  },
  {
    id: 'diez-mil-usd',
    name: '$10K',
    description: 'Cinco cifras facturadas',
    category: 'ventas',
    rarity: 'épica',
    emoji: '💎',
    badgeIcon: 'gem',
    flavorText: 'Diez mil USD significa que tu marca convierte.',
    unlockCondition: 'Revenue >= $10K',
    evaluator: (): boolean => {
      const pipeline = getPipelineSnapshot();
      return pipeline.revenueLast30Days >= 10000;
    },
    points: 600,
    hidden: false,
    unlockSound: 'epic-orchestra',
    unlockAnimation: 'star-explosion',
    shareableText: '',
  },

  // ── RITUALES ────────────────────────────────────────────────────────────────
  {
    id: 'primer-dia-completo',
    name: 'Día Completo',
    description: 'Usaste el sistema un día entero',
    category: 'rituales',
    rarity: 'común',
    emoji: '☀️',
    badgeIcon: 'sun',
    flavorText: 'Un día con vos. Mil más por venir.',
    unlockCondition: 'Login en mañana, tarde y noche del mismo día',
    evaluator: () => true, // simplificado
    points: 10,
    hidden: false,
    unlockSound: 'common-chime',
    unlockAnimation: 'sparkle',
    shareableText: '',
  },
  {
    id: 'fundador-mes',
    name: 'Mes Founder',
    description: '30 días usando FeedIA',
    category: 'rituales',
    rarity: 'rara',
    emoji: '📅',
    badgeIcon: 'calendar',
    flavorText: 'Un mes con FeedIA. Estás cambiando hábitos.',
    unlockCondition: '30 días activos',
    evaluator: (): boolean => {
      const last30 = getRecentDailyMetrics(30);
      return last30.length >= 30;
    },
    points: 80,
    hidden: false,
    unlockSound: 'rare-fanfare',
    unlockAnimation: 'confetti-burst',
    shareableText: '',
  },
  {
    id: 'fundador-año',
    name: 'Un Año Juntos',
    description: '365 días con el sistema',
    category: 'rituales',
    rarity: 'legendaria',
    emoji: '🌍',
    badgeIcon: 'globe',
    flavorText: 'Un año entero. Mirá hasta dónde llegaste.',
    unlockCondition: '365 días activos',
    evaluator: (): boolean => {
      const all = getRecentDailyMetrics(400);
      return all.length >= 365;
    },
    points: 1500,
    hidden: false,
    unlockSound: 'legendary-choir',
    unlockAnimation: 'phoenix-rise',
    shareableText: 'Un año con FeedIA 🌍',
  },

  // ── MAESTRÍA ────────────────────────────────────────────────────────────────
  {
    id: 'primer-workflow',
    name: 'Primer Workflow',
    description: 'Ejecutaste tu primer workflow',
    category: 'maestría',
    rarity: 'común',
    emoji: '⚡',
    badgeIcon: 'bolt',
    flavorText: 'Le diste cuerda al sistema.',
    unlockCondition: 'Ejecutar 1+ workflow',
    evaluator: () => true,
    points: 10,
    hidden: false,
    unlockSound: 'common-chime',
    unlockAnimation: 'sparkle',
    shareableText: '',
  },
  {
    id: 'goal-completado',
    name: 'Goal Completado',
    description: 'Cumpliste tu primera meta',
    category: 'maestría',
    rarity: 'rara',
    emoji: '🏁',
    badgeIcon: 'flag',
    flavorText: 'Lo dijiste. Lo hiciste.',
    unlockCondition: 'Completar 1+ meta',
    evaluator: () => listGoals({ status: 'completed' }).length >= 1,
    points: 50,
    hidden: false,
    unlockSound: 'rare-fanfare',
    unlockAnimation: 'confetti-burst',
    shareableText: '',
  },
  {
    id: 'cinco-goals',
    name: 'Cumplidor',
    description: '5 metas completadas',
    category: 'maestría',
    rarity: 'épica',
    emoji: '🎖️',
    badgeIcon: 'medal',
    flavorText: 'Cinco veces te propusiste algo. Cinco veces lo hiciste.',
    unlockCondition: 'Completar 5+ metas',
    evaluator: () => listGoals({ status: 'completed' }).length >= 5,
    points: 250,
    hidden: false,
    unlockSound: 'epic-orchestra',
    unlockAnimation: 'star-explosion',
    shareableText: '',
  },
  {
    id: 'todas-categorias',
    name: 'Polifacético',
    description: 'Desbloqueaste al menos 1 logro en cada categoría',
    category: 'maestría',
    rarity: 'épica',
    emoji: '🎭',
    badgeIcon: 'mask',
    flavorText: 'No te quedaste en una sola área. Todas te interesan.',
    unlockCondition: 'Al menos 1 logro de cada categoría',
    evaluator: (): boolean => {
      const store = loadStore();
      const cats: AchievementCategory[] = [
        'crecimiento',
        'engagement',
        'contenido',
        'comunidad',
        'ventas',
        'rituales',
        'maestría',
      ];
      return cats.every((c) => store.byCategory[c] >= 1);
    },
    points: 400,
    hidden: false,
    unlockSound: 'epic-orchestra',
    unlockAnimation: 'star-explosion',
    shareableText: '',
  },
  {
    id: 'boost-master',
    name: 'Boost Master',
    description: '10+ boosts post-publicación con lift positivo',
    category: 'maestría',
    rarity: 'rara',
    emoji: '🚀',
    badgeIcon: 'rocket-launch',
    flavorText: 'Sabés sacar el jugo a la ventana del algoritmo.',
    unlockCondition: '10+ boosts exitosos',
    evaluator: (): boolean => {
      const stats = getBoostStats();
      return stats.successful >= 10;
    },
    points: 120,
    hidden: false,
    unlockSound: 'rare-fanfare',
    unlockAnimation: 'confetti-burst',
    shareableText: '',
  },

  // ── ESPECIALES (hidden, easter eggs) ────────────────────────────────────────
  {
    id: 'noche-creativa',
    name: 'Búho Creativo',
    description: 'Publicaste algo después de medianoche',
    category: 'especiales',
    rarity: 'común',
    emoji: '🦉',
    badgeIcon: 'owl',
    flavorText: 'Las mejores ideas vienen tarde.',
    unlockCondition: '???',
    evaluator: (): boolean => {
      const posts = getRecentPosts(60);
      return posts.some((p) => {
        const h = new Date(p.publishedAt).getHours();
        return h >= 0 && h < 4;
      });
    },
    points: 25,
    hidden: true,
    unlockSound: 'common-chime',
    unlockAnimation: 'sparkle',
    shareableText: '',
  },
  {
    id: 'viernes-13',
    name: 'Viernes 13',
    description: 'Publicaste un viernes 13',
    category: 'especiales',
    rarity: 'rara',
    emoji: '🔮',
    badgeIcon: 'crystal-ball',
    flavorText: 'No hay supersticiones cuando hay valor real.',
    unlockCondition: '???',
    evaluator: (): boolean => {
      const posts = getRecentPosts(365);
      return posts.some((p) => {
        const d = new Date(p.publishedAt);
        return d.getDay() === 5 && d.getDate() === 13;
      });
    },
    points: 35,
    hidden: true,
    unlockSound: 'rare-fanfare',
    unlockAnimation: 'confetti-burst',
    shareableText: '',
  },
  {
    id: 'cero-pendientes',
    name: 'Inbox Zero',
    description: 'Cero conversaciones pendientes',
    category: 'especiales',
    rarity: 'rara',
    emoji: '🧘',
    badgeIcon: 'lotus',
    flavorText: 'La paz mental viene de no tener pendientes.',
    unlockCondition: '???',
    evaluator: (): boolean => {
      const inbox = getInboxSnapshot();
      return inbox.needingResponse === 0 && inbox.totalActive > 10;
    },
    points: 40,
    hidden: true,
    unlockSound: 'rare-fanfare',
    unlockAnimation: 'sparkle',
    shareableText: 'Inbox zero 🧘',
  },
  {
    id: 'comeback',
    name: 'Renacer',
    description: 'Volviste después de mucho tiempo',
    category: 'especiales',
    rarity: 'épica',
    emoji: '🔥',
    badgeIcon: 'phoenix-feather',
    flavorText: 'Los que vuelven, vuelven más fuertes.',
    unlockCondition: '???',
    evaluator: () => false, // se trigger manual al detectar comeback
    points: 100,
    hidden: true,
    unlockSound: 'epic-orchestra',
    unlockAnimation: 'phoenix-rise',
    shareableText: '',
  },
];

// ── Evaluación de achievements ────────────────────────────────────────────────

export const evaluateAchievements = async (brand: BrandProfile): Promise<UnlockedAchievement[]> => {
  const store = loadStore();
  const alreadyUnlocked = new Set(store.unlocked.map((u) => u.achievementId));
  const newUnlocks: UnlockedAchievement[] = [];

  for (const def of ACHIEVEMENTS) {
    if (alreadyUnlocked.has(def.id)) continue;
    try {
      const ok = await def.evaluator();
      if (ok) {
        const unlock: UnlockedAchievement = {
          achievementId: def.id,
          unlockedAt: new Date().toISOString(),
          shared: false,
          acknowledged: false,
        };
        store.unlocked.push(unlock);
        store.totalPoints += def.points;
        store.byCategory[def.category]++;
        store.byRarity[def.rarity]++;
        newUnlocks.push(unlock);
        log.info(`[Achievements] 🏆 Desbloqueado: ${def.name} (${def.rarity}, ${def.points}pts)`);

        // Alerta inmediata para épicos / legendarios / míticos
        if (def.rarity === 'épica' || def.rarity === 'legendaria' || def.rarity === 'mítica') {
          await sendAlert({
            severity: 'info',
            title: `${def.emoji} Logro ${def.rarity}: ${def.name}`,
            body: `${def.description}\n\n"${def.flavorText}"\n\n+${def.points} puntos`,
            metadata: { achievementId: def.id, rarity: def.rarity, brand: brand.name },
          }).catch(() => undefined);
        }
      }
    } catch (err) {
      log.debug(`[Achievements] Eval falló para ${def.id}: ${(err as Error).message}`);
    }
  }

  if (newUnlocks.length > 0) {
    store.lastUnlockedAt = new Date().toISOString();
  }
  store.lastEvaluatedAt = new Date().toISOString();
  saveStore(store);

  return newUnlocks;
};

// ── Consultas ────────────────────────────────────────────────────────────────

export const getAllAchievements = (): AchievementDefinition[] => ACHIEVEMENTS;

export const getUnlockedAchievements = (): Array<AchievementDefinition & UnlockedAchievement> => {
  const store = loadStore();
  return store.unlocked
    .map((u) => {
      const def = ACHIEVEMENTS.find((a) => a.id === u.achievementId);
      return def ? { ...def, ...u } : null;
    })
    .filter((x): x is AchievementDefinition & UnlockedAchievement => x !== null)
    .sort((a, b) => b.unlockedAt.localeCompare(a.unlockedAt));
};

export const getAchievementsByCategory = (category: AchievementCategory): AchievementDefinition[] =>
  ACHIEVEMENTS.filter((a) => a.category === category);

export const getProgressTowardNext = (): Array<{ achievement: AchievementDefinition; progressHint: string }> => {
  const store = loadStore();
  const unlocked = new Set(store.unlocked.map((u) => u.achievementId));
  const next = ACHIEVEMENTS.filter((a) => !unlocked.has(a.id) && !a.hidden);
  const last = getRecentDailyMetrics(60).pop();
  const followers = last?.followers ?? 0;

  return next.slice(0, 5).map((a) => {
    let hint = a.unlockCondition;
    if (a.id === 'club-mil' && followers < 1000) hint = `${followers}/1000 seguidores`;
    if (a.id === 'cinco-mil' && followers < 5000) hint = `${followers}/5000 seguidores`;
    if (a.id === 'diez-mil' && followers < 10000) hint = `${followers}/10000 seguidores`;
    if (a.id === 'cien-mil' && followers < 100000) hint = `${followers}/100000 seguidores`;
    return { achievement: a, progressHint: hint };
  });
};

export const getAchievementsSnapshot = (): {
  totalUnlocked: number;
  totalAvailable: number;
  totalPoints: number;
  byCategory: AchievementsStore['byCategory'];
  byRarity: AchievementsStore['byRarity'];
  completionPct: number;
  rareUnlocked: number;
  epicUnlocked: number;
  legendaryUnlocked: number;
  mythicUnlocked: number;
  lastUnlocked?: { name: string; at: string };
} => {
  const store = loadStore();
  const lastUnlock = store.unlocked[store.unlocked.length - 1];
  const lastDef = lastUnlock ? ACHIEVEMENTS.find((a) => a.id === lastUnlock.achievementId) : null;

  return {
    totalUnlocked: store.unlocked.length,
    totalAvailable: ACHIEVEMENTS.length,
    totalPoints: store.totalPoints,
    byCategory: store.byCategory,
    byRarity: store.byRarity,
    completionPct: (store.unlocked.length / ACHIEVEMENTS.length) * 100,
    rareUnlocked: store.byRarity.rara,
    epicUnlocked: store.byRarity.épica,
    legendaryUnlocked: store.byRarity.legendaria,
    mythicUnlocked: store.byRarity.mítica,
    lastUnlocked: lastDef && lastUnlock ? { name: lastDef.name, at: lastUnlock.unlockedAt } : undefined,
  };
};

export const markAchievementShared = (achievementId: string): boolean => {
  const store = loadStore();
  const unlock = store.unlocked.find((u) => u.achievementId === achievementId);
  if (!unlock) return false;
  unlock.shared = true;
  saveStore(store);
  return true;
};

export const markAchievementAcknowledged = (achievementId: string): boolean => {
  const store = loadStore();
  const unlock = store.unlocked.find((u) => u.achievementId === achievementId);
  if (!unlock) return false;
  unlock.acknowledged = true;
  saveStore(store);
  return true;
};

export const getUnacknowledgedAchievements = (): Array<AchievementDefinition & UnlockedAchievement> =>
  getUnlockedAchievements().filter((a) => !a.acknowledged);

// ── Trigger manual (para easter eggs especiales) ────────────────────────────

export const manuallyUnlock = (achievementId: string, context?: string): boolean => {
  const store = loadStore();
  if (store.unlocked.some((u) => u.achievementId === achievementId)) return false;
  const def = ACHIEVEMENTS.find((a) => a.id === achievementId);
  if (!def) return false;
  store.unlocked.push({
    achievementId,
    unlockedAt: new Date().toISOString(),
    context,
    shared: false,
    acknowledged: false,
  });
  store.totalPoints += def.points;
  store.byCategory[def.category]++;
  store.byRarity[def.rarity]++;
  saveStore(store);
  log.info(`[Achievements] Manualmente desbloqueado: ${def.name}`);
  return true;
};

export const exportAchievementsState = (): AchievementsStore => loadStore();
