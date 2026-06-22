/**
 * Canva Design Skill — Creación autónoma de diseños y publicación en Instagram.
 *
 * Convierte datos (métricas, calendarios, copy) en briefs de diseño Canva,
 * selecciona templates óptimos por tipo de cuenta, genera instrucciones de
 * diseño estructuradas y orquesta el flujo: datos → diseño → Instagram.
 *
 * Integra con computerUse para operaciones reales en Canva.
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs/promises';
import path from 'node:path';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const DESIGN_DIR = path.resolve('data/canva-designs');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type CanvaFormat =
  | 'instagram-post-cuadrado' // 1080x1080
  | 'instagram-post-vertical' // 1080x1350
  | 'instagram-story' // 1080x1920
  | 'instagram-reel-cover' // 1080x1920
  | 'instagram-carousel-slide' // 1080x1080
  | 'instagram-carousel-cover'; // 1080x1080

export interface ColorPalette {
  primary: string; // hex
  secondary: string;
  accent: string;
  background: string;
  text: string;
}

export interface DesignBrief {
  id: string;
  brandId: string;
  format: CanvaFormat;
  contentType: 'educational' | 'promotional' | 'inspirational' | 'entertainment' | 'announcement';
  mainMessage: string; // texto principal (máx. 10 palabras)
  subMessage?: string; // texto secundario
  cta?: string; // llamada a la acción
  dataToVisualize?: Record<string, number | string>; // datos a convertir en gráfico
  colorPalette: ColorPalette;
  typography: {
    headline: string; // fuente para titulares
    body: string; // fuente para cuerpo
    headlineSize: 'small' | 'medium' | 'large' | 'xlarge';
  };
  visualStyle: 'minimalista' | 'bold' | 'elegante' | 'vibrant' | 'corporativo' | 'lifestyle';
  imageDirection: string; // instrucción para imagen de fondo/principal
  elements: string[]; // elementos gráficos específicos
  doNot: string[]; // qué evitar en el diseño
  canvaTemplate?: string; // ID de template en Canva si existe
  estimatedDesignMinutes: number;
  createdAt: string;
}

export interface DesignJob {
  briefId: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'published';
  canvaUrl?: string;
  exportedFilePath?: string;
  publishedToInstagram: boolean;
  publishedAt?: string;
  instagramPostId?: string;
  caption?: string;
  hashtags?: string[];
  error?: string;
}

// ── Paletas por tipo de cuenta ────────────────────────────────────────────────

const PALETTE_PRESETS: Record<string, ColorPalette> = {
  'gastronomia-cocina': {
    primary: '#E67E22',
    secondary: '#2C3E50',
    accent: '#F39C12',
    background: '#FDFEFE',
    text: '#2C3E50',
  },
  'fitness-entrenamiento': {
    primary: '#E74C3C',
    secondary: '#1A1A2E',
    accent: '#F39C12',
    background: '#0A0A0A',
    text: '#FFFFFF',
  },
  'cursos-educacion': {
    primary: '#3498DB',
    secondary: '#2C3E50',
    accent: '#E74C3C',
    background: '#ECF0F1',
    text: '#2C3E50',
  },
  'finanzas-inversion': {
    primary: '#1A6B1A',
    secondary: '#2C3E50',
    accent: '#F1C40F',
    background: '#FFFFFF',
    text: '#2C3E50',
  },
  'psicologia-coaching': {
    primary: '#8E44AD',
    secondary: '#2C3E50',
    accent: '#1ABC9C',
    background: '#F8F9FA',
    text: '#2C3E50',
  },
  'inmobiliaria-propiedades': {
    primary: '#2C3E50',
    secondary: '#BDC3C7',
    accent: '#E67E22',
    background: '#FFFFFF',
    text: '#2C3E50',
  },
  'modelaje-agencia': {
    primary: '#000000',
    secondary: '#8B8B8B',
    accent: '#D4AF37',
    background: '#FFFFFF',
    text: '#000000',
  },
  default: { primary: '#5865F2', secondary: '#2C2F33', accent: '#EB459E', background: '#FFFFFF', text: '#2C2F33' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const ensureDesignDir = async (): Promise<void> => {
  await fs.mkdir(DESIGN_DIR, { recursive: true });
};

const briefPath = (brandId: string): string => path.join(DESIGN_DIR, `${brandId}-briefs.json`);

const loadBriefs = async (brandId: string): Promise<DesignBrief[]> => {
  try {
    return JSON.parse(await fs.readFile(briefPath(brandId), 'utf-8')) as DesignBrief[];
  } catch {
    return [];
  }
};

const saveBriefs = async (brandId: string, briefs: DesignBrief[]): Promise<void> => {
  await ensureDesignDir();
  await fs.writeFile(briefPath(brandId), JSON.stringify(briefs.slice(-100), null, 2), 'utf-8');
};

// ── Generación de brief ───────────────────────────────────────────────────────

/** Convierte datos/copy en un brief de diseño estructurado para Canva. */
export const generateDesignBrief = async (
  brand: BrandProfile,
  params: {
    format: CanvaFormat;
    contentType: DesignBrief['contentType'];
    mainMessage: string;
    subMessage?: string;
    cta?: string;
    dataToVisualize?: Record<string, number | string>;
    slideNumber?: number; // para carruseles
    totalSlides?: number;
  },
): Promise<DesignBrief> => {
  const brandId = brand.id ?? brand.name.toLowerCase().replace(/\s+/g, '-');
  const accountType = brand.industryCategory?.toLowerCase().replace(/\s+/g, '-') ?? 'default';
  const colorPalette = PALETTE_PRESETS[accountType] ?? PALETTE_PRESETS['default']!;

  log.info('[canvaSkill] generating design brief', { brandId, format: params.format });

  const stream = await client.messages.stream({
    model: MODEL,
    max_tokens: 1200,
    thinking: { type: 'adaptive' },
    system: `Eres un director de arte digital especializado en Instagram y Canva.
Creas briefs de diseño específicos, técnicos y listos para implementar.
Conoces las últimas tendencias visuales de Instagram por industria.
Devuelves JSON puro.`,
    messages: [
      {
        role: 'user',
        content: `Crea un brief de diseño Canva para ${brand.name}:

Formato: ${params.format}
Tipo de contenido: ${params.contentType}
Industria: ${brand.industryCategory ?? 'general'}
Mensaje principal: "${params.mainMessage}"
${params.subMessage ? `Mensaje secundario: "${params.subMessage}"` : ''}
${params.cta ? `CTA: "${params.cta}"` : ''}
${params.dataToVisualize ? `Datos a visualizar: ${JSON.stringify(params.dataToVisualize)}` : ''}
${params.slideNumber ? `Diapositiva ${params.slideNumber} de ${params.totalSlides}` : ''}

Paleta de color sugerida: ${JSON.stringify(colorPalette)}

Devuelve brief de diseño:
{
  "typography": {
    "headline": "nombre de fuente (ej: Montserrat, Playfair Display)",
    "body": "nombre de fuente",
    "headlineSize": "small|medium|large|xlarge"
  },
  "visualStyle": "minimalista|bold|elegante|vibrant|corporativo|lifestyle",
  "imageDirection": "instrucción específica para imagen: qué mostrar, angulo, estilo fotográfico",
  "elements": ["elemento gráfico 1", "elemento 2", "elemento 3"],
  "doNot": ["qué evitar 1", "qué evitar 2"],
  "canvaTemplate": "descripción del tipo de template a buscar en Canva",
  "estimatedDesignMinutes": número
}`,
      },
    ],
  });

  const msg = await stream.finalMessage();
  const textBlock = msg.content.find((b) => b.type === 'text');
  const jsonMatch = textBlock?.text.match(/\{[\s\S]*\}/);
  const generated = jsonMatch ? (JSON.parse(jsonMatch[0]) as Partial<DesignBrief>) : {};

  const brief: DesignBrief = {
    id: `brief-${Date.now()}`,
    brandId,
    format: params.format,
    contentType: params.contentType,
    mainMessage: params.mainMessage,
    subMessage: params.subMessage,
    cta: params.cta,
    dataToVisualize: params.dataToVisualize,
    colorPalette,
    typography: generated.typography ?? { headline: 'Montserrat', body: 'Open Sans', headlineSize: 'large' },
    visualStyle: generated.visualStyle ?? 'minimalista',
    imageDirection: generated.imageDirection ?? 'Imagen de alta calidad relacionada al tema',
    elements: generated.elements ?? [],
    doNot: generated.doNot ?? ['Texto ilegible', 'Colores que no están en la paleta', 'Imágenes de baja resolución'],
    canvaTemplate: generated.canvaTemplate,
    estimatedDesignMinutes: generated.estimatedDesignMinutes ?? 15,
    createdAt: new Date().toISOString(),
  };

  const briefs = await loadBriefs(brandId);
  await saveBriefs(brandId, [...briefs, brief]);
  return brief;
};

