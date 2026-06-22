// @ts-nocheck
/**
 * Master Brain — ORQUESTADOR UNIFICADO de Computer Use.
 *
 * Une todos los cerebros, agentes IA y automatizaciones bajo un solo
 * "cerebro central". El usuario expresa una intención de alto nivel y este
 * módulo decide qué cerebros activar, en qué orden, mantiene contexto
 * compartido entre ellos, y devuelve un plan de acción listo para ejecutar
 * (o ya ejecutado en modo autopilot).
 *
 * Cerebros integrados:
 *  • Canva Brain (7 agentes diseñan Canva via CU)
 *  • Branding Brain (8 agentes construyen/evolucionan la marca)
 *  • Agentes Generales (10 expertos de definitions.ts)
 *  • Planner Computer Use (planes deterministas Instagram)
 *  • Controller CU real (ejecución con cursor/teclado)
 */

import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import { runCanvaBrain, CANVA_BRAIN_AGENTS, type CanvaBrainResult } from './canvaBrain.js';
import { AGENTS } from '../agents/definitions.js';
import { planComputerUse } from './planner.js';

// Branding Brain — opcional via dynamic import (puede no existir aún en
// algunos environments). Si no se puede cargar, masterBrain igual funciona.
type BrandingBrainResultMin = {
  ok: boolean;
  jobId: string;
  brandStrategy: { positioning: string; differentiator: string };
  voice: { tone: string[]; forbidden: string[] };
  visualIdentity: { palette: string[]; mood: string };
  differentialAngles: { contraTakes: string[]; uniqueAngles: string[]; innovationOpportunities: string[] };
  influencerPlan: { authorityPillars: string[]; visibilityTactics: string[] };
  coherenceReport: { score: number };
};

const tryRunBrandingBrain = async (brand: BrandProfile, goal: string): Promise<BrandingBrainResultMin | null> => {
  try {
    const mod = await import('../branding/brandingBrain.js');
    const result = await mod.runBrandingBrain(brand, { goal }, 'refinement');
    return result as BrandingBrainResultMin;
  } catch (err) {
    log.warn(`[MasterBrain] Branding Brain no disponible: ${(err as Error).message}`);
    return null;
  }
};

// ── Tipos públicos ────────────────────────────────────────────────────────────

export type MasterIntent =
  | 'create-content'
  | 'build-brand'
  | 'evolve-brand'
  | 'publish'
  | 'analyze'
  | 'transform-to-influencer'
  | 'full-takeover'
  | 'manage-dms'
  | 'manage-comments'
  | 'ab-test'
  | 'optimize-hashtags'
  | 'schedule-queue'
  | 'generate-captions'
  | 'detect-trends'
  | 'analyze-competitors';

export type MasterMode = 'supervisor' | 'autopilot' | 'observer';

export interface MasterContext {
  brand: BrandProfile;
  userInput: string;
  userPreferences?: string;
  userConstraints?: string;
  intent: MasterIntent;
  mode: MasterMode;
  contentFormat?: 'carousel' | 'reel' | 'story' | 'post' | 'live' | 'collab';
  topic?: string;
}

export interface MasterStep {
  brainId: string;
  brainLabel: string;
  emoji: string;
  phase: string;
  thinking: string;
  output: string;
  durationMs: number;
  contributesTo: string;
}

export interface MasterRecommendation {
  id: string;
  type: 'improvement' | 'innovation' | 'warning' | 'opportunity';
  title: string;
  rationale: string;
  priority: 'high' | 'medium' | 'low';
  appliesTo: string;
}

export interface MasterDeliverable {
  kind: string;
  label: string;
  payload: unknown;
}

export interface MasterNextAction {
  label: string;
  route?: string;
  apiCall?: string;
}

export interface MasterResult {
  ok: boolean;
  jobId: string;
  intent: MasterIntent;
  mode: MasterMode;
  steps: MasterStep[];
  brainsActivated: string[];
  finalOutput: {
    summary: string;
    deliverables: MasterDeliverable[];
    nextActions: MasterNextAction[];
  };
  recommendations: MasterRecommendation[];
  innovationScore: number;
  influencerScore: number;
  brandCoherenceScore: number;
  totalDurationMs: number;
  approvalRequired: boolean;
}

