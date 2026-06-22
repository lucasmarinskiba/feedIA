/**
 * Welcome Experience de FeedIA — el "unboxing" del sistema.
 *
 * Diseñado para que el usuario sienta la emoción de estrenar algo: auto nuevo,
 * casa nueva, celular en su caja. Cada paso del onboarding es ceremonial,
 * personal, con detalles que se quedan.
 *
 * Filosofía: el primer encuentro es 80% de la retención. Si los primeros 5
 * minutos enamoran, el usuario se queda meses.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { log } from '../../agent/logger.js';
import { askJson as routerAskJson, ask as routerAsk } from '../../agent/tokenRouter.js';
import type { BrandProfile } from '../../config/types.js';

const WELCOME_PATH = join(process.cwd(), 'data', 'experience', 'welcome.json');

// ── Tipos ─────────────────────────────────────────────────────────────────────

export type WelcomeStage =
  | 'box-opening' // momento ceremonial — primer click
  | 'first-impression' // "esto es tuyo"
  | 'name-the-system' // ¿cómo querés llamarme?
  | 'choose-mascot' // elegí tu compañero
  | 'pick-theme' // tu estilo visual
  | 'set-rituals' // ¿cuándo querés que te salude?
  | 'meet-team' // conocé a tu equipo
  | 'first-goal' // tu primer objetivo
  | 'first-win' // micro-win inmediato
  | 'home-tour' // recorrido por tu casa nueva
  | 'completed';

export interface WelcomeSession {
  id: string;
  userId: string; // identifier
  brandName: string;
  startedAt: string;
  completedAt?: string;
  currentStage: WelcomeStage;
  stagesCompleted: WelcomeStage[];
  choices: {
    systemName?: string; // "Talía" por default, el usuario puede renombrar
    mascot?:
      | 'talia-elegante'
      | 'talia-casual'
      | 'talia-tech'
      | 'gato-cosmonauta'
      | 'astronauta'
      | 'panda'
      | 'phoenix'
      | 'fox-roja';
    theme?: 'sunset' | 'ocean' | 'forest' | 'midnight' | 'rose-gold' | 'cyberpunk' | 'minimal-white' | 'aurora';
    accentColor?: string; // hex personalizado
    voiceTone?: 'amistosa' | 'profesional' | 'pícara' | 'mentora' | 'cómplice';
    morningGreetingTime?: string; // HH:MM
    eveningRecapTime?: string; // HH:MM
    enableCelebrations?: boolean;
    soundPack?: 'gentle' | 'energetic' | 'minimal' | 'retro-games';
    firstGoalDescription?: string;
  };
  personalStory: {
    why?: string; // por qué empezó Instagram
    biggestDream?: string; // el sueño máximo
    biggestFear?: string; // qué le preocupa
    favoriteAccountName?: string;
  };
  giftsUnlocked: string[]; // pequeños regalos: badges iniciales
  emotionalScoreAchieved?: number; // 0-10 — qué tan conectado se siente al final
  notes: string[];
}

interface WelcomeStore {
  version: number;
  sessions: WelcomeSession[];
  globalConfig: {
    maxConcurrentWelcomes: number;
    defaultMascot: WelcomeSession['choices']['mascot'];
    defaultTheme: WelcomeSession['choices']['theme'];
  };
  lastUpdated: string;
}

const DEFAULT_STORE: WelcomeStore = {
  version: 1,
  sessions: [],
  globalConfig: {
    maxConcurrentWelcomes: 5,
    defaultMascot: 'talia-elegante',
    defaultTheme: 'sunset',
  },
  lastUpdated: new Date().toISOString(),
};

// ── Persistencia ──────────────────────────────────────────────────────────────

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'experience');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadStore = (): WelcomeStore => {
  try {
    ensureDir();
    if (!existsSync(WELCOME_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(WELCOME_PATH, 'utf8')) as WelcomeStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveStore = (store: WelcomeStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(WELCOME_PATH, JSON.stringify(store, null, 2), 'utf8');
};

// ── Catálogos visuales ────────────────────────────────────────────────────────

export const MASCOT_CATALOG: Record<
  NonNullable<WelcomeSession['choices']['mascot']>,
  {
    name: string;
    description: string;
    personality: string[];
    bestFor: string;
    emoji: string;
    voiceMatch: WelcomeSession['choices']['voiceTone'];
  }
> = {
  'talia-elegante': {
    name: 'Talía Elegante',
    description: 'Profesional, sofisticada, voz cálida. Tu directora creativa de confianza.',
    personality: ['organizada', 'pensativa', 'empática'],
    bestFor: 'Marcas premium, lifestyle, autoridad',
    emoji: '💼',
    voiceMatch: 'profesional',
  },
  'talia-casual': {
    name: 'Talía Casual',
    description: 'Cercana, divertida, te trata como amiga. Tu mejor amiga creativa.',
    personality: ['relajada', 'humorística', 'directa'],
    bestFor: 'Marcas personales, creadores, edu-entretenimiento',
    emoji: '😎',
    voiceMatch: 'amistosa',
  },
  'talia-tech': {
    name: 'Talía Tech',
    description: 'Geek, precisa, ama los datos. Tu CTO personal.',
    personality: ['analítica', 'directa', 'curiosa'],
    bestFor: 'Tech, SaaS, productividad, educación técnica',
    emoji: '🤖',
    voiceMatch: 'profesional',
  },
  'gato-cosmonauta': {
    name: 'Gato Cosmonauta',
    description: 'Un gato que viaja por el espacio. Curioso, juguetón.',
    personality: ['curioso', 'aventurero', 'gracioso'],
    bestFor: 'Marcas jóvenes, creativas, lifestyle Z',
    emoji: '🐱‍🚀',
    voiceMatch: 'pícara',
  },
  astronauta: {
    name: 'Astronauta',
    description: 'Explorador del espacio digital. Visionario, valiente.',
    personality: ['visionario', 'osado', 'inspirador'],
    bestFor: 'Emprendedores, growth hackers, founders',
    emoji: '🧑‍🚀',
    voiceMatch: 'mentora',
  },
  panda: {
    name: 'Panda',
    description: 'Tranquilo, sabio, te abraza cuando es difícil.',
    personality: ['tranquilo', 'sabio', 'reconfortante'],
    bestFor: 'Wellness, mindfulness, salud mental',
    emoji: '🐼',
    voiceMatch: 'amistosa',
  },
  phoenix: {
    name: 'Fénix',
    description: 'Renace de las cenizas. Para los que vuelven más fuertes.',
    personality: ['resiliente', 'poderoso', 'transformador'],
    bestFor: 'Coaches, transformación, fitness, comeback stories',
    emoji: '🔥',
    voiceMatch: 'mentora',
  },
  'fox-roja': {
    name: 'Zorra Roja',
    description: 'Astuta, rápida, sabe leer entre líneas.',
    personality: ['astuta', 'estratega', 'ágil'],
    bestFor: 'Marketing, ventas, growth, sales',
    emoji: '🦊',
    voiceMatch: 'cómplice',
  },
};

export const THEME_CATALOG: Record<
  NonNullable<WelcomeSession['choices']['theme']>,
  {
    name: string;
    description: string;
    palette: string[];
    vibe: string;
    inspiredBy: string;
  }
> = {
  sunset: {
    name: 'Atardecer',
    description: 'Naranjas cálidos, rosas, dorados. La hora mágica.',
    palette: ['#FF6B6B', '#FFE66D', '#FF8E72', '#F38181', '#FFAA7F'],
    vibe: 'cálido, esperanzador, romántico',
    inspiredBy: 'Las 19:42 en Mendoza',
  },
  ocean: {
    name: 'Océano',
    description: 'Azules profundos y cyans. Calma con poder.',
    palette: ['#1E3A8A', '#3FB8C9', '#06B6D4', '#0EA5E9', '#67E8F9'],
    vibe: 'sereno, profundo, confiable',
    inspiredBy: 'El Pacífico al amanecer',
  },
  forest: {
    name: 'Bosque',
    description: 'Verdes, marrones, dorados. Vida orgánica.',
    palette: ['#166534', '#65A30D', '#84CC16', '#A3A380', '#D4A574'],
    vibe: 'natural, vivo, enraizado',
    inspiredBy: 'Una caminata en otoño',
  },
  midnight: {
    name: 'Medianoche',
    description: 'Negro profundo con acentos eléctricos. Modo concentrado.',
    palette: ['#0A0A0F', '#1E1B4B', '#7C3AED', '#A78BFA', '#F0ABFC'],
    vibe: 'sofisticado, enfocado, eléctrico',
    inspiredBy: 'Programar a las 3 AM con una sola luz',
  },
  'rose-gold': {
    name: 'Oro Rosado',
    description: 'Suaves rosas, dorados pálidos, marfil. Lujo accesible.',
    palette: ['#F472B6', '#FBCFE8', '#FDE68A', '#FEF3C7', '#F5F5F4'],
    vibe: 'elegante, femenino, premium',
    inspiredBy: 'Un atelier de moda en París',
  },
  cyberpunk: {
    name: 'Cyberpunk',
    description: 'Magenta, cyan, neones. Futuro retro.',
    palette: ['#F0F', '#0FF', '#FF0080', '#00FFFF', '#FFFF00'],
    vibe: 'rebelde, futurista, energético',
    inspiredBy: 'Tokio en 2077',
  },
  'minimal-white': {
    name: 'Minimal Blanco',
    description: 'Blanco, gris, un toque de color. Cero ruido.',
    palette: ['#FAFAFA', '#E5E5E5', '#737373', '#171717', '#3FB8C9'],
    vibe: 'limpio, intencional, calmo',
    inspiredBy: 'El estudio de un arquitecto japonés',
  },
  aurora: {
    name: 'Aurora Boreal',
    description: 'Violetas, verdes, cyans en gradient. Magia natural.',
    palette: ['#7C3AED', '#22D3EE', '#4ADE80', '#A78BFA', '#F0ABFC'],
    vibe: 'mágico, asombroso, único',
    inspiredBy: 'El cielo de Tromsø en invierno',
  },
};

export const SOUND_PACKS: Record<
  NonNullable<WelcomeSession['choices']['soundPack']>,
  {
    name: string;
    description: string;
    vibe: string;
  }
> = {
  gentle: {
    name: 'Gentle',
    description: 'Sonidos suaves, ASMR, campanas distantes',
    vibe: 'Mañana de domingo',
  },
  energetic: {
    name: 'Energetic',
    description: 'Whooshes, snaps modernos, beats cortos',
    vibe: 'Coffee shop techno',
  },
  minimal: {
    name: 'Minimal',
    description: 'Solo lo necesario, clicks limpios, silencio dorado',
    vibe: 'Apple aesthetic',
  },
  'retro-games': {
    name: 'Retro Games',
    description: '8-bit, coin-collect, level-up melodies',
    vibe: 'Nintendo en los 90',
  },
};

// ── API: iniciar / progresar sesión ──────────────────────────────────────────

export const startWelcome = (userId: string, brandName: string): WelcomeSession => {
  const store = loadStore();
  const existing = store.sessions.find((s) => s.userId === userId && !s.completedAt);
  if (existing) return existing;

  const session: WelcomeSession = {
    id: `welcome-${Date.now()}-${Math.floor(Math.random() * 999)}`,
    userId,
    brandName,
    startedAt: new Date().toISOString(),
    currentStage: 'box-opening',
    stagesCompleted: [],
    choices: {
      systemName: 'Talía',
      mascot: store.globalConfig.defaultMascot,
      theme: store.globalConfig.defaultTheme,
      voiceTone: 'amistosa',
      enableCelebrations: true,
      soundPack: 'gentle',
      morningGreetingTime: '08:30',
      eveningRecapTime: '21:00',
    },
    personalStory: {},
    giftsUnlocked: ['badge-bienvenida'],
    notes: [],
  };
  store.sessions.push(session);
  if (store.sessions.length > 100) store.sessions = store.sessions.slice(-100);
  saveStore(store);
  log.info(`[WelcomeExperience] Sesión iniciada para ${userId}/${brandName}`);
  return session;
};

export const advanceStage = (
  sessionId: string,
  nextStage: WelcomeStage,
  choices?: Partial<WelcomeSession['choices']>,
  personalStory?: Partial<WelcomeSession['personalStory']>,
): WelcomeSession | null => {
  const store = loadStore();
  const session = store.sessions.find((s) => s.id === sessionId);
  if (!session) return null;
  if (!session.stagesCompleted.includes(session.currentStage)) {
    session.stagesCompleted.push(session.currentStage);
  }
  session.currentStage = nextStage;
  if (choices) session.choices = { ...session.choices, ...choices };
  if (personalStory) session.personalStory = { ...session.personalStory, ...personalStory };

  // Unlock micro-gifts en cada stage
  const stageGifts: Record<WelcomeStage, string> = {
    'box-opening': 'badge-primera-vez',
    'first-impression': 'badge-bienvenida-formal',
    'name-the-system': 'badge-bautizo',
    'choose-mascot': 'badge-compañero-elegido',
    'pick-theme': 'badge-estilo-propio',
    'set-rituals': 'badge-ritmo',
    'meet-team': 'badge-presentaciones',
    'first-goal': 'badge-primera-meta',
    'first-win': 'badge-primera-victoria',
    'home-tour': 'badge-casa-explorada',
    completed: 'badge-fundador',
  };
  const gift = stageGifts[nextStage];
  if (gift && !session.giftsUnlocked.includes(gift)) session.giftsUnlocked.push(gift);

  if (nextStage === 'completed') {
    session.completedAt = new Date().toISOString();
    log.info(`[WelcomeExperience] 🎉 Onboarding completado para ${session.brandName}`);
  }
  saveStore(store);
  return session;
};

// ── Generación de copy ceremonial por etapa ──────────────────────────────────

export interface StageContent {
  title: string;
  subtitle: string;
  body: string;
  ctaPrimary: string;
  ctaSecondary?: string;
  visualHint: string; // sugerencia para el front (animación, color, etc.)
  soundCue?: string;
  microInteraction?: string; // qué animación dispara
}

export const generateStageContent = async (
  session: WelcomeSession,
  stage: WelcomeStage,
  brand: BrandProfile,
): Promise<StageContent> => {
  const userName = session.personalStory.favoriteAccountName ?? session.brandName;

  // Etapas ceremoniales con copy emocional pre-armado + AI personalization
  const staticDefaults: Record<WelcomeStage, StageContent> = {
    'box-opening': {
      title: `Bienvenido a FeedIA, ${userName}`,
      subtitle: 'Esto es tuyo. Vamos a abrirlo juntos.',
      body: 'Antes de empezar, respirá. Esto no es otra app. Es tu nuevo hogar creativo. En los próximos minutos vamos a darle forma a algo que va a sentirse 100% tuyo.',
      ctaPrimary: 'Abrir mi sistema ✨',
      visualHint: 'caja envuelta en papel con moño dorado, cinta que se abre lento al click',
      soundCue: 'unwrap-paper.mp3',
      microInteraction: 'box-opening-animation',
    },
    'first-impression': {
      title: 'Mirá qué linda quedó',
      subtitle: 'Tu sistema, listo para conocerte.',
      body: 'Cada espacio acá adentro fue pensado para vos. Tu equipo de agentes IA ya está esperando. Tu calendario está vacío esperando metas. Y Talía está ansiosa por conocerte.',
      ctaPrimary: 'Conocer mi sistema',
      visualHint: 'reveal con expand desde el centro, fade-in de los elementos uno por uno',
      soundCue: 'shimmer-soft.mp3',
      microInteraction: 'whole-system-reveal',
    },
    'name-the-system': {
      title: '¿Cómo querés llamarme?',
      subtitle: 'Soy Talía. Pero podés cambiarme el nombre.',
      body: 'Algunos me llaman "T", otros "asistente". Hubo uno que me llamó "Beatriz". Si tenés un nombre que querés darme, lo escucho con gusto.',
      ctaPrimary: 'Confirmar nombre',
      ctaSecondary: 'Dejar como "Talía"',
      visualHint: 'input gigante centrado, cursor parpadea, texto en hand-written font',
      soundCue: 'gentle-chime.mp3',
      microInteraction: 'name-confirmation-handshake',
    },
    'choose-mascot': {
      title: 'Elegí tu compañero',
      subtitle: '¿Quién te acompaña en este viaje?',
      body: 'Cada compañero tiene su personalidad. Algunos son cracks para coaches, otros para creadores, otros para founders. Elegí el que más te suene.',
      ctaPrimary: 'Elegir compañero',
      visualHint: 'grid de tarjetas con los 8 mascotas, cada una con animación al hover',
      soundCue: 'soft-pop.mp3',
      microInteraction: 'mascot-cards-shuffle',
    },
    'pick-theme': {
      title: 'Vestí tu nuevo hogar',
      subtitle: 'Elegí el estilo visual que más te representa.',
      body: 'No hay malas elecciones. Sólo tu vibe. Podés cambiar de tema cuando quieras — esto es solo el primer outfit.',
      ctaPrimary: 'Aplicar tema',
      visualHint: 'preview en vivo del tema, los colores se reflejan en toda la UI',
      soundCue: 'paint-stroke.mp3',
      microInteraction: 'theme-cascade-preview',
    },
    'set-rituals': {
      title: 'Tus rituales',
      subtitle: '¿Cuándo querés que te salude?',
      body: 'Te puedo dejar el buenos días con un resumen de la noche. Y la despedida con el resumen del día. O ninguna. O ambas. Vos elegís.',
      ctaPrimary: 'Guardar rituales',
      ctaSecondary: 'Saltar por ahora',
      visualHint: 'reloj analógico interactivo + toggles para morning/evening',
      soundCue: 'clock-tick-soft.mp3',
      microInteraction: 'clock-spin',
    },
    'meet-team': {
      title: 'Conocé a tu equipo',
      subtitle: 'Sí, son 10 agentes. Todos para vos.',
      body: 'Nova diseña tu contenido. Lía cuida tu comunidad. Luca cierra ventas. Scout vigila el nicho. Pixel hace los visuales. Hay más. Te los presento.',
      ctaPrimary: 'Saludar al equipo',
      visualHint: 'carrousel de avatares circulares con nombre y especialidad',
      soundCue: 'team-bell.mp3',
      microInteraction: 'team-avatars-wave',
    },
    'first-goal': {
      title: 'Tu primer objetivo',
      subtitle: '¿Qué querés lograr esta semana?',
      body: 'Decime algo concreto. "Crecer 100 seguidores", "publicar 3 reels", "responder todos los DMs". Algo chico pero real. Empezamos.',
      ctaPrimary: 'Fijar mi primer objetivo',
      visualHint: 'input grande tipo journal, cursor que invita a escribir',
      soundCue: 'pen-on-paper.mp3',
      microInteraction: 'goal-typed-locks-in',
    },
    'first-win': {
      title: '¡Tu primer logro!',
      subtitle: 'Ya tenés algo concreto.',
      body: 'Acabás de configurar tu sistema. Para muchos esto toma semanas. Vos lo hiciste en minutos. Eso ya es un win. Lo mereces.',
      ctaPrimary: 'Reclamar mi primer trofeo 🏆',
      visualHint: 'confetti dorado, trofeo emerge desde abajo, sonido de campanas',
      soundCue: 'trophy-fanfare.mp3',
      microInteraction: 'confetti-explosion-mild',
    },
    'home-tour': {
      title: 'Te muestro tu casa',
      subtitle: 'Recorrido relámpago por los espacios.',
      body: 'Tres minutos. Te muestro: el Feed (tu vista principal), la Pizarra (donde le decís a la IA qué hacer), el Calendario (tus eventos), el Kanban (cómo van las tareas), Reportes (resultados). Empezamos.',
      ctaPrimary: 'Hacer el tour',
      ctaSecondary: 'Skip y explorar solo',
      visualHint: 'spotlight que va de zona en zona con texto explicativo',
      soundCue: 'tour-step.mp3',
      microInteraction: 'spotlight-walk',
    },
    completed: {
      title: 'Estás en casa',
      subtitle: 'Bienvenido oficialmente.',
      body: 'Listo. Ya sos miembro de FeedIA. Cualquier cosa que necesites, decime. Estoy 24/7. Y este lugar mejora con cada uso.',
      ctaPrimary: 'Empezar a usar',
      visualHint: 'transition al home dashboard con animation de "the door opens"',
      soundCue: 'home-arrival.mp3',
      microInteraction: 'door-open-to-home',
    },
  };

  const base = staticDefaults[stage];

  // Personalizar con AI si tenemos info del usuario
  if (session.personalStory.why || session.personalStory.biggestDream) {
    const personalizePrompt = `Personalizá este copy de onboarding según el contexto del usuario, manteniendo el tono cálido y ceremonial.

Stage: ${stage}
Copy original:
- Título: ${base.title}
- Subtítulo: ${base.subtitle}
- Body: ${base.body}

Usuario:
- Marca: ${session.brandName} (${brand.niche})
- Por qué empezó: ${session.personalStory.why ?? '(no dijo)'}
- Sueño máximo: ${session.personalStory.biggestDream ?? '(no dijo)'}
- Compañero elegido: ${session.choices.mascot ?? '(default)'}

JSON: { "title": "", "subtitle": "", "body": "", "ctaPrimary": "" }
- Mantener el espíritu pero personalizarlo con detalles del usuario
- Máximo 2 líneas de body
- Sonar humano, no template`;

    try {
      const personalized = await routerAskJson<Pick<StageContent, 'title' | 'subtitle' | 'body' | 'ctaPrimary'>>(
        personalizePrompt,
        { taskType: 'response', maxTokens: 600 },
      );
      return { ...base, ...personalized };
    } catch {
      return base;
    }
  }

  return base;
};

// ── Resumen final personalizado ──────────────────────────────────────────────

export const buildCompletionRecap = async (
  sessionId: string,
  brand: BrandProfile,
): Promise<{
  headline: string;
  message: string;
  highlights: string[];
  nextStep: string;
}> => {
  const store = loadStore();
  const session = store.sessions.find((s) => s.id === sessionId);
  if (!session) return { headline: '', message: '', highlights: [], nextStep: '' };

  const mascotInfo = session.choices.mascot ? MASCOT_CATALOG[session.choices.mascot] : null;
  const themeInfo = session.choices.theme ? THEME_CATALOG[session.choices.theme] : null;

  const prompt = `Escribí el cierre de onboarding para ${session.brandName}. Tono: cálido, íntimo, como decirle a un amigo "ya está, llegaste".

Configuración elegida:
- Nombre del sistema: ${session.choices.systemName}
- Compañero: ${mascotInfo?.name} (${mascotInfo?.personality.join(', ')})
- Tema visual: ${themeInfo?.name} (${themeInfo?.vibe})
- Tono de voz: ${session.choices.voiceTone}
- Saludo matutino: ${session.choices.morningGreetingTime}
- Primer objetivo: "${session.choices.firstGoalDescription ?? 'sin definir'}"
- Por qué empezó: "${session.personalStory.why ?? '(no compartió)'}"
- Sueño: "${session.personalStory.biggestDream ?? '(no compartió)'}"
- ${session.giftsUnlocked.length} badges desbloqueados
- ${session.stagesCompleted.length} etapas completadas en ${session.startedAt ? Math.round((Date.now() - new Date(session.startedAt).getTime()) / 60000) : '?'} min

Marca: ${brand.name} | nicho: ${brand.niche}

JSON:
{
  "headline": "1 línea fuerte que selle el momento (max 60 chars)",
  "message": "2-3 líneas de cierre cálido, personal, que se quede en la memoria",
  "highlights": ["3 logros concretos del onboarding"],
  "nextStep": "1 línea con lo que viene a continuación"
}`;

  return routerAskJson<{ headline: string; message: string; highlights: string[]; nextStep: string }>(prompt, {
    taskType: 'response',
    maxTokens: 1000,
    systemPrompt: 'Sos un copywriter especialista en momentos emocionales. Sin floritura. Calidez real.',
  }).catch(() => ({
    headline: `Estás en casa, ${session.brandName}`,
    message: `Ya tenés tu sistema configurado. Tu compañero ${mascotInfo?.name ?? 'Talía'} está listo. Tu casa pintada con ${themeInfo?.name ?? 'Sunset'}. Empezamos.`,
    highlights: [
      `${session.giftsUnlocked.length} insignias desbloqueadas`,
      `${session.stagesCompleted.length} etapas completadas`,
      `Sistema personalizado con ${session.choices.mascot ?? 'Talía'} y tema ${session.choices.theme ?? 'Sunset'}`,
    ],
    nextStep: 'Volvé al Feed cuando quieras. Estoy lista.',
  }));
};

// ── Consultas ────────────────────────────────────────────────────────────────

export const getWelcomeSession = (sessionId: string): WelcomeSession | null =>
  loadStore().sessions.find((s) => s.id === sessionId) ?? null;

export const getActiveWelcomeForUser = (userId: string): WelcomeSession | null =>
  loadStore().sessions.find((s) => s.userId === userId && !s.completedAt) ?? null;

export const listWelcomes = (filters: { userId?: string; completed?: boolean } = {}): WelcomeSession[] => {
  let sessions = loadStore().sessions;
  if (filters.userId !== undefined) sessions = sessions.filter((s) => s.userId === filters.userId);
  if (filters.completed === true) sessions = sessions.filter((s) => Boolean(s.completedAt));
  if (filters.completed === false) sessions = sessions.filter((s) => !s.completedAt);
  return sessions.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
};

export const hasCompletedOnboarding = (userId: string): boolean => {
  const store = loadStore();
  return store.sessions.some((s) => s.userId === userId && Boolean(s.completedAt));
};

export const getCatalogs = (): {
  mascots: typeof MASCOT_CATALOG;
  themes: typeof THEME_CATALOG;
  sounds: typeof SOUND_PACKS;
} => ({
  mascots: MASCOT_CATALOG,
  themes: THEME_CATALOG,
  sounds: SOUND_PACKS,
});

// ── Helpers: easter eggs y micro-delights ────────────────────────────────────

export const getRandomCompliment = async (brand: BrandProfile): Promise<string> => {
  const compliments = [
    `Hoy te despertaste con buena energía, ${brand.name}.`,
    `Sigo pensando en aquel post que rompió todo. Bien ahí.`,
    `Tu cuenta tiene algo. No sé qué pero lo tiene.`,
    `Hoy se siente productivo. ¿Lo notás?`,
    `Sos de los que vienen seguido. Eso lo veo y lo aprecio.`,
    `Cada día te leo más rápido. Como un buen amigo.`,
  ];
  return compliments[Math.floor(Math.random() * compliments.length)] ?? compliments[0]!;
};

export const getWelcomeSnapshot = (): {
  total: number;
  completed: number;
  inProgress: number;
  averageStageReached: string;
  popularMascot: string;
  popularTheme: string;
} => {
  const sessions = loadStore().sessions;
  const completed = sessions.filter((s) => s.completedAt).length;
  const inProgress = sessions.length - completed;

  const mascotCount: Record<string, number> = {};
  const themeCount: Record<string, number> = {};
  for (const s of sessions) {
    if (s.choices.mascot) mascotCount[s.choices.mascot] = (mascotCount[s.choices.mascot] ?? 0) + 1;
    if (s.choices.theme) themeCount[s.choices.theme] = (themeCount[s.choices.theme] ?? 0) + 1;
  }
  const popularMascot = Object.entries(mascotCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'talia-elegante';
  const popularTheme = Object.entries(themeCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'sunset';

  const stageCounts: Record<string, number> = {};
  for (const s of sessions) stageCounts[s.currentStage] = (stageCounts[s.currentStage] ?? 0) + 1;
  const averageStageReached = Object.entries(stageCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'box-opening';

  return {
    total: sessions.length,
    completed,
    inProgress,
    averageStageReached,
    popularMascot,
    popularTheme,
  };
};

// ── Generación de mensaje de "te extrañé" si vuelve después de mucho ─────────

export const generateReturnGreeting = async (brand: BrandProfile, daysSinceLastVisit: number): Promise<string> => {
  if (daysSinceLastVisit < 1) return `Bienvenido de vuelta, ${brand.name}.`;

  const prompt = `Escribí un saludo cálido para alguien que volvió a su panel después de ${daysSinceLastVisit} días.

Marca: ${brand.name}
Tono: caluroso, no acusatorio, lleno de novedades pendientes

Devolvé SOLO el mensaje, máximo 2 líneas, en primera persona ("yo te extrañé", "te tengo guardado X"). Sin "qué bueno verte de nuevo" genérico.`;

  return routerAsk(prompt, { taskType: 'response', maxTokens: 200, freeOnly: true })
    .then((r) => r.text.trim())
    .catch(() => `Volviste. ${daysSinceLastVisit} días sin verte. Tenemos cosas para ponernos al día.`);
};

export const exportWelcomeState = (): WelcomeStore => loadStore();