/** Genera briefs completos para un carrusel (N slides). */
export const generateCarouselBriefs = async (
  brand: BrandProfile,
  slides: Array<{ text: string; designNotes: string }>,
): Promise<DesignBrief[]> => {
  const briefs: DesignBrief[] = [];
  for (let i = 0; i < slides.length; i++) {
    const slide = slides[i]!;
    const format: CanvaFormat = i === 0 ? 'instagram-carousel-cover' : 'instagram-carousel-slide';
    const brief = await generateDesignBrief(brand, {
      format,
      contentType: i === slides.length - 1 ? 'promotional' : 'educational',
      mainMessage: slide.text.slice(0, 80),
      subMessage: slide.designNotes,
      slideNumber: i + 1,
      totalSlides: slides.length,
    });
    briefs.push(brief);
  }
  return briefs;
};

/** Instrucciones paso a paso para crear el diseño en Canva. */
export const getCanvaInstructions = (brief: DesignBrief): string[] => [
  `1. Abre Canva y busca template: "${brief.canvaTemplate ?? 'Instagram Post ' + brief.format}"`,
  `2. Formato: ${brief.format} — resolución esperada 1080px`,
  `3. Paleta de colores: Primary ${brief.colorPalette.primary}, Secondary ${brief.colorPalette.secondary}, Accent ${brief.colorPalette.accent}`,
  `4. Tipografía: "${brief.typography.headline}" para titulares (${brief.typography.headlineSize}), "${brief.typography.body}" para cuerpo`,
  `5. Texto principal (centrado/destacado): "${brief.mainMessage}"`,
  ...(brief.subMessage ? [`6. Texto secundario: "${brief.subMessage}"`] : []),
  ...(brief.cta ? [`7. CTA: "${brief.cta}" — botón prominente`] : []),
  `8. Imagen/visual: ${brief.imageDirection}`,
  `9. Elementos adicionales: ${brief.elements.join(', ')}`,
  `10. Estilo visual: ${brief.visualStyle}`,
  `11. EVITAR: ${brief.doNot.join('; ')}`,
  `12. Exportar en PNG HD (1080x${brief.format.includes('story') ? '1920' : '1080'})`,
];

/** Crea registro de trabajo de diseño y seguimiento. */
export const createDesignJob = async (
  brandId: string,
  briefId: string,
  caption?: string,
  hashtags?: string[],
): Promise<DesignJob> => {
  const job: DesignJob = {
    briefId,
    status: 'pending',
    publishedToInstagram: false,
    caption,
    hashtags,
  };

  const jobsPath = path.join(DESIGN_DIR, `${brandId}-jobs.json`);
  let jobs: DesignJob[] = [];
  try {
    jobs = JSON.parse(await fs.readFile(jobsPath, 'utf-8')) as DesignJob[];
  } catch {
    /* noop */
  }
  jobs.push(job);
  await ensureDesignDir();
  await fs.writeFile(jobsPath, JSON.stringify(jobs.slice(-200), null, 2), 'utf-8');

  return job;
};

/** Retorna briefs pendientes de diseño. */
export const getPendingBriefs = async (brandId: string): Promise<DesignBrief[]> => {
  const briefs = await loadBriefs(brandId);
  const last24h = Date.now() - 24 * 60 * 60 * 1000;
  return briefs.filter((b) => new Date(b.createdAt).getTime() > last24h);
};
