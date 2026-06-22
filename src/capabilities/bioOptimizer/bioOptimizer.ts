// @ts-nocheck
/**
 * Bio Optimizer — Optimiza la bio + link in bio + highlights del perfil.
 *
 * Reemplaza al especialista en optimización de perfil:
 *   - Genera variantes de bio (150 chars max)
 *   - Estructura link in bio (Linktree/Beacons style)
 *   - Diseña highlights estratégicos (covers + orden + nombres)
 *   - A/B test de bios
 *   - Score de optimización del perfil
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const BIO_DIR = path.resolve('data/bio-optimizer');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface BioVariant {
  id: string;
  text: string; // bio completa (≤150 chars)
  charCount: number;
  structure: string[]; // ['hook', 'proposition', 'social proof', 'cta', 'link line']
  emojis: string[];
  lineBreaks: number;
  hook: string; // primera línea
  proposition: string; // qué ofreces
  socialProof?: string; // métricas, premios
  cta: string;
  linkText: string; // texto antes del link
  estimatedClickRate: number; // 0-1 predicted
}

export interface HighlightCover {
  highlightName: string; // máx 15 chars visibles
  iconType: 'emoji' | 'illustration' | 'photo' | 'icon';
  iconDescription: string;
  backgroundColor: string; // hex
  textColor: string;
  order: number; // orden visual (0 = primero)
  category:
    | 'about'
    | 'products'
    | 'services'
    | 'testimonials'
    | 'process'
    | 'team'
    | 'media'
    | 'contact'
    | 'faq'
    | 'sales';
  storiesIncluded: number;
  estimatedTaps: number;
}

export interface LinkInBio {
  primaryLink: { label: string; url: string; isPriority: boolean };
  secondaryLinks: Array<{ label: string; url: string; icon?: string; category?: string }>;
  layout: 'minimal' | 'cards' | 'list' | 'grid' | 'thumbnail';
  bgGradient?: { from: string; to: string };
  brandName: string;
  ctaButton: string;
  socialIcons: Array<{ platform: string; url: string }>;
}

export interface ProfileOptimization {
  brandId: string;
  generatedAt: string;
  bioVariants: BioVariant[]; // 5 variantes para A/B test
  bestBio: BioVariant;
  highlightSystem: {
    covers: HighlightCover[];
    designStyle: string;
    coherenceNote: string;
  };
  linkInBio: LinkInBio;
  profilePicSuggestions: string[];
  nameFieldOptimization: string; // optimización del campo "Nombre" para búsqueda
  searchKeywords: string[]; // palabras clave para que aparezca en búsqueda
  optimizationScore: number; // 0-100 score del perfil
  improvementAreas: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const ensureBioDir = async (): Promise<void> => {
  await fs.mkdir(BIO_DIR, { recursive: true });
};

const bioPath = (brandId: string): string => path.join(BIO_DIR, `${brandId}-optimization.json`);

// ── Optimización del perfil ───────────────────────────────────────────────────

/** Genera optimización completa del perfil de Instagram. */
export const optimizeProfile = async (
  brand: BrandProfile,
  context?: {
    primaryGoal?: 'ventas' | 'leads' | 'comunidad' | 'autoridad' | 'entretenimiento';
    currentBio?: string;
    currentLinkInBio?: string;
    keyDifferentiator?: string;
    targetAudience?: string;
  },
): Promise<ProfileOptimization> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  log.info('[bioOptimizer] optimizing profile', { brandId });

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 3500,
    thinking: { type: 'adaptive' },
    system: `Especialista en optimización de perfiles de Instagram con foco en conversión.
La bio debe convertir visitantes en seguidores y leads en <3 segundos de lectura.
Cada caracter cuenta (límite 150 chars).
Devuelves JSON puro.`,
    messages: [
      {
        role: 'user',
        content: `Optimiza el perfil completo de ${brand.name}:

Industria: ${brand.industryCategory ?? 'general'}
Tono: ${brand.toneOfVoice ?? 'cercano profesional'}
${context?.primaryGoal ? `Objetivo principal: ${context.primaryGoal}` : 'Objetivo: leads + autoridad'}
${context?.currentBio ? `Bio actual: "${context.currentBio}"` : ''}
${context?.keyDifferentiator ? `Diferenciador clave: ${context.keyDifferentiator}` : ''}
${context?.targetAudience ? `Audiencia objetivo: ${context.targetAudience}` : ''}

Genera optimización completa:

1. 5 BIO VARIANTS (cada una ≤150 chars):
   - Variante 1: Maximizar autoridad
   - Variante 2: Maximizar conexión emocional
   - Variante 3: Maximizar conversión directa
   - Variante 4: Maximizar curiosidad/intriga
   - Variante 5: Maximizar prueba social

2. HIGHLIGHTS SYSTEM (8-12 highlights):
   - Cover design coherente
   - Categorías estratégicas: about, products, testimonials, process, etc.
   - Orden óptimo por prioridad

3. LINK IN BIO:
   - 1 link primario (oferta del momento)
   - 4-6 links secundarios estratégicos
   - CTA button compelling

4. NAME FIELD OPTIMIZATION (campo de búsqueda):
   - Combina nombre de marca + keywords del nicho

5. SEARCH KEYWORDS (que la marca aparezca en búsquedas relevantes)

JSON:
{
  "bioVariants": [{
    "text": "bio completa con saltos de línea",
    "charCount": número,
    "structure": ["hook", "proposition", "social proof", "cta", "link line"],
    "emojis": ["emoji usados"],
    "lineBreaks": número,
    "hook": "primera línea exacta",
    "proposition": "",
    "socialProof": "",
    "cta": "",
    "linkText": "texto antes del link",
    "estimatedClickRate": 0-1
  }],
  "highlightSystem": {
    "covers": [{
      "highlightName": "nombre máx 15 chars",
      "iconType": "emoji|illustration|photo|icon",
      "iconDescription": "qué muestra",
      "backgroundColor": "#XXXXXX",
      "textColor": "#XXXXXX",
      "order": 0,
      "category": "about|products|services|testimonials|process|team|media|contact|faq|sales",
      "storiesIncluded": número estimado,
      "estimatedTaps": número
    }],
    "designStyle": "estilo visual general",
    "coherenceNote": "cómo mantener coherencia"
  },
  "linkInBio": {
    "primaryLink": { "label": "", "url": "{INSERT_URL}", "isPriority": true },
    "secondaryLinks": [{ "label": "", "url": "{INSERT_URL}", "icon": "", "category": "" }],
    "layout": "minimal|cards|list|grid|thumbnail",
    "bgGradient": { "from": "#XXXXXX", "to": "#XXXXXX" },
    "brandName": "${brand.name}",
    "ctaButton": "texto del botón principal",
    "socialIcons": [{ "platform": "tiktok|youtube|whatsapp", "url": "{INSERT_URL}" }]
  },
  "profilePicSuggestions": ["sugerencia 1", "sugerencia 2"],
  "nameFieldOptimization": "${brand.name} | keyword del nicho",
  "searchKeywords": ["keyword1", "keyword2"],
  "optimizationScore": 0-100,
  "improvementAreas": ["área 1", "área 2"]
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('[bioOptimizer] No optimization generated');

  const generated = JSON.parse(jsonMatch[0]) as Partial<ProfileOptimization>;
  const bioVariants = (generated.bioVariants ?? []).map((v, i) => ({
    id: `bio-${Date.now()}-${i}`,
    text: v.text ?? '',
    charCount: (v.text ?? '').length,
    structure: v.structure ?? [],
    emojis: v.emojis ?? [],
    lineBreaks: v.lineBreaks ?? (v.text ?? '').split('\n').length - 1,
    hook: v.hook ?? '',
    proposition: v.proposition ?? '',
    socialProof: v.socialProof,
    cta: v.cta ?? '',
    linkText: v.linkText ?? '',
    estimatedClickRate: v.estimatedClickRate ?? 0.05,
  }));

  const bestBio = bioVariants.sort((a, b) => b.estimatedClickRate - a.estimatedClickRate)[0] ?? bioVariants[0]!;

  const optimization: ProfileOptimization = {
    brandId,
    generatedAt: new Date().toISOString(),
    bioVariants,
    bestBio,
    highlightSystem: generated.highlightSystem ?? { covers: [], designStyle: '', coherenceNote: '' },
    linkInBio: generated.linkInBio ?? ({} as LinkInBio),
    profilePicSuggestions: generated.profilePicSuggestions ?? [],
    nameFieldOptimization: generated.nameFieldOptimization ?? brand.name,
    searchKeywords: generated.searchKeywords ?? [],
    optimizationScore: generated.optimizationScore ?? 70,
    improvementAreas: generated.improvementAreas ?? [],
  };

  await ensureBioDir();
  await fs.writeFile(bioPath(brandId), JSON.stringify(optimization, null, 2), 'utf-8');
  return optimization;
};

/** Score el perfil actual y devuelve recomendaciones específicas. */
export const auditCurrentProfile = async (
  brand: BrandProfile,
  current: { bio: string; nameField: string; linkUrl?: string; highlightCount: number },
): Promise<{ score: number; issues: string[]; recommendations: string[] }> => {
  const issues: string[] = [];
  const recommendations: string[] = [];
  let score = 100;

  if (current.bio.length === 0) {
    issues.push('Bio vacía');
    score -= 30;
  } else if (current.bio.length < 50) {
    issues.push(`Bio muy corta (${current.bio.length}/150 chars)`);
    score -= 15;
    recommendations.push('Expandir bio aprovechando los 150 caracteres');
  }
  if (current.bio.length > 0 && !current.bio.includes('\n')) {
    issues.push('Bio sin saltos de línea (menor legibilidad)');
    score -= 5;
  }
  if (!current.linkUrl) {
    issues.push('Sin link en bio');
    score -= 20;
    recommendations.push('Agregar Linktree, Beacons, o landing page');
  }
  if (current.highlightCount < 4) {
    issues.push(`Solo ${current.highlightCount} highlights (mínimo recomendado: 5-8)`);
    score -= 10;
    recommendations.push('Crear highlights: Acerca de, Productos, Testimonios, Proceso');
  }
  if (current.nameField === current.bio.split('\n')[0]) {
    issues.push('Campo Nombre no aprovecha keywords del nicho');
    score -= 8;
    recommendations.push('Optimizar campo Nombre: "Marca | Keyword del nicho"');
  }
  if (!/@|✉|📧|📱|wa\.me|whatsapp/i.test(current.bio) && !current.linkUrl) {
    issues.push('Sin método de contacto visible');
    score -= 10;
  }

  return { score: Math.max(0, score), issues, recommendations };
};

/** Carga optimización previa. */
export const getOptimization = async (brandId: string): Promise<ProfileOptimization | null> => {
  try {
    return JSON.parse(await fs.readFile(bioPath(brandId), 'utf-8')) as ProfileOptimization;
  } catch {
    return null;
  }
};
