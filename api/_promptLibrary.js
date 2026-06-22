/**
 * Prompt Library — biblioteca de prompts adaptables por nicho × arquetipo × estilo.
 *
 * Aditiva: NO reemplaza prompts existentes. Cuando el módulo que genera contenido
 * (slides, captions, hooks, copy) detecta nicho + arquetipo, prepende un "system
 * priming" rico al prompt base.
 *
 * Beneficios:
 *   - Voz consistente por nicho (no genérico)
 *   - Vocabulario, métricas, ejemplos típicos del nicho ya cargados
 *   - Tone matrix (educativo, viral, inspiracional, autoridad, vendedor, humor)
 *
 * Costo: $0 (todo determinista, son strings).
 * GET /api/library/prompts?niche=fitness&archetype=autoridad
 */

// ── Voice DNA por nicho — vocabulario, métricas, ejemplos, dolores únicos ────
export const NICHE_VOICE = {
  'marketing-digital': {
    vocab: [
      'embudo',
      'CTR',
      'CPL',
      'CAC',
      'LTV',
      'funnel',
      'TOFU/MOFU/BOFU',
      'engagement rate',
      'reach',
      'save rate',
      'closed rate',
      'no-touch sales',
    ],
    metrics: ['CTR ≥2%', 'CPL <$5 (LATAM)', 'engagement rate ≥4%', 'save rate ≥3%', 'close rate orgánico ≥1.5%'],
    examples: [
      'anuncio que escaló de $5/día a $500',
      'funnel 7 días que duplicó leads',
      'copy A/B con +180% CTR',
      'reels 8s con 10K saves',
    ],
    pains: [
      'leads de baja calidad',
      'clientes que regatean precio',
      'ads caros sin tracking',
      'contenido que no convierte',
    ],
    forbidden: ['gurú', 'tips genéricos', 'hacks mágicos', 'sin números'],
  },
  fitness: {
    vocab: [
      'hipertrofia',
      'RPE',
      'volumen semanal',
      'déficit calórico',
      'superávit',
      'split',
      'PPL',
      'full body',
      'TUT',
      'tempo',
    ],
    metrics: [
      '+5kg masa muscular en 12 sem',
      'perder 8kg en 16 sem con déficit moderado',
      'PR en banca/sentadilla/peso muerto',
    ],
    examples: [
      'rutina full body 3x/sem para principiantes',
      'plan de cuts de 12 sem',
      'protocolo de glúteo basado en EMG',
    ],
    pains: ['no progreso meses', 'dolor lumbar', 'no tengo tiempo', 'plateau', 'estancado en peso'],
    forbidden: ['transformación irreal', 'suplementos mágicos', 'antes/después sin contexto'],
  },
  food: {
    vocab: [
      'mise en place',
      'umami',
      'maillard',
      'fermentación',
      'curado',
      'batch cooking',
      'meal prep',
      'templado',
      'infusionado',
    ],
    metrics: ['receta en <30min', '<$3 por porción', '5 ingredientes o menos'],
    examples: ['fideos con manteca dorada', 'asado al horno como en parrilla', 'vegetales asados crujientes'],
    pains: ['poco tiempo', 'no sé qué cocinar', 'desperdicio comida', 'platos aburridos'],
    forbidden: ['ingredientes inaccesibles', 'procesos eternos', 'jerga de chef ininteligible'],
  },
  tech: {
    vocab: [
      'stack',
      'arquitectura',
      'API',
      'SDK',
      'SaaS',
      'open source',
      'self-hosted',
      'vibe-coding',
      'LLM',
      'agentes',
      'MCP',
      'observabilidad',
    ],
    metrics: ['ROI tool 10x', 'automatización ahorra 5h/sem', 'ARR $10k/mes con 1 producto'],
    examples: ['Claude Code reemplaza junior dev', 'n8n automatiza ventas', 'workflow agentes para ops'],
    pains: ['tools caros', 'curva aprendizaje', 'demasiadas opciones', 'no sé por dónde empezar'],
    forbidden: ['hype sin demo', 'prometer reemplazo de developers sin matices'],
  },
  finance: {
    vocab: [
      'interés compuesto',
      'flujo de caja',
      'EBITDA',
      'margen',
      'ROIC',
      'diversificación',
      'averaging',
      'dollar cost averaging',
      'fondo emergencia',
    ],
    metrics: ['ahorro 20% del ingreso', 'ROI ≥7% anual real', 'fondo emergencia 6 meses', 'deuda/ingreso <30%'],
    examples: ['$1000 a $10000 en 3 años', 'cómo armé portfolio diversificado', 'salir de deudas en 18 meses'],
    pains: ['no me alcanza', 'no sé en qué invertir', 'inflación me come ahorros', 'deudas atrasadas'],
    forbidden: ['promesas de retornos imposibles', 'crypto pump', 'copy trade sin verificación'],
  },
  business: {
    vocab: ['MRR', 'ARR', 'churn', 'runway', 'CAC payback', 'PMF', 'GTM', 'ICP', 'funnel', 'LTV/CAC'],
    metrics: ['$10k MRR', 'churn <5%/mes', 'CAC <3 meses payback', 'LTV/CAC ≥3'],
    examples: ['cero a $10k MRR en 6 meses', 'contratar primer empleado', 'validar idea con 10 entrevistas'],
    pains: ['no consigo clientes', 'equipo desalineado', 'no escalo', 'margen apretado'],
    forbidden: ['fórmulas mágicas', 'garantías de éxito', 'escalar sin sistema'],
  },
  beauty: {
    vocab: [
      'rutina',
      'skincare',
      'niacinamida',
      'retinol',
      'SPF',
      'tono',
      'subtono',
      'undertone',
      'barrera',
      'microbioma cutáneo',
    ],
    metrics: ['skin glow en 30 días', 'reducir acné 70% en 8 sem', 'rutina <5 min'],
    examples: ['skincare $20 que funciona', 'GRWM 5 min', 'transición a clean beauty'],
    pains: ['acné adulto', 'manchas', 'sensibilidad', 'rosácea', 'envejecimiento prematuro'],
    forbidden: ['promesas anti-edad sin estudios', 'copiar rutinas sin tipo de piel', 'recomendar sin contexto'],
  },
  humor: {
    vocab: ['POV', 'plot twist', 'cringe', 'meta-humor', 'reference', 'callback', 'setup-punchline', 'tag', 'beat'],
    metrics: ['saves >reach×3%', 'shares >5% del reach', 'retención >70% en reels'],
    examples: ['POV de un trabajo aburrido', 'reacción que se vuelve meme', 'cuando tu jefe dice esto'],
    pains: ['contenido aburrido', 'algoritmo te ignora', 'no genera shares'],
    forbidden: ['humor genérico', 'copiar TikTok ajeno', 'memes vencidos'],
  },
  lifestyle: {
    vocab: [
      'rutina',
      'wellness',
      'mindfulness',
      'journaling',
      'hábitos',
      'morning ritual',
      'digital detox',
      'slow living',
    ],
    metrics: ['rutina <30min', 'hábito sostenido 30 días', 'mejorar sueño en 2 semanas'],
    examples: ['rutina mañana real (no fake)', 'my year in habits', 'journaling 5 min cambió todo'],
    pains: ['agotamiento', 'sin tiempo', 'distracciones', 'no progreso personal'],
    forbidden: ['estética sin sustancia', 'perfectionism porn', 'vida fake'],
  },
  general: {
    vocab: ['valor', 'resultado', 'sistema', 'método', 'framework', 'proceso', 'impacto'],
    metrics: ['+X% en N tiempo', 'duplicar Y', 'mitad de Z'],
    examples: ['caso real con números', 'antes vs después documentado'],
    pains: ['no sé por dónde empezar', 'probé todo y no funciona', 'sin tiempo', 'sin presupuesto'],
    forbidden: ['frases genéricas', 'sin números', 'sin ejemplo concreto'],
  },
};

