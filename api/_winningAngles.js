/**
 * Winning Angles Engine — ángulos ganadores de comunicación.
 *
 * Un "hook" (ver _hookLab.js) optimiza ATENCIÓN (¿para quién es esto?).
 * Un "ángulo ganador" optimiza CALIFICACIÓN (¿de quién es esto?) — el tema/mensaje
 * dentro del contenido que filtra y atrae compradores reales, no likes vacíos.
 *
 * Framework (biblioteca de 36 libros, ver CLAUDE.md):
 *   - Schwartz (Breakthrough Advertising): 5 niveles de consciencia — el ángulo
 *     debe calzar el nivel real de la audiencia, no vender solución a quien
 *     ni sabe que tiene el problema.
 *   - Miller (StoryBrand): problema en 3 capas — externo (barato de calificar,
 *     alto alcance) → interno (medio) → filosófico (caro de calificar, altísima
 *     intención). Ángulos que tocan capa interna/filosófica filtran mejor.
 *   - Fitzpatrick (Mom Test): ángulo debe surfacear comportamiento/dolor real,
 *     no pescar cumplidos ("¿te gustaría esto?" es ángulo de vanidad).
 *   - Brunson (Expert Secrets): Big Domino — un ángulo por creencia falsa
 *     (vehicle / internal / external), nunca mezclar varias en un post.
 *   - Godin (Esto es marketing): Minimum Viable Market — el ángulo debe excluir
 *     a propósito a quien no es el comprador, no maximizar alcance.
 *   - Dunford (Obviously Awesome): ángulo se arma contra la alternativa real
 *     que usa el prospecto hoy, no contra un rival genérico.
 *
 * Reusa NICHE_PROFILES_DEEP (audiencePains, riskTopics, monetization) — no
 * duplica investigación de nicho, sólo la traduce a mensaje calificador.
 *
 * 100% heurístico determinístico. LLM opcional sólo para redactar el texto final.
 */

import { NICHE_PROFILES_DEEP } from './_nicheResearchAgent.js';
import { askLLMJson } from './_llm.js';
import * as store from './_store.js';

// ── Niveles de consciencia (Schwartz) — determina qué categorías de ángulo aplican ──
export const AWARENESS_LEVELS = [
  'unaware', // no sabe que tiene el problema
  'problem-aware', // sabe el problema, no conoce soluciones
  'solution-aware', // conoce que existen soluciones, no la tuya
  'product-aware', // te conoce, no decidió
  'most-aware', // sólo espera la oferta/precio
];

