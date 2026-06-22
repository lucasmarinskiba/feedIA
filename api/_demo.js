/**
 * Demo data compartida para los Vercel serverless mocks.
 * Toda la app frontend usa `apiSafe` → si una API falta cae a fallback con
 * badge "📡 offline". Acá devolvemos contenido suficiente para que la demo
 * SE SIENTA viva (no todo en cero) sin necesitar backend completo.
 */

const HOY = new Date().toISOString();

const DEMO_BRAND = {
  name: 'Marca Demo',
  niche: 'Productividad para creators',
  audience: { description: 'Creators independientes 25-40', size: '10k-100k' },
  voice: {
    tone: ['cercano', 'directo', 'sin clickbait'],
    forbidden: ['gurú', 'literalmente', 'increíble'],
  },
  visual: {
    palette: ['#0A0A0A', '#F5F5F5', '#E1306C', '#A855F7', '#22D3EE'],
    typography: ['Inter', 'JetBrains Mono'],
    style: 'minimal · alto contraste · acento neón',
    mood: 'profesional con calidez',
    density: 'medium',
  },
  goals: { primary: 'autoridad en el nicho', secondary: ['leads cualificados', 'comunidad activa'] },
};

const DEMO_IDENTITY = {
  displayName: DEMO_BRAND.name,
  niche: DEMO_BRAND.niche,
  connected: false,
  demoMode: true,
};

const DEMO_DASHBOARD = {
  mascotEmoji: '✨',
  themeColors: { primary: '#0A0A0A', secondary: '#E1306C' },
  timeBasedMessage: 'Modo demo — sin backend real. Probá la UI y las animaciones.',
  delightMessage: 'Tu equipo de IA está esperando órdenes.',
  todayActions: [
    'Conectá tu cuenta de Instagram (Settings → Cuentas)',
    'Hacé la entrevista de marca para personalizar el sistema',
    'Definí tu meta del mes',
  ],
  suggestionsForNow: [
    'Probá ⌘K y pedile cualquier cosa al equipo',
    'Mirá la Sala Ejecutiva 👑 (apalancamiento + trofeos)',
    'Activá el "Cerebro autónomo" en Pantalla en vivo 🖥️',
  ],
  upcomingMilestone: { description: 'Primer carrusel publicado', daysAway: 1 },
  activeCelebrations: [],
  unacknowledgedAchievements: [],
  activeGoals: [],
  privateMessage:
    'Este es el modo demo de FeedIA en Vercel. La operación real necesita backend completo (ver README-DEPLOY.md).',
  recentMemory: null,
};

const DEMO_KPIS = (period = 30) => ({
  followers: { value: null, label: 'Seguidores', hint: 'Conectá Meta API para ver datos reales', delta: null, period },
  reach: { value: null, label: 'Alcance', hint: 'Sincronizá métricas', delta: null, period },
  engagement: { value: null, label: 'Engagement Rate', hint: 'Pendiente de datos', delta: null, period },
  velocity: { value: null, label: 'Velocidad', hint: 'Sin baseline aún', delta: null, period },
});

const DEMO_ACTIVITY = [
  { quien: 'Talía', emoji: '🎯', rol: 'Orquestadora', accion: 'coordinó una misión de demo', cuando: HOY },
  { quien: 'Nova', emoji: '✍️', rol: 'Copywriter', accion: 'redactó 3 captions de prueba', cuando: HOY },
  {
    quien: 'Luca',
    emoji: '🎨',
    rol: 'Director de Contenido',
    accion: 'diseñó un carrusel branded (demo)',
    cuando: HOY,
  },
  { quien: 'Lía', emoji: '💬', rol: 'Community', accion: 'está atendiendo la comunidad (simulado)', cuando: HOY },
  { quien: 'Gard', emoji: '🛡️', rol: 'Compliance', accion: 'validó políticas de marca', cuando: HOY },
];

const DEMO_INTELLIGENCE = {
  budget: {
    spentUsd: 0,
    capUsd: 5,
    usedPct: 0,
    breaker: 'closed',
    calls: 0,
    inputTokens: 0,
    outputTokens: 0,
    byModel: {},
  },
  cache: { hitRatePct: 0, entries: 0, hits: 0, misses: 0, topReused: [] },
  bandits: [],
  digest: {
    resumenEjecutivo: 'Modo demo. Sin datos reales — conectá un backend para ver intel viva.',
    data: {
      intel: {
        misiones: { ok: 0, parciales: 0, fallidas: 0, total: 0 },
        trazas: { tasaExito: 0, total: 0, conOutcome: 0 },
        carruseles: { publicados: 0, retenidos: 0, total: 0 },
        presupuesto: { gastadoUsd: 0, topeUsd: 5, usadoPct: 0, breaker: 'closed' },
        riesgos: [],
      },
    },
    cosasQueRequierenAtencion: [],
  },
};

const DEMO_AUTOPILOT = {
  activated: false,
  modules: {
    pinSlate: { id: 'pinSlate', label: 'Pin Slate', description: 'Posts fijados del feed/perfil.', enabled: true },
    templates: { id: 'templates', label: 'Templates', description: 'Rotación de plantillas.', enabled: true },
    originality: {
      id: 'originality',
      label: 'Originality',
      description: 'Anti-repetición pre-publicación.',
      enabled: true,
    },
    convoRouter: { id: 'convoRouter', label: 'Convo Router', description: 'Rutea DMs/comments.', enabled: true },
    retention: { id: 'retention', label: 'Retention Pulse', description: 'Re-engagement.', enabled: false },
    outreach: { id: 'outreach', label: 'Outreach', description: 'Cold DMs / colabs.', enabled: false },
  },
  updatedAt: HOY,
};

/**
 * Live AI status — chequea env vars en request time.
 * Si hay alguna API key configurada → aiReady=true y banner desaparece.
 */
