/**
 * Brand Kit UI <-> BrandProfile mapping.
 *
 * The Brand Kit page (src/server/static/views/brandkit.js) edits a small,
 * UI-shaped object. The rest of the app reads brand identity from the single
 * `BrandProfile` (data/brand.json, see brandRegistry.ts). This module is the
 * only place that translates between the two, so every tool that already
 * reads `brand.visual` / `brand.voice` / `brand.audience` / `brand.goals` /
 * `brand.brandStrategy` (via brandContext() in agent/memory.ts, injected into
 * every generation capability) picks up Brand Kit edits for free — no
 * per-tool wiring needed.
 */
import type { BrandProfile } from './types.js';
import { updateActiveBrand } from './brandRegistry.js';
import { fontPairingsByNiche } from '../capabilities/branding/typographySystem.js';

export interface BrandKitUi {
  handle: string;
  niche: string;
  brandType: 'personal' | 'business';
  accountCategory: string;
  industryCategory: string;
  textColor: string;
  bgColor: string;
  accentColor: string;
  secondaryColor1: string;
  secondaryColor2: string;
  colors: string[];
  font: string;
  mood: string;
  elements: string[];
  tagline: string;
  photo: string;
  logo: string;
  updatedAt: string;
  voiceTone: string[];
  voiceForbidden: string[];
  referenceQuotes: string[];
  audienceDescription: string;
  audiencePains: string[];
  audienceDesires: string[];
  goalPrimary: string;
  goalMetrics: string[];
  personality: string[];
  archetype: string;
  competitors: string[];
  allowedIconography: string[];
  forbiddenIconography: string[];
  photographyStyle: string;
  density: string;
  imageTextRatio: string;
  imageSource: string;
}

/**
 * Tipografía corporativa: pares reales (headline+body+acento) por nicho —
 * mismos 20 fonts premium y 10 pairings que ya usa Phase 25
 * (typographySystem.ts), no una lista inventada aparte.
 */
export { fontPairingsByNiche };

/** Paletas de marca predefinidas (CLAUDE.md § Pinterest Design Patterns) — punto de partida de 1 click, editable después. */
export const BRAND_PALETTE_PRESETS: Record<
  string,
  { label: string; bg: string; accent: string; text: string; secondary1: string; secondary2: string }
> = {
  'warm-organic': {
    label: 'Cálido orgánico — lifestyle, wellness, productos naturales',
    bg: '#F5EEE0',
    accent: '#C65911',
    text: '#2B2013',
    secondary1: '#6B8E71',
    secondary2: '#D4AF37',
  },
  'bold-playful': {
    label: 'Audaz y lúdico — entretenimiento, humor, contenido viral',
    bg: '#FFF8DC',
    accent: '#E91E8C',
    text: '#4B0082',
    secondary1: '#00D9FF',
    secondary2: '#7FFF00',
  },
  'dark-premium': {
    label: 'Oscuro premium — educación, lujo, servicios profesionales',
    bg: '#1A1A1A',
    accent: '#E6D5B8',
    text: '#FFFFFF',
    secondary1: '#36454F',
    secondary2: '#001F3F',
  },
  'clean-editorial': {
    label: 'Limpio editorial — noticias, tutoriales, contenido how-to',
    bg: '#FFFFFF',
    accent: '#001F3F',
    text: '#000000',
    secondary1: '#E8E8E8',
    secondary2: '#001F3F',
  },
};

/** 12 arquetipos de marca (Mark & Pearson) — personalidad de marca coherente en todo el copy. */
export const BRAND_ARCHETYPES: Record<string, string> = {
  heroe: 'Héroe — supera desafíos, inspira coraje y logro',
  fuera_de_la_ley: 'Forajido — rompe reglas, revolución, libertad',
  mago: 'Mago — transforma, hace realidad lo imposible',
  todos: 'Persona Común — pertenencia, cercanía, sin pretensiones',
  amante: 'Amante — pasión, conexión íntima, deseo',
  bufon: 'Bufón — diversión, humor, disfrutar el momento',
  cuidador: 'Cuidador — protección, servicio, generosidad',
  creador: 'Creador — innovación, expresión, visión original',
  gobernante: 'Gobernante — control, liderazgo, autoridad',
  inocente: 'Inocente — optimismo, simplicidad, pureza',
  explorador: 'Explorador — libertad, descubrimiento, aventura',
  sabio: 'Sabio — conocimiento, verdad, expertise',
};

