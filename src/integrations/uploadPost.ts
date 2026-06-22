/**
 * Upload-Post de FeedIA — agregador certificado para publicar en redes sociales
 * desde el server, incluso con el dispositivo del usuario apagado.
 *
 * Plataformas soportadas: Instagram, TikTok, X (Twitter), LinkedIn, Threads,
 * Facebook, YouTube Shorts y Pinterest.
 *
 * Docs: https://docs.upload-post.com  (API key vía UPLOAD_POST_API_KEY)
 */

import { env } from '../config/index.js';
import { log } from '../agent/logger.js';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type SocialPlatform =
  | 'instagram'
  | 'tiktok'
  | 'x'
  | 'linkedin'
  | 'threads'
  | 'facebook'
  | 'youtube'
  | 'pinterest';

export type MediaType = 'photo' | 'video' | 'reel' | 'story' | 'carousel';

export interface UploadPostPayload {
  platforms: SocialPlatform[];
  mediaType: MediaType;
  mediaUrls: string[]; // URLs públicas o data:URIs base64
  caption: string;
  hashtags?: string[];
  scheduleAt?: string; // ISO; si no se especifica, publicación inmediata
  // Específicos por plataforma
  perPlatform?: {
    instagram?: { collaboratorUsername?: string; locationName?: string };
    tiktok?: { allowComments?: boolean; allowDuet?: boolean; allowStitch?: boolean };
    x?: { replyToTweetId?: string };
    linkedin?: { firstComment?: string };
    pinterest?: { boardId: string; targetUrl?: string };
    youtube?: { title: string; description?: string; isShort?: boolean };
  };
  // Metadata interna
  postId?: string; // ID interno de FeedIA para correlacionar
  goalId?: string;
}

export interface UploadResult {
  ok: boolean;
  uploadId: string; // ID que devuelve Upload-Post
  perPlatformResults: Array<{
    platform: SocialPlatform;
    status: 'queued' | 'posted' | 'failed' | 'scheduled';
    socialUrl?: string; // URL pública del post en la red
    socialPostId?: string; // ID del post en la red
    error?: string;
    scheduledFor?: string;
  }>;
  errors: string[];
  costEstimateUsd: number;
}

export interface UploadStatus {
  uploadId: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'scheduled' | 'cancelled';
  perPlatform: UploadResult['perPlatformResults'];
  updatedAt: string;
}

// ── Configuración ─────────────────────────────────────────────────────────────

const UPLOAD_POST_BASE = process.env['UPLOAD_POST_API_BASE'] ?? 'https://api.upload-post.com/v1';
const UPLOAD_POST_KEY = process.env['UPLOAD_POST_API_KEY'] ?? '';

export const isUploadPostAvailable = (): boolean => Boolean(UPLOAD_POST_KEY);

// ── Helpers ───────────────────────────────────────────────────────────────────

const platformMapping: Record<SocialPlatform, string> = {
  instagram: 'instagram',
  tiktok: 'tiktok',
  x: 'twitter',
  linkedin: 'linkedin',
  threads: 'threads',
  facebook: 'facebook',
  youtube: 'youtube_shorts',
  pinterest: 'pinterest',
};

const buildHeaders = (): Record<string, string> => ({
  Authorization: `Bearer ${UPLOAD_POST_KEY}`,
  'Content-Type': 'application/json',
  'User-Agent': 'FeedIA/1.0',
});

const inferMediaTypeOverride = (mediaType: MediaType, platform: SocialPlatform): string => {
  // Mapeo según el agregador
  if (platform === 'instagram') {
    if (mediaType === 'reel') return 'reel';
    if (mediaType === 'story') return 'story';
    if (mediaType === 'carousel') return 'carousel';
    if (mediaType === 'video') return 'reel'; // IG ya no acepta video feed
    return 'feed_post';
  }
  if (platform === 'tiktok') return 'video';
  if (platform === 'youtube') return 'short';
  if (platform === 'pinterest') return mediaType === 'video' ? 'video_pin' : 'pin';
  return mediaType;
};

// ── Mock implementation (cuando no hay API key o dryRun) ─────────────────────

const mockUpload = (payload: UploadPostPayload): UploadResult => {
  log.warn(`[UploadPost] MOCK: dryRun o sin API key. Plataformas: ${payload.platforms.join(', ')}`);
  return {
    ok: true,
    uploadId: `mock-upload-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    perPlatformResults: payload.platforms.map((p) => ({
      platform: p,
      status: payload.scheduleAt ? 'scheduled' : 'posted',
      socialUrl: `https://${p}.com/mock-post-${Date.now()}`,
      socialPostId: `mock-${p}-${Date.now()}`,
      scheduledFor: payload.scheduleAt,
    })),
    errors: [],
    costEstimateUsd: 0,
  };
};

