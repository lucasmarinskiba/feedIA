/**
 * Mention Tracker de FeedIA — tracking de menciones, tags y comentarios externos.
 *
 * Vigila dónde se habla de la marca en Instagram: tagged stories, posts donde
 * aparece el @cuenta, comentarios con el hashtag, etc. Clasifica por sentiment
 * y prioriza respuesta.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import { sendAlert } from '../../integrations/notifications.js';
import { ingestUGC, type UGCType } from './ugcManager.js';
import type { BrandProfile } from '../../config/types.js';

const MENTIONS_PATH = join(process.cwd(), 'data', 'community', 'mentions.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type MentionType =
  | 'story-mention'
  | 'post-tag'
  | 'comment-mention'
  | 'caption-mention'
  | 'hashtag-use'
  | 'bio-mention';

export type MentionSentiment = 'positive' | 'neutral' | 'negative' | 'critical';

export interface Mention {
  id: string;
  type: MentionType;
  authorUsername: string;
  authorFollowerCount?: number;
  context: string; // el texto del post/comment/story
  postUrl?: string;
  detectedAt: string;
  sentiment: MentionSentiment;
  importance: 'critical' | 'high' | 'medium' | 'low';
  potentialReach: number;
  acknowledged: boolean; // si ya respondimos / reaccionamos
  acknowledgedAt?: string;
  promotedToUGC: boolean;
  tags: string[];
  notes: string[];
}

interface MentionStore {
  version: number;
  mentions: Mention[];
  lastUpdated: string;
  stats: {
    totalMentions: number;
    positiveLast30Days: number;
    negativeLast30Days: number;
    influencerMentionsLast30Days: number;
  };
}

const DEFAULT_STORE: MentionStore = {
  version: 1,
  mentions: [],
  lastUpdated: new Date().toISOString(),
  stats: {
    totalMentions: 0,
    positiveLast30Days: 0,
    negativeLast30Days: 0,
    influencerMentionsLast30Days: 0,
  },
};

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'community');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadMentions = (): MentionStore => {
  try {
    ensureDir();
    if (!existsSync(MENTIONS_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(MENTIONS_PATH, 'utf8')) as MentionStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveMentions = (store: MentionStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(MENTIONS_PATH, JSON.stringify(store, null, 2), 'utf8');
};

// ── Clasificación rápida sentiment ───────────────────────────────────────────

const classifySentiment = (text: string): MentionSentiment => {
  const lower = text.toLowerCase();
  const criticalWords = ['estafa', 'fraude', 'denuncia', 'demanda', 'mentirosos', 'roban', 'horrible'];
  const negativeWords = ['malo', 'pésimo', 'no recomiendo', 'no funciona', 'decepción', 'queja'];
  const positiveWords = ['gracias', 'genial', 'excelente', 'recomiendo', 'top', 'crack', 'amor', 'increíble'];

  if (criticalWords.some((w) => lower.includes(w))) return 'critical';
  if (negativeWords.some((w) => lower.includes(w))) return 'negative';
  if (positiveWords.some((w) => lower.includes(w))) return 'positive';
  return 'neutral';
};

const computeImportance = (
  sentiment: MentionSentiment,
  followerCount: number,
  type: MentionType,
): Mention['importance'] => {
  if (sentiment === 'critical') return 'critical';
  if (followerCount > 50000) return 'critical'; // influencer mencionando
  if (followerCount > 10000) return 'high';
  if (sentiment === 'negative') return 'high';
  if (type === 'story-mention' || type === 'post-tag') return 'medium';
  return 'low';
};

// ── Ingesta de menciones ──────────────────────────────────────────────────────

export interface IncomingMention {
  type: MentionType;
  authorUsername: string;
  authorFollowerCount?: number;
  context: string;
  postUrl?: string;
  mediaUrl?: string;
  timestamp?: string;
}

export const ingestMention = (input: IncomingMention): Mention => {
  const store = loadMentions();
  const sentiment = classifySentiment(input.context);
  const followerCount = input.authorFollowerCount ?? 0;
  const importance = computeImportance(sentiment, followerCount, input.type);

  const mention: Mention = {
    id: `mention-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    type: input.type,
    authorUsername: input.authorUsername,
    authorFollowerCount: input.authorFollowerCount,
    context: input.context,
    postUrl: input.postUrl,
    detectedAt: input.timestamp ?? new Date().toISOString(),
    sentiment,
    importance,
    potentialReach: Math.round(followerCount * 0.15), // estimación conservadora del alcance del mention
    acknowledged: false,
    promotedToUGC: false,
    tags: [input.type, sentiment],
    notes: [],
  };

  store.mentions.push(mention);
  if (store.mentions.length > 1000) store.mentions = store.mentions.slice(-1000);
  store.stats.totalMentions = store.mentions.length;

  saveMentions(store);
  log.info(`[MentionTracker] Mention @${input.authorUsername} (${input.type}, ${sentiment}, importance=${importance})`);

  // Alerta inmediata si es critical
  if (importance === 'critical') {
    sendAlert({
      severity: sentiment === 'critical' ? 'crisis' : 'info',
      title: `${sentiment === 'critical' ? '⚠️ Mención CRÍTICA' : '🌟 Mención de influencer'} — @${input.authorUsername}`,
      body: `${input.context.slice(0, 280)}${input.context.length > 280 ? '...' : ''}\n\n${input.postUrl ?? ''}`,
      metadata: { mentionId: mention.id, sentiment, followers: followerCount },
    }).catch(() => undefined);
  }

  // Auto-promover a UGC si es positivo + tiene media
  if (sentiment === 'positive' && (input.type === 'story-mention' || input.type === 'post-tag') && input.mediaUrl) {
    const ugcType: UGCType = input.type === 'story-mention' ? 'story-mention' : 'post-tag';
    ingestUGC({
      authorUsername: input.authorUsername,
      authorFollowerCount: input.authorFollowerCount,
      ugcType,
      postUrl: input.postUrl,
      mediaUrl: input.mediaUrl,
      caption: input.context,
      sentimentEstimate: 0.7,
    });
    mention.promotedToUGC = true;
    saveMentions(store);
  }

  return mention;
};

// ── Acknowledge (marcar como respondido) ──────────────────────────────────────

export const acknowledgeMention = (mentionId: string, note?: string): Mention | null => {
  const store = loadMentions();
  const m = store.mentions.find((mn) => mn.id === mentionId);
  if (!m) return null;
  m.acknowledged = true;
  m.acknowledgedAt = new Date().toISOString();
  if (note) m.notes.push(`[${m.acknowledgedAt}] ${note}`);
  saveMentions(store);
  return m;
};

// ── Búsqueda y consultas ──────────────────────────────────────────────────────

export const listMentions = (
  filters: {
    type?: MentionType;
    sentiment?: MentionSentiment;
    importance?: Mention['importance'];
    unacknowledged?: boolean;
    fromDate?: string;
  } = {},
): Mention[] => {
  let mentions = loadMentions().mentions;
  if (filters.type) mentions = mentions.filter((m) => m.type === filters.type);
  if (filters.sentiment) mentions = mentions.filter((m) => m.sentiment === filters.sentiment);
  if (filters.importance) mentions = mentions.filter((m) => m.importance === filters.importance);
  if (filters.unacknowledged) mentions = mentions.filter((m) => !m.acknowledged);
  if (filters.fromDate) mentions = mentions.filter((m) => m.detectedAt >= filters.fromDate!);
  return mentions.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
};

export const getMentionsSnapshot = (
  brand?: BrandProfile,
): {
  brand?: string;
  totalLast7Days: number;
  totalLast30Days: number;
  sentimentLast7Days: Record<MentionSentiment, number>;
  unacknowledged: Mention[];
  topInfluencers: Array<{ username: string; followers: number; count: number }>;
  estimatedReachLast30Days: number;
} => {
  const store = loadMentions();
  const now = Date.now();
  const cutoff7 = new Date(now - 7 * 86400000).toISOString();
  const cutoff30 = new Date(now - 30 * 86400000).toISOString();
  const last7 = store.mentions.filter((m) => m.detectedAt >= cutoff7);
  const last30 = store.mentions.filter((m) => m.detectedAt >= cutoff30);

  const sentimentLast7: Record<string, number> = { positive: 0, neutral: 0, negative: 0, critical: 0 };
  for (const m of last7) sentimentLast7[m.sentiment] = (sentimentLast7[m.sentiment] ?? 0) + 1;

  const influencers = new Map<string, { followers: number; count: number }>();
  for (const m of last30) {
    if ((m.authorFollowerCount ?? 0) < 5000) continue;
    const existing = influencers.get(m.authorUsername);
    if (existing) {
      existing.count++;
    } else {
      influencers.set(m.authorUsername, { followers: m.authorFollowerCount ?? 0, count: 1 });
    }
  }

  const topInfluencers = [...influencers.entries()]
    .map(([username, data]) => ({ username, ...data }))
    .sort((a, b) => b.followers - a.followers)
    .slice(0, 10);

  return {
    brand: brand?.name,
    totalLast7Days: last7.length,
    totalLast30Days: last30.length,
    sentimentLast7Days: sentimentLast7 as Record<MentionSentiment, number>,
    unacknowledged: store.mentions.filter(
      (m) => !m.acknowledged && (m.importance === 'high' || m.importance === 'critical'),
    ),
    topInfluencers,
    estimatedReachLast30Days: last30.reduce((s, m) => s + m.potentialReach, 0),
  };
};

export const getMention = (mentionId: string): Mention | null =>
  loadMentions().mentions.find((m) => m.id === mentionId) ?? null;

export const exportMentions = (): MentionStore => loadMentions();
