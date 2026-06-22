/**
 * Hook Lab de FeedIA — el laboratorio de hooks.
 *
 * El hook (primer 1-2 segundos de un reel, primer renglón de un caption, primer slide de un
 * carrusel) define el 80% del éxito. Acá vivimos los templates probados, la generación masiva
 * de variantes, el ranking automático y el aprendizaje por performance real.
 */

import { ask as routerAsk, askJson as routerAskJson, generateVariations } from '../../agent/tokenRouter.js';
import { getTopPerformers } from '../analytics/performanceDB.js';
import { log } from '../../agent/logger.js';
import type { BrandProfile, ContentFormat } from '../../config/types.js';

// ── Catálogo de templates probados ───────────────────────────────────────────

export interface HookTemplate {
  id: string;
  pattern: string; // Template con placeholders {variable}
  category: HookCategory;
  examples: string[];
  bestFor: ContentFormat[];
  emotionalDriver: 'curiosidad' | 'urgencia' | 'identificación' | 'controversia' | 'aspiracional' | 'miedo-perder';
  triggerWords: string[];
}

export type HookCategory =
  | 'pregunta'
  | 'contraste'
  | 'lista-prometida'
  | 'error-comun'
  | 'secreto-revelado'
  | 'antes-despues'
  | 'estadistica-impactante'
  | 'imperativo-stop'
  | 'historia-personal'
  | 'opinion-polemica'
  | 'pov';

