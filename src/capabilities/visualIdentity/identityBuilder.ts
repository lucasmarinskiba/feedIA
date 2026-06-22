/**
 * Visual Identity Builder — Reemplaza al diseñador gráfico de marca.
 *
 * Construye sistema visual completo para Instagram:
 *   - Paleta de colores (primaria + secundaria + acentos + neutros)
 *   - Sistema tipográfico (heading + body + display)
 *   - Logos y variaciones (principal + iso + monograma)
 *   - Iconografía consistente
 *   - Brand guidelines exportable
 *   - Mood board automático
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const IDENTITY_DIR = path.resolve('data/visual-identity');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface ColorSystem {
  primary: { hex: string; rgb: string; usage: string; psychology: string };
  secondary: { hex: string; rgb: string; usage: string };
  accent: { hex: string; rgb: string; usage: string };
  neutrals: Array<{ hex: string; name: string; usage: string }>;
  semantic: {
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  gradients: Array<{ name: string; from: string; to: string; angle: number }>;
}

export interface TypographySystem {
  display: { family: string; weights: number[]; usage: string; fallback: string };
  heading: { family: string; weights: number[]; usage: string; fallback: string };
  body: { family: string; weights: number[]; usage: string; fallback: string };
  scale: {
    h1: { size: number; lineHeight: number; weight: number };
    h2: { size: number; lineHeight: number; weight: number };
    h3: { size: number; lineHeight: number; weight: number };
    body: { size: number; lineHeight: number; weight: number };
    caption: { size: number; lineHeight: number; weight: number };
  };
  pairing: 'classic-serif-sans' | 'modern-sans-mono' | 'bold-display-clean' | 'editorial-pair';
}

export interface LogoSystem {
  primary: { description: string; usage: string; minSize: number };
  isotype: { description: string; usage: string };
  monogram: { description: string; usage: string };
  variations: Array<{ name: string; description: string; context: string }>;
  clearSpace: string; // espacio mínimo alrededor del logo
  prohibitions: string[]; // qué NO hacer con el logo
}

export interface MoodBoard {
  concepts: string[]; // conceptos clave (3-5 palabras)
  visualReferences: Array<{ category: string; description: string; mood: string }>;
  textures: string[];
  imageStyle: string; // estilo fotográfico
  illustrationStyle: string;
  composition: string;
}

export interface VisualIdentity {
  brandId: string;
  brandName: string;
  generatedAt: string;
  brandPersonality: string[]; // 3-5 adjetivos de personalidad
  colorSystem: ColorSystem;
  typographySystem: TypographySystem;
  logoSystem: LogoSystem;
  moodBoard: MoodBoard;
  designPrinciples: string[]; // 5-7 principios de diseño
  doAndDont: { do: string[]; dont: string[] };
  exampleApplications: Array<{
    context: string; // 'feed post' | 'story' | 'reel cover' | 'highlight cover' | 'profile pic'
    description: string;
  }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ensureIdentityDir = async (): Promise<void> => {
  await fs.mkdir(IDENTITY_DIR, { recursive: true });
};

const identityPath = (brandId: string): string => path.join(IDENTITY_DIR, `${brandId}-identity.json`);

// ── Generación de identidad visual ───────────────────────────────────────────

/** Construye el sistema visual completo de la marca. */
export const buildVisualIdentity = async (
  brand: BrandProfile,
  context?: {
    targetAudience?: string;
    competitorReferences?: string[];
    personalityKeywords?: string[];
    existingAssets?: string;
  },
): Promise<VisualIdentity> => {
  const brandId = (brand as { id?: string }).id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  log.info(`[visualIdentity] building identity · brandId=${brandId}`);

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 4500,
    thinking: { type: 'adaptive' },
    system: `Eres director de arte senior con 15 años de experiencia construyendo identidades visuales de marca.
Conoces psicología del color, teoría tipográfica, sistemas de diseño escalables.
Diseñas para Instagram first: cada decisión optimizada para el feed móvil.
Devuelves JSON puro y técnicamente correcto.`,
    messages: [
      {
        role: 'user',
        content: `Construye sistema visual completo para ${brand.name}:

Industria: ${(brand as { industryCategory?: string }).industryCategory ?? brand.niche ?? 'general'}
Descripción: ${(brand as { description?: string }).description ?? brand.audience?.description ?? 'No especificada'}
Tono de marca: ${(brand as { toneOfVoice?: string }).toneOfVoice ?? brand.voice?.tone?.join(', ') ?? 'profesional cercano'}
${context?.targetAudience ? `Audiencia: ${context.targetAudience}` : ''}
${context?.competitorReferences?.length ? `Referencias competencia: ${context.competitorReferences.join(', ')}` : ''}
${context?.personalityKeywords?.length ? `Keywords personalidad: ${context.personalityKeywords.join(', ')}` : ''}
${context?.existingAssets ? `Assets existentes: ${context.existingAssets}` : ''}

Devuelve sistema visual completo:
{
  "brandPersonality": ["adjetivo1", "adjetivo2", "adjetivo3"],
  "colorSystem": {
    "primary": { "hex": "#XXXXXX", "rgb": "R, G, B", "usage": "uso principal", "psychology": "qué transmite" },
    "secondary": { "hex": "", "rgb": "", "usage": "" },
    "accent": { "hex": "", "rgb": "", "usage": "" },
    "neutrals": [{ "hex": "", "name": "negro carbón", "usage": "" }, { "hex": "#FFFFFF", "name": "blanco", "usage": "" }],
    "semantic": { "success": "#XXXXXX", "warning": "#XXXXXX", "error": "#XXXXXX", "info": "#XXXXXX" },
    "gradients": [{ "name": "primary-gradient", "from": "", "to": "", "angle": 135 }]
  },
  "typographySystem": {
    "display": { "family": "nombre fuente Google Fonts", "weights": [400, 700], "usage": "titulares grandes", "fallback": "serif" },
    "heading": { "family": "", "weights": [], "usage": "", "fallback": "sans-serif" },
    "body": { "family": "", "weights": [], "usage": "", "fallback": "sans-serif" },
    "scale": {
      "h1": { "size": 48, "lineHeight": 1.2, "weight": 700 },
      "h2": { "size": 36, "lineHeight": 1.25, "weight": 700 },
      "h3": { "size": 24, "lineHeight": 1.3, "weight": 600 },
      "body": { "size": 16, "lineHeight": 1.5, "weight": 400 },
      "caption": { "size": 12, "lineHeight": 1.4, "weight": 400 }
    },
    "pairing": "classic-serif-sans|modern-sans-mono|bold-display-clean|editorial-pair"
  },
  "logoSystem": {
    "primary": { "description": "logo horizontal con isotipo + tipografía", "usage": "uso por defecto", "minSize": 80 },
    "isotype": { "description": "solo isotipo, sin texto", "usage": "favicon, avatar IG" },
    "monogram": { "description": "iniciales o símbolo simplificado", "usage": "espacios muy pequeños" },
    "variations": [{ "name": "versión clara", "description": "", "context": "fondos oscuros" }],
    "clearSpace": "espacio mínimo igual a 1x el alto del isotipo",
    "prohibitions": ["No deformar", "No usar colores fuera de la paleta", "No agregar efectos"]
  },
  "moodBoard": {
    "concepts": ["concepto1", "concepto2", "concepto3"],
    "visualReferences": [
      { "category": "fotografía", "description": "descripción", "mood": "" },
      { "category": "ilustración", "description": "", "mood": "" }
    ],
    "textures": ["textura1", "textura2"],
    "imageStyle": "descripción del estilo fotográfico",
    "illustrationStyle": "descripción del estilo de ilustración",
    "composition": "minimalista|asimétrica|grid|orgánica"
  },
  "designPrinciples": ["principio 1", "principio 2", "principio 3", "principio 4", "principio 5"],
  "doAndDont": {
    "do": ["sí hacer 1", "sí hacer 2", "sí hacer 3"],
    "dont": ["nunca hacer 1", "nunca hacer 2", "nunca hacer 3"]
  },
  "exampleApplications": [
    { "context": "feed post", "description": "" },
    { "context": "story", "description": "" },
    { "context": "reel cover", "description": "" },
    { "context": "highlight cover", "description": "" },
    { "context": "profile pic", "description": "" }
  ]
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('[visualIdentity] No identity generated');

  const generated = JSON.parse(jsonMatch[0]) as Partial<VisualIdentity>;
  const identity: VisualIdentity = {
    brandId,
    brandName: brand.name,
    generatedAt: new Date().toISOString(),
    brandPersonality: generated.brandPersonality ?? [],
    colorSystem: generated.colorSystem ?? ({} as ColorSystem),
    typographySystem: generated.typographySystem ?? ({} as TypographySystem),
    logoSystem: generated.logoSystem ?? ({} as LogoSystem),
    moodBoard: generated.moodBoard ?? ({} as MoodBoard),
    designPrinciples: generated.designPrinciples ?? [],
    doAndDont: generated.doAndDont ?? { do: [], dont: [] },
    exampleApplications: generated.exampleApplications ?? [],
  };

  await ensureIdentityDir();
  await fs.writeFile(identityPath(brandId), JSON.stringify(identity, null, 2), 'utf-8');
  return identity;
};

/** Carga identidad visual guardada. */
export const getIdentity = async (brandId: string): Promise<VisualIdentity | null> => {
  try {
    return JSON.parse(await fs.readFile(identityPath(brandId), 'utf-8')) as VisualIdentity;
  } catch {
    return null;
  }
};

/** Exporta brand guidelines como markdown. */
export const exportGuidelines = (identity: VisualIdentity): string => {
  const c = identity.colorSystem;
  const t = identity.typographySystem;
  return `# Brand Guidelines — ${identity.brandName}

## Personalidad
${identity.brandPersonality.map((p) => `- ${p}`).join('\n')}

## Sistema de Color

### Primarios
- **Primary:** ${c.primary?.hex ?? '—'} · ${c.primary?.usage ?? ''}
- **Secondary:** ${c.secondary?.hex ?? '—'} · ${c.secondary?.usage ?? ''}
- **Accent:** ${c.accent?.hex ?? '—'} · ${c.accent?.usage ?? ''}

### Neutros
${(c.neutrals ?? []).map((n) => `- ${n.name}: ${n.hex} · ${n.usage}`).join('\n')}

### Semánticos
- Success: ${c.semantic?.success ?? '—'}
- Warning: ${c.semantic?.warning ?? '—'}
- Error: ${c.semantic?.error ?? '—'}
- Info: ${c.semantic?.info ?? '—'}

## Sistema Tipográfico

| Rol | Fuente | Weights | Uso |
|-----|--------|---------|-----|
| Display | ${t.display?.family ?? '—'} | ${t.display?.weights?.join(', ') ?? '—'} | ${t.display?.usage ?? ''} |
| Heading | ${t.heading?.family ?? '—'} | ${t.heading?.weights?.join(', ') ?? '—'} | ${t.heading?.usage ?? ''} |
| Body | ${t.body?.family ?? '—'} | ${t.body?.weights?.join(', ') ?? '—'} | ${t.body?.usage ?? ''} |

## Logo
- **Principal:** ${identity.logoSystem.primary?.description ?? '—'}
- **Isotipo:** ${identity.logoSystem.isotype?.description ?? '—'}
- **Espacio limpio:** ${identity.logoSystem.clearSpace ?? '—'}
- **Tamaño mínimo:** ${identity.logoSystem.primary?.minSize ?? '—'}px

### Prohibido
${(identity.logoSystem.prohibitions ?? []).map((p) => `- ❌ ${p}`).join('\n')}

## Principios de Diseño
${identity.designPrinciples.map((p, i) => `${i + 1}. ${p}`).join('\n')}

## Do & Don't
### ✅ DO
${identity.doAndDont.do.map((d) => `- ${d}`).join('\n')}

### ❌ DON'T
${identity.doAndDont.dont.map((d) => `- ${d}`).join('\n')}

## Aplicaciones en Instagram
${identity.exampleApplications.map((a) => `### ${a.context}\n${a.description}`).join('\n\n')}

---
*Generado por FeedIA Visual Identity Builder*`;
};

/** Genera variaciones de paleta para A/B testing. */
export const generatePaletteVariations = async (
  brand: BrandProfile,
  baseIdentity: VisualIdentity,
  variationCount = 3,
): Promise<ColorSystem[]> => {
  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 2000,
    thinking: { type: 'adaptive' },
    messages: [
      {
        role: 'user',
        content: `Genera ${variationCount} variaciones alternativas de paleta de color para ${brand.name}.
Manteniendo personalidad: ${baseIdentity.brandPersonality.join(', ')}
Color primario actual: ${baseIdentity.colorSystem.primary?.hex}

Cada variación debe explorar un mood distinto pero coherente con la marca.
JSON: { "variations": [{ "primary": {}, "secondary": {}, "accent": {}, "neutrals": [], "semantic": {}, "gradients": [] }] }`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  return jsonMatch ? (JSON.parse(jsonMatch[0]) as { variations: ColorSystem[] }).variations : [];
};
