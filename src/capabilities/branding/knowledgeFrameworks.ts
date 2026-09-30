/**
 * Knowledge Frameworks — grounding real para los especialistas de
 * brandingBrain.ts y platformBrain.ts.
 *
 * Antes, cada especialista era "Sos Fulano, rol X" sin ningún marco
 * conceptual citable — Claude respondía bien pero genérico, sin autoridad
 * verificable. Esto le da a CADA agente 2-3 frameworks reales y específicos
 * de su rol (de los 36 libros ya catalogados en CLAUDE.md § Biblioteca de
 * Conocimiento), con la ACCIÓN concreta que se desprende de cada uno — no el
 * libro entero, sólo lo aplicable a esa decisión puntual. El agente tiene
 * que citar cuál usó en cada output (`frameworksCited`), así la excelencia
 * de conocimiento es verificable en la UI, no una afirmación vacía.
 */

export const FRAMEWORK_REFS: Record<string, string[]> = {
  // ── Branding Brain ─────────────────────────────────────────────────────
  'brand-strategist-senior': [
    'Ries & Trout — Positioning: ganás la MENTE, no el mercado. Si no podés ser primero en la categoría, creá una nueva (creneau) en vez de pelear de frente.',
    'Dunford — Obviously Awesome: posicionamiento = alternativas que el cliente usaría si no existieras + qué tenés que ellas no + por qué importa para EL mercado que más lo valora.',
    'Kim & Mauborgne — Blue Ocean: no compitas en los mismos factores que todos — eliminá/reducí/elevá/creá hasta que comparar con la competencia deje de tener sentido.',
  ],
  'audience-researcher': [
    'Fitzpatrick — The Mom Test: preguntá por comportamiento pasado concreto ("¿qué hiciste la última vez?"), nunca "¿te gustaría esto?" — la gente miente por amabilidad.',
    'Miller — StoryBrand: todo problema tiene 3 capas — externo (obvio), interno (la frustración/miedo real), filosófico (por qué está mal que exista) — se compra por el interno.',
    'Kahneman — Sistema 1/2: el 95% de las decisiones son automáticas y emocionales. Mapeá el dolor emocional concreto, no sólo la necesidad funcional declarada.',
  ],
  'naming-voice': [
    'Schwartz — Breakthrough Advertising: la especificidad genera credibilidad automática. Números y nombres propios reales, nunca "muchos" o "excelente".',
    'Heath — Made to Stick: SUCCESs — simple, inesperado, concreto, creíble, emocional, con historia. Una frase de marca fuerte cumple varios a la vez.',
    'Carnegie — Cómo ganar amigos: hablá de lo que el otro quiere lograr, no de lo que vos ofrecés — el "vos" en el copy vende más que el "nosotros".',
  ],
  'visual-identity': [
    'Capriotti/Doppler/Hoyos — Brand Kit Training: colores marcarios necesitan los 4 sistemas (Pantone+CMYK+RGB+HEX), máximo 4 colores primarios, nunca gris neutro puro (#808080).',
    'Garrido Moreno — Identidad/Imagen/Marca: la identidad VISUAL es la expresión de la identidad CORPORATIVA (valores, cultura) — tiene que derivar de la estrategia, nunca inventarse aparte.',
  ],
  'narrative-architect': [
    'Miller — StoryBrand SB7: el cliente es el héroe, la marca es el GUÍA — nunca al revés (Yoda, no Luke Skywalker).',
    'Heath — Made to Stick: 3 tipos de historia que pegan — Challenge (superar obstáculo), Connection (unir gente), Creativity (uso novedoso de algo).',
    'McKee — Story: un arquetipo (conflicto humano universal) viaja mejor que un estereotipo (detalle cultural sin fondo emocional).',
  ],
  'differential-strategist': [
    'Kim & Mauborgne — Blue Ocean: 4 acciones concretas — qué eliminar, qué reducir muy por debajo del estándar, qué elevar muy por encima, qué crear que nadie ofrece.',
    'Brunson — Expert Secrets: vendé una OPORTUNIDAD NUEVA, nunca una "mejora" — la mejora admite tácitamente que el enfoque anterior del cliente estaba mal, y eso genera resistencia.',
    'Ries & Trout — Positioning: si no podés desplazar al líder, reposicionalo (Tylenol vs. aspirina) o encontrá el hueco que nadie ocupa.',
  ],
  'influencer-positioner': [
    'Brunson — Expert Secrets: Attractive Character — mostrá de dónde veías Y dónde estás ahora. "Un capítulo adelante" alcanza como autoridad, no hace falta ser gurú.',
    'Cole — Online Writing: la distribución precede al contenido — publicar donde ya hay descubrimiento incorporado rinde más que perfeccionar tu propio feed.',
    'Berger — Contagious: Social Currency — la gente comparte lo que LA hace ver bien a ella, no lo que te hace ver bien a vos. Diseñá para eso.',
  ],
  'coherence-guardian': [
    'Garrido Moreno: la brecha entre imagen PROYECTADA (lo que la marca dice de sí) e imagen PERCIBIDA (lo que el público realmente cree) es el problema real — buscá esa brecha, no sólo errores de tono suelto.',
    'Cialdini — Consistencia: cada pieza publicada es un compromiso público con la identidad declarada. Una sola inconsistencia visible rompe la cadena de confianza acumulada.',
  ],

  // ── Platform Brain — Instagram ──────────────────────────────────────────
  'ig-algorithm-strategist': [
    'Kahneman — Fluencia cognitiva: contenido fácil de procesar (claro, legible, sin fricción visual) se percibe como más confiable y de más calidad — el algoritmo premia justamente la retención que esto genera.',
    'Cialdini/Pre-suasión — Lo focal es causal: lo primero que el usuario ve define cómo evalúa todo lo que sigue. El primer frame no es decorativo, es la premisa de venta del resto.',
  ],
  'ig-growth-hacker': [
    'Weinberg — Traction: Bullseye — probá 3-5 canales/tácticas en paralelo por ventanas cortas (2 semanas) con métricas reales antes de apostar todo a una sola.',
    'Eyal — Hooked: el Hook Model sólo compone si el trigger externo (notificación, mención) termina generando un trigger INTERNO (hábito, necesidad emocional) — si no, el crecimiento no se sostiene solo.',
  ],
  'ig-hashtag-scientist': [
    'Hopkins — Scientific Advertising: testeá y medí, nunca asumas — un hashtag sin data de performance propia es una apuesta, no una estrategia.',
    'Schwartz — niveles de conciencia: hashtags de descubrimiento (audiencia unaware) y de búsqueda directa (audiencia product-aware) cumplen roles distintos — no uses sólo un tipo.',
  ],
  'ig-format-strategist': [
    'Heath — Made to Stick: lo concreto vence a lo abstracto — un formato con datos/ejemplos específicos en pantalla retiene más que un consejo genérico bien editado.',
    'CLAUDE.md § Pinterest Design Patterns: left-aligned > centrado, máx 4 colores por pieza, contraste 4.5:1 mínimo — reglas ya validadas en este proyecto para lo que retiene visualmente.',
  ],

  // ── Platform Brain — TikTok ──────────────────────────────────────────────
  'tt-fyp-strategist': [
    'Berger — Contagious (STEPPS, Triggers): contenido vinculado a un cue ambiental de alta frecuencia (rutina diaria) se recuerda y se retoma más — top of mind = tip of tongue.',
    'Kahneman — Sistema 1: la decisión de seguir viendo pasa en menos de 1 segundo y es automática, no razonada — el hook tiene que activar reflejo, no argumento.',
  ],
  'tt-sound-curator': [
    'Berger — Contagious (Public): lo que se ve/escucha en público se imita más rápido — un sonido trending es "residuo conductual" visible, no sólo música de fondo.',
    'Poundstone — Adaptación perceptual: un sonido sobre-usado pierde impacto por pura habituación — la novedad relativa importa más que la calidad de producción.',
  ],
  'tt-native-specialist': [
    'Heath — Made to Stick: lo inesperado rompe el patrón de expectativa y genera atención real — un video con pulido de anuncio activa el patrón "esto es un ad" y se scrollea antes del segundo 1.',
    'Ariely — Predictably Irrational: las expectativas determinan la experiencia — si algo SE VE a publicidad, el cerebro lo procesa (y descarta) como publicidad antes de evaluar el contenido.',
  ],
  'tt-growth-shop': [
    'Cialdini — Prueba social: reviews/comentarios de gente similar al comprador convierten más que cualquier claim hecho por la marca misma.',
    'Poundstone — Psicología de precios: anclar un precio de referencia alto (o mostrar el "antes") hace que la oferta se perciba como más barata sin tocar el precio real.',
  ],
};

/** Bloque de prompt listo para pegar: frameworks del agente + instrucción de citarlos. */
export const frameworkBlock = (agentId: string): string => {
  const refs = FRAMEWORK_REFS[agentId];
  if (!refs?.length) return '';
  return `FRAMEWORKS A APLICAR EN ESTA DECISIÓN (no los menciones de forma genérica — usalos para fundamentar el razonamiento):
${refs.map((r) => `- ${r}`).join('\n')}`;
};

/** Regla de asertividad — misma en todos los agentes de ambos brains. */
export const ASSERTIVENESS_RULE =
  'Respondé con autoridad: afirmá, no ofrezcas 2-3 opciones tibias para que el usuario elija — elegí LA mejor y defendela citando el framework que la respalda. Un especialista senior no dice "podrías probar"; dice "hacé esto, por esta razón".';
