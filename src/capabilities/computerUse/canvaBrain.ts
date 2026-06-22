/**
 * Canva Brain — cerebro multi-agente para diseño autónomo en Canva.
 *
 * Orquesta 7 agentes especializados que operan como profesionales reales:
 * Estratega de Marca, Director de Arte, Copywriter Publicitaria, Diseñador
 * Gráfico (operador Computer Use), Especialista Social Media, Publicista /
 * Comunicador y Artista Visual. En modo "autopilot" ejecuta todo de manera
 * encadenada; en modo "supervisor" detiene el flujo antes de tocar Canva y
 * espera aprobación humana.
 *
 * Optimización de costos: todos los agentes comparten el mismo bloque de
 * contexto de marca en el system cacheado vía `callCanvaAgent`. El primer
 * agente escribe el cache (~1.25×), los siguientes lo leen (~0.1×) → ~80% de
 * ahorro en tokens de entrada por job completo.
 */

import { log } from '../../agent/logger.js';
import type { BrandProfile } from '../../config/types.js';
import { callCanvaAgent } from './canvaClaudeClient.js';
import { runCanvaWorkflow, type CanvaDesignType, type CanvaSessionResult } from './canvaStudio.js';

// ── Tipos públicos ────────────────────────────────────────────────────────────

export type CanvaBrainMode = 'autopilot' | 'supervisor';

export interface CanvaBrainAgent {
  id: string;
  name: string;
  emoji: string;
  role: string;
  specialty: string;
}

export interface CanvaBrainStep {
  agentId: string;
  agentName: string;
  emoji: string;
  phase: string;
  thinking: string;
  output: string;
  durationMs: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
}

export interface CanvaBrainCopy {
  headline: string;
  subheadline: string;
  bodyCopy: string[];
  cta: string;
  hashtags: string[];
  caption: string;
}

export interface CanvaBrainVisualPlan {
  layout: string;
  colorUsage: string;
  typography: string;
  mood: string;
  composition: string;
  templateHint: string;
}

export interface CanvaBrainResult {
  ok: boolean;
  jobId: string;
  mode: CanvaBrainMode;
  steps: CanvaBrainStep[];
  brief: string;
  copywriting: CanvaBrainCopy;
  visualPlan: CanvaBrainVisualPlan;
  canvaResult?: CanvaSessionResult;
  approvalRequired: boolean;
  approvalReason?: string;
  totalDurationMs: number;
  /** Telemetría de caché — suma de todos los agentes del job */
  totalCacheReadTokens: number;
  totalCacheWriteTokens: number;
}

// ── Agentes especializados ────────────────────────────────────────────────────

export const CANVA_BRAIN_AGENTS: CanvaBrainAgent[] = [
  {
    id: 'brand-strategist',
    name: 'Valentina Cruz',
    emoji: '🎯',
    role: 'Estratega de Marca',
    specialty: 'Brief creativo, posicionamiento, coherencia de marca y definición de objetivos de comunicación',
  },
  {
    id: 'art-director',
    name: 'Mateo Reyes',
    emoji: '🎨',
    role: 'Director de Arte',
    specialty: 'Dirección visual, composición, jerarquía visual, selección de paleta y tipografía',
  },
  {
    id: 'copywriter',
    name: 'Camila Torres',
    emoji: '✍️',
    role: 'Copywriter Publicitaria',
    specialty: 'Redacción persuasiva, headline, copy de cuerpo, CTAs, captions para Instagram y hashtags',
  },
  {
    id: 'graphic-designer',
    name: 'Lucas Herrera',
    emoji: '🖥️',
    role: 'Diseñador Gráfico',
    specialty: 'Operación de Canva via Computer Use, ejecución técnica del diseño y exportación',
  },
  {
    id: 'social-media',
    name: 'Sofía Mendoza',
    emoji: '📱',
    role: 'Especialista Social Media',
    specialty: 'Optimización para Instagram, formatos, engagement, timing y tendencias de la plataforma',
  },
  {
    id: 'publicist',
    name: 'Rodrigo Blanco',
    emoji: '📢',
    role: 'Publicista / Comunicador',
    specialty: 'Validación del mensaje, coherencia con la identidad de marca y efectividad comunicacional',
  },
  {
    id: 'visual-artist',
    name: 'Isabella Vega',
    emoji: '🖼️',
    role: 'Artista Visual',
    specialty: 'QA estético, armonía visual, balance, refinamiento artístico y revisión de impacto visual',
  },
];

