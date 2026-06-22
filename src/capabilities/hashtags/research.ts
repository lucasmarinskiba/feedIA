import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export type HashtagTier = 'mega' | 'grande' | 'medio' | 'nicho' | 'marca';

export interface HashtagEntry {
  tag: string;
  tier: HashtagTier;
  volumenEstimado: 'masivo' | 'alto' | 'medio' | 'bajo';
  intencion: string;
  riesgoBaneo: 'bajo' | 'medio' | 'alto';
}

export interface HashtagResearchResult {
  pools: Record<HashtagTier, HashtagEntry[]>;
  recomendacionMezclaPorPost: { mega: number; grande: number; medio: number; nicho: number; marca: number };
  notas: string;
}

export const investigarHashtags = async (brand: BrandProfile, tema?: string): Promise<HashtagResearchResult> => {
  const prompt = `Actuá como hashtag strategist para Instagram en LATAM.

${brandContext(brand)}
${tema ? `\nTEMA ESPECÍFICO: ${tema}` : ''}

Generá pools de hashtags balanceados por tier:
- mega: > 10M posts (alta competencia, poco retorno orgánico, usar 1-2)
- grande: 1M-10M posts
- medio: 100k-1M posts (sweet spot)
- nicho: 10k-100k posts (audiencia específica, alta conversión)
- marca: < 10k o únicos de marca

Reglas:
- Sin hashtags genéricos vacíos tipo #love, #instagood.
- Marcar riesgoBaneo=alto si el tag es históricamente shadowbanned o problemático.
- Recomendá la mezcla óptima por post (suma máxima de 15 hashtags total).

JSON:
{
  "pools": {
    "mega": [{ "tag": "#...", "tier": "mega", "volumenEstimado": "masivo", "intencion": "...", "riesgoBaneo": "bajo|medio|alto" }],
    "grande": [...],
    "medio": [...8-12 items],
    "nicho": [...10-15 items],
    "marca": [...3-5 items]
  },
  "recomendacionMezclaPorPost": { "mega": 1, "grande": 2, "medio": 5, "nicho": 6, "marca": 1 },
  "notas": "razonamiento de la mezcla y warnings"
}`;
  return askJson<HashtagResearchResult>(prompt, { maxTokens: 5000 });
};
