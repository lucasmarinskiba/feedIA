/**
 * Knowledge Frameworks — grounding real para los especialistas de
 * brandingBrain.ts, platformBrain.ts y auditBrand() (brandRenewal.ts).
 *
 * Antes, cada especialista era "Sos Fulano, rol X" sin ningún marco
 * conceptual citable — Claude respondía bien pero genérico, sin autoridad
 * verificable. Esto le da a CADA agente 4 frameworks reales y específicos de
 * su rol (de los 36 libros ya catalogados en CLAUDE.md § Biblioteca de
 * Conocimiento), con la ACCIÓN concreta que se desprende de cada uno — no el
 * libro entero, sólo lo aplicable a esa decisión puntual. El agente tiene
 * que citar cuál usó en cada output (`frameworksCited`), así la excelencia
 * de conocimiento es verificable en la UI, no una afirmación vacía.
 *
 * También expone `renderPerformanceBlock()` — la misma data real de
 * performance que ya usaba auditBrand() (posts/engagement reales de la
 * cuenta, vía performanceDB.ts), ahora reutilizable por los brains para que
 * "acción concreta" signifique fundamentada en LO QUE YA PASÓ en esta
 * cuenta puntual, no sólo en mejores prácticas genéricas del nicho.
 */

import { getRecentPosts, getAccountSummary } from '../analytics/performanceDB.js';

