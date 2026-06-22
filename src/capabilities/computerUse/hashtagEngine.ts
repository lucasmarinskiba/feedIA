/**
 * Hashtag Engine — Motor inteligente de optimización de hashtags para Instagram.
 *
 * Genera estrategias de hashtags en 3 niveles (primarios/secundarios/contextuales),
 * rota sets para evitar penalización por repetición y evalúa la calidad de
 * conjuntos existentes. No realiza llamadas a la API de Instagram.
 *
 * Nunca supera los 30 tags totales (límite de Instagram).
 */

import Anthropic from '@anthropic-ai/sdk';
import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';

const client = new Anthropic();
const MODEL = 'claude-opus-4-7';
const MAX_INSTAGRAM_HASHTAGS = 30;

// ── Tipos públicos ─────────────────────────────────────────────────────────────

export interface HashtagSet {
  id: string;
  name: string;
  tags: string[];
  niche: string[];
  volume: 'low' | 'medium' | 'high' | 'viral';
  competition: 'low' | 'medium' | 'high';
  lastUsed?: string;
  performanceScore?: number;
}

export interface HashtagStrategy {
  primarySet: string[];
  secondarySet: string[];
  contextual: string[];
  banned: string[];
  total: string[];
  rationale: string;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const normalizeTag = (tag: string): string => {
  const cleaned = tag.startsWith('#') ? tag : `#${tag}`;
  return cleaned.toLowerCase().replace(/\s+/g, '');
};

const deduplicateTags = (tags: string[]): string[] => [...new Set(tags.map(normalizeTag))];

const callClaudeJson = async <T>(prompt: string, maxTokens = 4096): Promise<T> => {
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    thinking: { type: 'enabled', budget_tokens: 1500 },
    messages: [
      {
        role: 'user',
        content: `${prompt}\n\nRespondé EXCLUSIVAMENTE con JSON válido, sin texto antes ni después, sin bloques de código markdown.`,
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('[HashtagEngine] Claude no devolvió bloque de texto');
  }

  const cleaned = textBlock.text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');

  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new Error(
      `[HashtagEngine] No se pudo parsear JSON de Claude: ${(err as Error).message}\nRespuesta: ${textBlock.text.slice(0, 400)}`,
    );
  }
};

// ── Función 1: generateHashtagStrategy ────────────────────────────────────────

interface PostContext {
  topic: string;
  format: string;
  hook: string;
}

interface StrategyRaw {
  primarySet: string[];
  secondarySet: string[];
  contextual: string[];
  rationale: string;
}

export const generateHashtagStrategy = async (
  brand: BrandProfile,
  postContext: PostContext,
): Promise<HashtagStrategy> => {
  log.info(`[HashtagEngine] Generando estrategia de hashtags para "${postContext.topic}"`);

  const existingPools = Object.entries(brand.hashtagPools)
    .map(([pillar, tags]) => `  ${pillar}: ${tags.slice(0, 10).join(', ')}`)
    .join('\n');

  const forbidden = brand.voice.forbidden ?? [];

  const prompt = `Sos un experto en crecimiento orgánico de Instagram con conocimiento profundo del algoritmo y la cultura LATAM.

MARCA: ${brand.name}
NICHO: ${brand.niche}
AUDIENCIA: ${brand.audience.description}
OBJETIVO: ${brand.goals.primary}
LOCALE: ${brand.audience.locale}

CONTEXTO DEL POST:
- Tema: ${postContext.topic}
- Formato: ${postContext.format}
- Hook de apertura: "${postContext.hook}"

POOLS DE HASHTAGS EXISTENTES DE LA MARCA:
${existingPools || '  (no hay pools definidos aún)'}

PALABRAS/TÉRMINOS PROHIBIDOS: ${forbidden.join(', ') || 'ninguno'}

Tu tarea: generá una estrategia de hashtags en 3 niveles para este post específico.

REGLAS CRÍTICAS:
- primarySet: 3-5 hashtags de ALTA autoridad y específicos del nicho (no virales masivos). Usados siempre.
- secondarySet: 5-8 hashtags de COMPETENCIA MEDIA. Buenos para descubrimiento sin hundirse en el ruido.
- contextual: 2-4 hashtags MUY ESPECÍFICOS al tema de este post en particular.
- TOTAL MÁXIMO: ${MAX_INSTAGRAM_HASHTAGS} tags entre los tres niveles.
- Todos en el locale correcto (${brand.audience.locale}).
- Nunca incluir términos shadowbanned conocidos (drogas, violencia, sexo explícito, spam).
- Mezclar español e inglés según corresponda al nicho.
- Evitar repetir el mismo tag en distintos niveles.

JSON:
{
  "primarySet": ["#tag1", "#tag2", "#tag3"],
  "secondarySet": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"],
  "contextual": ["#tag1", "#tag2"],
  "rationale": "explicación breve de la lógica de selección (2-3 oraciones)"
}`;

  const banned = forbidden.map(normalizeTag);

  try {
    const result = await callClaudeJson<StrategyRaw>(prompt, 3000);

    const primary = deduplicateTags(result.primarySet ?? []).slice(0, 5);
    const secondary = deduplicateTags(result.secondarySet ?? []).slice(0, 8);
    const contextual = deduplicateTags(result.contextual ?? []).slice(0, 4);

    const allTags = deduplicateTags([...primary, ...secondary, ...contextual]);
    const total = allTags.slice(0, MAX_INSTAGRAM_HASHTAGS);

    const strategy: HashtagStrategy = {
      primarySet: primary,
      secondarySet: secondary,
      contextual,
      banned,
      total,
      rationale: result.rationale ?? 'Estrategia generada por AI.',
    };

    log.info(`[HashtagEngine] Estrategia generada: ${total.length} tags en total`);
    return strategy;
  } catch (err) {
    log.warn(`[HashtagEngine] Error con Claude, usando fallback: ${(err as Error).message}`);

    const poolTags = Object.values(brand.hashtagPools).flat();
    const fallbackTags = deduplicateTags(poolTags).slice(0, MAX_INSTAGRAM_HASHTAGS);

    return {
      primarySet: fallbackTags.slice(0, 3),
      secondarySet: fallbackTags.slice(3, 8),
      contextual: [`#${postContext.topic.replace(/\s+/g, '').toLowerCase()}`],
      banned,
      total: fallbackTags.slice(0, MAX_INSTAGRAM_HASHTAGS),
      rationale: 'Fallback desde pools de la marca (Claude no disponible).',
    };
  }
};

// ── Función 2: rotateHashtagSets ───────────────────────────────────────────────

const overlapRatio = (setA: string[], setB: string[]): number => {
  if (setA.length === 0 || setB.length === 0) return 0;
  const normA = new Set(setA.map(normalizeTag));
  const common = setB.map(normalizeTag).filter((t) => normA.has(t)).length;
  return common / Math.min(setA.length, setB.length);
};

interface RotationRaw {
  newSet: string[];
}

export const rotateHashtagSets = async (brand: BrandProfile, recentlyUsed: string[][]): Promise<string[]> => {
  log.info('[HashtagEngine] Rotando sets de hashtags para evitar repetición...');

  const recentFlat = recentlyUsed.slice(0, 5);
  const poolTags = Object.values(brand.hashtagPools).flat();
  const poolTagsNorm = deduplicateTags(poolTags);

  const recentlyUsedStr = recentFlat
    .map((set, i) => `Set ${i + 1} (hace ${i + 1} posts): ${set.join(', ')}`)
    .join('\n');

  const prompt = `Sos un experto en crecimiento orgánico de Instagram que sabe que repetir hashtags idénticos baja el alcance.

MARCA: ${brand.name}
NICHO: ${brand.niche}
POOL DE HASHTAGS DISPONIBLES: ${poolTagsNorm.join(', ') || '(pool vacío)'}

SETS USADOS RECIENTEMENTE (últimos ${recentFlat.length} posts):
${recentlyUsedStr || 'Ninguno aún.'}

Tu tarea: generá un nuevo set de ${MAX_INSTAGRAM_HASHTAGS} hashtags con MENOS DEL 50% de overlap con cualquier set reciente.

Reglas:
- Máximo ${MAX_INSTAGRAM_HASHTAGS} tags en total.
- Menos del 50% de overlap con CADA uno de los sets recientes.
- Podés usar tags del pool de la marca más tags nuevos complementarios.
- Mantener la mezcla de volumen: 20% alto, 50% medio, 30% bajo/nicho.
- En locale ${brand.audience.locale}.

JSON:
{
  "newSet": ["#tag1", "#tag2", ...]
}`;

  try {
    const result = await callClaudeJson<RotationRaw>(prompt, 2500);
    const proposed = deduplicateTags(result.newSet ?? []);

    const maxOverlap = recentFlat.reduce((max, recent) => {
      const ratio = overlapRatio(proposed, recent);
      return Math.max(max, ratio);
    }, 0);

    if (maxOverlap > 0.5) {
      log.warn(`[HashtagEngine] Overlap del ${Math.round(maxOverlap * 100)}% detectado, filtrando tags repetidos`);
      const recentAllNorm = new Set(recentFlat.flat().map(normalizeTag));
      const fresh = proposed.filter((t) => !recentAllNorm.has(t));
      const reused = proposed.filter((t) => recentAllNorm.has(t));
      const balanced = deduplicateTags([...fresh, ...reused]).slice(0, MAX_INSTAGRAM_HASHTAGS);
      log.info(`[HashtagEngine] Set rotado: ${balanced.length} tags (${fresh.length} frescos)`);
      return balanced;
    }

    const final = proposed.slice(0, MAX_INSTAGRAM_HASHTAGS);
    log.info(`[HashtagEngine] Set rotado: ${final.length} tags (overlap máximo: ${Math.round(maxOverlap * 100)}%)`);
    return final;
  } catch (err) {
    log.warn(`[HashtagEngine] Error en rotación, usando fallback: ${(err as Error).message}`);

    const recentAllNorm = new Set(recentFlat.flat().map(normalizeTag));
    const freshFromPool = poolTagsNorm.filter((t) => !recentAllNorm.has(t));
    return freshFromPool.slice(0, MAX_INSTAGRAM_HASHTAGS);
  }
};

// ── Función 3: scoreHashtagSet ─────────────────────────────────────────────────

interface ScoreRaw {
  score: number;
  strengths: string[];
  weaknesses: string[];
}

export const scoreHashtagSet = async (
  tags: string[],
  brandNiche: string,
): Promise<{ score: number; strengths: string[]; weaknesses: string[] }> => {
  log.info(`[HashtagEngine] Evaluando set de ${tags.length} hashtags para nicho: ${brandNiche}`);

  if (tags.length === 0) {
    return { score: 0, strengths: [], weaknesses: ['El set está vacío'] };
  }

  const normalizedTags = deduplicateTags(tags);
  const tagList = normalizedTags.join(', ');

  const prompt = `Sos un auditor experto en estrategia de hashtags para Instagram con conocimiento del algoritmo de 2024-2025.

NICHO: ${brandNiche}
HASHTAGS A EVALUAR (${normalizedTags.length} tags): ${tagList}

Evaluá este set en una escala de 0-100 considerando:
1. RELEVANCIA (0-25 pts): ¿qué tan relevantes son al nicho?
2. MIX DE VOLUMEN (0-25 pts): ¿hay equilibrio entre alto/medio/bajo volumen? (ideal: 20% alto, 50% medio, 30% nicho)
3. PATRONES SHADOWBAN (0-25 pts): ¿alguno tiene historial de shadowban o es genérico peligroso?
4. TARGETING GEOGRÁFICO (0-15 pts): ¿hay tags en el idioma/locale correcto para el mercado?
5. DIVERSIDAD (0-10 pts): ¿hay variedad de categorías (comunidad, topic, formato, marca)?

Si hay más de ${MAX_INSTAGRAM_HASHTAGS} tags: restar 20 puntos automáticamente (Instagram penaliza).

JSON:
{
  "score": número entre 0 y 100,
  "strengths": ["fortaleza 1 específica", "fortaleza 2", "fortaleza 3"],
  "weaknesses": ["debilidad 1 con sugerencia de mejora", "debilidad 2", "debilidad 3"]
}`;

  const overLimitPenalty = normalizedTags.length > MAX_INSTAGRAM_HASHTAGS ? 20 : 0;

  try {
    const result = await callClaudeJson<ScoreRaw>(prompt, 2500);
    const adjustedScore = Math.max(0, Math.min(100, (result.score ?? 50) - overLimitPenalty));

    const weaknesses = [...(result.weaknesses ?? [])];
    if (overLimitPenalty > 0) {
      weaknesses.unshift(
        `Excede el límite de ${MAX_INSTAGRAM_HASHTAGS} tags (-20 pts). Usar exactamente ${MAX_INSTAGRAM_HASHTAGS}.`,
      );
    }

    log.info(`[HashtagEngine] Score: ${adjustedScore}/100`);
    return {
      score: adjustedScore,
      strengths: result.strengths ?? [],
      weaknesses,
    };
  } catch (err) {
    log.warn(`[HashtagEngine] Error evaluando con Claude: ${(err as Error).message}`);

    const score = Math.max(
      0,
      Math.min(
        100,
        50 + (normalizedTags.length >= 10 ? 10 : -10) + (normalizedTags.length <= MAX_INSTAGRAM_HASHTAGS ? 0 : -20),
      ),
    );

    return {
      score,
      strengths: ['Set tiene tags definidos'],
      weaknesses: ['No se pudo evaluar en detalle (Claude no disponible)'],
    };
  }
};

// ── Función 4: buildHashtagPool ────────────────────────────────────────────────

interface HashtagPoolRaw {
  [pillar: string]: string[];
}

export const buildHashtagPool = async (brand: BrandProfile): Promise<Record<string, string[]>> => {
  log.info(`[HashtagEngine] Construyendo pool de hashtags para ${brand.name}...`);

  const pillars =
    brand.contentPillars.length > 0
      ? brand.contentPillars.map((p) => `${p.name}: ${p.description}`)
      : derivePillarsFromNiche(brand.niche);

  const pillarsStr = Array.isArray(pillars) ? pillars.join('\n  - ') : pillars;

  const existingPoolStr =
    Object.keys(brand.hashtagPools).length > 0 ? JSON.stringify(brand.hashtagPools, null, 2) : '(ninguno definido aún)';

  const prompt = `Sos un estratega de crecimiento orgánico en Instagram experto en LATAM y nicho ${brand.niche}.

MARCA: ${brand.name}
TIPO: ${brand.type}
NICHO: ${brand.niche}
AUDIENCIA: ${brand.audience.description} (locale: ${brand.audience.locale})
OBJETIVO: ${brand.goals.primary}
PILARES DE CONTENIDO:
  - ${pillarsStr}

POOL EXISTENTE (ampliar y mejorar si ya hay):
${existingPoolStr}

Tu tarea: generá un pool COMPLETO de hashtags organizado por pilar de contenido.

REGLAS:
- 1 clave por pilar de contenido (usar los pilares dados arriba).
- Agregar siempre estas claves adicionales: "comunidad", "formato-reel", "formato-carrusel", "formato-historia", "marca-personal" (si aplica), "geo-local" (si hay locale específico).
- Cada clave debe tener entre 15 y 30 hashtags únicos y de calidad.
- Mix de volumen por clave: ~25% alto volumen (>500k posts), ~50% medio (50k-500k), ~25% nicho (<50k).
- En el idioma apropiado para ${brand.audience.locale} (mezclar español/inglés según nicho).
- Todos con # al principio, en minúsculas, sin espacios.
- NO incluir términos shadowbanned.

JSON (record donde cada clave mapea a un array de strings):
{
  "pilar-educacion": ["#tag1", "#tag2", ...],
  "pilar-inspiracion": ["#tag1", "#tag2", ...],
  "comunidad": ["#tag1", "#tag2", ...],
  ...
}`;

  try {
    const result = await callClaudeJson<HashtagPoolRaw>(prompt, 6000);

    const pool: Record<string, string[]> = {};
    for (const [key, tags] of Object.entries(result)) {
      if (Array.isArray(tags)) {
        pool[key] = deduplicateTags(tags as string[]);
      }
    }

    const totalTags = Object.values(pool).flat().length;
    log.info(`[HashtagEngine] Pool construido: ${Object.keys(pool).length} categorías, ${totalTags} tags totales`);
    return pool;
  } catch (err) {
    log.warn(`[HashtagEngine] Error construyendo pool con Claude: ${(err as Error).message}`);

    const fallbackPool: Record<string, string[]> = {
      general: deduplicateTags(Object.values(brand.hashtagPools).flat()),
    };

    if (Object.keys(brand.hashtagPools).length > 0) {
      return brand.hashtagPools;
    }

    return fallbackPool;
  }
};

// ── Helpers internos ───────────────────────────────────────────────────────────

const derivePillarsFromNiche = (niche: string): string[] => {
  const nicheClean = niche.toLowerCase();

  if (nicheClean.includes('fitness') || nicheClean.includes('salud')) {
    return ['educación-fitness', 'motivación', 'nutrición', 'transformación', 'lifestyle'];
  }
  if (nicheClean.includes('moda') || nicheClean.includes('belleza')) {
    return ['outfits', 'tendencias', 'beauty-tips', 'lifestyle', 'inspiración'];
  }
  if (nicheClean.includes('finanz') || nicheClean.includes('invers')) {
    return ['educación-financiera', 'inversión', 'ahorro', 'emprendimiento', 'libertad-financiera'];
  }
  if (nicheClean.includes('gastronomia') || nicheClean.includes('cocina')) {
    return ['recetas', 'restaurantes', 'food-tips', 'cultura-gastronómica', 'chefs'];
  }
  if (nicheClean.includes('marketing') || nicheClean.includes('digital')) {
    return ['marketing-digital', 'redes-sociales', 'emprendimiento', 'estrategia', 'branding'];
  }

  return ['educación', 'inspiración', 'entretenimiento', 'comunidad', 'behind-scenes'];
};
