/**
 * Observación real de la cuenta de Instagram para el autopilot.
 *
 * Cada métrica sale de una fuente real: Graph API (alcance, engagement, publicaciones,
 * formatos, horarios), historial de seguidores, inbox de DMs y cola de comentarios.
 * Lo que la API no entrega queda marcado "no disponible" y el motor no lo evalúa.
 */

import { ventanaInstagram } from '../experience/growthMetrics.js';
import { readJsonl } from '../experience/staffActivity.js';
import { getHistory } from '../../agent/bus.js';
import { getInboxSnapshot, listConversations } from '../community/dmInbox.js';
import type { IGObservation } from './instagramAutopilot.js';

interface DecisionComentario {
  itemId: string;
}

const minutosDesde = (iso: string, ahora: number): number => (ahora - Date.parse(iso)) / 60_000;

export const observacionRealInstagram = async (brandId: string): Promise<IGObservation> => {
  const ventana = await ventanaInstagram(brandId);
  const ahora = Date.now();

  const inbox = getInboxSnapshot();
  const sinResponder = [...listConversations({ status: 'new' }), ...listConversations({ status: 'in-progress' })];
  const esperaPromedio =
    sinResponder.length > 0
      ? sinResponder.reduce((s, c) => s + minutosDesde(c.lastMessageAt, ahora), 0) / sinResponder.length
      : null;

  const revisados = new Set(
    readJsonl<DecisionComentario>('data/runtime/comment-review-decisions.jsonl').map((d) => d.itemId),
  );
  const comentariosPendientes = getHistory(500).filter(
    (e) => e.type === 'CommentReviewRequired' && !revisados.has(String(e.payload.reviewId ?? '')),
  ).length;

  const fuentes: IGObservation['fuentes'] = {
    alcance: ventana?.reach7d !== null && ventana?.reach7d !== undefined ? 'real' : 'no disponible',
    engagement: ventana?.engagement7d !== null && ventana?.engagement7d !== undefined ? 'real' : 'no disponible',
    seguidores: ventana?.followerDelta7d !== null && ventana?.followerDelta7d !== undefined ? 'real' : 'no disponible',
    publicaciones: ventana ? 'real' : 'no disponible',
    formatos: ventana && (ventana.formatos.reels || ventana.formatos.carruseles) ? 'real' : 'no disponible',
    horarios: ventana && ventana.horaUltimoPost !== null ? 'real' : 'no disponible',
    dms: 'real',
    comentarios: 'real',
    stories: 'no disponible',
    hashtags: 'no disponible',
  };

  return {
    brandId,
    timestamp: new Date().toISOString(),
    metrics: {
      reachLast7d: ventana?.reach7d ?? null,
      reachPrev7d: ventana?.reachPrev7d ?? null,
      engagementRateLast7d: ventana?.engagement7d ?? null,
      engagementRatePrev7d: ventana?.engagementPrev7d ?? null,
      followerDeltaLast7d: ventana?.followerDelta7d ?? null,
      postsLast7d: ventana ? ventana.posts7d : null,
      storiesLast7d: null,
      reelsLast7d: ventana ? ventana.reels7d : null,
      avgDmResponseMinutes: esperaPromedio !== null ? Math.round(esperaPromedio) : null,
      commentBacklog: comentariosPendientes,
      dmBacklog: inbox.needingResponse,
    },
    formatos: ventana?.formatos ?? { reels: null, carruseles: null },
    hashtagHealthScore: null,
    bestPostingHourLast30d: ventana?.horaMejor30d ?? null,
    postingHourLast7d: ventana?.horaUltimoPost ?? null,
    fuentes,
  };
};
