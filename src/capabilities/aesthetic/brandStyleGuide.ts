import type { BrandProfile } from '../../config/types.js';

export interface StyleGuide {
  palette: {
    primary: string[];
    secondary: string[];
    neutrals: string[];
    accent: string[];
  };
  typography: {
    headings: string[];
    body: string[];
    scale: 'small' | 'medium' | 'large';
  };
  photography: {
    style: string;
    lighting: string;
    filters: string[];
    subjects: string[];
  };
  composition: {
    density: 'low' | 'medium' | 'high';
    imageTextRatio: 'image-heavy' | 'balanced' | 'text-heavy';
    rules: string[];
  };
  iconography: {
    allowed: string[];
    forbidden: string[];
    style: string;
  };
  moodboard: string[];
}

export const buildStyleGuide = (brand: BrandProfile): StyleGuide => {
  const visual = brand.visual;
  const colors = visual.palette;
  const _mid = Math.ceil(colors.length / 2);
  void _mid;

  return {
    palette: {
      primary: colors.slice(0, 2),
      secondary: colors.slice(2, 4),
      neutrals: colors.slice(4, 6),
      accent: colors.slice(6, 8),
    },
    typography: {
      headings: visual.typography.slice(0, 1),
      body: visual.typography.slice(1, 2),
      scale: 'medium',
    },
    photography: {
      style: visual.photographyStyle ?? 'natural',
      lighting: 'soft and even',
      filters: ['consistent color grade'],
      subjects: brand.audience.desires.slice(0, 3),
    },
    composition: {
      density: visual.density ?? 'medium',
      imageTextRatio: visual.imageTextRatio ?? 'balanced',
      rules: visual.compositionRules ?? [],
    },
    iconography: {
      allowed: visual.allowedIconography ?? [],
      forbidden: visual.forbiddenIconography ?? [],
      style: 'minimal line icons',
    },
    moodboard: visual.moodboardUrls ?? [],
  };
};

export const generateStyleGuidePrompt = (brand: BrandProfile): string => {
  const sg = buildStyleGuide(brand);
  return `Dirección visual para ${brand.name}:

PALETA:
- Primarios: ${sg.palette.primary.join(', ')}
- Secundarios: ${sg.palette.secondary.join(', ')}
- Acento: ${sg.palette.accent.join(', ')}

TIPOGRAFÍA:
- Títulos: ${sg.typography.headings.join(', ')}
- Cuerpo: ${sg.typography.body.join(', ')}

FOTOGRAFÍA:
- Estilo: ${sg.photography.style}
- Iluminación: ${sg.photography.lighting}
- Filtros: ${sg.photography.filters.join(', ')}

COMPOSICIÓN:
- Densidad: ${sg.composition.density}
- Ratio imagen/texto: ${sg.composition.imageTextRatio}
- Reglas: ${sg.composition.rules.join('; ') || 'ninguna específica'}

ICONOGRAFÍA PERMITIDA: ${sg.iconography.allowed.join(', ') || 'no restringida'}
ICONOGRAFÍA PROHIBIDA: ${sg.iconography.forbidden.join(', ') || 'ninguna'}

MOOD: ${brand.visual.mood ?? 'profesional'}
ESTILO GENERAL: ${brand.visual.style}
`.trim();
};
