/**
 * Analytics por red: cuenta (seguidores y crecimiento por período), historial de seguidores,
 * agregados de posts de los últimos 30 días y audiencia. Reúne lecturas que ya existen en
 * growthMetrics y postsAnalisis; no agrega llamadas a la red salvo la audiencia de Instagram.
 */

import { analizarPostsDeMarca, type BloquePlataforma } from '../executive/postsAnalisis.js';
import {
  getPlatformGrowth,
  readHistory,
  type DeltaInfo,
  type MetricTile,
  type PeriodKey,
  type PlatformGrowthSummary,
} from './growthMetrics.js';
import { leerAudienciaInstagram, type AudienciaInstagram } from './analyticsAudiencia.js';
import {
  resumenDePosts,
  serieSeguidores,
  type PuntoSeguidores,
  type ResumenAnalyticsPosts,
} from './analyticsMetricas.js';

export interface BloqueAnalytics {
  plataforma: 'instagram' | 'tiktok';
  conectado: boolean;
  error: PlatformGrowthSummary['error'] | BloquePlataforma['error'];
  cuenta: {
    handle: string | null;
    seguidores: number | null;
    crecimiento: Record<PeriodKey, DeltaInfo> | null;
    metricas: MetricTile[];
  };
  historial: PuntoSeguidores[];
  posts: ResumenAnalyticsPosts;
  audiencia: AudienciaInstagram;
}

const AUDIENCIA_TIKTOK: AudienciaInstagram = {
  disponible: false,
  motivo: 'TikTok no expone datos demográficos de la audiencia en su API pública.',
  edad: [],
  genero: [],
  ciudades: [],
  paises: [],
};

const armarBloque = (
  plataforma: 'instagram' | 'tiktok',
  crecimiento: PlatformGrowthSummary,
  posts: BloquePlataforma,
  historial: Array<{ capturedAt: string; followers: number }>,
  audiencia: AudienciaInstagram,
  ahoraMs: number,
): BloqueAnalytics => ({
  plataforma,
  conectado: crecimiento.connected && crecimiento.error !== 'token_expired',
  error: crecimiento.error ?? posts.error,
  cuenta: {
    handle: crecimiento.handle ?? null,
    seguidores: crecimiento.followers ?? null,
    crecimiento: crecimiento.deltas ?? null,
    metricas: crecimiento.metrics ?? [],
  },
  historial: serieSeguidores(historial),
  posts: resumenDePosts(posts.posts, posts.resumen, ahoraMs),
  audiencia,
});

export const construirAnalytics = async (
  brandId: string,
): Promise<{ instagram: BloqueAnalytics; tiktok: BloqueAnalytics }> => {
  const ahora = Date.now();
  const [igCrec, ttCrec, bloquesPosts, audiencia] = await Promise.all([
    getPlatformGrowth(brandId, 'instagram'),
    getPlatformGrowth(brandId, 'tiktok'),
    analizarPostsDeMarca(brandId),
    leerAudienciaInstagram(brandId),
  ]);
  const [igHist, ttHist] = await Promise.all([readHistory(brandId, 'instagram'), readHistory(brandId, 'tiktok')]);
  return {
    instagram: armarBloque('instagram', igCrec, bloquesPosts.instagram, igHist, audiencia, ahora),
    tiktok: armarBloque('tiktok', ttCrec, bloquesPosts.tiktok, ttHist, AUDIENCIA_TIKTOK, ahora),
  };
};
