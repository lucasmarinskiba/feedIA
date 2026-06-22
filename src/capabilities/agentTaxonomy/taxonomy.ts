/**
 * Agent Taxonomy — IBM's classical 5-tier classification
 * ─────────────────────────────────────────────────────────────────────────
 * Every subsystem in FeedIA is classified by the canonical agent taxonomy
 * established by AI experts (as formalized by IBM):
 *
 *   1. simple-reflex       — "if X then Y" rules, ignores history
 *   2. model-based-reflex  — keeps internal state of the world it can't see
 *   3. goal-based          — evaluates action paths to reach an assigned goal
 *   4. utility-based       — measures the "happiness"/efficiency of outcomes
 *   5. learning            — adapts and improves from feedback over time
 *
 * Talía (the Agent Manager) uses this taxonomy to decide WHICH kind of agent
 * is right for each fragment of a global order:
 *   • reactive/safety fragments  → simple-reflex / model-based-reflex
 *   • planning fragments         → goal-based
 *   • optimization fragments     → utility-based
 *   • adaptation fragments       → learning
 */

export type AgentType = 'simple-reflex' | 'model-based-reflex' | 'goal-based' | 'utility-based' | 'learning';

export interface AgentTypeInfo {
  type: AgentType;
  name: string;
  /** One-line definition (Spanish, user-facing). */
  definition: string;
  /** When Talía should delegate to an agent of this type. */
  delegateWhen: string;
  /** Canonical traits. */
  traits: string[];
}

export const AGENT_TYPES: Record<AgentType, AgentTypeInfo> = {
  'simple-reflex': {
    type: 'simple-reflex',
    name: 'Reflejo simple',
    definition: 'Actúa únicamente bajo reglas predefinidas "si ocurre X, haz Y", ignorando el historial pasado.',
    delegateWhen: 'Tareas reactivas, deterministas y de seguridad: filtros, validaciones, gatillos inmediatos.',
    traits: ['condición→acción', 'sin estado', 'sin memoria', 'latencia mínima', 'auditable 100%'],
  },
  'model-based-reflex': {
    type: 'model-based-reflex',
    name: 'Reflejo basado en modelos',
    definition: 'Mantiene un estado interno para seguir aspectos del entorno que no puede ver directamente.',
    delegateWhen: 'Tareas que requieren recordar el contexto reciente que no es observable directamente.',
    traits: ['estado interno', 'modelo del mundo', 'reacciona con contexto', 'tolerante a observación parcial'],
  },
  'goal-based': {
    type: 'goal-based',
    name: 'Basado en objetivos',
    definition: 'Evalúa diferentes caminos de acción para elegir el que mejor ayude a cumplir la meta asignada.',
    delegateWhen: 'Tareas de planificación: descomponer una meta y elegir la mejor secuencia de acciones.',
    traits: ['evalúa caminos', 'busca la meta', 'planifica', 'razonamiento prospectivo'],
  },
  'utility-based': {
    type: 'utility-based',
    name: 'Basado en utilidad',
    definition: 'Mide el grado de "felicidad" o eficiencia de un resultado para optimizar su comportamiento.',
    delegateWhen: 'Tareas de optimización: cuando hay múltiples metas válidas y hay que maximizar un score.',
    traits: ['función de utilidad', 'optimiza', 'trade-offs', 'maximiza resultado esperado'],
  },
  learning: {
    type: 'learning',
    name: 'Agente de aprendizaje',
    definition: 'Se adapta y mejora con la experiencia mediante retroalimentación continua de aciertos y errores.',
    delegateWhen: 'Tareas que mejoran con el tiempo: auto-optimización, detección de patrones, ajuste de estrategia.',
    traits: ['retroalimentación', 'mejora continua', 'explora/explota', 'aprende del éxito'],
  },
};

/* ──────────────────────────────────────────────────────────────────────── */

export interface ClassifiedAgent {
  agentId: string;
  /** Human label of the agent / subsystem. */
  label: string;
  type: AgentType;
  /** Department within the "company" (used by Talía's org chart). */
  department: string;
  /** Capabilities surfaced to the manager for delegation. */
  capabilities: string[];
  /** Why this subsystem belongs to this taxonomy type. */
  rationale: string;
}

