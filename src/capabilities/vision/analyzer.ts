import { claude } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import { env } from '../../config/index.js';
import type { BrandProfile } from '../../config/types.js';

export type VisionMediaSource =
  | { type: 'url'; url: string }
  | { type: 'base64'; mediaType: 'image/jpeg' | 'image/png' | 'image/webp' | 'image/gif'; data: string };

export interface ImageAnalysis {
  descripcion: string;
  elementosClave: string[];
  paletaDominante: string[];
  emocion: string;
  composicion: string;
  brandConsistency: { score: number; razones: string[] };
  ideasParaCarrusel: string[];
  ideasParaReel: string[];
  hashtagsSugeridos: string[];
  riesgosVisuales: string[];
}

const buildBrandRules = (brand: BrandProfile): string => `
Voz de marca: ${brand.voice.tone.join(', ')}
Estilo visual declarado: ${brand.visual.style}
Paleta declarada: ${brand.visual.palette.join(', ') || '(sin definir)'}
Tipografía: ${brand.visual.typography.join(', ') || '(sin definir)'}
`;

const askVision = async <T>(source: VisionMediaSource, prompt: string, maxTokens = 2500): Promise<T> => {
  const imageBlock =
    source.type === 'url'
      ? { type: 'image' as const, source: { type: 'url' as const, url: source.url } }
      : {
          type: 'image' as const,
          source: { type: 'base64' as const, media_type: source.mediaType, data: source.data },
        };

  const response = await claude.messages.create({
    model: env.modelPrimary,
    max_tokens: maxTokens,
    messages: [
      {
        role: 'user',
        content: [
          imageBlock,
          {
            type: 'text' as const,
            text: `${prompt}\n\nResponde EXCLUSIVAMENTE con JSON válido, sin texto antes ni después, sin bloques de código markdown.`,
          },
        ],
      },
    ],
  });
  const block = response.content[0];
  if (!block || block.type !== 'text') throw new Error('Respuesta sin texto');
  const cleaned = block.text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');
  return JSON.parse(cleaned) as T;
};

export const analizarImagen = async (brand: BrandProfile, source: VisionMediaSource): Promise<ImageAnalysis> => {
  const prompt = `Sos un director de arte analizando una imagen para Instagram.

${brandContext(brand)}
${buildBrandRules(brand)}

Tarea: analizá la imagen y devolvé un análisis útil para decidir si encaja con la marca y qué se puede hacer con ella.

Reglas:
- "paletaDominante": 3-5 hex codes reales que identifiques en la imagen.
- "brandConsistency.score" 0-100 comparando con paleta + estilo declarados.
- "ideasParaCarrusel" / "ideasParaReel": 3 ideas concretas, no genéricas.
- "riesgosVisuales": logos de terceros, personas reconocibles, marcas registradas, contenido sensible.

JSON:
{
  "descripcion": "qué se ve, factual",
  "elementosClave": ["..."],
  "paletaDominante": ["#xxxxxx"],
  "emocion": "qué transmite",
  "composicion": "regla de tercios, simetría, etc",
  "brandConsistency": { "score": 0, "razones": ["..."] },
  "ideasParaCarrusel": ["..."],
  "ideasParaReel": ["..."],
  "hashtagsSugeridos": ["#..."],
  "riesgosVisuales": ["..."]
}`;
  return askVision<ImageAnalysis>(source, prompt, 3500);
};

export interface CaptionFromImage {
  captionCorto: string;
  captionMedio: string;
  captionLargo: string;
  hashtags: string[];
  hooksAlternativos: string[];
  ctaPropuesta: string;
}

export const captionDesdeImagen = async (
  brand: BrandProfile,
  source: VisionMediaSource,
  contextoExtra?: string,
): Promise<CaptionFromImage> => {
  const prompt = `Sos copywriter de Instagram. Mirá la imagen y escribí captions reales que la describan sin sonar a stock photo.

${brandContext(brand)}
${contextoExtra ? `\nCONTEXTO EXTRA: ${contextoExtra}` : ''}

Reglas:
- Caption corto: 1 línea con gancho.
- Medio: 3-5 líneas con valor + CTA.
- Largo: 8-15 líneas con storytelling.
- 8-12 hashtags relevantes a lo que VES en la imagen, no genéricos.
- 3 hooks alternativos.
- Una CTA específica.

JSON:
{
  "captionCorto": "...",
  "captionMedio": "...",
  "captionLargo": "...",
  "hashtags": ["#..."],
  "hooksAlternativos": ["..."],
  "ctaPropuesta": "..."
}`;
  return askVision<CaptionFromImage>(source, prompt, 3000);
};

export interface AltTextResult {
  altText: string;
  altTextDetallado: string;
  textoVisibleEnImagen: string[];
}

export const generarAltText = async (source: VisionMediaSource): Promise<AltTextResult> => {
  const prompt = `Generá texto alternativo de accesibilidad para esta imagen.

Reglas:
- altText: ≤125 caracteres, lo más importante primero.
- altTextDetallado: descripción completa para lectores de pantalla, ≤300 caracteres.
- textoVisibleEnImagen: array con cada texto que aparezca escrito en la imagen, transcripto literalmente.

JSON:
{
  "altText": "...",
  "altTextDetallado": "...",
  "textoVisibleEnImagen": ["..."]
}`;
  return askVision<AltTextResult>(source, prompt, 1500);
};