// ── Arquetipos de voz (cómo habla el creador) — 18 voces ─────────────────────
export const ARCHETYPES = {
  educador: {
    tone: 'didáctico, claro, paciente, paso a paso',
    sentence: 'Frases cortas, sin jerga, define cada concepto antes de usarlo.',
    cta: 'Guardá esto para volver a leerlo',
    hookStyle: '¿Sabías que [dato no obvio]?',
  },
  autoridad: {
    tone: 'experto, directo, datos primero',
    sentence: 'Afirmaciones rotundas respaldadas por números o casos propios.',
    cta: 'Aplicá esto esta semana y contame',
    hookStyle: 'Después de [N años / N clientes], lo que más importa es esto:',
  },
  vendedor: {
    tone: 'persuasivo, urgente, beneficios primero',
    sentence: 'Pain → Promise → Push. Frases cortas. CTA sin fricción.',
    cta: 'Comentá INFO y te paso el sistema',
    hookStyle: 'Si [problema], esto es para vos:',
  },
  inspirador: {
    tone: 'motivador, emocional, aspiracional',
    sentence: 'Storytelling personal. Vulnerabilidad. Conexión antes que dato.',
    cta: 'Mandame un DM si te resonó',
    hookStyle: 'Hace [tiempo] yo estaba [estado bajo]. Hoy [estado alto].',
  },
  humorista: {
    tone: 'irónico, relatable, ligero, meta',
    sentence: 'Setup-punchline. POV. Exagerar lo cotidiano.',
    cta: 'Etiquetá a alguien que necesita esto',
    hookStyle: 'POV: [situación reconocible]',
  },
  contrario: {
    tone: 'provocador, contraintuitivo, polariza',
    sentence: 'Desafía verdades aceptadas. Argumento sólido.',
    cta: '¿Coincidís? Comentá',
    hookStyle: 'Casi todos están equivocados con [tema]. Te explico:',
  },
  storyteller: {
    tone: 'narrativo, cinematográfico, emocional',
    sentence: 'Inicio-conflicto-resolución. Detalles sensoriales. Personajes.',
    cta: '¿Te pasó algo así? Contámelo',
    hookStyle: 'Lo que pasó después de [evento] me cambió todo.',
  },
  analista: {
    tone: 'frío, basado en datos, sin emocionalismo',
    sentence: 'Tesis → evidencia → conclusión. Cita fuentes. Sin opinión personal.',
    cta: 'Discutí esto en comentarios',
    hookStyle: 'Los datos dicen otra cosa sobre [tema].',
  },
  filosofico: {
    tone: 'reflexivo, preguntón, profundo',
    sentence: 'Pregunta abierta + matiz + síntesis. Cuestiona supuestos.',
    cta: 'Qué pensás vos',
    hookStyle: '¿Y si [creencia común] estuviera mal?',
  },
  cercano: {
    tone: 'amigo cercano, conversacional, cero filtro',
    sentence: 'Como si lo contaras a tu mejor amigo en un café.',
    cta: 'Te leo en comentarios',
    hookStyle: 'Te tengo que contar algo de [tema].',
  },
  energetico: {
    tone: 'hype, alta energía, signos de admiración',
    sentence: 'Frases que gritan. Ritmo veloz. Verbos de acción.',
    cta: 'VAMOS! Comentá',
    hookStyle: '¡ESTO va a cambiar tu [área]!',
  },
  underdog: {
    tone: 'humilde, "yo era como vos", relatable',
    sentence: 'Empezar desde el fracaso o el cero. Mostrar el viaje real.',
    cta: 'Empezá hoy aunque sea chico',
    hookStyle: 'Yo también estaba en [situación baja] hace [tiempo].',
  },
  premium: {
    tone: 'refinado, selectivo, exclusivo',
    sentence: 'Vocabulario cuidado. Frases breves con peso. Calidad > cantidad.',
    cta: 'Sumate a la lista exclusiva',
    hookStyle: 'No es para todos. Solo para quien busca [resultado superior].',
  },
  rebel: {
    tone: 'antisistema, contracorriente, hiperhonesto',
    sentence: 'Rompe reglas. Llama mentiras. Sin filtro corporativo.',
    cta: '¿Estás cansado igual que yo? Compartilo',
    hookStyle: 'La industria te miente sobre [tema]. La verdad:',
  },
  mentor: {
    tone: 'guía sabio, paciente, generoso',
    sentence: 'Te toma de la mano. Anticipa tus dudas. Te valida.',
    cta: 'Yo estoy acá para guiarte. Preguntame',
    hookStyle: 'Si yo hubiera sabido esto cuando empecé en [tema]...',
  },
  cientifico: {
    tone: 'curioso, basado en evidencia, sin promesas',
    sentence: 'Hipótesis → experimento → resultado. Cita estudios.',
    cta: '¿Querés ver el estudio? Comentá ESTUDIO',
    hookStyle: 'Un estudio del [año] muestra esto sobre [tema].',
  },
  visionario: {
    tone: 'futurista, ambicioso, ve diez años adelante',
    sentence: 'Predicciones grandes. Macro tendencias. Conecta puntos.',
    cta: 'Sumate al lado correcto del cambio',
    hookStyle: 'En 3 años [tema] va a cambiar todo. Acá está por qué:',
  },
  minimalista: {
    tone: 'pocas palabras, esencial, sin adornos',
    sentence: 'Cada palabra suma. Eliminar todo lo que no es esencial.',
    cta: 'Aplicá. Punto.',
    hookStyle: '[Tema]. Acá está la verdad.',
  },
};

