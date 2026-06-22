/**
 * Hook Pattern Library
 * ─────────────────────────────────────────────────────────────────────────
 * Curated knowledge base of proven viral hook patterns used by top creators
 * in 2024–2026. Each pattern carries:
 *   • its skeleton (fill-in-the-blank template)
 *   • the psychological mechanism it activates
 *   • formats where it tends to outperform
 *   • a real-world example
 *   • a base retention score (0–100) derived from observed performance
 *
 * The library is consumed by:
 *   • Hook scorer — to grade user-written hooks against known winners
 *   • Hook matcher — to recommend the right pattern for an idea
 *   • Autonomous producer — to seed new content with a proven structure
 *
 * It is intentionally static (not LLM-generated) so the system has a stable
 * playbook it can reference even when offline.
 */

export type HookFormat = 'reel' | 'carrusel' | 'post-imagen' | 'historia' | 'live';

export type PsychTrigger =
  | 'curiosidad'
  | 'contrarian'
  | 'tension'
  | 'especificidad'
  | 'autoridad'
  | 'pertenencia'
  | 'urgencia'
  | 'sorpresa'
  | 'identificacion'
  | 'aspiracion'
  | 'miedo-perder'
  | 'ego-validacion';

export type HookCategory =
  | 'educativo'
  | 'controversial'
  | 'storytelling'
  | 'entretenimiento'
  | 'transformacion'
  | 'lista'
  | 'pregunta-abierta'
  | 'revelacion'
  | 'comparacion'
  | 'callout';

export interface HookPattern {
  id: string;
  name: string;
  category: HookCategory;
  /** Skeleton with `{x}`, `{y}` placeholders for the AI/user to fill. */
  skeleton: string;
  /** The single psychological lever this hook pulls hardest. */
  primaryTrigger: PsychTrigger;
  /** Secondary supporting triggers. */
  secondaryTriggers: PsychTrigger[];
  /** Formats where this pattern outperforms its baseline. */
  bestFormats: HookFormat[];
  /** Observed retention proxy (0–100) — used as base score in the scorer. */
  baselineScore: number;
  /** Why the brain can't help but keep watching/reading. */
  whyItWorks: string;
  example: string;
  /** Known failure modes — what kills the hook if done poorly. */
  pitfalls: string[];
}

/* ──────────────────────────────────────────────────────────────────────── */

