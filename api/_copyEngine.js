/**
 * Copy Engine — Copywriting persuasivo + Marketing de Contenidos.
 *
 * Copywriting: PAS, AIDA, BAB, 4Ps, PASTOR. Power words. Objeciones. CTAs psicológicos.
 * Content Marketing: pilares, series, lead magnets, funnel completo, educación/entretenimiento.
 * $0/month: 1 llamada LLM por tema. Todo lo demás heurístico/determinista.
 */

import { askLLMJson } from './_llm.js';

// ── Power Words ──────────────────────────────────────────────────────────────
export const POWER_WORDS = {
  urgency: [
    'ahora mismo',
    'solo hoy',
    'últimas horas',
    'antes de que cierre',
    'no pierdas más tiempo',
    'actúa ya',
    'en este momento',
  ],
  curiosity: [
    'secreto',
    'nadie te dijo',
    'lo que pasa cuando',
    'descubrí',
    'resulta que',
    'revelación',
    'la verdad sobre',
    'cómo es posible que',
  ],
  fear: [
    'error crítico',
    'evitá esto',
    'cuidado',
    'antes de que sea tarde',
    'peligro oculto',
    'esto te está costando',
    'el gran error',
  ],
  desire: [
    'imaginate',
    'finalmente',
    'logralo',
    'transformá tu',
    'duplicá tus',
    'sin esfuerzo extra',
    'en automático',
    'de una vez por todas',
  ],
  social_proof: [
    'miles ya lo hacen',
    'resultado comprobado',
    'como lograron',
    'casos reales',
    'no sos el único',
    'funciona para todos',
  ],
  authority: [
    'después de 10 años',
    'probado en',
    'respaldado por datos',
    'estudio muestra',
    'expertos confirman',
    'método validado',
  ],
  trust: [
    'sin trampa',
    'gratis',
    'sin compromiso',
    'garantía total',
    'honestamente',
    'tal cual es',
    'transparente',
    '100% real',
  ],
  exclusivity: [
    'exclusivo',
    'solo para',
    'acceso especial',
    'no todos pueden',
    'selecto',
    'limitado',
    'solo esta semana',
  ],
};

// ── Copywriting Frameworks ───────────────────────────────────────────────────
export const FRAMEWORKS = {
  PAS: {
    name: 'PAS — Problema → Agitación → Solución',
    steps: ['Problema (nombrar el dolor exacto)', 'Agitación (amplificar consecuencias)', 'Solución (tu propuesta)'],
    bestFor: ['ventas directas', 'objeciones', 'urgencia'],
    tone: 'empático-urgente',
  },
  AIDA: {
    name: 'AIDA — Atención → Interés → Deseo → Acción',
    steps: [
      'Atención (hook disruptivo)',
      'Interés (datos/historia relevante)',
      'Deseo (resultado soñado)',
      'Acción (CTA claro)',
    ],
    bestFor: ['awareness', 'lanzamientos', 'anuncios'],
    tone: 'aspiracional',
  },
  BAB: {
    name: 'BAB — Antes → Después → Puente',
    steps: ['Antes (situación actual dolorosa)', 'Después (vida transformada)', 'Puente (tu solución es el camino)'],
    bestFor: ['transformación', 'storytelling', 'testimonios'],
    tone: 'motivacional',
  },
  '4Ps': {
    name: '4Ps — Promesa → Imagen → Prueba → Push',
    steps: [
      'Promesa (qué obtenés)',
      'Imagen (visualizá el resultado)',
      'Prueba (evidencia social/datos)',
      'Push (razón para actuar hoy)',
    ],
    bestFor: ['conversión directa', 'productos premium', 'lanzamientos'],
    tone: 'directo-convincente',
  },
  PASTOR: {
    name: 'PASTOR — Problema → Amplificar → Historia → Transformación → Oferta → Respuesta',
    steps: [
      'Problema (el dolor específico)',
      'Amplificar (qué pasa si no lo resolvés)',
      'Historia (tu viaje o del cliente)',
      'Transformación (resultado tangible)',
      'Oferta (tu propuesta de valor)',
      'Respuesta (CTA irresistible)',
    ],
    bestFor: ['copy largo', 'landing pages', 'emails de venta', 'webinars'],
    tone: 'narrativo-persuasivo',
  },
};

