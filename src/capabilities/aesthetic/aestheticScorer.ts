import type { BrandProfile } from '../../config/types.js';
import { buildStyleGuide } from './brandStyleGuide.js';

export interface AestheticScore {
  total: number;
  paletteScore: number;
  typographyScore: number;
  compositionScore: number;
  coherenceScore: number;
  issues: string[];
  suggestions: string[];
}

export interface DesignProposal {
  title: string;
  format: string;
  colorsUsed: string[];
  fontsUsed: string[];
  textBlocks: number;
  imageBlocks: number;
  densityEstimate: 'low' | 'medium' | 'high';
  description: string;
}

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const clean = hex.replace('#', '');
  if (clean.length !== 3 && clean.length !== 6) return null;
  const full =
    clean.length === 3
      ? clean
          .split('')
          .map((c) => c + c)
          .join('')
      : clean;
  const num = parseInt(full, 16);
  return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
};

const colorDistance = (a: string, b: string): number => {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  if (!ca || !cb) return 1000;
  return Math.sqrt(Math.pow(ca.r - cb.r, 2) + Math.pow(ca.g - cb.g, 2) + Math.pow(ca.b - cb.b, 2));
};

const findClosestBrandColor = (color: string, brandColors: string[]): { color: string; distance: number } => {
  let closest = brandColors[0] ?? color;
  let minDist = colorDistance(color, closest);
  for (const bc of brandColors) {
    const d = colorDistance(color, bc);
    if (d < minDist) {
      minDist = d;
      closest = bc;
    }
  }
  return { color: closest, distance: minDist };
};

export const scoreAesthetic = (brand: BrandProfile, proposal: DesignProposal): AestheticScore => {
  const sg = buildStyleGuide(brand);
  const brandColors = brand.visual.palette;
  const brandFonts = brand.visual.typography;
  const issues: string[] = [];
  const suggestions: string[] = [];

  // Palette score
  let paletteScore = 100;
  if (proposal.colorsUsed.length === 0) {
    paletteScore -= 40;
    issues.push('No se detectaron colores en la propuesta');
  } else {
    for (const c of proposal.colorsUsed) {
      const closest = findClosestBrandColor(c, brandColors);
      if (closest.distance > 80) {
        paletteScore -= 15;
        issues.push(`Color ${c} no está cerca de la paleta de marca (más cercano: ${closest.color})`);
      }
    }
  }
  if (paletteScore < 70) {
    suggestions.push(`Usá colores de la paleta: ${brandColors.join(', ')}`);
  }

  // Typography score
  let typographyScore = 100;
  if (proposal.fontsUsed.length > 0) {
    for (const f of proposal.fontsUsed) {
      const normalized = f.toLowerCase();
      const match = brandFonts.some(
        (bf) => bf.toLowerCase().includes(normalized) || normalized.includes(bf.toLowerCase()),
      );
      if (!match) {
        typographyScore -= 20;
        issues.push(`Tipografía "${f}" no está en la guía de marca`);
      }
    }
  }
  if (typographyScore < 80) {
    suggestions.push(`Tipografías permitidas: ${brandFonts.join(', ')}`);
  }

  // Composition score
  let compositionScore = 100;
  if (proposal.densityEstimate !== sg.composition.density) {
    compositionScore -= 15;
    issues.push(`Densidad ${proposal.densityEstimate} no coincide con guía (${sg.composition.density})`);
  }

  const totalBlocks = proposal.textBlocks + proposal.imageBlocks;
  let expectedImageRatio = 0.5;
  if (sg.composition.imageTextRatio === 'image-heavy') expectedImageRatio = 0.7;
  if (sg.composition.imageTextRatio === 'text-heavy') expectedImageRatio = 0.3;

  if (totalBlocks > 0) {
    const actualRatio = proposal.imageBlocks / totalBlocks;
    if (Math.abs(actualRatio - expectedImageRatio) > 0.2) {
      compositionScore -= 15;
      issues.push(
        `Ratio imagen/texto desbalanceado (${Math.round(actualRatio * 100)}% imagen, esperado ~${Math.round(expectedImageRatio * 100)}%)`,
      );
    }
  }

  // Coherence score
  let coherenceScore = 100;
  if (!proposal.description.toLowerCase().includes(brand.visual.style.toLowerCase())) {
    coherenceScore -= 10;
    suggestions.push(`Considerá reflejar el estilo "${brand.visual.style}" en la descripción visual`);
  }
  if (!proposal.description.toLowerCase().includes((brand.visual.mood ?? '').toLowerCase())) {
    coherenceScore -= 10;
  }

  const total = Math.round((paletteScore + typographyScore + compositionScore + coherenceScore) / 4);

  return {
    total: Math.max(0, Math.min(100, total)),
    paletteScore: Math.max(0, Math.min(100, paletteScore)),
    typographyScore: Math.max(0, Math.min(100, typographyScore)),
    compositionScore: Math.max(0, Math.min(100, compositionScore)),
    coherenceScore: Math.max(0, Math.min(100, coherenceScore)),
    issues,
    suggestions,
  };
};
