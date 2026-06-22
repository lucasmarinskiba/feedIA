import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface CompetitorPostObservation {
  cuenta: string;
  postUrl?: string;
  formato: 'reel' | 'carrusel' | 'post-imagen' | 'historia';
  resumenContenido: string;
  metricsAprox?: { likes?: number; comments?: number; views?: number };
  publicadoHaceHoras: number;
}

export interface CompetitorOpportunity {
  cuenta: string;
  observacion: string;
  patronDetectado: string;
  oportunidadParaMarca: string;
  accionSugerida: 'replicar-angulo' | 'contraatacar' | 'aprender' | 'ignorar';
  prioridad: 'alta' | 'media' | 'baja';
}

export const analizarCompetidores = async (
  brand: BrandProfile,
  observaciones: CompetitorPostObservation[],
): Promise<CompetitorOpportunity[]> => {
  const prompt = `Actuá como analista competitivo de Instagram. Detectá señales que la marca debería usar a su favor (sin copiar barato).

${brandContext(brand)}

OBSERVACIONES RECIENTES DE COMPETIDORES:
${observaciones
  .map(
    (o, i) =>
      `${i + 1}. @${o.cuenta} (${o.formato}, hace ${o.publicadoHaceHoras}h): ${o.resumenContenido}${
        o.metricsAprox ? ` | métricas≈${JSON.stringify(o.metricsAprox)}` : ''
      }`,
  )
  .join('\n')}

Por cada observación devolvé:
- Patrón detectado (ej: "carruseles educativos cortos sobre X tema con CTA suave")
- Oportunidad concreta (ej: "su post tuvo alta tracción pero faltó profundidad en Y, podemos cubrir eso")
- Acción sugerida: replicar-angulo | contraatacar | aprender | ignorar
- Prioridad

Reglas:
- "replicar-angulo" solo si la marca puede aportar algo distinto.
- "contraatacar" cuando hay desinformación o ángulo débil que podemos refutar con autoridad.
- "ignorar" si es ruido o nada accionable.
- NO sugerir copiar formato + tema literal (eso quema marca).

JSON: array con un objeto por observación.`;
  return askJson<CompetitorOpportunity[]>(prompt, { maxTokens: 3500 });
};

export const detectarVirales = (observaciones: CompetitorPostObservation[]): CompetitorPostObservation[] => {
  const promedios: Record<string, number> = {};
  const conteo: Record<string, number> = {};
  for (const o of observaciones) {
    if (!o.metricsAprox?.likes) continue;
    promedios[o.cuenta] = (promedios[o.cuenta] ?? 0) + o.metricsAprox.likes;
    conteo[o.cuenta] = (conteo[o.cuenta] ?? 0) + 1;
  }
  const finalPromedios: Record<string, number> = {};
  for (const cuenta of Object.keys(promedios)) {
    const total = promedios[cuenta] ?? 0;
    const n = conteo[cuenta] ?? 1;
    finalPromedios[cuenta] = total / n;
  }
  return observaciones.filter((o) => {
    if (!o.metricsAprox?.likes) return false;
    const baseline = finalPromedios[o.cuenta] ?? 0;
    return baseline > 0 && o.metricsAprox.likes > baseline * 2.5;
  });
};