// ── Principios de Persuasión (Cialdini) ─────────────────────────────────────
export const PERSUASION_PRINCIPLES = [
  {
    name: 'Reciprocidad',
    desc: 'Dá valor primero (tip gratuito, plantilla, info exclusiva) → el usuario se siente en deuda y responde al CTA',
    phrases: ['Acá va el regalo que prometí', 'Esto es completamente gratis para vos', 'Te lo comparto sin pedir nada'],
  },
  {
    name: 'Escasez',
    desc: 'Limitar disponibilidad real o percibida acelera decisión',
    phrases: ['Solo quedan 3 lugares', 'Cierra el viernes', 'No voy a repetir esto'],
  },
  {
    name: 'Autoridad',
    desc: 'Mostrar credenciales, resultados propios o de clientes antes del pitch',
    phrases: ['Después de ayudar a 500+ personas', 'Validado en 20 nichos', 'Método que usé para...'],
  },
  {
    name: 'Prueba Social',
    desc: 'Testimonios, números, resultados de terceros neutralizan objeciones',
    phrases: ['Como logró @fulano en 30 días', 'El 94% de los que aplican esto', 'Miles ya lo confirmaron'],
  },
  {
    name: 'Simpatía',
    desc: 'Compartir vulnerabilidades, humor y valores aumenta la conexión y la confianza',
    phrases: ['Te cuento algo que casi nunca digo', 'Me equivoqué enormemente con esto', 'Lo juro, yo también lo dudé'],
  },
  {
    name: 'Compromiso',
    desc: 'Micro-compromisos (comentá, guardá, respondé) llevan al macro-compromiso (compra)',
    phrases: ['Comentá SI si esto te pasó', 'Guardá esto para usarlo mañana', 'Respondeme: ¿estás en esto?'],
  },
  {
    name: 'Unidad',
    desc: '"Nosotros somos iguales" — identidad compartida que genera tribu y fidelización',
    phrases: ['Sé que sos de los que...', 'La gente como vos', 'Nuestra comunidad entiende que...'],
  },
];

// ── Objeciones comunes + respuestas ─────────────────────────────────────────
const OBJECTIONS = {
  precio: { obj: 'Es muy caro', flip: 'No es un costo, es una inversión. ¿Cuánto te cuesta NO resolverlo por mes?' },
  tiempo: { obj: 'No tengo tiempo', flip: 'Eso es exactamente lo que esto resuelve. 15 minutos al día cambia todo.' },
  confianza: {
    obj: '¿Funciona para mí?',
    flip: 'Lo probaron personas en tu misma situación. Los resultados están abajo.',
  },
  experiencia: { obj: 'Soy principiante', flip: 'Diseñado para empezar desde cero. Sin experiencia previa necesaria.' },
  saturacion: {
    obj: 'El nicho está saturado',
    flip: 'Saturación = demanda probada. La diferencia está en el ángulo, no el nicho.',
  },
  timing: { obj: 'No es el momento', flip: 'Dentro de 6 meses vas a desear haber empezado hoy.' },
};

