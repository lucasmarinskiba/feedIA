/**
 * Account Brief — capa account-aware que adapta TODA la generación de Brújula
 * al nicho, marca, objetivo y algoritmo de cada cuenta.
 *
 * 100% determinista (sin llamadas LLM extra → $0). Reusa:
 *   - NICHE_PROFILES_DEEP (_nicheResearchAgent): pains, gaps, underservedAngles, trends, riesgos
 *   - plan de buildStrategicPlan (_strategist): algoritmo, audiencia, postingWindows, ctaLadder
 *
 * Salidas:
 *   - briefText: contexto rico que se prepende a cada prompt de generación
 *   - angles: 3 ángulos POR FORMATO derivados del nicho (no genéricos)
 *   - strategy: bloque SEO/algoritmo/distribución/cadencia/KPIs para la respuesta
 */

import { NICHE_PROFILES_DEEP } from './_nicheResearchAgent.js';

// Keywords → clave de NICHE_PROFILES_DEEP. Primero matchea brandNiche, luego topic.
const NICHE_KEYWORDS = {
  'marketing-digital': [
    'marketing',
    'ads',
    'publicidad',
    'leads',
    'embudo',
    'funnel',
    'seo',
    'growth',
    'agencia',
    'copywriting',
    'email',
  ],
  fitness: [
    'fitness',
    'gym',
    'gimnasio',
    'entreno',
    'workout',
    'músculo',
    'musculo',
    'ejercicio',
    'crossfit',
    'running',
  ],
  food: ['comida', 'receta', 'cocina', 'food', 'gastronom', 'chef', 'restaurante', 'repostería', 'reposteria'],
  tech: [
    'tech',
    'tecnolog',
    'software',
    'programa',
    'código',
    'codigo',
    'dev',
    'app',
    'ia',
    'inteligencia artificial',
    'gadget',
    'startup',
  ],
  finanzas: [
    'finanzas',
    'dinero',
    'inversión',
    'inversion',
    'cripto',
    'bolsa',
    'ahorro',
    'trading',
    'economía',
    'economia',
    'bitcoin',
  ],
  beauty: [
    'beauty',
    'belleza',
    'maquillaje',
    'makeup',
    'skincare',
    'piel',
    'cosmética',
    'cosmetica',
    'pelo',
    'cabello',
  ],
  business: ['negocio', 'business', 'emprend', 'pyme', 'empresa', 'ventas', 'b2b', 'liderazgo', 'productividad'],
  lifestyle: ['lifestyle', 'estilo de vida', 'rutina', 'hábito', 'habito', 'bienestar', 'minimalismo', 'hogar'],
  educacion: [
    'educación',
    'educacion',
    'aprende',
    'curso',
    'enseñ',
    'idioma',
    'estudio',
    'tutorial',
    'clase',
    'profesor',
  ],
  salud: [
    'salud',
    'médic',
    'medic',
    'nutrición',
    'nutricion',
    'mental',
    'ansiedad',
    'sueño',
    'sueno',
    'wellness',
    'terapia',
  ],
  humor: ['humor', 'comedia', 'chiste', 'meme', 'gracioso', 'parodia', 'sketch'],
  moda: ['moda', 'fashion', 'ropa', 'outfit', 'estilo', 'tendencia', 'diseño de moda'],
  viajes: ['viaje', 'travel', 'turismo', 'destino', 'mochilero', 'aventura', 'vacaciones'],
  creator: ['creador', 'creator', 'influencer', 'contenido', 'youtuber', 'streamer', 'cámara', 'camara'],
  gaming: ['gaming', 'videojuego', 'gamer', 'juego', 'esports', 'twitch', 'consola'],
  arte: ['arte', 'art', 'ilustración', 'ilustracion', 'dibujo', 'pintura', 'diseño', 'creatividad'],
  musica: ['música', 'musica', 'music', 'canción', 'cancion', 'productor', 'banda', 'beat', 'dj'],
  parenting: ['maternidad', 'paternidad', 'crianza', 'hijos', 'bebé', 'bebe', 'familia', 'embarazo'],
  relaciones: ['relación', 'relacion', 'pareja', 'amor', 'cita', 'dating', 'matrimonio', 'soltero'],
};

