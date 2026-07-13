import { api, apiSafe } from '../lib/api.js';
import { escape } from '../lib/dom.js';
import { toast } from '../lib/toast.js';
import { loadingScreen } from '../lib/ui.js';

/* Autonomy mode por agente: persistido en localStorage. */
const AUTONOMY_KEY = 'feedia.agents.autonomy';
const loadAutonomy = () => {
  try {
    return JSON.parse(localStorage.getItem(AUTONOMY_KEY) ?? '{}');
  } catch {
    return {};
  }
};
const saveAutonomy = (map) => {
  try {
    localStorage.setItem(AUTONOMY_KEY, JSON.stringify(map));
  } catch {
    /* noop */
  }
};
const getAutonomy = (agentId) => loadAutonomy()[agentId] ?? 'off';
const setAutonomy = (agentId, mode) => {
  const m = loadAutonomy();
  m[agentId] = mode;
  saveAutonomy(m);
};

/* ─────────────────────────────────────────────────────────────
   AGENT DEFINITIONS (mirrored from backend — no runtime import)
   ───────────────────────────────────────────────────────────── */
const AGENTS = [
  {
    id: 'algorithm',
    name: 'Algorithm Master',
    emoji: '🧠',
    gradient: 'linear-gradient(135deg,#1a1f6b,#3451d1)',
    tagline: 'Domina el algoritmo de Instagram',
    description:
      'Experto en señales de ranking, Explore, shadowban, timing y alcance orgánico. Hacé que cada post sea visto por la máxima audiencia posible.',
    specialties: ['Ranking signals', 'Explore page', 'Shadowban check', 'Timing óptimo', 'Engagement velocity'],
    actions: [
      {
        id: 'timing',
        icon: '⏰',
        label: 'Timing óptimo',
        description: 'Mejor horario según formato y objetivo',
        params: [
          {
            name: 'format',
            label: 'Formato',
            type: 'select',
            options: ['reel', 'carrusel', 'post-imagen', 'historia'],
          },
          {
            name: 'goal',
            label: 'Objetivo',
            type: 'select',
            options: ['alcance', 'engagement', 'explore', 'guardados'],
          },
        ],
      },
      {
        id: 'shadowban',
        icon: '🚫',
        label: 'Diagnóstico shadowban',
        description: 'Detectá si estás shadowbanned y cómo salir',
        params: [
          {
            name: 'symptoms',
            label: 'Síntomas observados',
            type: 'textarea',
            placeholder: 'Ej: alcance bajó 80%, no aparezco en hashtags...',
          },
        ],
      },
      {
        id: 'explore-strategy',
        icon: '🔍',
        label: 'Estrategia Explore',
        description: 'Plan para entrar y dominar el Explore',
        params: [{ name: 'format', label: 'Formato', type: 'select', options: ['reel', 'carrusel', 'post-imagen'] }],
      },
      {
        id: 'content-score',
        icon: '📊',
        label: 'Score de contenido',
        description: 'Qué puntaje algorítmico tendría tu post',
        params: [
          { name: 'caption', label: 'Caption o descripción', type: 'textarea', placeholder: 'Pegá tu caption...' },
          {
            name: 'format',
            label: 'Formato',
            type: 'select',
            options: ['reel', 'carrusel', 'post-imagen', 'historia'],
          },
        ],
      },
      {
        id: 'reach-boost',
        icon: '🚀',
        label: 'Boost de alcance',
        description: 'Tácticas para multiplicar el alcance esta semana',
        params: [],
      },
    ],
  },
  {
    id: 'meta-ads',
    name: 'Meta Ads Pro',
    emoji: '📊',
    gradient: 'linear-gradient(135deg,#0866ff,#00b0f4)',
    tagline: 'Maximizá tu ROI en Meta Ads',
    description:
      'Campañas, audiencias, creativos y ROAS. Toda la estrategia publicitaria de Meta con enfoque en resultados de negocio reales.',
    specialties: [
      'Estructura de campañas',
      'Lookalike audiences',
      'Creative testing',
      'ROAS optimization',
      'Retargeting avanzado',
    ],
    actions: [
      {
        id: 'campaign-structure',
        icon: '🏗️',
        label: 'Estructura de campaña',
        description: 'Diseñá una campaña completa desde cero',
        params: [
          {
            name: 'goal',
            label: 'Objetivo',
            type: 'select',
            options: ['awareness', 'tráfico', 'engagement', 'leads', 'conversiones', 'ventas'],
          },
          { name: 'budget', label: 'Presupuesto diario (USD)', type: 'text', placeholder: 'Ej: 50' },
          {
            name: 'product',
            label: 'Producto o servicio',
            type: 'text',
            placeholder: 'Ej: curso de marketing digital',
          },
        ],
      },
      {
        id: 'ad-copy',
        icon: '✍️',
        label: 'Copy para anuncios',
        description: '5 variantes de copy para testear',
        params: [
          {
            name: 'offer',
            label: 'Oferta / propuesta de valor',
            type: 'textarea',
            placeholder: 'Describí tu producto y beneficios...',
          },
          {
            name: 'format',
            label: 'Formato del anuncio',
            type: 'select',
            options: ['imagen', 'video', 'carrusel', 'story'],
          },
        ],
      },
      {
        id: 'audience',
        icon: '🎯',
        label: 'Mapa de audiencias',
        description: 'Segmentos y audiencias para tu nicho',
        params: [
          {
            name: 'product',
            label: 'Producto/servicio',
            type: 'text',
            placeholder: 'Ej: consultoría de redes sociales',
          },
        ],
      },
      {
        id: 'creative-brief',
        icon: '🎨',
        label: 'Brief creativo',
        description: 'Brief completo para creativos que convierten',
        params: [
          {
            name: 'format',
            label: 'Formato',
            type: 'select',
            options: ['imagen estática', 'video 15s', 'video 30s', 'carrusel', 'story'],
          },
          {
            name: 'objective',
            label: 'Objetivo del creativo',
            type: 'select',
            options: ['awareness', 'consideration', 'conversión'],
          },
        ],
      },
      {
        id: 'roas-plan',
        icon: '💹',
        label: 'Plan de ROAS',
        description: 'Estrategia para alcanzar tu ROAS objetivo',
        params: [
          { name: 'currentRoas', label: 'ROAS actual', type: 'text', placeholder: 'Ej: 2.5' },
          { name: 'targetRoas', label: 'ROAS objetivo', type: 'text', placeholder: 'Ej: 6' },
          { name: 'budget', label: 'Presupuesto mensual (USD)', type: 'text', placeholder: 'Ej: 2000' },
        ],
      },
    ],
  },
  {
    id: 'humor',
    name: 'Humor Engine',
    emoji: '😂',
    gradient: 'linear-gradient(135deg,#f7971e,#ffd200)',
    tagline: 'Contenido que hace reír y viraliza',
    description:
      'Memes de nicho, humor situacional, entertainment hooks y formatos virales que generan shares masivos y comunidad.',
    specialties: ['Memes de nicho', 'Humor situacional', 'Trending jokes', 'Entertainment hooks', 'Viral comedy'],
    actions: [
      {
        id: 'meme-concept',
        icon: '🎭',
        label: 'Concepto de meme',
        description: 'Memes adaptados a tu nicho y audiencia',
        params: [
          {
            name: 'topic',
            label: 'Tema o dolor del nicho',
            type: 'text',
            placeholder: 'Ej: clientes que piden rebaja',
          },
          {
            name: 'format',
            label: 'Formato',
            type: 'select',
            options: ['imagen con texto', 'video reacción', 'before/after', 'expectativa vs realidad', 'libre'],
          },
        ],
      },
      {
        id: 'trending-humor',
        icon: '🔥',
        label: 'Humor trending',
        description: 'Adaptá tendencias de humor a tu marca',
        params: [
          {
            name: 'trend',
            label: 'Tendencia o meme actual',
            type: 'text',
            placeholder: 'Ej: "girl dinner", "demure", "rizz"...',
          },
        ],
      },
      {
        id: 'comedy-caption',
        icon: '✏️',
        label: 'Caption divertida',
        description: 'Reescribí tu caption con humor auténtico',
        params: [
          {
            name: 'originalCaption',
            label: 'Caption o idea original',
            type: 'textarea',
            placeholder: 'Pegá lo que tenés...',
          },
          {
            name: 'humorStyle',
            label: 'Estilo de humor',
            type: 'select',
            options: ['sarcasmo suave', 'humor relatable', 'absurdo', 'wit inteligente', 'autocrítica'],
          },
        ],
      },
      {
        id: 'entertainment-calendar',
        icon: '📅',
        label: 'Calendario de entretenimiento',
        description: '7 ideas de posts de entertainment para la semana',
        params: [],
      },
      {
        id: 'viral-comedy-hook',
        icon: '🎣',
        label: 'Hooks de comedia viral',
        description: '10 ganchos de apertura para content de humor',
        params: [
          {
            name: 'topic',
            label: 'Tema o contexto',
            type: 'text',
            placeholder: 'Ej: emprendimiento, marketing digital...',
          },
        ],
      },
    ],
  },
  {
    id: 'sales',
    name: 'Sales Machine',
    emoji: '💰',
    gradient: 'linear-gradient(135deg,#11998e,#38ef7d)',
    tagline: 'Convertí seguidores en clientes',
    description:
      'Story selling, DM funnels, CTAs que convierten y estrategia de lanzamientos para generar ingresos reales desde Instagram.',
    specialties: ['Story selling', 'DM funnels', 'Social proof', 'Offer positioning', 'Launch strategy'],
    actions: [
      {
        id: 'story-selling',
        icon: '📱',
        label: 'Secuencia story selling',
        description: 'Stories que llevan a la venta en 5-7 días',
        params: [
          {
            name: 'product',
            label: 'Producto o servicio',
            type: 'text',
            placeholder: 'Ej: mentoría de marketing digital',
          },
          { name: 'price', label: 'Precio (opcional)', type: 'text', placeholder: 'Ej: $500' },
          {
            name: 'audience',
            label: 'Pain point principal',
            type: 'text',
            placeholder: 'Ej: no sabe cómo conseguir clientes',
          },
        ],
      },
      {
        id: 'dm-funnel',
        icon: '💬',
        label: 'Script DM funnel',
        description: 'Conversación de DMs lista para cerrar ventas',
        params: [
          { name: 'product', label: 'Producto/servicio', type: 'text', placeholder: 'Ej: pack de templates premium' },
          {
            name: 'objection',
            label: 'Objeción más común',
            type: 'select',
            options: ['precio muy alto', 'necesito pensarlo', 'no tengo tiempo', 'no sé si funciona para mí', 'otra'],
          },
        ],
      },
      {
        id: 'social-proof',
        icon: '⭐',
        label: 'Kit de social proof',
        description: 'Estrategia completa para mostrar resultados',
        params: [
          {
            name: 'results',
            label: 'Resultados de tus clientes',
            type: 'textarea',
            placeholder: 'Ej: duplican ingresos en 3 meses...',
          },
        ],
      },
      {
        id: 'cta-generator',
        icon: '🎯',
        label: 'CTAs que convierten',
        description: '10 variantes de CTA para tu oferta',
        params: [
          {
            name: 'goal',
            label: 'Acción deseada',
            type: 'select',
            options: ['comprar', 'enviar DM', 'click al link', 'guardar', 'comentar', 'agendar llamada'],
          },
          { name: 'offer', label: 'Oferta', type: 'text', placeholder: 'Ej: ebook gratuito de captación de clientes' },
        ],
      },
      {
        id: 'launch-plan',
        icon: '🚀',
        label: 'Plan de lanzamiento',
        description: 'Estrategia de lanzamiento en Instagram',
        params: [
          { name: 'product', label: 'Qué lanzás', type: 'text', placeholder: 'Ej: curso online de fotografía' },
          { name: 'days', label: 'Duración', type: 'select', options: ['3 días', '5 días', '7 días', '14 días'] },
        ],
      },
    ],
  },
  {
    id: 'community',
    name: 'Community Champion',
    emoji: '❤️',
    gradient: 'linear-gradient(135deg,#e1306c,#ff6b35)',
    tagline: 'Construí una comunidad que te ama',
    description:
      'Engagement real, cultura de comentarios, lives que convierten y campañas UGC que convierten seguidores en fans leales.',
    specialties: ['Engagement loops', 'Comment culture', 'Lives strategy', 'UGC campaigns', 'Brand rituals'],
    actions: [
      {
        id: 'engagement-plan',
        icon: '🤝',
        label: 'Plan de engagement',
        description: 'Estrategia de engagement para los próximos 30 días',
        params: [],
      },
      {
        id: 'comment-templates',
        icon: '💬',
        label: 'Templates de respuestas',
        description: 'Scripts para los comentarios más frecuentes',
        params: [
          {
            name: 'type',
            label: 'Tipo de comentario',
            type: 'select',
            options: [
              'preguntas sobre precio',
              'críticas negativas',
              'comentarios positivos',
              'preguntas técnicas',
              'trolls',
              'leads interesados',
            ],
          },
        ],
      },
      {
        id: 'live-strategy',
        icon: '📡',
        label: 'Estrategia de Lives',
        description: 'Plan de live que convierte y fideliza',
        params: [
          {
            name: 'goal',
            label: 'Objetivo del live',
            type: 'select',
            options: ['educación', 'ventas', 'Q&A', 'entretenimiento', 'lanzamiento', 'colaboración'],
          },
          {
            name: 'duration',
            label: 'Duración',
            type: 'select',
            options: ['15 min', '30 min', '45 min', '60 min', 'más de 1 hora'],
          },
        ],
      },
      {
        id: 'ugc-campaign',
        icon: '📸',
        label: 'Campaña UGC',
        description: 'Que tu comunidad cree contenido para vos',
        params: [
          {
            name: 'incentive',
            label: 'Incentivo',
            type: 'select',
            options: ['sorteo', 'reconocimiento', 'descuento', 'feature en perfil', 'ninguno'],
          },
        ],
      },
      {
        id: 'community-ritual',
        icon: '🎪',
        label: 'Ritual de comunidad',
        description: 'Creá un ritual recurrente que fidelice',
        params: [
          {
            name: 'frequency',
            label: 'Frecuencia',
            type: 'select',
            options: ['diario', 'lunes', 'miércoles', 'viernes', 'semanal', 'mensual'],
          },
        ],
      },
    ],
  },
  {
    id: 'trends',
    name: 'Trend Radar',
    emoji: '⚡',
    gradient: 'linear-gradient(135deg,#00c6ff,#0072ff)',
    tagline: 'Siempre un paso adelante en tendencias',
    description:
      'Detectá tendencias antes que todos, adaptá challenges y audios virales a tu marca con el timing perfecto.',
    specialties: ['Trend scouting', 'Audios virales', 'Challenge strategy', 'Format forecasting', 'Timing de trends'],
    actions: [
      {
        id: 'trend-scan',
        icon: '📡',
        label: 'Scan de tendencias',
        description: 'Detectá las tendencias más relevantes ahora',
        params: [
          {
            name: 'platform',
            label: 'Plataforma',
            type: 'select',
            options: ['Instagram Reels', 'TikTok→Instagram', 'Stories', 'todas'],
          },
        ],
      },
      {
        id: 'audio-strategy',
        icon: '🎵',
        label: 'Estrategia de audios',
        description: 'Qué audios usar y cómo sacarles partido',
        params: [
          {
            name: 'contentStyle',
            label: 'Estilo de contenido',
            type: 'select',
            options: ['educativo', 'entretenimiento', 'ventas', 'lifestyle', 'behind-the-scenes'],
          },
        ],
      },
      {
        id: 'trend-adaptation',
        icon: '🔄',
        label: 'Adaptar una tendencia',
        description: 'Cómo adaptar una tendencia específica a tu marca',
        params: [
          {
            name: 'trend',
            label: 'Tendencia a adaptar',
            type: 'text',
            placeholder: 'Ej: "hot takes", "day in my life"...',
          },
        ],
      },
      {
        id: 'trend-calendar',
        icon: '📆',
        label: 'Calendario de trends',
        description: 'Tendencias previstas por mes',
        params: [
          {
            name: 'month',
            label: 'Mes',
            type: 'select',
            options: [
              'enero',
              'febrero',
              'marzo',
              'abril',
              'mayo',
              'junio',
              'julio',
              'agosto',
              'septiembre',
              'octubre',
              'noviembre',
              'diciembre',
            ],
          },
        ],
      },
      {
        id: 'challenge-plan',
        icon: '🏆',
        label: 'Participar en challenge',
        description: 'Estrategia para subirse a un challenge viral',
        params: [
          { name: 'challenge', label: 'Nombre del challenge', type: 'text', placeholder: 'Ej: #10yearschallenge...' },
        ],
      },
    ],
  },
  {
    id: 'storyteller',
    name: 'Brand Narrator',
    emoji: '📖',
    gradient: 'linear-gradient(135deg,#f7971e,#bc1888)',
    tagline: 'Contá historias que conectan y venden',
    description:
      'Historia de origen, narrativas del fundador, contenido behind-the-scenes y series de contenido que generan conexión emocional duradera.',
    specialties: ['Origin story', 'Narrative arcs', 'Behind-the-scenes', 'Founder story', 'Series de contenido'],
    actions: [
      {
        id: 'origin-story',
        icon: '✨',
        label: 'Historia de origen',
        description: 'Contá el origen de tu marca en 3 formatos distintos',
        params: [
          {
            name: 'background',
            label: 'Contexto del origen',
            type: 'textarea',
            placeholder: 'De dónde vino la idea, qué problema resolvías, qué te pasó...',
          },
        ],
      },
      {
        id: 'bts-content',
        icon: '🎬',
        label: 'Ideas Behind the Scenes',
        description: '10 ideas de contenido detrás de cámaras',
        params: [
          {
            name: 'businessType',
            label: 'Tipo de negocio',
            type: 'text',
            placeholder: 'Ej: agencia de marketing, e-commerce de ropa...',
          },
        ],
      },
      {
        id: 'founder-arc',
        icon: '👤',
        label: 'Arco del fundador',
        description: 'Narrativa personal del fundador para Instagram',
        params: [
          {
            name: 'journey',
            label: 'Tu historia personal (resumen)',
            type: 'textarea',
            placeholder: 'Tu recorrido, de dónde venís, qué aprendiste...',
          },
        ],
      },
      {
        id: 'content-series',
        icon: '📺',
        label: 'Serie de contenido',
        description: 'Diseñá una serie narrativa en episodios',
        params: [
          {
            name: 'theme',
            label: 'Tema de la serie',
            type: 'text',
            placeholder: 'Ej: el proceso de lanzar un producto, errores que cometí...',
          },
        ],
      },
      {
        id: 'emotional-hook',
        icon: '💛',
        label: 'Hooks emocionales',
        description: 'Ganchos que generan conexión profunda',
        params: [
          {
            name: 'emotion',
            label: 'Emoción objetivo',
            type: 'select',
            options: ['esperanza', 'nostalgia', 'orgullo', 'empatía', 'inspiración', 'curiosidad intensa'],
          },
        ],
      },
    ],
  },
  {
    id: 'viral',
    name: 'Viral Architect',
    emoji: '🚀',
    gradient: 'linear-gradient(135deg,#7928ca,#ff0080)',
    tagline: 'Diseñá contenido que explota orgánicamente',
    description:
      'Fórmulas virales, mapeo de emociones, mecánicas de sharing y hooks de poder para contenido con ADN viral desde el concepto.',
    specialties: ['Viral formulas', 'Emotion mapping', 'Share mechanics', 'Hook engineering', 'Contrarian takes'],
    actions: [
      {
        id: 'viral-formula',
        icon: '🧬',
        label: 'Fórmula viral',
        description: 'Construí un concepto con ADN viral',
        params: [
          {
            name: 'topic',
            label: 'Tema del contenido',
            type: 'text',
            placeholder: 'Ej: los errores de los emprendedores novatos',
          },
          { name: 'format', label: 'Formato', type: 'select', options: ['reel', 'carrusel', 'post-imagen'] },
        ],
      },
      {
        id: 'emotion-map',
        icon: '🗺️',
        label: 'Mapa emocional',
        description: 'Qué emociones activan shares en tu nicho',
        params: [],
      },
      {
        id: 'power-hooks',
        icon: '🎣',
        label: 'Hooks de poder',
        description: 'Los 10 hooks más fuertes para tu nicho',
        params: [
          {
            name: 'style',
            label: 'Estilo',
            type: 'select',
            options: [
              'contrarian',
              'secreto revelado',
              'número + promesa',
              'pregunta disruptiva',
              'historia de fracaso',
              'mix',
            ],
          },
        ],
      },
      {
        id: 'share-audit',
        icon: '🔎',
        label: 'Auditoría shareabilidad',
        description: 'Auditá tu contenido para maximizar shares',
        params: [
          {
            name: 'content',
            label: 'Descripción del contenido',
            type: 'textarea',
            placeholder: 'Describí el contenido que querés auditar...',
          },
        ],
      },
      {
        id: 'contrarian-take',
        icon: '🔥',
        label: 'Hot take viral',
        description: 'Opinión fuerte que genere debate en tu nicho',
        params: [
          {
            name: 'topic',
            label: 'Tema del nicho',
            type: 'text',
            placeholder: 'Ej: el marketing de contenidos, los coaches de Instagram...',
          },
        ],
      },
    ],
  },
  {
    id: 'growth',
    name: 'Growth Hacker',
    emoji: '📈',
    gradient: 'linear-gradient(135deg,#0f0c29,#302b63)',
    tagline: 'Crecé rápido con estrategia y datos',
    description:
      'Sprints de 30 días, hashtag domination, collabs estratégicas y bio optimization para multiplicar seguidores calificados.',
    specialties: ['Growth sprints', 'Hashtag domination', 'Collab outreach', 'Bio optimization', 'Account audits'],
    actions: [
      {
        id: 'growth-sprint',
        icon: '⚡',
        label: 'Growth sprint 30 días',
        description: 'Plan de crecimiento acelerado con acciones diarias',
        params: [
          { name: 'currentFollowers', label: 'Seguidores actuales', type: 'text', placeholder: 'Ej: 2500' },
          { name: 'targetFollowers', label: 'Objetivo en 30 días', type: 'text', placeholder: 'Ej: 10000' },
        ],
      },
      {
        id: 'hashtag-strategy',
        icon: '#️⃣',
        label: 'Estrategia de hashtags',
        description: 'Sistema completo para dominar tu nicho en hashtags',
        params: [
          {
            name: 'mainNiche',
            label: 'Nicho principal',
            type: 'text',
            placeholder: 'Ej: coaching empresarial para mujeres',
          },
        ],
      },
      {
        id: 'collab-outreach',
        icon: '🤝',
        label: 'Outreach de collabs',
        description: 'Scripts y estrategia para conseguir colaboraciones',
        params: [
          {
            name: 'collabType',
            label: 'Tipo de collab',
            type: 'select',
            options: [
              'intercambio de stories',
              'live conjunto',
              'post colaborativo',
              'giveaway conjunto',
              'mention mutua',
            ],
          },
          {
            name: 'partnerSize',
            label: 'Tamaño del partner',
            type: 'select',
            options: ['similar al mío', 'más grande (10x)', 'más pequeño', 'cualquiera'],
          },
        ],
      },
      {
        id: 'bio-optimizer',
        icon: '✨',
        label: 'Optimizador de bio',
        description: 'Bio que convierte visitantes en seguidores',
        params: [{ name: 'currentBio', label: 'Bio actual', type: 'textarea', placeholder: 'Pegá tu bio actual...' }],
      },
      {
        id: 'account-audit',
        icon: '🔍',
        label: 'Auditoría de cuenta',
        description: 'Diagnóstico completo + plan de mejora',
        params: [
          {
            name: 'mainIssue',
            label: 'Principal problema',
            type: 'select',
            options: [
              'bajo alcance',
              'pocos seguidores nuevos',
              'buen alcance pero no convierte',
              'engagement bajo',
              'no sé cuál es',
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'strategist',
    name: 'Content Strategist',
    emoji: '🎯',
    gradient: 'linear-gradient(135deg,#2c3e50,#4ca1af)',
    tagline: 'Estrategia de contenido que genera resultados',
    description:
      'Pilares, calendarios editoriales, mix de formatos y biblioteca evergreen para publicar con intención y consistencia.',
    specialties: [
      'Content pillars',
      'Calendarios editoriales',
      'Mix de formatos',
      'Evergreen library',
      'Content batching',
    ],
    actions: [
      {
        id: 'content-pillars',
        icon: '🏛️',
        label: 'Pilares de contenido',
        description: 'Definí los pilares ideales para tu marca',
        params: [],
      },
      {
        id: 'monthly-calendar',
        icon: '📅',
        label: 'Calendario mensual',
        description: 'Plan editorial completo para el mes',
        params: [
          { name: 'postsPerWeek', label: 'Posts por semana', type: 'select', options: ['3', '4', '5', '6', '7'] },
          { name: 'includeStories', label: 'Incluir stories', type: 'select', options: ['sí', 'no'] },
        ],
      },
      {
        id: 'format-mix',
        icon: '🎨',
        label: 'Mix de formatos',
        description: 'Combinación óptima según tu objetivo',
        params: [
          {
            name: 'primaryGoal',
            label: 'Objetivo principal',
            type: 'select',
            options: ['crecimiento', 'engagement', 'ventas', 'autoridad', 'awareness'],
          },
        ],
      },
      {
        id: 'evergreen-library',
        icon: '🌲',
        label: 'Biblioteca evergreen',
        description: 'Sistema de contenido que funciona siempre',
        params: [],
      },
      {
        id: 'content-audit',
        icon: '🔎',
        label: 'Auditoría de contenido',
        description: 'Diagnóstico de tu estrategia actual',
        params: [
          {
            name: 'currentProblem',
            label: 'Problema principal',
            type: 'select',
            options: [
              'ideas para crear',
              'falta consistencia',
              'bajo engagement',
              'no genera ventas',
              'no crece el perfil',
              'no sé qué publicar',
            ],
          },
        ],
      },
    ],
  },
];

/* ─────────────────────────────────────────────────────────────
   STATE
   ───────────────────────────────────────────────────────────── */
let _currentAgentId = null;
/** @type {Map<string, Array<{role:string,content:string}>>} */
const _histories = new Map();

/* ─────────────────────────────────────────────────────────────
   RENDER HELPERS
   ───────────────────────────────────────────────────────────── */
const renderParam = (p) => {
  if (p.type === 'select') {
    return `<div class="field-group" style="margin-bottom:8px">
      <label class="field-label">${escape(p.label)}</label>
      <select class="input" name="${escape(p.name)}" data-param="${escape(p.name)}">
        <option value="">— elegir —</option>
        ${p.options.map((o) => `<option value="${escape(o)}">${escape(o)}</option>`).join('')}
      </select>
    </div>`;
  }
  if (p.type === 'textarea') {
    return `<div class="field-group" style="margin-bottom:8px">
      <label class="field-label">${escape(p.label)}</label>
      <textarea class="input" name="${escape(p.name)}" data-param="${escape(p.name)}" rows="3" placeholder="${escape(p.placeholder ?? '')}" style="resize:vertical"></textarea>
    </div>`;
  }
  return `<div class="field-group" style="margin-bottom:8px">
    <label class="field-label">${escape(p.label)}</label>
    <input class="input" type="text" name="${escape(p.name)}" data-param="${escape(p.name)}" placeholder="${escape(p.placeholder ?? '')}">
  </div>`;
};

const renderActionCard = (action) => `
  <div class="agent-action-card" data-action-id="${escape(action.id)}">
    <div class="agent-action-header">
      <span class="agent-action-icon">${action.icon}</span>
      <div style="min-width:0">
        <div class="agent-action-name">${escape(action.label)}</div>
        <div class="agent-action-desc">${escape(action.description)}</div>
      </div>
    </div>
    ${
      action.params.length
        ? `<div class="agent-action-form" id="aform-${escape(action.id)}" style="display:none">
          ${action.params.map(renderParam).join('')}
          <button class="btn gradient small agent-run-btn" data-action-id="${escape(action.id)}" style="width:100%;margin-top:6px">⚡ Ejecutar</button>
         </div>
         <button class="btn ghost small agent-toggle-btn" data-action-id="${escape(action.id)}" style="width:100%;margin-top:8px">▸ Configurar y ejecutar</button>`
        : `<button class="btn gradient small agent-run-btn" data-action-id="${escape(action.id)}" style="width:100%;margin-top:8px">⚡ Ejecutar</button>`
    }
  </div>`;

const renderResultSection = (section) => {
  const items = section.items ?? [];
  const isObject = items.length && typeof items[0] === 'object';
  return `<div class="agent-result-section">
    <div class="agent-result-section-heading">${escape(section.heading)}</div>
    <ul class="agent-result-items">
      ${items
        .map((item) =>
          isObject
            ? `<li><strong>${escape(item.label ?? '')}</strong>: ${escape(item.value ?? '')}${item.detail ? ` <em style="color:var(--text-tertiary)">— ${escape(item.detail)}</em>` : ''}</li>`
            : `<li>${escape(String(item))}</li>`,
        )
        .join('')}
    </ul>
  </div>`;
};

const renderResult = (result) => `
  <div class="agent-result-card">
    <div class="agent-result-title">✅ ${escape(result.title)}</div>
    <div class="agent-result-summary">${escape(result.summary)}</div>
    ${(result.sections ?? []).map(renderResultSection).join('')}
    ${
      result.tips?.length
        ? `
      <div class="agent-result-tips">
        <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">💡 Tips Pro</div>
        ${result.tips.map((t) => `<div class="agent-result-tip">• ${escape(t)}</div>`).join('')}
      </div>`
        : ''
    }
    ${result.cta ? `<div class="agent-result-cta">→ ${escape(result.cta)}</div>` : ''}
    <button class="btn ghost small" id="result-close-btn" style="width:100%;margin-top:12px">✕ Cerrar</button>
  </div>`;

const renderChatMessage = (msg, agent) => {
  const isUser = msg.role === 'user';
  return `<div class="chat-message ${isUser ? 'user' : 'assistant'}">
    ${!isUser ? `<div class="chat-avatar" style="background:${agent.gradient};border-radius:10px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${agent.emoji}</div>` : ''}
    <div class="chat-bubble ${isUser ? 'user' : 'assistant'}">
      <div class="chat-text">${isUser ? escape(msg.content) : (msg.html ?? escape(msg.content))}</div>
      ${
        msg.suggestions?.length
          ? `<div class="agent-chat-suggestions">
        ${msg.suggestions.map((s) => `<button class="agent-suggestion-chip">${escape(s)}</button>`).join('')}
      </div>`
          : ''
      }
      <div class="chat-meta">${new Date(msg.ts ?? Date.now()).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</div>
    </div>
    ${isUser ? `<div class="chat-user-avatar">🧑</div>` : ''}
  </div>`;
};

const renderThinking = (agent) => `
  <div class="chat-message assistant" id="agent-thinking">
    <div class="chat-avatar" style="background:${agent.gradient};border-radius:10px;width:36px;height:36px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${agent.emoji}</div>
    <div class="chat-bubble assistant">
      <div class="chat-dots"><span></span><span></span><span></span></div>
    </div>
  </div>`;

/* ─────────────────────────────────────────────────────────────
   HUB VIEW
   ───────────────────────────────────────────────────────────── */
/* Simula localmente el resultado de un agente cuando el backend está offline,
   para que la UX no se rompa. Usa la descripción + specialties del agente. */
const simulateAgentResult = (agent, action) => {
  const samples = {
    algorithm: {
      title: 'Diagnóstico de algoritmo',
      summary:
        'Tu engagement velocity está OK pero tu reach está 22% abajo del promedio del nicho. Probá publicar reels martes y jueves 19-21h (3 ventanas de mayor reach esta semana).',
      bullets: [
        '📈 Reach: 22% bajo promedio',
        '⏰ Mejor ventana: Mar/Jue 19-21h',
        '🎯 Probar 3 reels < 25s con CTA fuerte',
      ],
    },
    'meta-ads': {
      title: 'Estructura de campaña sugerida',
      summary:
        'Para tu nicho con presupuesto medio, recomiendo Advantage+ Sales con 3 audiencias: lookalike 1% (60%), interest stack (25%) y broad (15%). ROAS esperado ≥ 3.2.',
      bullets: ['🎯 Advantage+ Sales · 7d click 1d view', '💸 Daily $40-60 USD', '🧪 3 creativos × 3 hooks A/B'],
    },
    humor: {
      title: 'Idea de meme + concepto',
      summary:
        '"Lo que la gente cree que hace IA vs lo que realmente hace". Formato split-screen con caption corta + hook visual. Funciona en reels (alta retención) y carrusel (alta salvada).',
      bullets: [
        '🎭 Split-screen expectativa vs realidad',
        '⚡ Hook visual primeros 1.5s',
        '💬 CTA "etiquetá a alguien que…"',
      ],
    },
    sales: {
      title: 'Secuencia DM funnel (5 mensajes)',
      summary:
        'Flujo de DM que cierra en 5 mensajes: warm-up → qualifying → value → objection handler → close. Adaptado a tu producto/precio. Tasa de cierre esperada 8-12%.',
      bullets: [
        '1️⃣ Warm-up no-vendedor',
        '2️⃣ Pregunta de qualifying',
        '3️⃣ Valor con prueba social',
        '4️⃣ Cierre con escasez suave',
      ],
    },
    community: {
      title: 'Plan de engagement 7 días',
      summary:
        'Mix de stories interactivas (polls, sliders, preguntas), 2 lives breves (15min Q&A) y respuestas a top 50 comentarios. Engagement rate esperado +35%.',
      bullets: ['📊 3 polls + 2 sliders/día', '📡 1 live miercoles 19h', '💬 Top 50 comments respondidos en 60min'],
    },
  };
  const def = samples[agent.id] ?? {
    title: `${action.label} — listo`,
    summary: `${agent.name} preparó una propuesta para "${action.label}". Conectá el backend para ejecutarla con datos reales de tu cuenta.`,
    bullets: agent.specialties.slice(0, 3).map((s) => `• ${s}`),
  };
  return { title: def.title, summary: def.summary, bullets: def.bullets, simulated: true };
};

/* Modal con el resultado del agente */
const showAgentResultModal = (agent, action, result) => {
  document.querySelectorAll('.agent-result-modal').forEach((m) => m.remove());
  const wrap = document.createElement('div');
  wrap.className = 'agent-result-modal';
  wrap.innerHTML = `
    <div class="agent-result-backdrop"></div>
    <div class="agent-result-card">
      <div class="agent-result-header" style="background:${agent.gradient};">
        <span style="font-size:28px;">${agent.emoji}</span>
        <div style="flex:1;">
          <div style="font-size:14px;font-weight:800;">${escape(agent.name)}</div>
          <div style="font-size:11px;opacity:.85;">${escape(action.label)}</div>
        </div>
        ${result.simulated ? '<span class="agent-result-simbadge">modo local</span>' : ''}
        <button class="agent-result-close">✕</button>
      </div>
      <div class="agent-result-body">
        <h3 class="agent-result-title">${escape(result.title ?? action.label)}</h3>
        <p class="agent-result-summary">${escape(result.summary ?? '')}</p>
        ${result.bullets?.length ? `<ul class="agent-result-bullets">${result.bullets.map((b) => `<li>${escape(b)}</li>`).join('')}</ul>` : ''}
        ${result.simulated ? '<div class="agent-result-foot">⚠️ Resultado preview generado localmente. Conectá el backend para ejecutar con datos reales y guardar en historial.</div>' : ''}
      </div>
      <div class="agent-result-actions">
        <button class="btn ghost" data-close>Cerrar</button>
        <button class="btn primary" data-open-workspace>Abrir workspace del agente →</button>
      </div>
    </div>`;
  document.body.appendChild(wrap);
  const close = () => wrap.remove();
  wrap.querySelector('.agent-result-backdrop').addEventListener('click', close);
  wrap.querySelector('.agent-result-close').addEventListener('click', close);
  wrap.querySelector('[data-close]').addEventListener('click', close);
  wrap.querySelector('[data-open-workspace]').addEventListener('click', () => {
    close();
    // navegar al workspace
    const root = document.querySelector('#view') ?? document.querySelector('main');
    if (root) openAgent(root, agent.id);
  });
};

const injectLastAction = (card, title, when) => {
  if (!card) return;
  const existing = card.querySelector('.agent-last-action');
  const html = `
    <span class="agent-last-action-label">Última actividad:</span>
    <span class="agent-last-action-text">${escape(title)}</span>
    <span class="agent-last-action-time">${escape(when)}</span>`;
  if (existing) {
    existing.innerHTML = html;
  } else {
    const speciaties = card.querySelector('.agent-specialties');
    if (speciaties) {
      const div = document.createElement('div');
      div.className = 'agent-last-action';
      div.innerHTML = html;
      speciaties.insertAdjacentElement('afterend', div);
    }
  }
};

const renderHub = async (root) => {
  // Cargar status/activity de cada agente desde backend (con fallback)
  const { data: statuses } = await apiSafe('/api/agents/status', {});
  const autonomyMap = loadAutonomy();
  const activeCount = AGENTS.filter((a) => (autonomyMap[a.id] ?? 'off') !== 'off').length;
  const totalActions = AGENTS.reduce((s, a) => s + a.actions.length, 0);

  root.innerHTML = `
    <header class="view-header page-header">
      <div>
        <h1 class="view-title page-title">🤖 Agentes IA · Tu equipo autónomo</h1>
        <p class="view-subtitle page-subtitle">${AGENTS.length} especialistas trabajando para vos. Cada uno con su rol, con o sin supervisión. Como tener un equipo de profesionales de élite siempre disponible.</p>
      </div>
    </header>

    <div class="page-body">
      <!-- Stats del equipo -->
      <div class="agents-stats-row">
        <div class="agents-stat">
          <div class="agents-stat-num">${AGENTS.length}</div>
          <div class="agents-stat-lbl">agentes especialistas</div>
        </div>
        <div class="agents-stat">
          <div class="agents-stat-num" style="color:#4ade80;">${activeCount}</div>
          <div class="agents-stat-lbl">activos ahora</div>
        </div>
        <div class="agents-stat">
          <div class="agents-stat-num">${totalActions}</div>
          <div class="agents-stat-lbl">automatizaciones disponibles</div>
        </div>
        <div class="agents-stat">
          <div class="agents-stat-num">24/7</div>
          <div class="agents-stat-lbl">disponibilidad</div>
        </div>
      </div>

      <!-- Bulk actions -->
      <div class="agents-bulk-bar">
        <strong>Control del equipo:</strong>
        <button class="btn ghost small" data-bulk="off">⏸️ Pausar todos</button>
        <button class="btn ghost small" data-bulk="supervised">👁️ Todos supervisados</button>
        <button class="btn primary small" data-bulk="auto">🚀 Todos en auto</button>
        <span class="small muted" style="margin-left:auto;">El modo se aplica también desde la flechita del topbar Computer Use.</span>
      </div>

      <!-- Grid de agentes con autonomy + status -->
      <div class="agents-grid">
        ${AGENTS.map((agent) => {
          const mode = autonomyMap[agent.id] ?? 'off';
          const st = statuses?.[agent.id];
          const lastAction = st?.lastAction;
          const queue = st?.queueSize ?? 0;
          return `
          <div class="agent-card" data-agent-id="${agent.id}" style="--agent-gradient:${agent.gradient}">
            <div class="agent-card-glow"></div>
            <div class="agent-card-status">
              <span class="agent-status-dot ${mode === 'off' ? 'off' : mode === 'supervised' ? 'super' : 'auto'}"></span>
              <span class="agent-status-label">${mode === 'off' ? 'Pausado' : mode === 'supervised' ? 'Supervisado' : 'Autónomo'}</span>
            </div>
            <div class="agent-card-header">
              <div class="agent-emoji">${agent.emoji}</div>
              <div class="agent-card-info">
                <div class="agent-name">${escape(agent.name)}</div>
                <div class="agent-tagline">${escape(agent.tagline)}</div>
              </div>
            </div>
            <p class="agent-card-desc">${escape(agent.description)}</p>
            <div class="agent-specialties">
              ${agent.specialties
                .slice(0, 3)
                .map((s) => `<span class="agent-specialty-chip">${escape(s)}</span>`)
                .join('')}
              ${agent.specialties.length > 3 ? `<span class="agent-specialty-chip more">+${agent.specialties.length - 3}</span>` : ''}
            </div>

            ${
              lastAction
                ? `
              <div class="agent-last-action">
                <span class="agent-last-action-label">Última actividad:</span>
                <span class="agent-last-action-text">${escape(lastAction.title ?? '—')}</span>
                <span class="agent-last-action-time">${escape(lastAction.at ?? '')}</span>
              </div>`
                : ''
            }

            <!-- Autonomy switch -->
            <div class="agent-autonomy">
              <div class="agent-autonomy-label">Autonomía:</div>
              <div class="agent-autonomy-pills">
                <button class="agent-autonomy-pill ${mode === 'off' ? 'active' : ''}" data-mode="off" data-agent-id="${agent.id}" title="No ejecuta nada por su cuenta">🔴 Off</button>
                <button class="agent-autonomy-pill ${mode === 'supervised' ? 'active' : ''}" data-mode="supervised" data-agent-id="${agent.id}" title="Te pide aprobación para cada acción importante">👁️ Supervisado</button>
                <button class="agent-autonomy-pill ${mode === 'auto' ? 'active' : ''}" data-mode="auto" data-agent-id="${agent.id}" title="Trabaja solo sin pedir confirmación">🚀 Auto</button>
              </div>
            </div>

            <div class="agent-card-actions-row">
              <button class="btn primary small agent-open-btn" data-agent-id="${agent.id}">Abrir workspace →</button>
              <button class="btn ghost small agent-run-now" data-agent-id="${agent.id}" title="Lanzar el agente con su acción primaria ahora">⚡ Lanzar ahora</button>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>`;

  // Open agent workspace
  root.querySelectorAll('.agent-open-btn').forEach((btn) => {
    btn.addEventListener('click', () => openAgent(root, btn.dataset.agentId));
  });

  // Autonomy pills + Run-now — DELEGACIÓN a nivel root (más robusto que listeners
  // por botón, sobrevive a re-renders y atrapa todos los clicks aunque haya
  // elementos absolutos encima).
  const onHubClick = async (e) => {
    // Autonomy pill
    const pill = e.target.closest('.agent-autonomy-pill');
    if (pill) {
      e.preventDefault();
      e.stopPropagation();
      const id = pill.dataset.agentId;
      const mode = pill.dataset.mode;
      setAutonomy(id, mode);
      // Visual update sin re-render
      root.querySelectorAll(`.agent-autonomy-pill[data-agent-id="${id}"]`).forEach((p) => {
        p.classList.toggle('active', p.dataset.mode === mode);
      });
      const card = root.querySelector(`.agent-card[data-agent-id="${id}"]`);
      if (card) {
        const dot = card.querySelector('.agent-status-dot');
        const label = card.querySelector('.agent-status-label');
        if (dot)
          dot.className = `agent-status-dot ${mode === 'off' ? 'off' : mode === 'supervised' ? 'super' : 'auto'}`;
        if (label) label.textContent = mode === 'off' ? 'Pausado' : mode === 'supervised' ? 'Supervisado' : 'Autónomo';
      }
      // Backend best-effort (no bloquea la UX)
      apiSafe(`/api/agents/${id}/autonomy`, null, { method: 'PUT', body: { mode } }).catch(() => {});
      const name = AGENTS.find((a) => a.id === id)?.name ?? id;
      toast(
        `${name}: ${mode === 'off' ? '⏸️ pausado' : mode === 'supervised' ? '👁️ supervisado' : '🚀 autónomo'}`,
        'ok',
      );
      return;
    }

    // Run-now
    const runBtn = e.target.closest('.agent-run-now');
    if (runBtn) {
      e.preventDefault();
      e.stopPropagation();
      const id = runBtn.dataset.agentId;
      const agent = AGENTS.find((a) => a.id === id);
      if (!agent) return;
      const primary = agent.actions?.[0];
      if (!primary) {
        toast('Este agente no tiene acción primaria definida', 'warn');
        return;
      }
      runBtn.disabled = true;
      const original = runBtn.innerHTML;
      runBtn.innerHTML = '⏳ ejecutando…';
      const { data, error } = await apiSafe(`/api/agents/${id}/action`, null, {
        method: 'POST',
        body: { actionId: primary.id, params: {} },
      });
      // Si backend offline → simular ejecución local (UX no se rompe)
      if (error) {
        await new Promise((r) => setTimeout(r, 900)); // pequeña espera para sentir trabajo
        const sim = simulateAgentResult(agent, primary);
        showAgentResultModal(agent, primary, sim);
        // Reflejar en "última actividad" del card
        const card = root.querySelector(`.agent-card[data-agent-id="${id}"]`);
        injectLastAction(card, sim.title, 'ahora');
        toast(`✨ ${agent.name}: ${sim.title} (modo local)`, 'ok');
      } else {
        showAgentResultModal(agent, primary, data ?? {});
        const card = root.querySelector(`.agent-card[data-agent-id="${id}"]`);
        injectLastAction(card, data?.title ?? primary.label, 'ahora');
        toast(`✨ ${agent.name}: ${data?.title ?? primary.label}`, 'ok');
      }
      runBtn.disabled = false;
      runBtn.innerHTML = original;
      return;
    }
  };
  root.removeEventListener('click', root._agentsHubClick ?? (() => {}));
  root._agentsHubClick = onHubClick;
  root.addEventListener('click', onHubClick);

  // Bulk autonomy
  root.querySelectorAll('[data-bulk]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.bulk;
      const m = {};
      AGENTS.forEach((a) => {
        m[a.id] = mode;
      });
      saveAutonomy(m);
      void renderHub(root);
      toast(
        `Equipo: ${mode === 'off' ? '⏸️ pausado' : mode === 'supervised' ? '👁️ supervisado' : '🚀 autónomo'}`,
        'ok',
      );
    });
  });
};

/* ─────────────────────────────────────────────────────────────
   WORKSPACE VIEW
   ───────────────────────────────────────────────────────────── */
/* ── Automatizaciones por agente — tareas recurrentes programables ─────────── */
const AUTO_KEY = 'feedia.agents.automations';
const loadAllAutomations = () => {
  try {
    return JSON.parse(localStorage.getItem(AUTO_KEY) ?? '{}');
  } catch {
    return {};
  }
};
const saveAllAutomations = (map) => {
  try {
    localStorage.setItem(AUTO_KEY, JSON.stringify(map));
  } catch {
    /* noop */
  }
};
const getAgentAutomations = (agentId) => loadAllAutomations()[agentId] ?? [];
const setAgentAutomations = (agentId, list) => {
  const m = loadAllAutomations();
  m[agentId] = list;
  saveAllAutomations(m);
};

const FREQ_LABEL = {
  hourly: '⏰ Cada hora',
  '4h': '⏰ Cada 4 horas',
  daily: '☀️ Diario',
  weekdays: '📅 Días hábiles (L-V)',
  weekly: '📆 Semanal',
  monthly: '📅 Mensual',
};

/* Sugerencias por tipo de agente */
const AUTOMATION_SUGGESTIONS = {
  algorithm: [
    { actionId: 'timing', freq: 'daily', label: 'Detectar ventana óptima de hoy' },
    { actionId: 'shadowban', freq: 'daily', label: 'Chequeo diario shadowban' },
    { actionId: 'reach-boost', freq: 'weekly', label: 'Boost de reach semanal' },
  ],
  'meta-ads': [
    { actionId: 'roas-plan', freq: 'weekly', label: 'Revisar ROAS semanal' },
    { actionId: 'creative-brief', freq: 'weekly', label: 'Brief creativo semanal' },
  ],
  humor: [
    { actionId: 'entertainment-calendar', freq: 'weekly', label: 'Calendario humor 7 días' },
    { actionId: 'trending-humor', freq: 'daily', label: 'Detectar humor trending diario' },
  ],
  sales: [
    { actionId: 'cta-generator', freq: 'weekly', label: '10 CTAs semanales' },
    { actionId: 'story-selling', freq: 'weekly', label: 'Secuencia stories selling' },
  ],
  community: [
    { actionId: 'engagement-plan', freq: 'weekly', label: 'Plan engagement 7 días' },
    { actionId: 'comment-templates', freq: 'daily', label: 'Templates de comentarios al día' },
  ],
};

const renderAutomationsPanel = (agent) => {
  const automations = getAgentAutomations(agent.id);
  const suggestions = AUTOMATION_SUGGESTIONS[agent.id] ?? [];
  return `
    <div style="padding:16px;">
      <div style="margin-bottom:14px;">
        <h3 style="margin:0 0 4px;font-size:16px;">🔁 Automatizaciones de ${escape(agent.name)}</h3>
        <p class="small muted" style="margin:0;line-height:1.5;">
          Programá tareas recurrentes. ${escape(agent.name)} las ejecuta solo (o pide aprobación según su modo de autonomía).
        </p>
      </div>

      <!-- Nueva automatización -->
      <div class="agent-auto-new">
        <h4 style="margin:0 0 10px;font-size:13px;">➕ Nueva automatización</h4>
        <div class="agent-auto-form">
          <select id="auto-action" class="input">
            <option value="">— Acción —</option>
            ${agent.actions.map((a) => `<option value="${escape(a.id)}">${a.icon ?? '⚙️'} ${escape(a.label)}</option>`).join('')}
          </select>
          <select id="auto-freq" class="input">
            ${Object.entries(FREQ_LABEL)
              .map(([k, v]) => `<option value="${k}">${v}</option>`)
              .join('')}
          </select>
          <button class="btn primary" id="auto-add">Agregar</button>
        </div>
      </div>

      ${
        suggestions.length
          ? `
        <div class="agent-auto-suggestions">
          <h4 style="margin:14px 0 6px;font-size:12px;color:var(--text-muted,#9CA3AF);text-transform:uppercase;letter-spacing:.05em;">💡 Sugerencias para este agente</h4>
          <div class="agent-auto-sugg-list">
            ${suggestions
              .map((s) => {
                const a = agent.actions.find((x) => x.id === s.actionId);
                if (!a) return '';
                return `<button class="agent-auto-sugg-btn" data-sugg-action="${escape(s.actionId)}" data-sugg-freq="${escape(s.freq)}">
                <span>${a.icon ?? '⚙️'} ${escape(s.label)}</span>
                <span class="agent-auto-sugg-freq">${FREQ_LABEL[s.freq]}</span>
              </button>`;
              })
              .join('')}
          </div>
        </div>`
          : ''
      }

      <!-- Lista de automatizaciones activas -->
      <div class="agent-auto-list" id="agent-auto-list" style="margin-top:18px;">
        ${
          automations.length
            ? automations
                .map((a, i) => {
                  const action = agent.actions.find((x) => x.id === a.actionId);
                  return `
            <div class="agent-auto-item" data-idx="${i}">
              <span class="agent-auto-toggle ${a.enabled ? 'on' : 'off'}" data-toggle="${i}">${a.enabled ? '🟢' : '⚪'}</span>
              <div class="agent-auto-info">
                <div class="agent-auto-name">${action?.icon ?? '⚙️'} ${escape(action?.label ?? a.actionId)}</div>
                <div class="agent-auto-meta">${FREQ_LABEL[a.freq] ?? a.freq} · ${a.lastRun ? `última ejecución: ${escape(a.lastRun)}` : 'nunca ejecutada'}</div>
              </div>
              <button class="agent-auto-run" data-run="${i}" title="Ejecutar ahora">▶</button>
              <button class="agent-auto-del" data-del="${i}" title="Eliminar">🗑</button>
            </div>`;
                })
                .join('')
            : '<div class="muted small" style="text-align:center;padding:24px;background:rgba(255,255,255,.02);border-radius:10px;">Sin automatizaciones todavía. Creá una arriba o elegí una sugerencia.</div>'
        }
      </div>
    </div>

    <style>
      .agent-auto-new { background:rgba(255,255,255,.03); padding:14px; border-radius:12px; border:1px solid var(--border); }
      .agent-auto-form { display:grid; grid-template-columns:1fr 1fr auto; gap:8px; }
      .agent-auto-form .input { font-size:12.5px; }
      @media (max-width:640px){ .agent-auto-form { grid-template-columns:1fr; } }
      .agent-auto-sugg-list { display:flex; flex-direction:column; gap:6px; }
      .agent-auto-sugg-btn {
        display:flex; justify-content:space-between; align-items:center; gap:10px;
        padding:9px 12px; border-radius:8px;
        background:rgba(168,85,247,.06); border:1px solid rgba(168,85,247,.2);
        color:var(--fg,#fff); cursor:pointer; font-size:12.5px;
      }
      .agent-auto-sugg-btn:hover { background:rgba(168,85,247,.12); }
      .agent-auto-sugg-freq { font-size:10.5px; color:var(--text-muted,#9CA3AF); }
      .agent-auto-item {
        display:flex; align-items:center; gap:10px; padding:11px 12px;
        background:var(--surface,#141418); border:1px solid var(--border);
        border-radius:10px; margin-bottom:6px;
      }
      .agent-auto-toggle { font-size:16px; cursor:pointer; flex-shrink:0; user-select:none; }
      .agent-auto-info { flex:1; min-width:0; }
      .agent-auto-name { font-weight:600; font-size:13px; }
      .agent-auto-meta { font-size:11px; color:var(--text-muted,#9CA3AF); margin-top:2px; }
      .agent-auto-run, .agent-auto-del {
        background:transparent; border:0; cursor:pointer; padding:6px 8px; border-radius:6px;
        color:var(--fg,#fff); font-size:14px;
      }
      .agent-auto-run:hover { background:rgba(16,185,129,.15); color:#10b981; }
      .agent-auto-del:hover { background:rgba(239,68,68,.15); color:#ef4444; }

      .agent-ws-tabs {
        display:flex; gap:4px; padding:8px 14px 0;
        border-bottom:1px solid var(--border);
      }
      .agent-ws-tab {
        background:transparent; border:0; padding:10px 14px; cursor:pointer;
        color:var(--text-muted,#9CA3AF); font-size:13px; font-weight:600;
        border-bottom:2px solid transparent; margin-bottom:-1px;
      }
      .agent-ws-tab.active {
        color:var(--fg,#fff); border-bottom-color:#a855f7;
      }
    </style>`;
};

const wireAutomations = (root, agent) => {
  const refresh = () => {
    const pane = root.querySelector('[data-ws-pane="automations"]');
    if (pane) {
      pane.innerHTML = renderAutomationsPanel(agent).replace(
        /^[\s\S]*<div style="padding:16px;">/,
        '<div style="padding:16px;">',
      );
      wireAutomations(root, agent);
    }
  };

  // Add
  root.querySelector('#auto-add')?.addEventListener('click', () => {
    const actionId = root.querySelector('#auto-action')?.value;
    const freq = root.querySelector('#auto-freq')?.value;
    if (!actionId) {
      toast('Elegí una acción', 'warn');
      return;
    }
    const list = getAgentAutomations(agent.id);
    list.push({ actionId, freq, enabled: true, lastRun: null, createdAt: new Date().toISOString() });
    setAgentAutomations(agent.id, list);
    apiSafe(`/api/agents/${agent.id}/automations`, null, { method: 'POST', body: { actionId, freq } }).catch(() => {});
    toast(`✅ Automatización agregada · ${FREQ_LABEL[freq] ?? freq}`, 'ok');
    refresh();
  });

  // Suggestions
  root.querySelectorAll('[data-sugg-action]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const list = getAgentAutomations(agent.id);
      list.push({
        actionId: btn.dataset.suggAction,
        freq: btn.dataset.suggFreq,
        enabled: true,
        lastRun: null,
        createdAt: new Date().toISOString(),
      });
      setAgentAutomations(agent.id, list);
      toast('✅ Automatización sugerida activada', 'ok');
      refresh();
    });
  });

  // Toggle enable/disable
  root.querySelectorAll('[data-toggle]').forEach((el) => {
    el.addEventListener('click', () => {
      const idx = Number(el.dataset.toggle);
      const list = getAgentAutomations(agent.id);
      if (!list[idx]) return;
      list[idx].enabled = !list[idx].enabled;
      setAgentAutomations(agent.id, list);
      toast(list[idx].enabled ? '🟢 Activada' : '⚪ Pausada', 'info');
      refresh();
    });
  });

  // Run now
  root.querySelectorAll('[data-run]').forEach((el) => {
    el.addEventListener('click', async () => {
      const idx = Number(el.dataset.run);
      const list = getAgentAutomations(agent.id);
      if (!list[idx]) return;
      const action = agent.actions.find((a) => a.id === list[idx].actionId);
      if (!action) return;
      el.disabled = true;
      el.textContent = '⏳';
      const { data, error } = await apiSafe(`/api/agents/${agent.id}/action`, null, {
        method: 'POST',
        body: { actionId: action.id, params: {} },
      });
      el.disabled = false;
      el.textContent = '▶';
      const result = error ? simulateAgentResult(agent, action) : (data ?? {});
      showAgentResultModal(agent, action, result);
      list[idx].lastRun = new Date().toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' });
      setAgentAutomations(agent.id, list);
      refresh();
    });
  });

  // Delete
  root.querySelectorAll('[data-del]').forEach((el) => {
    el.addEventListener('click', () => {
      const idx = Number(el.dataset.del);
      const list = getAgentAutomations(agent.id);
      list.splice(idx, 1);
      setAgentAutomations(agent.id, list);
      toast('Automatización eliminada', 'info');
      refresh();
    });
  });
};

const openAgent = (root, agentId) => {
  const agent = AGENTS.find((a) => a.id === agentId);
  if (!agent) return;
  _currentAgentId = agentId;
  if (!_histories.has(agentId)) _histories.set(agentId, []);

  root.innerHTML = `
    <div class="agent-workspace">
      <div class="agent-workspace-header" style="background:${agent.gradient}">
        <button class="btn ghost small" id="back-to-hub-btn" style="color:#fff;border-color:rgba(255,255,255,.3);flex-shrink:0">← Agentes</button>
        <div class="agent-workspace-title">
          <span style="font-size:34px;line-height:1">${agent.emoji}</span>
          <div>
            <div style="font-size:18px;font-weight:800;color:#fff">${escape(agent.name)}</div>
            <div style="font-size:12.5px;color:rgba(255,255,255,.75)">${escape(agent.tagline)}</div>
          </div>
        </div>
        <div class="agent-specialties" style="flex:1;justify-content:flex-end">
          ${agent.specialties.map((s) => `<span class="agent-specialty-chip" style="border-color:rgba(255,255,255,.25);color:rgba(255,255,255,.85)">${escape(s)}</span>`).join('')}
        </div>
      </div>

      <!-- Tabs del workspace -->
      <div class="agent-ws-tabs">
        <button class="agent-ws-tab active" data-ws="actions">⚡ Acciones rápidas</button>
        <button class="agent-ws-tab" data-ws="automations">🔁 Automatizaciones</button>
        <button class="agent-ws-tab" data-ws="chat">💬 Chat</button>
      </div>

      <div class="agent-workspace-body">
        <!-- LEFT: Actions panel -->
        <div class="agent-actions-panel" data-ws-pane="actions">
          <div style="padding:14px 16px 0;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--text-tertiary)">
            Acciones rápidas
          </div>
          <div class="agent-actions-list">
            ${agent.actions.map(renderActionCard).join('')}
          </div>
          <div class="agent-result-area" id="action-result-area" style="display:none"></div>
        </div>

        <!-- MID: Automatizaciones -->
        <div class="agent-automations-panel" data-ws-pane="automations" hidden>
          ${renderAutomationsPanel(agent)}
        </div>

        <!-- RIGHT: Chat panel -->
        <div class="agent-chat-panel" data-ws-pane="chat" hidden>
          <div id="agent-chat-messages" class="agent-chat-messages"></div>
          <div class="agent-chat-input-area">
            <textarea class="chat-input" id="agent-chat-input" placeholder="Preguntale a ${escape(agent.name)}…" rows="1"></textarea>
            <button class="btn gradient chat-send-btn" id="agent-send-btn" style="flex-shrink:0;border-radius:12px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="18" height="18"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            </button>
          </div>
        </div>
      </div>
    </div>`;

  // Tab switching
  root.querySelectorAll('.agent-ws-tab').forEach((tab) => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.ws;
      root.querySelectorAll('.agent-ws-tab').forEach((t) => t.classList.toggle('active', t === tab));
      root.querySelectorAll('[data-ws-pane]').forEach((p) => (p.hidden = p.dataset.wsPane !== target));
    });
  });

  // Wire automations
  wireAutomations(root, agent);

  // Back button
  root.querySelector('#back-to-hub-btn')?.addEventListener('click', () => {
    void renderHub(root);
  });

  // Render existing chat history
  refreshChat(root, agent);

  // Action cards — toggle form / run
  root.querySelectorAll('.agent-toggle-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const aid = btn.dataset.actionId;
      const form = root.querySelector(`#aform-${aid}`);
      if (!form) return;
      const isOpen = form.style.display !== 'none';
      form.style.display = isOpen ? 'none' : 'flex';
      form.style.flexDirection = 'column';
      btn.textContent = isOpen ? '▸ Configurar y ejecutar' : '▴ Cerrar';
    });
  });

  root.querySelectorAll('.agent-run-btn').forEach((btn) => {
    btn.addEventListener('click', () => runAction(root, agent, btn.dataset.actionId));
  });

  // Chat send
  const input = root.querySelector('#agent-chat-input');
  const sendBtn = root.querySelector('#agent-send-btn');
  sendBtn?.addEventListener('click', () => {
    const text = input?.value?.trim();
    if (text) {
      input.value = '';
      sendAgentMessage(root, agent, text);
    }
  });
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const text = input.value.trim();
      if (text) {
        input.value = '';
        sendAgentMessage(root, agent, text);
      }
    }
  });
  input?.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 120) + 'px';
  });

  // Welcome message if first time
  const history = _histories.get(agentId) ?? [];
  if (!history.length) {
    setTimeout(() => {
      const welcomeMsg = {
        role: 'assistant',
        content: `¡Hola! Soy ${agent.name}. ${agent.description} ¿En qué te puedo ayudar hoy?`,
        html: `¡Hola! Soy <strong>${agent.name}</strong>. ${escape(agent.description)}<br><br>Podés usar las <strong>Acciones rápidas</strong> de la izquierda para resultados inmediatos, o simplemente preguntarme lo que necesitás. ¿Por dónde empezamos?`,
        ts: Date.now(),
      };
      history.push(welcomeMsg);
      _histories.set(agentId, history);
      refreshChat(root, agent);
    }, 100);
  }
};

