/**
 * Legacy stubs — mantienen compatibilidad con importaciones previas de cli.ts.
 */

import type { BrandProfile } from '../../config/types.js';

export interface NichoAnalysis {
  nicho: string;
  objetivo: string;
  oportunidades: string[];
  riesgos: string[];
  angulosRecomendados: string[];
  formatoPrioritario: string;
}

export const analyzeNicho = async (brand: BrandProfile, objetivo?: string): Promise<NichoAnalysis> => ({
  nicho: brand.niche,
  objetivo: objetivo ?? 'awareness',
  oportunidades: ['contenido educativo', 'casos de uso concretos', 'comparativas honestas'],
  riesgos: ['promesas exageradas', 'términos prohibidos por la marca'],
  angulosRecomendados: brand.audience.pains.map((p) => `Cómo resolver: ${p}`),
  formatoPrioritario: brand.goals.primary === 'leads' ? 'carrusel' : 'reel',
});

export interface ReposicionResult {
  original: string;
  reposicionado: string;
  tono: string[];
  sugerencias: string[];
}

export const reposicionar = async (brand: BrandProfile, texto: string): Promise<ReposicionResult> => ({
  original: texto,
  reposicionado: `${texto} — alineado a la voz de ${brand.name}`,
  tono: brand.voice.tone,
  sugerencias: ['Eliminar palabras prohibidas', 'Agregar CTA alineado a metas'],
});