// Mezcla humor/entretenimiento/educación esperada por nicho (dial de tono).
const NICHE_CONTENT_STYLE = {
  'marketing-digital':
    'autoridad + educativo con datos y casos reales; entretenimiento sutil vía storytelling de agencia',
  fitness: 'motivacional + educativo no-bullshit; entretenimiento vía transformaciones y retos',
  food: 'sensorial y entretenido (ASMR, antojo); educativo vía tips de cocina rápidos',
  tech: 'educativo claro + autoridad; entretenimiento vía wow-factor y comparativas',
  finanzas: 'educativo con autoridad y claridad, CERO hype; entretenimiento vía mitos derribados',
  beauty: 'aspiracional y estético; educativo vía rutinas y antes/después honestos',
  business: 'autoridad + educativo accionable; entretenimiento vía POV emprendedor real',
  lifestyle: 'aspiracional e identificable; educativo vía hábitos y rutinas',
  educacion: 'educativo puro con aha-moments y frameworks; entretenimiento vía analogías simples',
  salud: 'educativo responsable y empático, sin claims absolutos; entretenimiento muy moderado',
  humor: 'humor y entretenimiento al frente (timing, punchlines, observacional); educación encubierta',
  moda: 'aspiracional y estético; entretenimiento vía tendencias y hauls',
  viajes: 'aspiracional, sensorial, descubrimiento; educativo vía tips de destino',
  creator: 'autenticidad y proceso; educativo vía tácticas y tool-stack',
  gaming: 'entretenimiento alta energía + cultura gamer; educativo vía guías y reviews',
  arte: 'autenticidad y proceso creativo; entretenimiento vía time-lapse y reveals',
  musica: 'identidad y emoción; entretenimiento vía proceso y snippets',
  parenting: 'empático e identificable, real sin filtros; educativo vía consejos prácticos',
  relaciones: 'empático e identificable; entretenimiento vía POV y situaciones reales',
  general: 'mezcla equilibrada de educación y entretenimiento según el tema',
};

const GOAL_SIGNAL = {
  engagement: 'comentarios + saves + shares (conversación y guardado)',
  sales: 'clics a link/DM + saves de alta intención (decisión de compra)',
  community: 'comentarios + replies + shares (pertenencia y conversación)',
  awareness: 'shares + reach + completion (alcance a no-seguidores)',
  growth: 'follows-post + shares + saves (conversión a seguidor)',
  reach: 'shares + completion + reach (distribución a Explore/FYP)',
};

const GOAL_KPIS = {
  engagement: ['Engagement rate > 6%', 'Saves/impresiones > 3%', 'Comentarios por post > 25'],
  sales: ['CTR a link/DM > 2%', 'Conversaciones iniciadas/semana', 'Saves de alta intención'],
  community: ['Replies por post > 15', 'DMs entrantes/semana', 'Returning viewers > 25%'],
  awareness: ['% reach a no-seguidores > 40%', 'Shares por post', 'Completion rate > 50%'],
  growth: ['Seguidores nuevos/semana', 'Follow-rate por post > 1.5%', 'Reach/seguidores > 1.5x'],
  reach: ['Reach/seguidores > 2x', 'Shares por post', 'Completion rate > 55%'],
};

export const detectNiche = (brandNiche = '', topic = '') => {
  const hay = `${brandNiche} ${topic}`.toLowerCase();
  // brandNiche tiene prioridad: si matchea exacto una clave, usarla
  const direct = (brandNiche || '').toLowerCase().trim();
  if (direct && NICHE_PROFILES_DEEP[direct]) return direct;
  let best = null,
    bestHits = 0;
  for (const [key, words] of Object.entries(NICHE_KEYWORDS)) {
    const hits = words.reduce((n, w) => (hay.includes(w) ? n + 1 : n), 0);
    if (hits > bestHits) {
      bestHits = hits;
      best = key;
    }
  }
  return best || 'general';
};

// Deriva 3 ángulos específicos del nicho para un formato dado.
// Mezcla underservedAngles + contentGaps + pains → ángulos diferenciados y accionables.
const deriveAngles = (nicheProfile, format) => {
  const under = nicheProfile.underservedAngles || [];
  const gaps = nicheProfile.contentGaps || [];
  const pains = nicheProfile.audiencePains || [];
  const pillars = nicheProfile.contentPillars || [];

  // Lentes por formato (el ángulo se adapta a la naturaleza del formato)
  const lens = {
    carousel: ['Educativo · Framework', 'Storytelling · Caso real', 'Provocador · Mito derribado'],
    reel: ['Demo · Valor inmediato', 'POV · Momento real', 'Hook fuerte · Dato sorpresa'],
    stories: ['Interacción · Sticker', 'Detrás de escena', 'Anuncio · Link/CTA'],
  }[format] || ['Educativo', 'Storytelling', 'Provocador'];

  const seeds = [
    under[0] || gaps[0] || `resolver "${pains[0] || 'el dolor principal'}"`,
    under[1] || gaps[1] || (pillars[1] ? `profundizar en ${pillars[1]}` : 'caso real con números'),
    under[2] || gaps[2] || (pains[1] ? `desmontar "${pains[1]}"` : 'lo que nadie del nicho dice'),
  ];

  return lens.map((name, i) => ({
    name,
    desc: `${seeds[i]} — enfoque ${format}, diferenciado del contenido genérico del nicho`,
  }));
};

