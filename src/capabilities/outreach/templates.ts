/**
 * Outreach DM Templates Library
 * ─────────────────────────────────────────────────────────────────────────
 * Curated DM/comment outreach templates for the brand's growth motion.
 * Each template is a SEQUENCE (1–5 steps) with explicit purpose, trigger,
 * and timing between steps. The orchestrator picks the right sequence based
 * on conversational intent (from convoRouter) + funnel position.
 *
 * Categories:
 *   • cold-lead          — first contact with a follower who never bought
 *   • warm-follow-up     — second touchpoint after engagement signal
 *   • post-comment       — reply to a meaningful comment to deepen relationship
 *   • collab-pitch       — proactive collab outreach to creators
 *   • abandoned-funnel   — re-engagement after click without conversion
 *   • re-activation      — for previously active users now dormant
 *
 * Each step has placeholders ({nombre}, {producto}, etc.) the orchestrator
 * fills before sending.
 */

export type OutreachCategory =
  | 'cold-lead'
  | 'warm-follow-up'
  | 'post-comment'
  | 'collab-pitch'
  | 'abandoned-funnel'
  | 're-activation';

export type OutreachTrigger =
  | 'new-follower'
  | 'engaged-without-buying'
  | 'meaningful-comment'
  | 'collab-fit-detected'
  | 'visited-link-no-action'
  | 'dormant-for-30d';

export interface OutreachStep {
  /** 1-based step number in the sequence. */
  step: number;
  /** Delay AFTER previous step, in hours. Step 1 has delayHours=0. */
  delayHours: number;
  /** What this step tries to achieve. */
  intent: string;
  /** Message body with {placeholder} slots. */
  body: string;
  /** Optional: action expected from recipient before next step fires. */
  expectsResponse: boolean;
  /** Optional: stop sequence here if recipient hasn't replied. */
  branchOnNoReply?: 'stop' | 'next-step';
}

export interface OutreachTemplate {
  id: string;
  name: string;
  category: OutreachCategory;
  trigger: OutreachTrigger;
  /** How aggressive vs subtle the touchpoint is. */
  intensity: 'baja' | 'media' | 'alta';
  /** A/B variants of the same sequence to test. */
  variants: {
    label: string;
    steps: OutreachStep[];
  }[];
  whyItWorks: string;
  /** Hard cap on conversion rate this template realistically targets. */
  expectedReplyRate: number; // 0–1
  pitfalls: string[];
}