export const FRAMEWORK_REFS: Record<string, string[]> = {
  // ── Branding Brain ─────────────────────────────────────────────────────
  'brand-strategist-senior': [
    'Ries & Trout — Positioning: ganás la MENTE, no el mercado. Si no podés ser primero en la categoría, creá una nueva (creneau) en vez de pelear de frente.',
    'Dunford — Obviously Awesome: posicionamiento = alternativas que el cliente usaría si no existieras + qué tenés que ellas no + por qué importa para EL mercado que más lo valora.',
    'Kim & Mauborgne — Blue Ocean: no compitas en los mismos factores que todos — eliminá/reducí/elevá/creá hasta que comparar con la competencia deje de tener sentido.',
    'Collins — Good to Great (Hedgehog Concept): la estrategia sostenible vive en la intersección de lo que SOS mejor haciendo, lo que te apasiona y lo que genera ingreso — si el posicionamiento no cae ahí, no dura.',
  ],
  'audience-researcher': [
    'Fitzpatrick — The Mom Test: preguntá por comportamiento pasado concreto ("¿qué hiciste la última vez?"), nunca "¿te gustaría esto?" — la gente miente por amabilidad.',
    'Miller — StoryBrand: todo problema tiene 3 capas — externo (obvio), interno (la frustración/miedo real), filosófico (por qué está mal que exista) — se compra por el interno.',
    'Kahneman — Sistema 1/2: el 95% de las decisiones son automáticas y emocionales. Mapeá el dolor emocional concreto, no sólo la necesidad funcional declarada.',
    'Olsen — Lean Product Playbook: la oportunidad real está en el gap entre lo que le importa MUCHO al avatar y lo que hoy lo satisface POCO — ahí, no en "necesidades" genéricas.',
  ],
  'naming-voice': [
    'Schwartz — Breakthrough Advertising: la especificidad genera credibilidad automática. Números y nombres propios reales, nunca "muchos" o "excelente".',
    'Heath — Made to Stick: SUCCESs — simple, inesperado, concreto, creíble, emocional, con historia. Una frase de marca fuerte cumple varios a la vez.',
    'Carnegie — Cómo ganar amigos: hablá de lo que el otro quiere lograr, no de lo que vos ofrecés — el "vos" en el copy vende más que el "nosotros".',
    'Voss — Never Split the Difference: etiquetar la emoción del lector ("parece que estás cansado de...") genera conexión más rápido que argumentar — usalo en hooks y aperturas.',
  ],
  'visual-identity': [
    'Capriotti/Doppler/Hoyos — Brand Kit Training: colores marcarios necesitan los 4 sistemas (Pantone+CMYK+RGB+HEX), máximo 4 colores primarios, nunca gris neutro puro (#808080).',
    'Garrido Moreno — Identidad/Imagen/Marca: la identidad VISUAL es la expresión de la identidad CORPORATIVA (valores, cultura) — tiene que derivar de la estrategia, nunca inventarse aparte.',
    'CLAUDE.md — Pinterest Design Patterns: máximo 4 colores por pieza, contraste mínimo 4.5:1, nunca centrado como único layout — reglas ya validadas en este proyecto.',
    'Ariely — Predictably Irrational: el valor percibido cambia con el contexto visual — el mismo contenido en composición premium se percibe de mayor calidad sin cambiar el mensaje.',
  ],
  'narrative-architect': [
    'Miller — StoryBrand SB7: el cliente es el héroe, la marca es el GUÍA — nunca al revés (Yoda, no Luke Skywalker).',
    'Heath — Made to Stick: 3 tipos de historia que pegan — Challenge (superar obstáculo), Connection (unir gente), Creativity (uso novedoso de algo).',
    'McKee — Story: un arquetipo (conflicto humano universal) viaja mejor que un estereotipo (detalle cultural sin fondo emocional).',
    'Brunson — Epiphany Bridge: contá CÓMO llegaste a la epifanía, no sólo el resultado — el prospecto revive tu descubrimiento y lo hace propio en vez de sólo escucharlo.',
  ],
  'differential-strategist': [
    'Kim & Mauborgne — Blue Ocean: 4 acciones concretas — qué eliminar, qué reducir muy por debajo del estándar, qué elevar muy por encima, qué crear que nadie ofrece.',
    'Brunson — Expert Secrets: vendé una OPORTUNIDAD NUEVA, nunca una "mejora" — la mejora admite tácitamente que el enfoque anterior del cliente estaba mal, y eso genera resistencia.',
    'Ries & Trout — Positioning: si no podés desplazar al líder, reposicionalo (Tylenol vs. aspirina) o encontrá el hueco que nadie ocupa.',
    'Dunford — 2 trampas de posicionamiento: el producto evolucionó y el mensaje no, o el mercado cambió y vos quedaste atrás — diagnosticá cuál de las dos es la que tiene esta marca.',
  ],
  'influencer-positioner': [
    'Brunson — Expert Secrets: Attractive Character — mostrá de dónde veías Y dónde estás ahora. "Un capítulo adelante" alcanza como autoridad, no hace falta ser gurú.',
    'Cole — Online Writing: la distribución precede al contenido — publicar donde ya hay descubrimiento incorporado rinde más que perfeccionar tu propio feed.',
    'Berger — Contagious: Social Currency — la gente comparte lo que LA hace ver bien a ella, no lo que te hace ver bien a vos. Diseñá para eso.',
    'Weinberg — Traction: elegí 1-2 canales de autoridad y ejecutalos con disciplina 90 días antes de sumar otro — la dispersión mata el efecto compuesto.',
  ],
  'coherence-guardian': [
    'Garrido Moreno: la brecha entre imagen PROYECTADA (lo que la marca dice de sí) e imagen PERCIBIDA (lo que el público realmente cree) es el problema real — buscá esa brecha, no sólo errores de tono suelto.',
    'Cialdini — Consistencia: cada pieza publicada es un compromiso público con la identidad declarada. Una sola inconsistencia visible rompe la cadena de confianza acumulada.',
    'Collins — Brutal Facts: contrastá cada decisión del equipo contra la realidad sin negación — una auditoría que no incomoda no sirve.',
    'McKee — Character: una marca con dimensiones (rasgos en tensión) resiste mejor el escrutinio que una plana — pero contradicción de CARÁCTER es distinta de inconsistencia de MENSAJE; distinguí cuál es cuál.',
  ],

  // ── Auditoría rápida (brandRenewal.ts → auditBrand) ───────────────────────
  'brand-auditor': [
    'Collins — Brutal Facts: diagnosticá el estado real sin negación, aunque incomode — una auditoría que sólo halaga no es una auditoría.',
    'Ries — Lean Startup (Pivot or Persevere): si las métricas no responden a los últimos cambios, es señal de pivotear el enfoque, no de insistir más fuerte en lo mismo.',
    'Kim & Mauborgne — Blue Ocean: si la fatiga viene de competir en los mismos factores que todo el nicho, la solución no es "mejorar" esos factores sino cambiar de factores.',
    'Schwartz — nivel de sofisticación: una audiencia ya sofisticada necesita un mecanismo único nuevo, no la misma promesa con más énfasis — chequeá si el mensaje quedó estancado en un nivel viejo.',
  ],

  // ── Platform Brain — Instagram ──────────────────────────────────────────
  'ig-algorithm-strategist': [
    'Kahneman — Fluencia cognitiva: contenido fácil de procesar (claro, legible, sin fricción visual) se percibe como más confiable y de más calidad — el algoritmo premia justamente la retención que esto genera.',
    'Cialdini/Pre-suasión — Lo focal es causal: lo primero que el usuario ve define cómo evalúa todo lo que sigue. El primer frame no es decorativo, es la premisa de venta del resto.',
    'Berger — Contagious (Practical Value): contenido que ahorra tiempo/dinero/esfuerzo se guarda y comparte más — los guardados son hoy la señal de ranking más fuerte en IG.',
    'Eyal — Hooked (Variable Reward): contenido con un elemento de sorpresa/descubrimiento genera más regreso a la cuenta que contenido 100% predecible.',
  ],
  'ig-growth-hacker': [
    'Weinberg — Traction: Bullseye — probá 3-5 canales/tácticas en paralelo por ventanas cortas (2 semanas) con métricas reales antes de apostar todo a una sola.',
    'Eyal — Hooked: el Hook Model sólo compone si el trigger externo (notificación, mención) termina generando un trigger INTERNO (hábito, necesidad emocional) — si no, el crecimiento no se sostiene solo.',
    'Spinks — Business of Belonging (SPACES): contenido que genera Soporte entre seguidores (que se respondan dudas entre ellos) crece más orgánico que el que depende sólo del admin.',
    'Ferriss — regla 80/20: el 20% del contenido genera el 80% del crecimiento — identificá cuál fue ese 20% real y doblá la apuesta en vez de diversificar sin datos.',
  ],
  'ig-hashtag-scientist': [
    'Hopkins — Scientific Advertising: testeá y medí, nunca asumas — un hashtag sin data de performance propia es una apuesta, no una estrategia.',
    'Schwartz — niveles de conciencia: hashtags de descubrimiento (audiencia unaware) y de búsqueda directa (audiencia product-aware) cumplen roles distintos — no uses sólo un tipo.',
    'Ries & Trout — categoría mental: un hashtag de categoría amplia compite con millones de posts; uno de creneau propio te vuelve el resultado más relevante de esa búsqueda puntual.',
    'AI SEO / GEO (CLAUDE.md): los términos que la gente tipea en la búsqueda importan tanto como los hashtags — optimizá para cómo busca la gente, no sólo para cómo categorizás vos.',
  ],
  'ig-format-strategist': [
    'Heath — Made to Stick: lo concreto vence a lo abstracto — un formato con datos/ejemplos específicos en pantalla retiene más que un consejo genérico bien editado.',
    'CLAUDE.md § Pinterest Design Patterns: left-aligned > centrado, máx 4 colores por pieza, contraste 4.5:1 mínimo — reglas ya validadas en este proyecto para lo que retiene visualmente.',
    'Olsen — Kano Model: una pieza "delighter" (sorprende positivamente, no sólo cumple lo esperado) diferencia más — reservá 1 de cada 5 piezas para sorprender de verdad.',
    'Kahneman — Peak-End Rule: el cierre de un carrusel/reel define el recuerdo completo de la pieza — el final tiene que ser el momento más fuerte, no un CTA plano de relleno.',
  ],

  // ── Platform Brain — TikTok ──────────────────────────────────────────────
  'tt-fyp-strategist': [
    'Berger — Contagious (STEPPS, Triggers): contenido vinculado a un cue ambiental de alta frecuencia (rutina diaria) se recuerda y se retoma más — top of mind = tip of tongue.',
    'Kahneman — Sistema 1: la decisión de seguir viendo pasa en menos de 1 segundo y es automática, no razonada — el hook tiene que activar reflejo, no argumento.',
    'Eyal — Hook Model: el trigger interno (aburrimiento, curiosidad) que abre la app tiene que encontrar tu video en los primeros segundos o perdés el slot — diseñá para ESE momento exacto de apertura.',
    'Hopkins — testear, no asumir: el FYP es un experimento A/B continuo — publicar variantes del mismo video con distinta apertura es más barato que adivinar cuál hook funciona.',
  ],
  'tt-sound-curator': [
    'Berger — Contagious (Public): lo que se ve/escucha en público se imita más rápido — un sonido trending es "residuo conductual" visible, no sólo música de fondo.',
    'Poundstone — Adaptación perceptual: un sonido sobre-usado pierde impacto por pura habituación — la novedad relativa importa más que la calidad de producción.',
    'Cialdini — Prueba social: un sonido que ya usan cuentas grandes del nicho valida el formato sin que tengas que explicarlo vos.',
    'Weinberg — Bullseye aplicado a sonido: probá 3 sonidos distintos con el MISMO video base para aislar qué variable mueve realmente la aguja, no cambies todo a la vez.',
  ],
  'tt-native-specialist': [
    'Heath — Made to Stick: lo inesperado rompe el patrón de expectativa y genera atención real — un video con pulido de anuncio activa el patrón "esto es un ad" y se scrollea antes del segundo 1.',
    'Ariely — Predictably Irrational: las expectativas determinan la experiencia — si algo SE VE a publicidad, el cerebro lo procesa (y descarta) como publicidad antes de evaluar el contenido.',
    'Berger — Emoción de alta activación: asombro, indignación o diversión generan share; tristeza o calma no — el tono nativo de TikTok premia emoción alta, no contenido plano.',
    'Cole — Universal > Nicho: el framing de la lección importa más que el expertise de nicho — una lección universal (esfuerzo, fracaso, transformación) contada desde tu nicho llega a audiencia mucho mayor.',
  ],
  'tt-growth-shop': [
    'Cialdini — Prueba social: reviews/comentarios de gente similar al comprador convierten más que cualquier claim hecho por la marca misma.',
    'Poundstone — Psicología de precios: anclar un precio de referencia alto (o mostrar el "antes") hace que la oferta se perciba como más barata sin tocar el precio real.',
    'Brunson — The Stack: mostrá el valor acumulado pieza por pieza antes de revelar el precio — en TikTok Shop eso es la secuencia de contenido previa al link, no un solo video de venta.',
    'Fitzpatrick — Mom Test aplicado a comentarios: los comentarios reales ("¿esto sirve para X?") son mejor research de producto que cualquier encuesta — leerlos y responderlos es la fuente de insight #1.',
  ],
};

