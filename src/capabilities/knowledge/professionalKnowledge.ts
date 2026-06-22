/**
 * Professional Knowledge Bases de FeedIA — bases de conocimiento de las profesiones
 * que el sistema reemplaza.
 *
 * Cada KB contiene principios, frameworks, técnicas, checklists y patrones
 * que el sistema usa para generar contenido y decisiones a nivel profesional.
 *
 * Profesiones cubiertas:
 *   - Community Manager (CM)
 *   - Diseñador Gráfico
 *   - Especialista de Branding
 *   - Agente Creativo / Director Creativo
 *   - Especialista en Sociología / Antropología de Audiencias
 *   - Artista Visual / Director de Arte
 *   - Copywriter / Estratega de Mensaje
 *   - Productor de Video / Editor
 */

import type { BrandProfile } from '../../config/types.js';

// ── 1. COMMUNITY MANAGER ─────────────────────────────────────────────────────

export const COMMUNITY_MANAGER_KB = {
  rol: 'Community Manager senior con 7+ años en cuentas de 10k-500k seguidores',
  principios: [
    'Responder en <1h durante horario activo aumenta engagement rate 3x',
    'Los primeros 5 comentarios del post influyen en cómo el algoritmo lo distribuye',
    'Conversaciones largas en comentarios (3+ turnos) son señal muy positiva al algoritmo',
    'Los DMs que abren conversación generan 8x más conversión que comentarios públicos',
    'No todos los comentarios merecen respuesta; algunos merecen pregunta de seguimiento',
    'La consistencia en el tono es más importante que la perfección de cada respuesta',
  ],
  patrones_respuesta: {
    elogio_corto: 'Agradecer con calidez + agregar 1 dato extra que profundice el tema',
    elogio_largo: 'Agradecer + reconocer algo específico de lo que dijeron + invitar a profundizar',
    pregunta_simple: 'Responder con valor real + cerrar con pregunta abierta',
    pregunta_compleja: 'Responder en partes + ofrecer continuar por DM si quieren',
    critica_legitima: 'Validar + agradecer feedback + explicar contexto sin ponerse a la defensiva',
    critica_destructiva: 'Reconocer breve + redirigir a propuesta de valor + no entrar en discusión',
    troll: 'Ignorar O responder con humor que desactive el conflicto, nunca con bronca',
    consulta_comercial: 'Mostrar interés genuino + pedir 1-2 datos específicos + invitar a DM',
    discrepancia_opinion: 'Validar su perspectiva + plantear la tuya con ejemplos concretos + no buscar ganar',
    spam: 'Borrar sin responder + reportar si es masivo',
  },
  metricas_clave: {
    responseRate: 'Meta: 95%+ de DMs respondidos en 24h',
    avgResponseTime: 'Meta: < 30 minutos en horario activo',
    sentimentScore: 'Meta: +0.7 promedio (escala -1 a +1)',
    conversionDMtoLead: 'Meta: 15-30% de DMs comerciales',
    repeatEngagementRate: 'Meta: 35%+ de followers comentan > 1 vez por mes',
  },
  red_flags: [
    'Caída del response rate por debajo de 80% → seguidores pierden confianza',
    'Aumento de comentarios negativos sin respuesta → mancha de aceite',
    'Conversiones DM→lead bajo 10% → mensaje de venta mal calibrado',
    'Spam acumulándose sin moderar → degrada la calidad del feed',
  ],
} as const;

// ── 2. DISEÑADOR GRÁFICO ─────────────────────────────────────────────────────

