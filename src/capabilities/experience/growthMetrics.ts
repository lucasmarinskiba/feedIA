/**
 * Growth Metrics — números reales de Instagram + TikTok para "Crecimiento por red".
 *
 * Ni Meta ni TikTok exponen el historial de followers vía API pública (solo el
 * valor actual), así que el único modo honesto de mostrar crecimiento semanal/
 * mensual/trimestral/semestral/anual es guardar nuestro propio snapshot diario
 * (data/runtime/growthHistory/{brandId}-{platform}.jsonl) y comparar contra el
 * punto más cercano a cada corte. Si todavía no hay suficiente historial para
 * un período, se marca `available:false` — nunca se inventa un número.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import { metaFetch } from '../../integrations/metaApiClient.js';
import {
  getConnection,
  isExpired,
  type OAuthConnection,
  type ConnectionPlatform,
} from '../../integrations/oauthConnections.js';

export type PeriodKey = 'week' | 'month' | 'quarter' | 'halfYear' | 'year';

const PERIOD_DAYS: Record<PeriodKey, number> = {
  week: 7,
  month: 30,
  quarter: 90,
  halfYear: 182,
  year: 365,
};

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  week: 'Semana',
  month: 'Mes',
  quarter: 'Trimestre',
  halfYear: '6 meses',
  year: 'Año',
};

interface DeltaInfo {
  available: boolean;
  value?: number;
  pct?: number;
  sinceIso?: string;
}

export interface MetricTile {
  label: string;
  value: number;
  format: 'number' | 'percent';
  hint?: string;
}

export interface PlatformGrowthSummary {
  connected: boolean;
  error?: 'token_expired' | 'metrics_unavailable';
  loginUrl?: string;
  handle?: string;
  followers?: number;
  deltas?: Record<PeriodKey, DeltaInfo>;
  metrics?: MetricTile[];
  sparkline?: number[];
  capturedAt?: string;
}

/* ───────── Historial propio de followers (snapshot diario) ───────── */

interface HistoryPoint {
  capturedAt: string;
  followers: number;
}

const HISTORY_DIR = path.resolve('data/runtime/growthHistory');

const historyFile = (brandId: string, platform: ConnectionPlatform): string =>
  path.join(HISTORY_DIR, `${brandId}-${platform}.jsonl`);

const readHistory = async (brandId: string, platform: ConnectionPlatform): Promise<HistoryPoint[]> => {
  try {
    const raw = await fs.readFile(historyFile(brandId, platform), 'utf-8');
    return raw
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => JSON.parse(line) as HistoryPoint);
  } catch {
    return [];
  }
};

const appendSnapshotIfNew = async (brandId: string, platform: ConnectionPlatform, followers: number): Promise<void> => {
  const history = await readHistory(brandId, platform);
  const todayKey = new Date().toISOString().slice(0, 10);
  const last = history[history.length - 1];
  if (last && last.capturedAt.slice(0, 10) === todayKey) return; // ya capturado hoy
  await fs.mkdir(HISTORY_DIR, { recursive: true });
  const point: HistoryPoint = { capturedAt: new Date().toISOString(), followers };
  await fs.appendFile(historyFile(brandId, platform), JSON.stringify(point) + '\n', 'utf-8');
};

const computeDeltas = (history: HistoryPoint[], current: number): Record<PeriodKey, DeltaInfo> => {
  const now = Date.now();
  const result = {} as Record<PeriodKey, DeltaInfo>;
  for (const key of Object.keys(PERIOD_DAYS) as PeriodKey[]) {
    const cutoff = now - PERIOD_DAYS[key] * 86_400_000;
    let candidate: HistoryPoint | null = null;
    for (const p of history) {
      if (new Date(p.capturedAt).getTime() <= cutoff) candidate = p;
      else break;
    }
    if (!candidate) {
      result[key] = { available: false };
      continue;
    }
    const value = current - candidate.followers;
    const pct = candidate.followers > 0 ? (value / candidate.followers) * 100 : undefined;
    result[key] = { available: true, value, pct, sinceIso: candidate.capturedAt };
  }
  return result;
};

/* ───────── Instagram (Meta Graph) ───────── */

interface IgLive {
  followers: number;
  mediaCount: number;
  username: string;
  reach30d: number;
  profileVisits30d: number;
  likes30d: number;
  comments30d: number;
  posts30d: number;
}

