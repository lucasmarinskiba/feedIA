import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import { createCarrusel } from '../content/carrusel.js';
import { createReel } from '../content/reel.js';
import { createStorySequence } from '../content/stories.js';
import { createCaption } from '../content/caption.js';
import type { BrandProfile } from '../../config/types.js';
import type { CarruselResult } from '../content/carrusel.js';
import type { ReelScript } from '../content/reel.js';
import type { StorySequence } from '../content/stories.js';
import type { CaptionVariants } from '../content/caption.js';

export interface SourceContent {
  tipo: 'blog' | 'video' | 'transcripcion' | 'newsletter' | 'paper' | 'libro' | 'podcast';
  titulo: string;
  texto: string;
  duracionSegundos?: number;
  url?: string;
}

export interface ContentExtraction {
  tesis: string;
  ideasPilar: Array<{ idea: string; argumentoClave: string; momentoFuente: string }>;
  citasReusables: string[];
  estadisticasReusables: string[];
  preguntasParaLaAudiencia: string[];
}

export interface RepurposedSet {
  source: SourceContent;
  extraction: ContentExtraction;
  carruseles: CarruselResult[];
  reels: ReelScript[];
  stories: StorySequence[];
  captions: CaptionVariants[];
}

const extractContent = async (brand: BrandProfile, source: SourceContent): Promise<ContentExtraction> => {
  const prompt = `Actuá como editor extrayendo material reutilizable.

${brandContext(brand)}

FUENTE (${source.tipo}): ${source.titulo}
${source.url ? `URL: ${source.url}` : ''}

CONTENIDO:
"""
${source.texto.slice(0, 12000)}
"""

Extraé:
- Tesis central (1 oración).
- 5-7 ideas pilar (cada una puede convertirse en un post propio).
- Citas reusables (máx 15 palabras cada una, sin sacar de contexto).
- Estadísticas con número y fuente clara (si aparecen en la fuente).
- Preguntas que podríamos hacerle a la audiencia.

NO inventes datos. Si la fuente no tiene una stat, no agregues una.

JSON:
{
  "tesis": "...",
  "ideasPilar": [{ "idea": "...", "argumentoClave": "...", "momentoFuente": "párrafo/timestamp" }],
  "citasReusables": ["..."],
  "estadisticasReusables": ["..."],
  "preguntasParaLaAudiencia": ["..."]
}`;
  return askJson<ContentExtraction>(prompt, { maxTokens: 3500 });
};

export interface RepurposeOptions {
  carruselesCount?: number;
  reelsCount?: number;
  storiesCount?: number;
}

export const repurposeContent = async (
  brand: BrandProfile,
  source: SourceContent,
  opts: RepurposeOptions = {},
): Promise<RepurposedSet> => {
  const extraction = await extractContent(brand, source);
  const carruselesCount = opts.carruselesCount ?? 2;
  const reelsCount = opts.reelsCount ?? 3;
  const storiesCount = opts.storiesCount ?? 1;

  const carruselIdeas = extraction.ideasPilar.slice(0, carruselesCount);
  const reelIdeas = extraction.ideasPilar.slice(0, reelsCount);
  const storyIdeas = extraction.ideasPilar.slice(0, storiesCount);

  const [carruseles, reels, stories] = await Promise.all([
    Promise.all(carruselIdeas.map((i) => createCarrusel(brand, i.idea, 'medio'))),
    Promise.all(reelIdeas.map((i) => createReel(brand, i.idea, 30))),
    Promise.all(storyIdeas.map((i) => createStorySequence(brand, i.idea, 5))),
  ]);

  const captions = await Promise.all(
    carruseles.map((c) => createCaption(brand, `Carrusel basado en "${source.titulo}": ${c.cta}`, 'carrusel')),
  );

  return { source, extraction, carruseles, reels, stories, captions };
};
