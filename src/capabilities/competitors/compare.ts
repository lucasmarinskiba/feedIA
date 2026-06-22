import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';
import type { PerformanceSnapshot } from '../analytics/insights.js';

export interface BenchmarkCompetitor {
  cuenta: string;
  followers: number;
  engagementRateProm: number;
  postingCadence: string;
  fortalezas: string[];
  debilidades: string[];
}

export interface CompetitorComparison {
  ventajasMarca: string[];
  desventajasMarca: string[];
  metricaCriticaDetras: string;
  jugadasInmediatas: Array<{ accion: string; impactoEsperado: string; esfuerzo: 'bajo' | 'medio' | 'alto' }>;
  jugadasMedioPlazo: string[];
}

export const compararConCompetidores = async (
  brand: BrandProfile,
  miSnapshot: PerformanceSnapshot,
  competidores: BenchmarkCompetitor[],
): Promise<CompetitorComparison> => {
  const prompt = `Actuá como estratega comparando la marca contra competidores directos.

${brandContext(brand)}

MIS NÚMEROS (ventana ${miSnapshot.ventana.desde} → ${miSnapshot.ventana.hasta}):
- Posts: ${miSnapshot.posts.length}
- Followers: ${miSnapshot.cuenta?.followers ?? 'N/A'}
- Δ followers: ${miSnapshot.cuenta?.followersDelta ?? 'N/A'}
- Saves prom: ${miSnapshot.benchmarks.savesProm.toFixed(1)}
- Shares prom: ${miSnapshot.benchmarks.sharesProm.toFixed(1)}
- Comments prom: ${miSnapshot.benchmarks.commentsProm.toFixed(1)}

COMPETIDORES:
${competidores
  .map(
    (c) =>
      `@${c.cuenta} | ${c.followers} followers | ER ${(c.engagementRateProm * 100).toFixed(2)}% | cadencia: ${c.postingCadence}\n  Fortalezas: ${c.fortalezas.join(', ')}\n  Debilidades: ${c.debilidades.join(', ')}`,
  )
  .join('\n\n')}

Evitá generalizaciones. Sé concreto.

JSON:
{
  "ventajasMarca": ["..."],
  "desventajasMarca": ["..."],
  "metricaCriticaDetras": "una métrica donde la marca está peor y que importa más",
  "jugadasInmediatas": [
    { "accion": "...", "impactoEsperado": "...", "esfuerzo": "bajo|medio|alto" }
  ],
  "jugadasMedioPlazo": ["..."]
}`;
  return askJson<CompetitorComparison>(prompt, { maxTokens: 3500 });
};