export interface BrainCatalogEntry {
  id: string;
  label: string;
  emoji: string;
  description: string;
  isAvailable: boolean;
}

export const listAvailableBrains = (): BrainCatalogEntry[] => [
  {
    id: 'canva-brain',
    label: 'Canva Brain',
    emoji: '🎨',
    description: `${CANVA_BRAIN_AGENTS.length} agentes diseñan en Canva via Computer Use`,
    isAvailable: true,
  },
  {
    id: 'branding-brain',
    label: 'Branding Brain',
    emoji: '🏛️',
    description: '8 agentes construyen, gestionan y evolucionan la marca',
    isAvailable: true,
  },
  {
    id: 'agents-general',
    label: 'Agentes Generales',
    emoji: '🤖',
    description: `${AGENTS.length} expertos: Algorithm, Viral, Sales, Community, Trends, Storyteller, Growth, Strategist, Humor, Meta Ads`,
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
    description: 'Ejecuta acciones reales (cursor + teclado). Solo si COMPUTER_USE_LIVE=true.',
    isAvailable: process.env['COMPUTER_USE_LIVE'] === 'true',
  },
  {
    id: 'ab-testing-engine',
    label: 'A/B Testing Engine',
    emoji: '🧪',
    description: 'Crea variantes de contenido, mide resultados y elige el ganador por significancia estadística',
    isAvailable: true,
  },
  {
    id: 'hashtag-engine',
    label: 'Hashtag Engine',
    emoji: '#️⃣',
    description: 'Estrategia de hashtags en 3 niveles, rotación inteligente y scoring',
    isAvailable: true,
  },
  {
    id: 'dm-conversation-engine',
    label: 'DM Conversation Engine',
    emoji: '💬',
    description: 'Gestión de DMs: clasifica intención, genera respuestas, procesa inbox completo',
    isAvailable: true,
  },
  {
    id: 'content-queue',
    label: 'Content Queue',
    emoji: '📅',
    description: 'Cola de publicación con scheduling óptimo, autopilot y ventanas prime',
    isAvailable: true,
  },
  {
    id: 'caption-generator',
    label: 'Caption Generator',
    emoji: '✍️',
    description: 'Captions, variantes A/B, subtítulos sincronizados para reels y alt text',
    isAvailable: true,
  },
  {
    id: 'comment-orchestrator',
    label: 'Comment Orchestrator',
    emoji: '💡',
    description: 'Analiza comentarios, detecta crisis, genera respuestas y seeds de engagement',
    isAvailable: true,
  },
  {
    id: 'trending-engine',
    label: 'Trending Engine',
    emoji: '📈',
    description:
      'Detecta tendencias del nicho, puntúa relevancia y genera adaptaciones de contenido listas para producir',
    isAvailable: true,
  },
  {
    id: 'competitor-adaptation',
    label: 'Competitor Adaptation Engine',
    emoji: '🔍',
    description: 'Analiza competidores, extrae estrategias ganadoras y genera ideas desde gaps del mercado',
    isAvailable: true,
  },
];

// ── Orquestación ─────────────────────────────────────────────────────────────

interface SharedScratchpad {
  brandValidated: boolean;
  positioning?: string;
  voice?: { tone: string[]; forbidden: string[] };
  visual?: { palette: string[]; mood: string };
  uniqueAngles: string[];
  contraTakes: string[];
  authorityPillars: string[];
  copy?: { headline: string; caption: string; cta: string };
  visualPlan?: { template: string; palette: string[] };
  canvaJobId?: string;
  publishPlan?: { timing: string; pinFirstComment: boolean };
}

const pickAgentsForIntent = (intent: MasterIntent): string[] => {
  switch (intent) {
    case 'create-content':
      return ['viral', 'algorithm', 'strategist'];
    case 'build-brand':
      return ['storyteller', 'strategist'];
    case 'evolve-brand':
      return ['strategist', 'viral'];
    case 'publish':
      return ['algorithm', 'community'];
    case 'analyze':
      return ['algorithm', 'growth'];
    case 'transform-to-influencer':
      return ['growth', 'viral', 'storyteller', 'community'];
    case 'full-takeover':
      return ['strategist', 'viral', 'algorithm', 'storyteller', 'community', 'growth'];
    case 'manage-dms':
      return ['community', 'strategist'];
    case 'manage-comments':
      return ['community', 'viral'];
    case 'ab-test':
      return ['viral', 'algorithm'];
    case 'optimize-hashtags':
      return ['algorithm', 'growth'];
    case 'schedule-queue':
      return ['algorithm', 'strategist'];
    case 'generate-captions':
      return ['viral', 'storyteller'];
    default:
      return ['strategist'];
  }
};

