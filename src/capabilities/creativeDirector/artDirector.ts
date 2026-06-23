/**
 * Art Director — Generate Pinterest-aligned image prompts for carousel slides.
 * Incorporates Pinterest aesthetics, typography rules, color palettes, and design patterns.
 */

import { PINTEREST_AESTHETICS, formatAestheticForPrompt } from './pinterestAesthetics.js';

export interface PinterestDesignBrief {
  palette: {
    primary: string;
    secondary: string;
    accent: string;
  };
  pattern: string;
  style: 'warm-organic' | 'bold-playful' | 'dark-premium' | 'clean-editorial';
}

/**
 * Generate Pinterest-aligned image prompt for a carousel slide.
 * Uses CLAUDE.md patterns + aesthetics to create structured image generation prompts.
 */
export const generatePinterestPrompt = (
  topic: string,
  brand?: any,
  designBrief?: PinterestDesignBrief,
): string => {
  const style = designBrief?.style || 'bold-playful';
  const aesthetic = PINTEREST_AESTHETICS.find((a) => a.id === style);

  // Find aesthetic-appropriate elements
  const aestheticContext = aesthetic ? formatAestheticForPrompt(aesthetic) : '';

  // Color context
  const colorContext = designBrief?.palette
    ? `
Paleta de colores Pinterest:
- Primario: ${designBrief.palette.primary}
- Secundario: ${designBrief.palette.secondary}
- Acento: ${designBrief.palette.accent}`
    : '';

  // Layout pattern context
  const layoutContext = designBrief?.pattern
    ? `
Patrón de layout: ${designBrief.pattern}
- Maximizar espacio negativo
- Prioridad en legibilidad visual
- Proporción 4:5 (carousel vertical)`
    : '';

  // Brand context (if available)
  const brandContext =
    brand && brand.palette
      ? `
Marca del usuario:
- Colores de marca: ${brand.palette?.primary}, ${brand.palette?.secondary}
- Tipografía: ${brand.typography || 'Sin serif, moderno'}
- Público: ${brand.niche || 'Creadores de contenido'}`
      : '';

  // Construct prompt following Pinterest standards
  const prompt = `
Genera una imagen para carousel de Instagram que sea VIRAL y PINTEREST-INSPIRING.

TEMA: ${topic}

CONTEXTO DE DISEÑO:
${aestheticContext}
${colorContext}
${layoutContext}
${brandContext}

REQUISITOS PINTEREST:
✓ Tipografía: Bold sans-serif para headlines (sans Helvetica/Arial)
✓ Contraste alto (4.5:1 mínimo para legibilidad)
✓ Elementos redondeados (8-16px border-radius en objetos)
✓ Máximo 4 colores por slide
✓ Siluetas ilustradas (personas, manos, objetos) preferidas a fotos genéricas
✓ Sombras sutiles, NO drop-shadow fuerte
✓ Composición asimétrica con mucho aire blanco

ANTI-PATRONES A EVITAR:
✗ Fondos ocupados o con patrones/gradientes
✗ Tipografía centrada como única opción
✗ Stock photos genéricos (personas en oficina, handshakes)
✗ Más de 5 colores en una imagen
✗ Tipografía corporate (Helvetica, Arial, Times)
✗ Contraste bajo o ilegible
✗ Sombras fuertes (drop-shadow)

ASPECT RATIO: 4:5 (carousel vertical Instagram)
RESOLUCIÓN: 1080x1350px mínimo
ESTILO: Moderno, innovador, zero-corporate, máxima calidad visual

Genera ahora. Responde solo con la descripción visual detallada, lista para generar imagen con Dall-E o Flux.
`;

  return prompt.trim();
};

/**
 * Generate comprehensive prompt for art direction of entire carousel.
 * Used by orchestrator to guide visual consistency across slides.
 */
export const generateCarouselArtDirectionPrompt = (
  topic: string,
  style: 'warm-organic' | 'bold-playful' | 'dark-premium' | 'clean-editorial',
  slideCount: number,
  brand?: any,
): string => {
  const aesthetic = PINTEREST_AESTHETICS.find((a) => a.id === style);

  const prompt = `
Sos un Art Director experto en Pinterest y diseño visual moderno.

MISIÓN: Dirigir la creación visual de un carrusel de ${slideCount} slides para Instagram.

TEMA PRINCIPAL: ${topic}

ESTÉTICA ELEGIDA: ${aesthetic?.name || style} — ${aesthetic?.description || ''}

GUÍAS DE DISEÑO VISUAL:
${aesthetic ? formatAestheticForPrompt(aesthetic) : ''}

${
  brand
    ? `
CONTEXTO DE MARCA:
- Nombre: ${brand.name}
- Nicho: ${brand.niche}
- Paleta primaria: ${brand.palette?.primary}
- Público: ${brand.audience || 'Variado'}
`
    : ''
}

ESTRUCTURA DEL CARRUSEL:
- Slides 1-3: HOOK (fuerte, captador de atención, typography dominante)
- Slides 4-7: CONTENIDO (mezcla de layout, imágenes + siluetas)
- Slides 8-${slideCount}: CTA (call-to-action, visual emphasis)

REGLAS PINTEREST (NON-NEGOTIABLE):
1. Tipografía: Máx 2 fuentes por slide. Headlines bold, 28-36px. Body 14-18px.
2. Colores: Máx 4 por slide. Usa paletas documentadas (warm, bold, premium, editorial).
3. Layouts: Mezcla: left-right split, full-bleed overlay, grid, asymmetrical.
4. Elementos: Rounded corners, subtle shadows, icons, illustrated siluetas.
5. Movimiento: Imagina animaciones fade/slide (400-500ms), NO exceso.

ANTI-PATRONES ESTRICTOS:
❌ Fondos ocupados
❌ Tipografía centrada solamente
❌ Stock photos sin contexto
❌ Colores corporate planos
❌ Contraste < 4.5:1

Para cada slide, responde con:
- Descripción visual detallada (para AI image generator)
- Paleta de colores específica
- Layout pattern
- Tipografía recomendada
`;

  return prompt.trim();
};

// Export as default object for easy importing
export const artDirector = {
  generatePinterestPrompt,
  generateCarouselArtDirectionPrompt,
};