// ── API principal ─────────────────────────────────────────────────────────────

export const uploadToSocial = async (payload: UploadPostPayload): Promise<UploadResult> => {
  // Modo dryRun o sin credenciales: simular
  if (env.dryRun || !isUploadPostAvailable()) {
    return mockUpload(payload);
  }

  log.info(
    `[UploadPost] Publicando en ${payload.platforms.join(', ')} (${payload.mediaType})${payload.scheduleAt ? ` programado para ${payload.scheduleAt}` : ' inmediato'}`,
  );

  const body = {
    media_type: payload.mediaType,
    media_urls: payload.mediaUrls,
    caption:
      payload.caption +
      (payload.hashtags && payload.hashtags.length > 0
        ? `\n\n${payload.hashtags.map((h) => (h.startsWith('#') ? h : `#${h}`)).join(' ')}`
        : ''),
    schedule_at: payload.scheduleAt,
    platforms: payload.platforms.map((p) => ({
      platform: platformMapping[p],
      media_type_override: inferMediaTypeOverride(payload.mediaType, p),
      options: payload.perPlatform?.[p as keyof typeof payload.perPlatform] ?? {},
    })),
    external_id: payload.postId,
    metadata: { goalId: payload.goalId, source: 'feedia' },
  };

  try {
    const response = await fetch(`${UPLOAD_POST_BASE}/uploads`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      log.error(`[UploadPost] Error HTTP ${response.status}: ${errText.slice(0, 200)}`);
      return {
        ok: false,
        uploadId: '',
        perPlatformResults: payload.platforms.map((p) => ({
          platform: p,
          status: 'failed' as const,
          error: `HTTP ${response.status}: ${errText.slice(0, 100)}`,
        })),
        errors: [`HTTP ${response.status}: ${errText.slice(0, 200)}`],
        costEstimateUsd: 0,
      };
    }

    const data = (await response.json()) as {
      id: string;
      results: Array<{
        platform: string;
        status: string;
        url?: string;
        post_id?: string;
        error?: string;
        scheduled_for?: string;
      }>;
      cost_usd?: number;
    };

    // Mapeo inverso de plataforma
    const reverseMapping: Record<string, SocialPlatform> = {};
    for (const [feedia, upload] of Object.entries(platformMapping)) {
      reverseMapping[upload] = feedia as SocialPlatform;
    }

    return {
      ok: true,
      uploadId: data.id,
      perPlatformResults: data.results.map((r) => ({
        platform: reverseMapping[r.platform] ?? (r.platform as SocialPlatform),
        status: r.status as 'queued' | 'posted' | 'failed' | 'scheduled',
        socialUrl: r.url,
        socialPostId: r.post_id,
        error: r.error,
        scheduledFor: r.scheduled_for,
      })),
      errors: [],
      costEstimateUsd: data.cost_usd ?? 0,
    };
  } catch (err) {
    const msg = (err as Error).message;
    log.error(`[UploadPost] Error de red: ${msg}`);
    return {
      ok: false,
      uploadId: '',
      perPlatformResults: payload.platforms.map((p) => ({ platform: p, status: 'failed' as const, error: msg })),
      errors: [msg],
      costEstimateUsd: 0,
    };
  }
};

// ── Consulta de estado ───────────────────────────────────────────────────────