const runGeneralAgentStep = (agentId: string, phase: string, scratchpad: SharedScratchpad): MasterStep => {
  const agent = AGENTS.find((a) => a.id === agentId);
  if (!agent) {
    return {
      brainId: `agents-general:${agentId}`,
      brainLabel: `Agente ${agentId} (no encontrado)`,
      emoji: '❓',
      phase,
      thinking: 'Agente no disponible',
      output: 'skip',
      durationMs: 0,
      contributesTo: 'noop',
    };
  }
  const t0 = Date.now();
  // En esta versión los agentes generales aportan conocimiento determinista
  // basado en su especialidad. La integración LLM viva queda para cuando se
  // active autopilot con presupuesto disponible.
  const outputByAgent: Record<
    string,
    { thinking: string; output: string; contributes: string; updates: Partial<SharedScratchpad> }
  > = {
    viral: {
      thinking: 'Combinando hook + emoción + take contrario para máxima shareabilidad...',
      output:
        'Fórmula: hook contrarian + dato sorprendente + CTA de guardado. Patrón: pattern interruption en slide 1.',
      contributes: 'content-structure',
      updates: {
        copy: {
          headline: '5 errores que matan tu alcance',
          caption: scratchpad.copy?.caption ?? '',
          cta: 'Guardá esto antes de publicar 👇',
        },
      },
    },
    algorithm: {
      thinking: 'Optimizando timing, formato y velocidad de engagement...',
      output: 'Formato 4:5 carrusel. Martes 19hs. Pin del primer comentario con stats. Responder primeros 30 min.',
      contributes: 'distribution-strategy',
      updates: { publishPlan: { timing: 'martes 19hs', pinFirstComment: true } },
    },
    strategist: {
      thinking: 'Ubicando la pieza dentro de los pilares de contenido y serie editorial...',
      output: 'Pilar: deconstrucción del algoritmo. Encaja en serie semanal "Sistema operando".',
      contributes: 'editorial-fit',
      updates: {},
    },
    storyteller: {
      thinking: 'Tejiendo narrativa de marca para conectar emocionalmente...',
      output: 'Arco: del caos operativo a la libertad. Hook personal en slide 1.',
      contributes: 'narrative',
      updates: {},
    },
    community: {
      thinking: 'Diseñando engagement loops y respuestas para la primera hora...',
      output: 'Pregunta abierta en CTA. Bloque de 3 respuestas pre-aprobadas para FAQs.',
      contributes: 'community-engagement',
      updates: {},
    },
    growth: {
      thinking: 'Conectando con el plan de crecimiento mensual...',
      output: 'Pieza aporta a sprint actual (+5% saves esperado). Combinar con 1 collab de nicho.',
      contributes: 'growth-fit',
      updates: {},
    },
  };
  const data = outputByAgent[agentId] ?? {
    thinking: `${agent.name} analizando con su especialidad: ${agent.specialties.join(', ')}...`,
    output: `Aporte de ${agent.name}: contexto aplicado al pedido.`,
    contributes: 'context',
    updates: {},
  };
  Object.assign(scratchpad, data.updates);
  return {
    brainId: `agents-general:${agentId}`,
    brainLabel: agent.name,
    emoji: agent.emoji,
    phase,
    thinking: data.thinking,
    output: data.output,
    durationMs: Date.now() - t0,
    contributesTo: data.contributes,
  };
};

const computeInnovationScore = (scratchpad: SharedScratchpad): number => {
  // 0-100. Penaliza palabras genéricas, premia uniqueAngles y contraTakes.
  let score = 50;
  score += Math.min(scratchpad.uniqueAngles.length * 8, 30);
  score += Math.min(scratchpad.contraTakes.length * 5, 15);
  const text = `${scratchpad.copy?.headline ?? ''} ${scratchpad.copy?.caption ?? ''}`.toLowerCase();
  const generic = ['increíble', 'literalmente', 'gurú', 'game-changer', 'rompedor', 'disruptivo'];
  for (const g of generic) if (text.includes(g)) score -= 10;
  return Math.max(0, Math.min(100, score));
};

