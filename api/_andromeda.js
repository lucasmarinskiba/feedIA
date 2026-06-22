/**
 * Andrómeda — Motor de Diversidad Creativa.
 *
 * Matriz tridimensional: Ángulo × Buyer Persona × Formato = Mensaje único.
 * Cada combinación genera copy, hook y CTA adaptados al estado emocional
 * y nivel de awareness del buyer. Sistema de adsets sin IA innecesaria.
 *
 * $0/month: heurístico + 1 LLM call para top 6 combinaciones con copy real.
 * POST /api/agency/andromeda/matrix
 */

import { askLLMJson } from './_llm.js';

// ── ÁNGULOS CREATIVOS ────────────────────────────────────────────────────────
export const ANGLES = {
  // — Narrativas de producto / servicio —
  'producto-beneficio': {
    name: 'Producto / Beneficio directo',
    desc: 'Muestra el producto/servicio y su beneficio principal sin rodeos',
    hook_template: 'Esto {benefit} sin {sacrifice}.',
    tone: 'directo-vendedor',
    bestFormats: ['carousel', 'reel', 'story'],
    cta: 'conversión',
    tags: ['ventas', 'lanzamiento', 'awareness'],
  },
  ugc: {
    name: 'UGC — Usuario real',
    desc: 'Persona real (no "creator") cuenta su experiencia auténtica y sin producción',
    hook_template: 'No me esperaba que {product} me fuera a {result}.',
    tone: 'casual-auténtico',
    bestFormats: ['reel', 'story'],
    cta: 'social-proof',
    tags: ['confianza', 'conversion', 'testimonial'],
  },
  'antes-despues': {
    name: 'Antes vs Después',
    desc: 'Transformación visual o emocional. Antes = dolor. Después = sueño cumplido.',
    hook_template: 'Hace {timeframe} yo era {before}. Hoy {after}.',
    tone: 'motivacional-aspiracional',
    bestFormats: ['carousel', 'reel'],
    cta: 'inspiración',
    tags: ['transformación', 'storytelling', 'conversión'],
  },
  programador: {
    name: 'Ángulo Programador / Tech',
    desc: 'Habla el lenguaje del dev, referencias a código, sistemas, automatización',
    hook_template: 'if (problema) { solve({topic}) } // Funciona siempre.',
    tone: 'técnico-humor',
    bestFormats: ['reel', 'carousel'],
    cta: 'herramienta',
    tags: ['tech', 'nicho-programadores', 'humor'],
  },
  deportista: {
    name: 'Ángulo Deportista / Atleta',
    desc: 'Analogías deportivas: entrenamiento, performance, PR, podio, récord',
    hook_template: 'En el deporte, perdés si no entrenás. En {topic}, igual.',
    tone: 'intenso-motivador',
    bestFormats: ['reel', 'story'],
    cta: 'acción-inmediata',
    tags: ['motivación', 'disciplina', 'nicho-fitness'],
  },
  fitness: {
    name: 'Ángulo Fitness / Salud',
    desc: 'Conecta el tema con cuerpo, energía, hábitos, disciplina física',
    hook_template: 'Tu {topic} es como tu cuerpo: necesita {habit} para crecer.',
    tone: 'energético-saludable',
    bestFormats: ['reel', 'carousel'],
    cta: 'hábito',
    tags: ['lifestyle', 'salud', 'hábitos'],
  },
  chef: {
    name: 'Ángulo Chef / Gastronomía',
    desc: 'Metáforas culinarias: receta del éxito, ingredientes clave, temperatura exacta',
    hook_template: 'La receta del {topic} tiene {n} ingredientes. Acá están.',
    tone: 'metafórico-creativo',
    bestFormats: ['carousel', 'reel'],
    cta: 'educativo',
    tags: ['creatividad', 'educación', 'storytelling'],
  },
  oficinista: {
    name: 'Ángulo Oficinista / 9-5',
    desc: 'Habla a quien trabaja en relación de dependencia y quiere escapar o mejorar',
    hook_template: '8h trabajando para otro. ¿Y cuándo trabajás para vos?',
    tone: 'empático-urgente',
    bestFormats: ['reel', 'story'],
    cta: 'escape',
    tags: ['libertad-financiera', 'side-hustle', 'relatable'],
  },
  emprendedor: {
    name: 'Ángulo Emprendedor / CEO',
    desc: 'Habla a dueños de negocio: escala, margen, equipo, sistemas, clientes',
    hook_template: 'Con {n} clientes, el problema no es conseguir más. Es retener.',
    tone: 'estratégico-directo',
    bestFormats: ['carousel', 'reel'],
    cta: 'estrategia',
    tags: ['negocios', 'escala', 'B2B'],
  },
  'mama-papa': {
    name: 'Ángulo Mamá / Papá',
    desc: 'Conecta el tema con la familia, tiempo con hijos, seguridad económica del hogar',
    hook_template: 'Mis hijos me enseñaron la mejor lección sobre {topic}.',
    tone: 'emocional-cálido',
    bestFormats: ['reel', 'story'],
    cta: 'familia',
    tags: ['familia', 'emocional', 'lifestyle'],
  },
  estudiante: {
    name: 'Ángulo Estudiante',
    desc: 'Habla a quien está aprendiendo: aprovechar tiempo libre, construir antes de graduarse',
    hook_template: 'En la facultad me enseñaron {wrongThing}. La realidad de {topic} es esto:',
    tone: 'revelador-relatable',
    bestFormats: ['carousel', 'reel'],
    cta: 'aprendizaje',
    tags: ['educación', 'jóvenes', 'primeros-pasos'],
  },
  esceptico: {
    name: 'Ángulo Escéptico Convertido',
    desc: 'El narrador dudaba, lo probó, y ahora lo recomienda. Máxima credibilidad.',
    hook_template: 'Pensé que {topic} era una estafa. Luego hice esto:',
    tone: 'honesto-sorprendente',
    bestFormats: ['reel', 'ugc-style'],
    cta: 'prueba-social',
    tags: ['confianza', 'objeciones', 'conversion'],
  },
  experto: {
    name: 'Ángulo Autoridad / Experto',
    desc: 'Posicionamiento desde experiencia: años, datos, resultados propios, credenciales',
    hook_template: 'Después de {n} años en {topic}, esto es lo que más importa:',
    tone: 'autoritativo-educativo',
    bestFormats: ['carousel', 'talking-head'],
    cta: 'educación-premium',
    tags: ['autoridad', 'confianza', 'posicionamiento'],
  },
  principiante: {
    name: 'Ángulo Principiante / Cero',
    desc: 'Habla desde el inicio absoluto. Sin jerga. El que más empatiza con audiencias masivas.',
    hook_template: 'Empecé sin saber nada de {topic}. Acá está todo lo que aprendí.',
    tone: 'accesible-humilde',
    bestFormats: ['carousel', 'reel'],
    cta: 'guia-gratuita',
    tags: ['educación', 'inclusión', 'awareness'],
  },
  comparacion: {
    name: 'Ángulo Comparación',
    desc: 'A vs B. Método viejo vs nuevo. Costoso vs accesible. Crea claridad decisional.',
    hook_template: '{opcionA} vs {opcionB}: lo que nadie te dice.',
    tone: 'analítico-claro',
    bestFormats: ['carousel', 'reel'],
    cta: 'decisión',
    tags: ['decision', 'educación', 'conversión'],
  },
  misterio: {
    name: 'Ángulo Misterio / Curiosity Gap',
    desc: 'Revela al final. El hook promete pero no entrega hasta el último slide/segundo.',
    hook_template: 'No vas a creer qué pasó cuando hice esto con {topic}.',
    tone: 'intrigante-entretenido',
    bestFormats: ['carousel', 'reel'],
    cta: 'engagement',
    tags: ['virality', 'saves', 'curiosity'],
  },
  'dato-shockeante': {
    name: 'Ángulo Dato Shockeante',
    desc: 'Estadística o hecho inesperado sobre el tema que reencuadra la percepción',
    hook_template: 'El {n}% de las personas que {action} logran {result}. Vos, ¿en qué lado estás?',
    tone: 'data-driven-urgente',
    bestFormats: ['carousel', 'reel', 'infographic'],
    cta: 'reflexión',
    tags: ['autoridad', 'educación', 'virality'],
  },
  'humor-relatable': {
    name: 'Ángulo Humor / Relatable',
    desc: 'Situación ridícula o exagerada que todos reconocen. Entretiene + enseña.',
    hook_template: 'Yo antes de saber {topic}: 😭 / Yo después: 😎',
    tone: 'cómico-ligero',
    bestFormats: ['reel', 'meme-carousel'],
    cta: 'compartir',
    tags: ['virality', 'entretenimiento', 'comunidad'],
  },
  'detrás-de-escena': {
    name: 'Ángulo Behind The Scenes',
    desc: 'Mostrar el proceso real, sin editar. Genera confianza y humaniza la marca.',
    hook_template: 'Nadie muestra cómo se ve {topic} por dentro. Yo sí.',
    tone: 'auténtico-transparente',
    bestFormats: ['reel', 'story'],
    cta: 'comunidad',
    tags: ['confianza', 'branding', 'humanización'],
  },
  'historia-origen': {
    name: 'Ángulo Historia de Origen',
    desc: 'La historia de cómo empezó todo. Conecta emocionalmente con la marca/persona.',
    hook_template: 'Todo empezó cuando {triggerEvent}. Esto cambió todo:',
    tone: 'narrativo-emocional',
    bestFormats: ['reel', 'carousel'],
    cta: 'conexión',
    tags: ['branding', 'storytelling', 'emocional'],
  },
};