export const HOOK_TEMPLATES: HookTemplate[] = [
  // Categoría: pregunta
  {
    id: 'q-direct',
    pattern: '¿{verbo_acción} {audiencia} pero no {resultado_deseado}?',
    category: 'pregunta',
    examples: [
      '¿Publicás todos los días pero no crecés?',
      '¿Entrenás duro pero no ves cambios?',
      '¿Trabajás 10 horas pero no facturás lo que querés?',
    ],
    bestFor: ['reel', 'carrusel', 'reel-faceless'],
    emotionalDriver: 'identificación',
    triggerWords: ['pero no', 'sin', 'no logr'],
  },
  {
    id: 'q-why',
    pattern: '¿Por qué {persona} {resultado_inesperado}?',
    category: 'pregunta',
    examples: [
      '¿Por qué los que menos hablan son los que más venden?',
      '¿Por qué las cuentas chicas crecen más rápido ahora?',
    ],
    bestFor: ['reel', 'carrusel'],
    emotionalDriver: 'curiosidad',
    triggerWords: ['por qué', 'cómo es que'],
  },

  // Contraste
  {
    id: 'contrast-vs',
    pattern: '{cosa_común} no es {creencia_popular}. Es {realidad}.',
    category: 'contraste',
    examples: [
      'Crecer en Instagram no es publicar más. Es publicar lo correcto.',
      'Vender no es convencer. Es enamorar al cliente correcto.',
    ],
    bestFor: ['reel', 'carrusel', 'post-imagen'],
    emotionalDriver: 'controversia',
    triggerWords: ['no es', 'en realidad'],
  },
  {
    id: 'contrast-most',
    pattern: 'La mayoría {acción_equivocada}. Vos hacé esto en su lugar.',
    category: 'contraste',
    examples: [
      'La mayoría publica reels random. Vos hacé esto en su lugar.',
      'La mayoría suplica likes. Vos hacé esto en su lugar.',
    ],
    bestFor: ['reel', 'carrusel'],
    emotionalDriver: 'aspiracional',
    triggerWords: ['la mayoría', 'todos', 'en su lugar'],
  },

  // Lista prometida
  {
    id: 'list-numbered',
    pattern: '{número} {cosas} que {beneficio} en {tiempo}',
    category: 'lista-prometida',
    examples: ['5 cambios al perfil que duplican seguidores en 30 días', '7 hooks que generan 10K+ views en 24 horas'],
    bestFor: ['carrusel', 'reel'],
    emotionalDriver: 'curiosidad',
    triggerWords: ['5', '7', '10', 'cosas', 'errores', 'tips'],
  },
  {
    id: 'list-mistakes',
    pattern: '{número} errores que están {consecuencia_negativa}',
    category: 'lista-prometida',
    examples: ['3 errores que están matando tu engagement', '5 errores que hacen que Instagram te oculte'],
    bestFor: ['carrusel', 'reel'],
    emotionalDriver: 'miedo-perder',
    triggerWords: ['errores', 'matando', 'oculta', 'pierdas'],
  },

  // Error común
  {
    id: 'error-stop',
    pattern: 'Stop. Dejá de {acción_equivocada}.',
    category: 'imperativo-stop',
    examples: ['Stop. Dejá de copiar a tu competencia.', 'Stop. Dejá de publicar a las 7 de la tarde.'],
    bestFor: ['reel'],
    emotionalDriver: 'urgencia',
    triggerWords: ['stop', 'pará', 'dejá de', 'basta'],
  },
  {
    id: 'error-cost',
    pattern: 'Este error te está costando {recurso_valioso} cada {período}.',
    category: 'error-comun',
    examples: ['Este error te está costando 100 seguidores por día.', 'Este detalle te cuesta 3 ventas al mes.'],
    bestFor: ['reel', 'carrusel'],
    emotionalDriver: 'miedo-perder',
    triggerWords: ['te está costando', 'pierdes', 'te cuesta'],
  },

  // Secreto revelado
  {
    id: 'secret-insider',
    pattern: 'Nadie te dice esto sobre {tema}, pero {verdad_oculta}.',
    category: 'secreto-revelado',
    examples: [
      'Nadie te dice esto sobre crecer en Instagram, pero el algoritmo recompensa silencios.',
      'Nadie te lo dice, pero los primeros 30 minutos de un post deciden su alcance.',
    ],
    bestFor: ['reel', 'carrusel'],
    emotionalDriver: 'curiosidad',
    triggerWords: ['nadie te dice', 'secreto', 'verdad oculta'],
  },
  {
    id: 'secret-pro',
    pattern: 'Esto es lo que {experto} hace y nadie más copia.',
    category: 'secreto-revelado',
    examples: [
      'Esto es lo que las cuentas de +100k hacen y nadie más copia.',
      'Esto es lo que los traders pro hacen distinto a vos.',
    ],
    bestFor: ['reel', 'carrusel'],
    emotionalDriver: 'aspiracional',
    triggerWords: ['hacen', 'lo que', 'pro', 'élite'],
  },

  // Antes/después
  {
    id: 'before-after',
    pattern: 'Pasé de {estado_inicial} a {estado_final} en {tiempo} haciendo esto.',
    category: 'antes-despues',
    examples: [
      'Pasé de 200 a 10K seguidores en 90 días haciendo esto.',
      'Pasé de no vender nada a facturar 6 cifras haciendo esto.',
    ],
    bestFor: ['reel', 'reel-faceless'],
    emotionalDriver: 'aspiracional',
    triggerWords: ['pasé de', 'en X días', 'haciendo esto'],
  },

  // Estadística impactante
  {
    id: 'stat-shock',
    pattern: 'El {porcentaje}% de {audiencia} {hace_acción}. Vos sos la excepción si {alternativa}.',
    category: 'estadistica-impactante',
    examples: [
      'El 92% de las cuentas no llegan a 1000 seguidores. Vos sos la excepción si hacés esto.',
      'El 87% de los reels no superan 500 views. El tuyo puede.',
    ],
    bestFor: ['reel', 'carrusel'],
    emotionalDriver: 'aspiracional',
    triggerWords: ['%', 'el X%', 'la mayoría no'],
  },

  // POV / Historia personal
  {
    id: 'pov-confession',
    pattern: 'POV: {situación_específica_e_íntima}.',
    category: 'pov',
    examples: [
      'POV: descubrís que tu hashtag estaba "shadowbaneado" hace 6 meses.',
      'POV: tu reel de 30K views no generó ni una venta.',
    ],
    bestFor: ['reel'],
    emotionalDriver: 'identificación',
    triggerWords: ['pov:', 'cuando'],
  },
  {
    id: 'story-confession',
    pattern: 'Esto me costó {recurso} aprender. Te lo regalo.',
    category: 'historia-personal',
    examples: [
      'Esto me costó 2 años aprender. Te lo regalo en 60 segundos.',
      'Esto me costó USD 15.000 en cursos descubrir. Te lo dejo gratis.',
    ],
    bestFor: ['reel', 'reel-faceless'],
    emotionalDriver: 'aspiracional',
    triggerWords: ['me costó', 'te regalo', 'gratis'],
  },

  // Opinión polémica
  {
    id: 'opinion-hot',
    pattern: 'Opinión impopular: {creencia_contraria_al_mainstream}.',
    category: 'opinion-polemica',
    examples: [
      'Opinión impopular: publicar todos los días te perjudica.',
      'Opinión impopular: los reels virales no sirven si no convertís.',
    ],
    bestFor: ['reel', 'carrusel', 'post-imagen'],
    emotionalDriver: 'controversia',
    triggerWords: ['opinión impopular', 'controvertido', 'a contrarreloj'],
  },
];

