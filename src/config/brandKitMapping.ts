/**
 * Brand Kit UI <-> BrandProfile mapping.
 *
 * The Brand Kit page (src/server/static/views/brandkit.js) edits a small,
 * UI-shaped object. The rest of the app reads brand identity from the single
 * `BrandProfile` (data/brand.json, see brandRegistry.ts). This module is the
 * only place that translates between the two, so every tool that already
 * reads `brand.visual` / `brand.brandStrategy` picks up Brand Kit edits for
 * free — no per-tool wiring needed.
 */
import type { BrandProfile } from './types.js';

export interface BrandKitUi {
  handle: string;
  niche: string;
  brandType: 'personal' | 'business';
  textColor: string;
  bgColor: string;
  accentColor: string;
  colors: string[];
  font: string;
  mood: string;
  elements: string[];
  tagline: string;
  photo: string;
  logo: string;
  updatedAt: string;
}

/** Semantic font choice (from the UI dropdown) -> real font family stack. */
export const FONT_STYLE_FAMILIES: Record<string, string[]> = {
  'serif-editorial': ['Playfair Display', 'Georgia'],
  'sans-modern': ['Inter', 'Helvetica Neue'],
  'serif-luxury': ['Cormorant Garamond', 'Cormorant'],
  'sans-bold': ['Inter Black', 'Arial Black'],
  'mono-numbers': ['SF Mono', 'JetBrains Mono'],
};

const dedupe = (arr: string[]): string[] => [...new Set(arr.filter(Boolean))];

export const brandKitFromProfile = (brand: BrandProfile): BrandKitUi => {
  const v = brand.visual;
  return {
    handle: brand.handle || '',
    niche: brand.niche || '',
    brandType: brand.type === 'empresa' ? 'business' : 'personal',
    textColor: v.textColor || v.palette[2] || '#FFFFFF',
    bgColor: v.bgColor || v.palette[0] || '#0B0B0F',
    accentColor: v.accentColor || v.palette[1] || '#10F2B0',
    colors: v.palette,
    font: v.fontStyle || 'serif-editorial',
    mood: v.mood || 'premium',
    elements: v.visualElements,
    tagline: brand.brandStrategy?.promise || '',
    photo: v.heroImageUrl || '',
    logo: v.logoUrl || '',
    updatedAt: '',
  };
};

/** Builds a partial patch, shaped like BrandProfile, for deepMerge in brandRegistry.updateActiveBrand. */
export const brandKitToProfilePatch = (kit: Partial<BrandKitUi>): Record<string, unknown> => {
  const patch: Record<string, unknown> = {};
  if (kit.handle !== undefined) patch.handle = kit.handle;
  if (kit.niche !== undefined) patch.niche = kit.niche;
  if (kit.brandType !== undefined) patch.type = kit.brandType === 'business' ? 'empresa' : 'marca-personal';

  const visual: Record<string, unknown> = {};
  if (kit.textColor !== undefined) visual.textColor = kit.textColor;
  if (kit.bgColor !== undefined) visual.bgColor = kit.bgColor;
  if (kit.accentColor !== undefined) visual.accentColor = kit.accentColor;
  // palette is derived from all three swatches together — only rebuild it when
  // the patch carries all three, so a partial edit (e.g. just accentColor)
  // can't wipe the other two colors out of the existing palette.
  if (kit.bgColor !== undefined && kit.accentColor !== undefined && kit.textColor !== undefined) {
    visual.palette = dedupe([kit.bgColor, kit.accentColor, kit.textColor]);
  }
  if (kit.font !== undefined) {
    visual.fontStyle = kit.font;
    visual.typography = FONT_STYLE_FAMILIES[kit.font] ?? [];
  }
  if (kit.mood !== undefined) visual.mood = kit.mood;
  if (kit.elements !== undefined) visual.visualElements = kit.elements;
  if (kit.photo !== undefined) visual.heroImageUrl = kit.photo;
  if (kit.logo !== undefined) visual.logoUrl = kit.logo;
  if (Object.keys(visual).length > 0) patch.visual = visual;

  if (kit.tagline !== undefined) patch.brandStrategy = { promise: kit.tagline };

  return patch;
};
