/**
 * InstagramExpert — base de conocimiento profunda sobre Instagram (2024-2025).
 *
 * Este módulo centraliza todo el conocimiento experto sobre:
 * - Algoritmo de Instagram y señales de ranking
 * - Estrategias de contenido por formato
 * - Tácticas de crecimiento orgánico
 * - Benchmarks de métricas de performance
 * - Protocolos de gestión de comunidad
 * - Estrategia de hashtags
 * - Gestión de crisis
 *
 * Se inyecta en el system prompt de Talía y en cada agente especializado
 * para garantizar decisiones fundamentadas en mejores prácticas actuales.
 */

import type { BrandProfile } from '../config/types.js';

// ── Algoritmo 2024-2025 ───────────────────────────────────────────────────────

export const ALGORITHM_SIGNALS = {
  primary: {
    watchTime:
      'La métrica #1 para Reels. Instagram prioriza videos con >70% de watch time. Hooks en los primeros 1-3 segundos son críticos.',
    saveRate:
      'Saves son la señal más fuerte de valor percibido. Un save rate >5% dispara el alcance. Priorizar contenido educativo/utilitario.',
    commentQuality:
      'Comentarios largos (>4 palabras) valen más que comentarios de una sola palabra. Preguntas abiertas en el caption generan conversación.',
    shareToStories:
      'Cuando usuarios comparten tu post a sus historias = señal muy fuerte. Contenido de opinión, data sorprendente y humor viral lo logran.',
    profileVisits:
      'Usuarios que visitan el perfil después de ver un post = señal de conversión. Caption con curiosity gap lo potencia.',
  },
  secondary: {
    likes: 'Siguen siendo relevantes pero son la señal más débil. Foco en otras métricas primero.',
    hashtags:
      'Post-2023 los hashtags importan menos para descubrimiento. Máximo 3-5 muy específicos. El texto del caption importa más.',
    postingFrequency:
      'Consistencia > cantidad. 3-5 posts/semana para cuentas en crecimiento. 1-2 si hay <10k followers y calidad alta.',
    accountActivity:
      'Cuentas que interactúan con otras (comentan, responden) reciben 2-3x más alcance. Reciprocidad del algoritmo.',
  },
  formats: {
    reels:
      'Formato con mayor alcance orgánico. 15-30s para máximo watch time. Audio trending +40% de alcance. Vertical 9:16 obligatorio.',
    carousels:
      'Highest save rate y tiempo en pantalla. 3-7 slides óptimo. Primera imagen = thumbnail debe detener el scroll.',
    staticPosts:
      'Menor alcance orgánico pero útiles para branding y comunidad existente. Texto en imagen mejora engagement.',
    stories:
      'No indexadas en Explore. Son para comunidad existente. Daily posting mantiene relevancia en el algoritmo. Polls/stickers = interacción.',
    lives: 'Notificación a todos los followers. Boost temporal al algoritmo post-live. Ideal para lanzamientos y Q&A.',
  },
  timing: {
    bestHours:
      'Globalmente: 6-9am, 12-2pm, 7-9pm en timezone de la audiencia. Verificar siempre con los Insights propios.',
    firstHour:
      'La primera hora post-publicación es crítica. Responder todos los comentarios en ese período. Engagement inicial señaliza calidad al algoritmo.',
    weekdays: 'Martes, Miércoles y Jueves tienen el mayor engagement promedio. Evitar Domingos a la noche.',
    consistency:
      'Publicar en los mismos horarios entrena al algoritmo a mostrar tu contenido a la audiencia en esos momentos.',
  },
} as const;

// ── Estrategia de contenido ──────────────────────────────────────────────────