const buildHashtagStrategy = (nicheKey, topic) => {
  const slug = (s) =>
    s
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]/g, '');
  const topicTag = slug(topic).slice(0, 24);
  const core = [`#${slug(nicheKey)}`, '#contenido', '#instagram'].filter((t) => t.length > 1);
  const profile = NICHE_PROFILES_DEEP[nicheKey] || {};
  const niche = (profile.contentPillars || [])
    .slice(0, 3)
    .map((p) => `#${slug(p)}`)
    .filter((t) => t.length > 1);
  const trending = (profile.trends2026 || [])
    .slice(0, 2)
    .map((p) => `#${slug(p)}`)
    .filter((t) => t.length > 1);
  if (topicTag) niche.unshift(`#${topicTag}`);
  return { core, niche: niche.slice(0, 4), trending };
};

const CADENCE = {
  growth: '1 reel/día + 3 carruseles/semana + stories diarias (volumen alto = más reach)',
  reach: '1 reel/día priorizando shares + 2 carruseles/semana',
  engagement: '4-5 posts/semana (mezcla reel+carrusel) + stories con stickers diarias',
  community: '3-4 posts/semana + stories interactivas diarias + responder TODO',
  sales: '3 posts/semana de valor + 1 de oferta + stories con CTA a link',
  awareness: '5-6 posts/semana priorizando reels compartibles',
};

/**
 * Construye el brief completo de la cuenta.
 * @returns { niche, nicheProfile, contentStyle, briefText, angles, strategy }
 */
