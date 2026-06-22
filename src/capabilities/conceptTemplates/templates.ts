/**
 * Concept Templates Library
 * ─────────────────────────────────────────────────────────────────────────
 * "Plantillas Conceptuales" — full-piece blueprints beyond just hooks. Each
 * template captures the complete narrative scaffold of a proven content
 * format: slide-by-slide structure for carousels, beat-by-beat structure for
 * reels, frame-by-frame for stories.
 *
 * The Autonomous Producer can pick a template, fill the slots with brand-
 * aware copy, and produce a piece that follows a proven container — not
 * just a strong opener.
 *
 * Each template includes:
 *   • A skeleton with named slots the producer must fill
 *   • The funnel position it serves (awareness / consideration / conversion)
 *   • Format compatibility
 *   • Baseline performance signal
 *   • Why this structure outperforms freeform pieces in this slot
 */

import type { ContentFormat } from '../../config/types.js';

export type FunnelPosition = 'awareness' | 'consideration' | 'conversion' | 'retention';
export type TemplateGoal = 'guardable' | 'compartible' | 'comentable' | 'leads' | 'autoridad' | 'entretenimiento';

export interface TemplateSlot {
  key: string;
  /** What the slot represents narratively. */
  role: string;
  /** Prescription the producer must fulfill when filling this slot. */
  instruction: string;
  /** Soft cap on length (chars). */
  maxLength?: number;
}

export interface ConceptTemplate {
  id: string;
  name: string;
  format: ContentFormat;
  funnelPosition: FunnelPosition;
  goals: TemplateGoal[];
  /** Ordered slots that compose the piece end-to-end. */
  slots: TemplateSlot[];
  baselineScore: number;
  whyItWorks: string;
  example: string;
  pitfalls: string[];
}