const TEMPLATES: OutreachTemplate[] = [
  // ── Cold lead ─────────────────────────────────────────────────────────
  {
    id: 'out-cold-soft-intro',
    name: 'Cold soft intro',
    category: 'cold-lead',
    trigger: 'new-follower',
    intensity: 'baja',
    variants: [
      {
        label: 'A — pregunta abierta',
        steps: [
          {
            step: 1,
            delayHours: 0,
            intent: 'romper hielo sin pitch',
            body: 'Hola {nombre}! Vi que te sumaste 🙌 ¿qué te trajo por acá?',
            expectsResponse: true,
            branchOnNoReply: 'stop',
          },
          {
            step: 2,
            delayHours: 72,
            intent: 'aportar valor sin pedir nada',
            body: 'Bueno, no quería invadirte. Por las dudas: armé esta {recurso-gratuito} que cubre {beneficio-específico}. Si te sirve te la paso.',
            expectsResponse: true,
            branchOnNoReply: 'stop',
          },
        ],
      },
      {
        label: 'B — contexto + pregunta cerrada',
        steps: [
          {
            step: 1,
            delayHours: 0,
            intent: 'mostrar contexto antes de la pregunta',
            body: 'Hola {nombre}! Solemos publicar sobre {nicho}. ¿Estás más en el lado de {persona-A} o {persona-B}?',
            expectsResponse: true,
            branchOnNoReply: 'stop',
          },
          {
            step: 2,
            delayHours: 48,
            intent: 'follow-up segmentado',
            body: 'Te paso algo puntual entonces: {recurso-personalizado} basado en lo que mencionaste. Sin compromiso.',
            expectsResponse: false,
          },
        ],
      },
    ],
    whyItWorks:
      'Cero pitch en step 1 + pregunta abierta = altísima tasa de respuesta. La oferta de valor llega solo si hay conversación previa.',
    expectedReplyRate: 0.28,
    pitfalls: ['Pitch en step 1', 'Pregunta cerrada con "sí" como única respuesta'],
  },

  // ── Warm follow-up ────────────────────────────────────────────────────
  {
    id: 'out-warm-after-save',
    name: 'Warm — post save',
    category: 'warm-follow-up',
    trigger: 'engaged-without-buying',
    intensity: 'media',
    variants: [
      {
        label: 'A — referencia explícita',
        steps: [
          {
            step: 1,
            delayHours: 0,
            intent: 'señalar que vimos el engagement',
            body: 'Hola {nombre}! Vi que guardaste el post sobre {tema}. ¿Algo específico que estés intentando aplicar?',
            expectsResponse: true,
            branchOnNoReply: 'next-step',
          },
          {
            step: 2,
            delayHours: 96,
            intent: 'ofrecer ayuda concreta',
            body: 'Si te quedaste con alguna duda puntual de eso, podés mandarme — me clavo media hora a leer DMs los miércoles 👀',
            expectsResponse: true,
            branchOnNoReply: 'stop',
          },
        ],
      },
      {
        label: 'B — sin referencia, contexto general',
        steps: [
          {
            step: 1,
            delayHours: 0,
            intent: 'pregunta directa de contexto',
            body: 'Hola {nombre}! ¿Cómo va con {tema-de-la-marca}? Me interesa entender qué está pasando del lado de la gente.',
            expectsResponse: true,
            branchOnNoReply: 'stop',
          },
        ],
      },
    ],
    whyItWorks:
      'La referencia explícita al engagement previo demuestra atención humana y multiplica la tasa de respuesta 3-5×.',
    expectedReplyRate: 0.42,
    pitfalls: ['Sonar a robot / referencia vaga al guardado'],
  },

  // ── Post-comment ──────────────────────────────────────────────────────
  {
    id: 'out-comment-deep',
    name: 'Post-comment deepening',
    category: 'post-comment',
    trigger: 'meaningful-comment',
    intensity: 'media',
    variants: [
      {
        label: 'A — extender el thread',
        steps: [
          {
            step: 1,
            delayHours: 0,
            intent: 'profundizar lo que dijo en el comentario',
            body: '{nombre}, super interesante lo que mencionaste sobre {tema-comentado}. ¿Es algo que te pasó a vos directamente o lo viste con clientes?',
            expectsResponse: true,
            branchOnNoReply: 'stop',
          },
          {
            step: 2,
            delayHours: 24,
            intent: 'compartir recurso relacionado',
            body: 'Te mando esto que tiene que ver: {link-o-pieza}. Curioso a ver qué te parece — si te suma o no para tu caso.',
            expectsResponse: true,
            branchOnNoReply: 'stop',
          },
        ],
      },
    ],
    whyItWorks:
      'Tomar un comentario y profundizar 1:1 convierte engagement público en relación privada — base de leads y referrals.',
    expectedReplyRate: 0.55,
    pitfalls: ['No referenciar lo específico que dijo'],
  },

  // ── Collab pitch ──────────────────────────────────────────────────────
  {
    id: 'out-collab-soft',
    name: 'Collab soft pitch',
    category: 'collab-pitch',
    trigger: 'collab-fit-detected',
    intensity: 'media',
    variants: [
      {
        label: 'A — admiración + idea concreta',
        steps: [
          {
            step: 1,
            delayHours: 0,
            intent: 'romper hielo con observación específica',
            body: 'Hola {nombre}! Soy {firma}. Sigo lo que hacés sobre {nicho-creador}, me gustó mucho {post-específico-reciente}.',
            expectsResponse: false,
          },
          {
            step: 2,
            delayHours: 24,
            intent: 'proponer idea concreta',
            body: 'Tengo una idea de colab puntual: {idea-colaboración-en-una-línea}. ¿Te late? Si no me mata, sigo tu camino.',
            expectsResponse: true,
            branchOnNoReply: 'stop',
          },
        ],
      },
    ],
    whyItWorks:
      'Step 1 sin pitch + step 2 con idea concreta evita el spam "querés colaborar?" — tasa de respuesta 4× superior.',
    expectedReplyRate: 0.32,
    pitfalls: ['Pitch genérico en step 1', 'Idea de colab demasiado abstracta'],
  },

  // ── Abandoned funnel ──────────────────────────────────────────────────
  {
    id: 'out-abandoned-help',
    name: 'Abandoned — friendly check-in',
    category: 'abandoned-funnel',
    trigger: 'visited-link-no-action',
    intensity: 'baja',
    variants: [
      {
        label: 'A — sin presión',
        steps: [
          {
            step: 1,
            delayHours: 24,
            intent: 'check-in honesto',
            body: 'Hola {nombre}, vi que entraste al link de {oferta}. Sin presión: ¿hubo algo puntual que no te quedó claro? Si querés te mando un audio con la respuesta.',
            expectsResponse: true,
            branchOnNoReply: 'stop',
          },
        ],
      },
    ],
    whyItWorks: 'El check-in sin presión + oferta de un audio personalizado convierte fricción en confianza.',
    expectedReplyRate: 0.18,
    pitfalls: ['Sonar a "vendo todavía?"'],
  },

  // ── Re-activation ─────────────────────────────────────────────────────
  {
    id: 'out-reactivation-callback',
    name: 'Re-activation — callback',
    category: 're-activation',
    trigger: 'dormant-for-30d',
    intensity: 'baja',
    variants: [
      {
        label: 'A — referencia a contenido viejo',
        steps: [
          {
            step: 1,
            delayHours: 0,
            intent: 'recordar momento previo',
            body: 'Hola {nombre}! Hace un tiempo te interesaste por {tema-pasado}. Cambiaron varias cosas desde entonces — ¿te interesaría que te cuente lo nuevo en 3 puntos?',
            expectsResponse: true,
            branchOnNoReply: 'stop',
          },
        ],
      },
    ],
    whyItWorks:
      'Llamar la atención a un interés pasado activa el efecto de "ya invertí tiempo acá" y reabre la conversación.',
    expectedReplyRate: 0.22,
    pitfalls: ['No tener un tema-pasado real al que referirse'],
  },
];

