/**
 * Visual Hook Library
 * ─────────────────────────────────────────────────────────────────────────
 * Curated library of VISUAL composition patterns proven to stop the scroll
 * on Instagram. Complements the textual Hook Library — every reel cover,
 * carousel front-slide and post-imagen needs both.
 *
 * Each pattern describes:
 *   • the composition rule (where text/face/object sit on the canvas)
 *   • why it interrupts the feed (high contrast, face-direct, oversized text,
 *     visual incompleteness, color anomaly, etc.)
 *   • the formats it works best in
 *   • baseline retention proxy from observed performance
 *   • a brief "shoot/design" instruction so a designer or image-gen can
 *     implement it directly
 */

export type VisualFormat = 'reel-cover' | 'carrusel-slide-1' | 'post-imagen' | 'historia';
export type CompositionRule =
  | 'rule-of-thirds'
  | 'centered-subject'
  | 'face-direct'
  | 'oversized-text'
  | 'split-screen'
  | 'before-after'
  | 'cutout-on-flat'
  | 'top-text-center-face'
  | 'arrow-pointing-text'
  | 'color-pop-on-neutral'
  | 'list-numbered-overlay'
  | 'incomplete-visual';

export type VisualTrigger =
  | 'contraste-extremo'
  | 'mirada-directa'
  | 'curiosidad-visual'
  | 'jerarquía-tipográfica'
  | 'novedad-cromática'
  | 'gestalt-incompleta'
  | 'autoridad-numérica'
  | 'identificación-pov';

export interface VisualHookPattern {
  id: string;
  name: string;
  composition: CompositionRule;
  primaryTrigger: VisualTrigger;
  secondaryTriggers: VisualTrigger[];
  bestFormats: VisualFormat[];
  baselineScore: number;
  /** A one-line description of the rule, in plain Spanish for designers. */
  designInstruction: string;
  /** Specific layout — text placement, image placement, color rules. */
  layout: {
    textPosition: 'top' | 'center' | 'bottom' | 'top-bottom' | 'overlay';
    textSize: 'oversized' | 'large' | 'medium' | 'small';
    subjectPosition: 'left' | 'right' | 'center' | 'none';
    palette: 'high-contrast' | 'monochrome' | 'brand-pop' | 'neutral-with-accent';
  };
  whyItStops: string;
  pitfalls: string[];
  example: string;
}

