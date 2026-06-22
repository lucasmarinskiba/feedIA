import type { BrandProfile } from '../../config/types.js';
import type { BrandKit, BrandKitAsset, ValidationIssue, ValidationResult, BrandConsistencyResult } from './types.js';

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
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
  if (Number.isNaN(num)) return null;
  return { r: (num >> 16) & 0xff, g: (num >> 8) & 0xff, b: num & 0xff };
}

function colorDistance(a: string, b: string): number {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  if (!ca || !cb) return Number.MAX_VALUE;
  return Math.sqrt(Math.pow(ca.r - cb.r, 2) + Math.pow(ca.g - cb.g, 2) + Math.pow(ca.b - cb.b, 2));
}

function findClosestBrandColor(color: string, palette: string[]): { color: string; distance: number } | null {
  if (palette.length === 0) return null;
  const first = palette[0]!;
  let closest = first;
  let minDist = colorDistance(color, first);
  for (const pc of palette.slice(1)) {
    const d = colorDistance(color, pc);
    if (d < minDist) {
      minDist = d;
      closest = pc;
    }
  }
  return { color: closest, distance: minDist };
}

function luminance(r: number, g: number, b: number): number {
  const mapped = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * mapped[0]! + 0.7152 * mapped[1]! + 0.0722 * mapped[2]!;
}

