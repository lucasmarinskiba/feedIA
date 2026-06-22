import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import { log } from '../../agent/logger.js';
import { env } from '../../config/index.js';
import type { BrandProfile } from '../../config/types.js';
import type { CuratorSource, BacklogItem } from './sources.js';
import { loadBacklog, saveBacklog, loadSources, updateSourceLastReview } from './sources.js';

export interface FetchedContent {
  title: string;
  text: string;
  url?: string;
  publishedAt?: string;
}

const stripHtml = (html: string): string =>
  html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

export const fetchUrl = async (url: string): Promise<FetchedContent | null> => {
  if (env.dryRun) {
    log.info(`[DRY RUN] fetch ${url} (devuelve placeholder)`);
    return {
      title: 'Contenido simulado',
      text: 'En modo DRY_RUN no se hace fetch real. Conectá HTTP cuando quieras producción.',
      url,
    };
  }
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'paithon-ig-agent-curator/1.0' },
    });
    if (!res.ok) {
      log.warn(`Curator fetch ${url} → ${res.status}`);
      return null;
    }
    const ct = res.headers.get('content-type') ?? '';
    const body = await res.text();
    if (ct.includes('xml') || ct.includes('rss') || body.includes('<rss')) {
      const items = body.match(/<item>[\s\S]*?<\/item>/g) ?? [];
      const first = items[0];
      if (first) {
        const titleMatch = first.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = first.match(/<link>([\s\S]*?)<\/link>/);
        const descMatch = first.match(/<description>([\s\S]*?)<\/description>/);
        return {
          title: stripHtml(titleMatch?.[1] ?? '(sin título)'),
          text: stripHtml(descMatch?.[1] ?? body).slice(0, 8000),
          ...(linkMatch?.[1] ? { url: stripHtml(linkMatch[1]) } : {}),
        };
      }
    }
    return {
      title: stripHtml(body.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '(sin título)'),
      text: stripHtml(body).slice(0, 12000),
      url,
    };
  } catch (err) {
    log.warn(`Curator fetch ${url} falló: ${(err as Error).message}`);
    return null;
  }
};

interface CuratedAnalysis {
  resumen: string;
  scoreRelevancia: number;
  ideasDerivadas: string[];
  formatosSugeridos: Array<'reel' | 'carrusel' | 'historia' | 'post-imagen'>;
  motivoScore: string;
}

const analyzeContent = async (
  brand: BrandProfile,
  source: CuratorSource,
  content: FetchedContent,
): Promise<CuratedAnalysis> => {
  const prompt = `Actuá como editor evaluando si este contenido externo merece convertirse en posts de la marca.

${brandContext(brand)}

FUENTE: ${source.nombre} (${source.tipo})
TÍTULO: ${content.title}
${content.url ? `URL: ${content.url}` : ''}

EXTRACTO:
"""
${content.text.slice(0, 4000)}
"""

Evaluá:
- ¿Es relevante para esta audiencia y nicho?
- ¿Tiene tesis útil o es ruido/clickbait?
- Si vale: 3-5 ideas derivadas concretas para Instagram (no parafrasear el título).
- Formatos donde brilla.

JSON:
{
  "resumen": "1-2 oraciones del contenido original",
  "scoreRelevancia": 0-100,
  "ideasDerivadas": ["idea concreta 1", ...],
  "formatosSugeridos": ["reel", "carrusel"],
  "motivoScore": "por qué ese score"
}`;
  return askJson<CuratedAnalysis>(prompt, { maxTokens: 2500, fast: true });
};

export const procesarSource = async (brand: BrandProfile, source: CuratorSource): Promise<BacklogItem[]> => {
  if (!source.activo) return [];
  if (!source.url) {
    log.warn(`Source ${source.nombre} sin URL: omitida.`);
    return [];
  }
  const content = await fetchUrl(source.url);
  if (!content) return [];

  const analysis = await analyzeContent(brand, source, content);
  if (analysis.scoreRelevancia < 50) {
    log.debug(`Source ${source.nombre}: score ${analysis.scoreRelevancia} bajo umbral`);
    updateSourceLastReview(source.id);
    return [];
  }

  const newItem: BacklogItem = {
    id: `bk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    sourceId: source.id,
    capturadoEn: new Date().toISOString(),
    resumen: analysis.resumen,
    ...(content.url ? { urlOriginal: content.url } : {}),
    scoreRelevancia: analysis.scoreRelevancia,
    ideasDerivadas: analysis.ideasDerivadas,
    status: 'nuevo',
    formatosSugeridos: analysis.formatosSugeridos,
  };
  const backlog = loadBacklog();
  backlog.push(newItem);
  saveBacklog(backlog);
  updateSourceLastReview(source.id);
  return [newItem];
};

export const procesarTodasLasSources = async (brand: BrandProfile): Promise<BacklogItem[]> => {
  const sources = loadSources().filter((s) => s.activo);
  const result: BacklogItem[] = [];
  for (const source of sources) {
    const items = await procesarSource(brand, source);
    result.push(...items);
  }
  log.success(`Curator: ${result.length} ítems nuevos en el backlog`);
  return result;
};

export const aprobarItem = (id: string): BacklogItem | null => {
  const backlog = loadBacklog();
  const item = backlog.find((b) => b.id === id);
  if (!item) return null;
  item.status = 'aprobado';
  saveBacklog(backlog);
  return item;
};

export const marcarUsado = (id: string): BacklogItem | null => {
  const backlog = loadBacklog();
  const item = backlog.find((b) => b.id === id);
  if (!item) return null;
  item.status = 'usado';
  saveBacklog(backlog);
  return item;
};

export const listarBacklog = (status?: BacklogItem['status']): BacklogItem[] => {
  const all = loadBacklog();
  return status ? all.filter((b) => b.status === status) : all;
};
