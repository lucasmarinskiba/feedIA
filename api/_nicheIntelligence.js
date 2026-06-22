/**
 * Niche Intelligence Engine — estudio profundo del nicho/audiencia por cuenta.
 *
 * Corre una vez por cuenta (cacheado 7 días en KV) y se inyecta automáticamente
 * en TODAS las generaciones posteriores (autopilot, brújula, brand-studio).
 *
 * Pipeline (chain of reasoning):
 *   1. detectar nicho real (más allá del label del usuario)
 *   2. perfilar audiencia (psicografía, journey, ICP)
 *   3. mapear competencia (top, mid, underdog — qué hace cada uno)
 *   4. identificar oportunidades (gaps de contenido, ángulos vírgenes)
 *   5. sintetizar con role chain (Creative Director + Strategist + Trend Forecaster)
 *
 * $0/mes: 2-3 LLM calls por intelligence run, cacheado 7 días.
 * GET /api/intelligence/{accountId} → leer caché
 * POST /api/intelligence/run → re-correr análisis profundo
 */

import * as store from './_store.js';
import { askLLMJson } from './_llm.js';
import { runAndromeda } from './_andromeda.js';
import { buildPriming, buildRoleChainPriming, detectNiche, NICHE_VOICE } from './_promptLibrary.js';

const CACHE_TTL_SEC = 7 * 24 * 3600;
const cacheKey = (scope, accountId) => `feedia:intel:${scope || 'anon'}:${accountId}`;

// ── PASO 1: detección profunda de nicho ─────────────────────────────────────
const deepNicheDetection = async ({ topic, accountHandle, brandNiche }) => {
  const baseGuess = detectNiche(brandNiche || topic);
  const voice = NICHE_VOICE[baseGuess] || NICHE_VOICE.general;
  const prompt = `Análisis de nicho experto.
Cuenta: ${accountHandle || 'sin handle'}. Tema reciente: "${topic || 'no specified'}". Nicho declarado: ${brandNiche || 'no specified'}.

Devolvé SOLO JSON:
{
  "primaryNiche": "nicho principal (1-2 palabras)",
  "subNiches": ["sub-nicho 1", "sub-nicho 2", "sub-nicho 3"],
  "adjacentNiches": ["nicho adyacente que comparte audiencia"],
  "marketSizeEst": "pequeño|mediano|grande|masivo",
  "saturationLevel": "bajo|medio|alto|muy alto",
  "monetizationPotential": "bajo|medio|alto|premium",
  "languageContext": "ES-LATAM|ES-España|multilenguaje",
  "uniqueAngleHint": "1 oración con el ángulo único más prometedor para diferenciarse"
}`;
  const llm = await askLLMJson(prompt).catch(() => null);
  return {
    primaryNiche: llm?.primaryNiche || baseGuess,
    subNiches: llm?.subNiches || [],
    adjacentNiches: llm?.adjacentNiches || [],
    marketSizeEst: llm?.marketSizeEst || 'mediano',
    saturationLevel: llm?.saturationLevel || 'medio',
    monetizationPotential: llm?.monetizationPotential || 'medio',
    languageContext: llm?.languageContext || 'ES-LATAM',
    uniqueAngleHint: llm?.uniqueAngleHint || `Combinar ${baseGuess} con storytelling personal y datos reales`,
    builtinVoice: { vocab: voice.vocab, metrics: voice.metrics, pains: voice.pains },
  };
};