// ── BUYER PERSONAS ───────────────────────────────────────────────────────────
export const BUYER_PERSONAS = {
  experto: {
    name: 'El Experto',
    desc: 'Ya sabe del tema, busca insights avanzados y diferenciación',
    awareness: 'alta',
    emotionalState: 'confiado-exigente',
    pains: ['Contenido superficial que no le aporta', 'Técnicas repetidas que ya conoce', 'Nadie va al fondo del tema'],
    triggers: ['Datos que no conocía', 'Perspectiva contraintuitiva', 'Frameworks avanzados'],
    language: 'técnico, sin explicar básicos, peer-to-peer',
    bestAngles: ['experto', 'dato-shockeante', 'comparacion', 'detrás-de-escena'],
    ctaStyle: 'debate · comparte tu opinión · ¿estás de acuerdo?',
    conversion: 'media — ya tiene alternativas',
  },
  entusiasta: {
    name: 'El Entusiasta',
    desc: 'Apasionado del tema, early adopter, comparte todo lo nuevo',
    awareness: 'alta',
    emotionalState: 'emocionado-evangelizador',
    pains: ['No tener con quién hablar del tema', 'Información escasa en LATAM', 'Poca comunidad local'],
    triggers: ['Novedad', 'Exclusividad', 'Comunidad de iguales'],
    language: 'apasionado, jerga del nicho, emojis del sector',
    bestAngles: ['ugc', 'detrás-de-escena', 'historia-origen', 'comparacion'],
    ctaStyle: 'compartí · etiquetá a alguien que necesita esto · ¿te pasa igual?',
    conversion: 'alta — si confía en el creador',
  },
  curioso: {
    name: 'El Curioso',
    desc: 'Descubrió el tema recientemente, está explorando sin compromiso',
    awareness: 'media',
    emotionalState: 'intrigado-cauteloso',
    pains: ['No saber por dónde empezar', 'Miedo a equivocarse al principio', 'Demasiada información contradictoria'],
    triggers: ['Respuestas simples', 'Paso a paso claro', 'Sin jerga'],
    language: 'simple, accesible, sin dar por sentado nada',
    bestAngles: ['principiante', 'misterio', 'antes-despues', 'humor-relatable'],
    ctaStyle: 'guardá este post · el primer paso es... · empezá por acá',
    conversion: 'media-baja — necesita nurturing',
  },
  aburrido: {
    name: 'El Aburrido / Sin contexto',
    desc: 'Scrollea sin intención, necesita ser sorprendido para detenerse',
    awareness: 'baja',
    emotionalState: 'pasivo-distraído',
    pains: ['Nada lo sorprende', 'Contenido repetitivo en el feed', 'Vida rutinaria sin estímulo'],
    triggers: ['Humor inesperado', 'Dato shockeante', 'Visual llamativo', 'Primer segundo impactante'],
    language: 'cortísimo, visual-first, gancho en 0-2 segundos',
    bestAngles: ['humor-relatable', 'misterio', 'dato-shockeante', 'ugc'],
    ctaStyle: 'guardá · ya que llegaste hasta acá · siguiente →',
    conversion: 'baja — necesita múltiples touchpoints',
  },
  interesado: {
    name: 'El Interesado / Considerando',
    desc: 'Está evaluando activamente si comprar/seguir. Busca razones para decidir.',
    awareness: 'alta',
    emotionalState: 'analítico-indeciso',
    pains: ['Miedo a tomar la decisión equivocada', 'Comparando varias opciones', 'Falta de prueba social suficiente'],
    triggers: ['Garantías', 'Testimonios reales', 'Comparaciones claras', 'Urgencia real'],
    language: 'directo, basado en beneficios, con prueba social',
    bestAngles: ['comparacion', 'ugc', 'esceptico', 'antes-despues'],
    ctaStyle: 'mandame INFO · esto cierra el viernes · probalo sin riesgo',
    conversion: 'muy alta — listo para decidir',
  },
  desahuciado: {
    name: 'El Desahuciado / Probó todo',
    desc: 'Intentó múltiples soluciones, nada funcionó. Esperanza baja, cinismo alto.',
    awareness: 'alta',
    emotionalState: 'cínico-agotado',
    pains: ['Gastó dinero en soluciones que fallaron', 'Siente que su caso es imposible', 'No confía en más promesas'],
    triggers: ['Honestidad radical', 'Reconocer sus fracasos pasados', 'Diferenciación real del resto'],
    language: 'ultra honesto, sin promesas exageradas, empático a los fracasos',
    bestAngles: ['esceptico', 'ugc', 'detrás-de-escena', 'historia-origen'],
    ctaStyle: 'esto es diferente porque... · sin promesas vacías · resultados reales',
    conversion: 'alta IF confía — pero difícil de romper el cinismo',
  },
  dolido: {
    name: 'El Dolido / Afectado emocionalmente',
    desc: 'El problema le genera dolor emocional real: vergüenza, miedo, frustración profunda',
    awareness: 'media-alta',
    emotionalState: 'vulnerable-sensible',
    pains: ['Vergüenza por su situación', 'Miedo al juicio de otros', 'Compararse con quienes sí lo lograron'],
    triggers: [
      'Validación emocional',
      'Que alguien entienda su dolor sin juzgar',
      'Historia de alguien igual que lo superó',
    ],
    language: 'empático, suave, sin presión, "yo también estuve ahí"',
    bestAngles: ['historia-origen', 'antes-despues', 'ugc', 'mama-papa'],
    ctaStyle: 'no estás solo · el primer paso es pequeño · te entiendo',
    conversion: 'alta con el ángulo correcto — muy emocional',
  },
  desesperado: {
    name: 'El Desesperado / Crisis urgente',
    desc: 'Necesita una solución ahora. Estado de crisis activo. Urgencia máxima.',
    awareness: 'alta',
    emotionalState: 'urgente-ansioso',
    pains: ['Deadline inminente', 'Crisis económica o personal activa', 'Consecuencias graves de no resolver'],
    triggers: ['Velocidad de resultado', 'Simplicidad extrema', 'Garantía de que funciona rápido'],
    language: 'directo, sin adornos, "esto funciona en X tiempo"',
    bestAngles: ['producto-beneficio', 'antes-despues', 'ugc', 'experto'],
    ctaStyle: 'empezá hoy · resultado en 48h · sin complicaciones',
    conversion: 'muy alta — precio no es objeción en crisis',
  },
  estresado: {
    name: 'El Estresado / Overwhelmed',
    desc: 'Demasiadas cosas encima. Sobrecargado. Busca alivio y simplificación.',
    awareness: 'media',
    emotionalState: 'agotado-frustrado',
    pains: ['Demasiadas tareas, poco tiempo', 'Todo parece urgente e importante', 'Siente que nunca alcanza'],
    triggers: ['Simplificación extrema', 'Un solo paso a la vez', 'Que le quiten carga mental'],
    language: 'simple, breve, sin listas largas, "3 pasos, no 30"',
    bestAngles: ['principiante', 'humor-relatable', 'producto-beneficio', 'oficinista'],
    ctaStyle: 'solo esto · un paso · 10 minutos al día · sin complicar',
    conversion: 'media — necesita simplificación en el funnel también',
  },
  fanatico: {
    name: 'El Fanático / Evangelizador',
    desc: 'Ya es cliente o seguidor fiel. Refiere, defiende la marca, quiere más.',
    awareness: 'total',
    emotionalState: 'leal-orgulloso',
    pains: ['No tener contenido exclusivo', 'Que traten a fans nuevos y antiguos igual', 'No tener identidad de tribu'],
    triggers: ['Exclusividad', 'Reconocimiento', 'Acceso anticipado', 'Identidad de grupo'],
    language: 'insider, referencias internas, "vos ya sabés"',
    bestAngles: ['detrás-de-escena', 'historia-origen', 'comparacion', 'experto'],
    ctaStyle: 'ya saben por qué · compartí con alguien que lo necesite · para la comunidad',
    conversion: 'muy alta — ya compran, el foco es upsell y referidos',
  },
  ambicioso: {
    name: 'El Ambicioso / Growth hacker',
    desc: 'Quiere más de todo: más ingresos, más seguidores, más impacto. Ya.',
    awareness: 'media-alta',
    emotionalState: 'hambriento-impaciente',
    pains: ['No crecer tan rápido como quiere', 'Ver a otros superarlo', 'Falta de sistema para escalar'],
    triggers: ['Números grandes', 'Velocidad', 'Escala', 'Sistemas probados'],
    language: 'ambicioso, con cifras concretas, "de X a Y en Z tiempo"',
    bestAngles: ['emprendedor', 'dato-shockeante', 'antes-despues', 'experto'],
    ctaStyle: 'escalá ya · de 0 a 1K en 30 días · el sistema que usé',
    conversion: 'alta — si el resultado promete velocidad y escala',
  },
  perfeccionista: {
    name: 'El Perfeccionista / Análisis-parálisis',
    desc: 'Investiga todo antes de decidir. Necesita certeza total. Posterga por miedo al error.',
    awareness: 'alta',
    emotionalState: 'controlador-miedoso',
    pains: ['Miedo a equivocarse', 'Infinita investigación sin acción', 'Comparar demasiadas opciones'],
    triggers: ['Prueba social sólida', 'Garantías sin condiciones', 'Desglose detallado del proceso'],
    language: 'detallado, con pasos exactos, datos, sin ambigüedad',
    bestAngles: ['comparacion', 'experto', 'dato-shockeante', 'ugc'],
    ctaStyle: 'garantía total · sin riesgo · acá está todo el proceso',
    conversion: 'media — necesita tiempo y prueba exhaustiva',
  },
  procrastinador: {
    name: 'El Procrastinador / "Mañana empiezo"',
    desc: 'Sabe que necesita empezar, lo pospone constantemente. Urgencia externa lo mueve.',
    awareness: 'media-alta',
    emotionalState: 'culpable-resistente',
    pains: [
      'Saber que debería actuar y no hacerlo',
      'Excusas propias que reconoce como excusas',
      'Arrepentimiento por tiempo perdido',
    ],
    triggers: ['Escasez real', 'Consecuencias de NO actuar', 'Historias de quien tardó y pagó el precio'],
    language: 'confrontacional-amable, "¿cuánto más vas a esperar?"',
    bestAngles: ['misterio', 'humor-relatable', 'oficinista', 'antes-despues'],
    ctaStyle: 'el costo de esperar es... · últimos lugares · hoy o nunca',
    conversion: 'media — necesita urgencia real, no fabricada',
  },
};