// ── Scoring de un hook puntual ───────────────────────────────────────────────

export interface HookScore {
  hook: string;
  score: number; // 0-100
  category: HookCategory | null;
  reasons: string[];
  improvements: string[];
}

const SCORE_LIMITS = { min: 15, ideal: 65, max: 130 };

export const scoreHook = (hook: string): HookScore => {
  const reasons: string[] = [];
  const improvements: string[] = [];
  let score = 30;

  const length = hook.length;
  if (length < SCORE_LIMITS.min) {
    score -= 15;
    improvements.push('Demasiado corto. Apuntá a 40-90 caracteres.');
  } else if (length > SCORE_LIMITS.max) {
    score -= 10;
    improvements.push('Demasiado largo. Cortá al núcleo del mensaje.');
  } else if (length >= 40 && length <= 90) {
    score += 8;
    reasons.push('Longitud óptima para scroll-stop');
  }

  // Detectar categoría según trigger words
  let detectedCategory: HookCategory | null = null;
  for (const tpl of HOOK_TEMPLATES) {
    if (tpl.triggerWords.some((w) => hook.toLowerCase().includes(w.toLowerCase()))) {
      detectedCategory = tpl.category;
      score += 15;
      reasons.push(`Usa patrón "${tpl.category}" (driver: ${tpl.emotionalDriver})`);
      break;
    }
  }
  if (!detectedCategory) {
    improvements.push('No detecto un patrón ganador. Probá: pregunta, contraste, lista numerada, error, secreto.');
  }

  // Tiene número
  if (/\b\d+\b/.test(hook)) {
    score += 10;
    reasons.push('Incluye número (alta especificidad)');
  } else {
    improvements.push('Agregá un número específico (5, 7, 30 días, 87%) para subir credibilidad');
  }

  // Pregunta o desafío
  if (/\?$/.test(hook.trim())) {
    score += 8;
    reasons.push('Pregunta directa — activa rumiación');
  }

  // Emojis estratégicos en posición clave
  const hasLeadingEmoji = /^[\p{Emoji_Presentation}🔥⚠️💡👇✨🚨👆⭐🎯]/u.test(hook);
  if (hasLeadingEmoji) {
    score += 5;
    reasons.push('Emoji inicial — captura visual');
  }

  // Mayúsculas en exceso (lo penaliza, se ve a gritos)
  const upperRatio = hook.replace(/[^A-ZÁÉÍÓÚÑ]/g, '').length / hook.length;
  if (upperRatio > 0.3) {
    score -= 8;
    improvements.push('Demasiadas mayúsculas — se lee a los gritos, baja credibilidad');
  }

  // Palabras "vacías" que matan el hook
  const fillerWords = ['hola', 'amigos', 'queridos', 'bienvenidos', 'buen día', 'hoy te voy a contar', 'hoy te traigo'];
  if (fillerWords.some((f) => hook.toLowerCase().startsWith(f))) {
    score -= 20;
    improvements.push(
      'Empezás con relleno ("hola", "bienvenidos"). Eliminá la introducción y arrancá con el dolor/promesa.',
    );
  }

  // Contraste explícito
  if (/\bpero\b|\bsin embargo\b|\bvs\b|\bversus\b|\bmientras\b/i.test(hook)) {
    score += 7;
    reasons.push('Tiene tensión narrativa (contraste)');
  }

  // Especificidad (palabras concretas vs abstractas)
  const concreteWords = ['días', 'meses', 'pesos', 'dólares', 'seguidores', 'ventas', 'reels', 'historias'];
  if (concreteWords.some((w) => hook.toLowerCase().includes(w))) {
    score += 5;
    reasons.push('Lenguaje concreto y específico');
  }

  score = Math.max(0, Math.min(100, score));

  return {
    hook,
    score,
    category: detectedCategory,
    reasons,
    improvements,
  };
};

// ── Generación masiva ────────────────────────────────────────────────────────

export interface HookGenerationRequest {
  topic: string;
  audience: string;
  format: ContentFormat;
  count: number;
  forbiddenWords?: string[];
  preferredCategories?: HookCategory[];
}

