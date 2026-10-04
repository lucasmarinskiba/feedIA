/**
 * Lectura de posts reales de Instagram (Graph API) y TikTok (video/list) para el análisis.
 * Las métricas que la API no entrega quedan en null y no entran a las medianas.
 */

import { log } from '../../agent/logger.js';
import { metaFetch } from '../../integrations/metaApiClient.js';
import { getConnection, isExpired } from '../../integrations/oauthConnections.js';
import { registrarPosts } from './postsStore.js';
import {
  analizarPosts,
  type PostAnalizado,
  type PostCrudo,
  type PostFormato,
  type PostPlataforma,
  type ResumenPosts,
} from './postsMetricas.js';

export interface LecturaPlataforma {
  conectado: boolean;
  error?: 'token_expired' | 'lectura_fallida';
  posts: PostCrudo[];
}

export interface BloquePlataforma {
  plataforma: PostPlataforma;
  conectado: boolean;
  error?: 'token_expired' | 'lectura_fallida';
  posts: PostAnalizado[];
  resumen: ResumenPosts;
}

const TTL_LECTURA_MS = 30 * 60_000;
const LIMITE_POSTS = 20;
const cacheLectura = new Map<string, { at: number; valor: LecturaPlataforma }>();

interface MediaIG {
  id: string;
  caption?: string;
  media_type?: string;
  media_product_type?: string;
  permalink?: string;
  timestamp?: string;
  like_count?: number;
  comments_count?: number;
}

interface VideoTikTok {
  id: string;
  title?: string;
  create_time?: number;
  duration?: number;
  share_url?: string;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
}

const formatoIG = (m: MediaIG): PostFormato => {
  if (m.media_product_type === 'REELS') return 'reel';
  if (m.media_type === 'CAROUSEL_ALBUM') return 'carrusel';
  if (m.media_type === 'VIDEO') return 'video';
  return 'imagen';
};

const primeraLinea = (texto: string | undefined): string => {
  const linea = (texto ?? '')
    .split('\n')
    .map((s) => s.trim())
    .find((s) => s.length > 0);
  if (!linea) return 'Sin texto';
  return linea.length > 90 ? `${linea.slice(0, 87)}...` : linea;
};

const pedirInsights = async (mediaId: string, token: string, metricas: string): Promise<Record<string, number>> => {
  const res = await metaFetch(
    `https://graph.instagram.com/v18.0/${mediaId}/insights?metric=${metricas}&access_token=${token}`,
    {},
    { description: 'IG insights de post', maxAttempts: 2 },
  );
  const data = (await res.json()) as {
    data?: Array<{ name: string; values?: Array<{ value?: number }> }>;
    error?: unknown;
  };
  if (data.error) throw new Error(`insights no disponibles: ${metricas}`);
  const out: Record<string, number> = {};
  for (const m of data.data ?? []) {
    const valor = m.values?.[0]?.value;
    if (typeof valor === 'number') out[m.name] = valor;
  }
  return out;
};

const insightsIG = async (mediaId: string, token: string, esReel: boolean): Promise<Record<string, number>> => {
  const base = esReel ? 'reach,saved,shares,plays' : 'reach,saved,shares';
  if (!esReel) return pedirInsights(mediaId, token, base);
  try {
    return await pedirInsights(mediaId, token, `${base},ig_reels_avg_watch_time`);
  } catch {
    return pedirInsights(mediaId, token, base);
  }
};