const computeInfluencerScore = (intent: MasterIntent, scratchpad: SharedScratchpad): number => {
  let score = 40;
  if (intent === 'transform-to-influencer' || intent === 'full-takeover') score += 25;
  score += Math.min(scratchpad.authorityPillars.length * 7, 25);
  if (scratchpad.copy?.headline && scratchpad.copy.headline.length > 0) score += 5;
  if (scratchpad.publishPlan) score += 5;
  return Math.max(0, Math.min(100, score));
};

const buildRecommendations = (scratchpad: SharedScratchpad, ctx: MasterContext): MasterRecommendation[] => {
  const recs: MasterRecommendation[] = [];
  if (scratchpad.uniqueAngles.length === 0) {
    recs.push({
      id: 'r-no-angle',
      type: 'innovation',
      title: 'Falta un ángulo único',
      rationale:
        'El pedido no activó ningún ángulo diferencial. Considerá agregar tu ventaja real (Computer Use en vivo, casos con números).',
      priority: 'high',
      appliesTo: 'positioning',
    });
  } else {
    recs.push({
      id: 'r-unique',
      type: 'innovation',
      title: `Aprovechá tu ángulo único: ${scratchpad.uniqueAngles[0]}`,
      rationale: 'Tu marca tiene una ventaja diferencial — usala en esta pieza para alejarte del contenido genérico.',
      priority: 'high',
      appliesTo: 'next-content',
    });
  }
  if (scratchpad.publishPlan?.pinFirstComment) {
    recs.push({
      id: 'r-pin',
      type: 'improvement',
      title: 'Pin del primer comentario con stats',
      rationale: 'En piezas educativas el pinned comment con datos aumenta saves ~30%.',
      priority: 'medium',
      appliesTo: 'distribution',
    });
  }
  if (ctx.intent === 'transform-to-influencer' && ctx.contentFormat !== 'live') {
    recs.push({
      id: 'r-live',
      type: 'opportunity',
      title: 'Convertir este contenido en un live',
      rationale: 'Tu plan influencer pide lives recurrentes. Este tema es ideal para abrir conversación.',
      priority: 'medium',
      appliesTo: 'positioning',
    });
  }
  const text = `${scratchpad.copy?.headline ?? ''} ${scratchpad.copy?.caption ?? ''}`.toLowerCase();
  const forbidden = scratchpad.voice?.forbidden ?? [];
  for (const f of forbidden) {
    if (text.includes(f.toLowerCase())) {
      recs.push({
        id: `r-forbidden-${f}`,
        type: 'warning',
        title: `Palabra prohibida detectada: "${f}"`,
        rationale: 'Esta palabra está en tu lista de forbidden — el Guardian de Coherencia recomienda reemplazarla.',
        priority: 'low',
        appliesTo: 'caption',
      });
    }
  }
  return recs;
};