const dedupe = (arr: string[]): string[] => [...new Set(arr.filter(Boolean))];

export const brandKitFromProfile = (brand: BrandProfile): BrandKitUi => {
  const v = brand.visual;
  const bs = brand.brandStrategy;
  return {
    handle: brand.handle || '',
    niche: brand.niche || '',
    brandType: brand.type === 'empresa' ? 'business' : 'personal',
    accountCategory: brand.accountCategory || '',
    industryCategory: brand.industryCategory || '',
    textColor: v.textColor || v.palette[2] || '#FFFFFF',
    bgColor: v.bgColor || v.palette[0] || '#0B0B0F',
    accentColor: v.accentColor || v.palette[1] || '#10F2B0',
    secondaryColor1: v.palette[3] || '',
    secondaryColor2: v.palette[4] || '',
    colors: v.palette,
    font: v.fontStyle || 'tech',
    mood: v.mood || 'premium',
    elements: v.visualElements,
    tagline: bs?.promise || '',
    photo: v.heroImageUrl || '',
    logo: v.logoUrl || '',
    updatedAt: '',
    voiceTone: brand.voice.tone,
    voiceForbidden: brand.voice.forbidden,
    referenceQuotes: brand.voice.referenceQuotes,
    audienceDescription: brand.audience.description || '',
    audiencePains: brand.audience.pains,
    audienceDesires: brand.audience.desires,
    goalPrimary: brand.goals.primary,
    goalMetrics: brand.goals.metricsToWatch,
    personality: bs?.personality || [],
    archetype: bs?.archetype || '',
    competitors: brand.competitors,
    allowedIconography: v.allowedIconography,
    forbiddenIconography: v.forbiddenIconography,
    photographyStyle: v.photographyStyle || 'natural',
    density: v.density || 'medium',
    imageTextRatio: v.imageTextRatio || 'balanced',
    imageSource: v.imageSource || 'ai-generated',
  };
};