const buildAiStatus = () => {
  const e = process.env;
  const providers = {
    groq: !!e.GROQ_API_KEY,
    gemini: !!e.GEMINI_API_KEY,
    deepseek: !!e.DEEPSEEK_API_KEY,
    openrouter: !!e.OPENROUTER_API_KEY,
    anthropic: !!e.ANTHROPIC_API_KEY,
    openai: !!e.OPENAI_API_KEY,
  };
  const live = Object.entries(providers)
    .filter(([, v]) => v)
    .map(([k]) => k);
  const aiReady = live.length > 0;
  return {
    aiReady,
    providers,
    livePrimary: live[0] || null,
    reason: aiReady ? 'live' : 'no_provider',
    message: aiReady
      ? `✓ IA real activa · proveedor primario: ${live[0]} · ${live.length} provider(s) listo(s).`
      : '⚙️ Configurá GROQ_API_KEY (gratis: console.groq.com) para activar IA real.',
  };
};
const DEMO_AI_STATUS = buildAiStatus();
export { buildAiStatus };

const DEMO_WELCOME = {
  saludo: 'Bienvenido a la demo de FeedIA',
  marca: DEMO_BRAND.name,
  primeraVez: true,
  visita: 1,
  tier: 'Bronce',
  equipoActivo: 10,
  desdeUltimaVisita: {
    horas: 0,
    misiones: 0,
    carruseles: 0,
    sesionesPantalla: 0,
    decisiones: 0,
    titular: 'Esto es la demo. Explorá las vistas — los datos son simulados.',
  },
  proximaIndicacion: 'Tocá ⌘K y escribí "armá un carrusel" para ver cómo enruta tu equipo.',
  destacado: DEMO_ACTIVITY.slice(0, 4),
};

const DEMO_BRIEF = {
  fundador: DEMO_BRAND.name,
  saludo: `${DEMO_BRAND.name}, esta es tu Sala Ejecutiva (demo).`,
  titular: '0 acciones ejecutadas · apalancamiento 1 : 1',
  tier: 'Bronce',
  tierProgresoPct: 0,
  leverage: {
    indicacionesDadas: 1,
    accionesEjecutadas: 1,
    ratio: 1,
    ratioLabel: '1 : 1',
    equipoReemplazado: 8,
    costoEquipoUsdMes: 31000,
    horasHumanasAhorradas: 0,
    ahorroAnualUsd: 372000,
  },
  staff: [
    { rol: 'Community Manager', estado: 'operando para vos · 24/7' },
    { rol: 'Diseñador Gráfico Senior', estado: 'operando para vos · 24/7' },
    { rol: 'Brand Strategist', estado: 'operando para vos · 24/7' },
    { rol: 'Director Creativo', estado: 'operando para vos · 24/7' },
    { rol: 'Investigador de audiencias', estado: 'operando para vos · 24/7' },
    { rol: 'Director de Arte', estado: 'operando para vos · 24/7' },
    { rol: 'Copywriter Senior', estado: 'operando para vos · 24/7' },
    { rol: 'Productor / Editor de Video', estado: 'operando para vos · 24/7' },
  ],
  hitos: [],
  narrativa: 'Modo demo. Apenas conectes un backend real, este relato se llena con tus números.',
  credencial: `FeedIA · ${DEMO_BRAND.name} · Bronce · ${new Date().getFullYear()}`,
  generadoEn: HOY,
};

const DEMO_OPERATIONS = [
  {
    department: 'growth-strategy',
    label: 'Crecimiento & Estrategia',
    cooldownHours: 72,
    lastRunAt: null,
    nextEligibleAt: null,
  },
  {
    department: 'content-freshness',
    label: 'Frescura de Contenido',
    cooldownHours: 48,
    lastRunAt: null,
    nextEligibleAt: null,
  },
  {
    department: 'branding-refresh',
    label: 'Refresco de Branding',
    cooldownHours: 336,
    lastRunAt: null,
    nextEligibleAt: null,
  },
];

const DEMO_CU_MODE = {
  mode: 'off',
  state: { mode: 'off', changedAt: HOY, changedBy: 'demo', reason: 'modo demo' },
  stats: { totalChanges: 0, lastReason: 'modo demo' },
};