export const CONTENT_STRATEGY = {
  frameworks: {
    edu_ent_ins: 'Mix 40% educacional + 40% entretenimiento + 20% inspiracional. Ajustar según niche.',
    hero_hub_help: 'Hero (viral, 10% del tiempo) + Hub (series regulares, 60%) + Help (responde FAQs, 30%).',
    before_after:
      'Transformación es el formato más poderoso en cualquier niche. Antes/después de producto, conocimiento, estilo de vida.',
    behind_scenes: 'Contenido de proceso y behind-the-scenes genera 3x más comentarios y builds humanidad de la marca.',
  },
  hookFormulas: [
    '"[Número] cosas que [audiencia] nunca te van a contar sobre [tema]"',
    '"Error que el [X]% de [audiencia] comete con [tema] (y cómo evitarlo)"',
    '"Cómo pasé de [situación A] a [situación B] en [tiempo]"',
    '"La verdad sobre [tema popular]: lo que nadie dice"',
    '"Si [situación relatable], este post es para vos"',
    '"POV: [situación de la audiencia]"',
    '"¿Sabías que [dato sorprendente]? La mayoría no lo sabe."',
    '"Stop scrolling si [situación de pain point]"',
  ],
  captionStructure: {
    hook: 'Primera línea ANTES del "ver más" — debe generar curiosidad o dolor/deseo. Máximo 125 caracteres.',
    body: 'Desarrollo del valor: datos, historia, pasos. Párrafos cortos (1-2 líneas). Emojis como bullets. Espacios entre párrafos.',
    cta: 'Una sola CTA al final: seguir, guardar, comentar, compartir, o link en bio. Nunca múltiples CTAs.',
    hashtags: '3-5 hashtags específicos integrados o al final. Evitar bloques de 30 hashtags (señal de spam).',
  },
  contentPillars:
    'Definir 4-5 temas core que representan la marca. Todos los posts deben caer en uno de estos pilares para construir autoridad temática.',
  evergreen:
    'Priorizar contenido evergreen (válido por 6+ meses) sobre contenido de tendencia efímera. Reels educativos son el mejor activo evergreen.',
  repurposing:
    'Un Reel puede convertirse en: carrusel, story series, caption largo, thread, blog post. Máxima eficiencia de producción.',
} as const;

// ── Benchmarks de métricas ───────────────────────────────────────────────────

export const ANALYTICS_BENCHMARKS = {
  engagementRate: {
    poor: '< 1%   — audiencia poco conectada o contenido irrelevante',
    average: '1-3%   — performance estándar del mercado',
    good: '3-6%   — buen contenido y comunidad activa',
    excellent: '6-10%  — contenido muy relevante y comunidad muy activa',
    viral: '> 10%  — contenido excepcional o formato viral',
  },
  reachRate: {
    poor: '< 10%  de followers alcanzados por post',
    average: '10-20% — performance normal',
    good: '20-40% — contenido con buen alcance orgánico',
    excellent: '> 40%  — post con mucho Explore/Reels traffic',
  },
  saveRate: {
    good: '> 2%   de saves sobre impresiones = contenido de valor',
    excellent: '> 5%   = contenido muy útil, dispara algoritmo',
  },
  followersGrowth: {
    slow: '< 1%   mensual',
    steady: '1-3%   mensual — crecimiento orgánico saludable',
    fast: '3-10%  mensual — muy buen crecimiento',
    explosive: '> 10%  mensual — viral o campaña muy exitosa',
  },
  storyCompletion: {
    poor: '< 50%  — historia muy larga o poco atractiva',
    average: '50-70% — normal para la industria',
    good: '> 70%  — audiencia muy comprometida',
  },
  dmConversionRate: {
    note: 'DMs iniciados por usuarios / alcance total. Indica nivel de confianza y deseo de conversación.',
    good: '> 0.5%',
  },
} as const;

// ── Tácticas de crecimiento orgánico ──────────────────────────────────────────