const TEMPLATES: ConceptTemplate[] = [
  // ── Carousels ─────────────────────────────────────────────────────────
  {
    id: 'tpl-tutorial-5-slide',
    name: 'Tutorial 5-slide',
    format: 'carrusel',
    funnelPosition: 'consideration',
    goals: ['guardable', 'autoridad'],
    slots: [
      {
        key: 'cover',
        role: 'Cover / promesa',
        instruction: 'Hook con número + verbo + resultado tangible ("Cómo X en 5 pasos")',
        maxLength: 90,
      },
      {
        key: 'step1',
        role: 'Paso 1 — punto de partida',
        instruction: 'El primer movimiento. Sin contexto largo, acción directa.',
        maxLength: 220,
      },
      {
        key: 'step2',
        role: 'Paso 2 — escalada',
        instruction: 'Construir sobre paso 1 con un detalle no obvio.',
        maxLength: 220,
      },
      {
        key: 'step3',
        role: 'Paso 3 — pivote',
        instruction: 'El paso "clic" donde el resultado se vuelve real.',
        maxLength: 220,
      },
      { key: 'cta', role: 'CTA + guardado', instruction: 'Pedir save + invitar a aplicar paso 1 hoy.', maxLength: 160 },
    ],
    baselineScore: 78,
    whyItWorks:
      'La estructura "promesa → 3 pasos numerados → cierre" maximiza save porque cada paso es escaneable de un golpe.',
    example: 'Cómo cerrar una propuesta de USD 5K en 5 pasos.',
    pitfalls: ['Pasos genéricos sin detalle accionable', 'Más de 5 slides — diluye la promesa'],
  },
  {
    id: 'tpl-controversy-carousel',
    name: 'Controversy carousel',
    format: 'carrusel',
    funnelPosition: 'awareness',
    goals: ['compartible', 'comentable'],
    slots: [
      {
        key: 'thesis',
        role: 'Tesis impopular',
        instruction: 'Frase rotunda contra el consenso del nicho. Sin matices.',
        maxLength: 110,
      },
      {
        key: 'context',
        role: 'Por qué todos piensan lo contrario',
        instruction: 'El argumento dominante en 2 líneas — sin caricaturizar.',
        maxLength: 240,
      },
      {
        key: 'evidence-1',
        role: 'Evidencia 1 a favor de tu tesis',
        instruction: 'Dato concreto o caso real que la sostiene.',
        maxLength: 200,
      },
      {
        key: 'evidence-2',
        role: 'Evidencia 2',
        instruction: 'Segundo ángulo de prueba — diferente al primero.',
        maxLength: 200,
      },
      {
        key: 'caveat',
        role: 'Cuándo NO aplica',
        instruction: 'Honestidad: el contexto donde el consenso sí tiene razón.',
        maxLength: 200,
      },
      {
        key: 'cta',
        role: 'Pregunta divisiva',
        instruction: 'Cerrar con pregunta que obligue a tomar postura en comentarios.',
        maxLength: 140,
      },
    ],
    baselineScore: 82,
    whyItWorks:
      'Tesis fuerte + evidencia + caveat genera credibilidad y al mismo tiempo el "caveat" desactiva al hater más obvio.',
    example: 'Opinión impopular: publicar un reel diario destruye más cuentas de las que crece.',
    pitfalls: ['Tesis débil disfrazada de controversial', 'No defender con evidencia concreta'],
  },
  {
    id: 'tpl-case-study-carousel',
    name: 'Caso real desarmado',
    format: 'carrusel',
    funnelPosition: 'consideration',
    goals: ['autoridad', 'guardable'],
    slots: [
      {
        key: 'cover',
        role: 'Cover con resultado',
        instruction: 'Resultado concreto + lapso de tiempo + variable única.',
        maxLength: 100,
      },
      {
        key: 'context',
        role: 'Punto de partida',
        instruction: 'Estado inicial honesto, sin maquillaje. Métricas reales.',
        maxLength: 220,
      },
      {
        key: 'hypothesis',
        role: 'Hipótesis que probamos',
        instruction: 'La apuesta concreta que se hizo y por qué.',
        maxLength: 200,
      },
      {
        key: 'execution',
        role: 'Qué se hizo',
        instruction: 'Las 3 acciones medibles. No "trabajé duro".',
        maxLength: 240,
      },
      {
        key: 'result',
        role: 'Resultado real',
        instruction: 'Números antes/después con la metric clave.',
        maxLength: 180,
      },
      {
        key: 'lesson',
        role: 'Lección reusable',
        instruction: 'La regla generalizable que sale del caso.',
        maxLength: 200,
      },
      { key: 'cta', role: 'CTA', instruction: 'Invitación a aplicar la lección + pedir save.', maxLength: 140 },
    ],
    baselineScore: 80,
    whyItWorks: 'El framework caso real = credibilidad máxima + reusable, lo que detona save y mensajes "lo aplico".',
    example: 'De 200 a 1.800 leads/mes cambiando solo una variable. El caso completo.',
    pitfalls: ['Cifras sin contexto', 'Saltarse el contexto inicial'],
  },
  {
    id: 'tpl-comparison-carousel',
    name: 'Comparación práctica',
    format: 'carrusel',
    funnelPosition: 'consideration',
    goals: ['guardable', 'autoridad'],
    slots: [
      {
        key: 'cover',
        role: 'Cover A vs B',
        instruction: 'Las dos opciones + para qué objetivo se comparan.',
        maxLength: 90,
      },
      { key: 'criterion1', role: 'Criterio 1', instruction: 'Comparación honesta en eje 1.', maxLength: 200 },
      { key: 'criterion2', role: 'Criterio 2', instruction: 'Comparación en eje 2.', maxLength: 200 },
      {
        key: 'criterion3',
        role: 'Criterio 3',
        instruction: 'Comparación en eje 3 — el trade-off invisible.',
        maxLength: 200,
      },
      {
        key: 'verdict',
        role: 'Veredicto contextual',
        instruction: 'Cuándo A es mejor, cuándo B — no neutrales.',
        maxLength: 220,
      },
      { key: 'cta', role: 'CTA', instruction: 'Pregunta por experiencia + save.', maxLength: 140 },
    ],
    baselineScore: 75,
    whyItWorks:
      'Las comparaciones específicas con verdict claro son altísimas en save porque "vuelvo cuando tenga que decidir".',
    example: 'Notion vs. Linear para producto: los 3 ejes que importan.',
    pitfalls: ['Veredicto neutro que no compromete'],
  },

  // ── Reels ──────────────────────────────────────────────────────────────
  {
    id: 'tpl-pov-reel',
    name: 'POV reel',
    format: 'reel',
    funnelPosition: 'awareness',
    goals: ['compartible', 'entretenimiento'],
    slots: [
      {
        key: 'pov-hook',
        role: 'Beat 1 (0-2s) — POV hook',
        instruction: '"POV: [situación cotidiana del nicho con tensión]".',
        maxLength: 80,
      },
      {
        key: 'escalation',
        role: 'Beat 2 (2-6s) — escalada',
        instruction: 'La situación se vuelve absurda o reveladora. Acción visual.',
        maxLength: 160,
      },
      {
        key: 'twist',
        role: 'Beat 3 (6-10s) — twist',
        instruction: 'Punchline o giro que cambia la lectura del POV.',
        maxLength: 140,
      },
      {
        key: 'cta',
        role: 'Beat 4 (10-12s) — CTA',
        instruction: 'Pregunta que invite a "me pasó" en comentarios + share.',
        maxLength: 120,
      },
    ],
    baselineScore: 81,
    whyItWorks:
      'Los POV reels acumulan share masivo en stories porque el espectador se identifica e instintivamente lo manda a un colega.',
    example: 'POV: tu cliente pide "una versión más linda pero igual" por sexta vez.',
    pitfalls: ['POV demasiado nicho', 'Twist débil que no justifica el setup'],
  },
  {
    id: 'tpl-tutorial-reel',
    name: 'Tutorial reel rápido',
    format: 'reel',
    funnelPosition: 'consideration',
    goals: ['guardable', 'autoridad'],
    slots: [
      {
        key: 'hook',
        role: 'Beat 1 (0-3s) — promesa',
        instruction: 'Promesa numérica + verbo de acción ("3 atajos para...").',
        maxLength: 80,
      },
      {
        key: 'step1',
        role: 'Beat 2 (3-8s) — paso 1',
        instruction: 'Acción concreta + texto overlay que la nombra.',
        maxLength: 120,
      },
      {
        key: 'step2',
        role: 'Beat 3 (8-13s) — paso 2',
        instruction: 'Segundo paso, mantener el ritmo visual.',
        maxLength: 120,
      },
      {
        key: 'step3',
        role: 'Beat 4 (13-18s) — paso 3',
        instruction: 'Tercer paso con el "clic" del resultado.',
        maxLength: 120,
      },
      { key: 'cta', role: 'Beat 5 (18-21s) — CTA', instruction: 'Pedir save + "aplicalo hoy".', maxLength: 80 },
    ],
    baselineScore: 79,
    whyItWorks:
      'Estructura "promesa + 3 pasos visuales + CTA save" maximiza completion rate y saves; el algoritmo lo amplifica.',
    example: '3 atajos de Premiere que reducen el edit a la mitad.',
    pitfalls: ['Pasos muy abstractos', 'Más de 3 pasos en 21s'],
  },
  {
    id: 'tpl-founder-pov-reel',
    name: 'Founder POV reel',
    format: 'reel',
    funnelPosition: 'awareness',
    goals: ['autoridad', 'compartible'],
    slots: [
      {
        key: 'declaration',
        role: 'Beat 1 (0-3s) — declaración',
        instruction: '"Después de [tiempo/experiencia], descubrí esto…" en cara directa.',
        maxLength: 100,
      },
      {
        key: 'context',
        role: 'Beat 2 (3-7s) — el contexto',
        instruction: 'Por qué importa este descubrimiento. Tensión emocional sutil.',
        maxLength: 150,
      },
      {
        key: 'insight',
        role: 'Beat 3 (7-12s) — el insight',
        instruction: 'La revelación concreta. Una sola idea, clara.',
        maxLength: 180,
      },
      {
        key: 'application',
        role: 'Beat 4 (12-16s) — cómo aplicarlo',
        instruction: 'Acción que el espectador puede tomar hoy.',
        maxLength: 120,
      },
      {
        key: 'cta',
        role: 'Beat 5 (16-18s) — invitación',
        instruction: 'Invitar a comentar la propia experiencia.',
        maxLength: 80,
      },
    ],
    baselineScore: 77,
    whyItWorks: 'El "founder POV" combina autoridad humilde + insight + acción — alto save y comentario.',
    example: 'Después de 4 años cobrando por hora, descubrí esto sobre el precio.',
    pitfalls: ['Sonar a gurú', 'Insight genérico'],
  },

  // ── Stories ────────────────────────────────────────────────────────────
  {
    id: 'tpl-engagement-story-sequence',
    name: 'Engagement story (3 frames)',
    format: 'historia',
    funnelPosition: 'retention',
    goals: ['comentable', 'compartible'],
    slots: [
      {
        key: 'tease',
        role: 'Frame 1 — tease',
        instruction: 'Frase abierta que invite al interés. Sin interacción todavía.',
        maxLength: 100,
      },
      {
        key: 'interact',
        role: 'Frame 2 — interacción',
        instruction: 'Slider/poll/quiz/pregunta abierta que active al lector.',
        maxLength: 80,
      },
      {
        key: 'reveal-cta',
        role: 'Frame 3 — payoff + CTA',
        instruction: 'Mostrar respuesta o conclusión + pedir DM o save de un post.',
        maxLength: 100,
      },
    ],
    baselineScore: 72,
    whyItWorks: 'Stories con micro-interacción reactivan el ranking para todo el segmento dormido en 24-48h.',
    example: 'F1: "Tengo un dato que me voló la cabeza" → F2: poll "¿adivinás?" → F3: dato + invitación a DM.',
    pitfalls: ['Sin interacción explícita', 'CTA débil'],
  },
  {
    id: 'tpl-launch-story-sequence',
    name: 'Launch story (5 frames)',
    format: 'historia',
    funnelPosition: 'conversion',
    goals: ['leads'],
    slots: [
      {
        key: 'problem',
        role: 'Frame 1 — el problema',
        instruction: 'Verbalizar el dolor concreto que la oferta resuelve.',
        maxLength: 100,
      },
      {
        key: 'cost',
        role: 'Frame 2 — costo de no resolverlo',
        instruction: 'El impacto de no actuar — sin manipulación.',
        maxLength: 100,
      },
      {
        key: 'solution',
        role: 'Frame 3 — la oferta',
        instruction: 'Presentar la oferta clara con nombre + propuesta de valor.',
        maxLength: 100,
      },
      {
        key: 'proof',
        role: 'Frame 4 — prueba',
        instruction: 'Caso/testimonio/número que dé credibilidad.',
        maxLength: 100,
      },
      {
        key: 'cta',
        role: 'Frame 5 — CTA con urgencia honesta',
        instruction: 'Link sticker + razón legítima para actuar hoy.',
        maxLength: 100,
      },
    ],
    baselineScore: 76,
    whyItWorks: 'Secuencia problema → costo → solución → prueba → CTA es el funnel completo de Stories en 90 segundos.',
    example: 'Lanzamiento de cohorte: F1-F5 con todo el embudo en stories del miércoles.',
    pitfalls: ['Saltarse el frame de costo', 'Falsa urgencia'],
  },

  // ── Post-imagen ────────────────────────────────────────────────────────
  {
    id: 'tpl-quote-post',
    name: 'Quote post denso',
    format: 'post-imagen',
    funnelPosition: 'awareness',
    goals: ['compartible', 'autoridad'],
    slots: [
      { key: 'quote', role: 'Frase principal', instruction: 'Una sola oración rotunda. Sin adornos.', maxLength: 140 },
      {
        key: 'attribution',
        role: 'Atribución mínima',
        instruction: 'Tu nombre/marca o fuente — sutil.',
        maxLength: 40,
      },
      {
        key: 'caption',
        role: 'Caption-extensión',
        instruction: 'Caption que desarrolle la frase en 4-6 oraciones. Vale por sí solo.',
        maxLength: 700,
      },
      {
        key: 'cta',
        role: 'CTA + pregunta',
        instruction: 'Pregunta concreta para detonar comentarios.',
        maxLength: 140,
      },
    ],
    baselineScore: 73,
    whyItWorks: 'El quote post es alto save + alto share cuando la frase tiene punch — el caption lo justifica.',
    example: 'Frase: "El cliente que no te entiende no es tu cliente". Caption desarrolla el porqué con un caso.',
    pitfalls: ['Frase genérica de Pinterest', 'Caption que repite la frase sin profundizar'],
  },
];