export const buildAccountBrief = ({
  plan,
  topic = '',
  platform = 'instagram',
  goal = 'engagement',
  brandNiche = '',
  brandVoice = 'cercano',
  brandType = 'personal',
} = {}) => {
  const niche = detectNiche(brandNiche, topic);
  const np = NICHE_PROFILES_DEEP[niche] || NICHE_PROFILES_DEEP.general || {};
  const contentStyle = NICHE_CONTENT_STYLE[niche] || NICHE_CONTENT_STYLE.general;
  const ap = plan?.audienceProfile || {};
  const primarySignals = plan?.algorithmPrimarySignals || [];
  const goalSignal = GOAL_SIGNAL[goal] || GOAL_SIGNAL.engagement;
  const riskAll = [...(np.riskTopics || []), ...(plan?.riskFlags || [])];
  const brandTypeLabel = brandType === 'business' || brandType === 'empresa' ? 'marca empresarial' : 'marca personal';

  const briefText = `PERFIL DE LA CUENTA — adaptá TODO el contenido a esto (no genérico):
- Nicho: ${niche} | ${brandTypeLabel} | Tono de voz: ${brandVoice}
- Estilo de contenido del nicho: ${contentStyle}
- Objetivo: ${goal} → optimizar para: ${goalSignal}
- Audiencia: ${plan?.input?.audience || 'general'}${ap.triggers ? ` | conecta con: ${ap.triggers.slice(0, 4).join(', ')}` : ''}${ap.avoid ? ` | EVITÁ: ${ap.avoid.slice(0, 3).join(', ')}` : ''}${ap.attentionSec ? ` | ventana de atención: ${ap.attentionSec}s` : ''}
- Algoritmo ${platform}: priorizar señales ${primarySignals.length ? primarySignals.join(', ') : 'watch-time, saves, shares'}
- Dolores de la audiencia (resolvé al menos uno explícitamente): ${(np.audiencePains || []).join(' · ') || 'el problema central del topic'}
- Ángulos NO explotados del nicho (usalos para diferenciarte de la competencia): ${(np.underservedAngles || []).join(' · ') || 'caso real, detrás de escena, errores comunes'}
- Huecos de contenido = oportunidad: ${(np.contentGaps || []).join(' · ') || 'contenido específico y honesto'}
- Tendencias 2026 surfeables: ${(np.trends2026 || []).join(' · ') || 'short-form, autenticidad'}
- PROHIBIDO (riesgo de demote/baneo del algoritmo): ${riskAll.length ? riskAll.join(' · ') : 'claims absolutos, lenguaje sensacionalista'}
REGLA: cada pieza debe sonar a un especialista real del nicho que genera crecimiento honesto, no a contenido genérico de IA.`;

  const angles = {
    carousel: deriveAngles(np, 'carousel'),
    reel: deriveAngles(np, 'reel'),
    stories: deriveAngles(np, 'stories'),
  };

  // Calendario auto 7 días — determinista, mezcla formatos según objetivo + ángulos del nicho.
  const weekPlan = (() => {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const heavy = goal === 'growth' || goal === 'reach' || goal === 'awareness';
    // Mix de formatos por día (más reels si objetivo es alcance/crecimiento)
    const rotation = heavy
      ? ['reel', 'story', 'reel', 'carousel', 'reel', 'story', 'carousel']
      : ['carousel', 'story', 'reel', 'story', 'carousel', 'reel', 'story'];
    const carA = angles.carousel,
      reA = angles.reel,
      stA = angles.stories;
    let ci = 0,
      ri = 0,
      si = 0;
    const pick = (fmt) => {
      if (fmt === 'reel') return reA[ri++ % reA.length];
      if (fmt === 'carousel') return carA[ci++ % carA.length];
      return stA[si++ % stA.length];
    };
    const win = (plan?.postingWindows && plan.postingWindows[0]) || (platform === 'tiktok' ? '18-21h' : '19-21h');
    return days.map((d, i) => {
      const fmt = rotation[i];
      const a = pick(fmt);
      const labelFmt = fmt === 'reel' ? 'Reel' : fmt === 'carousel' ? 'Carrusel' : 'Historia';
      return {
        day: d,
        format: labelFmt,
        angle: a?.name || '',
        idea: a?.desc || '',
        window: fmt === 'story' ? 'cualquier momento' : win,
      };
    });
  })();

  // Calendario mensual (28 días) — determinista $0, sin gate de plan. Fechas reales desde hoy.
  const calendarMonthly = (() => {
    const heavy = goal === 'growth' || goal === 'reach' || goal === 'awareness';
    const rotation = heavy
      ? ['reel', 'story', 'reel', 'carousel', 'reel', 'story', 'carousel']
      : ['carousel', 'story', 'reel', 'story', 'carousel', 'reel', 'story'];
    const win = (plan?.postingWindows && plan.postingWindows[0]) || (platform === 'tiktok' ? '18-21h' : '19-21h');
    const carA = angles.carousel,
      reA = angles.reel,
      stA = angles.stories;
    let ci = 0,
      ri = 0,
      si = 0;
    const pick = (fmt) =>
      fmt === 'reel' ? reA[ri++ % reA.length] : fmt === 'carousel' ? carA[ci++ % carA.length] : stA[si++ % stA.length];
    const slots = [];
    const today = new Date();
    for (let d = 0; d < 28; d++) {
      const fmt = rotation[d % 7];
      if (fmt === 'story' && d % 2 === 1) continue; // no story todos los días → cadencia realista
      const date = new Date(today.getTime() + d * 86400000);
      const a = pick(fmt);
      slots.push({
        date: date.toISOString().slice(0, 10),
        format: fmt === 'reel' ? 'Reel' : fmt === 'carousel' ? 'Carrusel' : 'Historia',
        theme: a?.name || '',
        time: fmt === 'story' ? 'libre' : win,
      });
    }
    return { weeks: 4, totalSlots: slots.length, slots };
  })();

  const strategy = {
    niche,
    brandType: brandTypeLabel,
    weekPlan,
    calendarMonthly,
    contentStyle,
    algorithmSignals: primarySignals,
    postingWindows: plan?.postingWindows || [],
    cadence: CADENCE[goal] || CADENCE.engagement,
    contentPillars: np.contentPillars || [],
    hashtagStrategy: buildHashtagStrategy(niche, topic),
    ctaLadder: plan?.ctaLadder || [],
    distribution: [
      'Publicá el reel primero; el carrusel del mismo ángulo 48h después (refuerza el tema).',
      'Reusá el mejor slide del carrusel como frame de story con sticker de pregunta.',
      'Cross-post el reel a TikTok/Shorts sin watermark para reach extra.',
      'Fijá el carrusel con más saves en el perfil (prueba social para visitantes).',
    ],
    kpis: GOAL_KPIS[goal] || GOAL_KPIS.engagement,
    monetization: np.monetization || [],
    topPlayersHint: np.topPlayersHint || [],
    riskFlags: riskAll,
  };

  return { niche, nicheProfile: np, contentStyle, briefText, angles, strategy };
};