/* ─────────────────────────────────────────────────────────────
   CHAT LOGIC
   ───────────────────────────────────────────────────────────── */
const refreshChat = (root, agent) => {
  const chatEl = root.querySelector('#agent-chat-messages');
  if (!chatEl) return;
  const history = _histories.get(agent.id) ?? [];
  if (!history.length) {
    chatEl.innerHTML = `<div style="flex:1;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px;padding:40px;text-align:center">
      <div style="font-size:48px">${agent.emoji}</div>
      <div style="font-size:16px;font-weight:700">${escape(agent.name)}</div>
      <div style="font-size:13px;color:var(--text-secondary);max-width:260px;line-height:1.6">${escape(agent.tagline)}</div>
    </div>`;
    return;
  }
  chatEl.innerHTML = history.map((m) => renderChatMessage(m, agent)).join('');
  chatEl.scrollTop = chatEl.scrollHeight;

  // Wire suggestion chips
  chatEl.querySelectorAll('.agent-suggestion-chip').forEach((chip) => {
    chip.addEventListener('click', () => sendAgentMessage(root, agent, chip.textContent ?? ''));
  });
};

let _isThinking = false;

const sendAgentMessage = async (root, agent, text) => {
  if (_isThinking) return;
  _isThinking = true;

  const history = _histories.get(agent.id) ?? [];
  history.push({ role: 'user', content: text, ts: Date.now() });
  _histories.set(agent.id, history);

  const chatEl = root.querySelector('#agent-chat-messages');
  const sendBtn = root.querySelector('#agent-send-btn');
  if (sendBtn) sendBtn.disabled = true;
  if (chatEl) {
    chatEl.innerHTML = history.map((m) => renderChatMessage(m, agent)).join('') + renderThinking(agent);
    chatEl.scrollTop = chatEl.scrollHeight;
  }

  try {
    const res = await api(`/api/agents/${agent.id}/chat`, {
      body: {
        message: text,
        history: history.slice(-10, -1).map((m) => ({ role: m.role, content: m.content })),
      },
    });
    history.push({
      role: 'assistant',
      content: res.reply ?? '',
      html: res.replyHtml ?? escape(res.reply ?? ''),
      suggestions: res.suggestions ?? [],
      ts: Date.now(),
    });
    _histories.set(agent.id, history);
  } catch (err) {
    history.push({ role: 'assistant', content: `Lo siento, hubo un error: ${err.message}`, ts: Date.now() });
    _histories.set(agent.id, history);
    toast(err.message, 'crit');
  } finally {
    _isThinking = false;
    if (sendBtn) sendBtn.disabled = false;
    refreshChat(root, agent);
  }
};