function contrastRatio(a: string, b: string): number | null {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  if (!ca || !cb) return null;
  const la = luminance(ca.r, ca.g, ca.b);
  const lb = luminance(cb.r, cb.g, cb.b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

export const validateAssetAgainstBrand = (asset: BrandKitAsset, brand: BrandProfile): ValidationResult => {
  const issues: ValidationIssue[] = [];
  const palette = brand.visual.palette;

  // Check palette compliance if asset has URL with colors (simplified: we can't inspect image,
  // but we can validate metadata)
  if (asset.type === 'color-swatch' && asset.variants) {
    for (const [name, color] of Object.entries(asset.variants)) {
      const closest = findClosestBrandColor(color, palette);
      if (!closest || closest.distance > 80) {
        issues.push({
          severity: 'warning',
          field: `variants.${name}`,
          message: `El color ${color} no está cerca de ningún color de marca`,
          suggestion: closest
            ? `Color más cercano: ${closest.color} (distancia ${Math.round(closest.distance)})`
            : 'Agregar este color a la paleta de marca',
        });
      }
    }
  }

  // Check forbidden iconography
  if (brand.visual.forbiddenIconography.length > 0) {
    const forbidden = brand.visual.forbiddenIconography;
    const textToCheck = `${asset.name} ${asset.usageRules.join(' ')}`.toLowerCase();
    for (const f of forbidden) {
      if (textToCheck.includes(f.toLowerCase())) {
        issues.push({
          severity: 'error',
          field: 'iconography',
          message: `El asset hace referencia a iconografía prohibida: "${f}"`,
          suggestion: `Reemplazar por alguna de las permitidas: ${brand.visual.allowedIconography.join(', ') || 'consultar guía de marca'}`,
        });
      }
    }
  }

  // Check typography for font assets
  if (asset.type === 'font') {
    const brandFonts = brand.visual.typography;
    if (brandFonts.length > 0 && !brandFonts.some((f) => asset.name.toLowerCase().includes(f.toLowerCase()))) {
      issues.push({
        severity: 'warning',
        field: 'font',
        message: `La fuente "${asset.name}" no está en la tipografía de marca`,
        suggestion: `Fuentes de marca: ${brandFonts.join(', ')}`,
      });
    }
  }

  const score = Math.max(
    0,
    100 -
      issues.filter((i) => i.severity === 'error').length * 30 -
      issues.filter((i) => i.severity === 'warning').length * 10,
  );

  return {
    valid: issues.every((i) => i.severity !== 'error'),
    score,
    issues,
  };
};

export const validatePaletteContrast = (palette: string[]): ValidationIssue[] => {
  const issues: ValidationIssue[] = [];
  for (let i = 0; i < palette.length; i++) {
    for (let j = i + 1; j < palette.length; j++) {
      const a = palette[i]!;
      const b = palette[j]!;
      const ratio = contrastRatio(a, b);
      if (ratio !== null && ratio < 4.5) {
        issues.push({
          severity: 'warning',
          field: 'palette',
          message: `Contraste insuficiente entre ${a} y ${b}: ${ratio.toFixed(2)} (mínimo recomendado 4.5)`,
          suggestion: 'Ajustar uno de los colores para mejorar accesibilidad',
        });
      }
    }
  }
  return issues;
};

export const validateContentAgainstBrandKit = (
  content: {
    colorsUsed?: string[];
    fontsUsed?: string[];
    description?: string;
    iconography?: string[];
  },
  _kit: BrandKit,
  brand: BrandProfile,
): BrandConsistencyResult => {
  const issues: ValidationIssue[] = [];
  const palette = brand.visual.palette;
  const fonts = brand.visual.typography;

  // Palette check
  let paletteScore = 100;
  const colors = content.colorsUsed ?? [];
  for (const color of colors) {
    const closest = findClosestBrandColor(color, palette);
    if (!closest || closest.distance > 80) {
      issues.push({
        severity: 'error',
        field: 'palette',
        message: `El color ${color} no pertenece a la paleta de marca`,
        suggestion: closest ? `Reemplazar por ${closest.color}` : `Usar un color de la marca: ${palette.join(', ')}`,
      });
      paletteScore -= 25;
    } else if (closest.distance > 40) {
      issues.push({
        severity: 'warning',
        field: 'palette',
        message: `El color ${color} se aleja de la paleta (distancia ${Math.round(closest.distance)})`,
        suggestion: `Considerar ${closest.color}`,
      });
      paletteScore -= 10;
    }
  }
  paletteScore = Math.max(0, paletteScore);

  // Typography check
  let typographyScore = 100;
  const usedFonts = content.fontsUsed ?? [];
  for (const font of usedFonts) {
    if (fonts.length > 0 && !fonts.some((f) => font.toLowerCase().includes(f.toLowerCase()))) {
      issues.push({
        severity: 'error',
        field: 'typography',
        message: `La fuente "${font}" no está autorizada`,
        suggestion: `Fuentes permitidas: ${fonts.join(', ')}`,
      });
      typographyScore -= 30;
    }
  }
  typographyScore = Math.max(0, typographyScore);

  // Iconography check
  let iconographyScore = 100;
  const icons = content.iconography ?? [];
  for (const icon of icons) {
    if (brand.visual.forbiddenIconography.some((f) => icon.toLowerCase().includes(f.toLowerCase()))) {
      issues.push({
        severity: 'error',
        field: 'iconography',
        message: `Iconografía prohibida detectada: "${icon}"`,
        suggestion: `Evitar ${icon}. Permitidas: ${brand.visual.allowedIconography.join(', ')}`,
      });
      iconographyScore -= 30;
    }
  }
  iconographyScore = Math.max(0, iconographyScore);

  // Voice / description check
  let voiceScore = 100;
  const desc = (content.description ?? '').toLowerCase();
  for (const forbidden of brand.voice.forbidden) {
    if (desc.includes(forbidden.toLowerCase())) {
      issues.push({
        severity: 'error',
        field: 'voice',
        message: `Palabra prohibida detectada: "${forbidden}"`,
        suggestion: `Reemplazar por sinónimo apropiado al tono: ${brand.voice.tone.join(', ')}`,
      });
      voiceScore -= 25;
    }
  }
  voiceScore = Math.max(0, voiceScore);

  // Composition check (simplified)
  const compositionScore = 100;

  const totalScore = Math.round(
    paletteScore * 0.3 + typographyScore * 0.2 + iconographyScore * 0.2 + voiceScore * 0.2 + compositionScore * 0.1,
  );

  const threshold = 70;

  return {
    totalScore,
    paletteScore,
    typographyScore,
    iconographyScore,
    voiceScore,
    compositionScore,
    issues,
    passed: totalScore >= threshold,
    threshold,
  };
};