export const DESIGNER_KB = {
  rol: 'Director de arte senior especializado en redes sociales y branding',
  principios_composicion: [
    'Regla de tercios: puntos de interés en intersecciones de la grilla 3x3',
    'Punto focal único: el ojo debe saber dónde mirar primero en menos de 1s',
    'Jerarquía: el elemento más importante debe ser 3x mayor o 50% más contrastado',
    'Espacio negativo: 30-50% del cuadro respira sin elementos',
    'Líneas guía: usar diagonales o curvas para dirigir la mirada',
    'Repetición + variación: patrones unifican, variaciones evitan monotonía',
    'Contraste de figura/fondo: figura siempre debe sobresalir claramente',
  ],
  principios_tipografia: [
    'Máximo 2 familias tipográficas por pieza (3 solo en piezas muy editoriales)',
    'Contraste de pesos: bold para títulos, regular para body, light solo decorativo',
    'Tracking en títulos: -2% a -5% (más apretado se ve premium)',
    'Tracking en body: 0% a +1%',
    'Leading (line-height): 1.4-1.6× tamaño de fuente para legibilidad',
    'Nunca all-caps en bloques de body. OK en títulos cortos o etiquetas',
    'Cuerpo mínimo en mobile: 14-16px equivalente',
    'Contraste color/fondo mínimo 4.5:1 (WCAG AA) para texto normal',
  ],
  principios_color: [
    'Regla 60-30-10: dominante 60% / secundario 30% / acento 10%',
    'Saturación armónica: si un color es vibrante, el resto debe ser más sutil',
    'Temperatura coherente: cálidos con cálidos o contraste intencional cálido/frío',
    'Color de marca presente en el área de mayor jerarquía',
    'Limitar paleta a 3-5 colores principales para coherencia',
    'Colores neutros (blanco, negro, gris) son 1-2 de los 3-5 colores',
  ],
  formatos_instagram: {
    feed_post: { aspect: '4:5', safe_area: 'centro 1080x1080', text_max: '7-10 palabras' },
    reel_cover: { aspect: '9:16', safe_area: 'centro vertical', text_max: '4-6 palabras' },
    story: { aspect: '9:16', safe_area: 'medio, evitar bordes superior/inferior 250px', text_max: '5-8 palabras' },
    carousel_slide: { aspect: '4:5', safe_area: 'mismo grid en todas las slides', text_max: '15-25 palabras' },
    highlight_cover: { aspect: '1:1', safe_area: 'círculo centrado 380x380', text_max: '0-2 palabras (icon-driven)' },
  },
  errores_comunes: [
    'Demasiado texto por slide en carrusel (más de 30 palabras = malo)',
    'Tipografía dudosa: web fonts genéricas, mezclar fuentes serif + sans aleatoriamente',
    'Contraste insuficiente: texto gris claro sobre fondo blanco',
    'Densidad visual: tratar de meter todo en una sola pieza',
    'Iconografía inconsistente: mezclar outline e solid, varios estilos',
    'Stock photos genéricas que no aportan al mensaje',
    'Filtros heavy que distorsionan colores de marca',
  ],
  workflow_diseno: [
    '1. Brief: target, mensaje, plataforma, formato, deadline',
    '2. Referencias: 5-10 piezas inspiración del nicho (pero no copiar)',
    '3. Wireframe: bocetos de layout con jerarquía sin estilo',
    '4. Iteración 1: aplicar paleta de marca + tipografía',
    '5. Review: ¿el mensaje se entiende en 2 segundos?',
    '6. Iteración 2: ajustar contraste, espacio, jerarquía',
    '7. Export: tamaños correctos por plataforma',
    '8. QA: ¿se ve bien en mobile?, ¿el color es accesible?',
  ],
} as const;

// ── 3. BRAND STRATEGIST ──────────────────────────────────────────────────────

export const BRAND_STRATEGIST_KB = {
  rol: 'Brand strategist senior, formación en diseño + marketing + psicología',
  frameworks: {
    arquetipos_jung: [
      'Inocente: pureza, simplicidad, optimismo (Coca-Cola, Dove)',
      'Hombre común: pertenencia, conexión real (IKEA, Mercado Libre)',
      'Héroe: coraje, victoria, transformación (Nike, BMW)',
      'Forajido: rebeldía, libertad, ruptura (Harley, Diesel)',
      'Explorador: aventura, descubrimiento (The North Face, Jeep)',
      'Sabio: conocimiento, verdad (Google, Harvard, MIT)',
      'Mago: transformación, lo extraordinario (Apple, Tesla, Disney)',
      'Amante: pasión, sensualidad, conexión emocional (Chanel, Häagen-Dazs)',
      'Bufón: humor, gozo, alegría (Old Spice, M&M)',
      'Cuidador: cuidado, servicio, protección (Volvo, Johnson&Johnson)',
      'Creador: imaginación, artesanía (Lego, Adobe)',
      'Gobernante: control, poder, estabilidad (Mercedes, Rolex)',
    ],
    pilares_marca: [
      'Promesa: qué transformación entregás',
      'Razón para creer: por qué deberían creerte',
      'Personalidad: cómo te comportás',
      'Voz: cómo hablás',
      'Visual: cómo te ves',
      'Experiencia: cómo se siente interactuar con vos',
    ],
    posicionamiento_clasico: [
      'Para [audiencia objetivo]',
      'Que [necesita / desea X]',
      '[Marca] es la [categoría]',
      'Que [beneficio único principal]',
      'Porque [razón para creer]',
    ],
    territorios_comunicacion: [
      'Educacional: enseñar algo aplicable',
      'Inspiracional: mostrar lo que es posible',
      'Aspiracional: aspirar al ideal',
      'Funcional: resolver problema concreto',
      'Identitario: representar valores compartidos',
      'Entretenimiento: divertir con contenido relacionado',
    ],
  },
  signos_de_marca_saludable: [
    'Los clientes pueden describir la marca en 1 frase sin tu ayuda',
    'Hay un "fan tipo" identificable que repite características',
    'La competencia no puede copiar lo más importante',
    'El precio premium se sostiene sin justificarlo',
    'Llegan clientes "por boca a boca" cualificados',
    'El equipo nuevo entiende el tono después de leer 3 piezas',
  ],
  signos_de_marca_enferma: [
    'Audiencia no sabe explicar qué hace la marca',
    'Necesitás competir por precio porque no se diferencia',
    'Cada pieza parece de marca distinta',
    'Los clientes vienen por descuento y se van',
    'El equipo discute el tono en cada pieza',
    'Engagement bajando 3+ meses sin razón externa',
  ],
} as const;