// ── Mood de diseño — 22 estilos visuales ────────────────────────────────────
export const DESIGN_MOODS = {
  premium: {
    palette: 'oscuro + acento dorado/menta',
    fonts: 'serif elegante o sans bold',
    visual: 'iluminación cinematográfica, alto contraste',
  },
  minimalista: {
    palette: 'blanco + 1 acento',
    fonts: 'sans light, mucho whitespace',
    visual: 'espacios en blanco, líneas finas',
  },
  brutal: {
    palette: 'amarillo + negro + rojo',
    fonts: 'sans Black, tipografía protagonista',
    visual: 'bordes gruesos, sombras duras',
  },
  pastel: { palette: 'rosa + lavanda + crema', fonts: 'rounded sans', visual: 'suave, calmo, femenino' },
  techno: { palette: 'negro + neón cian/magenta', fonts: 'mono o geometric sans', visual: 'glow, gradientes, glitch' },
  organico: {
    palette: 'tierra + verde + crema',
    fonts: 'humanist sans',
    visual: 'texturas naturales, fotografía cálida',
  },
  editorial: {
    palette: 'blanco + negro + 1 spot color',
    fonts: 'serif + sans contrast',
    visual: 'jerarquía revista, fotografía protagonista',
  },
  'gen-z-meme': {
    palette: 'colores saturados',
    fonts: 'Impact / Comic Sans irónico',
    visual: 'memes, captions overlay, ironía visual',
  },
  retro80: {
    palette: 'magenta + cian + amarillo neón',
    fonts: 'chrome / outrun sans',
    visual: 'grilla synth, sunset, VHS scanlines',
  },
  retro90: {
    palette: 'turquesa + naranja + violeta',
    fonts: 'sans grotesque + script casual',
    visual: 'memphis patterns, formas geométricas',
  },
  vaporwave: {
    palette: 'rosa pastel + cian pastel + violeta',
    fonts: 'serif latín o japonés mix',
    visual: 'estatuas griegas, glitch, palmeras',
  },
  cyberpunk: {
    palette: 'negro + rojo + cian neón',
    fonts: 'mono futurista',
    visual: 'lluvia, neón en charcos, hud overlays',
  },
  noir: {
    palette: 'negro + blanco + gris (sin saturación)',
    fonts: 'serif clásica condensada',
    visual: 'sombras duras, contraste alto, dramático',
  },
  bauhaus: {
    palette: 'rojo + amarillo + azul primarios + negro',
    fonts: 'sans geometric (Futura)',
    visual: 'círculos, cuadrados, triángulos puros',
  },
  swiss: {
    palette: 'rojo + blanco + negro',
    fonts: 'Helvetica / Akzidenz',
    visual: 'grid estricto, alineación rígida, sin adorno',
  },
  glassmorphism: {
    palette: 'gradientes suaves + blur',
    fonts: 'sans rounded',
    visual: 'vidrio esmerilado, capas translúcidas, sombras suaves',
  },
  neumorphism: {
    palette: 'monocromo claro (gris/blanco)',
    fonts: 'sans medio',
    visual: 'sombras dobles in/out, botones que parecen tallados',
  },
  scrapbook: {
    palette: 'kraft + colores saturados pegados',
    fonts: 'mix handwriting + sans',
    visual: 'cutouts, washi tape, pegado a mano, polaroids',
  },
  collage: {
    palette: 'mix sin regla, pop-art',
    fonts: 'mix tipográfico anárquico',
    visual: 'recortes magazine, layers, manchas tinta',
  },
  documentary: {
    palette: 'desaturado, cinematográfico',
    fonts: 'sans editorial + serif intro',
    visual: 'fotografía real protagonista, lower thirds, cintilla',
  },
  luxury: {
    palette: 'oro + negro + crema marfil',
    fonts: 'serif Didone (Bodoni)',
    visual: 'mucho espacio, jerarquía sutil, fotografía product close-up',
  },
  nature: {
    palette: 'verde bosque + beige + terracota',
    fonts: 'humanist serif',
    visual: 'fotografía orgánica, texturas naturales, luz natural',
  },
  monochrome: {
    palette: '1 color en todas sus saturaciones',
    fonts: 'sans grotesque',
    visual: 'consistencia total, capas tonales',
  },
  duotone: {
    palette: '2 colores duotone fuerte',
    fonts: 'sans bold',
    visual: 'fotos procesadas duotone, alto impacto',
  },
};

