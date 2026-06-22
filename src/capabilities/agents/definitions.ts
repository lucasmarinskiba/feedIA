import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';

export interface AgentParam {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  placeholder?: string;
  options?: string[];
  required?: boolean;
}

export interface AgentAction {
  id: string;
  icon: string;
  label: string;
  description: string;
  params: AgentParam[];
}

export interface AgentDefinition {
  id: string;
  name: string;
  emoji: string;
  gradient: string;
  tagline: string;
  description: string;
  specialties: string[];
  systemPrompt: (brand: BrandProfile) => string;
  actions: AgentAction[];
}

export const AGENTS: AgentDefinition[] = [
  {
    id: 'algorithm',
    name: 'Algorithm Master',
    emoji: '🧠',
    gradient: 'linear-gradient(135deg,#1a1f6b,#3451d1)',
    tagline: 'Domina el algoritmo de Instagram',
    description: 'Experto en señales de ranking, página Explore, shadowban, timing y alcance orgánico.',
    specialties: ['Ranking signals', 'Explore page', 'Shadowban', 'Timing óptimo', 'Engagement velocity'],
    systemPrompt: (
      brand: BrandProfile,
    ): string => `Sos el Algorithm Master, experto absoluto en el algoritmo de Instagram.

${brandContext(brand)}

Tu especialidad es el funcionamiento interno del algoritmo de Instagram: señales de ranking, página Explore, detección de shadowban, timing óptimo de publicación, alcance orgánico, engagement velocity, completion rate, guardados, estrategia de hashtags y todos los factores que determinan si un contenido llega masivamente o se hunde.

Respondé siempre en español rioplatense. Sé extremadamente específico, usá datos concretos, porcentajes y ejemplos reales. Nunca des respuestas genéricas.`,
    actions: [
      {
        id: 'timing',
        icon: '⏰',
        label: 'Timing óptimo',
        description: 'Calculá el mejor horario para publicar según formato y objetivo',
        params: [
          {
            name: 'format',
            label: 'Formato',
            type: 'select',
            options: ['reel', 'carrusel', 'post-imagen', 'historia'],
            required: true,
          },
          {
            name: 'goal',
            label: 'Objetivo',
            type: 'select',
            options: ['alcance', 'engagement', 'explore', 'guardados'],
            required: true,
          },
        ],
      },
      {
        id: 'shadowban',
        icon: '🚫',
        label: 'Diagnóstico shadowban',
        description: 'Detectá si tu cuenta está shadowbanned y cómo salir',
        params: [
          {
            name: 'symptoms',
            label: 'Síntomas que notás',
            type: 'textarea',
            placeholder: 'Ej: mis publicaciones no aparecen en hashtags, el alcance bajó 80%...',
            required: true,
          },
        ],
      },
      {
        id: 'explore-strategy',
        icon: '🔍',
        label: 'Estrategia para Explore',
        description: 'Plan específico para entrar y dominar la página Explore',
        params: [
          {
            name: 'format',
            label: 'Formato principal',
            type: 'select',
            options: ['reel', 'carrusel', 'post-imagen', 'historia'],
            required: true,
          },
        ],
      },
      {
        id: 'content-score',
        icon: '📊',
        label: 'Score de contenido',
        description: 'Analizá qué score algorítmico tendría tu contenido',
        params: [
          {
            name: 'caption',
            label: 'Caption o descripción del contenido',
            type: 'textarea',
            placeholder: 'Pegá tu caption o describí el contenido...',
            required: true,
          },
          {
            name: 'format',
            label: 'Formato',
            type: 'select',
            options: ['reel', 'carrusel', 'post-imagen', 'historia'],
            required: true,
          },
        ],
      },
      {
        id: 'reach-boost',
        icon: '🚀',
        label: 'Plan de boost de alcance',
        description: 'Estrategia completa para multiplicar tu alcance orgánico',
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
    description: 'Experto en campañas Meta Ads, audiencias, creativos y optimización de ROAS.',
    specialties: ['CBO/ABO', 'Lookalike audiences', 'Creative testing', 'ROAS', 'Retargeting'],
    systemPrompt: (
      brand: BrandProfile,
    ): string => `Sos Meta Ads Pro, experto en campañas de Meta Ads (Facebook e Instagram Ads).

${brandContext(brand)}

Tu especialidad abarca: estructura de campañas CBO y ABO, audiencias lookalike, testing de creativos, optimización de ROAS, Pixel de Meta, funnels de retargeting, copy publicitario de alta conversión, presupuestos y escalado de campañas. Conocés todos los trucos del Ads Manager.

Respondé siempre en español rioplatense. Dá ejemplos reales con números, CTR esperados, CPC referenciales y estrategias accionables.`,
    actions: [
      {
        id: 'campaign-structure',
        icon: '🏗️',
        label: 'Estructura de campaña',
        description: 'Diseñá la estructura ideal de campaña para tu objetivo',
        params: [
          {
            name: 'goal',
            label: 'Objetivo de campaña',
            type: 'select',
            options: ['awareness', 'tráfico', 'engagement', 'leads', 'conversiones', 'ventas'],
            required: true,
          },
          {
            name: 'budget',
            label: 'Presupuesto diario (USD)',
            type: 'text',
            placeholder: 'Ej: 50',
            required: true,
          },
          {
            name: 'product',
            label: 'Producto o servicio',
            type: 'text',
            placeholder: 'Ej: curso de marketing digital online',
            required: true,
          },
        ],
      },
      {
        id: 'ad-copy',
        icon: '✍️',
        label: 'Copy publicitario',
        description: 'Generá copies de alto impacto para tus anuncios',
        params: [
          {
            name: 'offer',
            label: 'Oferta o propuesta de valor',
            type: 'textarea',
            placeholder: 'Describí qué ofrecés, el precio, el beneficio principal...',
            required: true,
          },
          {
            name: 'format',
            label: 'Formato del anuncio',
            type: 'select',
            options: ['imagen', 'video', 'carrusel', 'story'],
            required: true,
          },
        ],
      },
      {
        id: 'audience',
        icon: '🎯',
        label: 'Estrategia de audiencias',
        description: 'Definí las audiencias más rentables para tu producto',
        params: [
          {
            name: 'product',
            label: 'Producto o servicio',
            type: 'text',
            placeholder: 'Ej: consultoría de negocios online',
            required: true,
          },
        ],
      },
      {
        id: 'creative-brief',
        icon: '🎨',
        label: 'Brief de creativo',
        description: 'Brief detallado para crear el anuncio visual ideal',
        params: [
          {
            name: 'format',
            label: 'Formato del creativo',
            type: 'select',
            options: ['imagen estática', 'video 15s', 'video 30s', 'carrusel', 'story'],
            required: true,
          },
          {
            name: 'objective',
            label: 'Objetivo del anuncio',
            type: 'select',
            options: ['awareness', 'consideration', 'conversión'],
            required: true,
          },
        ],
      },
      {
        id: 'roas-plan',
        icon: '💹',
        label: 'Plan para mejorar ROAS',
        description: 'Estrategia para escalar tu ROAS actual al objetivo',
        params: [
          {
            name: 'currentRoas',
            label: 'ROAS actual',
            type: 'text',
            placeholder: 'Ej: 2.5',
            required: true,
          },
          {
            name: 'targetRoas',
            label: 'ROAS objetivo',
            type: 'text',
            placeholder: 'Ej: 5',
            required: true,
          },
          {
            name: 'budget',
            label: 'Presupuesto mensual (USD)',
            type: 'text',
            placeholder: 'Ej: 1500',
            required: true,
          },
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
    description: 'Experto en humor de nicho, memes, tendencias y patrones de comedia viral.',
    specialties: ['Memes de nicho', 'Comedy hooks', 'Humor relatable', 'Viralizacion', 'Tendencias'],
    systemPrompt: (
      brand: BrandProfile,
    ): string => `Sos el Humor Engine, experto en contenido humorístico que conecta y viraliza.

${brandContext(brand)}

Tu especialidad es el humor aplicado a marcas: memes de nicho, chistes trending, hooks de entretenimiento, patrones de comedia viral, contenido relatable, before/after, expectativa vs realidad. Sabés exactamente qué tipo de humor funciona para cada audiencia sin dañar la imagen de marca.

Respondé siempre en español rioplatense. Sé creativo, divertido y práctico. Dá ejemplos listos para usar.`,
    actions: [
      {
        id: 'meme-concept',
        icon: '😄',
        label: 'Concepto de meme',
        description: 'Creá un meme de nicho adaptado a tu marca',
        params: [
          {
            name: 'topic',
            label: 'Tema o situación',
            type: 'text',
            placeholder: 'Ej: clientes que preguntan el precio y desaparecen',
            required: true,
          },
          {
            name: 'format',
            label: 'Formato del meme',
            type: 'select',
            options: ['imagen con texto', 'video reacción', 'before/after', 'expectativa/realidad', 'libre'],
            required: true,
          },
        ],
      },
      {
        id: 'trending-humor',
        icon: '🔥',
        label: 'Humor trending',
        description: 'Adaptá una tendencia de humor actual a tu nicho',
        params: [
          {
            name: 'trend',
            label: 'Tendencia actual',
            type: 'text',
            placeholder: 'Ej: el audio de "es que no sé", el meme de la oficina...',
            required: true,
          },
        ],
      },
      {
        id: 'comedy-caption',
        icon: '✏️',
        label: 'Caption con humor',
        description: 'Reescribí tu caption para hacerlo más divertido y viral',
        params: [
          {
            name: 'originalCaption',
            label: 'Tu caption original',
            type: 'textarea',
            placeholder: 'Pegá el caption que querés mejorar...',
            required: true,
          },
          {
            name: 'humorStyle',
            label: 'Estilo de humor',
            type: 'select',
            options: ['sarcasmo suave', 'humor relatable', 'absurdo', 'wit inteligente', 'autocrítica'],
            required: true,
          },
        ],
      },
      {
        id: 'entertainment-calendar',
        icon: '📅',
        label: 'Calendario de entretenimiento',
        description: 'Plan de contenido entretenido para el mes',
        params: [],
      },
      {
        id: 'viral-comedy-hook',
        icon: '🪝',
        label: 'Hook de comedia viral',
        description: 'Creá un hook humorístico que detenga el scroll',
        params: [
          {
            name: 'topic',
            label: 'Tema del contenido',
            type: 'text',
            placeholder: 'Ej: errores comunes de emprendedores',
            required: true,
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
    description: 'Experto en ventas por stories, funnels de DM y estrategias de conversión.',
    specialties: ['Story selling', 'DM funnels', 'Prueba social', 'Manejo de objeciones', 'Lanzamientos'],
    systemPrompt: (brand: BrandProfile): string => `Sos Sales Machine, experto en ventas a través de Instagram.

${brandContext(brand)}

Tu especialidad son las secuencias de venta por stories, funnels de DM, prueba social estratégica, posicionamiento de ofertas, optimización de CTAs, estrategias de lanzamiento y manejo de objeciones. Convertís seguidores en clientes sin parecer un vendedor desesperado.

Respondé siempre en español rioplatense. Dá scripts listos para usar, secuencias paso a paso y ejemplos de copy de ventas real.`,
    actions: [
      {
        id: 'story-selling',
        icon: '📖',
        label: 'Secuencia de venta por stories',
        description: 'Diseñá una secuencia de stories que venda sin ser invasivo',
        params: [
          {
            name: 'product',
            label: 'Producto o servicio',
            type: 'text',
            placeholder: 'Ej: mentoría grupal de 8 semanas',
            required: true,
          },
          {
            name: 'price',
            label: 'Precio',
            type: 'text',
            placeholder: 'Ej: USD 497',
            required: true,
          },
          {
            name: 'audience',
            label: 'A quién va dirigido',
            type: 'text',
            placeholder: 'Ej: emprendedoras de 25-40 años que quieren escalar',
            required: true,
          },
        ],
      },
      {
        id: 'dm-funnel',
        icon: '💬',
        label: 'Funnel de DM',
        description: 'Secuencia de mensajes para convertir leads en clientes',
        params: [
          {
            name: 'product',
            label: 'Producto o servicio',
            type: 'text',
            placeholder: 'Ej: consultoría 1:1',
            required: true,
          },
          {
            name: 'objection',
            label: 'Objeción principal',
            type: 'select',
            options: ['precio muy alto', 'necesito pensarlo', 'no tengo tiempo', 'no sé si funciona para mí', 'otra'],
            required: true,
          },
        ],
      },
      {
        id: 'social-proof',
        icon: '⭐',
        label: 'Estrategia de prueba social',
        description: 'Usá testimonios y resultados para vender más',
        params: [
          {
            name: 'results',
            label: 'Resultados de clientes que tenés',
            type: 'textarea',
            placeholder: 'Ej: María aumentó sus ventas 300%, Juan consiguió 50 clientes en 30 días...',
            required: true,
          },
        ],
      },
      {
        id: 'cta-generator',
        icon: '🎯',
        label: 'Generador de CTAs',
        description: 'CTAs irresistibles para cada objetivo de conversión',
        params: [
          {
            name: 'goal',
            label: 'Objetivo del CTA',
            type: 'select',
            options: ['comprar', 'enviar DM', 'click al link', 'guardar', 'comentar', 'agendar llamada'],
            required: true,
          },
          {
            name: 'offer',
            label: 'Oferta o incentivo',
            type: 'text',
            placeholder: 'Ej: descuento del 30% por 48hs',
            required: false,
          },
        ],
      },
      {
        id: 'launch-plan',
        icon: '🚀',
        label: 'Plan de lanzamiento',
        description: 'Estrategia completa de lanzamiento de producto',
        params: [
          {
            name: 'product',
            label: 'Producto o servicio a lanzar',
            type: 'text',
            placeholder: 'Ej: programa online de fitness',
            required: true,
          },
          {
            name: 'days',
            label: 'Duración del lanzamiento',
            type: 'select',
            options: ['3 días', '5 días', '7 días', '14 días'],
            required: true,
          },
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
    description: 'Experto en engagement, cultura de comentarios, lives, UGC y rituales de comunidad.',
    specialties: ['Engagement loops', 'Cultura de comentarios', 'Lives', 'UGC', 'Rituales de marca'],
    systemPrompt: (
      brand: BrandProfile,
    ): string => `Sos Community Champion, experto en construcción de comunidades en Instagram.

${brandContext(brand)}

Tu especialidad son los loops de engagement, cultura de comentarios, estrategia de lives, campañas de UGC, embajadores de marca, rituales de comunidad, encuestas y manejo de comentarios negativos. Construís comunidades que aman la marca y generan ventas orgánicas.

Respondé siempre en español rioplatense. Dá plantillas listas para usar, scripts de respuesta y estrategias concretas.`,
    actions: [
      {
        id: 'engagement-plan',
        icon: '💫',
        label: 'Plan de engagement',
        description: 'Estrategia completa para multiplicar el engagement de tu cuenta',
        params: [],
      },
      {
        id: 'comment-templates',
        icon: '💬',
        label: 'Plantillas de respuesta',
        description: 'Respuestas perfectas para cada tipo de comentario',
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
            required: true,
          },
        ],
      },
      {
        id: 'live-strategy',
        icon: '📺',
        label: 'Estrategia de live',
        description: 'Plan completo para hacer un live exitoso',
        params: [
          {
            name: 'goal',
            label: 'Objetivo del live',
            type: 'select',
            options: ['educación', 'ventas', 'Q&A', 'entretenimiento', 'lanzamiento', 'colaboración'],
            required: true,
          },
          {
            name: 'duration',
            label: 'Duración planificada',
            type: 'select',
            options: ['15 min', '30 min', '45 min', '60 min', 'más de 1 hora'],
            required: true,
          },
        ],
      },
      {
        id: 'ugc-campaign',
        icon: '📸',
        label: 'Campaña UGC',
        description: 'Diseñá una campaña para que tu comunidad cree contenido para vos',
        params: [
          {
            name: 'incentive',
            label: 'Incentivo para participar',
            type: 'select',
            options: ['sorteo', 'reconocimiento', 'descuento', 'feature en perfil', 'ninguno'],
            required: true,
          },
        ],
      },
      {
        id: 'community-ritual',
        icon: '🎪',
        label: 'Ritual de comunidad',
        description: 'Creá un ritual recurrente que fidelice a tu audiencia',
        params: [
          {
            name: 'frequency',
            label: 'Frecuencia del ritual',
            type: 'select',
            options: ['diario', 'lunes', 'miércoles', 'viernes', 'semanal', 'mensual'],
            required: true,
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
    description: 'Experto en scouting de tendencias, audios virales y lifecycle de trends.',
    specialties: ['Trend scouting', 'Audios virales', 'Challenges', 'Forecasting', 'Momentos culturales'],
    systemPrompt: (
      brand: BrandProfile,
    ): string => `Sos Trend Radar, experto en detectar y aprovechar tendencias en Instagram.

${brandContext(brand)}

Tu especialidad es el scouting de tendencias, estrategia de audios virales, challenges, forecasting de formatos, momentos culturales, ciclo de vida de las tendencias y análisis de tendencias de la competencia. Siempre estás adelante del algoritmo.

Respondé siempre en español rioplatense. Sé específico sobre cómo adaptar cada tendencia a la marca y el timing ideal.`,
    actions: [
      {
        id: 'trend-scan',
        icon: '📡',
        label: 'Scan de tendencias',
        description: 'Detectá las tendencias más relevantes para tu nicho ahora',
        params: [
          {
            name: 'platform',
            label: 'Plataforma de origen',
            type: 'select',
            options: ['Instagram Reels', 'TikTok→Instagram', 'Stories', 'todas'],
            required: true,
          },
        ],
      },
      {
        id: 'audio-strategy',
        icon: '🎵',
        label: 'Estrategia de audios',
        description: 'Qué audios usar y cómo sacarles el máximo provecho',
        params: [
          {
            name: 'contentStyle',
            label: 'Estilo de contenido',
            type: 'select',
            options: ['educativo', 'entretenimiento', 'ventas', 'lifestyle', 'behind-the-scenes'],
            required: true,
          },
        ],
      },
      {
        id: 'trend-adaptation',
        icon: '🔄',
        label: 'Adaptación de tendencia',
        description: 'Cómo adaptar una tendencia específica a tu marca',
        params: [
          {
            name: 'trend',
            label: 'Tendencia a adaptar',
            type: 'text',
            placeholder: 'Describí la tendencia que querés usar...',
            required: true,
          },
        ],
      },
      {
        id: 'trend-calendar',
        icon: '🗓️',
        label: 'Calendario de tendencias',
        description: 'Tendencias y fechas clave del mes para planificar contenido',
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
            required: true,
          },
        ],
      },
      {
        id: 'challenge-plan',
        icon: '🏆',
        label: 'Plan de challenge',
        description: 'Diseñá un challenge viral para tu nicho',
        params: [
          {
            name: 'challenge',
            label: 'Idea o tema del challenge',
            type: 'text',
            placeholder: 'Ej: mostrar tu transformación, antes y después...',
            required: true,
          },
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
    description: 'Experto en storytelling de marca, arcos narrativos y contenido emocional.',
    specialties: ['Origin story', 'Behind the scenes', 'Founder arc', 'Arcos narrativos', 'Vulnerabilidad estratégica'],
    systemPrompt: (brand: BrandProfile): string => `Sos Brand Narrator, experto en storytelling de marca para Instagram.

${brandContext(brand)}

Tu especialidad es la historia de origen de la marca, arcos narrativos, contenido behind-the-scenes, historia del fundador, hooks emocionales, voz de marca en historias, series de contenido y vulnerabilidad estratégica. Convertís experiencias ordinarias en narrativas que atrapan y fidelizan.

Respondé siempre en español rioplatense. Usá técnicas cinematográficas y literarias aplicadas a contenido de Instagram. Dá estructuras y ejemplos concretos.`,
    actions: [
      {
        id: 'origin-story',
        icon: '🌱',
        label: 'Historia de origen',
        description: 'Creá la narrativa de origen más poderosa de tu marca',
        params: [
          {
            name: 'background',
            label: 'Tu historia y contexto',
            type: 'textarea',
            placeholder: 'Contame cómo empezaste, qué te motivó, qué obstáculos tuviste...',
            required: true,
          },
        ],
      },
      {
        id: 'bts-content',
        icon: '🎬',
        label: 'Contenido behind the scenes',
        description: 'Ideas de BTS que humanizan tu marca y aumentan la conexión',
        params: [
          {
            name: 'businessType',
            label: 'Tipo de negocio o actividad',
            type: 'text',
            placeholder: 'Ej: estudio de diseño, tienda online de ropa, consultoría',
            required: true,
          },
        ],
      },
      {
        id: 'founder-arc',
        icon: '👤',
        label: 'Arco del fundador',
        description: 'Construí el arco narrativo de tu historia personal para conectar',
        params: [
          {
            name: 'journey',
            label: 'Tu recorrido personal',
            type: 'textarea',
            placeholder: 'Compartí los altos y bajos de tu camino emprendedor...',
            required: true,
          },
        ],
      },
      {
        id: 'content-series',
        icon: '📚',
        label: 'Serie de contenido',
        description: 'Diseñá una serie de contenido con hilo narrativo que engancha',
        params: [
          {
            name: 'theme',
            label: 'Tema o eje de la serie',
            type: 'text',
            placeholder: 'Ej: los 7 errores que cometí al empezar, mi camino de 0 a 1000 clientes',
            required: true,
          },
        ],
      },
      {
        id: 'emotional-hook',
        icon: '💡',
        label: 'Hook emocional',
        description: 'Creá un hook que active una emoción específica en tu audiencia',
        params: [
          {
            name: 'emotion',
            label: 'Emoción que querés despertar',
            type: 'select',
            options: ['esperanza', 'nostalgia', 'orgullo', 'empatía', 'inspiración', 'curiosidad intensa'],
            required: true,
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
    description: 'Experto en fórmulas virales, ingeniería de hooks y mecánicas de compartir.',
    specialties: ['Viral formulas', 'Hook engineering', 'Share mechanics', 'Pattern interruption', 'Loop architecture'],
    systemPrompt: (
      brand: BrandProfile,
    ): string => `Sos Viral Architect, experto en diseñar contenido que viraliza orgánicamente.

${brandContext(brand)}

Tu especialidad son las fórmulas virales, mapeo de emociones, mecánicas de compartir, ingeniería de hooks, estrategia de distribución, interrupción de patrones, arquitectura de loops y takes contrarios. Sabés exactamente qué combinación de elementos hace que alguien comparta algo.

Respondé siempre en español rioplatense. Dá fórmulas específicas, ejemplos virales del nicho y estructuras listas para aplicar.`,
    actions: [
      {
        id: 'viral-formula',
        icon: '⚗️',
        label: 'Fórmula viral',
        description: 'La combinación exacta de elementos para hacer viral tu contenido',
        params: [
          {
            name: 'topic',
            label: 'Tema del contenido',
            type: 'text',
            placeholder: 'Ej: productividad, mindset emprendedor, fitness',
            required: true,
          },
          {
            name: 'format',
            label: 'Formato',
            type: 'select',
            options: ['reel', 'carrusel', 'post-imagen'],
            required: true,
          },
        ],
      },
      {
        id: 'emotion-map',
        icon: '🗺️',
        label: 'Mapa de emociones',
        description: 'Mapeá las emociones que activan el sharing en tu audiencia',
        params: [],
      },
      {
        id: 'power-hooks',
        icon: '🪝',
        label: 'Power hooks',
        description: 'Los hooks más poderosos según el estilo que necesitás',
        params: [
          {
            name: 'style',
            label: 'Estilo de hook',
            type: 'select',
            options: [
              'contrarian',
              'secreto revelado',
              'número + promesa',
              'pregunta disruptiva',
              'historia de fracaso',
              'mix',
            ],
            required: true,
          },
        ],
      },
      {
        id: 'share-audit',
        icon: '🔬',
        label: 'Auditoría de shareabilidad',
        description: 'Analizá qué tan compartible es tu contenido actual',
        params: [
          {
            name: 'content',
            label: 'Contenido a auditar',
            type: 'textarea',
            placeholder: 'Describí o pegá el contenido que querés auditar...',
            required: true,
          },
        ],
      },
      {
        id: 'contrarian-take',
        icon: '🔥',
        label: 'Take contrario',
        description: 'El ángulo contrario que nadie dice en tu nicho y genera debate',
        params: [
          {
            name: 'topic',
            label: 'Tema o creencia común del nicho',
            type: 'text',
            placeholder: 'Ej: hay que publicar todos los días para crecer',
            required: true,
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
    description: 'Experto en growth sprints, hashtags, colaboraciones y optimización de perfil.',
    specialties: ['Growth sprints', 'Hashtag domination', 'Collabs', 'Bio optimization', 'Account audits'],
    systemPrompt: (
      brand: BrandProfile,
    ): string => `Sos Growth Hacker, experto en crecimiento acelerado de cuentas de Instagram.

${brandContext(brand)}

Tu especialidad son los growth sprints, dominación de hashtags, estrategia de colaboraciones, optimización de bio, funnels de followers, cross-promotion, pods de engagement y auditorías de cuenta. Generás crecimiento real y sostenible, no trucos baratos.

Respondé siempre en español rioplatense. Dá métricas esperadas, timelines realistas y tácticas con pasos concretos.`,
    actions: [
      {
        id: 'growth-sprint',
        icon: '⚡',
        label: 'Growth sprint',
        description: 'Plan de acción de 30 días para crecer masivamente',
        params: [
          {
            name: 'currentFollowers',
            label: 'Seguidores actuales',
            type: 'text',
            placeholder: 'Ej: 2500',
            required: true,
          },
          {
            name: 'targetFollowers',
            label: 'Objetivo de seguidores',
            type: 'text',
            placeholder: 'Ej: 10000',
            required: true,
          },
        ],
      },
      {
        id: 'hashtag-strategy',
        icon: '#️⃣',
        label: 'Estrategia de hashtags',
        description: 'Sistema completo de hashtags para dominar tu nicho',
        params: [
          {
            name: 'mainNiche',
            label: 'Nicho principal',
            type: 'text',
            placeholder: 'Ej: coaching empresarial para mujeres',
            required: true,
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
            label: 'Tipo de colaboración',
            type: 'select',
            options: [
              'intercambio de stories',
              'live conjunto',
              'post colaborativo',
              'giveaway conjunto',
              'mention mutua',
            ],
            required: true,
          },
          {
            name: 'partnerSize',
            label: 'Tamaño del partner',
            type: 'select',
            options: ['similar al mío', 'más grande (10x)', 'más pequeño', 'cualquiera'],
            required: true,
          },
        ],
      },
      {
        id: 'bio-optimizer',
        icon: '✨',
        label: 'Optimizador de bio',
        description: 'Reescribí tu bio para convertir visitantes en seguidores',
        params: [
          {
            name: 'currentBio',
            label: 'Tu bio actual',
            type: 'textarea',
            placeholder: 'Pegá tu bio actual...',
            required: true,
          },
        ],
      },
      {
        id: 'account-audit',
        icon: '🔍',
        label: 'Auditoría de cuenta',
        description: 'Diagnóstico completo de tu cuenta y plan de mejora',
        params: [
          {
            name: 'mainIssue',
            label: 'Principal problema que identificás',
            type: 'select',
            options: [
              'bajo alcance',
              'pocos seguidores nuevos',
              'buen alcance pero no convierte',
              'engagement bajo',
              'no sé cuál es',
            ],
            required: true,
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
    description: 'Experto en pilares de contenido, calendarios editoriales y sistemas de contenido.',
    specialties: ['Content pillars', 'Calendarios editoriales', 'Mix de formatos', 'Evergreen', 'Content batching'],
    systemPrompt: (
      brand: BrandProfile,
    ): string => `Sos Content Strategist, experto en estrategia de contenido para Instagram.

${brandContext(brand)}

Tu especialidad son los pilares de contenido, calendarios editoriales, mix de formatos, biblioteca evergreen, auditorías de contenido, sistemas de repurposing, content batching y clusters de temas. Creás sistemas de contenido que funcionan solos y generan resultados consistentes.

Respondé siempre en español rioplatense. Dá estructuras concretas, ejemplos de pilares y calendarios listos para implementar.`,
    actions: [
      {
        id: 'content-pillars',
        icon: '🏛️',
        label: 'Pilares de contenido',
        description: 'Definí los pilares de contenido ideales para tu marca',
        params: [],
      },
      {
        id: 'monthly-calendar',
        icon: '📅',
        label: 'Calendario mensual',
        description: 'Plan editorial completo para el mes con temas y formatos',
        params: [
          {
            name: 'postsPerWeek',
            label: 'Posts por semana',
            type: 'select',
            options: ['3', '4', '5', '6', '7'],
            required: true,
          },
          {
            name: 'includeStories',
            label: 'Incluir stories diarias',
            type: 'select',
            options: ['sí', 'no'],
            required: true,
          },
        ],
      },
      {
        id: 'format-mix',
        icon: '🎨',
        label: 'Mix de formatos',
        description: 'La combinación óptima de formatos para tu objetivo',
        params: [
          {
            name: 'primaryGoal',
            label: 'Objetivo principal',
            type: 'select',
            options: ['crecimiento', 'engagement', 'ventas', 'autoridad', 'awareness'],
            required: true,
          },
        ],
      },
      {
        id: 'evergreen-library',
        icon: '🌲',
        label: 'Biblioteca evergreen',
        description: 'Sistema de contenido evergreen que funciona indefinidamente',
        params: [],
      },
      {
        id: 'content-audit',
        icon: '🔎',
        label: 'Auditoría de contenido',
        description: 'Diagnóstico de tu estrategia actual y plan de mejora',
        params: [
          {
            name: 'currentProblem',
            label: 'Principal problema de contenido',
            type: 'select',
            options: [
              'ideas para crear',
              'falta consistencia',
              'bajo engagement',
              'no genera ventas',
              'no crece el perfil',
              'no sé qué publicar',
            ],
            required: true,
          },
        ],
      },
    ],
  },
];

export const getAgent = (id: string): AgentDefinition | undefined => AGENTS.find((a) => a.id === id);