export const GROWTH_PLAYBOOKS = [
  {
    name: 'Beacon Engagement',
    description:
      'Interactuar diariamente con las cuentas faro (5-10 cuentas de referencia en el niche) dentro de la primera hora de su publicación.',
    steps: [
      'Identificar 10 cuentas faro: mismo niche, más grandes (50k-500k), audiencia superpuesta.',
      'Comentar de forma sustancial (5+ palabras, agregar valor, hacer pregunta) en sus últimos 3 posts.',
      'Responder comentarios de otros usuarios en esas publicaciones.',
      'Dar like estratégico a comentarios relevantes de la audiencia de la cuenta faro.',
      'No seguir a las cuentas faro (para no parecer spam). Solo interactuar.',
    ],
    frequency: 'Diaria, 30-45 minutos. Los primeros 60 min post-publicación son críticos.',
    result: 'La audiencia de las cuentas faro te descubre. En 4-6 semanas aumento orgánico del 15-30% en follows.',
  },
  {
    name: 'Comentarios Estratégicos',
    description:
      'Comentar en posts virales del niche dentro de las primeras 2 horas para capitalizar el alcance de otros.',
    steps: [
      'Monitorear hashtags del niche y cuentas faro en tiempo real.',
      'Cuando detectás un post con tracción (likes subiendo rápido), comentar inmediatamente.',
      'Comentario debe ser: genuino, agregar perspectiva, o hacer pregunta interesante.',
      'Evitar emojis solos, "excelente post", o textos genéricos.',
    ],
    frequency: '5-10 comentarios estratégicos diarios.',
    result: 'Tu perfil aparece en la sección de comentarios de posts virales, generando tráfico orgánico.',
  },
  {
    name: 'Collab Posts',
    description: 'Co-crear contenido con cuentas del mismo niche y tamaño similar.',
    steps: [
      'Identificar creadores con audiencia superpuesta pero no idéntica.',
      'Proponer collab de valor mutuo: joint post, entrevista en stories, challenge.',
      'Usar la función Collab de Instagram (ambos perfiles aparecen como autores).',
      'Cross-promote en stories previo al collab.',
    ],
    frequency: 'Mensual o cada 2 semanas.',
    result:
      'Exposición directa a nueva audiencia calificada. Típicamente +500-2000 nuevos followers por collab bien ejecutado.',
  },
  {
    name: 'Story Engagement Loops',
    description: 'Crear stories interactivas que generan respuestas y conversaciones en DMs.',
    steps: [
      'Poll question sobre un tema del niche.',
      'Pregunta abierta con respuesta por DM.',
      'This or That con las opciones relevantes para la audiencia.',
      'Quiz con respuesta sorprendente para crear conversación.',
      'Responder a TODOS los que interactúan con las stories en las primeras 2 horas.',
    ],
    frequency: 'Diaria, al menos 3-5 stories.',
    result: 'Algorithm boost, DMs activos, y audiencia más conectada.',
  },
  {
    name: 'Hashtag Targeting',
    description: 'Sistema de hashtags que maximiza descubrimiento sin parecer spam.',
    steps: [
      'Investigar 50-100 hashtags del niche.',
      'Clasificar: nano (<10k), micro (10k-100k), medium (100k-500k), large (500k-1M), mega (>1M).',
      'Por post usar: 2 nano + 2 micro + 1 medium. Total 5 hashtags max.',
      'Rotar los hashtags entre posts para no ser marcado como spam.',
      'Crear hashtag de marca propio para UGC.',
    ],
    frequency: 'Revisar y rotar mensualmente.',
    result: 'Descubrimiento orgánico por audiencia muy específica y cualificada.',
  },
  {
    name: 'Reels Trending Audio Strategy',
    description: 'Usar audios trending para multiplicar el alcance de Reels.',
    steps: [
      'Revisar la sección de Reels diariamente para identificar audios con flecha de tendencia.',
      'Crear Reel con ese audio en las primeras 24-48 horas de su tendencia.',
      'Adaptar el concepto al niche propio (no copiar, solo usar el audio).',
      'Publicar entre 6-8am o 7-9pm del timezone de la audiencia.',
    ],
    frequency: '1-2 veces por semana cuando hay audio relevante.',
    result: 'Reels con audio trending tienen 2-5x más alcance orgánico.',
  },
] as const;

// ── Estrategia de hashtags ───────────────────────────────────────────────────