// ── Roles creativos del sistema — lentes especializadas que procesan contenido ────
export const CREATIVE_ROLES = {
  'ai-creative-director': {
    label: 'AI Creative Director',
    desc: 'Define visión creativa, traduce idea/marca en sistemas escalables con IA',
    responsibilities: ['definir norte creativo', 'aprobar dirección visual', 'alinear marca-mensaje-medio'],
    questionsToAsk: ['¿Cuál es el insight central?', '¿Esto rompe el patrón?', '¿Construye marca o solo entretiene?'],
    output: 'Brief creativo de 1 oración + dirección de arte general',
    promptHook: 'Como AI Creative Director, evaluá esta idea: ¿hay insight? ¿hay diferenciación? Si no, reformulá.',
  },
  'creative-technologist': {
    label: 'Creative Technologist',
    desc: 'Híbrido creatividad + tecnología, transforma ideas en sistemas y prototipos',
    responsibilities: [
      'elegir stack creativo',
      'prototipo rápido',
      'conectar herramientas (nano-banana + FAL + Canva)',
    ],
    questionsToAsk: ['¿Qué tools combinan mejor?', '¿Cómo automatizo esto?', '¿Es escalable a 1000 piezas?'],
    output: 'Pipeline técnico-creativo de 3 pasos',
    promptHook: 'Como Creative Technologist, definí el pipeline más simple y escalable para producir esto.',
  },
  'ai-designer': {
    label: 'AI Designer',
    desc: 'Diseñador que usa IA como parte central — diseña sistemas, no solo piezas',
    responsibilities: ['design system', 'paleta + tipo + grid', 'comportamiento e interacción'],
    questionsToAsk: ['¿Es coherente con el resto del feed?', '¿Es legible en móvil?', '¿Es replicable?'],
    output: 'Specs de diseño (layout + palette + typography + grid)',
    promptHook: 'Como AI Designer, devolvé specs concretos: paleta hex, tipografía, jerarquía, grid.',
  },
  'ai-copywriter': {
    label: 'AI Copywriter',
    desc: 'Escribe copy persuasivo que convierte, sin jerga corporativa',
    responsibilities: ['hook que para el scroll', 'caption que convierte', 'CTA sin fricción'],
    questionsToAsk: ['¿La primera línea para el scroll?', '¿El CTA es claro y único?', '¿Hay prueba social?'],
    output: 'Hook + caption + CTA listos para publicar',
    promptHook: 'Como AI Copywriter, escribí copy directo, "vos", sin relleno corporativo. CTA único.',
  },
  'community-manager': {
    label: 'Community Manager AI',
    desc: 'Maneja comunicación 1:1 con seguidores — DMs, comentarios, stories',
    responsibilities: ['responder DMs con contexto', 'engagement comentarios', 'detectar leads warm'],
    questionsToAsk: ['¿Es lead o curioso?', '¿Cuál es el siguiente paso natural?', '¿Cómo personalizo sin ser robot?'],
    output: 'Plantillas de respuesta DM + reglas de triaje',
    promptHook: 'Como Community Manager, respondé como humano cálido. Sin templates obvios. Personalizá.',
  },
  'social-strategist': {
    label: 'Social Strategist AI',
    desc: 'Define qué publicar, cuándo y por qué — alinea contenido con objetivo de negocio',
    responsibilities: ['mix de formatos', 'cadencia', 'calendario alineado a objetivo'],
    questionsToAsk: [
      '¿Esto suma a awareness o conversion?',
      '¿Es el formato correcto para el mensaje?',
      '¿La cadencia es sostenible?',
    ],
    output: 'Plan semanal/mensual con mix justificado',
    promptHook: 'Como Social Strategist, justificá cada decisión de formato/horario con un objetivo de negocio.',
  },
  'growth-hacker': {
    label: 'Growth Hacker AI',
    desc: 'Encuentra atajos virales — hooks, formatos, ángulos que escalan rápido',
    responsibilities: ['detectar trending', 'reformular para máxima compartibilidad', 'A/B test hooks'],
    questionsToAsk: ['¿Esto se va a compartir?', '¿Tiene curiosity gap?', '¿Es replicable como serie?'],
    output: '3 variantes de hook + score de viralidad estimado',
    promptHook: 'Como Growth Hacker, devolvé 3 variantes de hook con score viral (1-10) y por qué.',
  },
  'brand-architect': {
    label: 'Brand Architect AI',
    desc: 'Construye sistema de marca — voz, valores, personalidad, dirección visual',
    responsibilities: ['voice & tone guidelines', "do/don't list", 'historia de marca'],
    questionsToAsk: ['¿Esto suena a la marca?', '¿Refuerza el posicionamiento?', '¿Es consistente con el feed?'],
    output: "Brand guideline en 5 líneas + ejemplos do/don't",
    promptHook:
      'Como Brand Architect, evaluá si esto refuerza la marca o solo busca likes. Reformulá si rompe consistencia.',
  },
  'data-analyst': {
    label: 'Data Analyst AI',
    desc: 'Lee métricas reales, identifica patrones de éxito/fracaso, recomienda',
    responsibilities: ['analizar últimos N posts', 'detectar formato ganador', 'recomendar próximos pasos'],
    questionsToAsk: ['¿Qué patrón emerge?', '¿Qué dejar de hacer?', '¿Qué duplicar?'],
    output: 'Insight + recomendación accionable',
    promptHook: 'Como Data Analyst, leé las métricas y devolvé 1 patrón claro + 1 acción específica.',
  },
  'trend-forecaster': {
    label: 'Trend Forecaster AI',
    desc: 'Predice tendencias del nicho 30-90 días adelante',
    responsibilities: ['scan trending audios/formatos', 'predicción macro nicho', 'oportunidades de adelantarse'],
    questionsToAsk: [
      '¿Esto está creciendo o saturándose?',
      '¿Quién más no está cubriendo este ángulo?',
      '¿Cuánto tiempo de ventaja queda?',
    ],
    output: 'Top 3 tendencias emergentes + ventana de tiempo',
    promptHook: 'Como Trend Forecaster, devolvé 3 tendencias emergentes específicas del nicho con timing.',
  },
};