/**
 * Authoritative classification of every operational subsystem in FeedIA.
 * Includes the 10 dashboard agents + the autonomous engines.
 */
const CLASSIFIED: ClassifiedAgent[] = [
  // ── Dashboard specialist agents ──────────────────────────────────────
  {
    agentId: 'algorithm',
    label: 'Algorithm Master',
    type: 'model-based-reflex',
    department: 'Distribución & Alcance',
    capabilities: [
      'timing óptimo',
      'diagnóstico shadowban',
      'estrategia explore',
      'score de contenido',
      'boost de alcance',
    ],
    rationale: 'Mantiene un modelo del estado del algoritmo (no observable) para reaccionar con contexto.',
  },
  {
    agentId: 'meta-ads',
    label: 'Meta Ads Pro',
    type: 'utility-based',
    department: 'Paid Media',
    capabilities: ['estructura de campaña', 'copy de anuncios', 'mapa de audiencias', 'plan de ROAS'],
    rationale: 'Optimiza ROAS — maximiza una función de utilidad sobre presupuesto vs retorno.',
  },
  {
    agentId: 'humor',
    label: 'Humor Engine',
    type: 'goal-based',
    department: 'Contenido',
    capabilities: ['concepto de meme', 'humor trending', 'formatos virales de comedia'],
    rationale: 'Evalúa caminos creativos para alcanzar la meta de entretenimiento/share.',
  },
  {
    agentId: 'sales',
    label: 'Sales Closer',
    type: 'goal-based',
    department: 'Conversión',
    capabilities: ['lead magnet', 'funnel de DM', 'secuencia de cierre', 'objeciones'],
    rationale: 'Planifica el camino del prospecto hacia la conversión (meta de venta).',
  },
  {
    agentId: 'community',
    label: 'Community Manager',
    type: 'model-based-reflex',
    department: 'Comunidad',
    capabilities: ['comentarios faro', 'rituales de comunidad', 'gestión de DMs', 'engagement'],
    rationale: 'Mantiene estado de las relaciones/conversaciones para responder con contexto.',
  },
  {
    agentId: 'trends',
    label: 'Trend Radar',
    type: 'learning',
    department: 'Inteligencia',
    capabilities: ['scraping de tendencias', 'detección de oportunidades', 'ángulos en alza'],
    rationale: 'Mejora la detección con cada ciclo de feedback sobre qué tendencia funcionó.',
  },
  {
    agentId: 'storyteller',
    label: 'Storyteller',
    type: 'goal-based',
    department: 'Contenido',
    capabilities: ['caso real desarmado', 'arco de fundador', 'behind-the-scenes'],
    rationale: 'Construye narrativas evaluando estructuras que mejor alcanzan la meta de autoridad.',
  },
  {
    agentId: 'viral',
    label: 'Viral Architect',
    type: 'utility-based',
    department: 'Crecimiento',
    capabilities: ['piezas de alta saveability', 'ingeniería de viralidad', 'reset de alcance'],
    rationale: 'Maximiza una utilidad de viralidad esperada (saves+shares ponderados).',
  },
  {
    agentId: 'growth',
    label: 'Growth Analyst',
    type: 'learning',
    department: 'Crecimiento',
    capabilities: ['auditoría de cuenta', 'experimentos', 'optimización de funnel'],
    rationale: 'Aprende de experimentos pasados para ajustar la estrategia de crecimiento.',
  },
  {
    agentId: 'strategist',
    label: 'Brand Strategist',
    type: 'goal-based',
    department: 'Estrategia',
    capabilities: ['pilares de contenido', 'posicionamiento', 'plan de autoridad'],
    rationale: 'Define metas estratégicas y evalúa caminos para alcanzarlas.',
  },

  // ── Autonomous engines ──────────────────────────────────────────────
  {
    agentId: 'autonomous-producer',
    label: 'Autonomous Producer',
    type: 'goal-based',
    department: 'Producción',
    capabilities: ['producción end-to-end de piezas', 'closed-loop scoring', 'originalidad'],
    rationale: 'Persigue la meta "pieza publicable" evaluando hook+template+score.',
  },
  {
    agentId: 'auto-optimization',
    label: 'Auto-Optimization Loop',
    type: 'learning',
    department: 'Inteligencia',
    capabilities: ['extracción de patrones de éxito', 'recomendaciones', 'ajuste de estrategia'],
    rationale: 'El loop de aprendizaje canónico: aprende del éxito histórico propio.',
  },
  {
    agentId: 'content-scorer',
    label: 'Content Scorer',
    type: 'utility-based',
    department: 'Calidad',
    capabilities: ['score de compartibilidad', 'score de guardabilidad'],
    rationale: 'Calcula una utilidad (share/save) determinista del contenido.',
  },
  {
    agentId: 'originality-engine',
    label: 'Originality Engine',
    type: 'simple-reflex',
    department: 'Calidad',
    capabilities: ['fingerprinting', 'similitud vs historia', 'gate de publicación'],
    rationale: 'Regla pura: si similitud > umbral → bloquear. Sin estado ni aprendizaje.',
  },
  {
    agentId: 'crisis-manager',
    label: 'Crisis Manager',
    type: 'simple-reflex',
    department: 'Riesgo',
    capabilities: ['pausa de publicaciones', 'detección de disparadores', 'alertas'],
    rationale: 'Reglas reactivas: si disparador de crisis → pausar + alertar.',
  },
  {
    agentId: 'convo-router',
    label: 'Conversational Router',
    type: 'model-based-reflex',
    department: 'Comunidad',
    capabilities: ['detección de intent', 'FAQ matching', 'escalado', 'lead qualification'],
    rationale: 'Mantiene estado de la conversación para rutear con contexto.',
  },
  {
    agentId: 'kpi-audit',
    label: 'Weekly KPI Audit',
    type: 'learning',
    department: 'Inteligencia',
    capabilities: ['auditoría completa', 'prioridades estratégicas', 'ajuste de estrategia'],
    rationale: 'Cierra el ciclo semanal aprendiendo qué mejoró y ajustando.',
  },
  {
    agentId: 'computer-use',
    label: 'Computer Use Operator',
    type: 'goal-based',
    department: 'Automatización',
    capabilities: ['control de cursor/teclado', 'navegación Instagram', 'navegación de apps'],
    rationale: 'Planifica la secuencia de acciones físicas para alcanzar el objetivo de UI.',
  },

  // ── Roles operativos ampliados (equipo completo de marketing) ────────
  {
    agentId: 'community-manager',
    label: 'Community Manager Pro',
    type: 'model-based-reflex',
    department: 'Comunidad',
    capabilities: ['responder DMs', 'responder comentarios', 'moderación', 'tono de marca en respuestas'],
    rationale: 'Mantiene estado de cada hilo de conversación para responder con contexto.',
  },
  {
    agentId: 'support-agent',
    label: 'Customer Support Agent',
    type: 'model-based-reflex',
    department: 'Comunidad',
    capabilities: ['FAQ', 'resolución de dudas', 'escalado a humano', 'seguimiento postventa'],
    rationale: 'Sigue el estado del caso del usuario aunque no vea todo el historial.',
  },
  {
    agentId: 'publicist',
    label: 'Publicista',
    type: 'goal-based',
    department: 'Contenido',
    capabilities: ['mensajes de campaña', 'angulos publicitarios', 'press hooks'],
    rationale: 'Evalúa ángulos para alcanzar la meta de notoriedad.',
  },
  {
    agentId: 'communicator',
    label: 'Comunicador',
    type: 'goal-based',
    department: 'Contenido',
    capabilities: ['claridad del mensaje', 'narrativa de marca', 'consistencia comunicacional'],
    rationale: 'Planifica la comunicación para que el mensaje llegue claro.',
  },
  {
    agentId: 'graphic-designer',
    label: 'Diseñador Gráfico',
    type: 'goal-based',
    department: 'Diseño',
    capabilities: ['composición visual', 'jerarquía tipográfica', 'layouts de carrusel/reel/historia'],
    rationale: 'Evalúa composiciones para alcanzar la meta estética y de retención.',
  },
  {
    agentId: 'art-director',
    label: 'Director de Arte',
    type: 'utility-based',
    department: 'Diseño',
    capabilities: ['dirección visual', 'coherencia de feed', 'sistema de diseño', 'mood'],
    rationale: 'Optimiza la utilidad estética agregada del feed completo.',
  },
  {
    agentId: 'brand-designer',
    label: 'Diseñador de Marca',
    type: 'goal-based',
    department: 'Diseño',
    capabilities: ['identidad visual', 'paleta', 'tipografías', 'iconografía'],
    rationale: 'Construye el sistema de marca evaluando opciones contra la identidad.',
  },
  {
    agentId: 'copywriter',
    label: 'Redactor Publicitario',
    type: 'goal-based',
    department: 'Contenido',
    capabilities: ['captions', 'CTAs', 'microcopy', 'angular de venta'],
    rationale: 'Evalúa formulaciones de copy para la meta de conversión/engagement.',
  },
  {
    agentId: 'digital-marketer',
    label: 'Especialista Marketing Digital',
    type: 'utility-based',
    department: 'Crecimiento',
    capabilities: ['embudo', 'mezcla de contenido', 'KPIs', 'optimización de conversión'],
    rationale: 'Maximiza la utilidad del embudo (alcance→lead→venta).',
  },
  {
    agentId: 'smm',
    label: 'Social Media Manager',
    type: 'goal-based',
    department: 'Operaciones',
    capabilities: ['calendario editorial', 'mix de formatos', 'coordinación de publicaciones'],
    rationale: 'Planifica el calendario para cumplir metas de presencia.',
  },
  {
    agentId: 'traffic-manager',
    label: 'Paid Media / Traffic Manager',
    type: 'utility-based',
    department: 'Paid Media',
    capabilities: ['estructura de campañas', 'pujas', 'segmentación', 'optimización de ROAS'],
    rationale: 'Maximiza la utilidad del gasto publicitario (ROAS).',
  },
  {
    agentId: 'data-analyst',
    label: 'Data Analyst',
    type: 'learning',
    department: 'Inteligencia',
    capabilities: ['análisis de métricas', 'detección de anomalías', 'insights accionables'],
    rationale: 'Aprende de los datos históricos para refinar lecturas.',
  },
  {
    agentId: 'growth-analyst-2',
    label: 'Analista de Crecimiento',
    type: 'learning',
    department: 'Crecimiento',
    capabilities: ['cohortes', 'retención', 'curva de crecimiento', 'palancas'],
    rationale: 'Mejora el modelo de crecimiento con cada ciclo de feedback.',
  },
  {
    agentId: 'influencer-manager',
    label: 'Influencer Marketing Manager',
    type: 'goal-based',
    department: 'Alianzas',
    capabilities: ['prospección de creadores', 'outreach de colab', 'fit de marca', 'negociación'],
    rationale: 'Planifica el camino de colaboración hacia la meta de alcance prestado.',
  },
  {
    agentId: 'influencer',
    label: 'Influencer Persona',
    type: 'goal-based',
    department: 'Contenido',
    capabilities: ['voz personal', 'storytelling en primera persona', 'autoridad humilde'],
    rationale: 'Construye la persona pública evaluando qué resuena con la audiencia.',
  },
  {
    agentId: 'growth-from-zero',
    label: 'Especialista Crecimiento desde 0',
    type: 'learning',
    department: 'Crecimiento',
    capabilities: ['arranque sin audiencia', 'primeros 1000 seguidores', 'tracción inicial'],
    rationale: 'Aprende qué activó tracción en cuentas similares y lo replica.',
  },
  {
    agentId: 'shareable-specialist',
    label: 'Especialista Contenido Compartible',
    type: 'utility-based',
    department: 'Crecimiento',
    capabilities: ['contenido DM-able', 'identificación', 'social currency', 'POV'],
    rationale: 'Optimiza la utilidad de share (probabilidad de envío por DM).',
  },
  {
    agentId: 'saveable-specialist',
    label: 'Especialista Contenido Guardable',
    type: 'utility-based',
    department: 'Crecimiento',
    capabilities: ['valor de referencia', 'frameworks', 'listas', 'densidad informativa'],
    rationale: 'Optimiza la utilidad de save (probabilidad de bookmark).',
  },
  {
    agentId: 'retention-specialist',
    label: 'Especialista Retención de Retorno',
    type: 'learning',
    department: 'Comunidad',
    capabilities: ['re-engagement', 'callbacks', 'pulsos a dormidos', 'recurrencia'],
    rationale: 'Aprende qué reactiva a cada segmento dormido.',
  },
  {
    agentId: 'visual-hook-engineer',
    label: 'Ingeniero de Ganchos Visuales',
    type: 'utility-based',
    department: 'Diseño',
    capabilities: ['covers', 'first-frame', 'contraste', 'gestalt incompleta'],
    rationale: 'Optimiza la utilidad de detención visual en los primeros 3s.',
  },
  {
    agentId: 'text-hook-engineer',
    label: 'Ingeniero de Ganchos Textuales',
    type: 'utility-based',
    department: 'Contenido',
    capabilities: ['hooks', 'curiosity gaps', 'especificidad', 'patrones virales'],
    rationale: 'Optimiza el score de retención textual del gancho.',
  },
  {
    agentId: 'template-designer',
    label: 'Diseñador de Plantillas Conceptuales',
    type: 'goal-based',
    department: 'Diseño',
    capabilities: ['esqueletos narrativos', 'plantillas reutilizables', 'estructura de pieza'],
    rationale: 'Evalúa estructuras que mejor alcanzan la meta del formato.',
  },
  {
    agentId: 'originality-curator',
    label: 'Curador de Originalidad',
    type: 'simple-reflex',
    department: 'Calidad',
    capabilities: ['anti-duplicado', 'fingerprint', 'gate de unicidad'],
    rationale: 'Regla pura: si similitud > umbral → bloquear.',
  },
  {
    agentId: 'bio-strategist',
    label: 'Estratega de Bio',
    type: 'goal-based',
    department: 'Estrategia',
    capabilities: ['promesa clara', 'conversión visit→follow', 'link en bio'],
    rationale: 'Evalúa formulaciones de bio para maximizar conversión a follow.',
  },
  {
    agentId: 'pin-strategist',
    label: 'Estratega de Pins',
    type: 'goal-based',
    department: 'Estrategia',
    capabilities: ['posts fijados', 'funnel awareness→conversión', 'slate de 3'],
    rationale: 'Evalúa qué piezas fijar para el embudo del visitante.',
  },
  {
    agentId: 'growth-hacker',
    label: 'Growth Hacker (Automatización de Comunidad)',
    type: 'learning',
    department: 'Crecimiento',
    capabilities: ['loops de crecimiento', 'automatización de comunidad', 'experimentos rápidos'],
    rationale: 'Itera experimentos de crecimiento aprendiendo de cada resultado.',
  },
  {
    agentId: 'competitive-intel',
    label: 'Inteligencia Competitiva',
    type: 'learning',
    department: 'Inteligencia',
    capabilities: ['análisis de competidores', 'detección de patrones de éxito', 'benchmarking'],
    rationale: 'Aprende qué hace ganar a los competidores y lo adapta.',
  },
  {
    agentId: 'trend-scraper',
    label: 'Scraper de Tendencias',
    type: 'model-based-reflex',
    department: 'Inteligencia',
    capabilities: ['scraping de tendencias', 'señales emergentes', 'ventana de oportunidad'],
    rationale: 'Mantiene un modelo del panorama de tendencias no observable directo.',
  },
  {
    agentId: 'hook-engine',
    label: 'Motor de Ingeniería de Ganchos',
    type: 'utility-based',
    department: 'Contenido',
    capabilities: ['generación de hooks', 'scoring', 'matcher de patrones'],
    rationale: 'Maximiza el score esperado del gancho generado.',
  },
  {
    agentId: 'caption-writer',
    label: 'Redactor de Captions',
    type: 'goal-based',
    department: 'Contenido',
    capabilities: ['captions largos/cortos', 'storytelling', 'CTA integrado'],
    rationale: 'Evalúa estructuras de caption para la meta de la pieza.',
  },
  {
    agentId: 'hashtag-strategist',
    label: 'Estratega de Hashtags',
    type: 'utility-based',
    department: 'Distribución & Alcance',
    capabilities: ['mix de hashtags', 'rotación de pools', 'volumen óptimo'],
    rationale: 'Optimiza la utilidad de alcance del set de hashtags.',
  },
  {
    agentId: 'scheduler-agent',
    label: 'Planificador de Calendario',
    type: 'goal-based',
    department: 'Operaciones',
    capabilities: ['horarios óptimos', 'cadencia', 'distribución semanal'],
    rationale: 'Planifica el cuándo para cumplir la meta de consistencia.',
  },
  {
    agentId: 'reels-producer',
    label: 'Productor de Reels',
    type: 'goal-based',
    department: 'Producción',
    capabilities: ['beat sheet', 'guion de reel', 'ritmo y retención'],
    rationale: 'Planifica la estructura del reel para maximizar completion.',
  },
  {
    agentId: 'carousel-producer',
    label: 'Productor de Carruseles',
    type: 'goal-based',
    department: 'Producción',
    capabilities: ['slide-by-slide', 'arco narrativo', 'cierre con CTA'],
    rationale: 'Planifica la secuencia de slides hacia la meta de save.',
  },
  {
    agentId: 'stories-producer',
    label: 'Productor de Historias',
    type: 'goal-based',
    department: 'Producción',
    capabilities: ['secuencia de frames', 'stickers interactivos', 'dwell time'],
    rationale: 'Planifica frames + interacción para reactivar el segmento.',
  },
  {
    agentId: 'image-renderer',
    label: 'Renderizador de Imágenes',
    type: 'simple-reflex',
    department: 'Producción',
    capabilities: ['render SVG/imagen', 'aplicar branding', 'export final'],
    rationale: 'Regla: dado un brief + brandkit → renderizar la pieza.',
  },
  {
    agentId: 'aesthetic-scorer',
    label: 'Evaluador Estético',
    type: 'utility-based',
    department: 'Calidad',
    capabilities: ['score estético', 'consistencia visual', 'balance de composición'],
    rationale: 'Calcula una utilidad estética determinista de la pieza.',
  },
  {
    agentId: 'compliance-guard',
    label: 'Guardia de Cumplimiento',
    type: 'simple-reflex',
    department: 'Riesgo',
    capabilities: ['límites diarios', 'políticas de plataforma', 'anti-ban'],
    rationale: 'Reglas: si excede límite/política → bloquear acción.',
  },
  {
    agentId: 'publisher-agent',
    label: 'Publicador',
    type: 'simple-reflex',
    department: 'Automatización',
    capabilities: ['subir a Instagram', 'programar publicación', 'confirmar publicado'],
    rationale: 'Regla: pieza aprobada + slot → publicar.',
  },
  {
    agentId: 'directive-conductor',
    label: 'Director de Directivas',
    type: 'goal-based',
    department: 'Operaciones',
    capabilities: ['interpretar indicaciones', 'orquestar end-to-end', 'cumplir metas recurrentes'],
    rationale: 'Descompone cada directiva en el camino de agentes que la cumple.',
  },
];