const PATTERNS: HookPattern[] = [
  // ── Educativo ─────────────────────────────────────────────────────────
  {
    id: 'edu-error-comun',
    name: 'El error común',
    category: 'educativo',
    skeleton: 'El {n}% de la gente que {actividad} comete este error sin saberlo.',
    primaryTrigger: 'miedo-perder',
    secondaryTriggers: ['curiosidad', 'autoridad'],
    bestFormats: ['reel', 'carrusel'],
    baselineScore: 78,
    whyItWorks: 'Activa el sesgo de pérdida: el espectador necesita confirmar que no es uno de ese %.',
    example: 'El 87% de las marcas que invierten en ads cometen este error en la primera semana.',
    pitfalls: ['Usar números inventados sin sustento', 'Generalizar al "todos"'],
  },
  {
    id: 'edu-tres-cosas',
    name: 'Tres cosas que no te dicen',
    category: 'educativo',
    skeleton: '3 cosas que nadie te dice sobre {tema} (la #{n} cambia todo).',
    primaryTrigger: 'curiosidad',
    secondaryTriggers: ['autoridad', 'pertenencia'],
    bestFormats: ['carrusel', 'reel'],
    baselineScore: 75,
    whyItWorks: 'Promesa enumerada + curiosity gap específico al ítem N.',
    example: '3 cosas que nadie te dice sobre delegar tareas con IA (la #2 me ahorró 12 horas/semana).',
    pitfalls: ['Que la #N prometida sea débil', 'Repetir lo que ya está en YouTube'],
  },
  {
    id: 'edu-mapa-mental',
    name: 'El mapa mental',
    category: 'educativo',
    skeleton: 'Cómo {grupo-X} piensa {tema} vs. cómo lo piensa {grupo-Y}.',
    primaryTrigger: 'identificacion',
    secondaryTriggers: ['aspiracion', 'curiosidad'],
    bestFormats: ['carrusel'],
    baselineScore: 72,
    whyItWorks: 'El lector quiere validarse en el grupo "ganador".',
    example: 'Cómo un freelancer piensa el precio vs. cómo lo piensa un consultor.',
    pitfalls: ['Caer en estereotipos planos sin matiz'],
  },

  // ── Controversial ─────────────────────────────────────────────────────
  {
    id: 'con-opinion-impopular',
    name: 'Opinión impopular',
    category: 'controversial',
    skeleton: 'Opinión impopular: {tesis-contraria-al-consenso}.',
    primaryTrigger: 'contrarian',
    secondaryTriggers: ['tension', 'autoridad'],
    bestFormats: ['post-imagen', 'reel', 'carrusel'],
    baselineScore: 82,
    whyItWorks: 'La disonancia con el consenso obliga a leer para refutar o validar.',
    example: 'Opinión impopular: hacer un reel diario destruye tu cuenta más rápido que no hacer ninguno.',
    pitfalls: ['Ser contrarian por contrarian', 'No defender la tesis con argumentos sólidos'],
  },
  {
    id: 'con-todos-estan-mal',
    name: 'Todos están mal',
    category: 'controversial',
    skeleton: 'Todos están haciendo {practica-comun} mal. Yo también, hasta que aprendí esto.',
    primaryTrigger: 'tension',
    secondaryTriggers: ['curiosidad', 'pertenencia'],
    bestFormats: ['reel', 'carrusel'],
    baselineScore: 80,
    whyItWorks: 'Combina señalamiento del problema + vulnerabilidad propia + promesa de solución.',
    example: 'Todos están haciendo cold DMs mal. Yo también, hasta que entendí esta secuencia de 4 mensajes.',
    pitfalls: ['Sonar arrogante', 'Que la solución sea genérica'],
  },
  {
    id: 'con-deja-de-hacer',
    name: 'Deja de hacer X',
    category: 'controversial',
    skeleton: 'Si {actividad-X}, dejá de hacerlo. Te explico por qué.',
    primaryTrigger: 'tension',
    secondaryTriggers: ['autoridad', 'urgencia'],
    bestFormats: ['reel'],
    baselineScore: 76,
    whyItWorks: 'Orden directa + promesa de fundamentación crea curiosidad inmediata.',
    example: 'Si publicás 1 reel al día, dejá de hacerlo. Te explico qué cambia con menos volumen.',
    pitfalls: ['Que la razón sea débil', 'Ordenar sin autoridad construida'],
  },

  // ── Storytelling ──────────────────────────────────────────────────────
  {
    id: 'sto-de-cero',
    name: 'De cero a algo',
    category: 'storytelling',
    skeleton: 'Pasé de {estado-inicial-doloroso} a {estado-final-deseable} en {tiempo}. Así.',
    primaryTrigger: 'aspiracion',
    secondaryTriggers: ['curiosidad', 'identificacion'],
    bestFormats: ['carrusel', 'reel'],
    baselineScore: 79,
    whyItWorks: 'El arco de transformación es el patrón narrativo más antiguo y efectivo.',
    example: 'Pasé de 200 seguidores a 28K en 6 meses publicando 2 veces por semana. Así.',
    pitfalls: ['Sonar a coach mediocre', 'Saltarse el "cómo"'],
  },
  {
    id: 'sto-momento-quiebre',
    name: 'El momento de quiebre',
    category: 'storytelling',
    skeleton: 'El día que {evento-puntual} cambió cómo pienso {ámbito} para siempre.',
    primaryTrigger: 'curiosidad',
    secondaryTriggers: ['tension', 'identificacion'],
    bestFormats: ['reel', 'carrusel', 'historia'],
    baselineScore: 77,
    whyItWorks: 'Marca un antes y un después concreto — promesa de revelación.',
    example: 'El día que perdí mi cliente más grande cambió cómo cobro para siempre.',
    pitfalls: ['Construir un evento que no merece el peso narrativo'],
  },
  {
    id: 'sto-fracaso-aprendizaje',
    name: 'El fracaso que enseñó',
    category: 'storytelling',
    skeleton: 'Quemé {recurso} en {experimento-fallido}. Lo que aprendí vale {valor-implícito}.',
    primaryTrigger: 'curiosidad',
    secondaryTriggers: ['autoridad', 'identificacion'],
    bestFormats: ['carrusel', 'reel'],
    baselineScore: 78,
    whyItWorks: 'Vulnerabilidad + lección concreta = altísima tasa de save.',
    example: 'Quemé USD 3.400 en ads de Meta probando 6 audiencias. Lo que aprendí vale el doble.',
    pitfalls: ['Que el aprendizaje sea trivial'],
  },

  // ── Transformación ────────────────────────────────────────────────────
  {
    id: 'tra-antes-despues',
    name: 'Antes / Después extremo',
    category: 'transformacion',
    skeleton: '{estado-A-malo} → {estado-B-bueno}. La diferencia: {variable-clave}.',
    primaryTrigger: 'sorpresa',
    secondaryTriggers: ['aspiracion', 'especificidad'],
    bestFormats: ['carrusel', 'reel', 'post-imagen'],
    baselineScore: 81,
    whyItWorks: 'Contraste visual y conceptual fuerte + atribución a una sola variable.',
    example: '200 leads/mes → 1.800 leads/mes. La diferencia: cambiamos la oferta, no el copy.',
    pitfalls: ['Cherry picking', 'Atribución única irreal'],
  },
  {
    id: 'tra-paso-a-paso',
    name: 'El sistema en N pasos',
    category: 'transformacion',
    skeleton: 'Cómo {resultado-deseable} en {n} pasos (probado con {nº-casos}).',
    primaryTrigger: 'aspiracion',
    secondaryTriggers: ['autoridad', 'especificidad'],
    bestFormats: ['carrusel', 'reel'],
    baselineScore: 76,
    whyItWorks: 'Promesa procedural + prueba social numérica.',
    example: 'Cómo cerrar una propuesta de USD 5K en 4 pasos (probado con 47 prospects).',
    pitfalls: ['Pasos genéricos sin sustancia'],
  },

  // ── Lista ─────────────────────────────────────────────────────────────
  {
    id: 'lis-herramientas',
    name: 'Lista de herramientas',
    category: 'lista',
    skeleton: '{n} herramientas que reemplazan a un equipo de {tipo-de-equipo}.',
    primaryTrigger: 'aspiracion',
    secondaryTriggers: ['curiosidad', 'urgencia'],
    bestFormats: ['carrusel'],
    baselineScore: 74,
    whyItWorks: 'Eficiencia + curiosidad por cada item de la lista.',
    example: '7 herramientas que reemplazan a un equipo de marketing de 4 personas.',
    pitfalls: ['Listar lo conocido', 'No explicar el cuándo usar cada una'],
  },
  {
    id: 'lis-cosas-que-nadie',
    name: 'Lista de no-obvios',
    category: 'lista',
    skeleton: '{n} {sustantivos} que {grupo} usa y nadie en {nicho} conoce.',
    primaryTrigger: 'curiosidad',
    secondaryTriggers: ['pertenencia', 'ego-validacion'],
    bestFormats: ['carrusel', 'reel'],
    baselineScore: 73,
    whyItWorks: 'Exclusividad de información + identificación con un grupo aspiracional.',
    example: '5 técnicas de copywriting que los redactores senior usan y nadie en LinkedIn conoce.',
    pitfalls: ['Que las técnicas sean fáciles de googlear'],
  },

  // ── Pregunta abierta ──────────────────────────────────────────────────
  {
    id: 'pre-si-tuvieras',
    name: 'Si tuvieras que...',
    category: 'pregunta-abierta',
    skeleton: 'Si tuvieras que {acción-extrema}, ¿{decisión-difícil}?',
    primaryTrigger: 'identificacion',
    secondaryTriggers: ['curiosidad', 'tension'],
    bestFormats: ['post-imagen', 'historia', 'reel'],
    baselineScore: 71,
    whyItWorks: 'Pregunta hipotética concreta detona auto-reflexión + comentarios.',
    example: 'Si tuvieras que reconstruir tu cuenta desde 0 hoy, ¿qué dejarías de hacer?',
    pitfalls: ['Que la pregunta sea demasiado abstracta'],
  },
  {
    id: 'pre-elegirias',
    name: 'Elegirías A o B',
    category: 'pregunta-abierta',
    skeleton: '¿Elegirías {opción-A} o {opción-B}? La mayoría se equivoca.',
    primaryTrigger: 'tension',
    secondaryTriggers: ['curiosidad', 'ego-validacion'],
    bestFormats: ['post-imagen', 'historia'],
    baselineScore: 70,
    whyItWorks: 'Trampa binaria + acusación de error general fuerza respuesta defensiva.',
    example: '¿Elegirías cerrar 1 cliente de USD 10K o 10 de USD 1K? La mayoría se equivoca.',
    pitfalls: ['Falsa dicotomía evidente'],
  },

  // ── Revelación ────────────────────────────────────────────────────────
  {
    id: 'rev-secreto-de',
    name: 'El secreto de',
    category: 'revelacion',
    skeleton: 'El secreto que {grupo-élite} usa para {resultado} (y nadie cuenta).',
    primaryTrigger: 'curiosidad',
    secondaryTriggers: ['miedo-perder', 'autoridad'],
    bestFormats: ['reel', 'carrusel'],
    baselineScore: 77,
    whyItWorks: 'Información asimétrica + insider knowledge = save inmediato.',
    example: 'El secreto que los closers de USD 1M usan para nunca bajar precio (y nadie cuenta).',
    pitfalls: ['Que el "secreto" sea de manual'],
  },
  {
    id: 'rev-detras-de',
    name: 'Detrás de escena',
    category: 'revelacion',
    skeleton: 'Detrás de {resultado-impresionante}: lo que realmente pasa.',
    primaryTrigger: 'curiosidad',
    secondaryTriggers: ['identificacion', 'sorpresa'],
    bestFormats: ['reel', 'historia', 'carrusel'],
    baselineScore: 74,
    whyItWorks: 'Promesa de transparencia activa la sensación de acceso privilegiado.',
    example: 'Detrás de un launch de USD 50K en 72hs: lo que realmente pasa.',
    pitfalls: ['Mostrar humo en lugar de proceso'],
  },

  // ── Comparación ───────────────────────────────────────────────────────
  {
    id: 'com-A-vs-B',
    name: 'A vs B real',
    category: 'comparacion',
    skeleton: '{opción-A} vs. {opción-B} para {objetivo}: lo que nadie te dice del trade-off.',
    primaryTrigger: 'curiosidad',
    secondaryTriggers: ['autoridad', 'especificidad'],
    bestFormats: ['carrusel', 'reel'],
    baselineScore: 75,
    whyItWorks: 'Comparación práctica con foco en el trade-off invisible.',
    example: 'Notion vs. Linear para producto: lo que nadie te dice del trade-off de la curva.',
    pitfalls: ['Sesgar sin transparencia'],
  },
  {
    id: 'com-yo-vs-yo',
    name: 'Yo antes vs. yo ahora',
    category: 'comparacion',
    skeleton: 'Yo {tiempo-pasado} {creencia-vieja}. Yo hoy: {creencia-nueva}.',
    primaryTrigger: 'identificacion',
    secondaryTriggers: ['aspiracion', 'tension'],
    bestFormats: ['post-imagen', 'carrusel'],
    baselineScore: 72,
    whyItWorks: 'Auto-contradicción genera curiosidad por la transición.',
    example: 'Yo hace 3 años: "el contenido es rey". Yo hoy: "la distribución es Dios y el contenido el sacerdote".',
    pitfalls: ['Sonar pretencioso'],
  },

  // ── Callout ───────────────────────────────────────────────────────────
  {
    id: 'cal-si-eres',
    name: 'Si eres X, necesitás esto',
    category: 'callout',
    skeleton: 'Si {condición-específica}, este {recurso} es para vos.',
    primaryTrigger: 'pertenencia',
    secondaryTriggers: ['urgencia', 'aspiracion'],
    bestFormats: ['reel', 'post-imagen', 'historia'],
    baselineScore: 73,
    whyItWorks: 'Segmentación explícita + valor específico = autoselección de la audiencia correcta.',
    example: 'Si tenés menos de 5K seguidores y vendés servicios, este audit gratuito es para vos.',
    pitfalls: ['Segmentación demasiado amplia'],
  },
  {
    id: 'cal-llamada-de-atencion',
    name: 'Llamada de atención',
    category: 'callout',
    skeleton: '{Tipo-de-persona}: parate. Esto te va a doler pero necesitás escucharlo.',
    primaryTrigger: 'tension',
    secondaryTriggers: ['urgencia', 'pertenencia'],
    bestFormats: ['reel'],
    baselineScore: 76,
    whyItWorks: 'Interrupción directa + promesa de verdad incómoda = retención máxima en 3s.',
    example: 'Founders solos: parate. Esto te va a doler pero necesitás escucharlo sobre tu pricing.',
    pitfalls: ['No entregar la verdad prometida'],
  },

  // ── Entretenimiento ───────────────────────────────────────────────────
  {
    id: 'ent-pov-extremo',
    name: 'POV extremo',
    category: 'entretenimiento',
    skeleton: 'POV: {situación-extrema-pero-real-en-el-nicho}.',
    primaryTrigger: 'identificacion',
    secondaryTriggers: ['sorpresa', 'pertenencia'],
    bestFormats: ['reel'],
    baselineScore: 79,
    whyItWorks: 'Formato POV + identificación dolorosa = share masivo en stories.',
    example: 'POV: tu cliente te pide "una versión más linda pero igual" por sexta vez.',
    pitfalls: ['POV demasiado nicho o demasiado abstracto'],
  },
  {
    id: 'ent-cuando-X-pero-Y',
    name: 'Cuando X pero Y',
    category: 'entretenimiento',
    skeleton: 'Cuando {situación-cotidiana} pero {giro-irónico}.',
    primaryTrigger: 'sorpresa',
    secondaryTriggers: ['identificacion', 'pertenencia'],
    bestFormats: ['reel', 'post-imagen'],
    baselineScore: 70,
    whyItWorks: 'Setup-punchline mínimo. La ironía detona share inmediato.',
    example: 'Cuando te contratan por estrategia pero solo te dejan ajustar fuentes.',
    pitfalls: ['Humor que solo entiende el creator'],
  },
];

export const HOOK_PATTERNS: ReadonlyArray<HookPattern> = PATTERNS;

export const getPatternsByCategory = (category: HookCategory): HookPattern[] =>
  PATTERNS.filter((p) => p.category === category);

export const getPatternsByFormat = (format: HookFormat): HookPattern[] =>
  PATTERNS.filter((p) => p.bestFormats.includes(format));

export const getPatternsByTrigger = (trigger: PsychTrigger): HookPattern[] =>
  PATTERNS.filter((p) => p.primaryTrigger === trigger || p.secondaryTriggers.includes(trigger));

export const getPatternById = (id: string): HookPattern | undefined => PATTERNS.find((p) => p.id === id);

export const listCategories = (): HookCategory[] => [
  'educativo',
  'controversial',
  'storytelling',
  'entretenimiento',
  'transformacion',
  'lista',
  'pregunta-abierta',
  'revelacion',
  'comparacion',
  'callout',
];

export const listTriggers = (): PsychTrigger[] => [
  'curiosidad',
  'contrarian',
  'tension',
  'especificidad',
  'autoridad',
  'pertenencia',
  'urgencia',
  'sorpresa',
  'identificacion',
  'aspiracion',
  'miedo-perder',
  'ego-validacion',
];