// ── Plantillas de prompt por tarea ────────────────────────────────────────────
export const PROMPT_TEMPLATES = {
  carousel_slides: ({ topic, niche, archetype, mood, goal }) => {
    const v = NICHE_VOICE[niche] || NICHE_VOICE.general;
    const a = ARCHETYPES[archetype] || ARCHETYPES.educador;
    const m = DESIGN_MOODS[mood] || DESIGN_MOODS.premium;
    return `Sos creador de carruseles virales para el nicho "${niche}".
Tema: "${topic}". Objetivo: ${goal}. Arquetipo de voz: ${archetype} (${a.tone}).
Vocabulario propio del nicho: ${v.vocab.slice(0, 8).join(', ')}.
Métricas reales del nicho: ${v.metrics.slice(0, 3).join(' · ')}.
Ejemplos concretos a inspirarte (sin copiar): ${v.examples.slice(0, 2).join(' · ')}.
Dolores reales: ${v.pains.slice(0, 3).join(' · ')}.
Mood visual del diseño: ${mood} (${m.visual}).
PROHIBIDO: ${v.forbidden.join(', ')}, jerga corporativa, placeholders ("punto clave", "idea X").
ESTILO DE FRASES: ${a.sentence}
HOOK PATTERN sugerido: ${a.hookStyle}
CTA FINAL: ${a.cta}`;
  },

  caption: ({ topic, niche, archetype, goal, format }) => {
    const v = NICHE_VOICE[niche] || NICHE_VOICE.general;
    const a = ARCHETYPES[archetype] || ARCHETYPES.educador;
    return `Caption de ${format} para Instagram, nicho "${niche}", tema "${topic}", objetivo ${goal}.
Arquetipo: ${archetype} (${a.tone}). Frases cortas.
Usá vocabulario natural del nicho (${v.vocab.slice(0, 6).join(', ')}) si encaja, no forzado.
Incluí 1 micro-historia o número concreto del nicho. CTA: ${a.cta}.
EVITAR: ${v.forbidden.slice(0, 3).join(', ')}.`;
  },

  hook: ({ topic, niche, archetype }) => {
    const v = NICHE_VOICE[niche] || NICHE_VOICE.general;
    const a = ARCHETYPES[archetype] || ARCHETYPES.educador;
    return `Generá 5 hooks para reel/carrusel sobre "${topic}" (nicho ${niche}).
Cada hook ≤8 palabras. Arquetipo: ${archetype}. Patrón base: ${a.hookStyle}.
Conectá con dolores reales del nicho (${v.pains.slice(0, 2).join(' / ')}) o métricas concretas (${v.metrics.slice(0, 1)}).
NUNCA empezar con: "¿Sabías que...?", "Hoy te traigo...", "Antes de empezar..."`;
  },

  branded_image: ({ topic, niche, archetype, mood, brandColors }) => {
    const v = NICHE_VOICE[niche] || NICHE_VOICE.general;
    const m = DESIGN_MOODS[mood] || DESIGN_MOODS.premium;
    return `Imagen para post Instagram nicho "${niche}", tema "${topic}".
Mood: ${mood} → paleta ${m.palette}, fuentes ${m.fonts}, ${m.visual}.
${brandColors?.length ? `Colores de marca obligatorios: ${brandColors.join(', ')}.` : ''}
Elementos visibles del nicho (decoración/contexto, no protagonista): ${v.examples.slice(0, 1)}.
Texto on-screen mínimo (será agregado en edición). Composición premium, alto contraste, profundidad de campo.`;
  },
};