// ── 4. CREATIVE DIRECTOR ─────────────────────────────────────────────────────

export const CREATIVE_DIRECTOR_KB = {
  rol: 'Director creativo con experiencia en agencia + in-house',
  principios_creativos: [
    'La idea es más importante que la ejecución (pero ejecución pobre mata idea brillante)',
    'Restringir el brief mejora la creatividad: límites generan saltos',
    'Si la idea no se puede explicar en 1 frase, no es una idea sólida',
    'Lo simple es difícil. Si parece simple y obvio en retrospectiva, es buena señal',
    'Robar como artista (Picasso): combinar inspiraciones diversas, no copiar 1 fuente',
    'Matar tus darlings: cortar lo bueno para que lo excelente brille',
    'Si te emociona a vos creador, hay 50% de chance que emocione al público',
    'El primer draft siempre va para la basura; la edición es donde nace el arte',
  ],
  metodologias_creativas: {
    SCAMPER: 'Sustituir / Combinar / Adaptar / Modificar / Poner otro uso / Eliminar / Reordenar',
    six_thinking_hats: 'Hechos / Emociones / Cautela / Optimismo / Creatividad / Proceso',
    SCAMPER_aplicado_a_post: [
      'Sustituir: cambiar audiencia objetivo',
      'Combinar: 2 temas que no parecen ir juntos',
      'Adaptar: tomar de otro nicho',
      'Modificar: invertir la tesis típica',
      'Poner otro uso: usar el formato A para el tema B',
      'Eliminar: quitar lo que todos hacen',
      'Reordenar: empezar por el final',
    ],
    crazy_eights: '8 ideas en 8 minutos, malas y buenas, sin censura',
    yes_and: 'Construir sobre la idea anterior, nunca decir "no" en brainstorm',
  },
  tipos_de_ideas: {
    insight_based: 'Parte de una verdad humana incómoda o sorprendente',
    transformacional: 'Muestra el antes/después con detalle',
    pattern_interrupt: 'Rompe el patrón visual o narrativo del feed',
    payoff_diferido: 'Construye tensión y entrega payoff al final',
    relatabilidad: 'La audiencia se ve reflejada en el contenido',
    contraintuitivo: 'Plantea lo contrario al consenso del nicho',
  },
  diagnostico_idea_pobre: [
    'Suena a comunicado oficial',
    'Cualquier marca del nicho podría firmarlo',
    'Necesita 5 líneas de contexto para entenderse',
    'No genera emoción concreta',
    'No tiene "porque" (motivo de existir)',
  ],
} as const;

// ── 5. SOCIAL SCIENTIST / ANTHROPOLOGIST ────────────────────────────────────

