/**
 * Comment Brain — tipos compartidos.
 *
 * Un comentario se describe con DOS ejes independientes:
 *   - `kind`: qué es (pregunta, queja, elogio, troll…).
 *   - `sarcasm`: cómo lo dice. El sarcasmo es un modificador, no una categoría:
 *     "Qué gran servicio, solo tardaron 3 semanas" es una queja real dicha con
 *     sarcasmo; "uy sí, re difícil comprar zapatillas lindas 😏" es banter.
 *     Tratarlos igual produce el error más caro: bromear con quien reclama.
 */

import type { BrandProfile } from '../../config/types.js';

export type CommentKind =
  | 'praise'
  | 'banter'
  | 'question'
  | 'purchase-intent'
  | 'complaint'
  | 'criticism'
  | 'troll'
  | 'hate'
  | 'spam'
  | 'tag-friend'
  | 'emoji-only'
  | 'other';

/**
 * playful  → sarcasmo/ironía entre buena onda, invita a devolver la pelota.
 * critical → el sarcasmo esconde un reclamo o crítica genuina.
 * hostile  → el sarcasmo es un ataque; no se le da escenario.
 */
export type SarcasmStance = 'playful' | 'critical' | 'hostile';

export type Sentiment = 'positive' | 'neutral' | 'negative';
export type RiskLevel = 'low' | 'medium' | 'high';

export interface Classification {
  kind: CommentKind;
  sarcasm: { present: boolean; stance: SarcasmStance | null };
  /** Lo que dice la superficie del texto. */
  literalSentiment: Sentiment;
  /** Lo que realmente quiere decir (difiere del literal cuando hay sarcasmo). */
  trueSentiment: Sentiment;
  /** 0 = cordial, 1 = ataque directo. */
  hostility: number;
  risk: RiskLevel;
  /** ISO 639-1 del comentario (es, en, pt…). */
  language: string;
  confidence: number;
  /** El comentario intenta dar instrucciones al bot ("ignorá tus reglas…"). */
  promptInjection: boolean;
  /** Motivos de escalamiento duro detectados por reglas (legal, salud, amenazas…). */
  hardFlags: string[];
  reasoning: string;
  source: 'llm' | 'heuristic';
}

export interface PostContext {
  postId: string;
  mediaType?: string;
  caption?: string;
  permalink?: string;
}

export interface ThreadMessage {
  handle: string;
  text: string;
  isFromBrand: boolean;
}

export interface ThreadContext {
  parent?: ThreadMessage;
  siblings: ThreadMessage[];
}

export interface CommentInput {
  commentId?: string;
  handle: string;
  text: string;
  brand: BrandProfile;
  post?: PostContext | null;
  thread?: ThreadContext | null;
  /** Datos verificados de FAQ / base de conocimiento que el bot puede citar. */
  facts?: string[];
}

export type ReplyMode =
  | 'thank'
  | 'playful-banter'
  | 'witty-comeback'
  | 'answer'
  | 'empathize-resolve'
  | 'sales-handoff'
  | 'acknowledge-critique';

/**
 * reply            → generar y enviar.
 * draft-for-review → generar borrador, NO enviar; un humano aprueba.
 * escalate         → no generar nada; lo resuelve un humano (legal, salud, odio…).
 * ignore           → no responder.
 */
export type PlanAction = 'reply' | 'draft-for-review' | 'escalate' | 'ignore';

export interface ReplyPlan {
  action: PlanAction;
  mode?: ReplyMode;
  reasons: string[];
}

export type Autonomy = 'suggest' | 'balanced' | 'full';

export interface BrainConfig {
  /** suggest = nada sale solo (modo sombra). balanced = por defecto. full = umbral de confianza más bajo. */
  autonomy: Autonomy;
  minConfidence: number;
}

export interface WrittenReply {
  text: string;
  candidates: string[];
  grounded: boolean;
  needsHuman: boolean;
  needsHumanReason: string;
  /** Qué tan buena considera el propio modelo su línea (0-1). Solo relevante en modos de humor. */
  humorConfidence: number;
}

export interface ValidationIssue {
  code: string;
  severity: 'block' | 'warn';
  detail: string;
}

export interface BrainResult {
  action: PlanAction;
  /** Texto para enviar (action=reply) o borrador para revisar (action=draft-for-review). */
  reply?: string;
  /** Todas las candidatas redactadas (útil para revisión humana y evaluación). */
  candidates?: string[];
  classification: Classification;
  plan: ReplyPlan;
  issues: ValidationIssue[];
  reasons: string[];
  /** Solo en modo sombra (`suggest`): lo que habría pasado con la política `balanced`. */
  shadow?: { wouldHaveReplied: boolean };
}