// ── UNIVERSAL TEMPLATES — funcionan para cualquier nicho ─────────────────────
// Reglas universales aplicables a cualquier idea/marca/objetivo.
export const UNIVERSAL_TEMPLATES = {
  any_carousel: ({ topic, goal, archetype, mood }) => {
    const a = ARCHETYPES[archetype] || ARCHETYPES.educador;
    const m = DESIGN_MOODS[mood] || DESIGN_MOODS.premium;
    return `Carrusel sobre "${topic}". Objetivo: ${goal}. Voz: ${a.tone}.
Reglas universales:
- Slide 1: hook ≤8 palabras que para el scroll. Patrón: ${a.hookStyle}
- Slides 2-N: una idea por slide, frases cortas, números o ejemplos concretos
- Último slide: CTA único sin opciones. ${a.cta}
- Visual: ${m.visual}. Paleta ${m.palette}.
PROHIBIDO: jerga corporativa, frases vacías ("aprovechá al máximo"), múltiples CTAs, exclamaciones gratuitas.`;
  },

  any_reel_script: ({ topic, goal, archetype }) => {
    const a = ARCHETYPES[archetype] || ARCHETYPES.educador;
    return `Guión de reel 15-30s sobre "${topic}". Objetivo: ${goal}.
Estructura: hook (0-2s) → contexto (2-5s) → desarrollo (5-20s) → CTA (20-25s).
Hook patrón: ${a.hookStyle}. Cierre: ${a.cta}.
Cada beat = una frase corta. Texto on-screen ≤4 palabras por escena.
Acción visual sugerida para cada beat.`;
  },

  any_story_set: ({ topic, archetype }) => {
    const a = ARCHETYPES[archetype] || ARCHETYPES.educador;
    return `3 historias secuenciales sobre "${topic}". Voz: ${a.tone}.
Historia 1: hook + pregunta abierta (sticker: encuesta sí/no).
Historia 2: revelación o dato (sticker: pregunta abierta).
Historia 3: CTA al perfil/producto (sticker: link).
Cada historia ≤8 palabras de texto. Visual fondo simple.`;
  },

  any_caption: ({ topic, archetype, goal }) => {
    const a = ARCHETYPES[archetype] || ARCHETYPES.educador;
    return `Caption para post sobre "${topic}". Voz: ${a.tone}. Objetivo: ${goal}.
Estructura: hook (1 línea) → desarrollo (2-3 frases) → CTA único (${a.cta}).
Sin hashtags (van separados). Sin emojis al inicio. Vos directo.
Máx 280 caracteres antes del "ver más".`;
  },

  any_hook_bank: ({ topic, archetype, count = 10 }) => {
    const a = ARCHETYPES[archetype] || ARCHETYPES.educador;
    return `${count} hooks distintos sobre "${topic}". Voz: ${a.tone}. Patrón base: ${a.hookStyle}.
Cada hook ≤9 palabras. Cada uno usa estructura diferente: pregunta, dato, contradicción, lista, POV, antes/después, error común, secreto revelado, ranking, comparación.
NO empezar con: "¿Sabías que...", "Hoy te traigo", "Antes de empezar".`;
  },

  any_dm_response: ({ context, intent, archetype = 'cercano' }) => {
    const a = ARCHETYPES[archetype] || ARCHETYPES.cercano;
    return `Respondé este DM como humano, voz ${a.tone}. NO sonar robot.
Contexto del DM: "${context}". Intención detectada: ${intent}.
Regla: 1) saludo personal con nombre si lo tenés, 2) reconocer su mensaje (1 oración), 3) responder/avanzar la conversación, 4) pregunta abierta para mantenerla viva. Máx 4 oraciones. Sin templates obvios. Sin "Hola! Gracias por escribirme".`;
  },

  any_comment_reply: ({ comment, archetype = 'cercano' }) => {
    const a = ARCHETYPES[archetype] || ARCHETYPES.cercano;
    return `Respondé este comentario en ${a.tone}. Máx 2 oraciones. Generá conversación, no cierre.
Comentario: "${comment}".
Si es pregunta → respondé directo + devolvé pregunta. Si es opinión → reconocé + matizá. Si es elogio → agradecé + invitá a más. Si es crítica → empatizá + clarificá sin defensiva.`;
  },

  any_brand_brief: ({ brand, values, audience, goal }) => {
    return `Brand brief en formato de 1 página.
Marca: ${brand}. Valores: ${values}. Audiencia: ${audience}. Objetivo de negocio: ${goal}.
Devolvé: 1) Posicionamiento (1 oración), 2) Voz (3 adjetivos + 2 cosas que NO sería), 3) Pilares de contenido (4), 4) Visual signature (paleta + tipo + mood), 5) North-star metric (qué medir para saber si funciona).`;
  },

  any_visual_prompt: ({ subject, mood, brandColors, niche }) => {
    const m = DESIGN_MOODS[mood] || DESIGN_MOODS.premium;
    return `Imagen para post Instagram. Sujeto: ${subject}.
Mood: ${mood} → paleta ${m.palette}, fuentes ${m.fonts}, visual ${m.visual}.
${brandColors?.length ? `Colores marca obligatorios: ${brandColors.join(', ')}.` : ''}
${niche ? `Contexto nicho: ${niche} (elementos sutiles, no protagonista).` : ''}
Composición: regla de tercios, profundidad de campo, alto contraste. Texto on-screen mínimo (se agrega en edición). Sin marca de agua. Realista o estilo definido por mood.`;
  },
};