// ── Catálogo de categorías de ángulo, cada una con su tradeoff explícito ──
// qualifiedLeadScore: 0-100, qué tan bien filtra compradores reales (no vanity).
// reachTradeoff: 0-100, qué tan amplio es el alcance esperado (inverso aprox al score).
export const ANGLE_CATEGORIES = [
  {
    id: 'vanity-entertainment',
    label: 'Entretenimiento / vanidad',
    problemLevel: 'none',
    awarenessFit: ['unaware'],
    qualifiedLeadScore: 15,
    reachTradeoff: 95,
    whyQualifies: 'No filtra — cualquiera puede consumirlo sin tener el problema ni el dinero.',
    whenToUse: 'Top-of-funnel puro: awareness de marca, nunca como única estrategia.',
    warning: 'Si es >30% del contenido, atrae audiencia que nunca compra (Godin: no es tu Minimum Viable Market).',
  },
  {
    id: 'pain-agitation-external',
    label: 'Dolor externo (síntoma visible)',
    problemLevel: 'external',
    awarenessFit: ['unaware', 'problem-aware'],
    qualifiedLeadScore: 45,
    reachTradeoff: 75,
    whyQualifies: 'Atrae a quien tiene el síntoma, pero no distingue curiosos de compradores.',
    whenToUse: 'Abrir el funnel — nombrar el síntoma que la audiencia ya siente.',
    warning: 'Solo, no convierte. Necesita seguimiento con ángulo interno/mecanismo.',
  },
  {
    id: 'identity-internal',
    label: 'Identidad / en quién se convierte (problema interno)',
    problemLevel: 'internal',
    awarenessFit: ['problem-aware', 'solution-aware'],
    qualifiedLeadScore: 75,
    reachTradeoff: 45,
    whyQualifies: 'Habla de QUIÉN es la persona con el problema, no sólo el síntoma. Filtra por auto-identificación tribal (Godin: "people like us do things like this").',
    whenToUse: 'Cuando ya validaste el dolor externo — mueve de curioso a identificado.',
    warning: 'Requiere conocer psicografía real del ICP, no demografía.',
  },
  {
    id: 'mechanism-howitworks',
    label: 'Mecanismo único (cómo funciona)',
    problemLevel: 'external',
    awarenessFit: ['solution-aware', 'product-aware'],
    qualifiedLeadScore: 82,
    reachTradeoff: 35,
    whyQualifies: 'Se auto-selecciona: sólo quien ya busca una solución específica presta atención a un mecanismo. Hace irrelevante la competencia (Schwartz: Unique Mechanism).',
    whenToUse: 'Audiencia solution-aware que compara opciones.',
    warning: 'Bajo alcance esperado — normal, no es un bug del ángulo.',
  },
  {
    id: 'belief-shift',
    verbal: null,
    label: 'Ruptura de creencia falsa (Big Domino)',
    problemLevel: 'internal',
    awarenessFit: ['problem-aware', 'solution-aware'],
    qualifiedLeadScore: 88,
    reachTradeoff: 40,
    whyQualifies: 'Ataca UNA creencia limitante específica (vehicle/internal/external — Brunson). Quien la sostenía y la ve caer queda desbloqueado para comprar.',
    whenToUse: 'Cuando identificaste la objeción #1 real (Mom Test: extraída de comportamiento, no encuesta).',
    warning: 'Nunca mezclar 2+ creencias en un mismo post — diluye el domino.',
  },
  {
    id: 'cost-of-inaction',
    label: 'Costo de no actuar (pérdida, capa filosófica)',
    problemLevel: 'philosophical',
    awarenessFit: ['solution-aware', 'product-aware', 'most-aware'],
    qualifiedLeadScore: 85,
    reachTradeoff: 30,
    whyQualifies: 'Pérdida duele ~2x más que ganar satisface (Kahneman). Sólo resuena en quien ya reconoce que el problema tiene precio real.',
    whenToUse: 'Antes del CTA de conversión — empuja la decisión, no abre el funnel.',
    warning: 'Sin dolor externo previo validado, suena a miedo genérico — no funciona en unaware.',
  },
  {
    id: 'objection-preemption',
    label: 'Objeción específica resuelta antes de que la digan',
    problemLevel: 'external',
    awarenessFit: ['product-aware', 'most-aware'],
    qualifiedLeadScore: 90,
    reachTradeoff: 20,
    whyQualifies: 'Máxima calificación — sólo quien ya está evaluando comprarte se detiene en una objeción de precio/tiempo/riesgo.',
    whenToUse: 'Bottom-of-funnel, cerca de la oferta o el DM.',
    warning: 'Alcance bajo es esperado y correcto — este ángulo NO es para awareness.',
  },
  {
    id: 'specific-social-proof',
    label: 'Prueba social con números específicos',
    problemLevel: 'external',
    awarenessFit: ['solution-aware', 'product-aware'],
    qualifiedLeadScore: 70,
    reachTradeoff: 55,
    whyQualifies: 'Números específicos > genéricos (Schwartz, Cialdini). Filtra mejor que testimonio vago porque el prospecto se compara con el caso.',
    whenToUse: 'Medio de funnel — refuerza que la solución funciona para "alguien como yo".',
    warning: 'Debe ser un caso real y verificable — número inventado rompe confianza (Godin: confianza es el activo más escaso).',
  },
  {
    id: 'contrarian-authority',
    label: 'Postura contraria con autoridad (no clickbait vacío)',
    problemLevel: 'internal',
    awarenessFit: ['problem-aware', 'solution-aware'],
    qualifiedLeadScore: 65,
    reachTradeoff: 65,
    whyQualifies: 'Buen alcance porque genera fricción, pero sólo retiene a quien realmente le importa el tema (no scroll pasivo).',
    whenToUse: 'Construcción de autoridad + diferenciación de posicionamiento (Dunford: contra alternativa real).',
    warning: 'Sin sustento real detrás, es sólo ruido — necesita mecanismo o dato que la respalde.',
  },
];

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

/**
 * Scorea un ángulo dado su categoría + contexto (nivel de consciencia real de la
 * audiencia objetivo + si hay oferta de precio alto detrás).
 */
