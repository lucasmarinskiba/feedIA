/**
 * Episodic Content — Crea series episódicas para generar FOMO y seguimiento
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface Episode {
  number: number;
  title: string;
  hook: string;
  teaser: string;
  format: 'reel' | 'carousel' | 'story' | 'post';
  keyTakeaway: string;
  cliffhanger?: string;
}

export interface Series {
  title: string;
  theme: string;
  totalEpisodes: number;
  episodes: Episode[];
  postingSchedule: string;
  whyFollow: string;
}

export const createEpisodicSeries = async (brand: BrandProfile, topic?: string, episodeCount = 5): Promise<Series> => {
  const prompt = `Sos un serial content strategist. Creá una serie episódica para Instagram.

${brandContext(brand)}

Tema: ${topic ?? 'adaptado al nicho'}
Cantidad de episodios: ${episodeCount}

Reglas:
- Cada episodio debe tener un hook propio
- Debe haber progresión (cada episodio suma al anterior)
- El último episodio debe sentirse como gran final
- Usar cliffhangers entre episodios
- Que haya una razón clara para seguir la cuenta y no perderse el siguiente

JSON:
{
  "title": "título de la serie",
  "theme": "tema central",
  "totalEpisodes": ${episodeCount},
  "episodes": [
    {
      "number": 1,
      "title": "título del episodio",
      "hook": "hook de apertura",
      "teaser": "texto para promocionar el episodio",
      "format": "reel|carousel|story|post",
      "keyTakeaway": "qué se lleva el espectador",
      "cliffhanger": "qué queda pendiente (opcional)"
    }
  ],
  "postingSchedule": "frecuencia sugerida",
  "whyFollow": "por qué necesitás seguir la cuenta para no perderte nada"
}`;
  return askJson<Series>(prompt, { maxTokens: 3500 });
};

export const generateEpisodeRecap = async (
  brand: BrandProfile,
  seriesTitle: string,
  episodeNumber: number,
): Promise<{ recap: string; nextTeaser: string }> => {
  const prompt = `Sos un copywriter. Escribí un recap de episodio y teaser del siguiente.

${brandContext(brand)}

Serie: ${seriesTitle} | Episodio: ${episodeNumber}

JSON:
{
  "recap": "resumen del episodio para quienes lo vieron",
  "nextTeaser": "teaser del próximo episodio que genere FOMO"
}`;
  return askJson<{ recap: string; nextTeaser: string }>(prompt, { maxTokens: 1500 });
};
