/**
 * Directive Engine — Types
 * ─────────────────────────────────────────────────────────────────────────
 * A "Directive" is a standing instruction the user gives in plain language
 * (voice or written on the Pizarra/agenda/calendar):
 *
 *   "Subí 1 carrusel de imágenes por día"
 *   "Respondé todos los mensajes"
 *   "Publicá 3 reels por semana sobre automatización"
 *   "Comentá en 5 cuentas faro cada lunes"
 *
 * The system parses it into a structured Directive, schedules its recurrence,
 * and on each due tick executes it end-to-end through the right engines
 * (produce → brand → score → originality → publish, or respond DMs, etc.).
 *
 * This is the bridge between a human goal and full autonomous execution.
 */

export type DirectiveAction =
  | 'publish-carousel'
  | 'publish-reel'
  | 'publish-story'
  | 'publish-post'
  | 'respond-dms'
  | 'respond-comments'
  | 'engage-faro' // comment on reference accounts
  | 'grow-followers' // run a growth playbook
  | 'audit' // run weekly KPI audit
  | 'optimize' // run auto-optimization loop
  | 'plan-week' // plan the content calendar
  | 'custom'; // free-form → delegated to Talía

export type Recurrence =
  | { kind: 'once'; at?: string }
  | { kind: 'daily'; times: number; hour?: number }
  | { kind: 'weekly'; times: number; days?: number[] }
  | { kind: 'hourly'; everyHours: number }
  | { kind: 'continuous' }; // e.g. "respondé todos los mensajes" — every tick

export interface ContentSpec {
  /** Topic / angle constraint, if the user specified one. */
  topic?: string;
  /** Format implied by the action. */
  format?: 'carrusel' | 'reel' | 'historia' | 'post-imagen';
  /** Whether to apply brand kit + render before publishing. */
  applyBranding: boolean;
  /** Whether to actually publish (vs. leave for human approval). */
  autoPublish: boolean;
}

export type DirectiveStatus = 'active' | 'paused' | 'completed' | 'error';

export interface Directive {
  id: string;
  brandId: string;
  /** The original user text (voice or written). */
  rawText: string;
  /** Where it came from. */
  source: 'voz' | 'pizarra' | 'calendario' | 'agenda' | 'texto';
  action: DirectiveAction;
  recurrence: Recurrence;
  contentSpec: ContentSpec;
  status: DirectiveStatus;
  createdAt: string;
  /** Next time this directive should fire (ISO). */
  nextRunAt?: string;
  lastRunAt?: string;
  runCount: number;
  /** Human-readable interpretation Talía/parser produced. */
  interpretation: string;
}

export interface DirectiveRun {
  id: string;
  directiveId: string;
  startedAt: string;
  finishedAt?: string;
  status: 'ok' | 'partial' | 'failed' | 'skipped';
  /** What the engine actually did, step by step. */
  steps: Array<{ label: string; status: 'ok' | 'failed' | 'skipped'; detail?: string }>;
  /** Produced artifact id (piece id / mission id) if any. */
  artifactId?: string;
  summary: string;
}
