/**
 * Observación real de TikTok para el autopilot. Las métricas salen de los videos de la cuenta
 * (API de TikTok) y del historial propio de seguidores. Lo que la API no expone queda como
 * "no disponible" y el motor no lo evalúa.
 */

import { ventanaTikTok } from '../experience/growthMetrics.js';
import type { TTObservation } from './tiktokAutopilot.js';

export const observacionRealTikTok = async (brandId: string): Promise<TTObservation> => {
  const v = await ventanaTikTok(brandId);
  const medido = (valor: unknown): 'real' | 'no disponible' =>
    valor === null || valor === undefined ? 'no disponible' : 'real';

  return {
    brandId,
    timestamp: new Date().toISOString(),
    metrics: {
      viewsLast7d: v ? v.views7d : null,
      viewsPrev7d: v ? v.views7dPrev : null,
      engagementRateLast7d: v?.engagement7d ?? null,
      commentRateLast7d: v?.commentRate7d ?? null,
      shareRateLast7d: v?.shareRate7d ?? null,
      followerDeltaLast7d: v?.followerDelta7d ?? null,
      videosLast7d: v ? v.videos7d : null,
      videosLast30d: v ? v.videos30d : null,
      bestVideoViews30d: v?.mejorVideoViews30d ?? null,
      worstVideoViews30d: v?.peorVideoViews30d ?? null,
    },
    horaUltimoVideo: v?.horaUltimoVideo ?? null,
    fuentes: {
      vistas: medido(v),
      engagement: medido(v?.engagement7d),
      comentarios: medido(v?.commentRate7d),
      compartidos: medido(v?.shareRate7d),
      seguidores: medido(v?.followerDelta7d),
      publicaciones: medido(v),
      horarios: medido(v?.horaUltimoVideo),
      completion: 'no disponible',
      retencion: 'no disponible',
      alcance_fyp: 'no disponible',
      rewatch: 'no disponible',
      sonidos: 'no disponible',
    },
  };
};
