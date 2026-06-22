/**
 * Home Dashboard de FeedIA — "bienvenido a casa".
 *
 * La primera vista que el usuario ve al entrar. Personalizada, viva, con
 * pequeños detalles que dicen "este lugar es tuyo". Cada elemento responde
 * a la hora del día, su humor, sus logros recientes.
 *
 * Filosofía: como abrir tu casa después del trabajo. Las luces ya están
 * prendidas. La música suena bajito. Hay algo rico en la mesa. Bienvenido.
 */

import { log } from '../../agent/logger.js';
import { askJson as routerAskJson, ask as routerAsk } from '../../agent/tokenRouter.js';
import { getPersonalization } from './personalizationEngine.js';
import { hasCompletedOnboarding, getRandomCompliment, generateReturnGreeting } from './welcomeExperience.js';
import { getAccountSummary, getRecentPosts } from '../analytics/performanceDB.js';
import { getCurrentProgress, getRecentDailyMetrics, getMilestones } from '../growth/growthEngine.js';
import { getActiveGoals } from '../goals/goalManager.js';
import { getInboxSnapshot } from '../community/dmInbox.js';
import { getPipelineSnapshot } from '../community/leadPipeline.js';
import { getMentionsSnapshot } from '../community/mentionTracker.js';
import type { BrandProfile } from '../../config/types.js';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type TimeOfDay =
  | 'madrugada'
  | 'mañana-temprano'
  | 'mañana'
  | 'mediodía'
  | 'tarde'
  | 'tarde-final'
  | 'noche'
  | 'noche-tarde';
export type SystemMood = 'celebratorio' | 'positivo' | 'tranquilo' | 'expectante' | 'alerta' | 'reflexivo';

export interface PersonalGreeting {
  headline: string; // "Buenos días, Lucas"
  subline: string; // "El miércoles arranca bien"
  bodyMessage: string; // 2-3 líneas cálidas
  emoji: string;
  mood: SystemMood;
  timeOfDay: TimeOfDay;
  isReturningUser: boolean;
  daysSinceLastVisit?: number;
}

