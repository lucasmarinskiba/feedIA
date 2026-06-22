/**
 * Niche Research Agent — análisis profundo de nicho para TikTok/Instagram.
 *
 * Extiende los 8 NICHE_PATTERNS de _growthIntelligence a 20 nichos con:
 *   - topPlayersHint (referencias sin garantizar handles vigentes)
 *   - contentGaps (qué falta en el nicho)
 *   - underservedAngles (ángulos no explotados)
 *   - audiencePains
 *
 * LIMITACIÓN: no hay web search real. Catálogo + razonamiento LLM opcional.
 * No inventa handles ni datos verificables — siempre devuelve `topPlayersHint` como sugerencia.
 *
 * Reusa: AUDIENCE_PSYCHOGRAPHY (heurístico replicado para evitar import cíclico).
 */

import { askLLMJson } from './_llm.js';
import * as store from './_store.js';

const DAY = 86400;

export const NICHE_PROFILES_DEEP = {
  'marketing-digital': {
    topPlayersHint: ['@garyvee', '@neilpatel', '@chasedimond'],
    contentPillars: ['tactics', 'case-studies', 'data-insights', 'tools-stack'],
    contentGaps: ['casos reales de PYMES Latam', 'comparativas honestas tools 2026', 'fallos públicos + lecciones'],
    underservedAngles: [
      'agencia desde adentro (POV)',
      'micro-rituales diarios',
      'tareas que se pueden automatizar HOY',
    ],
    audiencePains: [
      'no consigo leads',
      'ads no convierten',
      'no entiendo el algoritmo',
      'pierdo tiempo en plataformas',
    ],
    riskTopics: ['promesas absolutas de ROI', 'comparaciones agresivas con competidores'],
    trends2026: ['AI agents stack', 'short-form video dominance', 'community-led growth'],
    monetization: ['cursos', 'consultoría', 'agencia', 'SaaS'],
  },
  fitness: {
    topPlayersHint: ['@chris_bumstead', '@athleanx', '@chriskreso'],
    contentPillars: ['workouts', 'transformaciones', 'nutrición', 'mentalidad'],
    contentGaps: ['fitness para 40+', 'recovery science accessible', 'mujeres + fuerza sin clichés'],
    underservedAngles: [
      'protocol minimalista (3-4 ejercicios)',
      'transformación visible sin antes/después fake',
      'comer normal + entrenar bien',
    ],
    audiencePains: ['falta tiempo', 'no veo resultados', 'me lesiono', 'no sé por dónde empezar'],
    riskTopics: ['claims de pérdida de peso específica', 'suplementos sin disclaimer'],
    trends2026: ['hybrid training', 'longevidad', 'female strength', 'wearables data-driven'],
    monetization: ['coaching', 'apps', 'cursos', 'merch'],
  },
  food: {
    topPlayersHint: ['@joshelkin', '@buzzfeedtasty', '@gordongram'],
    contentPillars: ['recetas', 'reviews', 'ASMR', 'detrás de la cocina'],
    contentGaps: ['recetas batch para semana', 'cocina con 5 ingredientes', 'budget gourmet'],
    underservedAngles: [
      'cocina para 1 persona sin desperdicio',
      'recetas heredadas modernizadas',
      'reviews de productos baratos vs caros',
    ],
    audiencePains: ['no tengo tiempo', 'cocino para 1', 'me aburre comer sano', 'no sé que hacer con lo que tengo'],
    riskTopics: ['claims nutricionales no respaldados', 'recetas peligrosas (carne cruda mal manipulada)'],
    trends2026: ['high-protein', 'budget cooking', '30-min meals', 'global cuisines fusion'],
    monetization: ['cookbooks', 'meal plans', 'restaurant collab', 'brand deals'],
  },
  tech: {
    topPlayersHint: ['@mkbhd', '@unboxtherapy', '@theverge'],
    contentPillars: ['reviews', 'tutorials', 'noticias', 'unboxing'],
    contentGaps: ['comparativas honestas usados', 'tech para no-tech', 'fails de gadgets caros'],
    underservedAngles: ['AI agents en flujo real', 'self-hosting accessible', 'gadgets nicho (audio, foto)'],
    audiencePains: ['no sé qué comprar', 'muy técnico', 'mi setup parece pobre', 'todo cambia rápido'],
    riskTopics: ['recomendar productos sin disclosure', 'data privacy'],
    trends2026: ['AI agents', 'spatial computing', 'wearables', 'EV charging real'],
    monetization: ['affiliate', 'sponsorships', 'YouTube ads', 'consulting'],
  },
  finanzas: {
    topPlayersHint: ['@grahamstephan', '@humphreytalks', '@vivian_tu'],
    contentPillars: ['educación básica', 'casos reales', 'noticias mercado', 'hábitos'],
    contentGaps: ['finanzas para Latam (regulación)', 'casos reales con números', 'errores caros aprendidos'],
    underservedAngles: ['finanzas con humor', 'side hustles realistas (no MLM)', 'cómo pierde plata la gente normal'],
    audiencePains: ['no entiendo de plata', 'tengo deudas', 'no llego a fin de mes', 'no confío en bancos'],
    riskTopics: ['consejos específicos de inversión sin disclaimer', 'crypto pump-and-dump'],
    trends2026: ['AI-powered investing', 'side hustles', 'creator finance', 'crypto regulación'],
    monetization: ['cursos', 'newsletter', 'consulting', 'libros'],
  },
  beauty: {
    topPlayersHint: ['@hudabeauty', '@manny_mua733', '@nikkietutorials'],
    contentPillars: ['tutoriales', 'reviews', 'GRWM', 'transformations'],
    contentGaps: ['rutina minimalista 3 productos', 'skin para 30+ honesto', 'reviews drugstore vs lujo'],
    underservedAngles: ['skincare con dermatólogo invitado', 'edad real (no filtros)', 'makeup para piel madura'],
    audiencePains: ['mi piel es complicada', 'gasto mucho sin resultado', 'no sé combinar productos'],
    riskTopics: ['claims médicos sin respaldo', 'antes/después editado'],
    trends2026: ['skinification', 'minimalist routine', 'AI try-on', 'sustainability'],
    monetization: ['brand deals', 'línea propia', 'cursos'],
  },
  business: {
    topPlayersHint: ['@noahkagan', '@codiesanchez', '@aliabdaal'],
    contentPillars: ['lecciones', 'case studies', 'frameworks', 'tools'],
    contentGaps: ['solopreneurship real (con números)', 'fallos públicos', 'business para no-MBA'],
    underservedAngles: ['un día en mi micro-business', 'gastos reales mensuales', 'decisiones que cambiaron todo'],
    audiencePains: ['no sé por dónde empezar', 'me da miedo dejar mi trabajo', 'no tengo ideas viables'],
    riskTopics: ['promesas de ingresos', 'esquemas piramidales disfrazados'],
    trends2026: ['solopreneurship', 'AI productivity', 'side hustles', 'remote'],
    monetization: ['cursos', 'consulting', 'newsletter', 'comunidad'],
  },
  lifestyle: {
    topPlayersHint: ['@maddiebailey', '@kallmekris', '@brittany_xavier'],
    contentPillars: ['routine', 'aesthetic', 'travel', 'home'],
    contentGaps: ['lifestyle low-budget', 'realidad sin filtros', 'transformaciones de espacio chico'],
    underservedAngles: ['un día real (no aspiracional fake)', 'aesthetics con AliExpress', 'morning routine con kids'],
    audiencePains: ['no tengo presupuesto aesthetic', 'me da pereza la rutina', 'mi espacio es chico'],
    riskTopics: ['promover compras compulsivas', 'estándares irreales'],
    trends2026: ['slow living', 'aesthetic con propósito', 'mini-homes', 'analógico'],
    monetization: ['affiliate', 'brand deals', 'cursos design'],
  },
  educacion: {
    topPlayersHint: ['@aliabdaal', '@thomasfrank', '@matt-d-avella'],
    contentPillars: ['frameworks de aprendizaje', 'tools', 'rutinas estudio', 'productividad'],
    contentGaps: ['estudiar sin sacrificar vida social', 'aprender con AI bien', 'cómo retener lo que leés'],
    underservedAngles: ['cerebro funciona así (con ciencia)', 'estudios desde el celular', 'pomodoro modificado'],
    audiencePains: ['me distraigo', 'no retengo', 'no sé estudiar', 'procrastino'],
    riskTopics: ['promesas de aprendizaje instantáneo', 'cursos de dudosa calidad'],
    trends2026: ['AI tutoring', 'micro-learning', 'creator-led courses', 'skill stacking'],
    monetization: ['cursos', 'newsletter', 'community', 'libros'],
  },
  salud: {
    topPlayersHint: ['@drmark', '@hubermanlab', '@theglucosegoddess'],
    contentPillars: ['ciencia accessible', 'mitos', 'hábitos', 'data real'],
    contentGaps: ['salud mental masculina', 'menopausia sin estigma', 'sueño práctico'],
    underservedAngles: ['mi paciente me enseñó esto', 'estudios mal interpretados', 'health en español Latam'],
    audiencePains: ['no me siento bien', 'no sé en quién confiar', 'demasiada info contradictoria'],
    riskTopics: ['diagnósticos remotos', 'claims terapéuticos sin licencia'],
    trends2026: ['longevidad', 'gut health', 'salud mental masculina', 'biomarcadores'],
    monetization: ['consulta', 'cursos', 'libros', 'apps'],
  },
  humor: {
    topPlayersHint: ['@khaby.lame', '@brittany_broski', '@drewafualo'],
    contentPillars: ['observational', 'characters', 'reactions', 'parodia'],
    contentGaps: ['humor sin punching down', 'observational hyper-local', 'comedy con narrativa'],
    underservedAngles: ['humor sobre tu propio nicho profesional', 'parodias de viejas tendencias', 'humor + edu'],
    audiencePains: ['todo el mundo es serio', 'necesito reírme rápido'],
    riskTopics: ['humor político', 'estereotipos'],
    trends2026: ['anti-cringe humor', 'observational quiet humor', 'AI character comedy'],
    monetization: ['brand deals', 'merch', 'tours'],
  },
  moda: {
    topPlayersHint: ['@wisdm8', '@bryanboy', '@brittany_xavier'],
    contentPillars: ['outfit-of-the-day', 'styling tips', 'trends', 'thrift'],
    contentGaps: ['moda inclusiva real', 'outfit barato vs caro', 'estilo para 40+'],
    underservedAngles: ['armar look con lo que tenés', 'fit checks corporales reales', 'thrift de Latam'],
    audiencePains: ['no sé combinar', 'mi cuerpo es difícil', 'no tengo presupuesto'],
    riskTopics: ['fast fashion sin disclosure'],
    trends2026: ['quiet luxury', 'thrift maximalism', 'modest fashion', 'unisex'],
    monetization: ['affiliate', 'brand deals', 'consulting', 'línea propia'],
  },
  viajes: {
    topPlayersHint: ['@drewbinsky', '@nas.daily', '@kara_and_nate'],
    contentPillars: ['destinos', 'tips', 'budget travel', 'cultura'],
    contentGaps: ['viajes baratos Latam', 'viajar trabajando remoto', 'viajes solo mujer'],
    underservedAngles: ['cuánto cuesta realmente', 'errores que cometí', 'destinos que no aparecen en Instagram'],
    audiencePains: ['no tengo plata', 'me da miedo viajar solo', 'no sé cómo planear'],
    riskTopics: ['promover overtourism', 'consejos peligrosos'],
    trends2026: ['slow travel', 'workation', 'destinos secundarios', 'eco-tourism'],
    monetization: ['affiliate', 'brand deals', 'cursos', 'guías PDF'],
  },
  creator: {
    topPlayersHint: ['@aliabdaal', '@thomasfrank', '@mrbeast'],
    contentPillars: ['tactics', 'data', 'behind-scenes', 'tool stack'],
    contentGaps: ['empezar sin audiencia', 'creator Latam con números reales', 'burnout'],
    underservedAngles: ['cuánto gano realmente', 'analytics de un video flop', 'mi setup de $200'],
    audiencePains: ['no crezco', 'me copian', 'no monetizo', 'burnout'],
    riskTopics: ['promesas de viralidad'],
    trends2026: ['AI creators', 'parasocial bond', 'creator-led commerce'],
    monetization: ['cursos', 'sponsorships', 'própio producto'],
  },
  gaming: {
    topPlayersHint: ['@kaicenat', '@ninja', '@valkyrae'],
    contentPillars: ['gameplay', 'reactions', 'commentary', 'reviews'],
    contentGaps: ['gaming para casuales 30+', 'esports para no-fans', 'retro gaming'],
    underservedAngles: ['gaming sin gritos', 'cuál juego para tu personalidad', 'speedrun explicado'],
    audiencePains: ['no tengo tiempo', 'no sé qué jugar', 'no soy bueno'],
    riskTopics: ['toxicidad', 'rage clips fuera de contexto'],
    trends2026: ['cozy gaming', 'mobile growth', 'cloud gaming'],
    monetization: ['Twitch subs', 'sponsorships', 'merch'],
  },
  arte: {
    topPlayersHint: ['@gabbubel', '@aaronartistry', '@artsbymikael'],
    contentPillars: ['proceso', 'tutoriales', 'inspiración', 'comisiones'],
    contentGaps: ['arte digital con AI ético', 'arte para principiantes adultos', 'precio del arte real'],
    underservedAngles: ['tiempo real sin edit', 'mi peor obra', 'cómo cobro mis comisiones'],
    audiencePains: ['no sé dibujar', 'no tengo talento', 'no monetizo mi arte'],
    riskTopics: ['AI art controversia'],
    trends2026: ['traditional revival', 'AI-assisted art', 'art with story'],
    monetization: ['comisiones', 'cursos', 'prints', 'Patreon'],
  },
  musica: {
    topPlayersHint: ['@charlieputh', '@quincyjones', '@rickbeato'],
    contentPillars: ['tutoriales', 'covers', 'producción', 'reacciones'],
    contentGaps: ['producción música en Latam', 'teoría musical accessible', 'cómo subir tu música'],
    underservedAngles: ['cómo se hace este beat', 'errores comunes de productores', 'estudio en bedroom'],
    audiencePains: ['no sé producir', 'no consigo plays', 'no sé promocionar'],
    riskTopics: ['copyright', 'samples sin clear'],
    trends2026: ['AI music tools', 'short-form covers', 'indie distribution'],
    monetization: ['beats', 'streaming', 'live', 'cursos'],
  },
  parenting: {
    topPlayersHint: ['@drbeckyatgoodinside', '@bigthinkparenting'],
    contentPillars: ['ciencia del desarrollo', 'tips prácticos', 'humor', 'self-care'],
    contentGaps: ['padres primerizos Latam', 'parenting para neurodivergentes', 'padres solteros'],
    underservedAngles: ['lo que nadie te dice', 'errores que cometí', 'parenting con presupuesto chico'],
    audiencePains: ['no sé qué hacer', 'me agoto', 'culpa constante'],
    riskTopics: ['consejos médicos pediátricos', 'mostrar hijos sin consentimiento'],
    trends2026: ['gentle parenting', 'mental load awareness', 'screens balance'],
    monetization: ['libros', 'cursos', 'consulting', 'comunidad'],
  },
  relaciones: {
    topPlayersHint: ['@mattyjxhealey', '@thequeerdailycouple'],
    contentPillars: ['comunicación', 'red flags', 'dating tips', 'POV stories'],
    contentGaps: ['relaciones long-distance', 'salud mental en pareja', 'dating apps strategy real'],
    underservedAngles: ['mi peor cita', 'lo que aprendí de mi divorcio', 'banderas amarillas (no rojas)'],
    audiencePains: ['no encuentro a nadie', 'no sé comunicar', 'tóxico/a sin darme cuenta'],
    riskTopics: ['consejos sin contexto clínico', 'estereotipos de género'],
    trends2026: ['attachment theory pop', 'situationships', 'AI dating coach'],
    monetization: ['cursos', 'coaching', 'libros'],
  },
  general: {
    topPlayersHint: [],
    contentPillars: ['curiosidades', 'storytelling', 'humor', 'reactions'],
    contentGaps: [],
    underservedAngles: [],
    audiencePains: ['scroll infinito sin valor'],
    riskTopics: [],
    trends2026: [],
    monetization: [],
  },
};