// ── FORMATOS CREATIVOS ───────────────────────────────────────────────────────
export const CREATIVE_FORMATS = {
  carousel: {
    label: 'Carrusel',
    slides: '4-10',
    strength: 'saves · educación · listicles',
    hook: 'Primera slide = promesa + razón para swipear',
  },
  'reel-talking': {
    label: 'Reel Talking Head',
    duration: '15-45s',
    strength: 'conexión · autoridad · storytelling',
    hook: 'Primeros 2s: expresión facial + frase shockeante',
  },
  'reel-broll': {
    label: 'Reel B-roll + Voz',
    duration: '20-60s',
    strength: 'estética · lifestyle · behind scenes',
    hook: 'Imagen hermosa o inesperada + voz en off desde el inicio',
  },
  'ugc-style': {
    label: 'UGC Style Video',
    duration: '15-30s',
    strength: 'conversión · confianza · no parece ad',
    hook: 'Cámara casual + presentación natural "oye, tengo que contarte..."',
  },
  'story-poll': {
    label: 'Historia con Encuesta',
    duration: 'ephemeral',
    strength: 'engagement · segmentación de audiencia',
    hook: 'Pregunta que divide: Sí / No · A / B',
  },
  'meme-carousel': {
    label: 'Meme / Humor Carousel',
    slides: '2-5',
    strength: 'virality · shares · comunidad',
    hook: 'Setup en slide 1, punchline en slide 2',
  },
  'talking-head-list': {
    label: 'Lista en Video (Top N)',
    duration: '30-60s',
    strength: 'engagement · saves · educación rápida',
    hook: '"Top {N} cosas que..." con ritmo rápido',
  },
  'screen-record': {
    label: 'Screen Recording / Tutorial',
    duration: '30-90s',
    strength: 'valor educativo alto · autoridad · retención',
    hook: 'Mostrar el resultado final primero, luego el proceso',
  },
  'text-only': {
    label: 'Solo Texto (Quote / Declaración)',
    duration: 'static',
    strength: 'shares · reflexión · posicionamiento',
    hook: 'Frase corta, tipografía grande, fondo simple',
  },
  infografia: {
    label: 'Infografía / Visual Data',
    slides: '1-3',
    strength: 'saves · educación visual · autoridad',
    hook: 'Dato o estadística principal primero',
  },
};

