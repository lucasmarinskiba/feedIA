/**
 * Lectura de las fuentes reales de los resultados clave de OKR.
 *
 * Seguidores salen de la API de Instagram/TikTok (valor absoluto). Piezas,
 * carruseles y comentarios salen de los stores persistidos y se cuentan desde el
 * inicio del período. Si una fuente no tiene dato, devuelve null y el KR no se toca.
 */

import { getPlatformGrowth } from '../experience/growthMetrics.js';
import { readJsonl } from '../experience/staffActivity.js';
import { listCarouselJobs } from '../content/index.js';
import { getVideoUsage } from '../videoEngine/usageTracker.js';
import type { KRSource, ValorFuenteReal } from './executiveOKR.js';

export const crearLectorFuentesReales = (
  brandId: string,
  brandName: string,
): ((fuente: KRSource, desdeIso: string) => Promise<ValorFuenteReal | null>) => {
  const seguidores = new Map<'instagram' | 'tiktok', Promise<number | null>>();

  const seguidoresDe = (plataforma: 'instagram' | 'tiktok'): Promise<number | null> => {
    let lectura = seguidores.get(plataforma);
    if (!lectura) {
      lectura = getPlatformGrowth(brandId, plataforma).then((g) =>
        g.connected && !g.error && typeof g.followers === 'number' ? g.followers : null,
      );
      seguidores.set(plataforma, lectura);
    }
    return lectura;
  };

  return async (fuente, desdeIso) => {
    const desde = Date.parse(desdeIso);
    switch (fuente) {
      case 'seguidores-instagram':
      case 'seguidores-tiktok': {
        const valor = await seguidoresDe(fuente === 'seguidores-instagram' ? 'instagram' : 'tiktok');
        return valor === null ? null : { valor, absoluto: true };
      }
      case 'piezas-creadas': {
        const carruseles = listCarouselJobs(brandName).filter(
          (c) => c.status !== 'failed' && Date.parse(c.startedAt) >= desde,
        ).length;
        const videos = getVideoUsage({ brandName }).filter((v) => v.success && Date.parse(v.createdAt) >= desde).length;
        return { valor: carruseles + videos, absoluto: false };
      }
      case 'carruseles-publicados': {
        const publicados = listCarouselJobs(brandName).filter(
          (c) => c.status === 'published' && Date.parse(c.finishedAt ?? c.startedAt) >= desde,
        ).length;
        return { valor: publicados, absoluto: false };
      }
      case 'comentarios-revisados': {
        const revisados = readJsonl<{ decidedAt: string }>('data/runtime/comment-review-decisions.jsonl').filter(
          (c) => Date.parse(c.decidedAt) >= desde,
        ).length;
        return { valor: revisados, absoluto: false };
      }
      default:
        return null;
    }
  };
};