// ── Pilares de Contenido por Nicho ──────────────────────────────────────────
const CONTENT_PILLARS_MAP = {
  'marketing-digital': [
    {
      pillar: '🎓 Educación táctica',
      sub: ['tutoriales paso a paso', 'errores comunes', 'frameworks probados', 'herramientas que uso'],
      format: 'carousel',
    },
    {
      pillar: '📊 Casos de estudio',
      sub: ['antes/después reales', 'desglose de campañas', 'qué funcionó/falló', 'números reales'],
      format: 'reel',
    },
    {
      pillar: '🔥 Opinión hot-take',
      sub: ['mitos del marketing', 'verdades incómodas', 'contra-intuitivo', 'lo que nadie dice'],
      format: 'reel',
    },
    {
      pillar: '🛠️ Behind the scenes',
      sub: ['mi proceso de trabajo', 'un día en mi agencia', 'tools y stack', 'cómo gestiono clientes'],
      format: 'reel',
    },
    {
      pillar: '🤝 Comunidad y preguntas',
      sub: ['respondo preguntas frecuentes', 'encuestas de audiencia', 'coment favorito', 'storytime relatable'],
      format: 'stories',
    },
  ],
  fitness: [
    {
      pillar: '💪 Entrenamiento',
      sub: ['rutinas específicas', 'técnica correcta', 'progresión de ejercicios', 'workouts rápidos'],
      format: 'reel',
    },
    {
      pillar: '🥗 Nutrición',
      sub: ['meal prep', 'recetas high-protein', 'qué como en un día', 'mitos nutricionales'],
      format: 'carousel',
    },
    {
      pillar: '📈 Transformación',
      sub: ['fotos reales', 'progreso mensual', 'historia de clientes', 'antes/después honesto'],
      format: 'carousel',
    },
    {
      pillar: '🧠 Mindset',
      sub: ['motivación sin toxicidad', 'hablar de recaídas', 'cómo mantener hábitos', 'salud mental en el gym'],
      format: 'reel',
    },
    {
      pillar: '🎓 Educación',
      sub: ['cómo funciona el músculo', 'mitos de fitness', 'suplementos reales vs hype', 'anatomía simple'],
      format: 'carousel',
    },
  ],
  food: [
    {
      pillar: '🍳 Recetas rápidas',
      sub: ['bajo 5 ingredientes', 'menos de 30 min', 'meal prep semanal', 'versión saludable'],
      format: 'reel',
    },
    {
      pillar: '📚 Educación culinaria',
      sub: ['técnicas básicas', 'cómo mejorar un plato', 'errores en la cocina', 'ingredientes secretos'],
      format: 'carousel',
    },
    {
      pillar: '🌍 Exploración',
      sub: ['cocinas del mundo', 'ingrediente exótico', 'restaurante vs casero', 'tendencias gastronómicas'],
      format: 'reel',
    },
    {
      pillar: '💰 Budget cooking',
      sub: ['rico y barato', 'stretching de ingredientes', 'compras inteligentes', 'desperdicio cero'],
      format: 'carousel',
    },
    {
      pillar: '👨‍🍳 Behind the scenes',
      sub: ['mi mise en place', 'fail de cocina', 'preparación de evento', 'día de chef en casa'],
      format: 'reel',
    },
  ],
  finance: [
    {
      pillar: '📖 Educación financiera',
      sub: ['conceptos básicos', 'cómo funciona el interés compuesto', 'vocabulario financiero', 'errores comunes'],
      format: 'carousel',
    },
    {
      pillar: '💼 Inversiones',
      sub: ['dónde invertir según perfil', 'riesgo vs retorno', 'mi portfolio real', 'mercados explicados simple'],
      format: 'carousel',
    },
    {
      pillar: '🏠 Finanzas personales',
      sub: ['presupuesto real', 'deuda vs inversión', 'fondo de emergencia', 'cómo ahorrar con sueldo bajo'],
      format: 'reel',
    },
    {
      pillar: '🔥 Hot takes',
      sub: ['mitos financieros', 'lo que los ricos no te dicen', 'contra el sistema', 'opiniones polémicas'],
      format: 'reel',
    },
    {
      pillar: '📊 Casos reales',
      sub: ['cómo llegué a X', 'error que me costó caro', 'milestone alcanzado', 'transparencia de números'],
      format: 'reel',
    },
  ],
  business: [
    {
      pillar: '🎓 Frameworks',
      sub: ['sistema para escalar', 'cómo priorizar', 'framework de ventas', 'modelo de negocio explicado'],
      format: 'carousel',
    },
    {
      pillar: '💡 Ideas + oportunidades',
      sub: ['nichos sin explotar', 'tendencias emergentes', 'cómo validar una idea', 'side hustles 2026'],
      format: 'carousel',
    },
    {
      pillar: '📖 Lecciones aprendidas',
      sub: ['errores de emprendedor', 'lo que nadie te dice', 'mentiras del entrepreneurship', 'lo haría distinto'],
      format: 'reel',
    },
    {
      pillar: '🛠️ Operaciones',
      sub: ['cómo automatizo mi negocio', 'tools que uso', 'mi equipo y cómo lo gestiono', 'sistematizar'],
      format: 'carousel',
    },
    {
      pillar: '🤝 Ventas + cliente',
      sub: ['cómo consigo clientes', 'manejo de objeciones', 'cierre de ventas', 'retención y upsell'],
      format: 'reel',
    },
  ],
  general: [
    {
      pillar: '🎓 Educación',
      sub: ['tutorial básico', 'conceptos clave', 'errores a evitar', 'guía para principiantes'],
      format: 'carousel',
    },
    {
      pillar: '🔥 Entretenimiento',
      sub: ['humor relacionado al nicho', 'storytelling personal', 'hot takes', 'behind the scenes'],
      format: 'reel',
    },
    {
      pillar: '🤝 Comunidad',
      sub: ['preguntas a la audiencia', 'respuesta a comentarios', 'encuestas', 'user-generated content'],
      format: 'stories',
    },
    {
      pillar: '💡 Inspiración + motivación',
      sub: ['casos de éxito', 'citas con contexto', 'antes/después', 'milestones'],
      format: 'carousel',
    },
    {
      pillar: '📊 Transparencia',
      sub: ['números reales', 'proceso honesto', 'fallas y aprendizajes', 'detrás de escena'],
      format: 'reel',
    },
  ],
};