/** Bloque de prompt listo para pegar: frameworks del agente + instrucción de citarlos. */
export const frameworkBlock = (agentId: string): string => {
  const refs = FRAMEWORK_REFS[agentId];
  if (!refs?.length) return '';
  return `FRAMEWORKS A APLICAR EN ESTA DECISIÓN (no los menciones de forma genérica — usalos para fundamentar el razonamiento):
${refs.map((r) => `- ${r}`).join('\n')}`;
};

/**
 * Performance REAL de la cuenta (posts/engagement ya registrados vía
 * performanceDB.ts) — la misma fuente que ya usa auditBrand(). `platform`
 * filtra a piezas de esa red cuando el post tiene la red etiquetada; si no
 * hay dato de plataforma en el registro, se incluye igual (mejor señal
 * parcial que ninguna).
 */
export const renderPerformanceBlock = (platform?: 'instagram' | 'tiktok'): string => {
  const summary = getAccountSummary();
  if (summary.totalPosts === 0) {
    return 'PERFORMANCE REAL: todavía no hay suficiente historial en esta cuenta — basate en mejores prácticas validadas para el nicho, y decilo explícitamente en vez de inventar números.';
  }
  const posts = getRecentPosts(60).filter((p) => !platform || !p.platform || p.platform === platform);
  const topHooks = posts
    .filter((p) => p.isTopPerformer)
    .slice(0, 3)
    .map((p) => `"${p.hookText}" (${p.format}, ER ${p.metrics.engagementRate.toFixed(1)}%)`);
  const weakest = [...posts]
    .sort((a, b) => a.actualScore - b.actualScore)
    .slice(0, 2)
    .map((p) => `"${p.hookText}" (score ${p.actualScore})`);

  return `PERFORMANCE REAL DE LA CUENTA (últimos 60 días${platform ? ` en ${platform === 'instagram' ? 'Instagram' : 'TikTok'}` : ''}, ${posts.length} piezas):
- Engagement rate promedio: ${summary.avgEngagementRate.toFixed(2)}% · Tendencia: ${summary.trend}
- Mejor formato histórico: ${summary.bestFormat ?? 'sin datos suficientes'}
- Hooks que SÍ funcionaron: ${topHooks.join(' · ') || '(sin top performers detectados aún)'}
- Piezas con peor desempeño reciente: ${weakest.join(' · ') || '(ninguna registrada)'}
Fundamentá tu recomendación en esta evidencia real cuando la haya — no generalices si hay data concreta de qué funcionó o no en ESTA cuenta puntual.`;
};

/** frameworkBlock + renderPerformanceBlock combinados — el grounding completo que usan brandingBrain.ts y platformBrain.ts. */
export const groundingBlock = (agentId: string, platform?: 'instagram' | 'tiktok'): string =>
  [frameworkBlock(agentId), renderPerformanceBlock(platform)].filter(Boolean).join('\n\n');

/** Regla de asertividad — misma en todos los agentes de ambos brains y en el auditor. */
export const ASSERTIVENESS_RULE =
  'Respondé con autoridad: afirmá, no ofrezcas 2-3 opciones tibias para que el usuario elija — elegí LA mejor y defendela citando el framework que la respalda. Un especialista senior no dice "podrías probar"; dice "hacé esto, por esta razón".';