// ── GENERADOR DE MATRIZ CREATIVA ─────────────────────────────────────────────

const fillTemplate = (template, vars = {}) => template.replace(/\{(\w+)\}/g, (_, k) => vars[k] || `[${k}]`);

const generateCombinationHeuristic = ({ angle, persona, format, topic, niche }) => {
  const a = ANGLES[angle];
  const p = BUYER_PERSONAS[persona];
  const f = CREATIVE_FORMATS[format];
  if (!a || !p || !f) return null;

  const hook = fillTemplate(a.hook_template, {
    topic: topic || niche || 'tu área',
    benefit: 'te ahorra tiempo',
    sacrifice: 'esfuerzo extra',
    timeframe: '6 meses',
    before: 'perdido',
    after: 'tengo resultados',
    product: topic || 'esto',
    result: 'cambiar todo',
    n: '3',
    action: 'ignoran esto',
    wrongThing: 'la teoría',
    triggerEvent: 'perdí todo',
    opcionA: 'el método viejo',
    opcionB: 'este sistema',
    habit: 'consistencia',
  });

  const painMatch = p.pains[Math.floor(Math.random() * p.pains.length)];
  const trigger = p.triggers[Math.floor(Math.random() * p.triggers.length)];

  return {
    angle: a.name,
    angleKey: angle,
    persona: p.name,
    personaKey: persona,
    format: f.label,
    formatKey: format,
    awareness: p.awareness,
    emotionalState: p.emotionalState,
    hook,
    painAddressed: painMatch,
    triggerUsed: trigger,
    tone: a.tone,
    cta: p.ctaStyle,
    formatHook: f.hook,
    conversionPotential: p.conversion,
    tags: [...(a.tags || []), p.emotionalState],
  };
};