// ── PASO 2: perfil profundo de audiencia (psicografía + journey) ────────────
const deepAudienceProfile = async ({ niche, currentGoal, accountHandle }) => {
  const voice = NICHE_VOICE[niche] || NICHE_VOICE.general;
  const prompt = `Investigación profunda de la AUDIENCIA real de un creador del nicho "${niche}" en Instagram/TikTok LATAM.
Objetivo del creador: ${currentGoal}. Cuenta: ${accountHandle || 'general'}.
Dolores típicos del nicho: ${voice.pains.join(', ')}.

Devolvé SOLO JSON con investigación rigurosa (no genérica):
{
  "icp": {
    "ageRange": "rango edad principal",
    "gender": "femenino|masculino|mixto",
    "geo": ["país1","país2","país3"],
    "income": "bajo|medio|alto|mixto",
    "lifestyle": "1 oración",
    "education": "secundario|universitario|posgrado|mixto"
  },
  "psychographics": {
    "values": ["valor1","valor2","valor3"],
    "fears": ["miedo1","miedo2","miedo3"],
    "aspirations": ["aspiración1","aspiración2","aspiración3"],
    "frustrations": ["frustración real diaria","otra frustración","otra"]
  },
  "dailyJourney": {
    "morning": "qué hace y qué consume en la mañana",
    "midday": "qué busca al mediodía",
    "evening": "qué consume en la noche y por qué",
    "weekend": "comportamiento de finde"
  },
  "contentDiet": {
    "follows": ["tipo de creador 1", "tipo 2", "tipo 3"],
    "saves": ["qué guarda y por qué"],
    "shares": ["qué comparte y por qué"]
  },
  "decisionTriggers": ["qué hace que SÍ compre/siga/interactúe", "trigger 2", "trigger 3"],
  "objections": ["objeción real principal", "objeción 2", "objeción 3"],
  "tribeMarkers": ["jerga/símbolos/hashtags que usa la tribu para identificarse"]
}`;
  const llm = await askLLMJson(prompt).catch(() => null);
  return (
    llm || {
      icp: {
        ageRange: '25-40',
        gender: 'mixto',
        geo: ['Argentina', 'México', 'Colombia'],
        income: 'medio',
        lifestyle: 'urbano profesional',
        education: 'universitario',
      },
      psychographics: {
        values: ['crecimiento'],
        fears: ['estancarse'],
        aspirations: ['libertad'],
        frustrations: voice.pains,
      },
      dailyJourney: {
        morning: 'scroll rápido',
        midday: 'búsqueda activa',
        evening: 'consumo largo',
        weekend: 'inspiración',
      },
      contentDiet: { follows: ['referentes del nicho'], saves: ['guías prácticas'], shares: ['contenido validador'] },
      decisionTriggers: ['prueba social', 'datos concretos', 'urgencia real'],
      objections: ['no tengo tiempo', 'no es mi caso', 'ya probé y no funcionó'],
      tribeMarkers: [`#${niche}`, 'jerga del nicho'],
    }
  );
};

// ── PASO 3: mapa competitivo (top + mid + underdog + gaps) ──────────────────
const competitiveMap = async ({ niche, accountHandle }) => {
  const prompt = `Mapa competitivo del nicho "${niche}" en Instagram/TikTok LATAM.
Devolvé SOLO JSON honesto (referencias genéricas si no sabés handles exactos):
{
  "topPlayers": [
    {"archetype":"el de millones","whyWins":"qué hace bien","weakness":"qué le falta"},
    {"archetype":"el educador serio","whyWins":"...","weakness":"..."},
    {"archetype":"el entretenedor viral","whyWins":"...","weakness":"..."}
  ],
  "midTier": [
    {"archetype":"perfil tipo","strategy":"qué hace para crecer","ceiling":"por qué no escala más"}
  ],
  "underdogs": [
    {"archetype":"perfil emergente","disruption":"qué hace diferente","threat":"por qué puede explotar"}
  ],
  "contentGaps": [
    "ángulo que NADIE cubre bien",
    "tipo de contenido subutilizado",
    "tema que tiene demanda pero poca oferta"
  ],
  "saturatedTopics": ["temas agotados que ya no funcionan"],
  "emergingTopics": ["temas que están subiendo en interés"],
  "differentiationPlay": "1 jugada concreta para diferenciarse en este nicho ahora"
}`;
  const llm = await askLLMJson(prompt).catch(() => null);
  return (
    llm || {
      topPlayers: [],
      midTier: [],
      underdogs: [],
      contentGaps: ['contenido honesto sin filtros', 'datos reales con números', 'fracasos documentados'],
      saturatedTopics: ['motivación genérica', 'tips obvios'],
      emergingTopics: ['casos reales con datos', 'detrás de escena auténtico'],
      differentiationPlay: 'Combinar autoridad técnica + storytelling personal + transparencia de números',
    }
  );
};

