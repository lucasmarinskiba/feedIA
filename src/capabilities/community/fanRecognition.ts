/**
 * Fan Recognition de FeedIA — identificación y reconocimiento de top fans + nuevos seguidores.
 *
 * Reemplaza al CM que reconoce a los embajadores. Tracking de fans más activos,
 * bienvenida personalizada a nuevos seguidores, premios y reconocimiento público
 * para fortalecer la comunidad.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import { ask as routerAsk } from '../../agent/tokenRouter.js';
import { listConversations, ingestMessage, appendOurReply } from './dmInbox.js';
import { listMentions } from './mentionTracker.js';
import { sendAlert } from '../../integrations/notifications.js';
import { loadBrandProfile } from '../../config/index.js';
import type { BrandProfile } from '../../config/types.js';

const FANS_PATH = join(process.cwd(), 'data', 'community', 'fans.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type FanTier = 'casual' | 'regular' | 'super-fan' | 'embajador';

export interface FanProfile {
  username: string;
  displayName?: string;
  followerCount?: number;
  tier: FanTier;
  engagementScore: number; // 0-100
  signals: {
    dmsExchanged: number;
    commentsCount: number;
    mentionsCount: number;
    storySharesCount: number;
    purchasesEstimated: number;
    monthsAsFollower?: number;
  };
  firstSeenAt: string;
  lastInteractionAt: string;
  rewards: Array<{
    type: 'feature' | 'shoutout' | 'discount' | 'gift' | 'exclusive-content';
    grantedAt: string;
    note: string;
  }>;
  welcomeSent: boolean;
  welcomeSentAt?: string;
  tags: string[];
  notes: string[];
}

interface FansStore {
  version: number;
  fans: FanProfile[];
  newFollowersQueue: Array<{ username: string; followedAt: string; processed: boolean }>;
  lastUpdated: string;
}

const DEFAULT_STORE: FansStore = {
  version: 1,
  fans: [],
  newFollowersQueue: [],
  lastUpdated: new Date().toISOString(),
};

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'community');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadFans = (): FansStore => {
  try {
    ensureDir();
    if (!existsSync(FANS_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(FANS_PATH, 'utf8')) as FansStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveFans = (store: FansStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(FANS_PATH, JSON.stringify(store, null, 2), 'utf8');
};

// ── Tiers ─────────────────────────────────────────────────────────────────────

const computeTier = (signals: FanProfile['signals']): FanTier => {
  const score =
    signals.dmsExchanged * 5 +
    signals.commentsCount * 2 +
    signals.mentionsCount * 15 +
    signals.storySharesCount * 8 +
    signals.purchasesEstimated * 30;

  if (score >= 200) return 'embajador';
  if (score >= 100) return 'super-fan';
  if (score >= 30) return 'regular';
  return 'casual';
};

const computeEngagementScore = (signals: FanProfile['signals']): number => {
  const raw =
    signals.dmsExchanged * 3 + signals.commentsCount * 2 + signals.mentionsCount * 10 + signals.storySharesCount * 5;
  return Math.min(100, Math.round(raw));
};

// ── Build / actualizar perfil de fan ─────────────────────────────────────────

export const refreshFanProfile = (username: string): FanProfile => {
  const store = loadFans();
  let fan = store.fans.find((f) => f.username === username);

  // Calcular señales desde otros módulos
  const conversations = listConversations({ contactUsername: username });
  const dmsExchanged = conversations.reduce((sum, c) => sum + c.messages.filter((m) => m.sender === 'them').length, 0);
  const mentions = listMentions().filter((m) => m.authorUsername === username);
  const mentionsCount = mentions.length;
  const storyShares = mentions.filter((m) => m.type === 'story-mention').length;

  const signals: FanProfile['signals'] = {
    dmsExchanged,
    commentsCount: 0, // se podría sumar desde eventReactor
    mentionsCount,
    storySharesCount: storyShares,
    purchasesEstimated: 0,
    monthsAsFollower: undefined,
  };

  const tier = computeTier(signals);
  const engagementScore = computeEngagementScore(signals);

  if (!fan) {
    fan = {
      username,
      tier,
      engagementScore,
      signals,
      firstSeenAt: new Date().toISOString(),
      lastInteractionAt: new Date().toISOString(),
      rewards: [],
      welcomeSent: false,
      tags: [tier],
      notes: [],
    };
    store.fans.push(fan);
  } else {
    fan.signals = signals;
    fan.tier = tier;
    fan.engagementScore = engagementScore;
    fan.lastInteractionAt = new Date().toISOString();
    if (!fan.tags.includes(tier)) fan.tags.push(tier);
  }

  saveFans(store);
  return fan;
};

// ── Nuevo follower ────────────────────────────────────────────────────────────

export const enqueueNewFollower = (username: string): void => {
  const store = loadFans();
  if (store.newFollowersQueue.find((q) => q.username === username && !q.processed)) return;
  store.newFollowersQueue.push({ username, followedAt: new Date().toISOString(), processed: false });
  if (store.newFollowersQueue.length > 200) store.newFollowersQueue = store.newFollowersQueue.slice(-200);
  saveFans(store);
};

// ── Bienvenida personalizada a nuevos seguidores ──────────────────────────────

export const sendWelcomeDM = async (
  username: string,
  brand?: BrandProfile,
): Promise<{ ok: boolean; message: string }> => {
  const store = loadFans();
  const b = brand ?? loadBrandProfile();

  let fan = store.fans.find((f) => f.username === username);
  if (!fan) {
    fan = refreshFanProfile(username);
  }
  if (fan.welcomeSent) return { ok: false, message: 'Welcome ya enviado anteriormente' };

  const prompt = `Generá un DM corto de bienvenida personalizado para un nuevo seguidor.

NUEVO SEGUIDOR: @${username}
MARCA: ${b.name} | NICHO: ${b.niche}
TONO: ${b.voice.tone.join(', ')}
AUDIENCIA: ${b.audience.description}

Reglas:
- NO sonar como bot
- NO vender nada en el primer mensaje
- Reconocer su decisión de seguir + dar algo de valor (recurso gratis, contenido relevante, link a su highlight más útil)
- Máximo 220 caracteres
- Terminar con pregunta abierta SI hay sentido

Devolvé SOLO el mensaje.`;

  const result = await routerAsk(prompt, { taskType: 'response', maxTokens: 300 });
  const message = result.text.trim();

  // Crear conversación virtual e insertar nuestro mensaje
  const threadId = `welcome-${username}`;
  ingestMessage({
    threadId,
    contactUsername: username,
    text: '(nuevo follower)',
    timestamp: new Date().toISOString(),
  });
  const convs = listConversations({ contactUsername: username });
  if (convs[0]) {
    appendOurReply(convs[0].id, message, {
      isAutoGenerated: true,
      note: 'Welcome DM enviado por fanRecognition',
    });
  }

  fan.welcomeSent = true;
  fan.welcomeSentAt = new Date().toISOString();
  saveFans(store);

  log.info(`[FanRecognition] Welcome DM enviado a @${username}`);
  return { ok: true, message };
};

// ── Procesar la queue de nuevos followers (batch) ────────────────────────────

export const processNewFollowersQueue = async (maxProcess = 5): Promise<{ processed: number; sent: number }> => {
  const store = loadFans();
  const pending = store.newFollowersQueue.filter((q) => !q.processed).slice(0, maxProcess);
  let sent = 0;

  for (const entry of pending) {
    try {
      const result = await sendWelcomeDM(entry.username);
      if (result.ok) sent++;
      entry.processed = true;
    } catch (err) {
      log.warn(`[FanRecognition] Welcome falló para @${entry.username}: ${(err as Error).message}`);
    }
  }

  saveFans(store);
  return { processed: pending.length, sent };
};

// ── Top fans / leaderboard ───────────────────────────────────────────────────

export const refreshAllFanProfiles = (): { total: number; byTier: Record<FanTier, number> } => {
  // Rebuild perfiles a partir de las conversaciones y mentions actuales
  const conversations = listConversations({});
  const uniqueUsernames = new Set(conversations.map((c) => c.contact.username));
  const mentions = listMentions();
  for (const m of mentions) uniqueUsernames.add(m.authorUsername);

  for (const username of uniqueUsernames) {
    refreshFanProfile(username);
  }

  const store = loadFans();
  const byTier: Record<FanTier, number> = { casual: 0, regular: 0, 'super-fan': 0, embajador: 0 };
  for (const f of store.fans) byTier[f.tier]++;
  return { total: store.fans.length, byTier };
};

export const getTopFans = (tier?: FanTier, limit = 20): FanProfile[] => {
  let fans = loadFans().fans;
  if (tier) fans = fans.filter((f) => f.tier === tier);
  return fans.sort((a, b) => b.engagementScore - a.engagementScore).slice(0, limit);
};

// ── Premiar a un fan ─────────────────────────────────────────────────────────

export const grantReward = (
  username: string,
  reward: Omit<FanProfile['rewards'][0], 'grantedAt'>,
): FanProfile | null => {
  const store = loadFans();
  const fan = store.fans.find((f) => f.username === username);
  if (!fan) return null;
  fan.rewards.push({ ...reward, grantedAt: new Date().toISOString() });
  fan.notes.push(`[${new Date().toISOString()}] Reward: ${reward.type} — ${reward.note}`);
  saveFans(store);
  log.info(`[FanRecognition] Reward "${reward.type}" granted to @${username}`);
  return fan;
};

// ── Feature de la semana / shoutout automático ──────────────────────────────

export const proposeFanOfTheWeek = async (
  brand?: BrandProfile,
): Promise<{
  fan: FanProfile;
  shoutoutText: string;
} | null> => {
  const b = brand ?? loadBrandProfile();
  const tops = getTopFans(undefined, 5);
  if (tops.length === 0) return null;

  // Elegir el top que no haya sido feature reciente
  const recent4Weeks = Date.now() - 28 * 86400000;
  const candidate = tops.find(
    (f) => !f.rewards.some((r) => r.type === 'feature' && new Date(r.grantedAt).getTime() > recent4Weeks),
  );
  if (!candidate) return null;

  const prompt = `Generá un texto de "Fan de la semana" para hacer un shoutout en stories.

FAN: @${candidate.username}
TIER: ${candidate.tier}
SEÑALES: ${candidate.signals.dmsExchanged} DMs, ${candidate.signals.commentsCount} comments, ${candidate.signals.mentionsCount} mentions

MARCA: ${b.name} | TONO: ${b.voice.tone.join(', ')}

Texto:
- Genuino, no template
- Mencionar específicamente algo que hace este fan
- 1-2 líneas
- Tag al @${candidate.username}

Devolvé SOLO el texto.`;

  const result = await routerAsk(prompt, { taskType: 'response', maxTokens: 250, freeOnly: true });
  return { fan: candidate, shoutoutText: result.text.trim() };
};

// ── Detector de churn (fans que se enfriaron) ────────────────────────────────

export const detectChurningFans = (daysInactive = 30): FanProfile[] => {
  const cutoff = new Date(Date.now() - daysInactive * 86400000).toISOString();
  const store = loadFans();
  return store.fans.filter((f) => (f.tier === 'super-fan' || f.tier === 'embajador') && f.lastInteractionAt < cutoff);
};

export const sendReengagementDM = async (
  username: string,
  brand?: BrandProfile,
): Promise<{ ok: boolean; message: string }> => {
  const b = brand ?? loadBrandProfile();
  const prompt = `Generá un DM de re-engagement para un fan que se enfrió.

FAN: @${username}
MARCA: ${b.name}
TONO: ${b.voice.tone.join(', ')}

El mensaje:
- No sonar acusatorio ("no te vi por acá")
- Compartir algo nuevo / interesante
- Invitar a comentar o responder
- Máximo 220 caracteres

Devolvé SOLO el mensaje.`;

  const result = await routerAsk(prompt, { taskType: 'response', maxTokens: 300 });
  const message = result.text.trim();

  ingestMessage({
    threadId: `reengage-${username}`,
    contactUsername: username,
    text: '(reengage)',
    timestamp: new Date().toISOString(),
  });
  const convs = listConversations({ contactUsername: username });
  if (convs[0]) {
    appendOurReply(convs[0].id, message, { isAutoGenerated: true, note: 'Reengagement DM' });
  }

  return { ok: true, message };
};

// ── Consultas ────────────────────────────────────────────────────────────────

export const getFanSnapshot = (): {
  total: number;
  byTier: Record<FanTier, number>;
  topFans: FanProfile[];
  churningFans: FanProfile[];
  pendingWelcomes: number;
  recentlyRewarded: number;
} => {
  const store = loadFans();
  const byTier: Record<FanTier, number> = { casual: 0, regular: 0, 'super-fan': 0, embajador: 0 };
  for (const f of store.fans) byTier[f.tier]++;
  const pendingWelcomes = store.newFollowersQueue.filter((q) => !q.processed).length;
  const cutoff = new Date(Date.now() - 7 * 86400000).toISOString();
  const recentlyRewarded = store.fans.filter((f) => f.rewards.some((r) => r.grantedAt >= cutoff)).length;

  return {
    total: store.fans.length,
    byTier,
    topFans: getTopFans(undefined, 5),
    churningFans: detectChurningFans(30),
    pendingWelcomes,
    recentlyRewarded,
  };
};

export const getFan = (username: string): FanProfile | null =>
  loadFans().fans.find((f) => f.username === username) ?? null;

export const broadcastFanMilestone = async (
  username: string,
  milestone: string,
  brand?: BrandProfile,
): Promise<void> => {
  const fan = getFan(username);
  if (!fan) return;
  const b = brand ?? loadBrandProfile();

  await sendAlert({
    severity: 'info',
    title: `${b.name}: hito de fan @${username}`,
    body: `${milestone}\nTier: ${fan.tier}\nEngagement score: ${fan.engagementScore}`,
    metadata: { username, tier: fan.tier },
  }).catch(() => undefined);
};

export const exportFans = (): FansStore => loadFans();
