import { askJson } from '../../agent/tokenRouter.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface FacelessFormat {
  estructura: string;
  textoEnPantalla: string[];
  direccionVisual: string;
  caption: string;
  cta: string;
}

export interface FacelessTriple {
  carrusel: FacelessFormat;
  reelTexto: FacelessFormat;
  postVisualSinSonido: FacelessFormat;
  notas: string;
}

export const createFacelessTriple = async (
  brand: BrandProfile,
  idea: string,
  objetivo?: string,
): Promise<FacelessTriple> => {
  const prompt = `Actuá como estratega de contenido "faceless" (sin rostro, sin voz, sin tendencias, sin edición compleja).

${brandContext(brand)}

IDEA: ${idea}
OBJETIVO: ${objetivo ?? brand.goals.primary}

Transformá la idea en 3 versiones distintas. Para cada una entregá: estructura, texto en pantalla (lista de frames/slides), dirección visual, caption y CTA.

Restricciones:
- NO mostrar caras
- NO usar voz humana
- NO depender de audios trending
- NO requerir edición avanzada (motion, croma, after effects)
- SÍ usar tipografía + color + ritmo de cortes simples + stock/IA

JSON:
{
  "carrusel": {
    "estructura": "esqueleto de 6-8 slides",
    "textoEnPantalla": ["slide 1", "slide 2", ...],
    "direccionVisual": "estilo, paleta, jerarquía",
    "caption": "...",
    "cta": "..."
  },
  "reelTexto": {
    "estructura": "secuencia de frames con duración",
    "textoEnPantalla": ["frame 1 (0-2s)", "frame 2 (2-5s)", ...],
    "direccionVisual": "cortes, transiciones, estilo de tipografía",
    "caption": "...",
    "cta": "..."
  },
  "postVisualSinSonido": {
    "estructura": "qué muestra el feed (1 imagen estática o gráfico)",
    "textoEnPantalla": ["overlay 1", "overlay 2"],
    "direccionVisual": "composición, tipografía, color dominante",
    "caption": "...",
    "cta": "..."
  },
  "notas": "qué versión rinde mejor según objetivo y por qué"
}`;
  return askJson<FacelessTriple>(prompt, { maxTokens: 5000 });
};