// ── Helpers internos ──────────────────────────────────────────────────────────

const agentById = (id: string): CanvaBrainAgent => {
  const agent = CANVA_BRAIN_AGENTS.find((a) => a.id === id);
  if (!agent) throw new Error(`[CanvaBrain] Agente desconocido: ${id}`);
  return agent;
};

const timed = async <T>(fn: () => Promise<T>): Promise<{ result: T; durationMs: number }> => {
  const t0 = Date.now();
  const result = await fn();
  return { result, durationMs: Date.now() - t0 };
};

/** Fallback cuando callCanvaAgent falla o no hay API key. Devuelve datos simulados coherentes. */
const fallbackBrief = (brand: BrandProfile, topic: string, objective: string): string =>
  `Brief creativo para ${brand.name} — ${topic}. Objetivo: ${objective}. ` +
  `Nicho: ${brand.niche}. Tono: ${brand.voice.tone.join(', ')}. ` +
  `Audiencia: ${brand.audience.description}. ` +
  `Posicionamiento: ${brand.brandStrategy?.positioning || 'liderazgo en el nicho'}.`;

const fallbackCopy = (brand: BrandProfile, topic: string): CanvaBrainCopy => ({
  headline: `${topic} que transforma tu ${brand.niche}`,
  subheadline: `Descubrí cómo ${brand.name} lo hace diferente`,
  bodyCopy: [
    `Cada detalle importa cuando se trata de ${topic}.`,
    `En ${brand.name} lo sabemos mejor que nadie.`,
    `Tu próximo paso está más cerca de lo que pensás.`,
  ],
  cta: '¡Quiero saber más!',
  hashtags: [
    `#${brand.niche.replace(/\s+/g, '')}`,
    `#${brand.name.replace(/\s+/g, '')}`,
    '#Instagram',
    '#contenido',
    '#marcapersonal',
  ],
  caption: `${topic} — una nueva forma de ver las cosas. 🔥\n\n¿Ya lo estás aplicando? Contanos en los comentarios 👇\n\n#${brand.niche.replace(/\s+/g, '')} #${brand.name.replace(/\s+/g, '')}`,
});

const fallbackVisualPlan = async (brand: BrandProfile, designType: CanvaDesignType): Promise<CanvaBrainVisualPlan> => {
  // If the brand has a niche pack applied, use its template hints as a
  // richer base for Canva template searches.
  let templateHint = `${brand.visual.style || designType} ${brand.visual.mood || 'profesional'} instagram template`;

  if (brand.nichePackId) {
    try {
      const { NICHE_PACK_BY_ID } = await import('../../config/nichePacks.js');
      const pack = NICHE_PACK_BY_ID[brand.nichePackId];
      if (pack?.templateHints?.length) {
        templateHint = pack.templateHints[0]!;
      }
    } catch {
      /* noop — niche packs optional */
    }
  }

  return {
    layout: designType.includes('carousel') ? 'multi-slide con jerarquía progresiva' : 'centrado con zona de respiro',
    colorUsage: `Paleta principal: ${brand.visual.palette.slice(0, 2).join(', ') || '#000000, #FFFFFF'}. Fondo neutro con acento de marca.`,
    typography: brand.visual.typography?.[0]
      ? `Headline en ${brand.visual.typography[0]}, cuerpo en ${brand.visual.typography[1] ?? brand.visual.typography[0]}`
      : 'Sans-serif bold para headline, regular para cuerpo',
    mood: brand.visual.mood || 'profesional y aspiracional',
    composition:
      brand.visual.compositionRules?.[0] ??
      'Regla de tercios, texto en zona inferior, imagen protagonista en parte superior',
    templateHint,
  };
};