// ── Content Series ideas ─────────────────────────────────────────────────────
const CONTENT_SERIES = {
  'marketing-digital': [
    {
      name: 'Audit de 60 segundos',
      desc: 'Cada episodio: audito el perfil/cuenta de un seguidor en vivo',
      format: 'reel',
      episodes: 12,
      whyFollow: 'resultado inmediato y aplicable',
    },
    {
      name: 'Desafío 30 días',
      desc: 'Un tip de marketing aplicable cada día durante un mes',
      format: 'reel',
      episodes: 30,
      whyFollow: 'hábito diario que genera resultados',
    },
    {
      name: 'Detrás del case study',
      desc: 'Serie de 5 carruseles desglosando una campaña exitosa real con números',
      format: 'carousel',
      episodes: 5,
      whyFollow: 'datos reales que nadie comparte',
    },
  ],
  fitness: [
    {
      name: 'Transformación en tiempo real',
      desc: 'Progreso semanal honesto: fotos, métricas, qué funcionó/falló',
      format: 'reel',
      episodes: 12,
      whyFollow: 'autenticidad + inspiración sin filtros',
    },
    {
      name: 'Mitos del gym (desmontados)',
      desc: '1 mito por semana, basado en ciencia + experiencia práctica',
      format: 'carousel',
      episodes: 20,
      whyFollow: 'información valiosa que desafía creencias',
    },
  ],
  general: [
    {
      name: 'La verdad sobre [tema]',
      desc: 'Serie de revelaciones que van contra la corriente',
      format: 'reel',
      episodes: 10,
      whyFollow: 'perspectiva diferente y honesta',
    },
    {
      name: 'Lo que aprendí de [tema]',
      desc: 'Lecciones clave cada semana sobre el nicho',
      format: 'carousel',
      episodes: 12,
      whyFollow: 'valor educativo consistente',
    },
    {
      name: 'Respondo preguntas',
      desc: 'Q&A semanal con las mejores preguntas de la comunidad',
      format: 'stories+reel',
      episodes: 52,
      whyFollow: 'participación directa de la audiencia',
    },
  ],
};

// ── Lead Magnets ─────────────────────────────────────────────────────────────
const LEAD_MAGNETS = {
  'marketing-digital': [
    'Plantilla de calendario de contenidos (30 días)',
    'Checklist de auditoría de perfil IG/TT',
    'Swipe file de 50 hooks virales',
    'Mini-curso gratuito: cómo llegar a 1K en 30 días',
  ],
  fitness: [
    'Plan de entrenamiento de 4 semanas (PDF)',
    'Recetario high-protein de 7 días',
    'Checklist pre-workout',
    'Calculadora de macros personalizada',
  ],
  food: [
    'Ebook: 20 recetas en menos de 20 min',
    'Lista de compras inteligentes semanal',
    'Guía de especias y combinaciones',
  ],
  finance: [
    'Plantilla de presupuesto mensual',
    'Guía de inversión para principiantes',
    'Calculadora de interés compuesto',
    'Checklist: finanzas en orden en 30 días',
  ],
  business: [
    'Plantilla de propuesta de cliente',
    'Framework de pricing descargable',
    'SOP de onboarding de clientes',
    'Mini-curso: cómo conseguir el primer cliente',
  ],
  general: [
    'Guía PDF: primeros pasos en [nicho]',
    'Checklist de los 10 errores a evitar',
    'Plantilla editable del proceso',
    'Mini-curso de 3 días por email',
  ],
};