// ── PASO 4: oportunidades + estrategia ──────────────────────────────────────
const opportunityScan = async ({ niche, audience, competitive, goal }) => {
  // Usa role chain: Creative Director + Strategist + Trend Forecaster
  const rolesChain = buildRoleChainPriming(['ai-creative-director', 'social-strategist', 'trend-forecaster'], {
    context: `Nicho: ${niche}. Audiencia: ${JSON.stringify(audience?.psychographics || {}).slice(0, 200)}. Gaps: ${(competitive?.contentGaps || []).join(', ')}. Goal: ${goal}.`,
  });
  const prompt = `${rolesChain.priming}

Devolvé SOLO JSON con el plan estratégico unificado:
{
  "northStar": "1 frase que sintetiza la estrategia",
  "positioningStatement": "Cómo posicionar la cuenta para ganar en este nicho (1 oración)",
  "top3Opportunities": [
    {"opportunity":"oportunidad concreta","why":"por qué ahora","action":"qué hacer esta semana"},
    {"opportunity":"...","why":"...","action":"..."},
    {"opportunity":"...","why":"...","action":"..."}
  ],
  "contentPillars": [
    {"pillar":"nombre del pilar","%mix":"% del contenido","examples":["ejemplo 1","ejemplo 2"]}
  ],
  "formatMix": {"reels":"%","carouseles":"%","historias":"%","posts":"%"},
  "cadence": {"posts_semana": "N", "stories_dia":"N", "calidad_vs_cantidad":"explicación"},
  "kpis_30dias": ["KPI 1", "KPI 2", "KPI 3"],
  "redFlags": ["lo que NO hacer en este nicho"],
  "quickWins": ["acción inmediata 1", "acción 2"]
}`;
  const llm = await askLLMJson(prompt).catch(() => null);
  return (
    llm || {
      northStar: `Educar y entretener en ${niche} con autoridad y autenticidad`,
      positioningStatement: `El creador que combina conocimiento técnico real con storytelling honesto`,
      top3Opportunities: [],
      contentPillars: [],
      formatMix: { reels: '40%', carruseles: '35%', historias: '20%', posts: '5%' },
      cadence: { posts_semana: '5-7', stories_dia: '2-4', calidad_vs_cantidad: 'calidad sostenida sobre cantidad' },
      kpis_30dias: ['Engagement rate', 'Saves', 'Followers nuevos'],
      redFlags: [],
      quickWins: [],
    }
  );
};

// ── ORQUESTADOR principal ────────────────────────────────────────────────────
export const runNicheIntelligence = async ({
  topic = '',
  accountId = '',
  accountHandle = '',
  brandNiche = '',
  goal = 'engagement',
  scope = 'anon',
  force = false,
} = {}) => {
  const startedAt = Date.now();
  const key = cacheKey(scope, accountId || accountHandle || 'general');

  // Cache hit (si no forzamos re-corrida)
  if (!force) {
    const cached = await store.get(key).catch(() => null);
    if (cached?.builtAt && Date.now() - new Date(cached.builtAt).getTime() < CACHE_TTL_SEC * 1000) {
      return { ...cached, fromCache: true };
    }
  }

  // Pipeline en paralelo donde sea posible
  const nicheData = await deepNicheDetection({ topic, accountHandle, brandNiche });
  const [audience, competitive, andromeda] = await Promise.all([
    deepAudienceProfile({ niche: nicheData.primaryNiche, currentGoal: goal, accountHandle }).catch(() => null),
    competitiveMap({ niche: nicheData.primaryNiche, accountHandle }).catch(() => null),
    runAndromeda({ topic, niche: nicheData.primaryNiche, goal, platform: 'instagram' }).catch(() => null),
  ]);

  const opportunities = await opportunityScan({
    niche: nicheData.primaryNiche,
    audience,
    competitive,
    goal,
  }).catch(() => null);

  const intel = {
    builtAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    accountId,
    accountHandle,
    niche: nicheData,
    audience,
    competitive,
    opportunities,
    bestCreativeCombo: andromeda?.featured?.[0] || null,
    summary: {
      mainAngle: opportunities?.positioningStatement || nicheData.uniqueAngleHint,
      topOpportunity: opportunities?.top3Opportunities?.[0]?.opportunity || '',
      keyAudienceTrigger: audience?.decisionTriggers?.[0] || '',
      mainContentGap: competitive?.contentGaps?.[0] || '',
      differentiationPlay: competitive?.differentiationPlay || '',
    },
  };

  // Guardar en KV
  await store.set(key, intel).catch(() => {});
  await store.expire(key, CACHE_TTL_SEC).catch(() => {});

  return intel;
};