// Detección automática de nicho a partir de string libre
export const detectNiche = (raw) => {
  const s = (raw || '').toLowerCase();
  const direct = Object.keys(NICHE_VOICE).find((k) => s.includes(k));
  if (direct) return direct;
  const aliases = {
    fitness: ['gym', 'entrenamiento', 'musculo', 'crossfit', 'running', 'culturismo', 'calisthenia'],
    food: ['cocina', 'recetas', 'chef', 'restaurante', 'comida', 'gastronomia'],
    tech: ['software', 'programacion', 'desarrollo', 'startup', 'ia', 'inteligencia artificial', 'no-code'],
    finance: ['finanzas', 'dinero', 'inversion', 'trading', 'ahorro', 'crypto', 'economia'],
    'marketing-digital': [
      'marketing',
      'copywriting',
      'ads',
      'contenido',
      'redes sociales',
      'community',
      'ventas digitales',
    ],
    business: ['negocio', 'emprendimiento', 'agencia', 'consultoria', 'b2b', 'saas'],
    beauty: ['maquillaje', 'skincare', 'belleza', 'peluqueria', 'manicura'],
    humor: ['humor', 'comedia', 'memes', 'gracioso'],
    lifestyle: ['lifestyle', 'bienestar', 'habitos', 'mindfulness', 'productividad'],
  };
  for (const [k, words] of Object.entries(aliases)) if (words.some((w) => s.includes(w))) return k;
  return 'general';
};