export const HASHTAG_STRATEGY = {
  philosophy:
    'Post-2024: los hashtags son menos importantes para descubrimiento. El algoritmo indexa el texto del caption. Sin embargo, hashtags muy específicos siguen trayendo audiencia muy cualificada.',
  optimal: {
    quantity: '3-7 hashtags por post (máximo 10). Más de 10 = señal de spam.',
    mix: '2 ultraniche (<10k) + 2 nicho (<100k) + 1-2 medios (<500k) + 0-1 amplio. Sin mega hashtags (>5M).',
    placement: 'Al final del caption separados por línea, o integrados en el texto. Nunca como primer línea.',
    rotation: 'Rotar el set de hashtags entre posts del mismo tipo para evitar shadowban.',
  },
  research: {
    method:
      'Buscar hashtag principal del niche → ver los "hashtags relacionados" en la búsqueda → explorar los más activos.',
    tools: 'Instagram nativo (búsqueda + Explorar), All Hashtag, Flick.',
    qualityCheck: 'Revisar que el hashtag no esté baneado (búsqueda sin resultados = baneado).',
  },
  branded: 'Crear 1-3 hashtags de marca propios. Incluirlos en TODOS los posts. Promoverlos en bio y stories.',
} as const;

// ── Gestión de comunidad ─────────────────────────────────────────────────────

export const COMMUNITY_MANAGEMENT = {
  responseTime: {
    comments: 'Responder dentro de los primeros 30-60 minutos post-publicación. Luego en las primeras 24 horas.',
    dms: 'Responder dentro de 2-4 horas durante horario activo. Máximo 24 horas.',
    mentions: 'Revisar menciones cada 4 horas y responder cuando sea relevante.',
  },
  commentProtocols: {
    positive: 'Responder con genuinidad. Hacer una pregunta para continuar la conversación. Nunca respuesta genérica.',
    question: 'Responder con información de valor. Si es FAQ, crear contenido sobre ese tema.',
    criticism: 'Reconocer el feedback, agradecer, explicar o mejorar. Nunca borrar comentarios negativos legítimos.',
    spam: 'Ocultar comentarios de spam. No responder. Reportar si es reiterado.',
    negative: 'Si es crítica legítima: responder privado primero, público segundo. Si es troll: ignorar o bloquear.',
  },
  dmProtocols: {
    greeting: 'Responder con calidez y personalización. Usar el nombre del usuario.',
    lead: 'Cuando alguien pregunta por producto/servicio: calificar (qué necesita, para qué, cuándo), luego proponer solución.',
    support:
      'Resolver el problema primero. Luego agradecer la paciencia. Convertir la experiencia negativa en positiva.',
    unsolicited: 'No enviar DMs en frío a usuarios que no interactuaron. Va contra TOS y daña la cuenta.',
  },
  ugcStrategy: {
    encourage: 'CTA específica para que la audiencia cree contenido con el hashtag de marca.',
    repost: 'Repostear UGC en stories con mención del creador. Agradecimiento genuino.',
    permission: 'Pedir permiso explícito antes de repostear en el grid.',
    incentive: 'Reconocer públicamente a los mejores creadores de UGC (featurearlos, darles shoutout).',
  },
} as const;

// ── Protocolos de crisis ─────────────────────────────────────────────────────

export const CRISIS_PLAYBOOK = {
  triggers: [
    'Comentario viral negativo (>100 likes en <1 hora)',
    'Hashtag negativo asociado a la marca trending',
    'Error de comunicación en un post publicado',
    'Acusación pública por parte de un cliente o influencer',
    'Contenido ofensivo publicado por error',
    'Hackeo de la cuenta',
  ],
  immediateActions: [
    '1. PAUSAR todo el contenido programado inmediatamente',
    '2. Capturar screenshots de toda la situación (evidencia)',
    '3. Notificar al equipo y tomador de decisiones humano',
    '4. NO publicar nada hasta tener una postura consensuada',
    '5. Monitorear el alcance del problema: ¿cuántas personas lo vieron?',
  ],
  responseProtocol: {
    within1h:
      'Publicar un acknowledge breve si el problema ya es visible. "Estamos al tanto de la situación y respondemos a la brevedad."',
    within4h: 'Respuesta oficial completa: reconocer, disculparse si aplica, explicar las acciones a tomar.',
    within24h: 'Update de resolución. Demostrar que se actuó.',
    followup: 'Post de cierre que reestablezca la narrativa positiva de la marca.',
  },
  noGo: [
    'Borrar comentarios negativos (empeora la situación)',
    'Ignorar y esperar que pase (el silencio escala el problema)',
    'Responder con defensividad o confrontación',
    'Publicar contenido promocional durante una crisis',
    'Hacer promesas que no se pueden cumplir',
  ],
} as const;

