/**
 * Daily Ritual de FeedIA — rituales matutinos y nocturnos personalizados.
 *
 * El "buenos días" con lo que pasó mientras dormías. El "buenas noches" con el
 * resumen del día y lo que viene mañana. Como el café de tu rutina o ese podcast
 * que escuchás antes de dormir.
 *
 * Filosofía: si el sistema se vuelve parte de tu rutina diaria, es tu hogar.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import { sendAlert } from '../../integrations/notifications.js';
import { askJson as routerAskJson } from '../../agent/tokenRouter.js';
import { getPersonalization } from './personalizationEngine.js';
import { getAccountSummary, getRecentPosts, getTopPerformers } from '../analytics/performanceDB.js';
import { getCurrentProgress, getRecentDailyMetrics, getMilestones } from '../growth/growthEngine.js';
import { getActiveGoals } from '../goals/goalManager.js';
import { getInboxSnapshot } from '../community/dmInbox.js';
import { getPipelineSnapshot } from '../community/leadPipeline.js';
import { getMentionsSnapshot } from '../community/mentionTracker.js';
import type { BrandProfile } from '../../config/types.js';

const RITUAL_PATH = join(process.cwd(), 'data', 'experience', 'rituals.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type RitualType =
  | 'morning'
  | 'evening'
  | 'weekly-monday'
  | 'weekly-friday'
  | 'monthly-first'
  | 'birthday-account';

export interface RitualMessage {
  id: string;
  type: RitualType;
  generatedAt: string;
  scheduledFor: string;
  forBrand: string;
  greeting: string; // saludo inicial
  highlights: string[]; // 3-5 bullets de lo importante
  storyParagraph: string; // párrafo narrativo personal
  preview: string; // qué viene
  closingLine: string; // frase de cierre
  delivered: boolean;
  acknowledged: boolean;
  sentVia: ('alert' | 'voice' | 'email' | 'push')[];
  emotionalTone: 'celebratorio' | 'motivador' | 'reflexivo' | 'preocupado' | 'optimista' | 'íntimo';
}

interface RitualStore {
  version: number;
  messages: RitualMessage[];
  lastUpdated: string;
}

const DEFAULT_STORE: RitualStore = { version: 1, messages: [], lastUpdated: new Date().toISOString() };

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'experience');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadStore = (): RitualStore => {
  try {
    ensureDir();
    if (!existsSync(RITUAL_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(RITUAL_PATH, 'utf8')) as RitualStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveStore = (store: RitualStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(RITUAL_PATH, JSON.stringify(store, null, 2), 'utf8');
};

// ── Recolección de datos del momento ─────────────────────────────────────────

interface DayDigest {
  followersDelta: number;
  postsPublished: number;
  topPostHook?: string;
  totalReach: number;
  totalEngagement: number;
  inboxPending: number;
  inboxNew: number;
  hotLeads: number;
  newMentions: number;
  milestoneToday: string | null;
  goalsCompleted: number;
  goalsAtRisk: number;
}

const buildDayDigest = (date: Date): DayDigest => {
  const dateStr = date.toISOString().split('T')[0]!;
  const dayMetrics = getRecentDailyMetrics(7).find((d) => d.date === dateStr);
  const todayPosts = getRecentPosts(2).filter((p) => p.publishedAt.startsWith(dateStr));
  const topPost = getTopPerformers(undefined, 1)[0];
  const inbox = getInboxSnapshot();
  const pipeline = getPipelineSnapshot();
  const mentions = getMentionsSnapshot();
  const milestones = getMilestones(5);
  const todayMilestone = milestones.find((m) => m.achievedAt.startsWith(dateStr));
  const activeGoals = getActiveGoals();

  return {
    followersDelta: dayMetrics?.followersDelta ?? 0,
    postsPublished: todayPosts.length,
    topPostHook: topPost?.hookText,
    totalReach: todayPosts.reduce((s, p) => s + p.metrics.reach, 0),
    totalEngagement: todayPosts.reduce((s, p) => s + p.metrics.likes + p.metrics.comments + p.metrics.saves, 0),
    inboxPending: inbox.needingResponse,
    inboxNew: inbox.byStatus['new'] ?? 0,
    hotLeads: pipeline.hotLeads.length,
    newMentions: mentions.totalLast7Days > 0 ? Math.round(mentions.totalLast7Days / 7) : 0,
    milestoneToday: todayMilestone?.description ?? null,
    goalsCompleted: activeGoals.filter((g) => g.progress >= 100).length,
    goalsAtRisk: activeGoals.filter((g) => g.progress < 50 && new Date(g.endsAt).getTime() - Date.now() < 3 * 86400000)
      .length,
  };
};

// ── Generación de ritual matutino ─────────────────────────────────────────────

export const buildMorningRitual = async (brand: BrandProfile, userId: string): Promise<RitualMessage> => {
  const yesterday = new Date(Date.now() - 86400000);
  const digest = buildDayDigest(yesterday);
  const personalization = getPersonalization(userId);
  const greetingName = personalization?.ownerNickname ?? brand.name;
  const systemName = personalization?.systemName ?? 'Talía';
  const tone = personalization?.voicePersonality ?? 'amistosa';

  // Determinar tono emocional según los datos
  let emotionalTone: RitualMessage['emotionalTone'] = 'optimista';
  if (digest.milestoneToday) emotionalTone = 'celebratorio';
  else if (digest.followersDelta < -5) emotionalTone = 'preocupado';
  else if (digest.followersDelta > 20) emotionalTone = 'celebratorio';
  else if (digest.goalsAtRisk > 0) emotionalTone = 'motivador';

  const prompt = `Soy ${systemName}, asistente personal de Instagram de @${brand.name}. Genero el ritual matutino para mi dueño.

Tono de voz preferido: ${tone}
Tono emocional del día: ${emotionalTone}

DATOS DE AYER:
- Seguidores: ${digest.followersDelta >= 0 ? '+' : ''}${digest.followersDelta}
- Posts publicados: ${digest.postsPublished}
- Top post de la cuenta: "${digest.topPostHook ?? '(sin top)'}"
- Alcance del día: ${digest.totalReach.toLocaleString('es-AR')}
- DMs pendientes: ${digest.inboxPending}
- Leads calientes: ${digest.hotLeads}
- Menciones nuevas: ${digest.newMentions}
- Hito alcanzado: ${digest.milestoneToday ?? 'ninguno'}
- Metas en riesgo: ${digest.goalsAtRisk}

Generá el mensaje matutino. Debe sentirse como un amigo cercano que te trae el café y te resume lo importante. NO sonar a reporte corporativo.

JSON:
{
  "greeting": "Saludo inicial cálido y personal (max 1 línea)",
  "highlights": ["3-4 bullets cortos con lo más importante de ayer"],
  "storyParagraph": "2-3 líneas narrativas con la historia del día anterior, lo que más destaca",
  "preview": "1 línea de qué viene hoy",
  "closingLine": "Frase de cierre cálida"
}`;

  const result = await routerAskJson<{
    greeting: string;
    highlights: string[];
    storyParagraph: string;
    preview: string;
    closingLine: string;
  }>(prompt, {
    taskType: 'response',
    maxTokens: 1500,
    systemPrompt:
      'Sos un asistente personal con calidez real. NO usás templates ni frases corporativas. Hablás con afecto auténtico.',
  }).catch(() => ({
    greeting: `Buenos días, ${greetingName}.`,
    highlights: [
      `${digest.followersDelta >= 0 ? '+' : ''}${digest.followersDelta} seguidores ayer`,
      `${digest.postsPublished} posts publicados`,
      `${digest.inboxPending} DMs te esperan`,
    ],
    storyParagraph: digest.milestoneToday
      ? `Ayer alcanzamos algo importante: ${digest.milestoneToday}. Hoy seguimos.`
      : `Día normal en tu imperio. Te tengo todo listo para arrancar.`,
    preview: `Hoy preparé las cosas para que arranques bien.`,
    closingLine: `Buen día.`,
  }));

  const message: RitualMessage = {
    id: `ritual-morning-${Date.now()}`,
    type: 'morning',
    generatedAt: new Date().toISOString(),
    scheduledFor: new Date().toISOString(),
    forBrand: brand.name,
    greeting: result.greeting,
    highlights: result.highlights,
    storyParagraph: result.storyParagraph,
    preview: result.preview,
    closingLine: result.closingLine,
    delivered: false,
    acknowledged: false,
    sentVia: [],
    emotionalTone,
  };

  const store = loadStore();
  store.messages.push(message);
  if (store.messages.length > 200) store.messages = store.messages.slice(-200);
  saveStore(store);
  return message;
};

// ── Generación de ritual nocturno ─────────────────────────────────────────────

export const buildEveningRitual = async (brand: BrandProfile, userId: string): Promise<RitualMessage> => {
  const today = new Date();
  const digest = buildDayDigest(today);
  const personalization = getPersonalization(userId);
  const greetingName = personalization?.ownerNickname ?? brand.name;
  const systemName = personalization?.systemName ?? 'Talía';
  const tone = personalization?.voicePersonality ?? 'amistosa';

  let emotionalTone: RitualMessage['emotionalTone'] = 'reflexivo';
  if (digest.milestoneToday) emotionalTone = 'celebratorio';
  else if (digest.postsPublished === 0 && digest.followersDelta < 0) emotionalTone = 'preocupado';
  else if (digest.followersDelta > 10 || digest.hotLeads > 0) emotionalTone = 'celebratorio';
  else emotionalTone = 'íntimo';

  const tomorrow = new Date(Date.now() + 86400000);
  const tomorrowGoals = getActiveGoals().filter(
    (g) => new Date(g.endsAt).getTime() - tomorrow.getTime() < 7 * 86400000,
  );

  const prompt = `Soy ${systemName}, asistente personal de @${brand.name}. Genero el resumen nocturno antes de dormir.

Tono: ${tone}
Tono emocional: ${emotionalTone}

LO QUE PASÓ HOY:
- Seguidores: ${digest.followersDelta >= 0 ? '+' : ''}${digest.followersDelta}
- Posts: ${digest.postsPublished}
- Alcance: ${digest.totalReach.toLocaleString('es-AR')}
- Engagement total: ${digest.totalEngagement}
- DMs pendientes: ${digest.inboxPending}
- Hot leads: ${digest.hotLeads}
- Hito: ${digest.milestoneToday ?? 'no hubo hito grande'}

PARA MAÑANA:
- Metas próximas a cerrar: ${tomorrowGoals.length}
- Metas en riesgo: ${digest.goalsAtRisk}

El mensaje debe sentirse como una despedida cálida al final del día. Tranquilizar si fue duro, celebrar si fue bueno. NO informe ejecutivo.

JSON:
{
  "greeting": "Saludo nocturno (max 1 línea)",
  "highlights": ["3-4 bullets de lo que pasó hoy"],
  "storyParagraph": "2-3 líneas narrativas reflexivas sobre el día",
  "preview": "1 línea de qué viene mañana",
  "closingLine": "Despedida cálida"
}`;

  const result = await routerAskJson<{
    greeting: string;
    highlights: string[];
    storyParagraph: string;
    preview: string;
    closingLine: string;
  }>(prompt, {
    taskType: 'response',
    maxTokens: 1500,
    systemPrompt: 'Sos un asistente que despide el día con afecto. Como un familiar que te dice "ya está, descansá".',
  }).catch(() => ({
    greeting: `Cerramos el día, ${greetingName}.`,
    highlights: [
      `${digest.followersDelta >= 0 ? '+' : ''}${digest.followersDelta} seguidores hoy`,
      `${digest.postsPublished} piezas publicadas`,
      `Alcance: ${digest.totalReach.toLocaleString('es-AR')}`,
    ],
    storyParagraph: digest.milestoneToday
      ? `Hoy fue especial: ${digest.milestoneToday}. Descansá tranquilo, lo lograste.`
      : `Día completo. Cada día suma.`,
    preview: `Mañana sigo yo. Vos descansá.`,
    closingLine: `Buenas noches.`,
  }));

  const message: RitualMessage = {
    id: `ritual-evening-${Date.now()}`,
    type: 'evening',
    generatedAt: new Date().toISOString(),
    scheduledFor: new Date().toISOString(),
    forBrand: brand.name,
    greeting: result.greeting,
    highlights: result.highlights,
    storyParagraph: result.storyParagraph,
    preview: result.preview,
    closingLine: result.closingLine,
    delivered: false,
    acknowledged: false,
    sentVia: [],
    emotionalTone,
  };

  const store = loadStore();
  store.messages.push(message);
  if (store.messages.length > 200) store.messages = store.messages.slice(-200);
  saveStore(store);
  return message;
};

// ── Ritual semanal del lunes ──────────────────────────────────────────────────

export const buildMondayKickoff = async (brand: BrandProfile, userId: string): Promise<RitualMessage> => {
  const personalization = getPersonalization(userId);
  const systemName = personalization?.systemName ?? 'Talía';
  const last7 = getRecentDailyMetrics(7);
  const lastWeekFollowers = last7.reduce((s, d) => s + d.followersDelta, 0);
  const progress = getCurrentProgress();

  const prompt = `Es lunes a la mañana. Generá el ritual semanal "kickoff" para @${brand.name}.

Yo soy ${systemName}.

SEMANA PASADA:
- Seguidores: ${lastWeekFollowers >= 0 ? '+' : ''}${lastWeekFollowers}
- Trend: ${getAccountSummary().trend}

ESTA SEMANA:
- Meta actual: ${progress.goal?.targetFollowers ?? 'sin meta'} seguidores
- Días restantes: ${progress.daysRemaining}
- En camino: ${progress.onTrack ? 'sí' : 'no'}

El mensaje debe inspirar pero ser realista. "Lunes de empezar bien" no genérico.

JSON con greeting, highlights (lo que se logró la semana pasada), storyParagraph (visión motivacional para esta semana), preview (qué pasa los próximos 7 días), closingLine.`;

  const result = await routerAskJson<{
    greeting: string;
    highlights: string[];
    storyParagraph: string;
    preview: string;
    closingLine: string;
  }>(prompt, { taskType: 'response', maxTokens: 1500 }).catch(() => ({
    greeting: `Buen lunes para arrancar la semana.`,
    highlights: [
      `La semana pasada: ${lastWeekFollowers >= 0 ? '+' : ''}${lastWeekFollowers} seguidores`,
      `Trend: ${getAccountSummary().trend}`,
      `${progress.daysRemaining} días para tu meta`,
    ],
    storyParagraph: `Una semana es 7 chances. Si arrancás bien hoy, el momentum se construye solo. Lo que hagas estos 7 días define el mes.`,
    preview: `Esta semana vas a publicar X piezas y hacer Y. Te paso el plan completo.`,
    closingLine: `Empezamos.`,
  }));

  const message: RitualMessage = {
    id: `ritual-monday-${Date.now()}`,
    type: 'weekly-monday',
    generatedAt: new Date().toISOString(),
    scheduledFor: new Date().toISOString(),
    forBrand: brand.name,
    greeting: result.greeting,
    highlights: result.highlights,
    storyParagraph: result.storyParagraph,
    preview: result.preview,
    closingLine: result.closingLine,
    delivered: false,
    acknowledged: false,
    sentVia: [],
    emotionalTone: 'motivador',
  };

  const store = loadStore();
  store.messages.push(message);
  saveStore(store);
  return message;
};

// ── Ritual semanal del viernes (cierre) ──────────────────────────────────────

export const buildFridayClose = async (brand: BrandProfile, userId: string): Promise<RitualMessage> => {
  const personalization = getPersonalization(userId);
  const systemName = personalization?.systemName ?? 'Talía';
  const last7 = getRecentDailyMetrics(7);
  const weekFollowers = last7.reduce((s, d) => s + d.followersDelta, 0);
  const summary = getAccountSummary();
  const milestones = getMilestones(10);
  const cutoff = Date.now() - 7 * 86400000;
  const weekMilestones = milestones.filter((m) => new Date(m.achievedAt).getTime() >= cutoff);

  const prompt = `Es viernes a la tarde. Cierre de semana para @${brand.name}. Yo soy ${systemName}.

SEMANA:
- Seguidores ganados: ${weekFollowers >= 0 ? '+' : ''}${weekFollowers}
- Trend: ${summary.trend}
- Hitos alcanzados: ${weekMilestones.length}
- Top de la semana: ${weekMilestones[0]?.description ?? 'sin hitos grandes'}

Sentir: cierre de semana, mereces descansar, esto fue lo que pasó, mirá lo que se viene.

JSON con greeting, highlights, storyParagraph (reflexión semanal cálida), preview (qué viene fin de semana / próxima semana), closingLine.`;

  const result = await routerAskJson<{
    greeting: string;
    highlights: string[];
    storyParagraph: string;
    preview: string;
    closingLine: string;
  }>(prompt, { taskType: 'response', maxTokens: 1500 }).catch(() => ({
    greeting: `Viernes. Cerrá tranquilo.`,
    highlights: [
      `${weekFollowers >= 0 ? '+' : ''}${weekFollowers} seguidores esta semana`,
      `${weekMilestones.length} hitos alcanzados`,
      `Trend: ${summary.trend}`,
    ],
    storyParagraph: `Una semana más en tu cuenta. Cada semana cuenta. Esta también.`,
    preview: `El fin de semana sigo yo. Lunes arrancamos fresco.`,
    closingLine: `Buen finde.`,
  }));

  const message: RitualMessage = {
    id: `ritual-friday-${Date.now()}`,
    type: 'weekly-friday',
    generatedAt: new Date().toISOString(),
    scheduledFor: new Date().toISOString(),
    forBrand: brand.name,
    greeting: result.greeting,
    highlights: result.highlights,
    storyParagraph: result.storyParagraph,
    preview: result.preview,
    closingLine: result.closingLine,
    delivered: false,
    acknowledged: false,
    sentVia: [],
    emotionalTone: 'reflexivo',
  };

  const store = loadStore();
  store.messages.push(message);
  saveStore(store);
  return message;
};

// ── Entrega del ritual (alert + voice opcional) ──────────────────────────────

export const deliverRitual = async (
  messageId: string,
  brand: BrandProfile,
): Promise<{ delivered: boolean; channels: string[] }> => {
  const store = loadStore();
  const message = store.messages.find((m) => m.id === messageId);
  if (!message) return { delivered: false, channels: [] };

  const channels: string[] = [];

  // Alerta
  const fullText = [
    message.greeting,
    '',
    ...message.highlights.map((h) => `• ${h}`),
    '',
    message.storyParagraph,
    '',
    `→ ${message.preview}`,
    '',
    message.closingLine,
  ].join('\n');

  try {
    await sendAlert({
      severity: 'reporte',
      title: `${brand.name}: ${message.type === 'morning' ? 'Buenos días' : message.type === 'evening' ? 'Cierre del día' : message.type === 'weekly-monday' ? 'Kickoff de semana' : message.type === 'weekly-friday' ? 'Cierre de semana' : 'Ritual'}`,
      body: fullText,
      metadata: { ritualId: message.id, type: message.type, tone: message.emotionalTone },
    });
    channels.push('alert');
  } catch (err) {
    log.warn(`[DailyRitual] Alert falló: ${(err as Error).message}`);
  }

  message.delivered = true;
  message.sentVia = channels as RitualMessage['sentVia'];
  saveStore(store);

  return { delivered: true, channels };
};

// ── Consultas ────────────────────────────────────────────────────────────────

export const getRecentRituals = (limit = 14, type?: RitualType): RitualMessage[] => {
  const store = loadStore();
  let messages = store.messages;
  if (type) messages = messages.filter((m) => m.type === type);
  return messages.sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)).slice(0, limit);
};

export const getRitualById = (id: string): RitualMessage | null =>
  loadStore().messages.find((m) => m.id === id) ?? null;

export const markRitualAcknowledged = (id: string): boolean => {
  const store = loadStore();
  const m = store.messages.find((msg) => msg.id === id);
  if (!m) return false;
  m.acknowledged = true;
  saveStore(store);
  return true;
};

export const getRitualSnapshot = (): {
  totalRituals: number;
  byType: Record<RitualType, number>;
  byTone: Record<string, number>;
  deliveredLast7Days: number;
  acknowledgedLast7Days: number;
  lastMorningAt?: string;
  lastEveningAt?: string;
} => {
  const store = loadStore();
  const byType: Record<string, number> = {};
  const byTone: Record<string, number> = {};
  const cutoff = Date.now() - 7 * 86400000;
  let delivered = 0;
  let ack = 0;

  let lastMorning: string | undefined;
  let lastEvening: string | undefined;

  for (const m of store.messages) {
    byType[m.type] = (byType[m.type] ?? 0) + 1;
    byTone[m.emotionalTone] = (byTone[m.emotionalTone] ?? 0) + 1;
    const t = new Date(m.generatedAt).getTime();
    if (t >= cutoff) {
      if (m.delivered) delivered++;
      if (m.acknowledged) ack++;
    }
    if (m.type === 'morning' && (!lastMorning || m.generatedAt > lastMorning)) lastMorning = m.generatedAt;
    if (m.type === 'evening' && (!lastEvening || m.generatedAt > lastEvening)) lastEvening = m.generatedAt;
  }

  return {
    totalRituals: store.messages.length,
    byType: byType as Record<RitualType, number>,
    byTone,
    deliveredLast7Days: delivered,
    acknowledgedLast7Days: ack,
    lastMorningAt: lastMorning,
    lastEveningAt: lastEvening,
  };
};

// ── Conveniencia: ejecutar ritual + entregar ─────────────────────────────────

export const runMorningRitual = async (brand: BrandProfile, userId: string): Promise<RitualMessage> => {
  const message = await buildMorningRitual(brand, userId);
  const personalization = getPersonalization(userId);
  if (personalization?.morningRitualEnabled !== false) {
    await deliverRitual(message.id, brand);
  }
  return message;
};

export const runEveningRitual = async (brand: BrandProfile, userId: string): Promise<RitualMessage> => {
  const message = await buildEveningRitual(brand, userId);
  const personalization = getPersonalization(userId);
  if (personalization?.eveningRitualEnabled !== false) {
    await deliverRitual(message.id, brand);
  }
  return message;
};
