/**
 * Branding Brain — cerebro multi-agente para construcción, gestión y
 * desarrollo estratégico de la marca (empresa, negocio, emprendimiento o
 * marca personal).
 *
 * Orquesta 8 especialistas IA que operan como un equipo real de branding:
 * Estratega Senior, Investigador de Audiencia, Naming & Voz, Identidad
 * Visual, Arquitecto de Narrativa, Estratega Diferencial (anti-genérico),
 * Posicionador Influencer y Guardian de Coherencia.
 *
 * Optimización de costos: todos los agentes comparten el mismo bloque de
 * contexto de marca en el system cacheado vía `callCanvaAgent`. El primer
 * agente escribe el cache (~1.25×), los siguientes lo leen (~0.1×) → ~80% de
 * ahorro en tokens de entrada por job completo.
 */

import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import { callCanvaAgent, type CanvaAgentTier } from '../computerUse/canvaClaudeClient.js';

export type BrandingBrainMode = 'discovery' | 'refinement' | 'evolution' | 'autopilot';

export interface BrandingBrainAgent {
  id: string;
  name: string;
  emoji: string;
  role: string;
  specialty: string;
}

export interface BrandingBrainStep {
  agentId: string;
  agentName: string;
  emoji: string;
  phase: string;
  thinking: string;
  output: string;
  durationMs: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

export interface BrandStrategy {
  vision: string;
  mission: string;
  values: string[];
  positioning: string;
  differentiator: string;
}

export interface AudienceAvatar {
  description: string;
  jobsToBeDone: string[];
  pains: string[];
  desires: string[];
  aspirationalIdentity: string;
}

export interface BrandVoice {
  tone: string[];
  vocabulary: string[];
  forbidden: string[];
  sampleHooks: string[];
}

export interface VisualIdentity {
  palette: string[];
  typography: string[];
  mood: string;
  iconography: string;
  sampleCompositions: string[];
}

export interface BrandNarrative {
  originStory: string;
  coreMessages: string[];
  brandArcs: string[];
}

export interface DifferentialAngles {
  contraTakes: string[];
  uniqueAngles: string[];
  innovationOpportunities: string[];
}

export interface InfluencerPlan {
  authorityPillars: string[];
  signaturePieces: string[];
  visibilityTactics: string[];
  thoughtLeadershipTopics: string[];
}

export interface CoherenceReport {
  score: number;
  conflicts: string[];
  recommendations: string[];
}

export interface BrandingBrainResult {
  ok: boolean;
  jobId: string;
  mode: BrandingBrainMode;
  steps: BrandingBrainStep[];
  brandStrategy: BrandStrategy;
  audienceAvatar: AudienceAvatar;
  voice: BrandVoice;
  visualIdentity: VisualIdentity;
  narrative: BrandNarrative;
  differentialAngles: DifferentialAngles;
  influencerPlan: InfluencerPlan;
  coherenceReport: CoherenceReport;
  totalDurationMs: number;
  /** Telemetría de caché — suma de todos los agentes del job */
  totalCacheReadTokens: number;
  totalCacheWriteTokens: number;
}

export const BRANDING_BRAIN_AGENTS: BrandingBrainAgent[] = [
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
    specialty: 'Avatar del cliente ideal, jobs-to-be-done, dolores, deseos',
  },
  {
    id: 'naming-voice',
    name: 'Tomás Quiroga',
    emoji: '📣',
    role: 'Naming & Voz de Marca',
    specialty: 'Tono de voz, vocabulario, palabras prohibidas, naming',
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
    specialty: 'Convertir cuenta en autoridad de nicho',
  },
  {
    id: 'coherence-guardian',
    name: 'Helena Saavedra',
    emoji: '🛡️',
    role: 'Guardian de Coherencia',
    specialty: 'Validación de identidad y consistencia',
  },
];

export interface BrandingBrainRequest {
  goal: string;
  userIdeas?: string;
  constraints?: string;
  targetTier?: 'starting' | 'growing' | 'established' | 'influencer';
}

