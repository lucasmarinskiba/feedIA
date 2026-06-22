import { brandContext, getAnalyticsContext } from './memory.js';
import { getLessonsForAgent } from '../os/agentEvolution.js';
import type { BrandProfile } from '../config/types.js';
import type { AgentTypeCategory } from './agentTypes.js';

export type AutonomyLevel = 'full' | 'checkpoint' | 'assist_only';
export type CheckpointType =
  | 'publish'
  | 'dm_reply_sales'
  | 'collab_offer'
  | 'crisis_response'
  | 'ad_spend'
  | 'pricing_disclosure'
  | 'strategy_change'
  | 'nurture_change'
  | 'boost_post'
  | 'cambiar_estética'
  | 'gastar_api'
  | 'budget_change'
  | 'campaign_launch'
  | 'offer_pricing'
  | 'scarcity_timing'
  | 'deal_close'
  | 'pricing_change'
  | 'revenue_report'
  | 'lead_hot'
  | 'human_handoff'
  | 'content_approval';

export interface AgentDefinition {
  id: string;
  name: string;
  emoji: string;
  gradient: string;
  tagline: string;
  description: string;
  specialties: string[];
  systemPrompt: (brand: BrandProfile) => string;
  toolNames: string[];
  autonomyLevel: AutonomyLevel;
  humanCheckpoints: CheckpointType[];
  triggers: string[]; // event types this agent listens to
  maxIterations: number;
  preferFastModel: boolean;
  /** Clasificación técnica IBM del agente (simple_reflex, model_based_reflex, goal_based, utility_based, learning) */
  agentType?: AgentTypeCategory;
}

const AGENTS: AgentDefinition[] = [];

export const registerAgent = (def: AgentDefinition): void => {
  const existing = AGENTS.find((a) => a.id === def.id);
  if (existing) {
    const idx = AGENTS.indexOf(existing);
    AGENTS[idx] = def;
  } else {
    AGENTS.push(def);
  }
};

export const getAgent = (id: string): AgentDefinition | undefined => AGENTS.find((a) => a.id === id);

export const listAgents = (): AgentDefinition[] => [...AGENTS];

export const getAgentsByTrigger = (eventType: string): AgentDefinition[] =>
  AGENTS.filter((a) => a.triggers.includes(eventType) || a.triggers.includes('*'));

export const getAgentsByAutonomy = (level: AutonomyLevel): AgentDefinition[] =>
  AGENTS.filter((a) => a.autonomyLevel === level);

export const getAgentsByType = (type: AgentTypeCategory): AgentDefinition[] =>
  AGENTS.filter((a) => a.agentType === type);

export const buildSystemPrompt = (agent: AgentDefinition, brand: BrandProfile): string => {
  const autonomyText =
    agent.autonomyLevel === 'full'
      ? 'Tenés autonomía completa para actuar sin pedir permiso, salvo en los checkpoints explícitos.'
      : agent.autonomyLevel === 'checkpoint'
        ? 'Debés pedir aprobación humana antes de cualquier acción crítica (publicar, vender, gastar, responder crisis).'
        : 'Trabajás en modo asistencia: generás borradores, insights y propuestas, pero no ejecutás acciones directas.';

  return `${agent.systemPrompt(brand)}

${autonomyText}

Checkpoints que requerís humano: ${agent.humanCheckpoints.join(', ') || 'ninguno'}.

Reglas de orquestación:
- Cuando completés una tarea, devolvé un resumen estructurado con claves: ok (boolean), summary (string), artifacts (array), nextSteps (array de strings), y si requiere checkpoint: checkpointRequired (boolean), checkpointType (string), checkpointDescription (string).
- Si detectás un error o algo fuera de tu alcance, emití un evento de escalación.
- No generés clickbait ni promesas vacías.
- Respetá el tono de marca y las palabras prohibidas.`;
};

// Helper to create base agent definitions with brand context
export const createAgentBase = (
  id: string,
  name: string,
  emoji: string,
  gradient: string,
  tagline: string,
  description: string,
  specialties: string[],
  opts: {
    toolNames: string[];
    autonomyLevel: AutonomyLevel;
    humanCheckpoints: CheckpointType[];
    triggers: string[];
    maxIterations?: number;
    preferFastModel?: boolean;
    extraPrompt?: string;
    agentType?: AgentTypeCategory;
  },
): AgentDefinition => {
  const systemPrompt = (brand: BrandProfile): string => {
    const analytics = getAnalyticsContext(brand.name);
    const lessons = getLessonsForAgent(id, 3);
    const lessonsText =
      lessons.length > 0
        ? `\n📚 LECCIONES APRENDIDAS (aplicá estas mejoras en tu trabajo):\n${lessons.map((l) => `  - [${l.impact.toUpperCase()}] ${l.lesson}`).join('\n')}\n`
        : '';
    const base = `Sos ${name}, ${description}.

${brandContext(brand)}

${analytics ? `${analytics}\n` : ''}${lessonsText}
Especialidades: ${specialties.join(', ')}.

${opts.extraPrompt ?? ''}

Respondé siempre en español rioplatense. Sé específico, concreto y accionable. Dá ejemplos listos para usar cuando sea posible.`;
    return base;
  };

  return {
    id,
    name,
    emoji,
    gradient,
    tagline,
    description,
    specialties,
    systemPrompt,
    toolNames: opts.toolNames,
    autonomyLevel: opts.autonomyLevel,
    humanCheckpoints: opts.humanCheckpoints,
    triggers: opts.triggers,
    maxIterations: opts.maxIterations ?? 8,
    preferFastModel: opts.preferFastModel ?? false,
    agentType: opts.agentType,
  };
};