const normNiche = (niche) => {
  const n = String(niche || '')
    .toLowerCase()
    .trim();
  const map = {
    marketing: 'marketing-digital',
    mkt: 'marketing-digital',
    growth: 'marketing-digital',
    gym: 'fitness',
    sport: 'fitness',
    cocina: 'food',
    recetas: 'food',
    tecnologia: 'tech',
    crypto: 'tech',
    saas: 'tech',
    finanza: 'finanzas',
    plata: 'finanzas',
    dinero: 'finanzas',
    inversiones: 'finanzas',
    maquillaje: 'beauty',
    cosmetica: 'beauty',
    skincare: 'beauty',
    negocios: 'business',
    emprendimiento: 'business',
    business2business: 'business',
    casa: 'lifestyle',
    aesthetic: 'lifestyle',
    home: 'lifestyle',
    estudio: 'educacion',
    aprendizaje: 'educacion',
    'salud-mental': 'salud',
    wellness: 'salud',
    meme: 'humor',
    comedy: 'humor',
    memes: 'humor',
    fashion: 'moda',
    ropa: 'moda',
    travel: 'viajes',
    turismo: 'viajes',
    influencer: 'creator',
    youtuber: 'creator',
    esports: 'gaming',
    gamer: 'gaming',
    art: 'arte',
    painting: 'arte',
    music: 'musica',
    producción: 'musica',
    paternidad: 'parenting',
    kids: 'parenting',
    dating: 'relaciones',
    parejas: 'relaciones',
    amor: 'relaciones',
  };
  if (NICHE_PROFILES_DEEP[n]) return n;
  if (map[n]) return map[n];
  for (const key of Object.keys(NICHE_PROFILES_DEEP)) {
    if (n.includes(key)) return key;
  }
  return 'general';
};