export interface GeneratedHook extends HookScore {
  templateId: string | null;
  emotionalDriver: HookTemplate['emotionalDriver'] | null;
}

const buildHookSystemPrompt = (brand: BrandProfile, request: HookGenerationRequest): string => {
  const forbidden = brand.voice.forbidden.length > 0 ? `Nunca uses: ${brand.voice.forbidden.join(', ')}.` : '';
  const userForbidden = request.forbiddenWords?.length ? `Tampoco uses: ${request.forbiddenWords.join(', ')}.` : '';
  return `Sos copywriter senior de Instagram especializado en hooks que detienen el scroll.
TONO: ${brand.voice.tone.join(', ')}.
${forbidden}
${userForbidden}

Reglas inquebrantables de un buen hook:
1. Máximo 90 caracteres.
2. Cero "hola/bienvenidos/hoy les voy a contar".
3. Empezar por: pregunta, número específico, contraste, error o stop.
4. Usar lenguaje concreto (números, plazos, cantidades).
5. Activar al menos un driver emocional: curiosidad, urgencia, identificación, controversia, aspiracional o miedo-perder.`;
};

export const generateHooks = async (brand: BrandProfile, request: HookGenerationRequest): Promise<GeneratedHook[]> => {
  const start = Date.now();
  log.info(`[HookLab] Generando ${request.count} hooks para "${request.topic}" (${request.format})`);

  const templates = HOOK_TEMPLATES.filter(
    (t) =>
      t.bestFor.includes(request.format) &&
      (!request.preferredCategories || request.preferredCategories.includes(t.category)),
  );

  const templateGuide = templates
    .slice(0, 6)
    .map((t) => `- ${t.category} (${t.emotionalDriver}): ${t.examples[0] ?? t.pattern}`)
    .join('\n');

  const prompt = `Generá ${request.count} hooks únicos para Instagram sobre este tema.

TEMA: ${request.topic}
AUDIENCIA: ${request.audience}
FORMATO: ${request.format}

VARIÁ entre estas categorías:
${templateGuide}

Reglas:
- Cada hook debe ser DISTINTO en estructura
- Mezclá categorías
- Sin saludos ni intros
- Apuntá a 40-85 caracteres por hook

JSON: { "hooks": ["hook 1", "hook 2", ...] }`;

  let hooks: string[] = [];
  try {
    const result = await routerAskJson<{ hooks: string[] }>(prompt, {
      taskType: 'copywriting',
      systemPrompt: buildHookSystemPrompt(brand, request),
      maxTokens: 2000,
    });
    hooks = result.hooks ?? [];
  } catch (err) {
    log.warn(`[HookLab] askJson falló, usando generateVariations: ${(err as Error).message}`);
    hooks = await generateVariations(
      `Hook de Instagram sobre "${request.topic}" para ${request.audience}, formato ${request.format}, máximo 90 caracteres, sin saludos.`,
      request.count,
      { taskType: 'copywriting' },
    );
  }

  const scored: GeneratedHook[] = hooks.map((h) => {
    const base = scoreHook(h);
    const matchedTemplate = HOOK_TEMPLATES.find((t) => t.category === base.category) ?? null;
    return {
      ...base,
      templateId: matchedTemplate?.id ?? null,
      emotionalDriver: matchedTemplate?.emotionalDriver ?? null,
    };
  });

  scored.sort((a, b) => b.score - a.score);
  log.info(
    `[HookLab] ${scored.length} hooks generados en ${Date.now() - start}ms. Top: "${scored[0]?.hook}" (${scored[0]?.score})`,
  );
  return scored;
};

export const getBestHook = async (
  brand: BrandProfile,
  topic: string,
  format: ContentFormat,
): Promise<GeneratedHook> => {
  const hooks = await generateHooks(brand, {
    topic,
    audience: brand.audience.description,
    format,
    count: 8,
  });
  return (
    hooks[0] ?? {
      hook: topic,
      score: 0,
      category: null,
      reasons: [],
      improvements: [],
      templateId: null,
      emotionalDriver: null,
    }
  );
};

// ── Aprendizaje desde performance histórica ──────────────────────────────────

export interface HookPerformanceInsight {
  bestCategories: Array<{ category: HookCategory; avgScore: number; count: number }>;
  topHooks: Array<{ hook: string; actualScore: number; format: ContentFormat }>;
  patternsToRepeat: string[];
  patternsToAvoid: string[];
}

