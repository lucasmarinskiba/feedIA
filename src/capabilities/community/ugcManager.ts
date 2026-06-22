/**
 * UGC Manager de FeedIA — gestiona contenido generado por usuarios.
 *
 * Detecta menciones, stories y posts donde la marca aparece. Pide permiso
 * automáticamente, agradece, repostea con crédito y construye un banco de
 * UGC reutilizable.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import { ask as routerAsk } from '../../agent/tokenRouter.js';
import { appendOurReply, ingestMessage } from './dmInbox.js';
import { loadBrandProfile } from '../../config/index.js';
import type { BrandProfile } from '../../config/types.js';

const UGC_PATH = join(process.cwd(), 'data', 'community', 'ugc.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type UGCType = 'story-mention' | 'post-tag' | 'comment-with-photo' | 'review' | 'unboxing' | 'use-case';
export type UGCStage =
  | 'detected'
  | 'permission-requested'
  | 'permission-granted'
  | 'permission-denied'
  | 'reposted'
  | 'archived';

export interface UGCItem {
  id: string;
  authorUsername: string;
  authorFollowerCount?: number;
  ugcType: UGCType;
  detectedAt: string;
  postUrl?: string;
  storyUrl?: string;
  mediaUrl?: string;
  caption: string;
  sentiment: number; // -1 a +1
  qualityScore: number; // 0-100 (visual quality + relevance)
  stage: UGCStage;
  permissionRequestedAt?: string;
  permissionGrantedAt?: string;
  repostedAt?: string;
  repostedPostId?: string;
  thankYouSent: boolean;
  tags: string[];
  notes: string[];
}

interface UGCStore {
  version: number;
  items: UGCItem[];
  lastUpdated: string;
  stats: {
    totalDetected: number;
    totalReposted: number;
    avgPermissionResponseHours: number;
  };
}

const DEFAULT_STORE: UGCStore = {
  version: 1,
  items: [],
  lastUpdated: new Date().toISOString(),
  stats: { totalDetected: 0, totalReposted: 0, avgPermissionResponseHours: 0 },
};

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'community');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadUGC = (): UGCStore => {
  try {
    ensureDir();
    if (!existsSync(UGC_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(UGC_PATH, 'utf8')) as UGCStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveUGC = (store: UGCStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(UGC_PATH, JSON.stringify(store, null, 2), 'utf8');
};

// ── Detección / ingesta ──────────────────────────────────────────────────────

export interface UGCDetection {
  authorUsername: string;
  authorFollowerCount?: number;
  ugcType: UGCType;
  postUrl?: string;
  storyUrl?: string;
  mediaUrl?: string;
  caption: string;
  sentimentEstimate?: number;
}

export const ingestUGC = (detection: UGCDetection): UGCItem => {
  const store = loadUGC();

  // Calculo simple de quality
  const captionLength = detection.caption.length;
  const sentiment = detection.sentimentEstimate ?? 0.5;
  const hasMedia = Boolean(detection.mediaUrl);
  const qualityScore = Math.min(
    100,
    Math.round(
      (sentiment >= 0 ? 40 : 0) +
        (hasMedia ? 30 : 0) +
        (captionLength >= 30 && captionLength <= 400 ? 20 : 5) +
        ((detection.authorFollowerCount ?? 0) > 500 ? 10 : 0),
    ),
  );

  const item: UGCItem = {
    id: `ugc-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    authorUsername: detection.authorUsername,
    authorFollowerCount: detection.authorFollowerCount,
    ugcType: detection.ugcType,
    detectedAt: new Date().toISOString(),
    postUrl: detection.postUrl,
    storyUrl: detection.storyUrl,
    mediaUrl: detection.mediaUrl,
    caption: detection.caption,
    sentiment,
    qualityScore,
    stage: 'detected',
    thankYouSent: false,
    tags: [detection.ugcType],
    notes: [],
  };

  store.items.push(item);
  if (store.items.length > 500) store.items = store.items.slice(-500);
  store.stats.totalDetected = store.items.length;
  saveUGC(store);

  log.info(
    `[UGCManager] Detectado UGC de @${detection.authorUsername} (${detection.ugcType}, quality=${qualityScore})`,
  );
  return item;
};

// ── Pedir permiso para repostear ──────────────────────────────────────────────

export const requestRepostPermission = async (
  ugcId: string,
  brand?: BrandProfile,
): Promise<{ ok: boolean; messageSent: string }> => {
  const store = loadUGC();
  const item = store.items.find((u) => u.id === ugcId);
  if (!item) return { ok: false, messageSent: '' };
  const b = brand ?? loadBrandProfile();

  const prompt = `Generá un DM corto pidiendo permiso para repostear el contenido de @${item.authorUsername}.

CONTEXTO:
- Tipo UGC: ${item.ugcType}
- Caption del usuario: "${item.caption.slice(0, 200)}"

MARCA: ${b.name} | TONO: ${b.voice.tone.join(', ')}

El mensaje debe:
- Empezar agradeciendo genuinamente (mencionar algo específico de su contenido)
- Pedir permiso explícito para repostear
- Decirle que le vas a dar crédito (@${item.authorUsername})
- Ofrecer compensación si aplica (taggearlo, mencionarlo, descuento)
- Sonar humano, no template
- Máximo 280 caracteres

Devolvé SOLO el mensaje, sin prefijos.`;

  const result = await routerAsk(prompt, { taskType: 'response', maxTokens: 400 });
  const message = result.text.trim();

  // Si tenemos conversación con esa cuenta, agregar al inbox como nuestro mensaje saliente
  // Si no, crear una nueva conversación virtual
  ingestMessage({
    threadId: `ugc-thread-${item.authorUsername}`,
    contactUsername: item.authorUsername,
    contactFollowerCount: item.authorFollowerCount,
    text: '(UGC content)',
    timestamp: item.detectedAt,
  });

  // El mensaje saliente va a la conversación que creamos
  const { listConversations } = await import('./dmInbox.js');
  const convs = listConversations({ contactUsername: item.authorUsername });
  if (convs[0]) {
    appendOurReply(convs[0].id, message, {
      isAutoGenerated: true,
      note: `Permission request para UGC ${item.id}`,
    });
  }

  item.stage = 'permission-requested';
  item.permissionRequestedAt = new Date().toISOString();
  item.notes.push(`[${item.permissionRequestedAt}] Permission request enviado`);
  saveUGC(store);

  return { ok: true, messageSent: message };
};

// ── Detectar respuesta al permiso (sí / no) ──────────────────────────────────

export const markPermission = (ugcId: string, granted: boolean, note?: string): UGCItem | null => {
  const store = loadUGC();
  const item = store.items.find((u) => u.id === ugcId);
  if (!item) return null;

  item.stage = granted ? 'permission-granted' : 'permission-denied';
  if (granted) item.permissionGrantedAt = new Date().toISOString();
  if (note) item.notes.push(`[${new Date().toISOString()}] ${note}`);

  saveUGC(store);
  log.info(`[UGCManager] Permission ${granted ? 'GRANTED' : 'DENIED'} for ${ugcId} from @${item.authorUsername}`);
  return item;
};

// ── Generar el repost (con crédito) ──────────────────────────────────────────

export const generateRepostCaption = async (ugcId: string, brand?: BrandProfile): Promise<string> => {
  const store = loadUGC();
  const item = store.items.find((u) => u.id === ugcId);
  if (!item) return '';
  const b = brand ?? loadBrandProfile();

  const prompt = `Generá el caption para un repost de UGC, dando crédito al autor original.

UGC ORIGINAL:
- Autor: @${item.authorUsername}
- Tipo: ${item.ugcType}
- Caption original: "${item.caption.slice(0, 300)}"

MARCA: ${b.name} | NICHO: ${b.niche} | TONO: ${b.voice.tone.join(', ')}

El caption debe:
- Mencionar @${item.authorUsername} con crédito claro
- Resumir o reaccionar al contenido original (no copiarlo)
- Sonar genuino, no promocional
- 80-200 palabras
- Cerrar con CTA suave (taggearnos para feature, etc.)

Devolvé SOLO el caption con hashtags al final, sin prefijos.`;

  const result = await routerAsk(prompt, { taskType: 'caption', maxTokens: 1000 });
  return result.text.trim();
};

export const markReposted = (ugcId: string, repostedPostId: string): UGCItem | null => {
  const store = loadUGC();
  const item = store.items.find((u) => u.id === ugcId);
  if (!item) return null;
  item.stage = 'reposted';
  item.repostedAt = new Date().toISOString();
  item.repostedPostId = repostedPostId;
  store.stats.totalReposted++;
  saveUGC(store);
  log.info(`[UGCManager] UGC ${ugcId} reposted as ${repostedPostId}`);
  return item;
};

// ── Agradecer (envío de gracias post-repost) ─────────────────────────────────

export const sendThankYou = async (ugcId: string, brand?: BrandProfile): Promise<string> => {
  const store = loadUGC();
  const item = store.items.find((u) => u.id === ugcId);
  if (!item) return '';
  const b = brand ?? loadBrandProfile();

  const prompt = `Generá un DM de agradecimiento corto a @${item.authorUsername} por dejarnos repostear su contenido.

TONO: ${b.voice.tone.join(', ')}
Máximo 200 caracteres. Auténtico, no genérico. Mencionar la pieza original si aplica.`;

  const result = await routerAsk(prompt, { taskType: 'response', maxTokens: 300 });
  const message = result.text.trim();

  const { listConversations } = await import('./dmInbox.js');
  const convs = listConversations({ contactUsername: item.authorUsername });
  if (convs[0]) {
    appendOurReply(convs[0].id, message, { isAutoGenerated: true, note: 'Thank you post-repost' });
  }

  item.thankYouSent = true;
  saveUGC(store);
  return message;
};

// ── Consultas ────────────────────────────────────────────────────────────────

export const listUGC = (filters: { stage?: UGCStage; ugcType?: UGCType; minQuality?: number } = {}): UGCItem[] => {
  let items = loadUGC().items;
  if (filters.stage) items = items.filter((u) => u.stage === filters.stage);
  if (filters.ugcType) items = items.filter((u) => u.ugcType === filters.ugcType);
  if (filters.minQuality) items = items.filter((u) => u.qualityScore >= filters.minQuality!);
  return items.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt));
};

export const getUGCSnapshot = (): {
  total: number;
  byStage: Record<string, number>;
  pendingRequest: UGCItem[];
  awaitingResponse: UGCItem[];
  readyToRepost: UGCItem[];
  reposted: number;
} => {
  const store = loadUGC();
  const byStage: Record<string, number> = {};
  for (const u of store.items) {
    byStage[u.stage] = (byStage[u.stage] ?? 0) + 1;
  }
  return {
    total: store.items.length,
    byStage,
    pendingRequest: store.items.filter((u) => u.stage === 'detected' && u.qualityScore >= 60),
    awaitingResponse: store.items.filter((u) => u.stage === 'permission-requested'),
    readyToRepost: store.items.filter((u) => u.stage === 'permission-granted'),
    reposted: store.items.filter((u) => u.stage === 'reposted').length,
  };
};

export const getUGC = (ugcId: string): UGCItem | null => loadUGC().items.find((u) => u.id === ugcId) ?? null;

export const exportUGC = (): UGCStore => loadUGC();