const leerInstagram = async (brandId: string): Promise<LecturaPlataforma> => {
  const conn = await getConnection(brandId, 'instagram');
  const igId = String(conn?.metadata?.igBusinessId ?? '');
  if (!conn || !conn.accessToken || !igId) return { conectado: false, posts: [] };
  if (isExpired(conn)) return { conectado: false, error: 'token_expired', posts: [] };
  const token = conn.accessToken;
  try {
    const res = await metaFetch(
      `https://graph.instagram.com/v18.0/${igId}/media?fields=id,caption,media_type,media_product_type,permalink,timestamp,like_count,comments_count&limit=${LIMITE_POSTS}&access_token=${token}`,
      {},
      { description: 'IG media para análisis', maxAttempts: 2 },
    );
    const medias = (((await res.json()) as { data?: MediaIG[] }).data ?? []).filter((m) => Boolean(m.timestamp));
    const posts = await Promise.all(
      medias.map(async (m): Promise<PostCrudo> => {
        const esReel = m.media_product_type === 'REELS';
        const ins = await insightsIG(m.id, token, esReel).catch((err: unknown): Record<string, number> => {
          log.warn('[PostsAnalisis] insights de post de Instagram no disponibles', { error: String(err) });
          return {};
        });
        return {
          id: m.id,
          plataforma: 'instagram',
          formato: formatoIG(m),
          texto: primeraLinea(m.caption),
          url: m.permalink ?? null,
          publicadoEn: m.timestamp ?? '',
          likes: m.like_count ?? 0,
          comentarios: m.comments_count ?? 0,
          compartidos: ins['shares'] ?? null,
          guardados: ins['saved'] ?? null,
          alcance: ins['reach'] ?? null,
          duracionSeg: null,
          captionCompleto: m.caption ?? '',
          tiempoVisualizacionSeg:
            ins['ig_reels_avg_watch_time'] === undefined ? null : ins['ig_reels_avg_watch_time'] / 1000,
        };
      }),
    );
    return { conectado: true, posts };
  } catch (err) {
    log.warn('[PostsAnalisis] lectura de Instagram falló', { error: String(err) });
    return { conectado: true, error: 'lectura_fallida', posts: [] };
  }
};

const leerTikTok = async (brandId: string): Promise<LecturaPlataforma> => {
  const conn = await getConnection(brandId, 'tiktok');
  if (!conn || !conn.accessToken) return { conectado: false, posts: [] };
  if (isExpired(conn)) return { conectado: false, error: 'token_expired', posts: [] };
  const token = conn.accessToken;
  try {
    const res = await fetch(
      'https://open.tiktokapis.com/v2/video/list/?fields=id,title,create_time,duration,share_url,view_count,like_count,comment_count,share_count',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ max_count: LIMITE_POSTS }),
      },
    );
    if (!res.ok) return { conectado: true, error: 'lectura_fallida', posts: [] };
    const json = (await res.json()) as { data?: { videos?: VideoTikTok[] } };
    const posts = (json.data?.videos ?? []).flatMap((v): PostCrudo[] =>
      typeof v.create_time === 'number'
        ? [
            {
              id: v.id,
              plataforma: 'tiktok',
              formato: 'video',
              texto: primeraLinea(v.title),
              url: v.share_url ?? null,
              publicadoEn: new Date(v.create_time * 1000).toISOString(),
              likes: v.like_count ?? 0,
              comentarios: v.comment_count ?? 0,
              compartidos: v.share_count ?? null,
              guardados: null,
              alcance: v.view_count ?? null,
              duracionSeg: v.duration ?? null,
              captionCompleto: v.title ?? '',
              tiempoVisualizacionSeg: null,
            },
          ]
        : [],
    );
    return { conectado: true, posts };
  } catch (err) {
    log.warn('[PostsAnalisis] lectura de TikTok falló', { error: String(err) });
    return { conectado: true, error: 'lectura_fallida', posts: [] };
  }
};

const leerConCache = async (
  brandId: string,
  plataforma: PostPlataforma,
  refrescar: boolean,
): Promise<LecturaPlataforma> => {
  const clave = `${brandId}:${plataforma}`;
  const previo = cacheLectura.get(clave);
  if (!refrescar && previo && Date.now() - previo.at < TTL_LECTURA_MS) return previo.valor;
  const valor = plataforma === 'instagram' ? await leerInstagram(brandId) : await leerTikTok(brandId);
  if (!valor.error) {
    cacheLectura.set(clave, { at: Date.now(), valor });
    await registrarPosts(brandId, valor.posts);
  }
  return valor;
};

export const analizarPostsDeMarca = async (
  brandId: string,
  opciones: { refrescar?: boolean } = {},
): Promise<{ instagram: BloquePlataforma; tiktok: BloquePlataforma }> => {
  const [ig, tt] = await Promise.all([
    leerConCache(brandId, 'instagram', opciones.refrescar ?? false),
    leerConCache(brandId, 'tiktok', opciones.refrescar ?? false),
  ]);
  const bloque = (plataforma: PostPlataforma, lectura: LecturaPlataforma): BloquePlataforma => {
    const { posts, resumen } = analizarPosts(lectura.posts);
    return { plataforma, conectado: lectura.conectado, error: lectura.error, posts, resumen };
  };
  return { instagram: bloque('instagram', ig), tiktok: bloque('tiktok', tt) };
};