// ── Inject helper: lee intel cacheada y devuelve priming compacto ────────────
// Para usar en autopilot/brain → "system priming" con la inteligencia de la cuenta
// Lee la intel raw del KV (con summary + winningArchetype del feedback loop si existe)
export const loadIntelligenceRaw = async ({ scope = 'anon', accountId = '', accountHandle = '' } = {}) => {
  const key = cacheKey(scope, accountId || accountHandle || 'general');
  try {
    return await store.get(key);
  } catch {
    return null;
  }
};

export const loadIntelligencePriming = async ({ scope = 'anon', accountId = '', accountHandle = '' } = {}) => {
  const key = cacheKey(scope, accountId || accountHandle || 'general');
  const intel = await store.get(key).catch(() => null);
  if (!intel?.summary) return '';
  return `[INTELIGENCIA DE LA CUENTA — analizada el ${intel.builtAt}]
Nicho: ${intel.niche?.primaryNiche || ''} (saturación ${intel.niche?.saturationLevel || ''}, monetización ${intel.niche?.monetizationPotential || ''}).
Posicionamiento: ${intel.summary.mainAngle}.
Trigger #1 audiencia: ${intel.summary.keyAudienceTrigger}.
Gap de contenido #1: ${intel.summary.mainContentGap}.
Jugada de diferenciación: ${intel.summary.differentiationPlay}.
${intel.opportunities?.top3Opportunities?.[0] ? `Oportunidad top: ${intel.opportunities.top3Opportunities[0].opportunity}` : ''}
${intel.opportunities?.redFlags?.length ? `NO HACER: ${intel.opportunities.redFlags.slice(0, 2).join(', ')}` : ''}`;
};

// ── HTTP ──────────────────────────────────────────────────────────────────────
export const handleNicheIntelligence = async (req, res, path, m, body, ctx = {}) => {
  const scope = ctx.userId || 'anon';
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };

  if (path === '/api/intelligence/run' && m === 'POST') {
    try {
      const intel = await runNicheIntelligence({
        topic: body?.topic || '',
        accountId: body?.accountId || '',
        accountHandle: body?.accountHandle || body?.accountId || '',
        brandNiche: body?.brandNiche || body?.niche || '',
        goal: body?.goal || 'engagement',
        scope,
        force: Boolean(body?.force),
      });
      return json(200, { ok: true, ...intel });
    } catch (e) {
      return json(500, { ok: false, error: String(e?.message || e).slice(0, 300) });
    }
  }

  if (path.startsWith('/api/intelligence/') && m === 'GET') {
    const id = path.split('/').pop();
    const intel = await store.get(cacheKey(scope, id)).catch(() => null);
    if (!intel)
      return json(404, { ok: false, error: 'no-intelligence', message: 'Corré /api/intelligence/run primero.' });
    return json(200, { ok: true, ...intel });
  }

  return false;
};
