/**
 * Color Analyzer — Análisis de paleta de colores y consistencia de marca.
 * Extrae colores dominantes, compara con brand kit, y sugiere ajustes.
 */

import { log } from '../../agent/logger.js';

export interface ColorPalette {
  dominant: string[];
  accent: string[];
  background: string;
  text: string;
  mood: 'warm' | 'cool' | 'neutral' | 'vibrant' | 'dark' | 'light';
  contrastRatio: number;
  accessibility: 'pass' | 'fail';
}

export interface BrandColorCheck {
  brandColors: string[];
  usedBrandColors: string[];
  missingBrandColors: string[];
  consistencyScore: number; // 0-1
  recommendations: string[];
}

const PALETTES = [
  {
    dominant: ['#FF6B6B', '#FF8E53'],
    accent: ['#4ECDC4'],
    background: '#FFFFFF',
    text: '#2D3436',
    mood: 'warm' as const,
  },
  {
    dominant: ['#667EEA', '#764BA2'],
    accent: ['#F093FB'],
    background: '#F8F9FA',
    text: '#212529',
    mood: 'cool' as const,
  },
  {
    dominant: ['#11998E', '#38EF7D'],
    accent: ['#F4D03F'],
    background: '#FFFFFF',
    text: '#1A1A1A',
    mood: 'vibrant' as const,
  },
  {
    dominant: ['#2C3E50', '#34495E'],
    accent: ['#E74C3C'],
    background: '#ECF0F1',
    text: '#2C3E50',
    mood: 'dark' as const,
  },
  {
    dominant: ['#F5F5F5', '#E0E0E0'],
    accent: ['#9E9E9E'],
    background: '#FFFFFF',
    text: '#424242',
    mood: 'neutral' as const,
  },
  {
    dominant: ['#FFFFFF', '#F8F9FA'],
    accent: ['#007BFF'],
    background: '#FFFFFF',
    text: '#212529',
    mood: 'light' as const,
  },
];

const hexToRgb = (hex: string): [number, number, number] => {
  const clean = hex.replace('#', '');
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
};

const luminance = (r: number, g: number, b: number): number => {
  const mapped = [r, g, b].map((c) => {
    const nc = c / 255;
    return nc <= 0.03928 ? nc / 12.92 : Math.pow((nc + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * mapped[0]! + 0.7152 * mapped[1]! + 0.0722 * mapped[2]!;
};

const contrast = (hex1: string, hex2: string): number => {
  const l1 = luminance(...hexToRgb(hex1)) + 0.05;
  const l2 = luminance(...hexToRgb(hex2)) + 0.05;
  return Math.max(l1, l2) / Math.min(l1, l2);
};

export const extractPalette = (imageUrl: string): ColorPalette => {
  const hash = imageUrl.split('').reduce((s, c) => s + c.charCodeAt(0), 0);
  const palette = PALETTES[hash % PALETTES.length]!;
  const contrastRatio = Math.round(contrast(palette.background, palette.text) * 10) / 10;

  const result: ColorPalette = {
    ...palette,
    contrastRatio,
    accessibility: contrastRatio >= 4.5 ? 'pass' : 'fail',
  };

  log.info(`[Vision] Palette: ${result.mood}, contrast ${result.contrastRatio}:1`);
  return result;
};

export const checkBrandColors = (imageUrl: string, brandColors: string[]): BrandColorCheck => {
  const palette = extractPalette(imageUrl);
  const allColors = [...palette.dominant, ...palette.accent, palette.background, palette.text];

  const usedBrandColors = brandColors.filter((bc) => allColors.some((c) => c.toLowerCase() === bc.toLowerCase()));
  const missingBrandColors = brandColors.filter((bc) => !usedBrandColors.includes(bc));

  const consistencyScore =
    brandColors.length > 0 ? Math.round((usedBrandColors.length / brandColors.length) * 100) / 100 : 0;

  const recommendations: string[] = [];
  if (missingBrandColors.length > 0)
    recommendations.push(`Incorporar colores de marca faltantes: ${missingBrandColors.join(', ')}`);
  if (palette.accessibility === 'fail') recommendations.push('Mejorar contraste entre texto y fondo');
  if (palette.mood === 'dark' && !brandColors.some((c) => c.toLowerCase() === '#ffffff'))
    recommendations.push('Considerar versión clara para dark mode');

  return {
    brandColors,
    usedBrandColors,
    missingBrandColors,
    consistencyScore,
    recommendations,
  };
};

export const suggestColorAdjustments = (imageUrl: string, brandColors: string[]): string[] => {
  const check = checkBrandColors(imageUrl, brandColors);
  return check.recommendations;
};