// ── Tier por agente ───────────────────────────────────────────────────────────
const AGENT_TIER: Record<string, CanvaAgentTier> = {
  'brand-strategist-senior': 'creative', // Opus 4.7 — juicio estratégico
  'audience-researcher': 'analytical', // Sonnet 4.6 — análisis estructurado
  'naming-voice': 'creative', // Opus 4.7 — voz y lenguaje creativo
  'visual-identity': 'creative', // Opus 4.7 — juicio visual/estético
  'narrative-architect': 'creative', // Opus 4.7 — storytelling
  'differential-strategist': 'creative', // Opus 4.7 — pensamiento contrarian
  'influencer-positioner': 'analytical', // Sonnet 4.6 — táctica y planificación
  'coherence-guardian': 'analytical', // Sonnet 4.6 — auditoría y validación
};

export const runBrandingBrain = async (
  brand: BrandProfile,
  request: BrandingBrainRequest,
  mode: BrandingBrainMode = 'refinement',
): Promise<BrandingBrainResult> => {
  const start = Date.now();
  const jobId = Date.now().toString(36);
  const steps: BrandingBrainStep[] = [];
  const tier = request.targetTier ?? 'growing';
  let totalCacheReadTokens = 0;
  let totalCacheWriteTokens = 0;

  log.info(`[BrandingBrain] Job ${jobId} iniciado · modo=${mode} · tier=${tier} · goal=${request.goal.slice(0, 60)}`);

  /**
   * Helper genérico que llama a un agente con prompt caching del contexto de
   * marca, registra el paso y acumula telemetría de caché.
   */
  const runStep = async <T>(
    agentId: string,
    phase: string,
    thinking: string,
    taskPrompt: string,
    fallback: T,
    summarize: (result: T) => string,
    maxTokens = 1400,
  ): Promise<T> => {
    const t0 = Date.now();
    const agent = BRANDING_BRAIN_AGENTS.find((a) => a.id === agentId)!;
    let result: T = fallback;
    let cacheRead: number | undefined;
    let cacheWrite: number | undefined;

    try {
      const res = await callCanvaAgent<T>(brand, {
        agentRole: agent.role,
        tier: AGENT_TIER[agentId] ?? 'analytical',
        taskPrompt,
        maxTokens,
      });
      result = res.data ?? fallback;
      cacheRead = res.cacheReadTokens;
      cacheWrite = res.cacheWriteTokens;
      totalCacheReadTokens += res.cacheReadTokens;
      totalCacheWriteTokens += res.cacheWriteTokens;
    } catch (err) {
      log.warn(`[BrandingBrain] ${agentId} fallback: ${(err as Error).message}`);
    }

    steps.push({
      agentId,
      agentName: agent.name,
      emoji: agent.emoji,
      phase,
      thinking,
      output: summarize(result),
      durationMs: Date.now() - t0,
      cacheReadTokens: cacheRead,
      cacheWriteTokens: cacheWrite,
    });

    return result;
  };

  // ── 1. Estratega de Marca Senior — visión/misión/valores/posicionamiento ──

  const brandStrategy = await runStep<BrandStrategy>(
    'brand-strategist-senior',
    'Estrategia central',
    'Analizando visión, misión, valores y posicionamiento competitivo según el goal del usuario...',
    `Sos Lorenzo Vidal, Estratega de Marca Senior con 20 años de experiencia.
Tu especialidad: Visión, misión, valores, posicionamiento competitivo.

Ya conocés la identidad completa de la marca desde el contexto de sistema.

ENCARGO ESPECÍFICO:
Goal del usuario: ${request.goal}
${request.userIdeas ? `Ideas del usuario: ${request.userIdeas}` : ''}
${request.constraints ? `Restricciones: ${request.constraints}` : ''}

Definí la estrategia de marca con definiciones accionables y específicas para el nicho.
Sé brutalmente específico y diferenciador — nada genérico.

Respondé con JSON:
{
  "vision": "...",
  "mission": "...",
  "values": ["valor 1", "valor 2", "valor 3", "valor 4"],
  "positioning": "...",
  "differentiator": "..."
}`,
    {
      vision: `Ser referente en ${brand.niche}`,
      mission: `Operar como sistema que reemplaza al equipo tradicional en ${brand.niche}`,
      values: ['autonomía', 'transparencia', 'sin clickbait', 'resultados verificables'],
      positioning: `No somos una herramienta — somos tu equipo operando solo`,
      differentiator: `El único sistema autónomo en ${brand.niche}`,
    },
    (r) => `Visión: ${r.vision.slice(0, 80)}... · Posicionamiento: ${r.positioning.slice(0, 80)}`,
  );

  // ── 2. Investigador de Audiencia — avatar, JTBD, dolores, deseos ──────────

  const audienceAvatar = await runStep<AudienceAvatar>(
    'audience-researcher',
    'Avatar de audiencia',
    'Mapeando avatar del cliente ideal, jobs-to-be-done, dolores y deseos aspiracionales...',
    `Sos Renata Ibáñez, Investigadora de Audiencia.
Usás Jobs-to-be-Done framework y mapeo emocional profundo.

Ya conocés la audiencia base de la marca desde el contexto de sistema.
Profundizá y precisá en base al posicionamiento estratégico definido.

POSICIONAMIENTO DE LA MARCA: ${brandStrategy.positioning}
GOAL DEL USUARIO: ${request.goal}

Definí el avatar hiper-específico — nada de "todos los emprendedores".
Incluí detalles psicográficos concretos.

Respondé con JSON:
{
  "description": "descripción específica del cliente ideal",
  "jobsToBeDone": ["JTBD 1", "JTBD 2", "JTBD 3"],
  "pains": ["dolor 1", "dolor 2", "dolor 3", "dolor 4"],
  "desires": ["deseo 1", "deseo 2", "deseo 3"],
  "aspirationalIdentity": "quién quiere ser / cómo quiere verse"
}`,
    {
      description: `Perfil real del nicho ${brand.niche}, edad 25-40, hace todo solo, quiere escalar`,
      jobsToBeDone: [
        'publicar contenido consistente',
        'responder DMs sin perder leads',
        'mantener identidad sin diseñador',
      ],
      pains: ['ahogarse en tareas operativas', 'no poder permitirse equipo', 'inconsistencia cuando se va de viaje'],
      desires: ['libertad de tiempo', 'crecer mientras duerme', 'verse profesional'],
      aspirationalIdentity: `El profesional de ${brand.niche} que tiene un sistema y se ve como marca-empresa`,
    },
    (r) => `Avatar: ${r.description.slice(0, 80)}... · Dolor principal: ${r.pains[0] ?? '?'}`,
  );

  // ── 3. Naming & Voz ───────────────────────────────────────────────────────

  const voice = await runStep<BrandVoice>(
    'naming-voice',
    'Voz de marca',
    'Refinando tono, vocabulario y bloqueando palabras genéricas...',
    `Sos Tomás Quiroga, especialista en Naming & Voz de Marca.
Detectás palabras genéricas y las prohibís. Creás vocabulario de marca distintivo.

Ya conocés el tono actual de la marca desde el contexto de sistema.
Refiná y ampliá con base en el avatar y el posicionamiento.

AVATAR: ${audienceAvatar.description}
ASPIRATIONAL IDENTITY: ${audienceAvatar.aspirationalIdentity}

Definí la voz con precisión. Los sampleHooks deben sonar EXACTAMENTE como la marca — no como cualquier cuenta del nicho.

Respondé con JSON:
{
  "tone": ["tono 1", "tono 2", "tono 3"],
  "vocabulary": ["palabra de marca 1", "palabra de marca 2", "palabra de marca 3", "palabra de marca 4", "palabra de marca 5"],
  "forbidden": ["prohibida 1", "prohibida 2", "prohibida 3", "prohibida 4"],
  "sampleHooks": ["hook 1 que suena exactamente a la marca", "hook 2", "hook 3"]
}`,
    {
      tone: brand.voice.tone.length > 0 ? brand.voice.tone : ['cercano', 'directo', 'sin clickbait'],
      vocabulary: ['sistema', 'autónomo', 'operar', 'resultado', 'caso real'],
      forbidden: ['gurú', 'literalmente', 'increíble', 'game-changer', 'rompedor'],
      sampleHooks: [
        `No publiques todos los días.`,
        `Tu agencia te cobra USD 4k al mes. Esto cuesta cero.`,
        `El algoritmo no es magia — tiene reglas.`,
      ],
    },
    (r) => `Tono: ${r.tone.join(', ')} · Prohibidas: ${r.forbidden.slice(0, 3).join(', ')}...`,
  );

  // ── 4. Identidad Visual ───────────────────────────────────────────────────

  const visualIdentity = await runStep<VisualIdentity>(
    'visual-identity',
    'Identidad visual',
    'Validando paleta, tipografía, mood e iconografía...',
    `Sos Aurora Blanchet, Directora de Identidad Visual.

Ya conocés la identidad visual actual de la marca desde el contexto de sistema (paleta, tipografías, style, mood, etc.).
Tu tarea: validar, refinar o proponer mejoras fundamentadas.

AVATAR: ${audienceAvatar.description}
VOZ: ${voice.tone.join(', ')}
POSICIONAMIENTO: ${brandStrategy.positioning}

Mantené coherencia con la identidad visual existente si es sólida.
Mejorá solo lo que necesite ajuste para el posicionamiento objetivo.

Respondé con JSON:
{
  "palette": ["#hex1", "#hex2", "#hex3", "#hex4"],
  "typography": ["tipografía principal", "tipografía secundaria"],
  "mood": "mood visual completo",
  "iconography": "descripción del sistema de iconografía",
  "sampleCompositions": ["descripción composición 1", "composición 2", "composición 3"]
}`,
    {
      palette: brand.visual.palette,
      typography: brand.visual.typography ?? ['Inter', 'JetBrains Mono'],
      mood: brand.visual.mood ?? 'profesional con calidez · alto contraste · acento neón',
      iconography: 'minimalista · líneas finas · sin clipart',
      sampleCompositions: [
        'Texto grande centrado sobre fondo oscuro',
        'Datos en columnas con números neón',
        'Número grande izquierda + idea derecha',
      ],
    },
    (r) => `Paleta: ${r.palette.slice(0, 3).join(', ')}... · Mood: ${r.mood.slice(0, 60)}`,
  );

  // ── 5. Arquitecto de Narrativa ────────────────────────────────────────────

  const narrative = await runStep<BrandNarrative>(
    'narrative-architect',
    'Narrativa de marca',
    'Construyendo origin story, mensajes clave y arcos narrativos...',
    `Sos Joaquín Bressan, Arquitecto de Narrativa de Marca.
Usás técnicas cinematográficas y storytelling estructurado.

Ya conocés la historia y estrategia de la marca desde el contexto de sistema.
Profundizá y construí arcos narrativos que conecten con el avatar definido.

POSICIONAMIENTO: ${brandStrategy.positioning}
AVATAR ASPIRATIONAL: ${audienceAvatar.aspirationalIdentity}
DOLORES DEL AVATAR: ${audienceAvatar.pains.slice(0, 3).join('; ')}

Que la origin story sea creíble, emocional y conecte con la transformación que ofrece la marca.

Respondé con JSON:
{
  "originStory": "historia de origen creíble y emocional (máx 150 palabras)",
  "coreMessages": ["mensaje clave 1", "mensaje 2", "mensaje 3"],
  "brandArcs": ["arco narrativo 1 (de X a Y)", "arco 2", "arco 3"]
}`,
    {
      originStory: `Nació para que el profesional de ${brand.niche} no se ahogue en tareas. Lo construimos para nosotros y se volvió referente.`,
      coreMessages: [
        `Tu equipo en IA · operando 24/7`,
        `No vendemos productividad — vendemos libertad`,
        `El sistema opera, vos creás`,
      ],
      brandArcs: [
        'Del caos operativo a la libertad',
        'De freelancer a marca-empresa',
        'De publicar todos los días a publicar lo que importa',
      ],
    },
    (r) => `Origin: ${r.originStory.slice(0, 80)}... · Mensaje clave: ${r.coreMessages[0] ?? ''}`,
  );

  // ── 6. Estratega Diferencial — ANTI-GENÉRICO ──────────────────────────────

  const differentialAngles = await runStep<DifferentialAngles>(
    'differential-strategist',
    'Anti-genérico',
    'Buscando ángulos contrarios, takes únicos y oportunidades de innovación...',
    `Sos Mariela Costa, Estratega Diferencial.
Tu misión: sacar a la marca del contenido genérico del nicho. Pensás en contrarian takes inteligentes y fundamentados.

Ya conocés el nicho y el posicionamiento desde el contexto de sistema.

VOZ DE MARCA: ${voice.tone.join(', ')}
DOLORES DEL AVATAR: ${audienceAvatar.pains.join('; ')}
${request.userIdeas ? `IDEAS DEL USUARIO: ${request.userIdeas}` : ''}

NADA genérico. NADA motivacional vacío. NADA que cualquier otra cuenta del nicho podría decir.
Los contraTakes deben ser inteligentes y verificables, no provocadores vacíos.

Respondé con JSON:
{
  "contraTakes": ["creencia del nicho que vamos a contradecir 1", "contraTake 2", "contraTake 3"],
  "uniqueAngles": ["ángulo único 1", "ángulo 2", "ángulo 3"],
  "innovationOpportunities": ["oportunidad de innovación 1", "oportunidad 2", "oportunidad 3"]
}`,
    {
      contraTakes: [
        `No publiques todos los días`,
        `El engagement bajo a veces es bueno`,
        `Los hashtags genéricos te están hundiendo`,
      ],
      uniqueAngles: [
        `Mostramos el sistema operando en vivo`,
        `Casos con números reales — no testimonios vagos`,
        `Deconstruimos un caso por semana`,
      ],
      innovationOpportunities: [
        `Lives quincenales con el sistema corriendo`,
        `Pizarra colaborativa con la audiencia`,
        `Carruseles "deconstruido"`,
      ],
    },
    (r) =>
      `Contra-takes: ${r.contraTakes.length} · Ángulos únicos: ${r.uniqueAngles.length} · Innovación: ${r.innovationOpportunities.length}`,
  );

  // ── 7. Posicionador Influencer ────────────────────────────────────────────

  const influencerPlan = await runStep<InfluencerPlan>(
    'influencer-positioner',
    'Plan de influencer',
    'Diseñando pilares de autoridad, signature pieces y tácticas de visibilidad...',
    `Sos Bautista Roldán, Posicionador Influencer.
Convertís cuentas en autoridad de nicho. Sabés exactamente qué formatos y tácticas construyen autoridad real.

Ya conocés los objetivos de Instagram y el nicho de la marca desde el contexto de sistema.

POSICIONAMIENTO: ${brandStrategy.positioning}
ÁNGULOS ÚNICOS: ${differentialAngles.uniqueAngles.join('; ')}
TIER OBJETIVO: ${tier === 'influencer' ? 'mantener y consolidar como referente' : `llevar a tier influencer desde ${tier}`}

Diseñá un plan concreto y ejecutable. Los signature pieces deben ser tan distintivos que se asocien automáticamente a la marca.

Respondé con JSON:
{
  "authorityPillars": ["pilar 1", "pilar 2", "pilar 3", "pilar 4"],
  "signaturePieces": ["pieza signature 1", "pieza 2", "pieza 3"],
  "visibilityTactics": ["táctica 1", "táctica 2", "táctica 3"],
  "thoughtLeadershipTopics": ["tema 1", "tema 2", "tema 3", "tema 4"]
}`,
    {
      authorityPillars: [
        `Sistema autónomo (cómo funciona)`,
        `Casos reales con números`,
        `Deconstrucción del algoritmo`,
      ],
      signaturePieces: [
        `Carrusel "Sistema operando"`,
        `Reel "Día sin tocar el teléfono"`,
        `Live "Construyamos juntos"`,
      ],
      visibilityTactics: [
        `Colaboraciones con 2 creators del nicho/mes`,
        `Citado por otros creators en sus deep-dives`,
        `Newsletter semanal de "qué hizo el sistema esta semana"`,
      ],
      thoughtLeadershipTopics: [
        `Algoritmo de Instagram en 2026`,
        `Computer Use para ${brand.niche}`,
        `Apalancamiento real con IA`,
      ],
    },
    (r) =>
      `Pilares: ${r.authorityPillars.length} · Signature: ${r.signaturePieces.length} · Visibilidad: ${r.visibilityTactics.length}`,
  );

  // ── 8. Guardian de Coherencia ─────────────────────────────────────────────

  const coherenceReport = await runStep<CoherenceReport>(
    'coherence-guardian',
    'Auditoría de coherencia',
    'Validando consistencia entre todos los outputs anteriores...',
    `Sos Helena Saavedra, Guardian de Coherencia de Marca.
Detectás conflictos sutiles entre las decisiones de estrategia, voz e identidad visual.

Ya conocés la identidad base de la marca desde el contexto de sistema.
Auditá los outputs del equipo completo de este job:

ESTRATEGIA:
- Posicionamiento: ${brandStrategy.positioning}
- Diferenciador: ${brandStrategy.differentiator}
- Valores: ${brandStrategy.values.join(', ')}

VOZ: Tono: ${voice.tone.join(', ')} · Prohibidas: ${voice.forbidden.join(', ')}

VISUAL: Mood: ${visualIdentity.mood}

NARRATIVA: Mensaje central: ${narrative.coreMessages[0] ?? '(ninguno)'}

DIFERENCIAL: ${differentialAngles.uniqueAngles[0] ?? '(ninguno)'}

PLAN INFLUENCER: Pilar principal: ${influencerPlan.authorityPillars[0] ?? '(ninguno)'}

Devolvé un score de coherencia (0-100) y señalá cualquier conflicto o inconsistencia.

Respondé con JSON:
{
  "score": 85,
  "conflicts": ["conflicto o inconsistencia detectada 1", "conflicto 2"],
  "recommendations": ["recomendación de ajuste 1", "recomendación 2", "recomendación 3"]
}`,
    {
      score: 90,
      conflicts: [`Validar que tono y mood visual no se contradigan`],
      recommendations: [
        `Reforzar el "anti-genérico" en toda pieza nueva`,
        `Re-validar paleta cada trimestre`,
        `Documentar 5 ejemplos de copy que SÍ aplican la voz`,
      ],
    },
    (r) => `Score: ${r.score}/100 · Conflictos: ${r.conflicts.length} · Recomendaciones: ${r.recommendations.length}`,
  );

  const totalDurationMs = Date.now() - start;
  log.info(
    `[BrandingBrain] Job ${jobId} completado en ${totalDurationMs}ms · coherencia=${coherenceReport.score} · ` +
      `cache_read=${totalCacheReadTokens} cache_write=${totalCacheWriteTokens}`,
  );

  return {
    ok: true,
    jobId,
    mode,
    steps,
    brandStrategy,
    audienceAvatar,
    voice,
    visualIdentity,
    narrative,
    differentialAngles,
    influencerPlan,
    coherenceReport,
    totalDurationMs,
    totalCacheReadTokens,
    totalCacheWriteTokens,
  };
};