// Helper: carousel slide SVG (4:5 = 400×500)
const _slideSvg = (role, n, total, title) => {
  const c =
    {
      gancho: '#e1306c',
      desarrollo: '#6366f1',
      climax: '#a855f7',
      cta: '#10b981',
      tension: '#f59e0b',
      resolucion: '#22d3ee',
    }[role] || '#6366f1';
  const safe = (title || role || '').slice(0, 36).replace(/[<>&"]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"><rect width="400" height="500" fill="#0d0d12"/><rect width="400" height="5" fill="${c}"/><circle cx="200" cy="195" r="62" fill="${c}" fill-opacity="0.14"/><text x="200" y="210" text-anchor="middle" font-family="system-ui,sans-serif" font-size="44" font-weight="800" fill="${c}">${n}</text><text x="200" y="278" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="${c}">${role.toUpperCase()}</text><text x="200" y="330" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" fill="#fff" opacity="0.8">${safe}</text><rect y="462" width="400" height="38" fill="${c}" opacity="0.8"/><text x="200" y="487" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="#fff">slide ${n}/${total}</text></svg>`;
  return { dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` };
};

// Helper: stories frame SVG (9:16 = 270×480)
const _frameSvg = (tipo, n, total, text) => {
  const c =
    {
      gancho: '#e1306c',
      desarrollo: '#6366f1',
      cta: '#10b981',
      educacion: '#a855f7',
      reveal: '#22d3ee',
      comunidad: '#f59e0b',
    }[tipo] || '#a855f7';
  const safe = (text || tipo || '').slice(0, 32).replace(/[<>&"]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="270" height="480"><rect width="270" height="480" fill="#0d0d12"/><rect width="270" height="4" fill="${c}"/><circle cx="135" cy="175" r="52" fill="${c}" fill-opacity="0.14"/><text x="135" y="187" text-anchor="middle" font-family="system-ui,sans-serif" font-size="34" font-weight="800" fill="${c}">${n}</text><text x="135" y="253" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="${c}">${tipo.toUpperCase()}</text><text x="135" y="305" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="#fff" opacity="0.7">${safe}</text><rect y="442" width="270" height="38" fill="${c}" opacity="0.8"/><text x="135" y="466" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="#fff">frame ${n}/${total}</text></svg>`;
  return { dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` };
};

const _CARRUSEL_SLIDES = [
  {
    numero: 1,
    titulo: 'Generá carruseles reales',
    cuerpo: 'Conectá un backend o configurá una API key en Ajustes → Integraciones IA',
    rolEnNarrativa: 'gancho',
    direccionVisual: 'fondo oscuro, título impactante',
  },
  {
    numero: 2,
    titulo: 'IA especialista en contenido',
    cuerpo: 'El agente escribe slides con narrativa, ganchos y voz de tu marca',
    rolEnNarrativa: 'desarrollo',
    direccionVisual: 'paleta de marca sobre canvas',
  },
  {
    numero: 3,
    titulo: 'Preview real en mockup',
    cuerpo: 'Visualizás cada slide en un teléfono 9:16 / 4:5 antes de publicar',
    rolEnNarrativa: 'climax',
    direccionVisual: 'mockup con teléfono y pantalla',
  },
  {
    numero: 4,
    titulo: '¿Listo para empezar?',
    cuerpo: 'Escribí tu idea arriba y tocá "Generar" — en segundos tenés el carrusel',
    rolEnNarrativa: 'cta',
    direccionVisual: 'logo FeedIA + call to action',
  },
];

const DEMO_CARRUSEL = {
  carrusel: {
    slides: _CARRUSEL_SLIDES,
    caption:
      'Generá carruseles que venden con FeedIA · IA especialista en contenido 🧠\n\nHook + narrativa + voz de marca, todo en segundos.\n\nGuardá esto para cuando lo necesités 👇\n\n#feedia #ia #instagram #contenido #marketing',
    hashtags: ['#feedia', '#ia', '#instagram', '#contenido', '#marketing'],
    cta: 'Escribí tu idea y generá →',
    formatoOptimo: '4:5',
    notasDiseno: 'Demo: paleta y tipografía de la marca, sin imágenes externas.',
  },
  previews: _CARRUSEL_SLIDES.map((s) => _slideSvg(s.rolEnNarrativa, s.numero, _CARRUSEL_SLIDES.length, s.titulo)),
};

// ── Demo Stories ─────────────────────────────────────────────────────────────
const _STORIES_FRAMES = [
  {
    numero: 1,
    tipo: 'gancho',
    textoPrincipal: '¿Sabías esto?',
    textoSecundario: 'Lo que nadie te cuenta sobre crecer en redes en 2025',
    sticker: 'Encuesta: ¿Ya lo sabías?',
    cta: null,
    fondoSugerido: 'Degradado oscuro con texto blanco impactante',
  },
  {
    numero: 2,
    tipo: 'educacion',
    textoPrincipal: 'El algoritmo premia esto',
    textoSecundario: 'Saves + shares > likes. Creá contenido que se guarda',
    sticker: null,
    cta: null,
    fondoSugerido: 'Fondo de marca con ícono de guardado animado',
  },
  {
    numero: 3,
    tipo: 'desarrollo',
    textoPrincipal: 'La fórmula de los creadores',
    textoSecundario: 'Hook → Valor → CTA. 3 pasos para stories que convierten',
    sticker: 'Deslizá →',
    cta: null,
    fondoSugerido: 'Esquema visual de 3 pasos con iconos',
  },
  {
    numero: 4,
    tipo: 'reveal',
    textoPrincipal: 'Te mostramos cómo',
    textoSecundario: 'FeedIA genera tu secuencia completa con IA especialista',
    sticker: null,
    cta: null,
    fondoSugerido: 'Captura animada de la app FeedIA',
  },
  {
    numero: 5,
    tipo: 'cta',
    textoPrincipal: 'Probalo gratis ahora',
    textoSecundario: 'Escribí tu mensaje arriba y generá tu secuencia de stories',
    sticker: '👆 Swipe up',
    cta: 'feedia.vercel.app',
    fondoSugerido: 'Fondo vibrante con logo + URL',
  },
];

const DEMO_STORIES = {
  stories: {
    frames: _STORIES_FRAMES,
    estrategia:
      'Hook de curiosidad → dato de valor → fórmula accionable → reveal del producto → CTA. Máximo 5 stories para mantener el completion rate alto.',
    linkEnBio: 'feedia.vercel.app',
    horarioSugerido: 'Lunes–viernes 18-21hs (pico de actividad Argentina)',
  },
  previews: _STORIES_FRAMES.map((f) => _frameSvg(f.tipo, f.numero, _STORIES_FRAMES.length, f.textoPrincipal)),
};

const DEMO_CANVA_USERS = { users: [] };

// ── Kanban / Tablero de contenido ────────────────────────────────────────────
// Formato esperado por workspace.js: col.title, card.title, card.meta
const DEMO_KANBAN = {
  columns: [
    {
      id: 'ideas',
      title: '💡 Ideas',
      cards: [
        { id: 'k1', title: 'Carrusel: 5 errores al hacer contenido', meta: 'Nova · educativo · alta prioridad' },
        { id: 'k2', title: 'Reel: Tendencia audio semana', meta: 'Luca · trending · media prioridad' },
        { id: 'k3', title: 'Post: Meme del nicho', meta: 'Nova · humor · baja prioridad' },
      ],
    },
    {
      id: 'in-progress',
      title: '⚙️ En progreso',
      cards: [
        { id: 'k4', title: 'Carrusel: Guía completa de algoritmo', meta: 'Luca · educativo · 65% listo' },
        { id: 'k5', title: 'Story: Encuesta de la semana', meta: 'Lía · engagement · 30% listo' },
      ],
    },
    {
      id: 'review',
      title: '🔍 En revisión',
      cards: [
        {
          id: 'k6',
          title: 'Reel: Transformación de marca (antes/después)',
          meta: 'Gard · validación compliance pendiente',
        },
      ],
    },
    {
      id: 'scheduled',
      title: '📅 Programado',
      cards: [{ id: 'k7', title: 'Post: Frase motivacional lunes', meta: 'Nova · ritual semanal · mañana 9hs' }],
    },
    {
      id: 'published',
      title: '✅ Publicado',
      cards: [
        {
          id: 'k8',
          title: 'Carrusel: Herramientas gratuitas para creators',
          meta: 'Luca · publicado ayer · datos demo',
        },
      ],
    },
  ],
  totalCards: 8,
  updatedAt: HOY,
  demoMode: true,
};

// ── Approvals / Aprobaciones pendientes ──────────────────────────────────────
// Formato esperado por workspace.js: { count, items: [{ kind, title, detail, createdAt, actionableId }] }
const DEMO_APPROVALS = {
  count: 3,
  items: [
    {
      kind: 'canva',
      title: 'Carrusel: Guía de algoritmo — diseño listo',
      detail: 'Nova generó el copy · Luca armó 6 slides en Canva · Gard validó compliance. Falta tu OK para publicar.',
      createdAt: HOY,
      actionableId: 'ap1',
    },
    {
      kind: 'publish',
      title: 'Publicar reel de tendencia de audio',
      detail: 'Computer Use listo para subir el reel. Lía revisó timing (martes 19hs). Nova escribió el caption.',
      createdAt: HOY,
      actionableId: 'ap2',
    },
    {
      kind: 'dm',
      title: 'Respuesta a 3 DMs de leads calificados',
      detail: 'Score promedio: 82/100. Scripts de respuesta listos. Tasa de cierre estimada: 40%.',
      createdAt: HOY,
      actionableId: 'ap3',
    },
  ],
  demoMode: true,
};

// ── Canva Brain Demo ─────────────────────────────────────────────────────────
const DEMO_CANVA_BRAIN_AGENTS = [
  {
    id: 'brand-strategist',
    name: 'Valeria',
    emoji: '🎯',
    role: 'Estratega de Marca',
    specialty: 'Brief creativo, posicionamiento visual, coherencia de identidad',
  },
  {
    id: 'art-director',
    name: 'Marcos',
    emoji: '🖼️',
    role: 'Director de Arte',
    specialty: 'Composición, jerarquía visual, dirección estética, layout de slides',
  },
  {
    id: 'copywriter',
    name: 'Nova',
    emoji: '✍️',
    role: 'Copywriter Publicitario',
    specialty: 'Headlines, CTAs, copy de alta conversión, voz de marca',
  },
  {
    id: 'graphic-designer',
    name: 'Luca',
    emoji: '🎨',
    role: 'Diseñador Gráfico',
    specialty: 'Operador de Canva vía Computer Use, paleta, tipografía, export',
  },
  {
    id: 'social-specialist',
    name: 'Dani',
    emoji: '📱',
    role: 'Especialista Social Media',
    specialty: 'Formatos Instagram, ratio óptimo, hashtags, timing',
  },
  {
    id: 'publicist',
    name: 'Carmen',
    emoji: '📢',
    role: 'Publicista / Comunicadora',
    specialty: 'Validación de mensaje, coherencia de marca, compliance',
  },
  {
    id: 'visual-artist',
    name: 'Ariel',
    emoji: '🎭',
    role: 'Artista Visual / QA Estético',
    specialty: 'Revisión final estética, equilibrio, contrastes, calidad exportación',
  },
];

const DEMO_CANVA_BRAIN_JOB = {
  ok: true,
  jobId: 'demo-brain-001',
  mode: 'supervisor',
  agents: DEMO_CANVA_BRAIN_AGENTS,
  steps: [
    {
      agentId: 'brand-strategist',
      agentName: 'Valeria',
      emoji: '🎯',
      phase: 'Brief creativo',
      thinking: 'Analizando identidad de marca, nicho y audiencia objetivo...',
      output:
        'Brief: Contenido educativo, tono directo sin clickbait, paleta oscura con acento neón, audiencia creators 25-40.',
      durationMs: 1200,
    },
    {
      agentId: 'copywriter',
      agentName: 'Nova',
      emoji: '✍️',
      phase: 'Generación de copy',
      thinking: 'Escribiendo headline de impacto, body copy y CTA alineado con la voz de marca...',
      output: 'Headline: "5 errores que matan tu alcance". CTA: "Guardá esto antes de publicar."',
      durationMs: 980,
    },
    {
      agentId: 'art-director',
      agentName: 'Marcos',
      emoji: '🖼️',
      phase: 'Plan visual',
      thinking: 'Diseñando layout de 6 slides, jerarquía tipográfica y uso de color marca...',
      output: 'Layout: portada impactante + 4 slides de contenido + CTA final. Fondo #0A0A0A, acento #E1306C.',
      durationMs: 1450,
    },
    {
      agentId: 'publicist',
      agentName: 'Carmen',
      emoji: '📢',
      phase: 'Validación de mensaje',
      thinking: 'Revisando coherencia del mensaje con los valores y voz prohibida de la marca...',
      output: '✅ Mensaje validado. Sin palabras prohibidas. Tono correcto. Listo para diseño.',
      durationMs: 680,
    },
    {
      agentId: 'social-specialist',
      agentName: 'Dani',
      emoji: '📱',
      phase: 'Optimización Instagram',
      thinking: 'Adaptando formato, hashtags y timing para máximo alcance...',
      output: 'Formato 4:5 óptimo para feed. 8 hashtags de nicho. Mejor horario: martes 19hs.',
      durationMs: 720,
    },
    {
      agentId: 'graphic-designer',
      agentName: 'Luca',
      emoji: '🎨',
      phase: 'Diseño en Canva (pendiente aprobación)',
      thinking: 'Plan listo. En modo supervisor — esperando tu OK para abrir Canva y ejecutar.',
      output: 'PENDIENTE: Aprobá el brief y plan visual para que Luca abra Canva y diseñe los 6 slides.',
      durationMs: 0,
    },
  ],
  brief:
    'Carrusel educativo sobre los 5 errores que matan el alcance en Instagram. Tono directo, sin clickbait. Paleta oscura con acento rosa neón. 6 slides. Audiencia: creators 25-40.',
  copywriting: {
    headline: '5 errores que matan tu alcance (y cómo evitarlos)',
    subheadline: 'El algoritmo penaliza estas cosas y nadie te lo dice',
    bodyCopy: [
      'Error 1: Publicar sin horario estratégico',
      'Error 2: Ignorar las primeras 30 minutos post-publicación',
      'Error 3: Caption sin hook en la primera línea',
      'Error 4: Hashtags genéricos sin investigación',
      'Error 5: No responder comentarios en la primera hora',
    ],
    cta: 'Guardá esto antes de tu próxima publicación 👇',
    hashtags: [
      '#instagram',
      '#algoritmo',
      '#creatorsdecontenido',
      '#marketingdigital',
      '#redesvsociales',
      '#instagramtips',
      '#creators',
      '#crecimientoeninstagram',
    ],
    caption:
      '5 errores que matan tu alcance (y nadie te dice cuáles son) 🧵\n\nEl algoritmo de Instagram no es magia — tiene reglas. Y si las ignorás, tu contenido se hunde aunque sea buenísimo.\n\nGuardá este carrusel para releerlo antes de publicar.\n\n¿Cuál de estos errores estás cometiendo? Comentá abajo 👇',
  },
  visualPlan: {
    layout: '6 slides: portada con hook + slides 2-6 con un error por slide + CTA en slide final',
    colorUsage: 'Fondo #0A0A0A en todos los slides. Texto principal #F5F5F5. Acento #E1306C para números y énfasis.',
    typography: 'Inter Bold para headlines. Inter Regular para body. JetBrains Mono para datos/estadísticas.',
    mood: 'Profesional con calidez. Alto contraste. Acento neón. Sin elementos decorativos innecesarios.',
    composition:
      'Texto centrado. Número de error grande a la izquierda. Descripción a la derecha. Logo pequeño en esquina.',
    templateHint: 'Buscar en Canva: "dark minimal instagram carousel" o "instagram education dark template"',
  },
  approvalRequired: true,
  approvalReason:
    'Modo supervisor: revisá el brief, copy y plan visual. Si aprobás, Luca abre Canva y diseña los slides.',
  totalDurationMs: 5030,
};

// ── Brand Profiles (multi-tenant) ────────────────────────────────────────────
const DEMO_BRAND_PROFILES = {
  profiles: [
    { name: 'Marca Demo', niche: 'Productividad para creators', file: 'marca-demo.json', active: true },
    {
      name: 'Studio Creativo (ejemplo)',
      niche: 'Estudio de diseño boutique',
      file: 'studio-creativo.json',
      active: false,
    },
    { name: 'Marca Personal (ejemplo)', niche: 'Coach de emprendedores', file: 'marca-personal.json', active: false },
  ],
  active: 'Marca Demo',
  activeFile: 'marca-demo.json',
  note: 'Multi-cuenta en caliente: cambio sin reiniciar. Demo: cambios no persisten.',
};

const DEMO_CLIENT_VIEW = {
  brand: DEMO_BRAND.name,
  niche: DEMO_BRAND.niche,
  estado: 'saludable',
  contenidoActivo: 5,
  piezasPublicadas: 1,
  enRevision: 1,
  pendientesDeTuOk: 3,
  generatedAt: HOY,
};

// ── Branding Brain (8 especialistas IA) ──────────────────────────────────────
const DEMO_BRANDING_BRAIN_AGENTS = [
  {
    id: 'brand-strategist-senior',
    name: 'Lorenzo Vidal',
    emoji: '🏛️',
    role: 'Estratega de Marca Senior',
    specialty: 'Visión, misión, valores, posicionamiento competitivo',
  },
  {
    id: 'audience-researcher',
    name: 'Renata Ibáñez',
    emoji: '🔬',
    role: 'Investigador de Audiencia',
    specialty: 'Avatar del cliente, jobs-to-be-done, dolores, deseos',
  },
  {
    id: 'naming-voice',
    name: 'Tomás Quiroga',
    emoji: '📣',
    role: 'Naming & Voz de Marca',
    specialty: 'Tono, vocabulario, palabras prohibidas, naming',
  },
  {
    id: 'visual-identity',
    name: 'Aurora Blanchet',
    emoji: '🎨',
    role: 'Identidad Visual',
    specialty: 'Paleta, tipografía, mood visual, iconografía',
  },
  {
    id: 'narrative-architect',
    name: 'Joaquín Bressan',
    emoji: '📖',
    role: 'Arquitecto de Narrativa',
    specialty: 'Historia de marca, arcos narrativos, mensajes clave',
  },
  {
    id: 'differential-strategist',
    name: 'Mariela Costa',
    emoji: '⚡',
    role: 'Estratega Diferencial',
    specialty: 'Anti-genérico, takes contrarios, innovación, ángulos únicos',
  },
  {
    id: 'influencer-positioner',
    name: 'Bautista Roldán',
    emoji: '🌟',
    role: 'Posicionador Influencer',
    specialty: 'Autoridad de nicho, pillars, tácticas de visibilidad',
  },
  {
    id: 'coherence-guardian',
    name: 'Helena Saavedra',
    emoji: '🛡️',
    role: 'Guardian de Coherencia',
    specialty: 'Validación de identidad, consistencia, compliance',
  },
];

const DEMO_BRANDING_BRAIN_JOB = {
  ok: true,
  jobId: 'demo-branding-001',
  mode: 'refinement',
  agents: DEMO_BRANDING_BRAIN_AGENTS,
  steps: [
    {
      agentId: 'brand-strategist-senior',
      agentName: 'Lorenzo Vidal',
      emoji: '🏛️',
      phase: 'Estrategia central',
      thinking: 'Analizando visión, misión, valores y posicionamiento competitivo...',
      output:
        'Visión: ser referente en productividad para creators independientes. Posicionamiento: el sistema que reemplaza tu agencia.',
      durationMs: 1450,
    },
    {
      agentId: 'audience-researcher',
      agentName: 'Renata Ibáñez',
      emoji: '🔬',
      phase: 'Avatar de audiencia',
      thinking: 'Mapeando jobs-to-be-done, dolores y deseos aspiracionales...',
      output:
        'Avatar: creator 25-40, hace todo solo, quiere escalar sin contratar equipo. Dolor: ahogarse en tareas. Deseo: sistema autónomo.',
      durationMs: 1280,
    },
    {
      agentId: 'naming-voice',
      agentName: 'Tomás Quiroga',
      emoji: '📣',
      phase: 'Voz de marca',
      thinking: 'Refinando tono, vocabulario y bloqueando palabras genéricas...',
      output: 'Tono: cercano, directo, sin clickbait. Prohibidas: gurú, literalmente, increíble, game-changer.',
      durationMs: 980,
    },
    {
      agentId: 'visual-identity',
      agentName: 'Aurora Blanchet',
      emoji: '🎨',
      phase: 'Identidad visual',
      thinking: 'Validando paleta, tipografía y mood...',
      output:
        'Paleta confirmada: negro #0A0A0A + neón #E1306C. Inter Bold + JetBrains Mono. Mood: profesional con calidez, alto contraste.',
      durationMs: 1100,
    },
    {
      agentId: 'narrative-architect',
      agentName: 'Joaquín Bressan',
      emoji: '📖',
      phase: 'Narrativa de marca',
      thinking: 'Construyendo origin story y mensajes clave...',
      output:
        'Origin: nació para que el creador independiente no se ahogue. Mensaje clave: "Tu agencia, en IA — operando 24/7".',
      durationMs: 1320,
    },
    {
      agentId: 'differential-strategist',
      agentName: 'Mariela Costa',
      emoji: '⚡',
      phase: 'Anti-genérico',
      thinking: 'Buscando ángulos contrarios y oportunidades de innovación...',
      output:
        'Take contrario: "No publiques todos los días". Innovación: mostrar el sistema operando en vivo. Anti-genérico: 0 contenido motivacional vacío.',
      durationMs: 1180,
    },
    {
      agentId: 'influencer-positioner',
      agentName: 'Bautista Roldán',
      emoji: '🌟',
      phase: 'Plan de influencer',
      thinking: 'Diseñando pilares de autoridad y tácticas de visibilidad...',
      output:
        'Pillars: 1) sistema autónomo, 2) casos reales, 3) deconstrucción del algoritmo. Tácticas: lives quincenales + carruseles deep.',
      durationMs: 1240,
    },
    {
      agentId: 'coherence-guardian',
      agentName: 'Helena Saavedra',
      emoji: '🛡️',
      phase: 'Auditoría de coherencia',
      thinking: 'Validando consistencia entre todos los outputs anteriores...',
      output:
        '✅ Coherencia 94/100. Conflicto menor: el tono "directo" puede chocar con "calidez" — recomiendo balance 60/40.',
      durationMs: 720,
    },
  ],
  brandStrategy: {
    vision: 'Ser el sistema autónomo de referencia para creators independientes en LATAM',
    mission: 'Reemplazar la agencia tradicional con IA + Computer Use, 24/7',
    values: ['autonomía', 'transparencia', 'sin clickbait', 'resultados verificables'],
    positioning: 'No somos una herramienta — somos tu equipo entero de marketing operando solo',
    differentiator: 'El único sistema que opera Instagram + Canva + DMs sin intervención humana',
  },
  audienceAvatar: {
    description:
      'Creator independiente 25-40, factura USD 3-30k/mes, hace todo solo, quiere escalar sin contratar equipo',
    jobsToBeDone: [
      'publicar contenido consistente sin agotarse',
      'responder DMs/comments sin perder leads',
      'mantener identidad de marca sin diseñador',
    ],
    pains: [
      'ahogarse en tareas operativas',
      'contenido inconsistente cuando se va de viaje',
      'no poder permitirse equipo',
    ],
    desires: ['libertad de tiempo', 'crecer mientras duerme', 'sentirse profesional sin parecer agencia'],
    aspirationalIdentity: 'El creator que tiene un sistema y se ve como una marca-empresa',
  },
  voice: {
    tone: ['cercano', 'directo', 'sin clickbait', 'profesional con calidez'],
    vocabulary: ['sistema', 'autónomo', 'operar', 'resultado', 'caso real', 'apalancamiento'],
    forbidden: ['gurú', 'literalmente', 'increíble', 'game-changer', 'rompedor', 'disruptivo'],
    sampleHooks: [
      'No publiques todos los días.',
      'Tu agencia te cobra USD 4k al mes. Esto cuesta cero.',
      'El algoritmo no es magia — tiene reglas.',
    ],
  },
  visualIdentity: {
    palette: ['#0A0A0A', '#F5F5F5', '#E1306C', '#A855F7', '#22D3EE'],
    typography: ['Inter Bold', 'Inter Regular', 'JetBrains Mono'],
    mood: 'profesional con calidez · alto contraste · acento neón · sin ornamento',
    iconography: 'minimalista · líneas finas · sin clipart',
    sampleCompositions: [
      'Texto grande centrado sobre fondo negro',
      'Datos en columnas con números rosa neón',
      'Carrusel: número grande izquierda + idea derecha',
    ],
  },
  narrative: {
    originStory:
      'Nació porque el creador independiente no debería ahogarse en tareas. Lo construimos para nosotros y se volvió referente.',
    coreMessages: [
      'Tu agencia en IA · operando 24/7',
      'No vendemos productividad — vendemos libertad',
      'El sistema opera, vos creás',
    ],
    brandArcs: [
      'Del caos operativo a la libertad',
      'De freelancer a marca-empresa',
      'De publicar todos los días a publicar lo que importa',
    ],
  },
  differentialAngles: {
    contraTakes: [
      'No publiques todos los días',
      'El engagement bajo a veces es bueno',
      'Los hashtags genéricos te están hundiendo',
      'Tu bio dice lo que no debería decir',
    ],
    uniqueAngles: [
      'Mostramos el sistema operando en vivo',
      'Publicamos casos con números reales — no testimonios vagos',
      'Deconstruimos un caso por semana',
    ],
    innovationOpportunities: [
      'Lives quincenales mostrando el sistema operando',
      'Pizarra colaborativa con la audiencia',
      'Carruseles "deconstruido" sobre piezas virales del nicho',
    ],
  },
  influencerPlan: {
    authorityPillars: ['Sistema autónomo (cómo funciona)', 'Casos reales con números', 'Deconstrucción del algoritmo'],
    signaturePieces: ['Carrusel "Sistema operando"', 'Reel "Día sin tocar el teléfono"', 'Live "Construyamos juntos"'],
    visibilityTactics: [
      'Colaboraciones con 2 creators de nicho/mes',
      'Citado por otros creators en sus deep-dives',
      'Newsletter semanal de "qué hizo el sistema esta semana"',
    ],
    thoughtLeadershipTopics: [
      'Algoritmo de Instagram en 2026',
      'Computer Use para creators',
      'Apalancamiento real con IA',
    ],
  },
  coherenceReport: {
    score: 94,
    conflicts: ['Tono "directo" vs "calidez": balancear 60/40'],
    recommendations: [
      'Reforzar el "anti-genérico" en toda pieza nueva',
      'Eliminar 2 palabras del vocabulario que ya no aplican',
      'Re-validar paleta cada trimestre contra tendencias del nicho',
    ],
  },
  totalDurationMs: 9270,
};

// ── Master Brain (orquestador) ───────────────────────────────────────────────
const DEMO_MASTER_BRAIN_BRAINS = [
  {
    id: 'canva-brain',
    label: 'Canva Brain',
    emoji: '🎨',
    description: '7 agentes diseñan en Canva via Computer Use',
    isAvailable: true,
  },
  {
    id: 'branding-brain',
    label: 'Branding Brain',
    emoji: '🏛️',
    description: '8 agentes construyen y evolucionan la marca',
    isAvailable: true,
  },
  {
    id: 'agents-general',
    label: 'Agentes Generales (10)',
    emoji: '🤖',
    description: 'Algorithm, Viral, Sales, Community, Trends, Storyteller, Growth, Strategist, Humor, Meta Ads',
    isAvailable: true,
  },
  {
    id: 'planner',
    label: 'Planner Computer Use',
    emoji: '🧭',
    description: 'Plans deterministas de operación en Instagram',
    isAvailable: true,
  },
  {
    id: 'controller',
    label: 'Controller (CU real)',
    emoji: '🖱️',
    description: 'Ejecuta acciones reales con cursor y teclado (DRY_RUN en demo)',
    isAvailable: false,
  },
];

const DEMO_MASTER_BRAIN_JOB = {
  ok: true,
  jobId: 'demo-master-001',
  intent: 'create-content',
  mode: 'supervisor',
  brainsActivated: [
    'branding-brain',
    'agents-general:viral',
    'agents-general:algorithm',
    'agents-general:strategist',
    'canva-brain',
  ],
  steps: [
    {
      brainId: 'branding-brain',
      brainLabel: 'Branding Brain · Coherencia',
      emoji: '🛡️',
      phase: 'Validación de marca',
      thinking: 'Verificando que el pedido respete identidad...',
      output: '✅ Pedido coherente con la marca. Activando equipo creativo.',
      durationMs: 480,
      contributesTo: 'brand-validation',
    },
    {
      brainId: 'agents-general:viral',
      brainLabel: 'Viral Architect',
      emoji: '🚀',
      phase: 'Fórmula viral',
      thinking: 'Combinando hook + emoción + take contrario...',
      output: 'Fórmula: hook contrarian + dato sorprendente + CTA de guardado.',
      durationMs: 920,
      contributesTo: 'content-structure',
    },
    {
      brainId: 'agents-general:algorithm',
      brainLabel: 'Algorithm Master',
      emoji: '🧠',
      phase: 'Optimización algoritmo',
      thinking: 'Timing, formato, primeras 30 min...',
      output: 'Formato carrusel 4:5. Timing: martes 19hs. Pin del primer comentario.',
      durationMs: 760,
      contributesTo: 'distribution-strategy',
    },
    {
      brainId: 'agents-general:strategist',
      brainLabel: 'Content Strategist',
      emoji: '🎯',
      phase: 'Estructura editorial',
      thinking: 'Pilar de contenido y mix de formatos...',
      output: 'Pilar: deconstrucción del algoritmo. Encaja en serie semanal.',
      durationMs: 680,
      contributesTo: 'editorial-fit',
    },
    {
      brainId: 'canva-brain',
      brainLabel: 'Canva Brain',
      emoji: '🎨',
      phase: 'Diseño en Canva',
      thinking: '7 agentes Canva listos. Esperando aprobación...',
      output: 'PENDIENTE: aprobá para que Lucas Herrera abra Canva y diseñe los 6 slides.',
      durationMs: 0,
      contributesTo: 'design-deliverable',
    },
  ],
  finalOutput: {
    summary:
      'Carrusel viral sobre algoritmo de Instagram. 6 slides. Estilo deconstrucción. Listo para diseñar en Canva (modo supervisor: pendiente tu OK).',
    deliverables: [
      { kind: 'copy', label: 'Caption + slides', payload: { headline: '5 errores que matan tu alcance', slides: 6 } },
      {
        kind: 'visual-plan',
        label: 'Plan visual del carrusel',
        payload: { template: 'dark minimal', palette: ['#0A0A0A', '#E1306C'] },
      },
      {
        kind: 'distribution',
        label: 'Plan de distribución',
        payload: { timing: 'martes 19hs', pinFirstComment: true },
      },
      { kind: 'canva-job', label: 'Job de Canva (pendiente aprobación)', payload: { jobId: 'demo-brain-001' } },
    ],
    nextActions: [
      { label: 'Aprobar y abrir Canva', apiCall: 'POST /api/cu/canva/brain/demo-brain-001/approve' },
      { label: 'Ver el plan visual', route: 'studio-carousel' },
      { label: 'Editar el copy antes de diseñar', route: 'studio-carousel' },
    ],
  },
  recommendations: [
    {
      id: 'r1',
      type: 'innovation',
      title: 'Mostrá el sistema operando',
      rationale: 'Tu marca tiene una ventaja única: Computer Use real. Mostralo en el carrusel siguiente.',
      priority: 'high',
      appliesTo: 'next-content',
    },
    {
      id: 'r2',
      type: 'improvement',
      title: 'Pin del primer comentario con stats',
      rationale: 'En piezas educativas el pinned comment con datos aumenta saves 30%.',
      priority: 'medium',
      appliesTo: 'distribution',
    },
    {
      id: 'r3',
      type: 'opportunity',
      title: 'Convertir este carrusel en un live',
      rationale: 'Tu plan influencer pide lives quincenales. Este tema es ideal.',
      priority: 'medium',
      appliesTo: 'positioning',
    },
    {
      id: 'r4',
      type: 'warning',
      title: 'Evitá usar "increíble" en el caption',
      rationale: 'Está en tu lista de palabras prohibidas. Tomás Quiroga ya marcó alternativa.',
      priority: 'low',
      appliesTo: 'caption',
    },
  ],
  innovationScore: 78,
  influencerScore: 82,
  brandCoherenceScore: 94,
  totalDurationMs: 2840,
  approvalRequired: true,
};

// ── Demo Reel (TikTok Video Studio) ─────────────────────────────────────────
const _rBeatSvg = (type, n, txt) => {
  const c =
    { hook: '#e1306c', desarrollo: '#7928ca', climax: '#a855f7', cta: '#10b981', transicion: '#3b82f6' }[type] ||
    '#6366f1';
  const safe = (txt || type || '').slice(0, 30).replace(/[<>&"]/g, '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="270" height="480"><rect width="270" height="480" fill="#0d0d12"/><circle cx="135" cy="175" r="52" fill="${c}" fill-opacity="0.15"/><text x="135" y="185" text-anchor="middle" font-family="system-ui,sans-serif" font-size="34" font-weight="800" fill="${c}">${n}</text><text x="135" y="255" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="${c}">${type.toUpperCase()}</text><text x="135" y="305" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="#fff" opacity="0.7">${safe}</text><rect y="442" width="270" height="38" fill="${c}" opacity="0.8"/><text x="135" y="466" text-anchor="middle" font-family="system-ui,sans-serif" font-size="11" fill="#fff">DEMO MODE</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

const _REEL_BEATS = [
  {
    numero: 1,
    tipo: 'hook',
    duracionSegundos: 3,
    vozEnOff: 'Lo que nadie te dice / sobre hacer contenido que vende',
    textoEnPantalla: '¿Por qué tu contenido no vende?',
    bRoll: 'Creador mirando estadísticas bajas en pantalla',
    transicion: 'corte seco',
  },
  {
    numero: 2,
    tipo: 'desarrollo',
    duracionSegundos: 6,
    vozEnOff: 'La mayoría se enfoca en la estética / pero el algoritmo valora el contexto.',
    textoEnPantalla: 'Error #1: estética sin contexto',
    bRoll: 'Feed perfecto con bajo alcance',
    transicion: 'zoom in',
  },
  {
    numero: 3,
    tipo: 'desarrollo',
    duracionSegundos: 6,
    vozEnOff: 'Segundo error: publicar sin hora estratégica. / El algoritmo favorece los picos.',
    textoEnPantalla: 'Error #2: hora equivocada',
    bRoll: 'Reloj marcando hora pico',
    transicion: 'slide horizontal',
  },
  {
    numero: 4,
    tipo: 'climax',
    duracionSegundos: 8,
    vozEnOff: 'El tercer error es el más costoso: / sin hook en los primeros 2 segundos.',
    textoEnPantalla: '2 segundos = 70% de tu alcance',
    bRoll: 'Gráfico de drop-off de visualización',
    transicion: 'zoom out dramático',
  },
  {
    numero: 5,
    tipo: 'cta',
    duracionSegundos: 5,
    vozEnOff: 'FeedIA analiza tu perfil y te dice exactamente qué mejorar. / Gratis.',
    textoEnPantalla: 'FeedIA lo analiza por vos 🤖',
    bRoll: 'Pantalla de FeedIA mostrando análisis',
    transicion: 'fade',
  },
];

const DEMO_REEL = {
  reel: {
    hook: 'Lo que nadie te dice sobre hacer contenido que vende',
    caption:
      'Lo que nadie te dice sobre hacer contenido que vende 🤯\n\n¿Sabés por qué la mayoría falla?\n\nAcá los 3 errores que destruyen tu alcance antes de publicar.\n\nGuardá esto 👇\n\n#feedia #ia #contenido #tiktok #marketing',
    hashtags: ['#feedia', '#ia', '#contenido', '#tiktok', '#marketing', '#creadores', '#algoritmo'],
    audioSugerido: 'Instrumental motivacional trending — BPM 120-140',
    estrategiaRetencion: 'Hook de pregunta retórica → promesa concreta → loop visual al final',
    beats: _REEL_BEATS,
  },
  previews: _REEL_BEATS.map((b) => ({
    dataUrl: _rBeatSvg(b.tipo, b.numero, b.textoEnPantalla),
    beat: b.numero,
    tipo: b.tipo,
  })),
};

export {
  DEMO_BRAND,
  DEMO_IDENTITY,
  DEMO_DASHBOARD,
  DEMO_KPIS,
  DEMO_ACTIVITY,
  DEMO_INTELLIGENCE,
  DEMO_AUTOPILOT,
  DEMO_AI_STATUS,
  DEMO_WELCOME,
  DEMO_BRIEF,
  DEMO_OPERATIONS,
  DEMO_CU_MODE,
  DEMO_CARRUSEL,
  DEMO_CANVA_USERS,
  DEMO_KANBAN,
  DEMO_APPROVALS,
  DEMO_CANVA_BRAIN_AGENTS,
  DEMO_CANVA_BRAIN_JOB,
  DEMO_BRAND_PROFILES,
  DEMO_CLIENT_VIEW,
  DEMO_BRANDING_BRAIN_AGENTS,
  DEMO_BRANDING_BRAIN_JOB,
  DEMO_MASTER_BRAIN_BRAINS,
  DEMO_MASTER_BRAIN_JOB,
  DEMO_REEL,
  DEMO_STORIES,
};