// ── Formatos de contenido ────────────────────────────────────────────────────

export const CONTENT_FORMATS = {
  reel: {
    specs: '1080x1920px (9:16), máximo 90 segundos (óptimo 15-30s), MP4 H.264',
    structure: '0-3s hook visual + audio gancho | 3-20s valor/entretenimiento | 20-25s resolución | 25-30s CTA',
    captionBestPractice: 'Caption corto en Reels (1-3 líneas). El video es el protagonista.',
    coverImage: 'Elegir frame con texto claro visible y cara (si aplica). El thumbnail importa.',
    trending: 'Revisar Reels con flecha en la música. Usar en las primeras 48h de trending.',
  },
  carousel: {
    specs: '1080x1080px (1:1) o 1080x1350px (4:5), máximo 10 slides, imágenes o mezcla imagen+video',
    structure: 'Slide 1: hook visual fuerte | Slides 2-8: desarrollo paso a paso | Último slide: CTA + seguir',
    captionBestPractice: 'Caption largo bien aprovechado. "Deslizá →" en el caption y/o en la primera imagen.',
    designTip: 'Consistencia visual entre slides. Colores de marca. Tipografía legible incluso en móvil.',
  },
  staticPost: {
    specs: '1080x1080px (1:1), 1080x1350px (4:5) o 1080x608px (16:9 landscape)',
    bestFor: 'Quotes, anuncios, productos, behind-the-scenes. Menor alcance orgánico que Reels.',
    designTip: 'Si hay texto, usar máximo 20% de la imagen. Contraste alto. Tipografía sin serif.',
  },
  story: {
    specs: '1080x1920px (9:16), 15s por slide (video), imágenes se muestran 5s',
    structure: 'Engagement sticker en cada story. No más de 7 stories seguidas. Hook en la primera.',
    interactive: 'Polls, preguntas, sliders, quizzes → generan interacción directa con el algoritmo.',
    links: 'Link sticker disponible para todas las cuentas. Usarlo en cada story de conversión.',
  },
} as const;

// ── Benchmarks por industria ─────────────────────────────────────────────────

export const INDUSTRY_BENCHMARKS = {
  ecommerce: { avgEngagement: '1.5-2.5%', bestFormats: ['Reels', 'Carruseles'], postingFreq: '4-6/semana' },
  coaching: { avgEngagement: '3-5%', bestFormats: ['Reels educativos', 'Carruseles'], postingFreq: '3-5/semana' },
  fitness: { avgEngagement: '4-6%', bestFormats: ['Reels de transformación', 'Stories'], postingFreq: '5-7/semana' },
  restaurant: {
    avgEngagement: '2-4%',
    bestFormats: ['Fotos de producto', 'Reels behind scenes'],
    postingFreq: '3-5/semana',
  },
  photography: { avgEngagement: '3-5%', bestFormats: ['Carruseles', 'Static posts'], postingFreq: '3-4/semana' },
  fashion: { avgEngagement: '2-4%', bestFormats: ['Reels outfits', 'Static lookbook'], postingFreq: '5-7/semana' },
  technology: {
    avgEngagement: '1-2%',
    bestFormats: ['Carruseles educativos', 'Reels how-to'],
    postingFreq: '3-4/semana',
  },
  personalBrand: {
    avgEngagement: '4-8%',
    bestFormats: ['Reels opinión', 'Stories personales'],
    postingFreq: '3-5/semana',
  },
} as const;

// ── Constructor de contexto experto ──────────────────────────────────────────

/**
 * Construye el contexto de experto en Instagram para inyectar en prompts.
 * Adapta el conocimiento al niche y objetivos específicos de la marca.
 */