export const scoreAngleQualification = ({
  categoryId,
  awarenessLevel = 'problem-aware',
  offerPriceTier = 'medium', // low | medium | high | premium
} = {}) => {
  const cat = ANGLE_CATEGORIES.find((c) => c.id === categoryId);
  if (!cat) {
    return { ok: false, error: `categoría desconocida: ${categoryId}`, validCategories: ANGLE_CATEGORIES.map((c) => c.id) };
  }

  let score = cat.qualifiedLeadScore;
  const notes = [];

  const fitsAwareness = cat.awarenessFit.includes(awarenessLevel);
  if (!fitsAwareness) {
    score = clamp(score - 30, 5, 100);
    notes.push(
      `Ángulo "${cat.label}" no calza bien con audiencia ${awarenessLevel} (fit real: ${cat.awarenessFit.join(', ')}) — penalizado.`,
    );
  } else {
    notes.push(`Calza con audiencia ${awarenessLevel}.`);
  }

  // Oferta premium/high exige ángulos de mayor calificación (objection/mechanism/belief).
  const highTicketFit = ['objection-preemption', 'mechanism-howitworks', 'belief-shift', 'cost-of-inaction'];
  if ((offerPriceTier === 'high' || offerPriceTier === 'premium') && !highTicketFit.includes(categoryId)) {
    score = clamp(score - 15, 5, 100);
    notes.push('Oferta de ticket alto necesita ángulos de mayor calificación (mecanismo/objeción/belief-shift/costo de inacción).');
  }

  return {
    ok: true,
    categoryId,
    label: cat.label,
    qualifiedLeadScore: score,
    reachTradeoff: cat.reachTradeoff,
    problemLevel: cat.problemLevel,
    fitsAwareness,
    notes,
    warning: cat.warning,
    verdict:
      score >= 75
        ? 'Alta calificación — pocos leads pero compradores reales.'
        : score >= 45
          ? 'Calificación media — mezcla curiosos y compradores, necesita seguimiento.'
          : 'Baja calificación — sólo úsalo para abrir funnel, nunca para convertir.',
  };
};

const angleTopicHeuristic = (categoryId, niche, profile) => {
  const pains = profile.audiencePains || [];
  const gaps = profile.contentGaps || [];
  const underserved = profile.underservedAngles || [];
  const monetization = profile.monetization?.[0] || 'tu oferta';

  const byCategory = {
    'vanity-entertainment': `Tendencia divertida de ${niche} (sin mensaje calificador — sólo para awareness)`,
    'pain-agitation-external': `El síntoma que todos en ${niche} sienten: "${pains[0] || 'esto no funciona como esperaba'}"`,
    'identity-internal': `No sos [etiqueta genérica] en ${niche} — sos [identidad real que tu ICP quiere ser]`,
    'mechanism-howitworks': `Por qué [tu método específico] resuelve ${pains[1] || 'el problema de fondo'} y las alternativas genéricas no`,
    'belief-shift': `La creencia falsa #1 que frena resultados en ${niche}: "${underserved[0] || 'creencia limitante común'}"`,
    'cost-of-inaction': `Lo que cuesta (tiempo/plata/oportunidad) seguir sin resolver ${pains[0] || 'esto'} en ${niche}`,
    'objection-preemption': `"Es muy caro / no tengo tiempo / ya probé algo así" — por qué no aplica acá`,
    'specific-social-proof': `Caso real con números: cómo alguien de ${niche} pasó de [antes] a [después] en [tiempo]`,
    'contrarian-authority': `Lo opuesto a lo que enseña la mayoría en ${niche}, con la razón técnica detrás: ${gaps[0] || 'gap de contenido real'}`,
  };
  return byCategory[categoryId] || `Ángulo sobre ${niche} relacionado a ${monetization}`;
};

/**
 * Genera set de ángulos ganadores rankeados por calificación, para un nicho/ICP/oferta dados.
 */