export interface HomeCard {
  id: string;
  type: 'kpi' | 'event' | 'task' | 'celebration' | 'alert' | 'nudge' | 'tip' | 'memory' | 'next-up' | 'team-update';
  title: string;
  subtitle?: string;
  body: string;
  visualHint: string; // qué animación/icono
  cta?: { label: string; action: string };
  priority: 'pinned' | 'high' | 'normal' | 'low';
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export interface HomeDashboard {
  generatedAt: string;
  brandName: string;
  greeting: PersonalGreeting;
  cards: HomeCard[]; // ordenadas por prioridad
  ambientNote?: string; // pequeño detalle del fondo ("Está lloviendo afuera")
  whileYouWereAway?: {
    summary: string;
    bullets: string[];
    hoursAway: number;
  };
  nextThreeHours: Array<{
    at: string;
    what: string;
    type: 'auto' | 'scheduled' | 'recommended';
  }>;
  weekProgress: {
    daysElapsed: number;
    totalDays: number;
    completionPct: number;
    pace: 'adelantado' | 'on-track' | 'atrasado';
  };
}

// ── Time of day helpers ───────────────────────────────────────────────────────

const getTimeOfDay = (date = new Date()): TimeOfDay => {
  const h = date.getHours();
  if (h >= 0 && h < 5) return 'madrugada';
  if (h >= 5 && h < 8) return 'mañana-temprano';
  if (h >= 8 && h < 12) return 'mañana';
  if (h >= 12 && h < 14) return 'mediodía';
  if (h >= 14 && h < 18) return 'tarde';
  if (h >= 18 && h < 20) return 'tarde-final';
  if (h >= 20 && h < 23) return 'noche';
  return 'noche-tarde';
};

const greetingForTimeOfDay = (tod: TimeOfDay, ownerNickname?: string): { greet: string; emoji: string } => {
  const name = ownerNickname ?? '';
  switch (tod) {
    case 'madrugada':
      return { greet: `Todavía estás acá${name ? ', ' + name : ''}`, emoji: '🌙' };
    case 'mañana-temprano':
      return { greet: `Tempranero${name ? ', ' + name : ''}`, emoji: '🌅' };
    case 'mañana':
      return { greet: `Buenos días${name ? ', ' + name : ''}`, emoji: '☀️' };
    case 'mediodía':
      return { greet: `Buen mediodía${name ? ', ' + name : ''}`, emoji: '🌞' };
    case 'tarde':
      return { greet: `Buenas tardes${name ? ', ' + name : ''}`, emoji: '⛅' };
    case 'tarde-final':
      return { greet: `Cae la tarde${name ? ', ' + name : ''}`, emoji: '🌇' };
    case 'noche':
      return { greet: `Buenas noches${name ? ', ' + name : ''}`, emoji: '🌃' };
    case 'noche-tarde':
      return { greet: `Ya es tarde${name ? ', ' + name : ''}`, emoji: '🌌' };
  }
};

// ── Mood detection ────────────────────────────────────────────────────────────

const detectSystemMood = (): SystemMood => {
  const summary = getAccountSummary();
  const progress = getCurrentProgress();
  const milestones = getMilestones(5);
  const recentMilestoneHours =
    milestones.length > 0 ? (Date.now() - new Date(milestones[0]!.achievedAt).getTime()) / 3600000 : 999;

  if (recentMilestoneHours < 24) return 'celebratorio';
  if (summary.trend === 'mejorando' && progress.onTrack) return 'positivo';
  if (summary.trend === 'bajando' || !progress.onTrack) return 'alerta';
  if (progress.daysRemaining < 3 && progress.goal) return 'expectante';
  return 'tranquilo';
};

// ── Greeting personalizado ────────────────────────────────────────────────────

export const buildPersonalGreeting = async (
  userId: string,
  brand: BrandProfile,
  lastVisitAt?: string,
): Promise<PersonalGreeting> => {
  const personalization = getPersonalization(userId);
  const tod = getTimeOfDay();
  const mood = detectSystemMood();
  const baseGreet = greetingForTimeOfDay(tod, personalization?.ownerNickname);
  const daysSinceLastVisit = lastVisitAt ? Math.floor((Date.now() - new Date(lastVisitAt).getTime()) / 86400000) : 0;

  const isReturningUser = hasCompletedOnboarding(userId);

  if (!isReturningUser) {
    return {
      headline: `${baseGreet.greet}`,
      subline: 'Tu nuevo hogar te está esperando',
      bodyMessage: 'Vamos a configurarlo juntos. Toma unos minutos. Vale cada segundo.',
      emoji: baseGreet.emoji,
      mood: 'positivo',
      timeOfDay: tod,
      isReturningUser: false,
    };
  }

  // Si volvió después de 3+ días, dar saludo especial
  if (daysSinceLastVisit >= 3) {
    const returnMsg = await generateReturnGreeting(brand, daysSinceLastVisit);
    return {
      headline: `${baseGreet.greet}`,
      subline: returnMsg,
      bodyMessage: '',
      emoji: '👋',
      mood: 'positivo',
      timeOfDay: tod,
      isReturningUser: true,
      daysSinceLastVisit,
    };
  }

  // Greeting normal con IA
  const summary = getAccountSummary();
  const progress = getCurrentProgress();

  const prompt = `Generá un saludo personal cálido para el dueño de @${brand.name} entrando a su panel.

Hora del día: ${tod}
Mood del sistema: ${mood}
Estado de la cuenta:
- Trend: ${summary.trend}
- Engagement: ${summary.avgEngagementRate.toFixed(2)}%
- Total posts: ${summary.totalPosts}
- Velocidad de crecimiento: ${progress.velocity.current.toFixed(1)} seguidores/día
- En camino a la meta: ${progress.onTrack}

Personalización:
- Apodo del dueño: ${personalization?.ownerNickname ?? '(sin apodo)'}
- Tono preferido: ${personalization?.voicePersonality ?? 'amistosa'}
- Sistema se llama: ${personalization?.systemName ?? 'Talía'}

JSON:
{
  "subline": "1 línea de contexto cálido sobre el momento (max 80 chars)",
  "bodyMessage": "2-3 líneas, cálidas, personales, NO genéricas. Mencionar algo concreto del estado actual."
}`;

  const result = await routerAskJson<{ subline: string; bodyMessage: string }>(prompt, {
    taskType: 'response',
    maxTokens: 600,
    systemPrompt: 'Sos un asistente que saluda con calidez real, no template. Sonás humano.',
  }).catch(() => ({
    subline: `${mood === 'celebratorio' ? 'Hay buenas noticias.' : mood === 'alerta' ? 'Tenemos cosas para mirar.' : 'Día normal en tu imperio.'}`,
    bodyMessage: `${baseGreet.greet}. Te tengo el resumen abajo. Hoy preparé las cosas para que arranques bien.`,
  }));

  return {
    headline: baseGreet.greet,
    subline: result.subline,
    bodyMessage: result.bodyMessage,
    emoji: baseGreet.emoji,
    mood,
    timeOfDay: tod,
    isReturningUser: true,
    daysSinceLastVisit,
  };
};

// ── "Mientras dormías" / mientras no estabas ─────────────────────────────────

export const buildWhileYouWereAway = async (lastVisitAt?: string): Promise<HomeDashboard['whileYouWereAway']> => {
  if (!lastVisitAt) return undefined;
  const hoursAway = (Date.now() - new Date(lastVisitAt).getTime()) / 3600000;
  if (hoursAway < 6) return undefined;

  const inbox = getInboxSnapshot();
  const pipeline = getPipelineSnapshot();
  const mentions = getMentionsSnapshot();
  const recentPosts = getRecentPosts(7);
  const lastVisitTime = new Date(lastVisitAt).getTime();
  const newPosts = recentPosts.filter((p) => new Date(p.publishedAt).getTime() >= lastVisitTime);

  const bullets: string[] = [];
  if (newPosts.length > 0) bullets.push(`Se publicaron ${newPosts.length} pieza${newPosts.length > 1 ? 's' : ''}`);
  if (inbox.needingResponse > 0) bullets.push(`${inbox.needingResponse} DMs esperan respuesta`);
  if (pipeline.hotLeads.length > 0)
    bullets.push(`${pipeline.hotLeads.length} hot lead${pipeline.hotLeads.length > 1 ? 's' : ''} entró`);
  if (mentions.totalLast7Days > 0) bullets.push(`${mentions.totalLast7Days} menciones nuevas`);
  if (bullets.length === 0) bullets.push('Todo en calma, sin pendientes urgentes');

  const hoursLabel =
    hoursAway < 12
      ? `${Math.round(hoursAway)} horas`
      : hoursAway < 48
        ? 'desde anoche'
        : `${Math.round(hoursAway / 24)} días`;

  return {
    summary: `Mientras no estabas (${hoursLabel}), pasaron algunas cosas`,
    bullets,
    hoursAway,
  };
};

// ── Building cards ────────────────────────────────────────────────────────────

const buildKPICards = (): HomeCard[] => {
  const cards: HomeCard[] = [];
  const summary = getAccountSummary();
  const progress = getCurrentProgress();
  const last7Metrics = getRecentDailyMetrics(7);
  const followersDelta = last7Metrics.reduce((s, d) => s + d.followersDelta, 0);

  cards.push({
    id: 'kpi-followers-week',
    type: 'kpi',
    title: 'Esta semana',
    body: `${followersDelta >= 0 ? '+' : ''}${followersDelta} seguidores`,
    subtitle: `Velocidad: ${progress.velocity.current.toFixed(1)}/día`,
    visualHint: followersDelta >= 0 ? 'gradient-positive-up' : 'gradient-warning-down',
    priority: 'pinned',
  });

  if (summary.avgEngagementRate > 0) {
    cards.push({
      id: 'kpi-engagement',
      type: 'kpi',
      title: 'Engagement rate',
      body: `${summary.avgEngagementRate.toFixed(2)}%`,
      subtitle: summary.trend === 'mejorando' ? '↑ Mejorando' : summary.trend === 'bajando' ? '↓ Bajando' : '→ Estable',
      visualHint: 'pulse-circle',
      priority: 'high',
    });
  }

  if (progress.goal && progress.projectedAchievementDate) {
    cards.push({
      id: 'kpi-goal-projection',
      type: 'kpi',
      title: 'Proyección de meta',
      body: progress.projectedAchievementDate,
      subtitle: progress.onTrack ? '✓ En camino' : '⚠ Por debajo del ritmo',
      visualHint: progress.onTrack ? 'green-check' : 'amber-warning',
      priority: 'high',
    });
  }

  return cards;
};

const buildCelebrationCards = (): HomeCard[] => {
  const milestones = getMilestones(3);
  const cards: HomeCard[] = [];
  const cutoff = Date.now() - 48 * 3600000;

  for (const m of milestones) {
    if (new Date(m.achievedAt).getTime() < cutoff) continue;
    cards.push({
      id: `celeb-${m.id}`,
      type: 'celebration',
      title: '🎉 Logro nuevo',
      body: m.description,
      subtitle: 'Hace pocas horas',
      visualHint: 'confetti-burst',
      priority: 'high',
      metadata: { milestoneId: m.id },
    });
  }
  return cards;
};

const buildAlertCards = async (): Promise<HomeCard[]> => {
  const cards: HomeCard[] = [];
  const inbox = getInboxSnapshot();
  const pipeline = getPipelineSnapshot();
  const mentions = getMentionsSnapshot();

  if (inbox.escalatedToHuman > 0) {
    cards.push({
      id: 'alert-inbox-escalated',
      type: 'alert',
      title: 'Necesitan tu mano',
      body: `${inbox.escalatedToHuman} conversaciones escaladas a humano`,
      visualHint: 'amber-pulse',
      cta: { label: 'Ver inbox', action: 'route:cm-inbox' },
      priority: 'high',
    });
  }
  if (pipeline.hotLeads.length > 0) {
    cards.push({
      id: 'alert-hot-leads',
      type: 'nudge',
      title: '🔥 Hot leads',
      body: `${pipeline.hotLeads.length} lead${pipeline.hotLeads.length > 1 ? 's' : ''} caliente${pipeline.hotLeads.length > 1 ? 's' : ''} esperando`,
      visualHint: 'fire-glow',
      cta: { label: 'Abrir pipeline', action: 'route:cm-pipeline' },
      priority: 'high',
    });
  }
  if (mentions.unacknowledged.length > 0) {
    const critical = mentions.unacknowledged.filter((m) => m.importance === 'critical').length;
    cards.push({
      id: 'alert-mentions',
      type: 'alert',
      title: critical > 0 ? '⚠ Menciones críticas' : 'Menciones sin acuse',
      body: `${mentions.unacknowledged.length} mention${mentions.unacknowledged.length > 1 ? 'es' : ''} esperan respuesta`,
      visualHint: critical > 0 ? 'red-pulse' : 'orange-soft',
      cta: { label: 'Ver menciones', action: 'route:mentions' },
      priority: critical > 0 ? 'high' : 'normal',
    });
  }

  return cards;
};

const buildNextUpCards = (): HomeCard[] => {
  const cards: HomeCard[] = [];
  const goals = getActiveGoals();
  const closingSoon = goals.filter((g) => {
    const daysLeft = (new Date(g.endsAt).getTime() - Date.now()) / 86400000;
    return daysLeft >= 0 && daysLeft <= 7;
  });

  for (const goal of closingSoon.slice(0, 2)) {
    const daysLeft = Math.ceil((new Date(goal.endsAt).getTime() - Date.now()) / 86400000);
    cards.push({
      id: `next-${goal.id}`,
      type: 'next-up',
      title: goal.title,
      body: `Quedan ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`,
      subtitle: `${goal.progress}% completado · meta ${goal.horizon}`,
      visualHint: 'countdown-circle',
      priority: 'normal',
    });
  }

  return cards;
};

const buildTipCard = async (_brand: BrandProfile): Promise<HomeCard | null> => {
  const tips = [
    'Los primeros 5 comentarios definen el alcance del post. Respondé rápido.',
    'Un caption con pregunta tiene 60% más comentarios que uno declarativo.',
    'Publicar martes y jueves entre 9-11am suele dar 2x alcance vs domingos.',
    'Los carruseles de 8 slides tienen el mejor save rate.',
    'Stories con polls aumentan el reach del próximo post.',
    'Responder DMs en menos de 1h dobla la conversión a venta.',
    'Hashtags de nicho (10-100k) funcionan mejor que los gigantes.',
  ];
  const tip = tips[Math.floor(Math.random() * tips.length)] ?? tips[0]!;

  return {
    id: `tip-${Date.now()}`,
    type: 'tip',
    title: 'Tip del día',
    body: tip,
    visualHint: 'lightbulb-soft',
    priority: 'low',
  };
};

const buildMemoryCard = (): HomeCard | null => {
  const summary = getAccountSummary();
  if (summary.totalPosts < 5) return null;

  return {
    id: `memory-${Date.now()}`,
    type: 'memory',
    title: 'Hace tiempo...',
    body: `Tu cuenta ya tiene ${summary.totalPosts} posts publicados. Mirá hacia atrás de vez en cuando — es un buen recordatorio del camino.`,
    visualHint: 'sepia-soft',
    cta: { label: 'Ver memorabilia', action: 'route:memorabilia' },
    priority: 'low',
  };
};

const buildAmbientNote = (): string | undefined => {
  const hour = new Date().getHours();
  const day = new Date().getDay();
  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  const notes: string[] = [
    `Hoy es ${dayNames[day]}.`,
    hour < 9
      ? 'Las cuentas que crecen, publican entre 9 y 11.'
      : hour > 21
        ? 'Ya es tarde. Si querés dejarlo programado, lo hago.'
        : 'Buen momento del día para crear.',
  ];

  return notes[Math.floor(Math.random() * notes.length)];
};

// ── Next 3 hours plan ─────────────────────────────────────────────────────────

const buildNextThreeHours = (): HomeDashboard['nextThreeHours'] => {
  const hour = new Date().getHours();
  const upcoming: HomeDashboard['nextThreeHours'] = [];

  if (hour < 9) {
    upcoming.push({ at: '09:00', what: 'Procesamiento de inbox (auto)', type: 'auto' });
    upcoming.push({ at: '10:00', what: 'Detección de virales del nicho (auto)', type: 'auto' });
  }
  if (hour < 11) upcoming.push({ at: '11:00', what: 'Story de engagement (auto)', type: 'auto' });
  if (hour < 14) upcoming.push({ at: '14:00', what: 'Story de valor (auto)', type: 'auto' });
  if (hour < 19) upcoming.push({ at: '19:00', what: 'Story comunidad (auto)', type: 'auto' });
  if (hour < 22) upcoming.push({ at: '22:00', what: 'Snapshot diario de comunidad', type: 'auto' });

  return upcoming.slice(0, 4);
};

// ── Week progress ────────────────────────────────────────────────────────────

const buildWeekProgress = (): HomeDashboard['weekProgress'] => {
  const goals = getActiveGoals().filter((g) => g.horizon === 'weekly');
  const now = new Date();
  const dayOfWeek = now.getDay() === 0 ? 7 : now.getDay(); // domingo = 7
  const daysElapsed = dayOfWeek;
  const totalDays = 7;
  const completionPct =
    goals.length > 0 ? goals.reduce((s, g) => s + g.progress, 0) / goals.length : (daysElapsed / totalDays) * 100;
  const expectedPct = (daysElapsed / totalDays) * 100;
  const pace: HomeDashboard['weekProgress']['pace'] =
    completionPct > expectedPct + 10 ? 'adelantado' : completionPct < expectedPct - 10 ? 'atrasado' : 'on-track';

  return { daysElapsed, totalDays, completionPct: Math.round(completionPct), pace };
};

// ── Compositor principal ─────────────────────────────────────────────────────

export const buildHomeDashboard = async (
  userId: string,
  brand: BrandProfile,
  lastVisitAt?: string,
): Promise<HomeDashboard> => {
  log.debug(`[HomeDashboard] Generando para ${userId}`);
  const greeting = await buildPersonalGreeting(userId, brand, lastVisitAt);
  const whileAway = await buildWhileYouWereAway(lastVisitAt);

  const cards: HomeCard[] = [];

  // Alerts y nudges primero
  cards.push(...(await buildAlertCards()));

  // Celebrations
  cards.push(...buildCelebrationCards());

  // KPIs
  cards.push(...buildKPICards());

  // Next up (goals)
  cards.push(...buildNextUpCards());

  // Tip casual
  const tip = await buildTipCard(brand);
  if (tip) cards.push(tip);

  // Memory
  const memory = buildMemoryCard();
  if (memory) cards.push(memory);

  // Ordenar por priority
  const priorityOrder: Record<HomeCard['priority'], number> = { pinned: 0, high: 1, normal: 2, low: 3 };
  cards.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return {
    generatedAt: new Date().toISOString(),
    brandName: brand.name,
    greeting,
    cards,
    ambientNote: buildAmbientNote(),
    whileYouWereAway: whileAway,
    nextThreeHours: buildNextThreeHours(),
    weekProgress: buildWeekProgress(),
  };
};

// ── Variantes según contexto ─────────────────────────────────────────────────

export const buildMinimalHome = async (
  userId: string,
  brand: BrandProfile,
): Promise<{
  greeting: string;
  topThreeCards: HomeCard[];
}> => {
  const full = await buildHomeDashboard(userId, brand);
  return {
    greeting: `${full.greeting.headline}. ${full.greeting.subline}`,
    topThreeCards: full.cards.slice(0, 3),
  };
};

export const buildHomeAsText = async (userId: string, brand: BrandProfile, lastVisitAt?: string): Promise<string> => {
  const dash = await buildHomeDashboard(userId, brand, lastVisitAt);
  const lines: string[] = [];
  lines.push(`${dash.greeting.emoji} ${dash.greeting.headline}`);
  lines.push(`_${dash.greeting.subline}_`);
  lines.push('');
  lines.push(dash.greeting.bodyMessage);
  lines.push('');

  if (dash.whileYouWereAway) {
    lines.push(`### Mientras no estabas`);
    lines.push(dash.whileYouWereAway.summary);
    for (const b of dash.whileYouWereAway.bullets) lines.push(`• ${b}`);
    lines.push('');
  }

  lines.push('### Cards principales');
  for (const card of dash.cards.slice(0, 5)) {
    lines.push(`**${card.title}** — ${card.body}${card.subtitle ? ` (${card.subtitle})` : ''}`);
  }
  lines.push('');

  if (dash.nextThreeHours.length > 0) {
    lines.push('### Próximas horas');
    for (const item of dash.nextThreeHours) {
      lines.push(`${item.at} — ${item.what}`);
    }
  }
  if (dash.ambientNote) {
    lines.push('');
    lines.push(`_${dash.ambientNote}_`);
  }
  return lines.join('\n');
};

// ── Micro-interaction: small surprise ────────────────────────────────────────

export const getDelightMessage = async (brand: BrandProfile): Promise<string> => {
  const random = Math.random();
  if (random < 0.3) return getRandomCompliment(brand);
  if (random < 0.6) return 'Pequeño dato: a esta hora tu audiencia se conecta el doble.';
  return 'Cada vez que entrás, este lugar se siente más tuyo.';
};

// ── Snapshot técnico ─────────────────────────────────────────────────────────

export const getHomeDashboardConfig = (
  userId: string,
): {
  hasPersonalization: boolean;
  hasCompletedOnboarding: boolean;
  systemMood: SystemMood;
  timeOfDay: TimeOfDay;
} => ({
  hasPersonalization: getPersonalization(userId) !== null,
  hasCompletedOnboarding: hasCompletedOnboarding(userId),
  systemMood: detectSystemMood(),
  timeOfDay: getTimeOfDay(),
});

// ── Helper: si llegó tarde, decir algo simpático ─────────────────────────────

export const generateAmbientComment = async (brand: BrandProfile): Promise<string> => {
  const hour = new Date().getHours();
  const day = new Date().getDay();
  const isWeekend = day === 0 || day === 6;

  const prompt = `Generá un comentario corto, cálido, que el sistema le diría al usuario al entrar.

Contexto:
- Hora: ${hour}h
- Día: ${['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][day]}
- ${isWeekend ? 'Fin de semana' : 'Día de semana'}
- Marca: ${brand.name}

Tono: como un buen amigo que te recibe. Sin "buen día" genérico. Algo que solo lo diría alguien que te conoce.

Devolvé SOLO el mensaje, máximo 1 línea, sin prefijo.`;

  return routerAsk(prompt, { taskType: 'response', maxTokens: 100, freeOnly: true })
    .then((r) => r.text.trim())
    .catch(() => `Buen ${hour < 12 ? 'día' : hour < 19 ? 'tarde' : 'noche'} para crear.`);
};