const PATTERNS: VisualHookPattern[] = [
  {
    id: 'vh-face-direct',
    name: 'Cara mirando a cámara',
    composition: 'face-direct',
    primaryTrigger: 'mirada-directa',
    secondaryTriggers: ['identificación-pov'],
    bestFormats: ['reel-cover', 'carrusel-slide-1'],
    baselineScore: 84,
    designInstruction:
      'Foto frontal del creador mirando directo al lente, ocupando 55–70% del frame; expresión de duda/sorpresa que NO sea sonrisa por defecto.',
    layout: { textPosition: 'top-bottom', textSize: 'large', subjectPosition: 'center', palette: 'brand-pop' },
    whyItStops: 'La mirada humana activa instintivamente la corteza social — el cerebro no puede no procesarla.',
    pitfalls: ['Sonrisa neutra de stock', 'Mirada perdida en el infinito', 'Cara demasiado pequeña'],
    example:
      'Cover de reel: cara con cejas levantadas, texto arriba "El error que cometí" y abajo "y cómo lo solucioné".',
  },
  {
    id: 'vh-oversized-text',
    name: 'Texto gigante sobre fondo plano',
    composition: 'oversized-text',
    primaryTrigger: 'jerarquía-tipográfica',
    secondaryTriggers: ['contraste-extremo'],
    bestFormats: ['carrusel-slide-1', 'post-imagen'],
    baselineScore: 79,
    designInstruction:
      'Texto que ocupa 60%+ del frame, peso ≥800, sobre fondo plano de un solo color de la paleta. Sin imagen.',
    layout: { textPosition: 'center', textSize: 'oversized', subjectPosition: 'none', palette: 'high-contrast' },
    whyItStops: 'El contraste tipográfico extremo crea una "valla" visual que rompe el ritmo del feed.',
    pitfalls: ['Tres líneas de tamaños distintos', 'Sombras o efectos que ensucian'],
    example: '"3 cosas que no te dije" en negro sobre amarillo eléctrico, peso 900, 60% del slide.',
  },
  {
    id: 'vh-arrow-text',
    name: 'Flecha apuntando texto',
    composition: 'arrow-pointing-text',
    primaryTrigger: 'curiosidad-visual',
    secondaryTriggers: ['jerarquía-tipográfica'],
    bestFormats: ['post-imagen', 'carrusel-slide-1'],
    baselineScore: 76,
    designInstruction:
      'Foto del creador/objeto + flecha dibujada a mano alzada o vector que apunta a una palabra clave overlay. La flecha debe sentirse manuscrita.',
    layout: { textPosition: 'overlay', textSize: 'large', subjectPosition: 'left', palette: 'brand-pop' },
    whyItStops: 'La flecha dirige la atención antes de que el cerebro decida ignorar — micro-acción de seguir.',
    pitfalls: ['Flecha perfecta de stock que rompe la sensación auténtica'],
    example: 'Foto del founder + flecha curva → "esto es lo que NO contó nadie".',
  },
  {
    id: 'vh-split-screen',
    name: 'Split screen antes/después',
    composition: 'split-screen',
    primaryTrigger: 'contraste-extremo',
    secondaryTriggers: ['curiosidad-visual'],
    bestFormats: ['reel-cover', 'carrusel-slide-1', 'post-imagen'],
    baselineScore: 81,
    designInstruction:
      'Mitad arriba/abajo o izquierda/derecha. Contraste fuerte entre lados — colores opuestos o estados opuestos. Etiquetas mínimas.',
    layout: { textPosition: 'top-bottom', textSize: 'medium', subjectPosition: 'center', palette: 'high-contrast' },
    whyItStops: 'La asimetría visual fuerza al cerebro a comparar — micro-engagement obligado.',
    pitfalls: ['Lados sin contraste claro', 'Etiquetas largas que diluyen'],
    example: 'Izquierda: feed desordenado, "ANTES". Derecha: feed limpio, "DESPUÉS".',
  },
  {
    id: 'vh-cutout-flat',
    name: 'Cutout sobre flat color',
    composition: 'cutout-on-flat',
    primaryTrigger: 'novedad-cromática',
    secondaryTriggers: ['contraste-extremo'],
    bestFormats: ['post-imagen', 'carrusel-slide-1'],
    baselineScore: 74,
    designInstruction:
      'Producto/persona recortado sobre fondo plano de color saturado de la paleta. Sombra suave si ayuda al volumen.',
    layout: { textPosition: 'bottom', textSize: 'large', subjectPosition: 'center', palette: 'brand-pop' },
    whyItStops: 'El color plano saturado es una anomalía visual entre fotos contextuales — destaca por aislamiento.',
    pitfalls: ['Fondo "casi neutro" que no destaca', 'Recorte con halo'],
    example: 'Producto recortado sobre magenta puro, texto inferior con beneficio en 2 palabras.',
  },
  {
    id: 'vh-numbered-overlay',
    name: 'Número grande overlay',
    composition: 'list-numbered-overlay',
    primaryTrigger: 'autoridad-numérica',
    secondaryTriggers: ['jerarquía-tipográfica'],
    bestFormats: ['carrusel-slide-1', 'post-imagen'],
    baselineScore: 73,
    designInstruction:
      'Un número gigante (peso 900+) en esquina como anclaje. Resto del slide con foto contextual y texto secundario.',
    layout: {
      textPosition: 'overlay',
      textSize: 'oversized',
      subjectPosition: 'right',
      palette: 'neutral-with-accent',
    },
    whyItStops: 'El número implica una lista — promesa de estructura escaneable que es alta saveability.',
    pitfalls: ['Número del mismo tamaño que el resto', 'Numero al centro tapando la foto'],
    example:
      'Número "07" en esquina superior izquierda, ocupa 25% del slide; foto del creador a la derecha; subtítulo "errores al delegar".',
  },
  {
    id: 'vh-incomplete-visual',
    name: 'Visual incompleto / cortado',
    composition: 'incomplete-visual',
    primaryTrigger: 'gestalt-incompleta',
    secondaryTriggers: ['curiosidad-visual'],
    bestFormats: ['reel-cover', 'carrusel-slide-1'],
    baselineScore: 77,
    designInstruction:
      'Objeto/persona/texto cortado por el borde del frame de forma intencional. La incompletitud invita a abrir el carrusel o pasar al siguiente reel.',
    layout: { textPosition: 'top-bottom', textSize: 'large', subjectPosition: 'left', palette: 'brand-pop' },
    whyItStops: 'La gestalt incompleta crea tensión visual — el cerebro quiere "completar" la imagen y desliza.',
    pitfalls: ['Recortes accidentales que se ven como error de exportación'],
    example: 'Texto "Lo que pasó cuando..." cortado a la mitad por el borde inferior del slide.',
  },
  {
    id: 'vh-color-pop-neutral',
    name: 'Color pop sobre neutro',
    composition: 'color-pop-on-neutral',
    primaryTrigger: 'novedad-cromática',
    secondaryTriggers: ['contraste-extremo'],
    bestFormats: ['post-imagen', 'reel-cover'],
    baselineScore: 75,
    designInstruction:
      'Escena monocromática/neutra excepto UN elemento en color de la paleta primaria de la marca. El ojo va directo a ese elemento.',
    layout: { textPosition: 'bottom', textSize: 'medium', subjectPosition: 'center', palette: 'neutral-with-accent' },
    whyItStops: 'Anomalía cromática puntual — la atención está cableada para captarla en milisegundos.',
    pitfalls: ['Dos elementos en color pop que pelean'],
    example: 'Mesa de oficina en escala de grises, un único cuaderno magenta como punto focal.',
  },
  {
    id: 'vh-top-text-center-face',
    name: 'Texto arriba + cara centrada',
    composition: 'top-text-center-face',
    primaryTrigger: 'mirada-directa',
    secondaryTriggers: ['jerarquía-tipográfica', 'identificación-pov'],
    bestFormats: ['reel-cover'],
    baselineScore: 82,
    designInstruction:
      'Banda superior con texto bold (15-20% del frame) + foto del creador ocupando el resto, mirando al lente. Sin tercera banda inferior — limpio.',
    layout: { textPosition: 'top', textSize: 'large', subjectPosition: 'center', palette: 'brand-pop' },
    whyItStops: 'Patrón "tutorial humanizado" que el algoritmo asocia con educación + autoridad — alto CTR de cover.',
    pitfalls: ['Texto que pisa la cara', 'Banda superior sin contraste con el fondo'],
    example: '"Cómo cobrar más sin perder clientes" en negro sobre amarillo arriba; cara seria abajo.',
  },
  {
    id: 'vh-pov-frame',
    name: 'POV en primera persona',
    composition: 'rule-of-thirds',
    primaryTrigger: 'identificación-pov',
    secondaryTriggers: ['curiosidad-visual'],
    bestFormats: ['reel-cover', 'historia'],
    baselineScore: 78,
    designInstruction:
      'Toma desde el ángulo del creador — manos en pantalla, vista del escritorio, hombro hacia abajo. Texto overlay "POV: …".',
    layout: { textPosition: 'top', textSize: 'large', subjectPosition: 'none', palette: 'brand-pop' },
    whyItStops: 'El POV elimina la distancia — el espectador se ve "haciendo" la acción.',
    pitfalls: ['POV mal encuadrado que parece un error'],
    example: 'Manos sobre laptop, vista cenital del escritorio, texto "POV: el cliente te pide otra ronda".',
  },
];