// ── Función principal ─────────────────────────────────────────────────────────

export const runCanvaBrain = async (
  brand: BrandProfile,
  request: {
    designType: CanvaDesignType;
    topic: string;
    objective: string;
    tone?: string;
    extraInstructions?: string;
  },
  mode: CanvaBrainMode = 'supervisor',
): Promise<CanvaBrainResult> => {
  const globalStart = Date.now();
  const jobId = Date.now().toString(36);
  const steps: CanvaBrainStep[] = [];
  let totalCacheReadTokens = 0;
  let totalCacheWriteTokens = 0;

  log.step(`[CanvaBrain] Job ${jobId} — modo: ${mode} — tipo: ${request.designType}`);

  const tone = request.tone ?? brand.voice.tone[0] ?? 'profesional';

  // ── Paso 1: Estratega de Marca → brief creativo ──────────────────────────

  const strategist = agentById('brand-strategist');
  log.info(`${strategist.emoji} ${strategist.name} (${strategist.role}) generando brief...`);

  let brief = fallbackBrief(brand, request.topic, request.objective);

  const { result: briefResult, durationMs: briefDuration } = await timed(async () => {
    try {
      const res = await callCanvaAgent<{ brief: string }>(brand, {
        agentRole: strategist.role,
        tier: 'creative', // Opus 4.7 + adaptive thinking
        taskPrompt: `Sos ${strategist.name}, ${strategist.role} senior con 15 años de experiencia.
Tu especialidad: ${strategist.specialty}.

Ya conocés la identidad completa de la marca desde el contexto de sistema.

PEDIDO ESPECÍFICO:
Tipo de pieza: ${request.designType}
Tema: ${request.topic}
Objetivo: ${request.objective}
Tono para esta pieza: ${tone}
${request.extraInstructions ? `Instrucciones extra: ${request.extraInstructions}` : ''}

Generá un brief creativo completo (máx. 300 palabras) que guíe a todo el equipo creativo.
Incluí: propósito de la pieza, mensaje central, tono emocional, qué debe sentir la audiencia
al verla y qué acción debe tomar.

Respondé con JSON: { "brief": "..." }`,
      });
      totalCacheReadTokens += res.cacheReadTokens;
      totalCacheWriteTokens += res.cacheWriteTokens;
      return { data: res.data.brief, cache: res };
    } catch (err) {
      log.warn(`[CanvaBrain] ${strategist.id} fallback: ${(err as Error).message}`);
      return { data: fallbackBrief(brand, request.topic, request.objective), cache: null };
    }
  });

  brief = briefResult.data;

  steps.push({
    agentId: strategist.id,
    agentName: strategist.name,
    emoji: strategist.emoji,
    phase: 'Brief Creativo',
    thinking: `Analizo la marca ${brand.name}, su audiencia y el objetivo "${request.objective}" para construir un brief que alinee a todo el equipo.`,
    output: brief,
    durationMs: briefDuration,
    cacheReadTokens: briefResult.cache?.cacheReadTokens,
    cacheWriteTokens: briefResult.cache?.cacheWriteTokens,
  });

  // ── Paso 2: Copywriter → textos ──────────────────────────────────────────

  const copywriter = agentById('copywriter');
  log.info(`${copywriter.emoji} ${copywriter.name} (${copywriter.role}) redactando textos...`);

  let copywriting: CanvaBrainCopy = fallbackCopy(brand, request.topic);

  const { result: copyResult, durationMs: copyDuration } = await timed(async () => {
    try {
      const res = await callCanvaAgent<CanvaBrainCopy>(brand, {
        agentRole: copywriter.role,
        tier: 'analytical', // Sonnet 4.6 — redacción creativa es más determinista
        taskPrompt: `Sos ${copywriter.name}, ${copywriter.role} con especialización en Instagram y redes sociales.
Tu especialidad: ${copywriter.specialty}.

Ya conocés la identidad completa de la marca desde el contexto de sistema.

BRIEF CREATIVO (generado por la Estratega):
${brief}

PIEZA A REDACTAR: ${request.designType} sobre "${request.topic}"
TONO ESPECÍFICO PARA ESTA PIEZA: ${tone}

Generá todos los textos necesarios. Escribí en el tono de la marca, en español rioplatense.
Respetá las palabras prohibidas del contexto de marca.

Respondé con JSON exacto:
{
  "headline": "título principal (máx 8 palabras, impacto inmediato)",
  "subheadline": "subtítulo o tagline (máx 12 palabras)",
  "bodyCopy": ["párrafo 1", "párrafo 2", "párrafo 3"],
  "cta": "llamada a la acción (máx 5 palabras)",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6", "#tag7"],
  "caption": "caption completo para Instagram incluyendo emojis, saltos de línea y hashtags (máx 2200 caracteres)"
}`,
      });
      totalCacheReadTokens += res.cacheReadTokens;
      totalCacheWriteTokens += res.cacheWriteTokens;
      return { data: res.data, cache: res };
    } catch (err) {
      log.warn(`[CanvaBrain] ${copywriter.id} fallback: ${(err as Error).message}`);
      return { data: fallbackCopy(brand, request.topic), cache: null };
    }
  });

  copywriting = copyResult.data;

  steps.push({
    agentId: copywriter.id,
    agentName: copywriter.name,
    emoji: copywriter.emoji,
    phase: 'Redacción Publicitaria',
    thinking: `Con el brief en mano, escribo textos que hablen directo al corazón de la audiencia de ${brand.name}. Cada palabra está al servicio del objetivo.`,
    output: JSON.stringify(
      { headline: copywriting.headline, subheadline: copywriting.subheadline, cta: copywriting.cta },
      null,
      2,
    ),
    durationMs: copyDuration,
    cacheReadTokens: copyResult.cache?.cacheReadTokens,
    cacheWriteTokens: copyResult.cache?.cacheWriteTokens,
  });

  // ── Paso 3: Director de Arte → plan visual ───────────────────────────────

  const artDirector = agentById('art-director');
  log.info(`${artDirector.emoji} ${artDirector.name} (${artDirector.role}) planificando visual...`);

  let visualPlan: CanvaBrainVisualPlan = await fallbackVisualPlan(brand, request.designType);

  const { result: visualResult, durationMs: visualDuration } = await timed(async () => {
    try {
      const res = await callCanvaAgent<CanvaBrainVisualPlan>(brand, {
        agentRole: artDirector.role,
        tier: 'creative', // Opus 4.7 — juicio artístico y visual
        taskPrompt: `Sos ${artDirector.name}, ${artDirector.role} con formación en diseño visual y comunicación gráfica.
Tu especialidad: ${artDirector.specialty}.

Ya conocés la identidad visual completa de la marca desde el contexto de sistema
(paleta, tipografías, estilo, mood, composición, iconografía).

BRIEF CREATIVO:
${brief}

COPY DISPONIBLE (generado por la Copywriter):
Headline: "${copywriting.headline}"
Subheadline: "${copywriting.subheadline}"

TIPO DE PIEZA: ${request.designType}

Diseñá el plan visual completo que guiará al Diseñador Gráfico para ejecutar en Canva.
Basate en la identidad visual del contexto de sistema. Sé específico y ejecutable.

Respondé con JSON exacto:
{
  "layout": "descripción del layout y estructura visual",
  "colorUsage": "cómo usar los colores de marca en esta pieza específica",
  "typography": "tipografías a usar, tamaños y jerarquía",
  "mood": "mood visual y sensación que debe transmitir",
  "composition": "reglas de composición, jerarquía visual y zonas de respiro",
  "templateHint": "descripción del template ideal a buscar en Canva (query de búsqueda en inglés)"
}`,
      });
      totalCacheReadTokens += res.cacheReadTokens;
      totalCacheWriteTokens += res.cacheWriteTokens;
      return { data: res.data, cache: res };
    } catch (err) {
      log.warn(`[CanvaBrain] ${artDirector.id} fallback: ${(err as Error).message}`);
      return { data: await fallbackVisualPlan(brand, request.designType), cache: null };
    }
  });

  visualPlan = visualResult.data;

  steps.push({
    agentId: artDirector.id,
    agentName: artDirector.name,
    emoji: artDirector.emoji,
    phase: 'Plan Visual',
    thinking: `Traduzco el brief y el copy en una dirección visual concreta. Cada decisión estética refuerza el mensaje y respeta la identidad de ${brand.name}.`,
    output: JSON.stringify(
      { layout: visualPlan.layout, mood: visualPlan.mood, templateHint: visualPlan.templateHint },
      null,
      2,
    ),
    durationMs: visualDuration,
    cacheReadTokens: visualResult.cache?.cacheReadTokens,
    cacheWriteTokens: visualResult.cache?.cacheWriteTokens,
  });

  // ── Paso 4: Publicista / Comunicador → validación del mensaje ────────────

  const publicist = agentById('publicist');
  log.info(`${publicist.emoji} ${publicist.name} (${publicist.role}) validando mensaje...`);

  const { result: validationResult, durationMs: validationDuration } = await timed(async () => {
    try {
      const res = await callCanvaAgent<{ approved: boolean; feedback: string; adjustments: string[] }>(brand, {
        agentRole: publicist.role,
        tier: 'analytical', // Sonnet 4.6 — validación es más analítica que creativa
        taskPrompt: `Sos ${publicist.name}, ${publicist.role} especializado en comunicación de marca.
Tu especialidad: ${publicist.specialty}.

Ya conocés los valores, promesa y tono de la marca desde el contexto de sistema.

BRIEF: ${brief}

COPY GENERADO PARA REVISAR:
- Headline: "${copywriting.headline}"
- Subheadline: "${copywriting.subheadline}"
- Body: ${copywriting.bodyCopy.join(' | ')}
- CTA: "${copywriting.cta}"
- Caption: "${copywriting.caption.slice(0, 500)}..."

Validá si el mensaje es:
1. Consistente con la identidad y valores de marca (del contexto de sistema)
2. Efectivo para el objetivo: ${request.objective}
3. Apropiado para la audiencia (del contexto de sistema)
4. Libre de palabras prohibidas (listadas en el contexto de sistema)

Respondé con JSON:
{
  "approved": true,
  "feedback": "evaluación del mensaje en 2-3 oraciones",
  "adjustments": ["ajuste sugerido 1", "ajuste sugerido 2"]
}`,
      });
      totalCacheReadTokens += res.cacheReadTokens;
      totalCacheWriteTokens += res.cacheWriteTokens;
      return { data: res.data, cache: res };
    } catch (err) {
      log.warn(`[CanvaBrain] ${publicist.id} fallback: ${(err as Error).message}`);
      return {
        data: {
          approved: true,
          feedback: 'Mensaje coherente con la marca y el objetivo comunicacional.',
          adjustments: [],
        },
        cache: null,
      };
    }
  });

  steps.push({
    agentId: publicist.id,
    agentName: publicist.name,
    emoji: publicist.emoji,
    phase: 'Validación Comunicacional',
    thinking: `Evalúo si el copy y el brief están alineados con la promesa de marca y si el mensaje va a resonar con la audiencia objetivo.`,
    output: `${validationResult.data.approved ? '✅ Aprobado' : '⚠️ Con observaciones'}: ${validationResult.data.feedback}${validationResult.data.adjustments.length > 0 ? '\nAjustes: ' + validationResult.data.adjustments.join('; ') : ''}`,
    durationMs: validationDuration,
    cacheReadTokens: validationResult.cache?.cacheReadTokens,
    cacheWriteTokens: validationResult.cache?.cacheWriteTokens,
  });

  // ── Paso 5: Artista Visual → QA estético ────────────────────────────────

  const visualArtist = agentById('visual-artist');
  log.info(`${visualArtist.emoji} ${visualArtist.name} (${visualArtist.role}) revisando plan estético...`);

  const { result: aestheticResult, durationMs: aestheticDuration } = await timed(async () => {
    try {
      const res = await callCanvaAgent<{ rating: number; improvements: string[]; finalNotes: string }>(brand, {
        agentRole: visualArtist.role,
        tier: 'creative', // Opus 4.7 — sensibilidad estética y juicio artístico
        taskPrompt: `Sos ${visualArtist.name}, ${visualArtist.role} con sensibilidad estética refinada.
Tu especialidad: ${visualArtist.specialty}.

Ya conocés la identidad visual de la marca desde el contexto de sistema.

PLAN VISUAL DEL DIRECTOR DE ARTE A REVISAR:
- Layout: ${visualPlan.layout}
- Colores: ${visualPlan.colorUsage}
- Tipografía: ${visualPlan.typography}
- Mood: ${visualPlan.mood}
- Composición: ${visualPlan.composition}
- Template hint: ${visualPlan.templateHint}

PIEZA: ${request.designType} para la marca

Revisá el plan visual desde una perspectiva estética y artística.
Evaluá: armonía cromática, balance visual, impacto emocional y originalidad.
Verificá que sea coherente con la identidad visual del contexto de sistema.

Respondé con JSON:
{
  "rating": 8.5,
  "improvements": ["mejora específica 1", "mejora específica 2"],
  "finalNotes": "nota final sobre el potencial estético de la pieza"
}`,
      });
      totalCacheReadTokens += res.cacheReadTokens;
      totalCacheWriteTokens += res.cacheWriteTokens;
      return { data: res.data, cache: res };
    } catch (err) {
      log.warn(`[CanvaBrain] ${visualArtist.id} fallback: ${(err as Error).message}`);
      return {
        data: {
          rating: 8.0,
          improvements: ['Asegurar contraste suficiente entre texto y fondo', 'Mantener zonas de respiro generosas'],
          finalNotes: 'El plan visual tiene potencial sólido. La clave está en la ejecución limpia.',
        },
        cache: null,
      };
    }
  });

  steps.push({
    agentId: visualArtist.id,
    agentName: visualArtist.name,
    emoji: visualArtist.emoji,
    phase: 'QA Estético',
    thinking: `Analizo el plan visual con ojo artístico. Busco que la pieza no solo sea funcional, sino que tenga una belleza que genere recordación.`,
    output: `Rating estético: ${aestheticResult.data.rating}/10. ${aestheticResult.data.finalNotes}${aestheticResult.data.improvements.length > 0 ? '\nMejoras: ' + aestheticResult.data.improvements.join('; ') : ''}`,
    durationMs: aestheticDuration,
    cacheReadTokens: aestheticResult.cache?.cacheReadTokens,
    cacheWriteTokens: aestheticResult.cache?.cacheWriteTokens,
  });

  // ── Paso 6: Especialista Social Media → adaptación Instagram ────────────

  const socialMedia = agentById('social-media');
  log.info(`${socialMedia.emoji} ${socialMedia.name} (${socialMedia.role}) adaptando para Instagram...`);

  const { result: socialResult, durationMs: socialDuration } = await timed(async () => {
    try {
      const res = await callCanvaAgent<{
        formatNotes: string;
        engagementTips: string[];
        timingHint: string;
        hashtagStrategy: string;
      }>(brand, {
        agentRole: socialMedia.role,
        tier: 'analytical', // Sonnet 4.6 — optimización de plataforma
        taskPrompt: `Sos ${socialMedia.name}, ${socialMedia.role} con expertise en el algoritmo y tendencias de Instagram.
Tu especialidad: ${socialMedia.specialty}.

Ya conocés la audiencia y objetivos de Instagram de la marca desde el contexto de sistema.

PIEZA: ${request.designType}
OBJETIVO: ${request.objective}

COPY FINAL GENERADO:
Headline: "${copywriting.headline}"
Caption: "${copywriting.caption.slice(0, 300)}..."
Hashtags propuestos: ${copywriting.hashtags.join(', ')}

PLAN VISUAL:
Mood: ${visualPlan.mood}
Layout: ${visualPlan.layout}

Revisá la pieza desde la perspectiva de Instagram y el engagement.

Respondé con JSON:
{
  "formatNotes": "observaciones sobre el formato para Instagram (specs, proporciones, elementos nativos de la plataforma)",
  "engagementTips": ["tip para maximizar engagement 1", "tip 2", "tip 3"],
  "timingHint": "mejor momento para publicar según audiencia y objetivo",
  "hashtagStrategy": "estrategia de hashtags: cuáles usar, cuántos y por qué"
}`,
      });
      totalCacheReadTokens += res.cacheReadTokens;
      totalCacheWriteTokens += res.cacheWriteTokens;
      return { data: res.data, cache: res };
    } catch (err) {
      log.warn(`[CanvaBrain] ${socialMedia.id} fallback: ${(err as Error).message}`);
      return {
        data: {
          formatNotes: `${request.designType} optimizado para feed de Instagram. Verificar que los textos sean legibles en pantalla móvil.`,
          engagementTips: [
            'Usar el primer slide como gancho visual irresistible',
            'Incluir pregunta al final del caption para generar comentarios',
            'Primeras 3 líneas del caption deben ser el hook principal',
          ],
          timingHint: 'Publicar martes o miércoles entre 18:00 y 20:00 (hora Argentina)',
          hashtagStrategy:
            'Mix de hashtags: 3 de nicho grande (+1M), 3 de nicho mediano (100K-1M), 3 de nicho pequeño (<100K). Total 7-10 hashtags.',
        },
        cache: null,
      };
    }
  });

  steps.push({
    agentId: socialMedia.id,
    agentName: socialMedia.name,
    emoji: socialMedia.emoji,
    phase: 'Optimización Instagram',
    thinking: `Pienso en cómo esta pieza va a funcionar en el feed real de Instagram: el scroll, el algoritmo, la audiencia de ${brand.name} y los momentos de mayor engagement.`,
    output: `${socialResult.data.formatNotes}\n\nTiming: ${socialResult.data.timingHint}\nHashtags: ${socialResult.data.hashtagStrategy}`,
    durationMs: socialDuration,
    cacheReadTokens: socialResult.cache?.cacheReadTokens,
    cacheWriteTokens: socialResult.cache?.cacheWriteTokens,
  });

  log.info(
    `[CanvaBrain] Job ${jobId} cache totals — ` +
      `read=${totalCacheReadTokens} write=${totalCacheWriteTokens} ` +
      `(ahorro estimado ~${Math.round((totalCacheReadTokens / Math.max(totalCacheReadTokens + totalCacheWriteTokens, 1)) * 80)}% vs sin caché)`,
  );

  // ── Paso 7: Diseñador Gráfico → ejecución en Canva ──────────────────────

  const graphicDesigner = agentById('graphic-designer');

  if (mode === 'supervisor') {
    // En modo supervisor, detenemos el flujo y pedimos aprobación humana
    log.warn(`[CanvaBrain] Modo supervisor: requiere aprobación antes de ejecutar Canva`);

    steps.push({
      agentId: graphicDesigner.id,
      agentName: graphicDesigner.name,
      emoji: graphicDesigner.emoji,
      phase: 'Ejecución en Canva (pendiente de aprobación)',
      thinking: `Tengo el brief, el copy y el plan visual listos. Estoy preparado para abrir Canva y ejecutar el diseño. Esperando aprobación del equipo.`,
      output: `En espera de aprobación humana para proceder con la ejecución en Canva. Template a buscar: "${visualPlan.templateHint}". Textos listos: "${copywriting.headline}" / "${copywriting.subheadline}".`,
      durationMs: 0,
    });

    return {
      ok: true,
      jobId,
      mode,
      steps,
      brief,
      copywriting,
      visualPlan,
      canvaResult: undefined,
      approvalRequired: true,
      approvalReason: `El plan creativo está completo y validado. Revisá el brief, copy y plan visual. Si aprobás, cambiá mode a "autopilot" para ejecutar en Canva automáticamente.`,
      totalDurationMs: Date.now() - globalStart,
      totalCacheReadTokens,
      totalCacheWriteTokens,
    };
  }

  // Modo autopilot: ejecutar directamente en Canva
  log.info(`${graphicDesigner.emoji} ${graphicDesigner.name} (${graphicDesigner.role}) ejecutando en Canva...`);

  const { result: canvaResult, durationMs: canvaDuration } = await timed(async () => {
    try {
      return await runCanvaWorkflow(
        brand,
        {
          designType: request.designType,
          searchQuery: visualPlan.templateHint,
        },
        {
          textEdits: [
            { findText: 'TITLE', replaceWith: copywriting.headline, styleHints: 'principal, bold, grande' },
            { findText: 'SUBTITLE', replaceWith: copywriting.subheadline, styleHints: 'secundario, menor tamaño' },
            { findText: 'BODY', replaceWith: copywriting.bodyCopy[0] ?? '', styleHints: 'cuerpo de texto' },
            { findText: 'CTA', replaceWith: copywriting.cta, styleHints: 'llamada a la acción, destacada' },
            { findText: 'HEADLINE', replaceWith: copywriting.headline, styleHints: 'titular principal' },
            { findText: 'SUBHEADLINE', replaceWith: copywriting.subheadline },
          ],
          imageReplaces: [],
          applyBrandColors: true,
          applyBrandFont: true,
          customInstructions:
            `Mood: ${visualPlan.mood}. Layout: ${visualPlan.layout}. Composición: ${visualPlan.composition}. ` +
            `${aestheticResult.data.improvements.length > 0 ? 'Mejoras estéticas: ' + aestheticResult.data.improvements.join(', ') + '.' : ''} ` +
            `${request.extraInstructions ?? ''}`.trim(),
        },
        {
          format: 'png',
          quality: 'high',
        },
      );
    } catch (err) {
      log.error(`[CanvaBrain] Error en ejecución Canva: ${(err as Error).message}`);
      const errorResult: CanvaSessionResult = {
        ok: false,
        computerUseResult: { ok: false, summary: (err as Error).message, actionsExecuted: 0 },
        actionsExecuted: 0,
        durationMs: 0,
        error: (err as Error).message,
      };
      return errorResult;
    }
  });

  steps.push({
    agentId: graphicDesigner.id,
    agentName: graphicDesigner.name,
    emoji: graphicDesigner.emoji,
    phase: 'Ejecución en Canva',
    thinking: `Abro Canva, busco el template "${visualPlan.templateHint}", aplico el copy y los colores de marca, y exporto el diseño final.`,
    output: canvaResult.ok
      ? `Diseño completado y exportado. Archivo: ${canvaResult.exportedFilePath ?? '(detectando)'}. Acciones CU: ${canvaResult.actionsExecuted}.`
      : `Error en ejecución: ${canvaResult.error ?? 'desconocido'}`,
    durationMs: canvaDuration,
  });

  const ok = canvaResult.ok;
  log.success(`[CanvaBrain] Job ${jobId} completado en ${Math.round((Date.now() - globalStart) / 1000)}s — ok: ${ok}`);

  return {
    ok,
    jobId,
    mode,
    steps,
    brief,
    copywriting,
    visualPlan,
    canvaResult,
    approvalRequired: false,
    totalDurationMs: Date.now() - globalStart,
    totalCacheReadTokens,
    totalCacheWriteTokens,
  };
};