export const CONCEPT_TEMPLATES: ReadonlyArray<ConceptTemplate> = TEMPLATES;

export const getTemplateById = (id: string): ConceptTemplate | undefined => TEMPLATES.find((t) => t.id === id);

export const getTemplatesByFormat = (format: ContentFormat): ConceptTemplate[] =>
  TEMPLATES.filter((t) => t.format === format);

export const getTemplatesByFunnel = (position: FunnelPosition): ConceptTemplate[] =>
  TEMPLATES.filter((t) => t.funnelPosition === position);

export const getTemplatesByGoal = (goal: TemplateGoal): ConceptTemplate[] =>
  TEMPLATES.filter((t) => t.goals.includes(goal));

/**
 * Recommend the single best template for a (format, funnel, goal) combination.
 * Pure deterministic — Autonomous Producer uses this to pick scaffolding.
 */
export const recommendTemplate = (params: {
  format: ContentFormat;
  funnelPosition?: FunnelPosition;
  primaryGoal?: TemplateGoal;
}): ConceptTemplate | null => {
  const candidates = TEMPLATES.filter((t) => t.format === params.format);
  if (candidates.length === 0) return null;
  const score = (t: ConceptTemplate): number => {
    let s = t.baselineScore;
    if (params.funnelPosition && t.funnelPosition === params.funnelPosition) s += 12;
    if (params.primaryGoal && t.goals.includes(params.primaryGoal)) s += 10;
    return s;
  };
  return candidates.slice().sort((a, b) => score(b) - score(a))[0]!;
};