export const SOCIAL_SCIENTIST_KB = {
  rol: 'Investigador social especializado en audiencias digitales y cultura de redes',
  modelos_audiencia: {
    pirámide_engagement: [
      'Pasivos (90%): solo consumen, raramente interactúan',
      'Reactivos (8%): dan likes y guardan, comentan ocasionalmente',
      'Activos (1.5%): comentan regularmente, comparten',
      'Embajadores (0.5%): defienden la marca, generan UGC',
    ],
    arquetipos_seguidores: [
      'Aspirante: sigue por aspiración, no compra (aún)',
      'Estudiante: busca aprender, alta tasa de saves',
      'Cliente potencial: investiga antes de comprar',
      'Cliente actual: ya compró, sigue para mantener relación',
      'Embajador: recomienda activamente',
      'Crítico: sigue para observar/criticar',
      'Pares: otros creadores del nicho que monitorean',
    ],
  },
  triggers_culturales_2026: [
    'Anti-perfección: contenido "real" gana sobre estetizado',
    'Antinanasismo: rechazo a comunicación corporativa pulida',
    'Slow social: menos posts, más curados',
    'Vulnerabilidad estratégica: mostrar errores genera confianza',
    'Micro-comunidades: pertenecer a sub-grupos > masas',
    'POV cultural: contenido desde perspectiva personal vs neutra',
    'Educación de profundidad: carruseles long-form > tips superficiales',
    'Long-tail nichos: hiperespecialización > generalización',
    'Backlash IA: declarar "humano" gana credibilidad',
    'Sustentabilidad genuina: no greenwashing',
  ],
  patrones_consumo_2026: {
    horas_pico_LATAM: ['08:00-09:30', '12:00-13:30', '18:30-21:00'],
    formato_dominante: 'Reels cortos (7-15s) + carruseles de 8+ slides',
    duración_atención_promedio: '2.7 segundos antes del swipe',
    porcentaje_audio_off: '78% de reels se ven sin audio',
    swipe_rate_carrusel: '62% promedio swipea hasta slide 3, 28% hasta slide 7',
  },
  fenomenos_culturales_a_observar: [
    'Subculturas que ganan momentum cada quarter',
    'Lenguajes generacionales (jerga zoomer, alpha)',
    'Memes con vida media (siempre rotando)',
    'Sound trends (audios que explotan en TikTok)',
    'Crisis culturales que afectan tono apropiado',
  ],
  metodos_research: [
    'Etnografía digital: observar conversaciones en grupos privados / Reddit',
    'Encuestas en stories: insights cualitativos rápidos',
    'Análisis de comentarios: extraer dolores y deseos textuales',
    'Listening de hashtags: qué se dice realmente en el nicho',
    'Entrevistas con clientes top: insights de buyer journey real',
  ],
} as const;

// ── 6. ARTISTA / DIRECTOR DE ARTE ───────────────────────────────────────────

export const ART_DIRECTOR_KB = {
  rol: 'Director de arte con visión artística + sensibilidad comercial',
  movimientos_visuales_2026: [
    'Neo-retro: estética 90s/2000s reinterpretada',
    'Brutalismo digital: tipografía bold, layouts crudos, paletas saturadas',
    'Maximalismo curado: muchos elementos pero con jerarquía clara',
    'Anti-design: layouts que rompen reglas a propósito',
    'Hyper-real 3D: renders fotorrealistas con touches imposibles',
    'Glitch art: estética digital corrupta intencionada',
    'Y2K revival: cromados, holográficos, beige plástico',
    'Soft minimalism: minimalismo con elementos cálidos y humanos',
  ],
  referencias_artisticas_atemporales: [
    'Bauhaus: geometría, color primario, función > forma',
    'Saul Bass: tipografía expresiva, contraste cromático',
    'David Carson: ruptura de grilla, expresión emocional',
    'Pentagram: minimalismo elegante con personalidad',
    'Stefan Sagmeister: provocación + craft impecable',
    'Studio Dumbar: experimental dentro del rigor',
    'M/M Paris: arte aplicado a moda',
  ],
  composiciones_clasicas: {
    rule_of_thirds: 'Elementos en intersecciones 3x3',
    centered_composition: 'Simétrica, formal, autoridad',
    leading_lines: 'Líneas que dirigen la mirada al punto focal',
    framing: 'Elementos enmarcando el sujeto principal',
    pattern_repetition: 'Repetición que crea ritmo + variación que rompe',
    negative_space: 'Vacío como protagonista',
    diagonal: 'Dinamismo, movimiento, urgencia',
  },
  paletas_emocionales: {
    confianza: 'Azules, blancos, grises fríos',
    energía: 'Naranjas, amarillos, rojos saturados',
    elegancia: 'Negros, dorados, marfil',
    naturalidad: 'Verdes, tierra, beige',
    futurismo: 'Magenta, cyan, negro profundo',
    nostalgia: 'Pasteles desaturados, ocres',
    premium: 'Negro + un acento de color',
    optimismo: 'Amarillos, corales, celestes',
  },
} as const;