const baseAngles = (profile) => [
  ...(profile.underservedAngles || []),
  ...(profile.contentGaps || []).map((g) => `Ángulo: ${g}`),
];

/**
 * Investigación de nicho — heurística + LLM opcional para razonamiento adicional.
 *
 * NOTA: no hace web search. Catálogo + razonamiento.
 */
export const researchNiche = async ({
  niche = '',
  audience = '',
  platform = 'tiktok',
  depth = 'standard',
  llm = false,
  user = null,
} = {}) => {
  const key = normNiche(niche);
  const profile = NICHE_PROFILES_DEEP[key] || NICHE_PROFILES_DEEP.general;

  // Cache global del catálogo (por nicho normalizado)
  const cacheKey = `feedia:niche:research:${key}`;
  let cached = null;
  try {
    cached = await store.get(cacheKey);
  } catch {
    /* skip */
  }

  let llmAngles = [];
  if (llm) {
    const prompt = `Como analista de contenido TikTok/Instagram, sugerí 5 ángulos no-obvios para el nicho "${niche}" (normalizado: "${key}") en plataforma ${platform}, dirigido a audiencia ${audience || 'general'}.

Pains conocidos: ${(profile.audiencePains || []).join(', ')}
Gaps conocidos: ${(profile.contentGaps || []).join(', ')}

Devolvé JSON: {"angles":[{"topic":"...","opportunity":"...","rationale":"..."}]}. Ángulos concretos, accionables, sin clichés.`;
    try {
      const out = await askLLMJson(prompt, { user, maxTokens: 600, temperature: 0.7 });
      if (out?.angles?.length) llmAngles = out.angles;
    } catch {
      /* heurístico ya está */
    }
  }

  const angles = llmAngles.length
    ? llmAngles
    : baseAngles(profile).map((a) => ({
        topic: a,
        opportunity: 'whitespace en catálogo',
        rationale: 'gap o ángulo no explotado en NICHE_PROFILES_DEEP',
      }));

  const result = {
    niche,
    nicheNormalized: key,
    platform,
    audience,
    depth,
    topPlayers: profile.topPlayersHint,
    topPlayersDisclaimer: 'Referencias sugeridas — verificá actividad reciente antes de citar.',
    gaps: profile.contentGaps,
    angles,
    pains: profile.audiencePains,
    whitespace: profile.underservedAngles,
    contentPillars: profile.contentPillars,
    riskTopics: profile.riskTopics,
    trends2026: profile.trends2026,
    monetization: profile.monetization,
    cached: Boolean(cached),
    generatedBy: llmAngles.length ? 'llm+heuristic' : 'heuristic',
    limitation: 'Sin web search real. Catálogo + razonamiento LLM.',
  };

  try {
    await store.set(cacheKey, { generatedAt: Date.now(), result });
    await store.expire(cacheKey, DAY * 7);
    if (user?.id) {
      await store.setUser(user.id, `research:${key}:custom`, { generatedAt: Date.now(), result });
    }
  } catch {
    /* best-effort */
  }

  return result;
};

const json = (res, code, body) => {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(body));
};

export const handleNicheResearch = async (req, res, path, m, body, ctx = {}) => {
  const user = ctx.user || null;

  if (path === '/api/growth/research/niche' && m === 'POST') {
    const result = await researchNiche({ ...(body || {}), user });
    json(res, 200, result);
    return true;
  }

  if (path === '/api/growth/research/catalog' && m === 'GET') {
    res.setHeader('cache-control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    res.statusCode = 200;
    res.setHeader('content-type', 'application/json; charset=utf-8');
    res.end(
      JSON.stringify({ count: Object.keys(NICHE_PROFILES_DEEP).length, niches: Object.keys(NICHE_PROFILES_DEEP) }),
    );
    return true;
  }

  return false;
};
