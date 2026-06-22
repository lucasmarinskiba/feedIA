/**
 * nichePacks.ts
 * Pre-configured BrandProfile seeds for 30+ Instagram account types.
 * Each pack is a Partial<BrandProfile> that gets merged with the user's
 * own data during onboarding or Branding Brain session.
 */

import type { AccountCategory, IndustryCategory, ContentPillar, ComplianceRule } from './types.js';

export interface NichePack {
  id: string;
  label: string;
  emoji: string;
  description: string;
  accountCategory: AccountCategory;
  industryCategory: IndustryCategory;
  type: 'empresa' | 'marca-personal';
  niche: string;
  voice: {
    tone: string[];
    forbidden: string[];
    referenceQuotes: string[];
  };
  visual: {
    style: string;
    mood: string;
    photographyStyle: string;
    density: 'low' | 'medium' | 'high';
    imageTextRatio: 'image-heavy' | 'balanced' | 'text-heavy';
    compositionRules: string[];
  };
  goals: {
    primary: 'awareness' | 'engagement' | 'leads' | 'ventas' | 'autoridad';
    metricsToWatch: string[];
  };
  contentPillars: ContentPillar[];
  complianceRules: ComplianceRule[];
  hashtagPools: Record<string, string[]>;
  templateHints: string[];
  brandStrategy: {
    archetype: string;
    differentiators: string[];
    experiencePrinciples: string[];
  };
}

// ─── Helper ───────────────────────────────────────────────────────────────────

const pillar = (
  id: string,
  name: string,
  description: string,
  weight: number,
  formats: string[],
  exampleTopics: string[],
): ContentPillar => ({ id, name, description, weight, formats, exampleTopics });

const rule = (
  id: string,
  description: string,
  required: boolean,
  penalty: number,
  example?: string,
): ComplianceRule => ({ id, description, required, penalty, example });

// ─── Packs ────────────────────────────────────────────────────────────────────