// Top combos por objetivo
const TOP_COMBOS_BY_GOAL = {
  awareness: [
    ['misterio', 'curioso', 'reel-talking'],
    ['dato-shockeante', 'aburrido', 'reel-broll'],
    ['humor-relatable', 'aburrido', 'meme-carousel'],
    ['ugc', 'curioso', 'ugc-style'],
    ['principiante', 'curioso', 'carousel'],
  ],
  engagement: [
    ['humor-relatable', 'entusiasta', 'reel-talking'],
    ['detrás-de-escena', 'fanatico', 'story-poll'],
    ['comparacion', 'interesado', 'carousel'],
    ['dato-shockeante', 'ambicioso', 'carousel'],
    ['misterio', 'curioso', 'reel-talking'],
  ],
  conversion: [
    ['ugc', 'interesado', 'ugc-style'],
    ['esceptico', 'desahuciado', 'reel-talking'],
    ['antes-despues', 'desesperado', 'carousel'],
    ['producto-beneficio', 'interesado', 'reel-talking'],
    ['comparacion', 'perfeccionista', 'carousel'],
  ],
  community: [
    ['detrás-de-escena', 'fanatico', 'story-poll'],
    ['historia-origen', 'dolido', 'reel-talking'],
    ['humor-relatable', 'entusiasta', 'meme-carousel'],
    ['ugc', 'fanatico', 'ugc-style'],
    ['mama-papa', 'dolido', 'reel-broll'],
  ],
  sales: [
    ['producto-beneficio', 'desesperado', 'ugc-style'],
    ['ugc', 'interesado', 'ugc-style'],
    ['antes-despues', 'desesperado', 'reel-talking'],
    ['esceptico', 'desahuciado', 'reel-talking'],
    ['comparacion', 'perfeccionista', 'carousel'],
  ],
};

