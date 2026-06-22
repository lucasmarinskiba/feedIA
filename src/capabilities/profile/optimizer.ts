import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface ProfileSnapshot {
  bio: string;
  nombreVisible: string;
  enlaceEnBio?: string;
  pinneadosResumen: Array<{ tipo: 'reel' | 'carrusel' | 'post-imagen'; resumen: string }>;
  highlights: Array<{ titulo: string; tematica: string; coverDescripcion?: string }>;
  ultimaActualizacion?: string;
}

export interface ProfileOptimization {
  bioActual: string;
  bioPropuesta: { directa: string; storytelling: string; minimalista: string };
  reglasUsadas: string[];
  pinneadosSugerencia: Array<{
    posicion: number;
    tipoIdeal: 'reel' | 'carrusel' | 'post-imagen';
    proposito: string;
    queDeberiaMostrar: string;
  }>;
  highlightsSugerencia: Array<{
    titulo: string;
    cover: string;
    contenidoMinimo: string[];
    cuandoActualizarlo: string;
  }>;
  ctaEnBio: { sugerencia: string; razon: string };
  enlaceEnBio: { recomendacion: string; razon: string };
  scoreActual: number;
  scoreEsperado: number;
}

export const optimizarPerfil = async (brand: BrandProfile, snapshot: ProfileSnapshot): Promise<ProfileOptimization> => {
  const prompt = `Actuá como auditor de perfil de Instagram (bio + pinneados + highlights).

${brandContext(brand)}

PERFIL ACTUAL:
- Nombre visible: ${snapshot.nombreVisible}
- Bio: "${snapshot.bio}"
- Link: ${snapshot.enlaceEnBio ?? '(ninguno)'}
- Pinneados: ${snapshot.pinneadosResumen.map((p, i) => `\n  ${i + 1}. (${p.tipo}) ${p.resumen}`).join('') || '(ninguno)'}
- Highlights: ${snapshot.highlights.map((h, i) => `\n  ${i + 1}. ${h.titulo}: ${h.tematica}`).join('') || '(ninguno)'}

Reglas:
- Bio óptima ≤ 150 caracteres, primera línea = promesa concreta, segunda = autoridad sutil, tercera = CTA suave.
- Pinneados: el slot 1 debe ser el "ascensor", slot 2 el "loop educativo", slot 3 el "social proof".
- Highlights: jerarquizar de izquierda a derecha. Primero "Empezá acá", luego categorías, luego BTS y testimonios al final.
- Sin emojis decorativos en bio, salvo que aporten jerarquía visual concreta.

Generá:
- 3 versiones de bio (directa, storytelling, minimalista).
- Sugerencia de qué tipo y propósito tienen los 3 pinneados.
- Highlights ideales con título, cover descrito, contenido mínimo y cuándo actualizar.
- CTA en bio + recomendación de link.
- Score actual y esperado (0-100) basado en los criterios anteriores.

JSON exactamente como se describe.`;
  return askJson<ProfileOptimization>(prompt, { maxTokens: 3500 });
};
