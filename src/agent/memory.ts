import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { BrandProfile } from '../config/types.js';
import { getLatestAnalytics, listInbound, listPostsByAccount } from '../database/index.js';
import { IMAGE_SOURCE_INSTRUCTIONS } from '../capabilities/aesthetic/brandStyleGuide.js';

interface PerformanceRecord {
  postId: string;
  format: string;
  publishedAt: string;
  metrics: { likes: number; comments: number; shares: number; saves: number; reach: number };
  hookFirstLine: string;
}

interface MemoryShape {
  brand: BrandProfile;
  history: PerformanceRecord[];
  lastTrendsSnapshot?: { capturedAt: string; angles: string[] };
  bestHours?: string[];
}

const MEMORY_PATH = resolve('data/runtime/memory.json');

const persist = (mem: MemoryShape): void => {
  mkdirSync(dirname(MEMORY_PATH), { recursive: true });
  writeFileSync(MEMORY_PATH, JSON.stringify(mem, null, 2), 'utf-8');
};

export const initMemory = (brand: BrandProfile): MemoryShape => {
  if (existsSync(MEMORY_PATH)) {
    const existing = JSON.parse(readFileSync(MEMORY_PATH, 'utf-8')) as MemoryShape;
    existing.brand = brand;
    persist(existing);
    return existing;
  }
  const fresh: MemoryShape = { brand, history: [] };
  persist(fresh);
  return fresh;
};

export const recordPerformance = (record: PerformanceRecord): void => {
  if (!existsSync(MEMORY_PATH)) throw new Error('Memoria no inicializada');
  const mem = JSON.parse(readFileSync(MEMORY_PATH, 'utf-8')) as MemoryShape;
  mem.history.push(record);
  persist(mem);
};

export const topPerformers = (limit = 5): PerformanceRecord[] => {
  if (!existsSync(MEMORY_PATH)) return [];
  const mem = JSON.parse(readFileSync(MEMORY_PATH, 'utf-8')) as MemoryShape;
  return [...mem.history]
    .sort((a, b) => b.metrics.saves + b.metrics.shares - (a.metrics.saves + a.metrics.shares))
    .slice(0, limit);
};

/**
 * Brand Kit: cargado 1 sola vez por el usuario (colores, tipografía, foto
 * protagonista, logo, elementos visuales) y leído automáticamente acá. Como
 * brandContext() se inyecta en todos los agentes (ver createAgentBase), esto
 * alcanza a Manos Libres, Piloto automático, Carruseles, Reels e Historias
 * sin cablear nada por separado.
 */
const brandVisualBlock = (brand: BrandProfile): string => {
  const v = brand.visual;
  const lines = [
    `- Paleta: ${v.palette.join(', ') || 'libre, coherente con el mood'}`,
    `- Tipografía: ${v.typography.join(', ') || 'sans serif legible'} (escala ${v.typeScale})`,
    `- Mood / estilo: ${v.mood} · ${v.style}`,
    `- Estilo fotográfico: ${v.photographyStyle}`,
    `- Densidad visual: ${v.density} · Ratio imagen/texto: ${v.imageTextRatio}`,
    `- Fuente de imagen: ${IMAGE_SOURCE_INSTRUCTIONS[v.imageSource]}`,
    `- Elementos visuales del nicho a reutilizar: ${v.visualElements.join(', ') || 'ninguno definido'}`,
  ];
  if (v.allowedIconography.length) lines.push(`- Iconografía permitida: ${v.allowedIconography.join(', ')}`);
  if (v.forbiddenIconography.length)
    lines.push(`- Iconografía / temas PROHIBIDOS (nunca incluir): ${v.forbiddenIconography.join(', ')}`);
  if (v.heroImageUrl) {
    lines.push(
      '- Hay una foto protagonista de marca cargada: priorizar composiciones que la integren o referencien (la persona/producto real de la marca), en vez de gente o escenas genéricas.',
    );
  }
  if (v.logoUrl) lines.push('- Hay logo de marca cargado: dejar espacio para watermark/firma cuando aplique.');
  return lines.join('\n');
};

const brandPersonalityLine = (brand: BrandProfile): string => {
  const bs = brand.brandStrategy;
  const parts: string[] = [];
  if (bs?.archetype) parts.push(`arquetipo "${bs.archetype}"`);
  if (bs?.personality?.length) parts.push(bs.personality.join(', '));
  return parts.length ? `PERSONALIDAD DE MARCA: ${parts.join(' — ')}` : '';
};

export const brandContext = (brand: BrandProfile): string =>
  `MARCA: ${brand.name} (${brand.type})
${brand.accountCategory ? `CATEGORÍA DE CUENTA: ${brand.accountCategory}` : ''}
${brand.industryCategory ? `RUBRO: ${brand.industryCategory}` : ''}
NICHO: ${brand.niche}
AUDIENCIA: ${brand.audience.description}
DOLORES: ${brand.audience.pains.join(' · ')}
DESEOS: ${brand.audience.desires.join(' · ')}
TONO: ${brand.voice.tone.join(', ')}
PROHIBIDO DECIR: ${brand.voice.forbidden.join(', ') || 'nada en particular'}
${brandPersonalityLine(brand)}
IDENTIDAD VISUAL (Brand Kit):
${brandVisualBlock(brand)}
${brand.brandStrategy?.promise ? `CLAIM DE MARCA: "${brand.brandStrategy.promise}"` : ''}
OBJETIVO PRIMARIO: ${brand.goals.primary}
MÉTRICAS A VIGILAR: ${brand.goals.metricsToWatch.join(', ')}
${brand.competitors.length ? `COMPETENCIA A DIFERENCIARSE: ${brand.competitors.join(', ')}` : ''}
${brand.voice.referenceQuotes.length ? `FRASES DE REFERENCIA:\n- ${brand.voice.referenceQuotes.join('\n- ')}` : ''}`;

/**
 * Construye un contexto enriquecido con datos reales de SQLite.
 * Se inyecta automáticamente en todos los agentes via createAgentBase.
 */
export const getAnalyticsContext = (brandId: string): string => {
  try {
    const lines: string[] = [];

    // Latest analytics snapshot
    const latest = getLatestAnalytics(brandId);
    if (latest) {
      lines.push('📊 ÚLTIMAS MÉTRICAS:');
      if (latest.followers !== undefined) lines.push(`  Followers: ${latest.followers}`);
      if (latest.reach !== undefined) lines.push(`  Reach: ${latest.reach}`);
      if (latest.impressions !== undefined) lines.push(`  Impressions: ${latest.impressions}`);
      if (latest.profileViews !== undefined) lines.push(`  Profile Views: ${latest.profileViews}`);
    }

    // Recent posts
    const posts = listPostsByAccount(brandId, 'published').slice(0, 5);
    if (posts.length > 0) {
      lines.push('\n📝 ÚLTIMOS POSTS PUBLICADOS:');
      for (const post of posts) {
        lines.push(
          `  [${post.format}] ${post.caption?.slice(0, 60) ?? '(sin caption)'}... (${post.publishedAt?.slice(0, 10) ?? '?'})`,
        );
      }
    }

    // Recent inbound messages
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const inbound = listInbound(brandId, undefined, since).slice(0, 5);
    if (inbound.length > 0) {
      lines.push('\n💬 MENSAJES ENTRANTES RECIENTES (7 días):');
      for (const msg of inbound) {
        lines.push(`  [${msg.type}] ${msg.sender}: ${msg.text?.slice(0, 50) ?? ''}...`);
      }
    }

    return lines.length > 0 ? lines.join('\n') : '';
  } catch {
    return '';
  }
};