export const generateCreativeMatrix = ({ topic, niche, goal = 'engagement', count = 8 }) => {
  const topCombos = TOP_COMBOS_BY_GOAL[goal] || TOP_COMBOS_BY_GOAL.engagement;

  // Top combos primero
  const featured = topCombos
    .slice(0, 5)
    .map(([angle, persona, format]) => generateCombinationHeuristic({ angle, persona, format, topic, niche }))
    .filter(Boolean);

  // Extras aleatorios
  const angleKeys = Object.keys(ANGLES);
  const personaKeys = Object.keys(BUYER_PERSONAS);
  const formatKeys = Object.keys(CREATIVE_FORMATS);
  const extras = [];
  const seen = new Set(topCombos.map((c) => c.join('|')));
  let attempts = 0;
  while (extras.length < count - 5 && attempts < 50) {
    attempts++;
    const angle = angleKeys[Math.floor(Math.random() * angleKeys.length)];
    const persona = personaKeys[Math.floor(Math.random() * personaKeys.length)];
    const format = formatKeys[Math.floor(Math.random() * formatKeys.length)];
    const key = `${angle}|${persona}|${format}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const combo = generateCombinationHeuristic({ angle, persona, format, topic, niche });
    if (combo) extras.push(combo);
  }

  return { featured, extras, total: featured.length + extras.length };
};

// ── LLM: Copy real para top 5 combinaciones ──────────────────────────────────
const expandTopCombosLLM = async ({ combos, topic, platform, goal }) => {
  if (!combos?.length) return null;
  const comboList = combos
    .slice(0, 5)
    .map(
      (c, i) =>
        `${i + 1}. Ángulo "${c.angle}" + Persona "${c.persona}" + Formato "${c.format}" (tono: ${c.tone}, estado: ${c.emotionalState}, dolor: ${c.painAddressed})`,
    )
    .join('\n');

  const prompt = `Sos copywriter experto de ${platform === 'tiktok' ? 'TikTok' : 'Instagram'} para el nicho: ${topic}.
Objetivo de la cuenta: ${goal}.

Para cada una de estas 5 combinaciones Ángulo × Persona × Formato, generá copy específico y persuasivo.
Tono: conversacional LATAM, "vos", sin jerga corporativa, frases cortas.

Combinaciones:
${comboList}

SOLO JSON (array de 5 objetos):
[
  {
    "n": 1,
    "hook_final": "hook de 6-9 palabras específico para este ángulo+persona (no genérico)",
    "copy_body": "2-3 oraciones del cuerpo del mensaje (adaptado al estado emocional de la persona)",
    "cta_final": "CTA específico para esta persona en este estado emocional",
    "why_this_works": "1 oración explicando por qué esta combinación convierte"
  }
]`;

  try {
    return await askLLMJson(prompt, null, 'gpt-4o-mini', 900);
  } catch {
    return null;
  }
};

// ── Export principal ──────────────────────────────────────────────────────────
export const runAndromeda = async ({ topic = '', niche = '', goal = 'engagement', platform = 'instagram' } = {}) => {
  const matrix = generateCreativeMatrix({ topic, niche: niche || topic, goal, count: 10 });
  const llmCopy = await expandTopCombosLLM({ combos: matrix.featured, topic: topic || niche, platform, goal });

  // Merge LLM copy into featured combos
  if (Array.isArray(llmCopy)) {
    llmCopy.forEach((lc) => {
      const idx = (lc.n || 1) - 1;
      if (matrix.featured[idx]) {
        matrix.featured[idx].hook_final = lc.hook_final;
        matrix.featured[idx].copy_body = lc.copy_body;
        matrix.featured[idx].cta_final = lc.cta_final;
        matrix.featured[idx].why_this_works = lc.why_this_works;
      }
    });
  }

  return {
    topic,
    niche,
    goal,
    platform,
    featured: matrix.featured,
    extras: matrix.extras,
    total: matrix.total,
    allAngles: Object.entries(ANGLES).map(([k, v]) => ({
      key: k,
      name: v.name,
      desc: v.desc,
      bestFormats: v.bestFormats,
      tags: v.tags,
    })),
    allPersonas: Object.entries(BUYER_PERSONAS).map(([k, v]) => ({
      key: k,
      name: v.name,
      awareness: v.awareness,
      pains: v.pains,
      ctaStyle: v.ctaStyle,
      conversion: v.conversion,
    })),
    formats: Object.entries(CREATIVE_FORMATS).map(([k, v]) => ({ key: k, ...v })),
    insight: `${matrix.featured.length + matrix.extras.length} combinaciones únicas. Top ${matrix.featured.length} optimizadas para objetivo "${goal}". Cada ángulo × persona × formato = mensaje diferente → máximo ROAS y alcance orgánico.`,
  };
};

// ── HTTP handler ──────────────────────────────────────────────────────────────
export const handleAndromeda = async (req, res, path, m, body, ctx = {}) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };
  if (path === '/api/agency/andromeda/matrix' && m === 'POST') {
    try {
      const result = await runAndromeda({
        topic: body?.topic || '',
        niche: body?.niche || '',
        goal: body?.goal || 'engagement',
        platform: body?.platform || 'instagram',
      });
      return json(200, { ok: true, ...result });
    } catch (e) {
      return json(500, { ok: false, error: String(e?.message || e).slice(0, 300) });
    }
  }
  return false;
};