// ── 7. COPYWRITER ────────────────────────────────────────────────────────────

export const COPYWRITER_KB = {
  rol: 'Copywriter senior con foco en direct response + brand voice',
  formulas_clasicas: {
    AIDA: 'Atención → Interés → Deseo → Acción',
    PAS: 'Problema → Agitar → Solución',
    BAB: 'Before → After → Bridge',
    FAB: 'Feature → Advantage → Benefit',
    APP: 'Agree → Promise → Preview',
    QUEST: 'Qualify → Understand → Educate → Stimulate → Transition',
  },
  tipos_hooks: {
    pregunta_directa: '¿Hacés X pero no lográs Y?',
    estadistica_impactante: 'El 87% de [audiencia] no sabe esto',
    contraste: 'Todos hacen X. Mejor hacer Y.',
    lista_prometida: '5 cosas que [resultado] en [tiempo]',
    secreto_revelado: 'Nadie te dice esto sobre [tema]',
    antes_despues: 'Pasé de X a Y en [tiempo]',
    error_costoso: 'Este error te cuesta [recurso]',
    pov_intimo: 'POV: [situación específica]',
    opinion_polemica: 'Opinión impopular: [creencia]',
    imperativo_stop: 'Stop. Dejá de [acción]',
  },
  cierres_cta: {
    instructivo: 'Guardá esto / Compartilo / Comentá [palabra]',
    intriga: '¿Querés el paso 2? Comentá [palabra]',
    invitacion: 'Si te resonó, escribime [palabra] al DM',
    reciprocidad: 'Lo armé gratis. Si te sirve, dejá un comentario',
    urgencia: 'Cierro inscripciones en 24h. Link en bio',
  },
  errores_caption: [
    'Empezar con "Hola/Bienvenidos/Hoy te traigo"',
    'Repetir el título en el cuerpo',
    'Más de 3 ideas en una pieza',
    'CTA débil ("Espero te haya gustado")',
    'Emojis decorativos sin función',
    'Mayúsculas en exceso',
    'Hashtags pegados al texto sin separación',
    'CTA antes del valor entregado',
  ],
} as const;

// ── 8. VIDEO PRODUCER ────────────────────────────────────────────────────────

export const VIDEO_PRODUCER_KB = {
  rol: 'Editor/productor especializado en reels y video corto',
  estructura_reel_ganador: [
    'Frame 1 (0-1s): hook visual o textual que pare el scroll',
    'Frame 2 (1-3s): promesa de payoff (qué se va a ver/aprender)',
    'Body (3-X seg): entrega del contenido en partes cortas',
    'Picos de atención: cambio de plano o texto cada 2-3 seg',
    'Payoff final: la revelación, conclusión o cierre',
    'CTA (último 1-2 seg): qué hacer después',
  ],
  tipos_reels_alto_performance: {
    talking_head_dinamico: 'Persona hablando + cortes rápidos + texto en pantalla',
    tutorial_speed: 'Voiceover + manos haciendo + subtítulos',
    storytelling_pov: 'Primera persona + planos cinematográficos',
    transformacion_visual: 'Antes / Después con transiciones limpias',
    skit_actuado: 'Mini sketch que ilustra un punto',
    listicle_visual: 'Frame por cada ítem de una lista',
    reaction_review: 'Reaccionar a algo del nicho con análisis',
    behind_scenes: 'Mostrar el proceso de hacer X',
  },
  audio_en_reels: [
    'Audio trending: aumenta alcance 2-4x si encaja con la marca',
    'Voz propia + audio trending de fondo bajito: equilibrio',
    'Música del catálogo de IG es seguro para cuentas comerciales',
    'No usar audios con copyright detectado: el reel pierde alcance',
    'Audios con +50k usos pero <500k son la zona dulce (en alza)',
  ],
  edicion_principles: [
    'Ritmo: cortes cada 2-3 segundos máximo en reels educativos',
    'Captions siempre (78% mira sin audio)',
    'Texto en pantalla: máx 7 palabras por frame, grande, contraste fuerte',
    'Color grading consistente entre piezas (signature look)',
    'Logo solo al final, no al principio (no interrumpe el hook)',
    'Vertical 9:16 nativo, evitar pillar boxing',
  ],
  errores_video_comunes: [
    'Hook visual lento (3+ seg sin ocurrir nada)',
    'Demasiado relleno antes del payoff',
    'Audio mal mezclado: voz baja, música fuerte',
    'Captions con errores o mal sincronizados',
    'Salto abrupto al CTA sin transición',
    'Branding excesivo en intro (logo grande, identificación verbal)',
  ],
} as const;