export const NICHE_PACKS: NichePack[] = [
  // ────────────────────────────────────────────────────────────────────────────
  // 1. AGENCIA DE MODELOS
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'modelaje-agencia',
    label: 'Agencia de Modelos',
    emoji: '👗',
    description: 'Agencias de modelaje, castings, representación y talento',
    accountCategory: 'agencia',
    industryCategory: 'modelaje-agencia',
    type: 'empresa',
    niche: 'Representación de modelos y talento para marcas y producciones',
    voice: {
      tone: ['elegante', 'aspiracional', 'exclusivo', 'profesional'],
      forbidden: ['barato', 'gratis', 'cualquiera', 'fácil'],
      referenceQuotes: ['Donde el talento encuentra su plataforma.', 'Estética que comunica, presencia que vende.'],
    },
    visual: {
      style: 'high-fashion editorial',
      mood: 'lujoso y aspiracional',
      photographyStyle: 'editorial con alta producción',
      density: 'low',
      imageTextRatio: 'image-heavy',
      compositionRules: [
        'Fondos neutros o texturas lujosas',
        'Paleta monocromática o dorado/negro',
        'Close-ups de expresión y detalle',
      ],
    },
    goals: { primary: 'leads', metricsToWatch: ['DMs de casting', 'saves', 'reach'] },
    contentPillars: [
      pillar(
        'portfolio',
        'Portfolio',
        'Fotos y reels de modelos del roster',
        40,
        ['post-imagen', 'carrusel', 'reel'],
        ['Look de editorial', 'Backstage de producción', 'Antes/después de sesión'],
      ),
      pillar(
        'casting',
        'Castings Abiertos',
        'Convocatorias y requisitos',
        20,
        ['historia', 'post-imagen'],
        ['Convocatoria nueva marca', 'Requisitos de casting', 'Resultados de selección'],
      ),
      pillar(
        'detras-escenas',
        'Detrás de escenas',
        'Proceso creativo y producción',
        20,
        ['reel', 'historia'],
        ['Making of campaña', 'Día de rodaje', 'Fit checks'],
      ),
      pillar(
        'educacion',
        'Tips Profesionales',
        'Educación para modelos aspirantes',
        20,
        ['carrusel', 'reel'],
        ['Cómo armar un book', 'Posturas para redes', 'Cuidado de piel para modelos'],
      ),
    ],
    complianceRules: [
      rule(
        'edad-minima',
        'No publicar contenido de modelos menores sin constancia de autorización parental y de tutores',
        true,
        30,
        'Indicar "Autorización Parental Verificada" en posts de menores',
      ),
      rule('no-retoque-extremo', 'Evitar retoques corporales extremos que distorsionen la figura real', true, 20),
      rule(
        'creditar-fotografo',
        'Siempre creditar fotógrafo y estilista en posts de producción',
        false,
        5,
        'Foto: @nombreFotografo | Estilismo: @nombreEstilista',
      ),
    ],
    hashtagPools: {
      general: ['#modelaje', '#agenciademodelos', '#moda', '#editorial', '#fotografiademoda'],
      casting: ['#castingargentina', '#modelosargentina', '#busquedademodelos', '#casting2024'],
      behind: ['#detrasdelacamara', '#makingof', '#produccionfotografica'],
    },
    templateHints: ['elegant fashion editorial', 'luxury brand presentation', 'model portfolio grid'],
    brandStrategy: {
      archetype: 'El Creador + El Gobernante',
      differentiators: ['Selección curada de talento', 'Formación integral del modelo', 'Red de marcas premium'],
      experiencePrinciples: ['Exclusividad medida', 'Profesionalismo total', 'Estética impecable'],
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 2. KIOSCO / MINIMERCADO
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'kiosco-minimercado',
    label: 'Kiosco / Minimercado',
    emoji: '🏪',
    description: 'Kioscos, almacenes, despensas y minimercados de barrio',
    accountCategory: 'comercio-local',
    industryCategory: 'kiosco-minimercado',
    type: 'empresa',
    niche: 'Comercio de cercanía con productos de consumo masivo',
    voice: {
      tone: ['amigable', 'cercano', 'informal', 'barrial', 'divertido'],
      forbidden: ['exclusivo', 'premium', 'selecto'],
      referenceQuotes: ['El kiosco de todos. Siempre cerca, siempre fresco.', 'Lo que necesitás, cuando lo necesitás.'],
    },
    visual: {
      style: 'colorido y llamativo',
      mood: 'alegre y cotidiano',
      photographyStyle: 'lifestyle casual y producto plano',
      density: 'high',
      imageTextRatio: 'balanced',
      compositionRules: [
        'Colores vibrantes que resalten el producto',
        'Precios visibles y grandes',
        'Fondo blanco o textura simple para producto',
      ],
    },
    goals: { primary: 'ventas', metricsToWatch: ['alcance local', 'mensajes directos', 'visitas al perfil'] },
    contentPillars: [
      pillar(
        'productos',
        'Productos del Día',
        'Novedades, combos y ofertas',
        40,
        ['historia', 'post-imagen'],
        ['Oferta del día', 'Combo gaseosa + snack', 'Producto nuevo en stock'],
      ),
      pillar(
        'promos',
        'Promociones',
        'Descuentos y combos especiales',
        30,
        ['historia', 'carrusel'],
        ['2x1 los miércoles', 'Combo cumpleaños', 'Descuento en efectivo'],
      ),
      pillar(
        'comunidad',
        'Comunidad',
        'Conexión con el barrio',
        20,
        ['historia', 'reel'],
        ['Encuesta qué producto sumar', 'Quiz de snacks', 'Saludo del dueño'],
      ),
      pillar(
        'novedades',
        'Novedades',
        'Nuevos productos y marcas',
        10,
        ['post-imagen', 'historia'],
        ['Llegó la nueva Oreo', 'Helados de temporada'],
      ),
    ],
    complianceRules: [
      rule(
        'precio-actualizado',
        'Verificar que los precios publicados estén actualizados antes de postear',
        true,
        15,
        'Precios al día de hoy. Consultar por variaciones.',
      ),
      rule('no-alcohol-menores', 'No publicar contenido de bebidas alcohólicas orientado a menores', true, 30),
    ],
    hashtagPools: {
      general: ['#kiosco', '#almacen', '#minimercado', '#barrio', '#comerciolocal'],
      ofertas: ['#oferta', '#descuento', '#promo', '#combo', '#preciosbajoscalidadalta'],
      local: ['#kioscoargentina', '#emprendimientoargentino', '#pyme'],
    },
    templateHints: ['product sale promo', 'local store offer', 'colorful retail promotion'],
    brandStrategy: {
      archetype: 'El Hombre Corriente + El Bufón',
      differentiators: ['Cercanía y confianza del barrio', 'Precios competitivos', 'Siempre abierto'],
      experiencePrinciples: ['Sin complicaciones', 'Precio visible', 'Atención rápida'],
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 3. AGENCIA DE CREACIÓN DE CONTENIDO
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'agencia-contenido',
    label: 'Agencia de Contenido',
    emoji: '🎬',
    description: 'Agencias de marketing de contenidos, social media y producción digital',
    accountCategory: 'agencia',
    industryCategory: 'agencia-contenido',
    type: 'empresa',
    niche: 'Creación de contenido estratégico y gestión de redes sociales para marcas',
    voice: {
      tone: ['estratégico', 'creativo', 'data-driven', 'innovador', 'confiable'],
      forbidden: ['amateur', 'improvisado', 'lento'],
      referenceQuotes: [
        'Contenido que convierte. Estrategia que escala.',
        'Tu marca merece una historia que valga la pena contar.',
      ],
    },
    visual: {
      style: 'moderno y bold',
      mood: 'profesional creativo',
      photographyStyle: 'behind-the-scenes y resultados reales',
      density: 'medium',
      imageTextRatio: 'balanced',
      compositionRules: [
        'Grid cohesivo con paleta de marca',
        'Mockups de contenido producido',
        'Datos y métricas visualizadas',
      ],
    },
    goals: {
      primary: 'leads',
      metricsToWatch: ['consultas entrantes', 'visitas al perfil', 'saves en casos de estudio'],
    },
    contentPillars: [
      pillar(
        'casos-estudio',
        'Casos de Estudio',
        'Resultados reales de clientes',
        30,
        ['carrusel', 'reel'],
        ['De 0 a 10K seguidores en 3 meses', 'Cómo triplicamos el engagement', 'Campaña que viralizó'],
      ),
      pillar(
        'educacion',
        'Educación',
        'Tips de contenido y estrategia',
        30,
        ['carrusel', 'reel'],
        [
          'Fórmula del hook perfecto',
          'Cómo hacer un buen reel sin cámara cara',
          'El error #1 de las marcas en Instagram',
        ],
      ),
      pillar(
        'proceso',
        'Proceso Creativo',
        'Cómo trabajamos',
        20,
        ['reel', 'historia'],
        ['Un día de producción', 'Cómo armamos una estrategia', 'Nuestra sala de edición'],
      ),
      pillar(
        'cultura',
        'Cultura del Equipo',
        'El equipo y los valores',
        20,
        ['historia', 'post-imagen'],
        ['Presentación del equipo', 'Hito del cliente', 'Valor de la semana'],
      ),
    ],
    complianceRules: [
      rule(
        'resultados-reales',
        'Mostrar solo resultados reales y verificables de clientes con su consentimiento',
        true,
        25,
        'Resultado real de cliente @cuenta — con autorización',
      ),
      rule(
        'no-garantias-falsas',
        'No prometer resultados específicos garantizados',
        true,
        20,
        'Evitar: "Garantizamos 10K seguidores en 30 días"',
      ),
    ],
    hashtagPools: {
      general: ['#agenciacontenido', '#marketingdigital', '#socialmedia', '#contentmarketing', '#estrategiadigital'],
      resultados: ['#casodeexito', '#resultadosreales', '#growthmarketing'],
      educacion: ['#tipsdecontenido', '#consejosmarketing', '#aprendemarketing'],
    },
    templateHints: ['marketing agency case study', 'creative agency portfolio', 'social media results infographic'],
    brandStrategy: {
      archetype: 'El Mago + El Sabio',
      differentiators: [
        'Estrategia + producción + gestión bajo un mismo techo',
        'Foco en resultados medibles',
        'Equipo senior dedicado',
      ],
      experiencePrinciples: ['Transparencia en métricas', 'Creatividad con propósito', 'Velocidad de ejecución'],
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 4. INGENIERO / PROFESIONAL TÉCNICO
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'ingenieria',
    label: 'Ingeniero / Profesional Técnico',
    emoji: '⚙️',
    description: 'Ingenieros civiles, mecánicos, eléctricos, industriales o técnicos especializados',
    accountCategory: 'profesional-independiente',
    industryCategory: 'ingenieria',
    type: 'marca-personal',
    niche: 'Autoridad técnica y soluciones de ingeniería para industrias y particulares',
    voice: {
      tone: ['técnico-accesible', 'confiable', 'preciso', 'educativo', 'directo'],
      forbidden: ['más o menos', 'no sé', 'tal vez'],
      referenceQuotes: [
        'La solución técnica correcta, explicada para todos.',
        'Ingeniería que funciona. Explicada sin rodeos.',
      ],
    },
    visual: {
      style: 'técnico limpio',
      mood: 'confiable y preciso',
      photographyStyle: 'proyectos reales, planos, renders',
      density: 'medium',
      imageTextRatio: 'balanced',
      compositionRules: [
        'Azul, gris y blanco como paleta base',
        'Diagramas y esquemas bien legibles',
        'Fotos de obra o proyecto terminado',
      ],
    },
    goals: { primary: 'autoridad', metricsToWatch: ['solicitudes de presupuesto', 'saves', 'reach profesional'] },
    contentPillars: [
      pillar(
        'proyectos',
        'Proyectos',
        'Portfolio y casos de ingeniería',
        35,
        ['carrusel', 'reel', 'post-imagen'],
        ['Proyecto de estructura terminado', 'Antes/después de instalación', 'Error común que corrijo'],
      ),
      pillar(
        'educacion',
        'Educación Técnica',
        'Conceptos explicados para todos',
        35,
        ['carrusel', 'reel'],
        ['Qué es una viga IPN y cuándo usarla', 'Cómo calcular una instalación eléctrica', '3 errores en fundaciones'],
      ),
      pillar(
        'proceso',
        'Mi Proceso',
        'Cómo trabajo y pienso',
        15,
        ['reel', 'historia'],
        ['Cómo diseño un proyecto desde cero', 'Mi setup de trabajo', 'Un día en obra'],
      ),
      pillar(
        'opinion',
        'Opinión Profesional',
        'Perspectiva sobre la industria',
        15,
        ['carrusel', 'historia'],
        ['El futuro de la construcción sostenible', 'Por qué los planos importan', 'Materiales que uso y por qué'],
      ),
    ],
    complianceRules: [
      rule(
        'no-consejo-sin-evaluacion',
        'No dar recomendaciones técnicas específicas sin evaluar el caso particular',
        true,
        20,
        'Esto depende de cada caso. Consultame para evaluar tu situación.',
      ),
      rule(
        'matricula-visible',
        'Mostrar número de matrícula profesional cuando corresponda',
        false,
        10,
        'Matriculado en [organismo] N° XXXXX',
      ),
    ],
    hashtagPools: {
      general: ['#ingenieria', '#ingeniero', '#construccion', '#arquitectura', '#proyectos'],
      educacion: ['#ingenieriacivil', '#instalaciones', '#estructuras', '#calculoestructural'],
      local: ['#ingenieriaargentina', '#construccionar', '#obraargentina'],
    },
    templateHints: ['technical blueprint design', 'engineering project showcase', 'professional technical infographic'],
    brandStrategy: {
      archetype: 'El Sabio + El Héroe',
      differentiators: [
        'Explicación técnica accesible',
        'Trayectoria de proyectos verificables',
        'Rigor sin complejidad innecesaria',
      ],
      experiencePrinciples: ['Precisión ante todo', 'Comunicación clara', 'Soluciones que duran'],
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 5. INSTAGRAM DE IA / TECNOLOGÍA
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'inteligencia-artificial',
    label: 'Cuenta de Inteligencia Artificial',
    emoji: '🤖',
    description: 'Creadores de contenido sobre IA, automatización y tecnología del futuro',
    accountCategory: 'creador-de-contenido',
    industryCategory: 'inteligencia-artificial',
    type: 'marca-personal',
    niche: 'Divulgación y aplicación práctica de inteligencia artificial',
    voice: {
      tone: ['innovador', 'accesible', 'curioso', 'futurista', 'sin jerga innecesaria'],
      forbidden: ['aburrido', 'imposible', 'complicado', 'no funciona'],
      referenceQuotes: [
        'La IA no te reemplaza. Saber usarla, sí te diferencia.',
        'El futuro es ahora. Y es más simple de lo que pensás.',
      ],
    },
    visual: {
      style: 'tech minimalista con acentos neón',
      mood: 'futurista accesible',
      photographyStyle: 'pantallas, interfaces, renders 3D, gradientes',
      density: 'medium',
      imageTextRatio: 'balanced',
      compositionRules: [
        'Gradientes de azul/violeta/neón como paleta',
        'Tipografía tech sans-serif',
        'Capturas de herramientas con contexto',
      ],
    },
    goals: { primary: 'engagement', metricsToWatch: ['saves', 'compartidos', 'crecimiento de seguidores'] },
    contentPillars: [
      pillar(
        'herramientas',
        'Herramientas de IA',
        'Reviews y tutoriales de tools',
        35,
        ['reel', 'carrusel'],
        ['ChatGPT vs Claude vs Gemini', 'Top 5 herramientas de IA gratis', 'Cómo uso Midjourney para mi trabajo'],
      ),
      pillar(
        'casos-uso',
        'Casos de Uso Reales',
        'Cómo aplico IA en la vida real',
        30,
        ['reel', 'carrusel'],
        ['Automaticé mi email con IA', 'IA para crear contenido en 10 minutos', 'Mi flujo de trabajo con agentes'],
      ),
      pillar(
        'noticias',
        'Novedades de IA',
        'Lo último en el mundo de la IA',
        20,
        ['historia', 'carrusel'],
        ['Lanzamiento nuevo modelo', 'Lo que cambió esta semana', 'Hot take sobre OpenAI'],
      ),
      pillar(
        'educacion',
        'Educación',
        'Conceptos base para entender la IA',
        15,
        ['carrusel', 'reel'],
        ['Qué es un LLM explicado simple', 'Prompt engineering para principiantes', 'Cómo funciona el fine-tuning'],
      ),
    ],
    complianceRules: [
      rule(
        'contenido-ia-generado',
        'Aclarar cuando el contenido fue generado o asistido por IA',
        false,
        5,
        'Este contenido fue creado con asistencia de IA.',
      ),
      rule(
        'no-overpromise',
        'No prometer que la IA resolverá problemas sin esfuerzo humano',
        true,
        15,
        'La IA es una herramienta. Los resultados dependen de cómo la usés.',
      ),
    ],
    hashtagPools: {
      general: ['#inteligenciaartificial', '#IA', '#artificialintelligence', '#chatgpt', '#futuro'],
      herramientas: ['#aItools', '#prompting', '#automacion', '#claude', '#midjourney'],
      comunidad: ['#techenespanol', '#iatecnologia', '#techlatam'],
    },
    templateHints: ['AI technology infographic', 'futuristic tech gradient', 'digital tool tutorial'],
    brandStrategy: {
      archetype: 'El Mago + El Explorador',
      differentiators: [
        'Contenido en español accesible',
        'Aplicaciones prácticas antes que teoría',
        'Actualización constante',
      ],
      experiencePrinciples: [
        'Democratizar el conocimiento',
        'Practicidad antes de jerga',
        'Honestidad sobre limitaciones',
      ],
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 6. MARCA PERSONAL GENERAL
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'marca-personal-general',
    label: 'Marca Personal',
    emoji: '✨',
    description: 'Profesionales, consultores o personas que construyen su marca personal',
    accountCategory: 'marca-personal',
    industryCategory: 'marca-personal-general',
    type: 'marca-personal',
    niche: 'Construcción de autoridad y presencia personal en redes sociales',
    voice: {
      tone: ['auténtico', 'inspirador', 'vulnerable', 'confiado', 'humano'],
      forbidden: ['perfecto', 'exitoso siempre', 'sin esfuerzo'],
      referenceQuotes: ['Mi historia es mi diferencial.', 'Construyendo en público, aprendiendo en voz alta.'],
    },
    visual: {
      style: 'personal y cohesivo',
      mood: 'auténtico y aspiracional',
      photographyStyle: 'lifestyle personal, headshots, detrás de escenas',
      density: 'low',
      imageTextRatio: 'balanced',
      compositionRules: [
        'Colores que reflejen la personalidad',
        'Fotos personales de calidad',
        'Mix de fotos y citas/texto',
      ],
    },
    goals: { primary: 'autoridad', metricsToWatch: ['seguidores calificados', 'saves', 'DMs de consulta'] },
    contentPillars: [
      pillar(
        'historia',
        'Mi Historia',
        'Narrativa personal y proceso',
        25,
        ['reel', 'carrusel', 'historia'],
        ['Por qué empecé esto', 'Mi fracaso más grande', 'Lo que aprendí en un año'],
      ),
      pillar(
        'expertise',
        'Mi Expertise',
        'Conocimiento de mi campo',
        30,
        ['carrusel', 'reel'],
        ['Mi método para X', '3 errores que veo constantemente', 'Mi perspectiva sobre Y'],
      ),
      pillar(
        'detras-escenas',
        'Detrás de Escenas',
        'Mi proceso y vida real',
        25,
        ['historia', 'reel'],
        ['Cómo es mi rutina', 'Lo que nadie te muestra', 'Mi proceso de trabajo'],
      ),
      pillar(
        'comunidad',
        'Comunidad',
        'Conexión con mi audiencia',
        20,
        ['historia', 'carrusel'],
        ['Pregunta de la semana', 'Gracias por los 1K', 'Lo que me enseñaron mis seguidores'],
      ),
    ],
    complianceRules: [rule('autenticidad', 'Mantener coherencia entre lo que se muestra y la realidad', true, 20)],
    hashtagPools: {
      general: ['#marcapersonal', '#personalbrand', '#emprendedor', '#crecimientopersonal', '#liderazgo'],
      content: ['#creandoenpublico', '#aprendizaje', '#motivacion', '#exito'],
    },
    templateHints: ['personal brand quote card', 'lifestyle personal photo', 'motivational carousel'],
    brandStrategy: {
      archetype: 'El Héroe + El Sabio',
      differentiators: ['Historia única e irrepetible', 'Vulnerabilidad estratégica', 'Consistencia a largo plazo'],
      experiencePrinciples: [
        'Primero persona, después profesional',
        'Autenticidad no performance',
        'Valor antes de venta',
      ],
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 7. INFLUENCER LIFESTYLE
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'influencer-lifestyle',
    label: 'Influencer / Lifestyle',
    emoji: '🌟',
    description: 'Influencers de lifestyle, moda, viajes, wellness y entretenimiento',
    accountCategory: 'influencer',
    industryCategory: 'influencer-lifestyle',
    type: 'marca-personal',
    niche: 'Creación de contenido aspiracional de estilo de vida y tendencias',
    voice: {
      tone: ['aspiracional', 'cercano', 'trendy', 'divertido', 'auténtico'],
      forbidden: ['aburrido', 'técnico', 'formal'],
      referenceQuotes: ['Viviendo la vida que diseñé.', 'Inspirando desde lo cotidiano.'],
    },
    visual: {
      style: 'aesthetic y curado',
      mood: 'aspiracional y cálido',
      photographyStyle: 'lifestyle de alta calidad, golden hour, flatlays',
      density: 'low',
      imageTextRatio: 'image-heavy',
      compositionRules: ['Paleta cohesiva en todo el feed', 'Luz natural y dorada preferida', 'Rule of thirds'],
    },
    goals: { primary: 'engagement', metricsToWatch: ['reach', 'engagement rate', 'story views', 'brand deals'] },
    contentPillars: [
      pillar(
        'lifestyle',
        'Lifestyle',
        'Vida cotidiana aspiracional',
        35,
        ['reel', 'historia', 'post-imagen'],
        ['GRWM', 'Lo que como en un día', 'Mi rutina matutina'],
      ),
      pillar(
        'moda-belleza',
        'Moda y Belleza',
        'Outfits, hauls y beauty',
        25,
        ['reel', 'carrusel'],
        ['Outfit of the day', 'Haul de temporada', 'Get ready with me'],
      ),
      pillar(
        'colaboraciones',
        'Colaboraciones',
        'Partnerships y productos',
        20,
        ['reel', 'historia', 'post-imagen'],
        ['Review honesta de marca', 'Unboxing colaboración', 'Código de descuento'],
      ),
      pillar(
        'entretenimiento',
        'Entretenimiento',
        'Contenido viral y trends',
        20,
        ['reel', 'historia'],
        ['Trend de la semana', 'Challenge viral', 'Q&A con seguidores'],
      ),
    ],
    complianceRules: [
      rule(
        'publicidad-declarada',
        'Declarar contenido publicitario con #ad, #publi o #colaboracion pagada',
        true,
        25,
        'Uso: #ad o #colaboracion al inicio de la caption',
      ),
      rule('no-contenido-engañoso', 'No publicar resultados de productos sin haberlos probado genuinamente', true, 20),
    ],
    hashtagPools: {
      general: ['#lifestyle', '#influencer', '#contenido', '#moda', '#tendencias'],
      engagement: ['#explorepage', '#reelsinstagram', '#viral', '#trending'],
      niche: ['#instagramargentina', '#creadordecontenido', '#lifestylelatam'],
    },
    templateHints: ['lifestyle aesthetic instagram', 'influencer product review', 'trendy reel cover'],
    brandStrategy: {
      archetype: 'El Amante + El Bufón',
      differentiators: ['Estética personal reconocible', 'Autenticidad en colaboraciones', 'Comunidad fiel'],
      experiencePrinciples: ['Primero entretenimiento', 'Transparencia en publicidad', 'Coherencia estética'],
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 8. YOUTUBER / VIDEO CREATOR
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'youtuber-video',
    label: 'YouTuber / Video Creator',
    emoji: '▶️',
    description: 'Creadores de contenido en video para YouTube, con presencia en Instagram',
    accountCategory: 'creador-de-contenido',
    industryCategory: 'youtuber-video',
    type: 'marca-personal',
    niche: 'Creación de video content y construcción de audiencia en múltiples plataformas',
    voice: {
      tone: ['energético', 'entretenido', 'cercano', 'educativo', 'apasionado'],
      forbidden: ['aburrido', 'monótono', 'sin humor'],
      referenceQuotes: ['El mejor contenido es el que no querés pausar.', 'Suscribite. Pero primero convencete.'],
    },
    visual: {
      style: 'bold y llamativo',
      mood: 'energético y dinámico',
      photographyStyle: 'thumbnails de alto contraste, expresiones faciales amplias',
      density: 'medium',
      imageTextRatio: 'balanced',
      compositionRules: [
        'Colores saturados y contrastantes',
        'Tipografía grande y legible',
        'Cara expresiva en primer plano',
      ],
    },
    goals: { primary: 'awareness', metricsToWatch: ['views en reels', 'seguidores nuevos', 'clics a YouTube'] },
    contentPillars: [
      pillar(
        'trailers-clips',
        'Clips y Trailers',
        'Adelantos del contenido de YouTube',
        35,
        ['reel'],
        ['Clip del nuevo video', '30 segundos de lo mejor', 'La parte más viral del video'],
      ),
      pillar(
        'detras-escenas',
        'Detrás de Escenas',
        'El proceso de crear videos',
        25,
        ['historia', 'reel'],
        ['Cómo grabo mis videos', 'Mi setup de grabación', 'El error más gracioso'],
      ),
      pillar(
        'comunidad',
        'Comunidad',
        'Interacción con suscriptores',
        25,
        ['historia', 'carrusel'],
        ['Preguntas del video anterior', 'Tema del próximo video', 'Encuesta de contenido'],
      ),
      pillar(
        'educacion',
        'Tips de Creación',
        'Consejos para otros creadores',
        15,
        ['carrusel', 'reel'],
        ['Cómo edito en DaVinci', 'Mis apps de edición favoritas', 'Cómo conseguí mis primeros 1K subs'],
      ),
    ],
    complianceRules: [
      rule(
        'copyright',
        'No usar música, imágenes o clips con copyright sin licencia',
        true,
        30,
        'Usar música de YouTube Audio Library, Epidemic Sound o similar',
      ),
      rule(
        'contenido-patrocinado',
        'Declarar cuando el video o post es patrocinado',
        true,
        25,
        'Este video/post fue patrocinado por [marca]. #ad',
      ),
    ],
    hashtagPools: {
      general: ['#youtuber', '#youtube', '#videocreator', '#contenidodigital', '#creadordecontenido'],
      growth: ['#youtubeespanol', '#nuevovideo', '#suscribete', '#videoviral'],
      niche: ['#youtuberargentino', '#youtuberlatino', '#creadorlatam'],
    },
    templateHints: ['youtube thumbnail style', 'bold video content promotion', 'content creator announcement'],
    brandStrategy: {
      archetype: 'El Bufón + El Héroe',
      differentiators: ['Calidad de producción consistente', 'Personalidad única reconocible', 'Comunidad interactiva'],
      experiencePrinciples: [
        'Entretener primero, después informar',
        'Consistencia de upload',
        'Escuchar a la comunidad',
      ],
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 9. VENDEDOR DE CURSOS / EDUCACIÓN ONLINE
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'cursos-educacion',
    label: 'Cursos / Educación Online',
    emoji: '🎓',
    description: 'Instructores, coaches y creadores de cursos online, infoproductores',
    accountCategory: 'educador',
    industryCategory: 'cursos-educacion',
    type: 'marca-personal',
    niche: 'Educación digital y transformación de conocimiento en productos escalables',
    voice: {
      tone: ['autoritativo', 'empático', 'motivador', 'claro', 'transformador'],
      forbidden: ['difícil', 'imposible', 'complicado para todos'],
      referenceQuotes: [
        'El conocimiento que tardé 10 años en aprender, te lo enseño en 10 semanas.',
        'Invertí en ti. El retorno es para toda la vida.',
      ],
    },
    visual: {
      style: 'profesional y cálido',
      mood: 'transformador y motivador',
      photographyStyle: 'headshots profesionales, mockups de curso, testimonios en pantalla',
      density: 'medium',
      imageTextRatio: 'text-heavy',
      compositionRules: [
        'Paleta que transmita confianza y transformación',
        'Testimonios con foto del alumno',
        'Mockups del producto digital',
      ],
    },
    goals: {
      primary: 'ventas',
      metricsToWatch: ['clics a página de ventas', 'inscripciones', 'testimonios generados'],
    },
    contentPillars: [
      pillar(
        'valor-gratuito',
        'Valor Gratuito',
        'Tips, mini-lecciones y frameworks',
        35,
        ['carrusel', 'reel'],
        ['El método que uso para X', '3 errores que cometen mis alumnos', 'Mini-clase de 2 minutos'],
      ),
      pillar(
        'resultados',
        'Resultados y Testimonios',
        'Casos de éxito de alumnos',
        25,
        ['carrusel', 'post-imagen', 'historia'],
        ['Alumno que logró X', 'Testimonios en video', 'Transformación de 90 días'],
      ),
      pillar(
        'autoridad',
        'Autoridad y Credibilidad',
        'Por qué confiar en mí',
        20,
        ['carrusel', 'reel'],
        ['Mi historia y recorrido', 'Métricas y logros', 'Medios donde aparecí'],
      ),
      pillar(
        'oferta',
        'El Curso',
        'Contenido sobre el producto',
        20,
        ['historia', 'carrusel', 'reel'],
        ['Qué vas a aprender', 'Módulos del curso', 'Precio y acceso', 'Lanzamiento'],
      ),
    ],
    complianceRules: [
      rule(
        'testimonios-reales',
        'Solo publicar testimonios reales con consentimiento del alumno',
        true,
        25,
        'Testimonio con permiso del alumno @cuenta',
      ),
      rule(
        'no-resultados-garantizados',
        'No garantizar resultados económicos específicos',
        true,
        25,
        'Los resultados dependen del esfuerzo y situación de cada alumno.',
      ),
      rule(
        'politica-reembolso',
        'Mencionar la política de reembolso cuando se habla del precio',
        false,
        10,
        'Con garantía de 7 días o te devuelvo el dinero.',
      ),
    ],
    hashtagPools: {
      general: ['#cursoonline', '#emprendimiento', '#educaciondigital', '#infoproductor', '#aprendizaje'],
      ventas: ['#lanzamiento', '#cursodisponible', '#inscripciones', '#transformacion'],
      niche: ['#emprendedorargentino', '#educacionargentina', '#aprendeenlinea'],
    },
    templateHints: ['online course promotion', 'educational infographic', 'student testimonial design'],
    brandStrategy: {
      archetype: 'El Sabio + El Héroe',
      differentiators: [
        'Metodología probada con resultados reales',
        'Acompañamiento post-compra',
        'Comunidad de alumnos',
      ],
      experiencePrinciples: ['Valor antes de venta', 'Resultados verificables', 'Accesibilidad al conocimiento'],
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 10. GASISTA / PLOMERO / ELECTRICISTA
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'plomeria-gas-electricidad',
    label: 'Gasista / Plomero / Electricista',
    emoji: '🔧',
    description: 'Profesionales de oficios del hogar: gas, plomería, electricidad',
    accountCategory: 'profesional-independiente',
    industryCategory: 'plomeria-gas-electricidad',
    type: 'marca-personal',
    niche: 'Servicios de reparación e instalación del hogar con garantía profesional',
    voice: {
      tone: ['confiable', 'honesto', 'directo', 'profesional', 'resolutivo'],
      forbidden: ['caro sin razón', 'no garantizo', 'tal vez funcione'],
      referenceQuotes: ['Llegamos cuando más lo necesitás.', 'Trabajo bien hecho, la primera vez.'],
    },
    visual: {
      style: 'limpio y confiable',
      mood: 'profesional y honesto',
      photographyStyle: 'trabajo terminado, antes/después, uniforme limpio',
      density: 'medium',
      imageTextRatio: 'balanced',
      compositionRules: [
        'Fotos de trabajo real, limpio y ordenado',
        'Antes y después del trabajo',
        'Cara visible en el trabajo',
      ],
    },
    goals: { primary: 'leads', metricsToWatch: ['llamadas recibidas', 'mensajes directos', 'zona de alcance'] },
    contentPillars: [
      pillar(
        'trabajos',
        'Trabajos Realizados',
        'Portfolio de trabajos reales',
        40,
        ['post-imagen', 'carrusel', 'reel'],
        ['Instalación de calefón', 'Reparación de cañería', 'Antes y después de baño'],
      ),
      pillar(
        'educacion',
        'Educación del Hogar',
        'Tips para el dueño de casa',
        30,
        ['carrusel', 'reel'],
        ['Cómo detectar pérdida de gas', 'Cuándo llamar al plomero', 'Mantenimiento del calefón'],
      ),
      pillar(
        'servicios',
        'Servicios y Zona',
        'Lo que ofrezco y dónde',
        20,
        ['historia', 'post-imagen'],
        ['Servicios disponibles', 'Zona de trabajo', 'Urgencias 24hs'],
      ),
      pillar(
        'testimonios',
        'Testimonios',
        'Clientes satisfechos',
        10,
        ['post-imagen', 'historia'],
        ['Cliente satisfecho', 'Trabajo recomendado por vecino'],
      ),
    ],
    complianceRules: [
      rule(
        'matricula-gas',
        'Gasistas deben mencionar su número de matrícula (habilitación GAS)',
        true,
        30,
        'Gasista Matriculado N° XXXXX — [Provincia]',
      ),
      rule(
        'electricista-hab',
        'Electricistas deben mostrar habilitación municipal si aplica',
        false,
        15,
        'Habilitado por [Municipalidad] — Cert N° XXXXX',
      ),
      rule(
        'no-precio-fijo-sin-revision',
        'No publicar precios fijos sin antes inspeccionar el trabajo',
        true,
        10,
        'El precio depende de la revisión. Presupuesto sin cargo.',
      ),
    ],
    hashtagPools: {
      general: ['#plomero', '#gasista', '#electricista', '#servicioshogar', '#oficios'],
      local: ['#plomeroargentino', '#gasistamontevideo', '#electricistabuenosaires', '#servicioslocales'],
      educacion: ['#consejoshogar', '#mantenimientohogar', '#bricolajeargentino'],
    },
    templateHints: ['home service professional', 'before after renovation', 'local service promotion'],
    brandStrategy: {
      archetype: 'El Hombre Corriente + El Cuidador',
      differentiators: ['Confiabilidad garantizada', 'Respuesta rápida y urgencias', 'Trabajo prolijo y limpio'],
      experiencePrinciples: ['Transparencia de precio', 'Puntualidad', 'Trabajo garantizado'],
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 11. COCINERO / GASTRONOMÍA
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'gastronomia-cocina',
    label: 'Cocinero / Gastronomía',
    emoji: '👨‍🍳',
    description: 'Chefs, cocineros, restaurantes, catering y emprendimientos gastronómicos',
    accountCategory: 'artista',
    industryCategory: 'gastronomia-cocina',
    type: 'marca-personal',
    niche: 'Gastronomía artesanal, cocina creativa y cultura culinaria',
    voice: {
      tone: ['apasionado', 'sensorial', 'cálido', 'experto', 'generoso'],
      forbidden: ['insípido', 'genérico', 'industral'],
      referenceQuotes: ['La cocina es amor en forma de alimento.', 'Cada plato cuenta una historia.'],
    },
    visual: {
      style: 'foodie premium',
      mood: 'cálido, apetitoso y artesanal',
      photographyStyle: 'food photography con luz natural, plating, proceso de cocina',
      density: 'low',
      imageTextRatio: 'image-heavy',
      compositionRules: [
        'Luz lateral o natural para food',
        'Props de cocina artesanales',
        'Colores cálidos: ocre, verde, tierra',
        'Steam y textura visible en platos',
      ],
    },
    goals: { primary: 'engagement', metricsToWatch: ['saves', 'compartidos de recetas', 'mensajes de reserva'] },
    contentPillars: [
      pillar(
        'recetas',
        'Recetas',
        'Platos y preparaciones paso a paso',
        35,
        ['reel', 'carrusel'],
        ['Receta en 60 segundos', 'La receta de mi abuela', 'Secreto del risotto perfecto'],
      ),
      pillar(
        'plating',
        'Plating y Presentación',
        'El arte de emplatar',
        25,
        ['post-imagen', 'reel'],
        ['Así emplatamos hoy', 'Plato del día', 'Diferencia entre hogar y restaurante'],
      ),
      pillar(
        'proceso',
        'Proceso y Técnica',
        'Cómo cocino y por qué',
        25,
        ['reel', 'carrusel'],
        ['Por qué sello la carne antes de hornear', 'El error más común con la pasta', 'Técnica de corte'],
      ),
      pillar(
        'historia',
        'Historia y Cultura',
        'Tradiciones e ingredientes',
        15,
        ['carrusel', 'historia'],
        ['El origen del asado', 'Ingredientes de temporada', 'Viaje gastronómico'],
      ),
    ],
    complianceRules: [
      rule(
        'alergenos',
        'Mencionar alérgenos principales cuando se publica una receta (gluten, lactosa, frutos secos)',
        false,
        10,
        'Contiene: gluten, lácteos. Sin: frutos secos.',
      ),
      rule(
        'temperatura-segura',
        'No promover preparaciones con temperaturas de cocción inseguras',
        true,
        20,
        'Pollo siempre a temperatura interna de 74°C.',
      ),
    ],
    hashtagPools: {
      general: ['#cocina', '#gastronomia', '#recetas', '#foodie', '#chef'],
      argentina: ['#cocinasargentina', '#recetasargentinas', '#gastronomiaar', '#asado'],
      contenido: ['#foodphotography', '#foodblogger', '#recetasfaciles', '#cocinandoconamo'],
    },
    templateHints: ['food photography recipe card', 'restaurant menu design', 'chef cooking process'],
    brandStrategy: {
      archetype: 'El Creador + El Amante',
      differentiators: [
        'Técnica clásica con toque personal',
        'Ingredientes de calidad y origen',
        'Historia detrás de cada plato',
      ],
      experiencePrinciples: ['Despertar todos los sentidos', 'Generosidad al compartir', 'Honrar la materia prima'],
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 12. FITNESS / ENTRENAMIENTO
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'fitness-entrenamiento',
    label: 'Fitness / Entrenamiento Personal',
    emoji: '💪',
    description: 'Personal trainers, nutricionistas fitness, gimnasios y coaches de bienestar',
    accountCategory: 'profesional-independiente',
    industryCategory: 'fitness-entrenamiento',
    type: 'marca-personal',
    niche: 'Transformación física y hábitos saludables con metodología comprobada',
    voice: {
      tone: ['motivador', 'enérgico', 'empático', 'directo', 'comprometido'],
      forbidden: ['pastilla milagrosa', 'sin esfuerzo', 'en 7 días'],
      referenceQuotes: ['El cuerpo que querés lo construís hoy.', 'No hay transformación sin consistencia.'],
    },
    visual: {
      style: 'dinámico y motivador',
      mood: 'energético y transformador',
      photographyStyle: 'acción en entrenamiento, antes/después, lifestyle saludable',
      density: 'medium',
      imageTextRatio: 'balanced',
      compositionRules: [
        'Colores de alta energía: naranja, negro, blanco',
        'Fotografía en movimiento',
        'Antes y después con contexto real',
      ],
    },
    goals: { primary: 'leads', metricsToWatch: ['consultas de plan', 'inscripciones', 'saves de rutinas'] },
    contentPillars: [
      pillar(
        'rutinas',
        'Rutinas',
        'Ejercicios y entrenamientos',
        30,
        ['reel', 'carrusel'],
        ['Rutina de piernas en 20 minutos', 'Ejercicios sin equipamiento', 'La rutina que hacen mis clientes'],
      ),
      pillar(
        'transformaciones',
        'Transformaciones',
        'Resultados reales de clientes',
        25,
        ['carrusel', 'post-imagen'],
        ['Cliente de 3 meses', 'Antes y después con contexto', 'Historia real de transformación'],
      ),
      pillar(
        'nutricion',
        'Nutrición',
        'Alimentación y hábitos',
        25,
        ['carrusel', 'reel'],
        ['Qué como en un día', 'Mitos de la nutrición', 'Receta fit de la semana'],
      ),
      pillar(
        'mindset',
        'Mindset y Motivación',
        'La parte mental del proceso',
        20,
        ['historia', 'carrusel'],
        ['Por qué abandonás el gym', 'Cómo crear el hábito', 'El error que te frena'],
      ),
    ],
    complianceRules: [
      rule(
        'no-dietas-peligrosas',
        'No promocionar dietas restrictivas extremas sin supervisión médica',
        true,
        25,
        'Siempre consultá con un profesional de la salud antes de iniciar cualquier plan.',
      ),
      rule(
        'transformaciones-con-contexto',
        'Las fotos de antes/después deben incluir tiempo y contexto real',
        true,
        15,
        'Resultado de 12 semanas con plan de entrenamiento y nutrición personalizado.',
      ),
      rule('suplementos-aclarar', 'Aclarar que los suplementos no reemplazan una alimentación equilibrada', false, 5),
    ],
    hashtagPools: {
      general: ['#fitness', '#entrenamiento', '#personaltrainer', '#vidafit', '#ejercicio'],
      resultados: ['#transformacion', '#resultadosreales', '#cuerpofit', '#gymlife'],
      local: ['#fitnessargentina', '#personaltrainerargentino', '#gimnasiobsas'],
    },
    templateHints: ['fitness transformation before after', 'workout routine infographic', 'personal trainer promotion'],
    brandStrategy: {
      archetype: 'El Héroe + El Cuidador',
      differentiators: [
        'Metodología individualizada',
        'Acompañamiento continuo',
        'Resultados verificables con contexto',
      ],
      experiencePrinciples: ['Honestidad sobre el proceso', 'Esfuerzo real sin magia', 'Transformación integral'],
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 13. FOTÓGRAFO / FOTOGRAFÍA
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'fotografia',
    label: 'Fotógrafo / Fotografía',
    emoji: '📸',
    description: 'Fotógrafos de bodas, retratos, moda, producto o contenido',
    accountCategory: 'artista',
    industryCategory: 'fotografia',
    type: 'marca-personal',
    niche: 'Fotografía artística y comercial con identidad visual única',
    voice: {
      tone: ['artístico', 'detallista', 'inspirador', 'técnico-accesible'],
      forbidden: ['foto fea', 'automático', 'sin edición'],
      referenceQuotes: ['Cada foto es una decisión, no un accidente.'],
    },
    visual: {
      style: 'portfolio artístico',
      mood: 'evocador y preciso',
      photographyStyle: 'mejor trabajo propio en formato variado',
      density: 'low',
      imageTextRatio: 'image-heavy',
      compositionRules: [
        'Feed monocromático o por paleta de temporada',
        'Sin texto en posts de portfolio',
        'Carruseles para behind-the-scenes',
      ],
    },
    goals: { primary: 'leads', metricsToWatch: ['consultas de sesión', 'saves', 'DMs de contratación'] },
    contentPillars: [
      pillar(
        'portfolio',
        'Portfolio',
        'Lo mejor de mi trabajo',
        40,
        ['post-imagen', 'carrusel'],
        ['Sesión de bodas', 'Retrato editorial', 'Campaña de marca'],
      ),
      pillar(
        'proceso',
        'Proceso Creativo',
        'Cómo capturo y edito',
        30,
        ['reel', 'carrusel'],
        ['Detrás de cámara', 'Antes/después de edición', 'Qué equipo uso'],
      ),
      pillar(
        'educacion',
        'Tips de Fotografía',
        'Enseñanza para otros',
        20,
        ['carrusel', 'reel'],
        ['Cómo mejorar la luz natural', '3 poses que funcionan siempre', 'Configuración manual explicada'],
      ),
      pillar(
        'servicios',
        'Servicios',
        'Qué ofrezco y cómo',
        10,
        ['historia', 'carrusel'],
        ['Paquetes disponibles', 'Proceso de reserva', 'Ubicación y viajes'],
      ),
    ],
    complianceRules: [
      rule('modelo-release', 'Tener autorización de las personas fotografiadas antes de publicar', true, 25),
      rule('watermark-portfolio', 'No publicar trabajo de clientes sin su consentimiento', true, 20),
    ],
    hashtagPools: {
      general: ['#fotografia', '#fotografo', '#photography', '#portrait', '#fotografiademodas'],
      local: ['#fotografoargentino', '#fotografiabsas', '#fotografiacordoba'],
      niche: ['#weddingphotography', '#productphotography', '#fotografiaeditorial'],
    },
    templateHints: ['photography portfolio grid', 'before after photo editing', 'photographer services pricing'],
    brandStrategy: {
      archetype: 'El Creador + El Explorador',
      differentiators: [
        'Estilo visual inconfundible',
        'Atención al detalle en edición',
        'Experiencia cómoda para el cliente',
      ],
      experiencePrinciples: ['La foto habla primero', 'Proceso sin fricción', 'Arte con propósito comercial'],
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 14. PSICÓLOGO / COACH / TERAPEUTA
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'psicologia-coaching',
    label: 'Psicólogo / Coach / Terapeuta',
    emoji: '🧠',
    description: 'Psicólogos, coaches, terapeutas y profesionales del bienestar mental',
    accountCategory: 'profesional-independiente',
    industryCategory: 'psicologia-coaching',
    type: 'marca-personal',
    niche: 'Salud mental, bienestar emocional y desarrollo personal',
    voice: {
      tone: ['empático', 'cálido', 'profesional', 'contenedor', 'sin juicio'],
      forbidden: ['locos', 'débil', 'fácil', 'solo hay que querer'],
      referenceQuotes: [
        'El primer paso es el más difícil. Y el más valiente.',
        'Cuidar tu salud mental no es un lujo, es una necesidad.',
      ],
    },
    visual: {
      style: 'cálido y contenedor',
      mood: 'seguro y esperanzador',
      photographyStyle: 'retratos cercanos, naturaleza tranquila, espacios acogedores',
      density: 'low',
      imageTextRatio: 'text-heavy',
      compositionRules: [
        'Paleta de verdes, tierra y crema',
        'Tipografía serif o handwritten',
        'Sin imágenes de sufrimiento explícito',
      ],
    },
    goals: {
      primary: 'leads',
      metricsToWatch: ['consultas de sesión', 'saves de contenido reflexivo', 'mensajes de agradecimiento'],
    },
    contentPillars: [
      pillar(
        'psicoeducacion',
        'Psicoeducación',
        'Conceptos de salud mental accesibles',
        35,
        ['carrusel', 'reel'],
        ['Qué es la ansiedad y cómo manejarla', 'Señales de burnout', 'Diferencia entre tristeza y depresión'],
      ),
      pillar(
        'reflexion',
        'Reflexión',
        'Invitaciones a la introspección',
        25,
        ['post-imagen', 'historia'],
        ['Cita reflexiva', 'Pregunta para pensar hoy', 'Recordatorio de bienestar'],
      ),
      pillar(
        'herramientas',
        'Herramientas',
        'Técnicas prácticas',
        25,
        ['carrusel', 'reel'],
        ['Técnica de respiración', 'Ejercicio de grounding', 'Cómo hablarle a la ansiedad'],
      ),
      pillar(
        'humanizacion',
        'Mi Proceso',
        'El profesional detrás del perfil',
        15,
        ['historia', 'reel'],
        ['Por qué elegí esta profesión', 'Algo que aprendí de mis pacientes', 'Mi rutina de autocuidado'],
      ),
    ],
    complianceRules: [
      rule(
        'no-diagnostico-online',
        'No diagnosticar a través de redes sociales',
        true,
        30,
        'Este contenido es educativo y no reemplaza una consulta profesional.',
      ),
      rule(
        'emergencias',
        'Siempre incluir recursos de emergencia cuando se trata temas de crisis',
        true,
        25,
        'Si estás en crisis: Línea 135 (Argentina) — 24hs, gratuita.',
      ),
      rule(
        'matricula-profesional',
        'Incluir número de matrícula profesional en el perfil',
        true,
        20,
        'Lic. en Psicología — MN XXXXX / MP XXXXX',
      ),
    ],
    hashtagPools: {
      general: ['#psicologia', '#saludmental', '#bienestar', '#autoconocimiento', '#terapia'],
      contenido: ['#psicoeducacion', '#ansiedad', '#burnout', '#desarrollopersonal'],
      local: ['#psicologoargentino', '#terapiaonline', '#bienestaremocional'],
    },
    templateHints: ['mental health awareness design', 'therapy services calming', 'self care quote card'],
    brandStrategy: {
      archetype: 'El Cuidador + El Sabio',
      differentiators: [
        'Comunicación empática sin jargon',
        'Contenido preventivo y educativo',
        'Presencia humana y accesible',
      ],
      experiencePrinciples: ['Primero contener, después informar', 'Sin estigma', 'Profesionalismo con calidez'],
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 15. ARQUITECTO / DISEÑADOR DE INTERIORES
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'arquitectura-diseno',
    label: 'Arquitecto / Diseño de Interiores',
    emoji: '🏗️',
    description: 'Arquitectos, diseñadores de interiores y estudio de diseño',
    accountCategory: 'profesional-independiente',
    industryCategory: 'arquitectura-diseno',
    type: 'marca-personal',
    niche: 'Diseño arquitectónico y espacios habitables con identidad',
    voice: {
      tone: ['estético', 'técnico-accesible', 'inspirador', 'preciso'],
      forbidden: ['feo', 'cualquiera lo hace', 'sin estudio'],
      referenceQuotes: ['El espacio bien diseñado cambia cómo vivís.'],
    },
    visual: {
      style: 'arquitectónico limpio',
      mood: 'elegante y preciso',
      photographyStyle: 'renders, fotos de proyecto terminado, planos estilizados',
      density: 'low',
      imageTextRatio: 'image-heavy',
      compositionRules: ['Perspectiva y líneas limpias', 'Paleta neutra con accent', 'Antes/después del proyecto'],
    },
    goals: { primary: 'leads', metricsToWatch: ['solicitudes de presupuesto', 'saves', 'DMs de consulta'] },
    contentPillars: [
      pillar(
        'proyectos',
        'Proyectos',
        'Portfolio de obras',
        40,
        ['carrusel', 'post-imagen', 'reel'],
        ['Tour virtual de proyecto', 'Antes y después', 'Detalle de terminación'],
      ),
      pillar(
        'proceso',
        'Proceso de Diseño',
        'Cómo trabajo',
        25,
        ['reel', 'carrusel'],
        ['Del plano al espacio real', 'Cómo elegimos materiales', 'Errores comunes en reforma'],
      ),
      pillar(
        'educacion',
        'Tips de Diseño',
        'Consejos accesibles',
        25,
        ['carrusel', 'reel'],
        ['Cómo hacer un ambiente más grande visualmente', 'Colores que funcionan', 'Qué es el feng shui y qué no'],
      ),
      pillar(
        'tendencias',
        'Tendencias',
        'Lo que viene en diseño',
        10,
        ['historia', 'carrusel'],
        ['Tendencias 2025', 'Material del año', 'Estilo que llega a Argentina'],
      ),
    ],
    complianceRules: [rule('matricula-arq', 'Mostrar número de matrícula de arquitecto cuando corresponda', false, 15)],
    hashtagPools: {
      general: ['#arquitectura', '#diseñodeinteriores', '#interiordesign', '#hogar', '#reforma'],
      local: ['#arquitecturaargentina', '#diseñoargentino', '#construyendo'],
      niche: ['#interiores', '#homedecor', '#livingroom', '#diseñomoderno'],
    },
    templateHints: ['interior design portfolio', 'architectural render presentation', 'before after renovation'],
    brandStrategy: {
      archetype: 'El Creador + El Gobernante',
      differentiators: [
        'Proceso transparente y educativo',
        'Estética personal coherente',
        'Gestión integral de proyecto',
      ],
      experiencePrinciples: ['Belleza con función', 'Escuchar antes de diseñar', 'Detalle en cada decisión'],
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 16. MODA / ROPA
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'moda-ropa',
    label: 'Moda / Emprendimiento de Ropa',
    emoji: '👘',
    description: 'Marcas de ropa, diseñadores de moda, tiendas de indumentaria',
    accountCategory: 'empresa',
    industryCategory: 'moda-ropa',
    type: 'empresa',
    niche: 'Moda consciente y diseño de indumentaria con identidad propia',
    voice: {
      tone: ['trendy', 'aspiracional', 'cercano', 'estético', 'inclusivo'],
      forbidden: ['para todos igual', 'sin talle', 'producto genérico'],
      referenceQuotes: ['Vestite como quien sos, no como quien esperan que seas.'],
    },
    visual: {
      style: 'fashion editorial asequible',
      mood: 'aspiracional e inclusivo',
      photographyStyle: 'flat lay, modelo en contexto real, street style',
      density: 'low',
      imageTextRatio: 'image-heavy',
      compositionRules: ['Paleta de temporada coherente', 'Modelos reales y diversos', 'Detalles de tela y costura'],
    },
    goals: { primary: 'ventas', metricsToWatch: ['clics a tienda', 'ventas por Instagram', 'saves de outfits'] },
    contentPillars: [
      pillar(
        'producto',
        'Producto',
        'Prendas y colecciones',
        40,
        ['post-imagen', 'carrusel', 'reel'],
        ['Nueva temporada', 'Detalle de la prenda', 'Outfit completo'],
      ),
      pillar(
        'estilo',
        'Estilo e Inspiración',
        'Cómo combinarlo',
        30,
        ['carrusel', 'reel'],
        ['3 formas de usar esta prenda', 'Outfit de la semana', 'Inspiración de street style'],
      ),
      pillar(
        'detras-escenas',
        'Detrás de Escenas',
        'Producción y proceso',
        20,
        ['historia', 'reel'],
        ['Producción fotográfica', 'Costura artesanal', 'Cómo diseñamos la colección'],
      ),
      pillar(
        'comunidad',
        'Comunidad',
        'Clientes usando la marca',
        10,
        ['historia', 'post-imagen'],
        ['Foto de cliente', 'Reseña real', 'Reposta de outfits'],
      ),
    ],
    complianceRules: [
      rule(
        'tallas-disponibles',
        'Indicar talles disponibles en posts de producto',
        false,
        5,
        'Disponible en talles S al XXL',
      ),
      rule('politica-cambio', 'Aclarar política de cambio y devolución cuando se habla de precio o compra', false, 5),
    ],
    hashtagPools: {
      general: ['#moda', '#indumentaria', '#ropa', '#fashion', '#outfit'],
      local: ['#modaargentina', '#marcaargentina', '#ropahecha', '#diseñoargentino'],
      venta: ['#tiendaonline', '#compraargentina', '#fashionista', '#ropanueva'],
    },
    templateHints: ['fashion brand product grid', 'clothing store promotion', 'outfit inspiration carousel'],
    brandStrategy: {
      archetype: 'El Creador + El Amante',
      differentiators: ['Diseño con identidad propia', 'Tallaje inclusivo', 'Producción local y consciente'],
      experiencePrinciples: ['Primero estética', 'Inclusión real', 'Calidad que se nota al tacto'],
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 17. MÚSICO / ARTISTA MUSICAL
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'musica',
    label: 'Músico / Artista',
    emoji: '🎵',
    description: 'Músicos, bandas, productores y artistas musicales',
    accountCategory: 'artista',
    industryCategory: 'musica',
    type: 'marca-personal',
    niche: 'Creación musical y construcción de fanbase',
    voice: {
      tone: ['apasionado', 'auténtico', 'artístico', 'cercano', 'emocional'],
      forbidden: ['comercial sin alma', 'solo por plata', 'sin mensaje'],
      referenceQuotes: ['La música dice lo que las palabras no pueden.'],
    },
    visual: {
      style: 'artístico y vibrante',
      mood: 'emocional y auténtico',
      photographyStyle: 'en vivo, estudio, backstage, fotos artísticas',
      density: 'low',
      imageTextRatio: 'image-heavy',
      compositionRules: [
        'Colores que representen el género musical',
        'Fotos en vivo con energía',
        'Portadas de canciones bien diseñadas',
      ],
    },
    goals: { primary: 'engagement', metricsToWatch: ['plays de reel', 'saves de clips', 'crecimiento de comunidad'] },
    contentPillars: [
      pillar(
        'musica',
        'Música',
        'Lanzamientos y clips',
        35,
        ['reel', 'historia'],
        ['Snippet de nueva canción', 'Clip en vivo', 'Lyric video'],
      ),
      pillar(
        'proceso',
        'Proceso Creativo',
        'Cómo hago música',
        30,
        ['reel', 'carrusel'],
        ['Así nació esta canción', 'En el estudio', 'Cómo compongo'],
      ),
      pillar(
        'fechas',
        'Shows y Fechas',
        'Presentaciones y eventos',
        20,
        ['historia', 'post-imagen'],
        ['Próxima fecha', 'Recap del show', 'Backstage'],
      ),
      pillar(
        'comunidad',
        'Comunidad Fan',
        'Con mis seguidores',
        15,
        ['historia', 'carrusel'],
        ['Gracias por el millón de escuchas', 'Pregunta del día', 'Cover de fans'],
      ),
    ],
    complianceRules: [
      rule(
        'copyright-musica',
        'No publicar canciones con derechos sin licencia (distribuidores como DistroKid/TuneCore lo manejan)',
        true,
        30,
      ),
      rule('acreditar-colaboradores', 'Acreditar a compositores, productores y featurs en cada lanzamiento', false, 10),
    ],
    hashtagPools: {
      general: ['#musica', '#artista', '#nuevacancion', '#indie', '#rock'],
      local: ['#musicaargentina', '#artistaargentino', '#bandaargentina', '#musicalatina'],
      contenido: ['#nuevolanzamiento', '#clipoficial', '#musicaviral'],
    },
    templateHints: ['music artist album promotion', 'concert event poster', 'lyric card design'],
    brandStrategy: {
      archetype: 'El Creador + El Amante',
      differentiators: ['Sonido inconfundible', 'Historia detrás de cada canción', 'Conexión emocional con fans'],
      experiencePrinciples: ['Autenticidad sobre producción', 'La historia primero', 'Comunidad antes que números'],
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 18. ABOGADO / LEGAL
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'legal-abogacia',
    label: 'Abogado / Estudio Jurídico',
    emoji: '⚖️',
    description: 'Abogados, estudios jurídicos y asesores legales',
    accountCategory: 'profesional-independiente',
    industryCategory: 'legal-abogacia',
    type: 'marca-personal',
    niche: 'Asesoramiento legal claro y protección jurídica para personas y empresas',
    voice: {
      tone: ['confiable', 'claro', 'preciso', 'accesible', 'sereno'],
      forbidden: ['cualquiera puede hacerlo solo', 'no necesitás abogado', 'es simple'],
      referenceQuotes: ['La ley es tu escudo. Sabé cómo usarla.', 'Conocer tus derechos te hace libre.'],
    },
    visual: {
      style: 'profesional sobrio',
      mood: 'confiable y serio',
      photographyStyle: 'headshots profesionales, oficina, libros de ley',
      density: 'medium',
      imageTextRatio: 'text-heavy',
      compositionRules: [
        'Paleta azul marino, blanco y dorado',
        'Tipografía serif profesional',
        'Sin imágenes de juicios o esposas',
      ],
    },
    goals: {
      primary: 'autoridad',
      metricsToWatch: ['consultas entrantes', 'saves en posts educativos', 'reach orgánico'],
    },
    contentPillars: [
      pillar(
        'educacion-legal',
        'Educación Legal',
        'Derechos y conceptos clave',
        40,
        ['carrusel', 'reel'],
        ['Tus derechos como inquilino', 'Qué pasa si no firmás el contrato', '¿Cuándo necesitás un abogado laboral?'],
      ),
      pillar(
        'casos-frecuentes',
        'Casos Frecuentes',
        'Situaciones legales comunes',
        30,
        ['carrusel', 'historia'],
        ['Error común en despidos', 'Cómo reclamar una deuda', 'Qué hacer si te estafaron'],
      ),
      pillar(
        'novedades',
        'Novedades Legales',
        'Cambios en la ley',
        20,
        ['carrusel', 'historia'],
        ['Nueva ley de alquileres', 'Reforma laboral explicada', 'Cómo afecta esto a las empresas'],
      ),
      pillar(
        'servicios',
        'Mis Servicios',
        'Áreas de práctica',
        10,
        ['historia', 'post-imagen'],
        ['Áreas de especialización', 'Cómo agendarme', 'Primera consulta gratuita'],
      ),
    ],
    complianceRules: [
      rule(
        'no-consejo-legal-especifico',
        'No dar asesoramiento legal específico sin consulta formal',
        true,
        30,
        'Este contenido es informativo y no constituye asesoramiento legal. Consultá a un profesional.',
      ),
      rule(
        'matricula',
        'Indicar matrícula profesional en el perfil',
        true,
        20,
        'Abogado/a — Mat. T.X F.X — [Colegio de Abogados de ...]',
      ),
    ],
    hashtagPools: {
      general: ['#abogado', '#derecho', '#legal', '#ley', '#justicia'],
      local: ['#abogadoargentino', '#derechoargentino', '#abogadosargentina'],
      educacion: ['#derecholaboral', '#derechocivil', '#educacionlegal', '#tussderechos'],
    },
    templateHints: ['law firm professional design', 'legal rights infographic', 'attorney services card'],
    brandStrategy: {
      archetype: 'El Sabio + El Gobernante',
      differentiators: ['Lenguaje legal accesible', 'Especialización clara', 'Transparencia de honorarios'],
      experiencePrinciples: [
        'Claridad sobre complejidad',
        'Confianza desde el primer contacto',
        'Ética profesional visible',
      ],
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 19. INMOBILIARIA / PROPIEDADES
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'inmobiliaria-propiedades',
    label: 'Inmobiliaria / Propiedades',
    emoji: '🏠',
    description: 'Inmobiliarias, brokers independientes y asesores en real estate',
    accountCategory: 'empresa',
    industryCategory: 'inmobiliaria-propiedades',
    type: 'empresa',
    niche: 'Compra, venta y alquiler de propiedades con asesoramiento personalizado',
    voice: {
      tone: ['confiable', 'profesional', 'cercano', 'informado', 'claro'],
      forbidden: ['te conviene cualquier propiedad', 'sin analizar', 'oportunidad única sin contexto'],
      referenceQuotes: ['Tu próximo hogar. Nuestro próximo éxito.'],
    },
    visual: {
      style: 'inmobiliario premium',
      mood: 'aspiracional y confiable',
      photographyStyle: 'fotos de propiedad de alta calidad, barrio, ambientación',
      density: 'medium',
      imageTextRatio: 'balanced',
      compositionRules: [
        'Fotos de propiedad bien iluminadas',
        'Precio y características visibles',
        'Planos de distribución',
      ],
    },
    goals: { primary: 'leads', metricsToWatch: ['consultas de propiedad', 'reaches locales', 'visitas agendadas'] },
    contentPillars: [
      pillar(
        'propiedades',
        'Propiedades',
        'Altas y disponibles',
        40,
        ['carrusel', 'reel', 'historia'],
        ['Propiedad nueva en el mercado', 'Tour virtual', 'Precio y características'],
      ),
      pillar(
        'mercado',
        'Mercado Inmobiliario',
        'Análisis y tendencias',
        25,
        ['carrusel', 'historia'],
        ['Cómo está el precio del m2', 'Conviene comprar ahora?', 'Barrios en alza'],
      ),
      pillar(
        'educacion',
        'Educación',
        'Comprar, vender y alquilar',
        25,
        ['carrusel', 'reel'],
        ['Qué revisar antes de comprar', 'Impuestos de una propiedad', 'Cómo negociar el precio'],
      ),
      pillar(
        'testimonios',
        'Testimonios',
        'Clientes satisfechos',
        10,
        ['historia', 'post-imagen'],
        ['Familia que encontró su casa', 'Inversión exitosa de cliente'],
      ),
    ],
    complianceRules: [
      rule(
        'precio-actualizado',
        'Los precios de propiedades deben estar actualizados',
        true,
        20,
        'Precio a la fecha de publicación. Consultar disponibilidad.',
      ),
      rule('matricula-corredor', 'Mostrar matrícula de corredor inmobiliario si aplica', true, 20),
    ],
    hashtagPools: {
      general: ['#inmobiliaria', '#propiedades', '#realestate', '#hogar', '#departamento'],
      local: ['#propiedadesargentina', '#inmobiliariabsas', '#casaenargentina'],
      mercado: ['#mercadoinmobiliario', '#inversioninmobiliaria', '#comprarvender'],
    },
    templateHints: ['real estate property listing', 'home for sale announcement', 'property tour carousel'],
    brandStrategy: {
      archetype: 'El Cuidador + El Gobernante',
      differentiators: [
        'Conocimiento profundo del barrio',
        'Acompañamiento legal en la operación',
        'Tasación precisa y honesta',
      ],
      experiencePrinciples: ['Transparencia de precio y comisión', 'Educación del cliente', 'Relación a largo plazo'],
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 20. FINANZAS PERSONALES / INVERSIÓN
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'finanzas-inversion',
    label: 'Finanzas Personales / Inversión',
    emoji: '💰',
    description: 'Educadores financieros, asesores de inversión y finanzas personales',
    accountCategory: 'educador',
    industryCategory: 'finanzas-inversion',
    type: 'marca-personal',
    niche: 'Educación financiera práctica para el público general',
    voice: {
      tone: ['claro', 'empoderador', 'honesto', 'accesible', 'sin jerga'],
      forbidden: ['hacete rico rápido', 'sin riesgo', 'garantizado'],
      referenceQuotes: ['El dinero es una herramienta. Aprendé a usarla.'],
    },
    visual: {
      style: 'limpio y moderno',
      mood: 'empoderador y confiable',
      photographyStyle: 'gráficos de datos, lifestyle financiero, headshots confiables',
      density: 'medium',
      imageTextRatio: 'balanced',
      compositionRules: [
        'Verde y azul marino como paleta base',
        'Datos y estadísticas visualizadas',
        'Sin imágenes de Lamborghini o lifestyle excesivo',
      ],
    },
    goals: { primary: 'autoridad', metricsToWatch: ['saves', 'compartidos', 'consultas de asesoría'] },
    contentPillars: [
      pillar(
        'educacion',
        'Educación Financiera',
        'Conceptos básicos y avanzados',
        35,
        ['carrusel', 'reel'],
        ['Qué es el interés compuesto', 'Cómo armar un presupuesto personal', 'Diferencia entre ahorro e inversión'],
      ),
      pillar(
        'inversiones',
        'Inversiones',
        'Opciones y estrategias',
        30,
        ['carrusel', 'reel'],
        ['Plazo fijo vs FCI', 'Cómo invertir desde $1000', 'Acciones para principiantes'],
      ),
      pillar(
        'habitos',
        'Hábitos Financieros',
        'Mentalidad y comportamiento',
        20,
        ['historia', 'carrusel'],
        ['El error #1 con el dinero', 'Cómo salir de las deudas', 'Regla 50-30-20'],
      ),
      pillar(
        'noticias',
        'Noticias Financieras',
        'Contexto económico',
        15,
        ['historia', 'carrusel'],
        ['Qué significa la suba del dólar', 'Inflación explicada simple', 'Cómo protejo mis ahorros'],
      ),
    ],
    complianceRules: [
      rule(
        'no-consejo-financiero-especifico',
        'No dar recomendaciones de inversión específicas sin evaluar el perfil del inversor',
        true,
        30,
        'Este contenido es educativo. Consultá a un asesor financiero matriculado antes de invertir.',
      ),
      rule(
        'no-garantias',
        'Nunca garantizar rendimientos de inversión',
        true,
        30,
        'Las inversiones conllevan riesgos. Los rendimientos pasados no garantizan resultados futuros.',
      ),
      rule('fcu', 'Si aplica, mostrar credenciales de asesor financiero regulado', false, 15),
    ],
    hashtagPools: {
      general: ['#finanzaspersonales', '#inversion', '#dinero', '#ahorro', '#educacionfinanciera'],
      local: ['#finanzasargentina', '#pesosydolares', '#economia', '#invertirargentina'],
      contenido: ['#libertadfinanciera', '#independenciafinanciera', '#habitos'],
    },
    templateHints: ['financial education infographic', 'investment data chart', 'money habit tips'],
    brandStrategy: {
      archetype: 'El Sabio + El Héroe',
      differentiators: [
        'Lenguaje financiero sin jerga',
        'Contexto local (Argentina/Latam)',
        'Honestidad sobre riesgos',
      ],
      experiencePrinciples: [
        'Empoderar sin prometer milagros',
        'Educación antes de producto',
        'Transparencia de credenciales',
      ],
    },
  },

  // ────────────────────────────────────────────────────────────────────────────
  // 21. MASCOTAS / VETERINARIA
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'mascotas-veterinaria',
    label: 'Mascotas / Veterinaria',
    emoji: '🐾',
    description: 'Veterinarios, pet shops, cuidadores y emprendimientos para mascotas',
    accountCategory: 'profesional-independiente',
    industryCategory: 'mascotas-veterinaria',
    type: 'empresa',
    niche: 'Salud, bienestar y cuidado de mascotas con amor y profesionalismo',
    voice: {
      tone: ['amoroso', 'cálido', 'profesional', 'educativo', 'tierno'],
      forbidden: ['no importa', 'es solo un animal', 'barato igual'],
      referenceQuotes: ['Ellos merecen lo mejor. Nosotros lo sabemos.'],
    },
    visual: {
      style: 'cálido y adorable',
      mood: 'amoroso y confiable',
      photographyStyle: 'fotos de mascotas felices, veterinario con mascota, productos',
      density: 'medium',
      imageTextRatio: 'balanced',
      compositionRules: [
        'Fotos claras y expresivas de mascotas',
        'Colores cálidos y naturales',
        'Uniformes limpios en fotos profesionales',
      ],
    },
    goals: { primary: 'engagement', metricsToWatch: ['saves', 'compartidos', 'consultas de turnos'] },
    contentPillars: [
      pillar(
        'cuidados',
        'Cuidados y Salud',
        'Tips de salud para mascotas',
        35,
        ['carrusel', 'reel'],
        ['Señales de que tu perro está enfermo', 'Vacunas que necesita tu gato', 'Qué hacer en una emergencia'],
      ),
      pillar(
        'mascotas-clientes',
        'Mascotas Pacientes',
        'Los peludos que atendemos',
        30,
        ['post-imagen', 'historia', 'reel'],
        ['El paciente del día', 'Historia de recuperación', 'Antes y después de la consulta'],
      ),
      pillar(
        'nutricion',
        'Nutrición Animal',
        'Alimentación y dieta',
        20,
        ['carrusel', 'reel'],
        ['Qué puede y qué no puede comer tu perro', 'Diferencias entre alimentos', 'Receta de snack casero'],
      ),
      pillar(
        'adopcion',
        'Adopción',
        'Animales en búsqueda de hogar',
        15,
        ['post-imagen', 'historia'],
        ['Mascota en adopción', 'Historia de adopción exitosa', 'Cómo prepararte para adoptar'],
      ),
    ],
    complianceRules: [
      rule(
        'no-consejo-medico-sin-evaluacion',
        'No dar diagnósticos o tratamientos específicos sin evaluar al animal',
        true,
        25,
        'Este contenido es educativo. Ante cualquier síntoma, consultá a tu veterinario.',
      ),
      rule('matricula-veterinaria', 'Incluir matrícula veterinaria en el perfil', true, 20),
    ],
    hashtagPools: {
      general: ['#mascotas', '#veterinaria', '#perros', '#gatos', '#petlover'],
      local: ['#veterinariaargentina', '#mascotasargentina', '#petshopargentino'],
      contenido: ['#petcare', '#dogsofinstagram', '#catsofinstagram', '#adopcion'],
    },
    templateHints: ['pet care infographic', 'veterinary clinic promotion', 'cute pet adoption post'],
    brandStrategy: {
      archetype: 'El Cuidador + El Amante',
      differentiators: [
        'Amor real por los animales visible',
        'Educación preventiva constante',
        'Urgencias y contención emocional',
      ],
      experiencePrinciples: [
        'El bienestar del animal primero',
        'Transparencia de diagnóstico',
        'Relación de largo plazo con la familia',
      ],
    },
  },
];

// ─── Index helpers ─────────────────────────────────────────────────────────────

export const NICHE_PACK_BY_ID: Record<string, NichePack> = Object.fromEntries(NICHE_PACKS.map((p) => [p.id, p]));

export const NICHE_PACKS_BY_CATEGORY: Record<string, NichePack[]> = NICHE_PACKS.reduce<Record<string, NichePack[]>>(
  (acc, pack) => {
    const cat = pack.accountCategory;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(pack);
    return acc;
  },
  {},
);

/**
 * Returns a Partial<BrandProfile> seed from a niche pack — ready to merge
 * with the user's own data. Arrays are returned as-is (not frozen).
 */
export const getNichePackSeed = (packId: string): ReturnType<typeof buildSeed> | null => {
  const pack = NICHE_PACK_BY_ID[packId];
  if (!pack) return null;
  return buildSeed(pack);
};

const buildSeed = (
  pack: NichePack,
): {
  type: NichePack['type'];
  accountCategory: NichePack['accountCategory'];
  industryCategory: NichePack['industryCategory'];
  niche: string;
  nichePackId: string;
  voice: { tone: string[]; forbidden: string[]; referenceQuotes: string[] };
  visual: {
    style: string;
    mood: string;
    photographyStyle: string;
    density: 'low' | 'medium' | 'high';
    imageTextRatio: 'image-heavy' | 'balanced' | 'text-heavy';
    compositionRules: string[];
    palette: string[];
    typography: string[];
    allowedIconography: string[];
    forbiddenIconography: string[];
    moodboardUrls: string[];
  };
  goals: { primary: NichePack['goals']['primary']; metricsToWatch: string[] };
  contentPillars: ContentPillar[];
  complianceRules: ComplianceRule[];
  hashtagPools: Record<string, string[]>;
  brandStrategy: {
    archetype: string;
    differentiators: string[];
    experiencePrinciples: string[];
    vision: string;
    mission: string;
    values: string[];
    promise: string;
    positioning: string;
    story: string;
    personality: string[];
    architecture: string;
    targetPersonas: never[];
    brandVoiceRules: never[];
    visualUsageRules: never[];
  };
} => ({
  type: pack.type,
  accountCategory: pack.accountCategory,
  industryCategory: pack.industryCategory,
  niche: pack.niche,
  nichePackId: pack.id,
  voice: {
    tone: [...pack.voice.tone],
    forbidden: [...pack.voice.forbidden],
    referenceQuotes: [...pack.voice.referenceQuotes],
  },
  visual: {
    style: pack.visual.style,
    mood: pack.visual.mood,
    photographyStyle: pack.visual.photographyStyle,
    density: pack.visual.density,
    imageTextRatio: pack.visual.imageTextRatio,
    compositionRules: [...pack.visual.compositionRules],
    palette: [],
    typography: [],
    allowedIconography: [],
    forbiddenIconography: [],
    moodboardUrls: [],
  },
  goals: {
    primary: pack.goals.primary,
    metricsToWatch: [...pack.goals.metricsToWatch],
  },
  contentPillars: pack.contentPillars.map((p) => ({
    ...p,
    formats: [...p.formats],
    exampleTopics: [...p.exampleTopics],
  })),
  complianceRules: pack.complianceRules.map((r) => ({ ...r })),
  hashtagPools: Object.fromEntries(Object.entries(pack.hashtagPools).map(([k, v]) => [k, [...v]])),
  brandStrategy: {
    archetype: pack.brandStrategy.archetype,
    differentiators: [...pack.brandStrategy.differentiators],
    experiencePrinciples: [...pack.brandStrategy.experiencePrinciples],
    vision: '',
    mission: '',
    values: [],
    promise: '',
    positioning: '',
    story: '',
    personality: [],
    architecture: 'master-brand',
    targetPersonas: [],
    brandVoiceRules: [],
    visualUsageRules: [],
  },
});