export const OUTREACH_TEMPLATES: ReadonlyArray<OutreachTemplate> = TEMPLATES;

export const getOutreachByCategory = (category: OutreachCategory): OutreachTemplate[] =>
  TEMPLATES.filter((t) => t.category === category);

export const getOutreachByTrigger = (trigger: OutreachTrigger): OutreachTemplate[] =>
  TEMPLATES.filter((t) => t.trigger === trigger);

export const getOutreachById = (id: string): OutreachTemplate | undefined => TEMPLATES.find((t) => t.id === id);

/**
 * Pick the best outreach template for a given trigger + intensity preference.
 */
export const recommendOutreach = (
  trigger: OutreachTrigger,
  intensity: 'baja' | 'media' | 'alta' = 'baja',
): OutreachTemplate | null => {
  const candidates = TEMPLATES.filter((t) => t.trigger === trigger);
  if (candidates.length === 0) return null;
  // Prefer matching intensity, otherwise highest expected reply rate.
  const exact = candidates.find((t) => t.intensity === intensity);
  return exact ?? candidates.slice().sort((a, b) => b.expectedReplyRate - a.expectedReplyRate)[0]!;
};

/**
 * Fill placeholder slots in a template step with provided values.
 * Unknown placeholders are left as-is so the operator can spot them.
 */
export const renderStep = (step: OutreachStep, values: Record<string, string>): string =>
  step.body.replace(/\{([a-z0-9-]+)\}/gi, (_, key) => values[key] ?? `{${key}}`);

/** Hint type for the orchestrator. */
export type SequenceVariantId = `${string}-${number}`; // templateId-variantIdx