// ── Funnel de Contenido ──────────────────────────────────────────────────────
export const buildContentFunnel = ({ niche, goal, product = '' }) => {
  const key = Object.keys(CONTENT_PILLARS_MAP).find((k) => (niche || '').toLowerCase().includes(k)) || 'general';
  const pillars = CONTENT_PILLARS_MAP[key] || CONTENT_PILLARS_MAP.general;
  const magnets = LEAD_MAGNETS[key] || LEAD_MAGNETS.general;
  const series = CONTENT_SERIES[key] || CONTENT_SERIES.general;

  return {
    stages: [
      {
        stage: '🌐 Awareness (Atracción)',
        objective: 'Llegar a personas que no te conocen',
        content: [
          'Reels de hook fuerte con valor inmediato',
          'Hot takes contra-intuitivos',
          'Tendencias del nicho + tu perspectiva',
          'Humor relatable del nicho',
        ],
        kpis: ['Alcance', 'Views', 'Plays', 'Compartidos'],
        ratio: '40% del contenido',
        pillarsUsed: pillars.slice(0, 2).map((p) => p.pillar),
      },
      {
        stage: '🎯 Consideration (Interés)',
        objective: 'Convertir alcance en seguidores y engagers',
        content: [
          'Carruseles educativos con swipe hasta el final',
          'Series de contenido (razón para volver)',
          'Respuestas a preguntas frecuentes',
          'Behind the scenes que genera conexión',
        ],
        kpis: ['Saves', 'Comentarios', 'Perfil visits', 'Seguir'],
        ratio: '35% del contenido',
        pillarsUsed: pillars.slice(2, 4).map((p) => p.pillar),
      },
      {
        stage: '💰 Conversion (Acción)',
        objective: 'Transformar seguidores en leads/clientes',
        content: [
          'Testimonios y casos de estudio reales',
          'Demostración del producto/servicio',
          'Oferta con urgencia real + CTA directo',
          'FAQ sobre tu oferta',
        ],
        kpis: ['DMs recibidos', 'Link clicks', 'Ventas', 'Conversiones'],
        ratio: '15% del contenido',
        pillarsUsed: [pillars[0]?.pillar || 'Educación'],
        leadMagnets: magnets.slice(0, 2),
      },
      {
        stage: '💜 Retention (Fidelización)',
        objective: 'Convertir clientes en fans que refieren',
        content: [
          'Contenido exclusivo para comunidad',
          'Actualizaciones y logros de clientes',
          'Interacción directa (polls, preguntas)',
          'Celebración de wins de la audiencia',
        ],
        kpis: ['Comentarios recurrentes', 'Shares', 'Menciones', 'Retention rate'],
        ratio: '10% del contenido',
        pillarsUsed: [pillars[pillars.length - 1]?.pillar || 'Comunidad'],
      },
    ],
    contentPillars: pillars,
    contentSeries: series,
    leadMagnets: magnets,
    mixRecommendado: {
      educacion: '35%',
      entretenimiento: '30%',
      inspiracion: '20%',
      venta: '15%',
    },
    regla: '80/20 → 80% valor gratuito que enseña/entretiene, 20% pitches directos',
  };
};

// ── LLM: Generar Copy en múltiples frameworks ────────────────────────────────
const generateCopyLLM = async ({ topic, product, audience, goal, niche, tone = 'cercano', platform = 'instagram' }) => {
  const prompt = `Sos copywriter elite de ${platform === 'tiktok' ? 'TikTok' : 'Instagram'} para el nicho: ${niche || 'general'}.
Tema: "${topic}". ${product ? `Producto/servicio: "${product}".` : ''} Objetivo: ${goal}. Tono: ${tone}.
Audiencia: personas en LATAM que quieren ${audience || 'mejorar sus resultados'}.

Generá copy persuasivo en 3 frameworks. Tono: directo, "vos", sin jerga corporativa. Frases cortas. Real, no genérico.

SOLO JSON:
{
  "PAS": {
    "problema": "1 oración nombrando el dolor exacto de la audiencia",
    "agitacion": "1-2 oraciones amplificando las consecuencias de NO resolver esto",
    "solucion": "1-2 oraciones presentando la solución de forma aspiracional",
    "caption_completo": "copy completo PAS listo para pegar (200-280 chars) con emojis y CTA"
  },
  "AIDA": {
    "atencion": "hook de 6-8 palabras que para el scroll",
    "interes": "1 dato o historia que mantiene enganchado",
    "deseo": "el resultado soñado descrito con detalle sensorial",
    "accion": "CTA específico y de bajo-friction",
    "caption_completo": "copy completo AIDA listo para pegar (200-280 chars) con emojis y CTA"
  },
  "BAB": {
    "antes": "el estado actual doloroso descrito con empatía",
    "despues": "la vida transformada, descrita vívidamente",
    "puente": "cómo tu propuesta conecta ambos estados",
    "caption_completo": "copy completo BAB listo para pegar (200-280 chars) con emojis y CTA"
  },
  "power_words_recomendados": ["palabra1","palabra2","palabra3","palabra4","palabra5"],
  "objeciones_y_respuestas": [
    {"objecion": "objeción real de la audiencia", "flip": "cómo la convertís en argumento a favor"}
  ],
  "headline_options": ["titular impactante 1 (≤8 palabras)", "titular 2", "titular 3"],
  "micro_ctas": ["CTA bajo-friction 1", "CTA 2", "CTA urgencia 3"]
}`;

  try {
    return await askLLMJson(prompt, null, 'gpt-4o-mini', 900);
  } catch {
    return null;
  }
};