/* ─────────────────────────────────────────────────────────────
   ACTION EXECUTION
   ───────────────────────────────────────────────────────────── */
const runAction = async (root, agent, actionId) => {
  const action = agent.actions.find((a) => a.id === actionId);
  if (!action) return;

  // Collect params from form
  const params = {};
  if (action.params.length) {
    const form = root.querySelector(`#aform-${actionId}`);
    if (form) {
      form.querySelectorAll('[data-param]').forEach((el) => {
        params[el.dataset.param] = el.value?.trim() ?? '';
      });
    }
  }

  // Show loading in result area
  const resultArea = root.querySelector('#action-result-area');
  if (resultArea) {
    resultArea.style.display = 'block';
    resultArea.innerHTML = `<div style="padding:20px;text-align:center"><span class="spinner lg"></span><div class="small muted" style="margin-top:12px">⚡ ${escape(agent.name)} está generando…</div></div>`;
  }

  // Also show in chat that action is running
  const history = _histories.get(agent.id) ?? [];
  history.push({ role: 'user', content: `[Acción: ${action.label}]`, ts: Date.now() });
  _histories.set(agent.id, history);

  try {
    const result = await api(`/api/agents/${agent.id}/action`, {
      body: { actionId, params },
    });
    if (resultArea) {
      resultArea.innerHTML = renderResult(result);
      resultArea.querySelector('#result-close-btn')?.addEventListener('click', () => {
        resultArea.style.display = 'none';
      });
      resultArea.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    // Add summary to chat
    history.push({
      role: 'assistant',
      content: result.summary ?? result.title ?? 'Acción completada.',
      html: `<strong>✅ ${escape(result.title)}</strong><br><br>${escape(result.summary ?? '')}`,
      ts: Date.now(),
    });
    _histories.set(agent.id, history);
    refreshChat(root, agent);
    toast('Acción completada ✓', 'ok');
  } catch (err) {
    if (resultArea) {
      resultArea.innerHTML = `<div class="alert crit" style="margin:0">⚠️ Error: ${escape(err.message)}</div>`;
    }
    toast(err.message, 'crit');
  }
};

/* ─────────────────────────────────────────────────────────────
   ENTRY POINT
   ───────────────────────────────────────────────────────────── */
// /frontend-design enterprise: cards blancas legibles para Agentes IA.
if (typeof document !== 'undefined' && !document.getElementById('fd-agents-style')) {
  const st = document.createElement('style');
  st.id = 'fd-agents-style';
  st.textContent = `
    .agent-card{background:#fff !important;border:1px solid #E6E8EE !important;border-radius:16px !important;padding:18px !important;color:#15181E !important;box-shadow:0 1px 2px rgba(16,24,40,.04);transition:transform .15s,box-shadow .15s,border-color .15s;}
    .agent-card:hover{transform:translateY(-3px);border-color:#9da9ff !important;box-shadow:0 12px 32px rgba(124,58,237,.14) !important;}
    .agent-card .agent-card-glow{display:none;}
    .agent-card-info h3,.agent-card-info strong,.agent-card-info .agent-name{color:#15181E !important;}
    .agent-card-desc{color:#475067 !important;line-height:1.5;}
    .agent-card-status{color:#10B981;}
    .agents-stats-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:14px;}
    .agents-stat{background:#fff;border:1px solid #E6E8EE;border-radius:12px;padding:12px;color:#15181E;}
    .agents-stat-num{font-size:22px;font-weight:800;color:#15181E;line-height:1;}
    .agents-stat-lbl{font-size:11px;color:#667085;text-transform:uppercase;letter-spacing:.04em;margin-top:6px;font-weight:600;}
    .agents-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;}
    .agents-bulk-bar{background:#fff;border:1px solid #E6E8EE;border-radius:12px;padding:10px 14px;color:#15181E;}
  `;
  document.head.appendChild(st);
}

export const renderAgents = async (root) => {
  _currentAgentId = null;
  _isThinking = false;
  root.innerHTML = loadingScreen('Cargando agentes…');
  // Small delay to let spinner show, then render hub
  await new Promise((r) => setTimeout(r, 80));
  await renderHub(root);
};
