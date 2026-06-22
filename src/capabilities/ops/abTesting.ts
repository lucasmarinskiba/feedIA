import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface AbDecision {
  veredicto: 'mantener' | 'cambiar-hook' | 'cambiar-thumbnail' | 'cambiar-cta' | 'reescribir';
  hookAlternativo?: string;
  captionAlternativo?: string;
  ctaAlternativa?: string;
  razonamiento: string;
}

export interface PostMetrics {
  impresiones: number;
  alcance: number;
  watchTimeProm: number;
  saves: number;
  shares: number;
  comments: number;
  likes: number;
  ctaClicks?: number;
}

export const decideAbVariant = async (
  brand: BrandProfile,
  post: { caption: string; hook: string; format: string },
  metrics: PostMetrics,
  benchmark: PostMetrics,
): Promise<AbDecision> => {
  const prompt = `Actuá como analista de performance decidiendo si conviene variar un post a las 2 horas de publicado.

${brandContext(brand)}

POST ACTUAL:
- Formato: ${post.format}
- Hook: "${post.hook}"
- Caption: "${post.caption}"

MÉTRICAS A LAS 2H:
${JSON.stringify(metrics, null, 2)}

BENCHMARK PROMEDIO DE LA CUENTA:
${JSON.stringify(benchmark, null, 2)}

Reglas:
- Si saves+shares está >20% bajo el benchmark → cambiar hook o caption.
- Si watch time bajo y reach normal → problema de hook.
- Si reach bajo → problema de gancho del primer comentario o thumbnail.
- Si todo está dentro de norma → mantener.

JSON:
{
  "veredicto": "mantener|cambiar-hook|cambiar-thumbnail|cambiar-cta|reescribir",
  "hookAlternativo": "solo si aplica",
  "captionAlternativo": "solo si aplica",
  "ctaAlternativa": "solo si aplica",
  "razonamiento": "qué métricas leíste y qué decisión tomaste"
}`;
  return askJson<AbDecision>(prompt, { maxTokens: 2000 });
};