export const analyzeHookPerformance = async (): Promise<HookPerformanceInsight> => {
  const topPerformers = getTopPerformers(undefined, 30);
  if (topPerformers.length < 5) {
    return {
      bestCategories: [],
      topHooks: [],
      patternsToRepeat: ['Sin datos suficientes — aún estás construyendo el dataset'],
      patternsToAvoid: [],
    };
  }

  // Clasificar cada hook real en una categoría
  const byCategory = new Map<HookCategory, { total: number; count: number }>();
  for (const post of topPerformers) {
    const scored = scoreHook(post.hookText);
    if (scored.category) {
      const cur = byCategory.get(scored.category) ?? { total: 0, count: 0 };
      byCategory.set(scored.category, { total: cur.total + post.actualScore, count: cur.count + 1 });
    }
  }

  const bestCategories = [...byCategory.entries()]
    .map(([category, d]) => ({ category, avgScore: d.total / d.count, count: d.count }))
    .filter((c) => c.count >= 2)
    .sort((a, b) => b.avgScore - a.avgScore);

  const topHooks = topPerformers.slice(0, 8).map((p) => ({
    hook: p.hookText,
    actualScore: p.actualScore,
    format: p.format,
  }));

  // Pedir un análisis cualitativo
  const sample = topHooks.map((h) => `- "${h.hook}" (score ${h.actualScore})`).join('\n');
  const analysisPrompt = `Estos son los 8 hooks de mejor performance histórico de una cuenta de Instagram:

${sample}

Identificá:
1. 3-4 patrones repetitivos que la cuenta debería SEGUIR usando
2. 2-3 patrones que aparentemente no le funcionan y debería evitar

Sé específico (estructura, longitud, palabras, emociones).

JSON: { "patternsToRepeat": ["..."], "patternsToAvoid": ["..."] }`;

  const patterns = await routerAskJson<{ patternsToRepeat: string[]; patternsToAvoid: string[] }>(analysisPrompt, {
    taskType: 'analysis',
    maxTokens: 1200,
  }).catch(() => ({ patternsToRepeat: [], patternsToAvoid: [] }));

  return {
    bestCategories,
    topHooks,
    patternsToRepeat: patterns.patternsToRepeat,
    patternsToAvoid: patterns.patternsToAvoid,
  };
};

// ── A/B real con 2-3 candidatos ──────────────────────────────────────────────

export const pickHookForAB = async (
  brand: BrandProfile,
  topic: string,
  format: ContentFormat,
): Promise<{ winner: GeneratedHook; runnerUps: GeneratedHook[] }> => {
  const hooks = await generateHooks(brand, {
    topic,
    audience: brand.audience.description,
    format,
    count: 6,
  });
  const insight = await analyzeHookPerformance();

  // Boost si coincide con categorías que históricamente funcionan en esta cuenta
  const winningCategories = new Set(insight.bestCategories.slice(0, 3).map((c) => c.category));
  for (const h of hooks) {
    if (h.category && winningCategories.has(h.category)) h.score += 5;
  }
  hooks.sort((a, b) => b.score - a.score);

  return { winner: hooks[0]!, runnerUps: hooks.slice(1, 4) };
};

// ── Reescribir hook débil ────────────────────────────────────────────────────

export const improveHook = async (
  originalHook: string,
  brand: BrandProfile,
  format: ContentFormat,
): Promise<GeneratedHook> => {
  const initialScore = scoreHook(originalHook);
  if (initialScore.score >= 75 && initialScore.improvements.length === 0) {
    return { ...initialScore, templateId: null, emotionalDriver: null };
  }

  const prompt = `Reescribí este hook de Instagram aplicando estas correcciones (una por una):
${initialScore.improvements.map((i, n) => `${n + 1}. ${i}`).join('\n')}

Hook original: "${originalHook}"
Tono de marca: ${brand.voice.tone.join(', ')}
Audiencia: ${brand.audience.description}
Formato: ${format}

Devolvé SOLO el nuevo hook, sin explicaciones, máximo 90 caracteres.`;

  const result = await routerAsk(prompt, { taskType: 'copywriting', maxTokens: 200 });
  const improved = result.text.trim().replace(/^["']|["']$/g, '');
  const newScore = scoreHook(improved);

  return { ...newScore, templateId: null, emotionalDriver: null };
};
