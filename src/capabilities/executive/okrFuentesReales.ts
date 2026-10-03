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
import type { EntradaKR, KRSource, ValorFuenteReal } from './executiveOKR.js';

export type LectorFuente = (fuente: KRSource, desdeIso: string) => Promise<ValorFuenteReal | null>;

/**
 * Rellena la línea base de los resultados nuevos con fuente real (seguidores) tomando
 * el valor actual. Si la cuenta no está conectada, el resultado queda sin valor inicial.
 */
export const completarBaselines = async (
  entradas: EntradaKR[],
  leer: LectorFuente,
): Promise<{ keyResults: EntradaKR[]; sinValor: string[] }> => {
  const sinValor: string[] = [];
  const keyResults = await Promise.all(
    entradas.map(async (kr): Promise<EntradaKR> => {
      const fuente = kr.fuente ?? 'manual';
      if (kr.id) return { ...kr, fuente };
      if (fuente !== 'manual' && (kr.baseline === undefined || kr.baseline === null)) {
        const lectura = await leer(fuente, new Date().toISOString());
        if (!lectura) sinValor.push(kr.description);
        return { ...kr, fuente, baseline: lectura?.valor ?? 0 };
      }
      return { ...kr, fuente, baseline: kr.baseline ?? 0 };
    }),
  );
  return { keyResults, sinValor };
};

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