const fetchInstagramLive = async (conn: OAuthConnection): Promise<IgLive | null> => {
  const igId = conn.metadata?.igBusinessId;
  if (!igId || !conn.accessToken) return null;
  try {
    const profileRes = await metaFetch(
      `https://graph.facebook.com/v19.0/${igId}?fields=followers_count,media_count,username&access_token=${conn.accessToken}`,
      {},
      { description: 'IG profile', maxAttempts: 2 },
    );
    const profile = (await profileRes.json()) as {
      followers_count?: number;
      media_count?: number;
      username?: string;
    };

    const since = Math.floor((Date.now() - 30 * 86_400_000) / 1000);
    const until = Math.floor(Date.now() / 1000);
    const insightsRes = await metaFetch(
      `https://graph.facebook.com/v19.0/${igId}/insights?metric=reach,profile_views&period=day&metric_type=total_value&since=${since}&until=${until}&access_token=${conn.accessToken}`,
      {},
      { description: 'IG insights', maxAttempts: 2 },
    );
    const insightsData = (await insightsRes.json()) as {
      data?: Array<{ name: string; total_value?: { value: number } }>;
    };
    let reach30d = 0;
    let profileVisits30d = 0;
    for (const item of insightsData.data ?? []) {
      if (item.name === 'reach') reach30d = item.total_value?.value ?? 0;
      if (item.name === 'profile_views') profileVisits30d = item.total_value?.value ?? 0;
    }

    const mediaRes = await metaFetch(
      `https://graph.facebook.com/v19.0/${igId}/media?fields=like_count,comments_count,timestamp&limit=50&access_token=${conn.accessToken}`,
      {},
      { description: 'IG media list', maxAttempts: 2 },
    );
    const mediaData = (await mediaRes.json()) as {
      data?: Array<{ like_count?: number; comments_count?: number; timestamp?: string }>;
    };
    const cutoffMs = Date.now() - 30 * 86_400_000;
    let likes30d = 0;
    let comments30d = 0;
    let posts30d = 0;
    for (const m of mediaData.data ?? []) {
      if (!m.timestamp || new Date(m.timestamp).getTime() < cutoffMs) continue;
      likes30d += m.like_count ?? 0;
      comments30d += m.comments_count ?? 0;
      posts30d += 1;
    }

    return {
      followers: profile.followers_count ?? 0,
      mediaCount: profile.media_count ?? 0,
      username: profile.username ?? '',
      reach30d,
      profileVisits30d,
      likes30d,
      comments30d,
      posts30d,
    };
  } catch (err) {
    log.warn('[GrowthMetrics] IG live fetch failed', { error: String(err) });
    return null;
  }
};

/* ───────── TikTok (v2 API) ───────── */

interface TtLive {
  followers: number;
  displayName: string;
  views30d: number;
  likes30d: number;
  comments30d: number;
  shares30d: number;
  posts30d: number;
}

const fetchTikTokLive = async (conn: OAuthConnection): Promise<TtLive | null> => {
  if (!conn.accessToken) return null;
  try {
    const userRes = await fetch(
      'https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,follower_count,likes_count,video_count',
      { headers: { Authorization: `Bearer ${conn.accessToken}` } },
    );
    if (!userRes.ok) return null;
    const userJson = (await userRes.json()) as {
      data?: { user?: { display_name?: string; follower_count?: number } };
    };
    const user = userJson.data?.user;
    if (!user) return null;

    let views30d = 0;
    let likes30d = 0;
    let comments30d = 0;
    let shares30d = 0;
    let posts30d = 0;

    const videoRes = await fetch(
      'https://open.tiktokapis.com/v2/video/list/?fields=id,create_time,view_count,like_count,comment_count,share_count',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${conn.accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_count: 20 }),
      },
    );
    if (videoRes.ok) {
      const videoJson = (await videoRes.json()) as {
        data?: {
          videos?: Array<{
            create_time?: number;
            view_count?: number;
            like_count?: number;
            comment_count?: number;
            share_count?: number;
          }>;
        };
      };
      const cutoffSec = Math.floor((Date.now() - 30 * 86_400_000) / 1000);
      for (const v of videoJson.data?.videos ?? []) {
        if (!v.create_time || v.create_time < cutoffSec) continue;
        views30d += v.view_count ?? 0;
        likes30d += v.like_count ?? 0;
        comments30d += v.comment_count ?? 0;
        shares30d += v.share_count ?? 0;
        posts30d += 1;
      }
    }

    return {
      followers: user.follower_count ?? 0,
      displayName: user.display_name ?? '',
      views30d,
      likes30d,
      comments30d,
      shares30d,
      posts30d,
    };
  } catch (err) {
    log.warn('[GrowthMetrics] TikTok live fetch failed', { error: String(err) });
    return null;
  }
};