export const runMasterBrain = async (ctx: MasterContext): Promise<MasterResult> => {
  const start = Date.now();
  const jobId = Date.now().toString(36);
  const steps: MasterStep[] = [];
  const brainsActivated: string[] = [];
  const scratchpad: SharedScratchpad = {
    brandValidated: false,
    uniqueAngles: [],
    contraTakes: [],
    authorityPillars: [],
  };

  log.info(`[MasterBrain] Job ${jobId} iniciado · intent=${ctx.intent} · mode=${ctx.mode}`);

  // Deliverables acumulados a través de todas las fases
  const deliverables: MasterDeliverable[] = [];

  // FASE 1: Validación de marca (Branding Brain — opcional)
  if (
    ctx.intent === 'build-brand' ||
    ctx.intent === 'evolve-brand' ||
    ctx.intent === 'transform-to-influencer' ||
    ctx.intent === 'full-takeover'
  ) {
    const t0 = Date.now();
    const brandingResult = await tryRunBrandingBrain(ctx.brand, ctx.userInput);
    if (brandingResult) {
      brainsActivated.push('branding-brain');
      scratchpad.brandValidated = true;
      scratchpad.positioning = brandingResult.brandStrategy.positioning;
      scratchpad.voice = brandingResult.voice;
      scratchpad.visual = brandingResult.visualIdentity;
      scratchpad.uniqueAngles.push(...brandingResult.differentialAngles.uniqueAngles);
      scratchpad.contraTakes.push(...brandingResult.differentialAngles.contraTakes);
      scratchpad.authorityPillars.push(...brandingResult.influencerPlan.authorityPillars);
      steps.push({
        brainId: 'branding-brain',
        brainLabel: 'Branding Brain (8 especialistas)',
        emoji: '🏛️',
        phase: 'Construcción/evolución de marca',
        thinking:
          'Los 8 especialistas en branding analizaron y entregaron estrategia, voz, visual, narrativa, diferenciales, plan influencer y coherencia.',
        output: `Posicionamiento: ${brandingResult.brandStrategy.positioning.slice(0, 100)} · Coherencia: ${brandingResult.coherenceReport.score}/100`,
        durationMs: Date.now() - t0,
        contributesTo: 'brand-foundation',
      });
    }
  } else {
    // Validación liviana sin correr todo el branding brain
    scratchpad.brandValidated = true;
    scratchpad.voice = { tone: ctx.brand.voice.tone, forbidden: ctx.brand.voice.forbidden ?? [] };
    scratchpad.visual = { palette: ctx.brand.visual.palette, mood: ctx.brand.visual.mood ?? '' };
    brainsActivated.push('brand-context');
    steps.push({
      brainId: 'brand-context',
      brainLabel: 'Validación rápida de marca',
      emoji: '🛡️',
      phase: 'Coherencia',
      thinking: 'Cargando contexto de marca actual sin re-correr todo el Branding Brain.',
      output: `Marca cargada: ${ctx.brand.name}. Voz: ${ctx.brand.voice.tone.join(', ')}.`,
      durationMs: 50,
      contributesTo: 'brand-validation',
    });
  }

  // FASE 2: Agentes generales aplicados al intent
  const agentIds = pickAgentsForIntent(ctx.intent);
  for (const agentId of agentIds) {
    const step = runGeneralAgentStep(agentId, `Aporte de ${agentId}`, scratchpad);
    steps.push(step);
    brainsActivated.push(`agents-general:${agentId}`);
  }

  // FASE 3: Si es contenido visual → activar Canva Brain
  let canvaResult: CanvaBrainResult | null = null;
  if (ctx.intent === 'create-content' || ctx.intent === 'publish' || ctx.intent === 'full-takeover') {
    if (ctx.contentFormat === 'carousel' || ctx.contentFormat === 'post' || ctx.contentFormat === 'story') {
      const t0 = Date.now();
      try {
        canvaResult = await runCanvaBrain(
          ctx.brand,
          {
            designType:
              ctx.contentFormat === 'carousel'
                ? 'instagram-carousel'
                : ctx.contentFormat === 'story'
                  ? 'instagram-story'
                  : 'instagram-post',
            topic: ctx.topic ?? ctx.userInput,
            objective: ctx.intent === 'publish' ? 'conversion' : 'engagement',
            extraInstructions: ctx.userPreferences,
          },
          ctx.mode === 'autopilot' ? 'autopilot' : 'supervisor',
        );
        scratchpad.canvaJobId = canvaResult.jobId;
        brainsActivated.push('canva-brain');
        steps.push({
          brainId: 'canva-brain',
          brainLabel: 'Canva Brain (7 agentes)',
          emoji: '🎨',
          phase: ctx.mode === 'autopilot' ? 'Diseño completo en Canva' : 'Diseño en Canva (pendiente aprobación)',
          thinking:
            '7 agentes Canva trabajaron: estrategia, copy, dirección de arte, validación, optimización Instagram, QA estético y ejecución técnica.',
          output: canvaResult.approvalRequired
            ? `PENDIENTE: aprobá para que Lucas Herrera abra Canva. Brief listo. Plan visual listo.`
            : `Canva ejecutado. Archivo en: ${canvaResult.canvaResult?.exportedFilePath ?? 'pendiente'}`,
          durationMs: Date.now() - t0,
          contributesTo: 'design-deliverable',
        });
      } catch (err) {
        log.warn(`[MasterBrain] Canva Brain falló: ${(err as Error).message}`);
      }
    }
  }

  // FASE 3b: Nuevos motores especializados por intent
  if (ctx.intent === 'manage-dms' || ctx.intent === 'full-takeover') {
    const t0 = Date.now();
    try {
      const { buildAutoResponseTemplates } = await import('./dmConversationEngine.js');
      const templates = await buildAutoResponseTemplates(ctx.brand);
      brainsActivated.push('dm-conversation-engine');
      const intentCount = Object.keys(templates).length;
      steps.push({
        brainId: 'dm-conversation-engine',
        brainLabel: 'DM Conversation Engine',
        emoji: '💬',
        phase: 'Preparación de respuestas DM',
        thinking: `Generando biblioteca de respuestas para ${intentCount} tipos de intención. Respetando voz de marca y compliance del nicho.`,
        output: `✅ ${intentCount} plantillas auto-respuesta listas. Intenciones: ${Object.keys(templates).join(', ')}.`,
        durationMs: Date.now() - t0,
        contributesTo: 'dm-automation',
      });
      deliverables.push({ kind: 'dm-templates', label: 'Plantillas de DM', payload: templates });
    } catch (err) {
      log.warn(`[MasterBrain] DM Engine falló: ${(err as Error).message}`);
    }
  }

  if (ctx.intent === 'manage-comments' || ctx.intent === 'full-takeover') {
    const t0 = Date.now();
    try {
      const { buildCommentResponseLibrary, generateSeedComments } = await import('./commentOrchestrator.js');
      const library = await buildCommentResponseLibrary(ctx.brand);
      const seeds = await generateSeedComments(
        {
          hook: scratchpad.copy?.headline ?? ctx.topic ?? 'Tu opinión',
          caption: scratchpad.copy?.caption ?? ctx.userInput,
          format: ctx.contentFormat ?? 'carrusel',
        },
        ctx.brand,
        3,
      );
      brainsActivated.push('comment-orchestrator');
      steps.push({
        brainId: 'comment-orchestrator',
        brainLabel: 'Comment Orchestrator',
        emoji: '💡',
        phase: 'Estrategia de comentarios',
        thinking:
          'Construyendo biblioteca de respuestas por sentimiento y generando comments semilla para activar el primer minuto de engagement.',
        output: `✅ Biblioteca lista. ${seeds.length} comments semilla generados para activar el post.`,
        durationMs: Date.now() - t0,
        contributesTo: 'community-engagement',
      });
      deliverables.push({ kind: 'comment-library', label: 'Biblioteca de comentarios', payload: library });
      deliverables.push({ kind: 'seed-comments', label: 'Comments semilla', payload: seeds });
    } catch (err) {
      log.warn(`[MasterBrain] Comment Orchestrator falló: ${(err as Error).message}`);
    }
  }

  if (ctx.intent === 'optimize-hashtags' || ctx.intent === 'create-content' || ctx.intent === 'full-takeover') {
    const t0 = Date.now();
    try {
      const { generateHashtagStrategy } = await import('./hashtagEngine.js');
      const strategy = await generateHashtagStrategy(ctx.brand, {
        topic: ctx.topic ?? ctx.userInput,
        format: ctx.contentFormat ?? 'carrusel',
        hook: scratchpad.copy?.headline ?? '',
      });
      brainsActivated.push('hashtag-engine');
      steps.push({
        brainId: 'hashtag-engine',
        brainLabel: 'Hashtag Engine',
        emoji: '#️⃣',
        phase: 'Estrategia de hashtags',
        thinking:
          'Construyendo estrategia en 3 niveles: primarios de autoridad, secundarios de nicho y contextuales por tema.',
        output: `✅ ${strategy.total.length} hashtags · Primarios: ${strategy.primarySet.slice(0, 3).join(', ')} · Rationale: ${strategy.rationale.slice(0, 80)}`,
        durationMs: Date.now() - t0,
        contributesTo: 'hashtag-strategy',
      });
      deliverables.push({ kind: 'hashtag-strategy', label: 'Estrategia de hashtags', payload: strategy });
      if (scratchpad.copy) {
        scratchpad.copy.caption = `${scratchpad.copy.caption}\n\n${strategy.total.join(' ')}`;
      }
    } catch (err) {
      log.warn(`[MasterBrain] Hashtag Engine falló: ${(err as Error).message}`);
    }
  }

  if (ctx.intent === 'generate-captions' || ctx.intent === 'create-content' || ctx.intent === 'full-takeover') {
    const t0 = Date.now();
    try {
      const { generateCaptionVariants } = await import('./captionGenerator.js');
      const variants = await generateCaptionVariants({
        topic: ctx.topic ?? ctx.userInput,
        format: ctx.contentFormat ?? 'carrusel',
        brand: ctx.brand,
        baseCaption: scratchpad.copy?.caption,
      });
      brainsActivated.push('caption-generator');
      steps.push({
        brainId: 'caption-generator',
        brainLabel: 'Caption Generator',
        emoji: '✍️',
        phase: 'Captions y variantes',
        thinking: 'Generando 4 variantes de caption: primaria, casual, formal y corta para A/B testing.',
        output: `✅ 4 variantes listas. Hook principal: "${variants.primary.hook.slice(0, 60)}…"`,
        durationMs: Date.now() - t0,
        contributesTo: 'caption-variants',
      });
      deliverables.push({ kind: 'caption-variants', label: 'Variantes de caption', payload: variants });
    } catch (err) {
      log.warn(`[MasterBrain] Caption Generator falló: ${(err as Error).message}`);
    }
  }

  if (ctx.intent === 'schedule-queue' || ctx.intent === 'full-takeover') {
    const t0 = Date.now();
    try {
      const { getPublishingWindows } = await import('./contentQueue.js');
      const windows = getPublishingWindows(ctx.brand);
      const primeWindows = windows.filter((w) => w.quality === 'prime').slice(0, 5);
      brainsActivated.push('content-queue');
      steps.push({
        brainId: 'content-queue',
        brainLabel: 'Content Queue',
        emoji: '📅',
        phase: 'Ventanas óptimas de publicación',
        thinking: 'Calculando ventanas prime de publicación según audiencia y locale.',
        output: `✅ ${primeWindows.length} ventanas prime identificadas. Mejor momento: ${primeWindows[0] ? `${['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][primeWindows[0].dayOfWeek]} ${primeWindows[0].hour}:00hs` : 'martes 20hs'}`,
        durationMs: Date.now() - t0,
        contributesTo: 'scheduling',
      });
      deliverables.push({ kind: 'publishing-windows', label: 'Ventanas de publicación', payload: primeWindows });
    } catch (err) {
      log.warn(`[MasterBrain] Content Queue falló: ${(err as Error).message}`);
    }
  }

  if (
    ctx.intent === 'analyze' ||
    ctx.intent === 'full-takeover' ||
    ctx.intent === 'detect-trends' ||
    ctx.intent === 'analyze-competitors'
  ) {
    // Trending Engine
    const t0Trends = Date.now();
    try {
      const { detectTrends } = await import('./trendingEngine.js');
      const report = await detectTrends(ctx.brand);
      brainsActivated.push('trending-engine');
      steps.push({
        brainId: 'trending-engine',
        brainLabel: 'Trending Engine',
        emoji: '📈',
        phase: 'Detección de tendencias',
        thinking: 'Analizando tendencias actuales relevantes para el nicho y audiencia de la marca.',
        output: `✅ ${report.trends.length} tendencias detectadas. Top: "${report.topPicks[0]?.name ?? '—'}" (${report.topPicks[0]?.momentum ?? ''}).`,
        durationMs: Date.now() - t0Trends,
        contributesTo: 'trend-intelligence',
      });
      deliverables.push({
        kind: 'trending-report',
        label: 'Reporte de tendencias',
        payload: {
          brandId: report.brandId,
          count: report.trends.length,
          topPicks: report.topPicks.map((t) => t.name),
          summary: report.summary,
        },
      });
    } catch (err) {
      log.warn(`[MasterBrain] Trending Engine falló: ${(err as Error).message}`);
    }

    // Competitor Adaptation Engine
    const t0Comp = Date.now();
    try {
      const { analyzeCompetitors } = await import('./competitorAdaptation.js');
      const compReport = await analyzeCompetitors(ctx.brand);
      brainsActivated.push('competitor-adaptation');
      steps.push({
        brainId: 'competitor-adaptation',
        brainLabel: 'Competitor Adaptation Engine',
        emoji: '🔍',
        phase: 'Análisis de competencia',
        thinking: 'Analizando competidores del nicho, identificando gaps y oportunidades de diferenciación.',
        output: `✅ ${compReport.competitors.length} competidores analizados. ${compReport.topOpportunities.length} oportunidades top identificadas.`,
        durationMs: Date.now() - t0Comp,
        contributesTo: 'competitive-intelligence',
      });
      deliverables.push({
        kind: 'competitor-report',
        label: 'Análisis de competencia',
        payload: {
          brandId: compReport.brandId,
          competitors: compReport.competitors.length,
          topOpportunities: compReport.topOpportunities.map((o) => o.title),
          position: compReport.competitivePosition,
        },
      });
    } catch (err) {
      log.warn(`[MasterBrain] Competitor Adaptation falló: ${(err as Error).message}`);
    }
  }

  // FASE 4: Si es publish → generar plan de Computer Use
  if (ctx.intent === 'publish' || ctx.intent === 'full-takeover') {
    const t0 = Date.now();
    const plan = planComputerUse(`publicar ${ctx.contentFormat ?? 'post'} ${ctx.topic ? `sobre ${ctx.topic}` : ''}`);
    brainsActivated.push('planner');
    steps.push({
      brainId: 'planner',
      brainLabel: 'Planner Computer Use',
      emoji: '🧭',
      phase: 'Plan de publicación',
      thinking: 'Generando plan determinista de acciones en Instagram (cursor + teclado).',
      output: `Plan con ${plan.actions.length} acciones. ${plan.requiresApproval ? 'Requiere aprobación.' : 'Listo para ejecutar.'}`,
      durationMs: Date.now() - t0,
      contributesTo: 'publish-plan',
    });
  }

  // Métricas y recomendaciones finales
  const innovationScore = computeInnovationScore(scratchpad);
  const influencerScore = computeInfluencerScore(ctx.intent, scratchpad);
  const brandCoherenceScore = scratchpad.brandValidated ? 90 : 60;
  const recommendations = buildRecommendations(scratchpad, ctx);

  // Agregar deliverables de las fases anteriores (copy, canva, publish)
  if (scratchpad.copy) deliverables.push({ kind: 'copy', label: 'Copy generado', payload: scratchpad.copy });
  if (canvaResult)
    deliverables.push({
      kind: 'canva-job',
      label: 'Job de Canva',
      payload: { jobId: canvaResult.jobId, approvalRequired: canvaResult.approvalRequired },
    });
  if (scratchpad.publishPlan)
    deliverables.push({ kind: 'publish-plan', label: 'Plan de publicación', payload: scratchpad.publishPlan });

  const nextActions: MasterNextAction[] = [];
  if (canvaResult?.approvalRequired)
    nextActions.push({
      label: 'Aprobar y abrir Canva',
      apiCall: `POST /api/cu/canva/brain/${canvaResult.jobId}/approve`,
    });
  if (ctx.intent === 'create-content') nextActions.push({ label: 'Ver el plan visual', route: 'studio-carousel' });
  if (ctx.intent === 'build-brand' || ctx.intent === 'evolve-brand')
    nextActions.push({ label: 'Ir a Personalización', route: 'personalization' });
  if (recommendations.some((r) => r.type === 'warning'))
    nextActions.push({ label: 'Revisar advertencias', route: 'workspace' });

  const approvalRequired =
    ctx.mode === 'supervisor' &&
    (canvaResult?.approvalRequired ?? (ctx.intent === 'publish' || ctx.intent === 'full-takeover'));

  const totalDurationMs = Date.now() - start;
  log.info(
    `[MasterBrain] Job ${jobId} completado · brains=${brainsActivated.length} · innovation=${innovationScore} · influencer=${influencerScore}`,
  );

  return {
    ok: true,
    jobId,
    intent: ctx.intent,
    mode: ctx.mode,
    steps,
    brainsActivated,
    finalOutput: {
      summary: `${ctx.intent} · ${brainsActivated.length} cerebros activados · ${steps.length} pasos · ${approvalRequired ? 'pendiente tu OK' : 'listo'}.`,
      deliverables,
      nextActions,
    },
    recommendations,
    innovationScore,
    influencerScore,
    brandCoherenceScore,
    totalDurationMs,
    approvalRequired,
  };
};