export const detectArchetype = (raw, goal) => {
  const s = (raw || '').toLowerCase();
  if (/humor|gracioso|meme|relatable|poker/.test(s)) return 'humorista';
  if (/experto|autoridad|años|profesional/.test(s)) return 'autoridad';
  if (/vender|cliente|conversion|cerrar/.test(s) || goal === 'conversion' || goal === 'sales') return 'vendedor';
  if (/inspirar|motivar|historia|personal/.test(s)) return 'inspirador';
  if (/contrario|polemico|impopular|opinion/.test(s)) return 'contrario';
  return 'educador';
};

// ── API principal: arma el priming a inyectar antes del prompt del módulo ─────
export const buildPriming = (task, opts = {}) => {
  const niche = detectNiche(opts.niche || opts.topic || '');
  const archetype = opts.archetype || detectArchetype(opts.topic || '', opts.goal);
  const mood = opts.mood || 'premium';
  // Probar templates específicos por nicho primero, después universales
  const tpl = PROMPT_TEMPLATES[task] || UNIVERSAL_TEMPLATES[task];
  if (!tpl) return { priming: '', niche, archetype, mood, error: 'unknown-task' };
  return { priming: tpl({ ...opts, niche, archetype, mood }), niche, archetype, mood };
};

// ── API rol creativo: devuelve "lente" de un rol para inyectar en prompts ─────
export const buildRolePriming = (roleKey, opts = {}) => {
  const r = CREATIVE_ROLES[roleKey];
  if (!r) return { priming: '', error: 'unknown-role' };
  const ctx = opts.context ? `\nCONTEXTO: ${opts.context}` : '';
  const priming = `[ROL: ${r.label}]
${r.desc}.
Responsabilidades: ${r.responsibilities.join(' · ')}.
Preguntas guía: ${r.questionsToAsk.join(' / ')}.
Output esperado: ${r.output}.
${r.promptHook}${ctx}`;
  return { priming, role: r.label };
};

// Pipeline de roles: corre múltiples roles en cadena sobre la misma idea
// Devuelve un mega-prompt que orquesta a varios roles para un brief
export const buildRoleChainPriming = (roleKeys = [], opts = {}) => {
  const blocks = roleKeys.map((k) => buildRolePriming(k, opts).priming).filter(Boolean);
  if (!blocks.length) return { priming: '', error: 'no-roles' };
  return {
    priming: `Vas a procesar este pedido secuencialmente desde múltiples roles. Cada rol aporta su lente. Sintetizá al final.

${blocks.join('\n\n---\n\n')}

FORMATO DE RESPUESTA: para cada rol, 2-3 bullets de output. Al final, una síntesis de 1 párrafo con la decisión final.`,
    roles: roleKeys,
  };
};

// ── HTTP ──────────────────────────────────────────────────────────────────────
export const handlePromptLibrary = async (req, res, path, m, body) => {
  const json = (code, obj) => {
    res.statusCode = code;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify(obj));
    return true;
  };
  if (path === '/api/library/role-pipeline' && m === 'POST') {
    try {
      const out = buildRoleChainPriming(body?.roles || [], { context: body?.context || '' });
      return json(200, { ok: true, ...out });
    } catch (e) {
      return json(500, { ok: false, error: String(e?.message || e).slice(0, 200) });
    }
  }
  if (path === '/api/library/prompts' && m === 'GET') {
    try {
      const url = new URL(req.url, 'http://x');
      const niche = url.searchParams.get('niche');
      const archetype = url.searchParams.get('archetype');
      const task = url.searchParams.get('task');
      const topic = url.searchParams.get('topic') || 'tu tema';
      if (task) {
        const built = buildPriming(task, {
          niche,
          archetype,
          topic,
          goal: url.searchParams.get('goal') || 'engagement',
          mood: url.searchParams.get('mood') || 'premium',
        });
        return json(200, { ok: true, ...built });
      }
      return json(200, {
        ok: true,
        niches: Object.keys(NICHE_VOICE),
        archetypes: Object.keys(ARCHETYPES),
        moods: Object.keys(DESIGN_MOODS),
        tasks: Object.keys(PROMPT_TEMPLATES),
        universalTasks: Object.keys(UNIVERSAL_TEMPLATES),
        roles: Object.entries(CREATIVE_ROLES).map(([k, r]) => ({
          key: k,
          label: r.label,
          desc: r.desc,
          output: r.output,
        })),
      });
    } catch (e) {
      return json(500, { ok: false, error: String(e?.message || e).slice(0, 200) });
    }
  }
  return false;
};