export const buildInstagramExpertContext = (brand: BrandProfile, goal: string): string => {
  const niche = brand.audience?.description ?? brand.name;
  const industryKey = detectIndustry(brand);
  const benchmarks = INDUSTRY_BENCHMARKS[industryKey] ?? INDUSTRY_BENCHMARKS.personalBrand;

  return `
## Conocimiento experto de Instagram (2024-2025) aplicado a: ${brand.name}

### Señales del algoritmo que más importan ahora:
- **Watch time en Reels**: Videos donde el 70%+ los ve completo se distribuyen masivamente
- **Saves**: La señal más poderosa. Contenido útil/educativo genera saves
- **Comentarios sustanciales**: Responder preguntas abiertas del caption dispara el engagement
- **Primeros 60 minutos**: El engagement inicial determina el alcance total del post
- **Actividad de la cuenta**: Interactuar con otras cuentas antes/después de publicar amplifica el alcance

### Para el niche de ${niche}:
- Mejor formato: ${benchmarks.bestFormats.join(' > ')}
- Frecuencia óptima: ${benchmarks.postingFreq}
- Engagement rate objetivo: ${benchmarks.avgEngagement}

### Objetivo actual: ${goal}
${buildGoalContext(goal)}

### Reglas de oro para ${brand.name}:
- Consistencia visual = reconocimiento de marca = más followers
- Responder comentarios en los primeros 30 minutos SIEMPRE
- Una CTA por post, clara y específica
- Captions con hook en la primera línea (antes del "ver más")
- Mezclar formatos: Reels para alcance + Carruseles para saves + Stories para comunidad
`.trim();
};

const detectIndustry = (brand: BrandProfile): keyof typeof INDUSTRY_BENCHMARKS => {
  const text = `${brand.name} ${brand.audience?.description ?? ''} ${brand.niche ?? ''}`.toLowerCase();
  if (/tienda|shop|product|ecomm|venta|compra/.test(text)) return 'ecommerce';
  if (/coach|mentor|curso|enseñ|entrena/.test(text)) return 'coaching';
  if (/fitness|gym|entrenami|deport|salud/.test(text)) return 'fitness';
  if (/restauran|comida|food|cocina|gastronomia/.test(text)) return 'restaurant';
  if (/foto|photo|imagen|visual/.test(text)) return 'photography';
  if (/moda|fashion|ropa|estilo|look/.test(text)) return 'fashion';
  if (/tech|software|app|digital|ia|ai/.test(text)) return 'technology';
  return 'personalBrand';
};

const buildGoalContext = (goal: string): string => {
  const g = goal.toLowerCase();
  if (/crec|seguidor|follower|grow/.test(g)) {
    return '→ Priorizar: Reels con trending audio, beacon engagement diario, CTAs de follow, collab posts mensual.';
  }
  if (/venta|vender|sell|producto|lanzamiento/.test(g)) {
    return '→ Priorizar: Stories con link sticker, DM funnels, posts de prueba social, urgencia y escasez.';
  }
  if (/engagement|comunidad|community|conex/.test(g)) {
    return '→ Priorizar: Stories interactivas, preguntas abiertas en caption, responder TODOS los comentarios, UGC campaigns.';
  }
  if (/content|contenido|publicar|crear/.test(g)) {
    return '→ Priorizar: Batch creation (grabar 3-5 piezas en una sesión), repurposing, templates de marca, calendario editorial.';
  }
  if (/analiti|metricas|kpi|analytics|audit/.test(g)) {
    return '→ Priorizar: Revisar reach rate, save rate, engagement rate, growth rate semanal. Identificar posts de mejor performance y replicar.';
  }
  return '→ Analizar primero la situación actual antes de actuar. Siempre basarse en datos.';
};

// ── Resumen ejecutivo para prompts cortos ──────────────────────────────────

export const INSTAGRAM_BEST_PRACTICES_SUMMARY = `
INSTAGRAM BEST PRACTICES 2025:
• Reels = mayor alcance orgánico. Hook visual en primeros 3 segundos. 15-30s óptimo.
• Carruseles = mayor save rate. "Deslizá →" en slide 1. Max 7 slides.
• Stories = conexión con comunidad. Publicar diario. Usar stickers interactivos.
• Captions: hook en primera línea, CTA única al final, 3-5 hashtags específicos.
• Timing: responder comentarios en 30 min post-publicación. Publicar en horario peak de audiencia.
• Crecimiento: beacon engagement diario, collab posts, trending audio en Reels.
• Métricas: save rate >2% = buen contenido. Engagement rate >3% = buena comunidad.
• DMs: responder en <2hs. Leads = calificar antes de vender.
• Crisis: pausar contenido → capturar evidencia → responder en <4h → no borrar comentarios.
`.trim();