// ── Función helper: armar contexto para tareas según rol necesario ───────────

export type ProfessionRole =
  | 'cm'
  | 'designer'
  | 'brand_strategist'
  | 'creative_director'
  | 'social_scientist'
  | 'art_director'
  | 'copywriter'
  | 'video_producer';

const KB_MAP = {
  cm: COMMUNITY_MANAGER_KB,
  designer: DESIGNER_KB,
  brand_strategist: BRAND_STRATEGIST_KB,
  creative_director: CREATIVE_DIRECTOR_KB,
  social_scientist: SOCIAL_SCIENTIST_KB,
  art_director: ART_DIRECTOR_KB,
  copywriter: COPYWRITER_KB,
  video_producer: VIDEO_PRODUCER_KB,
} as const;

export const getProfessionKB = (role: ProfessionRole): (typeof KB_MAP)[ProfessionRole] => KB_MAP[role];

export const buildProfessionalSystemPrompt = (role: ProfessionRole, brand: BrandProfile): string => {
  const kb = KB_MAP[role];
  const roleLabel: Record<ProfessionRole, string> = {
    cm: 'Community Manager senior',
    designer: 'Diseñador Gráfico senior',
    brand_strategist: 'Brand Strategist senior',
    creative_director: 'Director Creativo senior',
    social_scientist: 'Investigador Social digital senior',
    art_director: 'Director de Arte senior',
    copywriter: 'Copywriter senior direct response',
    video_producer: 'Productor de Video / Editor senior',
  };

  return `Sos un ${roleLabel[role]} trabajando para @${brand.name} (${brand.niche}).

CONOCIMIENTO PROFESIONAL CARGADO:
${JSON.stringify(kb, null, 2).slice(0, 3500)}

CONTEXTO DE MARCA:
- Nombre: ${brand.name}
- Nicho: ${brand.niche}
- Audiencia: ${brand.audience.description}
- Tono de voz: ${brand.voice.tone.join(', ')}
- Paleta visual: ${brand.visual.palette.join(', ') || '(sin definir)'}
- Objetivo principal: ${brand.goals.primary}

Trabajá con criterio profesional usando tu KB, no genérico.`;
};

// ── Lista de todas las profesiones cubiertas ────────────────────────────────

export const PROFESSIONS_REPLACED = [
  { role: 'cm' as ProfessionRole, replaces: 'Community Manager', marketRate: '$1500-3000 USD/mes' },
  { role: 'designer' as ProfessionRole, replaces: 'Diseñador Gráfico Senior', marketRate: '$2000-4000 USD/mes' },
  { role: 'brand_strategist' as ProfessionRole, replaces: 'Brand Strategist', marketRate: '$3000-6000 USD/mes' },
  { role: 'creative_director' as ProfessionRole, replaces: 'Director Creativo', marketRate: '$4000-8000 USD/mes' },
  {
    role: 'social_scientist' as ProfessionRole,
    replaces: 'Investigador de audiencias',
    marketRate: '$3000-5000 USD/mes',
  },
  { role: 'art_director' as ProfessionRole, replaces: 'Director de Arte', marketRate: '$3500-6500 USD/mes' },
  { role: 'copywriter' as ProfessionRole, replaces: 'Copywriter Senior', marketRate: '$2000-4500 USD/mes' },
  {
    role: 'video_producer' as ProfessionRole,
    replaces: 'Productor / Editor de Video',
    marketRate: '$2000-4000 USD/mes',
  },
] as const;

export const getReplacementValue = (): { totalUsdPerMonth: number; profiles: typeof PROFESSIONS_REPLACED } => {
  let total = 0;
  for (const p of PROFESSIONS_REPLACED) {
    const range = p.marketRate.replace(/\$|USD\/mes/g, '').trim();
    const [min, max] = range.split('-').map((s) => parseInt(s.replace(/,/g, ''), 10));
    if (min && max) total += (min + max) / 2;
  }
  return { totalUsdPerMonth: total, profiles: PROFESSIONS_REPLACED };
};