// ── Content Marketing: Guía educativa por tema ───────────────────────────────
const generateContentPlanLLM = async ({ topic, niche, goal }) => {
  const prompt = `Sos estratega de content marketing para ${niche || 'creadores de contenido'} en LATAM.
Tema central: "${topic}". Objetivo: ${goal}.

Generá un plan de contenidos educativo + entretenido. Tono: conversacional, "vos", útil.

SOLO JSON:
{
  "serie_educativa": {
    "nombre": "nombre atractivo para la serie",
    "descripcion": "qué aprende el seguidor en esta serie (1 oración)",
    "episodios": [
      {"n": 1, "titulo": "título del episodio", "formato": "carousel|reel|story", "idea": "qué muestra este ep"},
      {"n": 2, "titulo": "...", "formato": "...", "idea": "..."},
      {"n": 3, "titulo": "...", "formato": "...", "idea": "..."},
      {"n": 4, "titulo": "...", "formato": "...", "idea": "..."},
      {"n": 5, "titulo": "...", "formato": "...", "idea": "..."}
    ]
  },
  "contenido_educativo": [
    {"tipo": "Tutorial", "titulo": "...", "formato": "carousel", "descripcion": "qué enseña"},
    {"tipo": "Listicle",  "titulo": "...", "formato": "carousel", "descripcion": "..."},
    {"tipo": "Mito vs Realidad", "titulo": "...", "formato": "reel", "descripcion": "..."}
  ],
  "contenido_entretenimiento": [
    {"tipo": "Relatable", "titulo": "...", "formato": "reel", "descripcion": "..."},
    {"tipo": "Humor/POV",  "titulo": "...", "formato": "reel", "descripcion": "..."},
    {"tipo": "Storytelling personal", "titulo": "...", "formato": "reel", "descripcion": "..."}
  ],
  "lead_magnet_sugerido": {"nombre": "recurso gratuito atractivo", "formato": "pdf|checklist|plantilla|mini-curso", "promesa": "qué logra en X tiempo"},
  "angulo_diferencial": "qué hace única a esta cuenta vs los demás en el nicho (1 oración)"
}`;

  try {
    return await askLLMJson(prompt, null, 'gpt-4o-mini', 900);
  } catch {
    return null;
  }
};

// ── Export principal ─────────────────────────────────────────────────────────
export const runCopyEngine = async ({
  topic = '',
  product = '',
  audience = '',
  goal = 'engagement',
  niche = '',
  tone = 'cercano',
  platform = 'instagram',
} = {}) => {
  const nicheKey = Object.keys(CONTENT_PILLARS_MAP).find((k) => (niche || '').toLowerCase().includes(k)) || 'general';
  const pillars = CONTENT_PILLARS_MAP[nicheKey];
  const funnel = buildContentFunnel({ niche, goal });

  const [copyFrameworks, contentPlan] = await Promise.all([
    generateCopyLLM({ topic, product, audience, goal, niche, tone, platform }),
    generateContentPlanLLM({ topic, niche, goal }),
  ]);

  return {
    frameworks: copyFrameworks,
    persuasionPrinciples: PERSUASION_PRINCIPLES.slice(0, 4),
    powerWords: POWER_WORDS,
    commonObjections: Object.values(OBJECTIONS).slice(0, 4),
    contentPillars: pillars,
    funnel,
    contentPlan,
    rules: [
      'Hook ≤8 palabras — para el scroll antes de que el cerebro decida pasar',
      'Primera línea = el dolor exacto de tu audiencia — tienen que pensar "esto es para mí"',
      'Una idea por post — no vayas a múltiples temas, uno solo, bien desarrollado',
      'CTA específico → "Comentá INFO" > "Dejame tu comentario"',
      'Social proof temprano → mencioná números o casos en el primer tercio del copy',
      '80/20 → 80% valor, 20% pitch. El que solo vende, pierde seguidores',
      'Emociones antes de lógica → primero conectá, después informá',
      'Voz activa siempre → "Logralo" > "Puede ser logrado"',
    ],
  };
};