export const VISUAL_HOOK_PATTERNS: ReadonlyArray<VisualHookPattern> = PATTERNS;

export const getVisualPatternsByFormat = (format: VisualFormat): VisualHookPattern[] =>
  PATTERNS.filter((p) => p.bestFormats.includes(format));

export const getVisualPatternsByTrigger = (trigger: VisualTrigger): VisualHookPattern[] =>
  PATTERNS.filter((p) => p.primaryTrigger === trigger || p.secondaryTriggers.includes(trigger));

export const getVisualPatternById = (id: string): VisualHookPattern | undefined => PATTERNS.find((p) => p.id === id);

/**
 * Recommend the best visual pattern for a given combination of textual hook
 * + format. Pure function — no LLM. Picks by:
 *   • format compatibility
 *   • affinity between the textual hook category and the visual pattern
 *   • baseline score
 */
export const recommendVisualForHook = (
  format: VisualFormat,
  hookText: string,
  textualHookCategory?: string,
): VisualHookPattern => {
  const universe = PATTERNS.filter((p) => p.bestFormats.includes(format));

  const text = hookText.toLowerCase();
  const hasNumber = /\d/.test(hookText);
  const hasPOV = /\bpov\b|cuando vos|cuando vos/i.test(hookText);
  const hasContrast = /antes.{0,8}despu|de\s+\d+\s+a\s+\d+|x\s+vs\s+y/i.test(text);
  const hasList = /\b\d+\s+(cosas|errores|formas|claves|tips|pasos|secretos)/i.test(text);
  const hasQuestion = hookText.trim().endsWith('?');
  const hasControversy = /opinión impopular|dejá de|todos están|la mayoría|nadie te dice/i.test(text);

  const score = (p: VisualHookPattern): number => {
    let s = p.baselineScore;
    if (hasNumber && p.composition === 'list-numbered-overlay') s += 18;
    if (hasList && p.composition === 'list-numbered-overlay') s += 12;
    if (hasPOV && p.composition === 'rule-of-thirds' && p.id === 'vh-pov-frame') s += 20;
    if (hasContrast && p.composition === 'split-screen') s += 18;
    if (hasQuestion && p.composition === 'face-direct') s += 10;
    if (hasControversy && p.composition === 'oversized-text') s += 12;
    if (textualHookCategory === 'storytelling' && p.composition === 'face-direct') s += 8;
    if (textualHookCategory === 'educativo' && p.composition === 'top-text-center-face') s += 10;
    if (textualHookCategory === 'transformacion' && p.composition === 'split-screen') s += 12;
    if (textualHookCategory === 'lista' && p.composition === 'list-numbered-overlay') s += 14;
    return s;
  };

  return universe.slice().sort((a, b) => score(b) - score(a))[0]!;
};