export const listClassifiedAgents = (): ClassifiedAgent[] => [...CLASSIFIED];

export const getClassifiedAgent = (agentId: string): ClassifiedAgent | undefined =>
  CLASSIFIED.find((a) => a.agentId === agentId);

export const getAgentsByType = (type: AgentType): ClassifiedAgent[] => CLASSIFIED.filter((a) => a.type === type);

export const getAgentsByDepartment = (department: string): ClassifiedAgent[] =>
  CLASSIFIED.filter((a) => a.department === department);

export const listDepartments = (): string[] => Array.from(new Set(CLASSIFIED.map((a) => a.department))).sort();

export const listAgentTypes = (): AgentTypeInfo[] => Object.values(AGENT_TYPES);

/**
 * Given a free-text task fragment, infer which taxonomy type should handle it.
 * Deterministic keyword routing — used by Talía's delegation engine.
 */
export const inferBestTypeForTask = (taskText: string): AgentType => {
  const t = taskText.toLowerCase();
  if (/\b(crisis|bloquea|pausa|valida|filtra|si ocurre|gate|umbral)\b/.test(t)) return 'simple-reflex';
  if (/\b(conversaci|context|estado|recuerda|sigue la pista|rutea|intent)\b/.test(t)) return 'model-based-reflex';
  if (/\b(planific|estrategia|descompon|camino|pasos|meta|objetivo|produc)\b/.test(t)) return 'goal-based';
  if (/\b(optimiz|maximiz|roas|score|eficiencia|trade-off|util)\b/.test(t)) return 'utility-based';
  if (/\b(aprend|mejora|adapt|patr[oó]n|experiment|auto-optim|feedback|histor)\b/.test(t)) return 'learning';
  return 'goal-based';
};