/** Builds a partial patch, shaped like BrandProfile, for deepMerge in brandRegistry.updateActiveBrand. */
export const brandKitToProfilePatch = (kit: Partial<BrandKitUi>): Record<string, unknown> => {
  const patch: Record<string, unknown> = {};
  if (kit.handle !== undefined) patch.handle = kit.handle;
  if (kit.niche !== undefined) patch.niche = kit.niche;
  if (kit.brandType !== undefined) patch.type = kit.brandType === 'business' ? 'empresa' : 'marca-personal';
  if (kit.accountCategory !== undefined) patch.accountCategory = kit.accountCategory || undefined;
  if (kit.industryCategory !== undefined) patch.industryCategory = kit.industryCategory || undefined;
  if (kit.competitors !== undefined) patch.competitors = kit.competitors;

  const visual: Record<string, unknown> = {};
  if (kit.textColor !== undefined) visual.textColor = kit.textColor;
  if (kit.bgColor !== undefined) visual.bgColor = kit.bgColor;
  if (kit.accentColor !== undefined) visual.accentColor = kit.accentColor;
  // palette is derived from the swatches together — only rebuild it when the
  // 3 core colors are all present, so a partial edit (e.g. just accentColor)
  // can't wipe the rest out of the existing palette on the next deepMerge.
  if (kit.bgColor !== undefined && kit.accentColor !== undefined && kit.textColor !== undefined) {
    const core = [kit.bgColor, kit.accentColor, kit.textColor];
    if (kit.secondaryColor1) core.push(kit.secondaryColor1);
    if (kit.secondaryColor2) core.push(kit.secondaryColor2);
    visual.palette = dedupe(core);
  }
  if (kit.font !== undefined) {
    visual.fontStyle = kit.font;
    const pairing = fontPairingsByNiche[kit.font];
    visual.typography = pairing ? dedupe([pairing.headline, pairing.body, pairing.accent ?? '']) : [];
  }
  if (kit.mood !== undefined) visual.mood = kit.mood;
  if (kit.elements !== undefined) visual.visualElements = kit.elements;
  if (kit.photo !== undefined) visual.heroImageUrl = kit.photo;
  if (kit.logo !== undefined) visual.logoUrl = kit.logo;
  if (kit.allowedIconography !== undefined) visual.allowedIconography = kit.allowedIconography;
  if (kit.forbiddenIconography !== undefined) visual.forbiddenIconography = kit.forbiddenIconography;
  if (kit.photographyStyle !== undefined) visual.photographyStyle = kit.photographyStyle;
  if (kit.density !== undefined) visual.density = kit.density;
  if (kit.imageTextRatio !== undefined) visual.imageTextRatio = kit.imageTextRatio;
  if (kit.imageSource !== undefined) visual.imageSource = kit.imageSource;
  if (Object.keys(visual).length > 0) patch.visual = visual;

  if (kit.voiceTone !== undefined || kit.voiceForbidden !== undefined || kit.referenceQuotes !== undefined) {
    const voice: Record<string, unknown> = {};
    if (kit.voiceTone !== undefined) voice.tone = kit.voiceTone;
    if (kit.voiceForbidden !== undefined) voice.forbidden = kit.voiceForbidden;
    if (kit.referenceQuotes !== undefined) voice.referenceQuotes = kit.referenceQuotes;
    patch.voice = voice;
  }

  if (kit.audienceDescription !== undefined || kit.audiencePains !== undefined || kit.audienceDesires !== undefined) {
    const audience: Record<string, unknown> = {};
    if (kit.audienceDescription !== undefined) audience.description = kit.audienceDescription;
    if (kit.audiencePains !== undefined) audience.pains = kit.audiencePains;
    if (kit.audienceDesires !== undefined) audience.desires = kit.audienceDesires;
    patch.audience = audience;
  }

  if (kit.goalPrimary !== undefined || kit.goalMetrics !== undefined) {
    const goals: Record<string, unknown> = {};
    if (kit.goalPrimary !== undefined) goals.primary = kit.goalPrimary;
    if (kit.goalMetrics !== undefined) goals.metricsToWatch = kit.goalMetrics;
    patch.goals = goals;
  }

  if (kit.tagline !== undefined || kit.personality !== undefined || kit.archetype !== undefined) {
    const brandStrategy: Record<string, unknown> = {};
    if (kit.tagline !== undefined) brandStrategy.promise = kit.tagline;
    if (kit.personality !== undefined) brandStrategy.personality = kit.personality;
    if (kit.archetype !== undefined) brandStrategy.archetype = kit.archetype;
    patch.brandStrategy = brandStrategy;
  }

  return patch;
};

export interface AccountProfileRequestBody {
  action?: string;
  fields?: { brandKit?: Partial<BrandKitUi> };
}

/**
 * Shared GET/SAVE logic for /api/account/profile — mounted on both the
 * production Express server (src/server.ts) and the dev-only plain http.js
 * server (dashboardApi.ts via src/server/index.ts). One place so the two
 * mounts can't drift apart.
 */
export const handleAccountProfileRequest = (
  brand: BrandProfile,
  body: unknown,
): { status: number; payload: unknown } => {
  const b = (body ?? {}) as AccountProfileRequestBody;
  if (b.action === 'save') {
    const kit = b.fields?.brandKit;
    if (!kit) return { status: 400, payload: { error: 'fields.brandKit requerido' } };
    const updated = updateActiveBrand(brandKitToProfilePatch(kit));
    return { status: 200, payload: { profile: { brandKit: brandKitFromProfile(updated) } } };
  }
  // action === 'get' (default): siempre devuelve la marca activa — este
  // server sirve una cuenta a la vez (ver brandRegistry.ts).
  return { status: 200, payload: { profile: { brandKit: brandKitFromProfile(brand) } } };
};