export const getUploadStatus = async (uploadId: string): Promise<UploadStatus | null> => {
  if (env.dryRun || !isUploadPostAvailable()) {
    return {
      uploadId,
      status: 'completed',
      perPlatform: [],
      updatedAt: new Date().toISOString(),
    };
  }

  try {
    const response = await fetch(`${UPLOAD_POST_BASE}/uploads/${uploadId}`, {
      method: 'GET',
      headers: buildHeaders(),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as UploadStatus;
    return data;
  } catch (err) {
    log.warn(`[UploadPost] Error consultando status: ${(err as Error).message}`);
    return null;
  }
};

export const cancelUpload = async (uploadId: string): Promise<boolean> => {
  if (env.dryRun || !isUploadPostAvailable()) return true;
  try {
    const response = await fetch(`${UPLOAD_POST_BASE}/uploads/${uploadId}`, {
      method: 'DELETE',
      headers: buildHeaders(),
    });
    return response.ok;
  } catch {
    return false;
  }
};

// ── Validadores por plataforma (antes de subir) ──────────────────────────────

export interface ValidationResult {
  ok: boolean;
  issues: string[];
}

const PLATFORM_LIMITS: Record<
  SocialPlatform,
  { captionMax: number; hashtagsMax: number; videoMaxSec: number; mediaMaxCount: number }
> = {
  instagram: { captionMax: 2200, hashtagsMax: 30, videoMaxSec: 90, mediaMaxCount: 10 },
  tiktok: { captionMax: 2200, hashtagsMax: 20, videoMaxSec: 600, mediaMaxCount: 1 },
  x: { captionMax: 280, hashtagsMax: 5, videoMaxSec: 140, mediaMaxCount: 4 },
  linkedin: { captionMax: 3000, hashtagsMax: 8, videoMaxSec: 600, mediaMaxCount: 9 },
  threads: { captionMax: 500, hashtagsMax: 5, videoMaxSec: 90, mediaMaxCount: 10 },
  facebook: { captionMax: 63206, hashtagsMax: 30, videoMaxSec: 14400, mediaMaxCount: 10 },
  youtube: { captionMax: 5000, hashtagsMax: 15, videoMaxSec: 60, mediaMaxCount: 1 },
  pinterest: { captionMax: 500, hashtagsMax: 10, videoMaxSec: 60, mediaMaxCount: 1 },
};

export const validatePayloadFor = (platform: SocialPlatform, payload: UploadPostPayload): ValidationResult => {
  const limits = PLATFORM_LIMITS[platform];
  const issues: string[] = [];

  if (payload.caption.length > limits.captionMax) {
    issues.push(
      `Caption excede el límite de ${limits.captionMax} chars en ${platform} (tiene ${payload.caption.length})`,
    );
  }
  if ((payload.hashtags?.length ?? 0) > limits.hashtagsMax) {
    issues.push(`Más de ${limits.hashtagsMax} hashtags en ${platform}`);
  }
  if (payload.mediaUrls.length > limits.mediaMaxCount) {
    issues.push(`Máximo ${limits.mediaMaxCount} medios en ${platform} (provistos ${payload.mediaUrls.length})`);
  }

  // Validaciones específicas
  if (platform === 'instagram' && payload.mediaType === 'carousel' && payload.mediaUrls.length < 2) {
    issues.push('Carrusel de Instagram requiere mínimo 2 imágenes');
  }
  if (platform === 'pinterest' && !payload.perPlatform?.pinterest?.boardId) {
    issues.push('Pinterest requiere boardId');
  }

  return { ok: issues.length === 0, issues };
};

export const validateAll = (
  payload: UploadPostPayload,
): { ok: boolean; perPlatform: Array<{ platform: SocialPlatform; result: ValidationResult }> } => {
  const perPlatform = payload.platforms.map((p) => ({ platform: p, result: validatePayloadFor(p, payload) }));
  return { ok: perPlatform.every((r) => r.result.ok), perPlatform };
};

// ── Helpers de adaptación de caption por plataforma ─────────────────────────

export const adaptCaptionFor = (caption: string, platform: SocialPlatform): string => {
  const limits = PLATFORM_LIMITS[platform];
  if (caption.length <= limits.captionMax) return caption;
  // Cortar respetando palabras y agregar ellipsis
  const cut = caption.slice(0, limits.captionMax - 4);
  return cut.slice(0, cut.lastIndexOf(' ')) + '...';
};

// ── Lista de cuentas conectadas (consulta) ───────────────────────────────────

export interface ConnectedAccount {
  platform: SocialPlatform;
  handle: string;
  isActive: boolean;
  followers?: number;
  expiresAt?: string;
}

export const listConnectedAccounts = async (): Promise<ConnectedAccount[]> => {
  if (env.dryRun || !isUploadPostAvailable()) {
    return [{ platform: 'instagram', handle: 'mock-account', isActive: true, followers: 1234 }];
  }
  try {
    const response = await fetch(`${UPLOAD_POST_BASE}/accounts`, {
      method: 'GET',
      headers: buildHeaders(),
    });
    if (!response.ok) return [];
    const data = (await response.json()) as { accounts: ConnectedAccount[] };
    return data.accounts;
  } catch {
    return [];
  }
};

// ── Uso histórico (para tracking de cuota gratuita 10/mes) ───────────────────

export const getUsageStats = async (): Promise<{ thisMonth: number; quota: number; remaining: number } | null> => {
  if (env.dryRun || !isUploadPostAvailable()) return { thisMonth: 0, quota: 10, remaining: 10 };
  try {
    const response = await fetch(`${UPLOAD_POST_BASE}/usage`, {
      method: 'GET',
      headers: buildHeaders(),
    });
    if (!response.ok) return null;
    return (await response.json()) as { thisMonth: number; quota: number; remaining: number };
  } catch {
    return null;
  }
};