/* ───────── Orquestación ───────── */

export const getPlatformGrowth = async (
  brandId: string,
  platform: ConnectionPlatform,
): Promise<PlatformGrowthSummary> => {
  const conn = await getConnection(brandId, platform);
  if (!conn || !conn.accessToken) {
    return { connected: false, loginUrl: `/api/auth/${platform}/login` };
  }
  if (isExpired(conn)) {
    return { connected: true, error: 'token_expired', loginUrl: `/api/auth/${platform}/login` };
  }

  if (platform === 'instagram') {
    const live = await fetchInstagramLive(conn);
    if (!live) return { connected: true, error: 'metrics_unavailable', loginUrl: '/api/auth/instagram/login' };
    await appendSnapshotIfNew(brandId, 'instagram', live.followers);
    const history = await readHistory(brandId, 'instagram');
    const erPct = live.reach30d > 0 ? ((live.likes30d + live.comments30d) / live.reach30d) * 100 : 0;
    return {
      connected: true,
      handle: live.username ? `@${live.username}` : '—',
      followers: live.followers,
      deltas: computeDeltas(history, live.followers),
      metrics: [
        { label: 'Alcance 30d', value: live.reach30d, format: 'number' },
        { label: 'ER promedio', value: Math.round(erPct * 10) / 10, format: 'percent', hint: 'vs benchmark 4.5%' },
        { label: 'Posts 30d', value: live.posts30d, format: 'number' },
        { label: 'Visitas al perfil', value: live.profileVisits30d, format: 'number' },
      ],
      sparkline: history.map((h) => h.followers),
      capturedAt: new Date().toISOString(),
    };
  }

  const live = await fetchTikTokLive(conn);
  if (!live) return { connected: true, error: 'metrics_unavailable', loginUrl: '/api/auth/tiktok/login' };
  await appendSnapshotIfNew(brandId, 'tiktok', live.followers);
  const history = await readHistory(brandId, 'tiktok');
  return {
    connected: true,
    handle: live.displayName ? `@${live.displayName}` : '—',
    followers: live.followers,
    deltas: computeDeltas(history, live.followers),
    metrics: [
      { label: 'Views 30d', value: live.views30d, format: 'number' },
      { label: 'Likes 30d', value: live.likes30d, format: 'number' },
      { label: 'Comments 30d', value: live.comments30d, format: 'number' },
      { label: 'Shares 30d', value: live.shares30d, format: 'number' },
    ],
    sparkline: history.map((h) => h.followers),
    capturedAt: new Date().toISOString(),
  };
};

/**
 * Snapshot liviano diario (solo followers) para el cron — no pega contra
 * insights/media list, así que no gasta rate limit de Meta/TikTok de más.
 */
export const captureSnapshotOnly = async (brandId: string, platform: ConnectionPlatform): Promise<void> => {
  const conn = await getConnection(brandId, platform);
  if (!conn || !conn.accessToken || isExpired(conn)) return;

  if (platform === 'instagram') {
    const igId = conn.metadata?.igBusinessId;
    if (!igId) return;
    try {
      const res = await metaFetch(
        `https://graph.facebook.com/v19.0/${igId}?fields=followers_count&access_token=${conn.accessToken}`,
        {},
        { description: 'IG daily snapshot', maxAttempts: 2 },
      );
      const data = (await res.json()) as { followers_count?: number };
      if (typeof data.followers_count === 'number') {
        await appendSnapshotIfNew(brandId, 'instagram', data.followers_count);
      }
    } catch (err) {
      log.warn('[GrowthMetrics] IG daily snapshot failed', { error: String(err) });
    }
    return;
  }

  try {
    const res = await fetch('https://open.tiktokapis.com/v2/user/info/?fields=follower_count', {
      headers: { Authorization: `Bearer ${conn.accessToken}` },
    });
    if (!res.ok) return;
    const data = (await res.json()) as { data?: { user?: { follower_count?: number } } };
    const followers = data.data?.user?.follower_count;
    if (typeof followers === 'number') await appendSnapshotIfNew(brandId, 'tiktok', followers);
  } catch (err) {
    log.warn('[GrowthMetrics] TikTok daily snapshot failed', { error: String(err) });
  }
};