export const generateWinningAngles = async ({
  niche = '',
  nicheKey = '',
  awarenessLevel = 'problem-aware',
  offerPriceTier = 'medium',
  count = 6,
  includeVanity = true,
  llm = false,
  user = null,
} = {}) => {
  const key = nicheKey || String(niche).toLowerCase().replace(/[^a-z0-9-]/g, '') || 'general';
  const profile = NICHE_PROFILES_DEEP[key] || NICHE_PROFILES_DEEP.general || { audiencePains: [], contentGaps: [], underservedAngles: [], monetization: [] };

  let categories = ANGLE_CATEGORIES;
  if (!includeVanity) categories = categories.filter((c) => c.id !== 'vanity-entertainment');

  const scored = categories.map((cat) => {
    const sc = scoreAngleQualification({ categoryId: cat.id, awarenessLevel, offerPriceTier });
    return {
      categoryId: cat.id,
      label: cat.label,
      problemLevel: cat.problemLevel,
      topic: angleTopicHeuristic(cat.id, niche, profile),
      qualifiedLeadScore: sc.qualifiedLeadScore,
      reachTradeoff: cat.reachTradeoff,
      whyQualifies: cat.whyQualifies,
      whenToUse: cat.whenToUse,
      warning: cat.warning,
      verdict: sc.verdict,
      fitsAwareness: sc.fitsAwareness,
    };
  });

  scored.sort((a, b) => b.qualifiedLeadScore - a.qualifiedLeadScore);
  let top = scored.slice(0, count);

  if (llm && top.length) {
    const prompt = `Redactá el "topic" de estos ángulos de contenido para el nicho "${niche}" de forma concreta y específica (no genérica), en español LATAM. Mantené la categoría y el nivel de calificación tal cual.
Ángulos: ${JSON.stringify(top.map((t) => ({ categoryId: t.categoryId, label: t.label, currentTopic: t.topic })))}.
Devolvé JSON: {"angles":[{"categoryId":"...","topic":"..."}]}.`;
    try {
      const out = await askLLMJson(prompt, { user, maxTokens: 600, temperature: 0.7 });
      if (out?.angles?.length) {
        const byId = new Map(out.angles.map((a) => [a.categoryId, a.topic]));
        top = top.map((t) => (byId.has(t.categoryId) ? { ...t, topic: byId.get(t.categoryId), refinedByLlm: true } : t));
      }
    } catch {
      /* heurístico ya está */
    }
  }

  const result = {
    niche,
    nicheKey: key,
    awarenessLevel,
    offerPriceTier,
    angles: top,
    funnelMix: {
      topOfFunnel: top.filter((a) => a.qualifiedLeadScore < 50).length,
      midFunnel: top.filter((a) => a.qualifiedLeadScore >= 50 && a.qualifiedLeadScore < 75).length,
      bottomFunnel: top.filter((a) => a.qualifiedLeadScore >= 75).length,
      recommendation:
        'Mezcla saludable: ~30% top-of-funnel (alcance) + ~40% mid-funnel (calificación) + ~30% bottom-funnel (conversión). Nunca 100% vanity.',
    },
    generatedBy: top.some((t) => t.refinedByLlm) ? 'llm+heuristic' : 'heuristic',
    generatedAt: new Date().toISOString(),
  };

  return result;
};

const json = (res, code, body) => {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
};

export const handleWinningAngles = async (req, res, path, m, body, ctx = {}) => {
  const user = ctx.user || null;
  const userId = user?.id || null;

  if (path === '/api/angles/generate' && m === 'POST') {
    const params = body || {};
    const result = await generateWinningAngles({ ...params, user });
    if (userId) {
      try {
        await store.setUser(userId, 'angles:winning:latest', result);
        await store.lpushUser(userId, 'angles:winning:history', {
          at: Date.now(),
          niche: result.niche,
          awarenessLevel: result.awarenessLevel,
        });
        await store.ltrim(store.userKey(userId, 'angles:winning:history'), 0, 19);
      } catch {
        /* best-effort */
      }
    }
    json(res, 200, result);
    return true;
  }

  if (path === '/api/angles/score' && m === 'POST') {
    const { categoryId, awarenessLevel, offerPriceTier } = body || {};
    if (!categoryId) {
      json(res, 400, { error: 'categoryId requerido' });
      return true;
    }
    json(res, 200, scoreAngleQualification({ categoryId, awarenessLevel, offerPriceTier }));
    return true;
  }

  if (path === '/api/angles/library' && m === 'GET') {
    res.setHeader('cache-control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({
        awarenessLevels: AWARENESS_LEVELS,
        count: ANGLE_CATEGORIES.length,
        categories: ANGLE_CATEGORIES,
      }),
    );
    return true;
  }

  if (path === '/api/angles/latest' && m === 'GET' && userId) {
    const latest = await store.getUser(userId, 'angles:winning:latest');
    json(res, 200, latest || { empty: true });
    return true;
  }

  return false;
};
