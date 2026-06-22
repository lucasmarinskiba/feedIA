/**
 * Whiteboard Interpreter
 * ─────────────────────────────────────────────────────────────────────────
 * Reads the board's textual + structural content (notes, ideas, concept-map
 * connectors, timelines, image alts) and uses the LLM to extract the user's
 * GOALS as a set of concrete directives. FeedIA then states what it
 * understood; the user can edit/cancel via "Directivas vigentes".
 *
 * The geometry of strokes is summarized (not sent pixel-by-pixel) so the
 * prompt stays small: we send the text content + the concept-map structure
 * (which note connects to which) + timeline milestones.
 */

import { askJson, claude } from '../../agent/claude.js';
import { env } from '../../config/index.js';
import type { BrandProfile } from '../../config/types.js';
import type { WbElement } from './store.js';
import { createDirective } from '../directives/index.js';
import type { Directive } from '../directives/index.js';

export interface BoardInterpretation {
  understood: string; // human-readable: what FeedIA understood
  extracted: Array<{ goal: string; asDirectiveText: string }>;
  createdDirectives: Directive[];
  noteCount: number;
}

/** Build a compact textual digest of the board for the LLM. */
const digestBoard = (elements: WbElement[]): string => {
  const byId = new Map(elements.map((e) => [e.id, e]));
  const lines: string[] = [];

  const texts = elements.filter((e) => e.type === 'note' || e.type === 'text');
  if (texts.length) {
    lines.push('NOTAS / IDEAS:');
    texts.forEach((t, i) => lines.push(`  ${i + 1}. ${(t.text ?? '').trim()}`));
  }

  const connectors = elements.filter((e) => e.type === 'connector');
  if (connectors.length) {
    lines.push('MAPA CONCEPTUAL (conexiones):');
    for (const c of connectors) {
      const a = c.from ? byId.get(c.from) : undefined;
      const b = c.to ? byId.get(c.to) : undefined;
      lines.push(`  • "${a?.text ?? '?'}" → "${b?.text ?? '?'}"${c.text ? ` (${c.text})` : ''}`);
    }
  }

  const timelines = elements.filter((e) => e.type === 'timeline');
  for (const tl of timelines) {
    lines.push(`LÍNEA DE TIEMPO${tl.text ? ` "${tl.text}"` : ''}:`);
    (tl.milestones ?? []).forEach((m) => lines.push(`  ▸ ${m.label}${m.at ? ` — ${m.at}` : ''}`));
  }

  const images = elements.filter((e) => e.type === 'image');
  if (images.length) lines.push(`IMÁGENES SUBIDAS: ${images.length} (referencias visuales para las piezas)`);

  const shapes = elements.filter((e) => e.type === 'shape');
  if (shapes.length) lines.push(`ESQUEMAS/FORMAS: ${shapes.length} bloques visuales`);

  const strokes = elements.filter((e) => e.type === 'stroke').length;
  if (strokes) lines.push(`DIBUJOS A MANO (tiza): ${strokes} trazos`);

  return lines.join('\n') || '(pizarra vacía)';
};

export const interpretBoard = async (brand: BrandProfile, elements: WbElement[]): Promise<BoardInterpretation> => {
  const digest = digestBoard(elements);
  const noteCount = elements.filter((e) => e.type === 'note' || e.type === 'text').length;

  if (noteCount === 0 && !elements.some((e) => e.type === 'timeline' || e.type === 'connector')) {
    return {
      understood:
        'La pizarra no tiene texto ni estructura interpretable todavía. Escribí ideas, notas o un mapa conceptual y volvé a interpretar.',
      extracted: [],
      createdDirectives: [],
      noteCount,
    };
  }

  const prompt = `Sos FeedIA, sistema autónomo de Instagram para la marca "${brand.name}" (nicho: ${brand.niche}).

El usuario dibujó/escribió en una pizarra virtual. Tu trabajo: ENTENDER qué quiere lograr y convertirlo en directivas accionables y recurrentes para gestionar su Instagram (producir/publicar contenido, responder mensajes, crecer, auditar, etc.).

CONTENIDO DE LA PIZARRA:
${digest}

Reglas:
- Interpretá la intención global, no copies literal.
- Cada directiva debe ser una instrucción ejecutable en español, estilo "Subí 1 carrusel por día sobre X", "Respondé todos los mensajes", "Publicá 3 reels por semana sobre Y", "Corré la auditoría de KPIs cada semana".
- Máximo 6 directivas. Priorizá las más claras.
- "understood" debe ser una explicación breve y cálida en 1-2 oraciones de lo que entendiste, para que el usuario confirme.

Respondé SOLO JSON:
{
  "understood": "explicación breve de lo que entendiste",
  "directives": ["texto de directiva 1", "texto de directiva 2", ...]
}`;

  const llm = await askJson<{ understood: string; directives: string[] }>(prompt, { maxTokens: 800 });

  const createdDirectives: Directive[] = [];
  const extracted: BoardInterpretation['extracted'] = [];
  for (const text of (llm.directives ?? []).slice(0, 6)) {
    if (!text || !text.trim()) continue;
    const d = createDirective(brand.name, text.trim(), 'pizarra');
    createdDirectives.push(d);
    extracted.push({ goal: text.trim(), asDirectiveText: d.interpretation });
  }

  return {
    understood: llm.understood || 'Interpreté tu pizarra y generé las directivas correspondientes.',
    extracted,
    createdDirectives,
    noteCount,
  };
};

/* ── OCR / interpretación VISUAL del dibujo (Claude multimodal) ──────────── */

/**
 * Lee la pizarra como IMAGEN (escritura a mano, esquemas, dibujos a tiza que
 * el modelo de elementos no captura) y extrae las metas como directivas.
 * Degrada con gracia si la visión no está disponible.
 */
export const interpretBoardVisual = async (brand: BrandProfile, pngBase64: string): Promise<BoardInterpretation> => {
  const data = pngBase64.replace(/^data:image\/png;base64,/, '');
  const prompt = `Sos FeedIA, sistema autónomo de Instagram para "${brand.name}" (nicho: ${brand.niche}).
Esta imagen es una pizarra que dibujó/escribió a mano el usuario. LEÉ todo: escritura a mano, flechas, esquemas, listas, líneas de tiempo, diagramas.
Convertí su intención en directivas accionables y recurrentes para gestionar su Instagram.
Reglas: máximo 6 directivas; cada una ejecutable en español ("Subí 1 carrusel por día sobre X", "Respondé todos los mensajes", etc.); "understood" breve y cálida.
Responde EXCLUSIVAMENTE JSON: { "understood": "...", "directives": ["...", ...] }`;

  let llm: { understood: string; directives: string[] };
  try {
    const resp = await claude.messages.create({
      model: env.modelPrimary,
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: [
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            { type: 'image', source: { type: 'base64', media_type: 'image/png', data } } as any,
            { type: 'text', text: prompt },
          ],
        },
      ],
    });
    const blk = resp.content[0];
    if (!blk || blk.type !== 'text') throw new Error('Respuesta sin texto');
    const cleaned = blk.text
      .trim()
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '');
    llm = JSON.parse(cleaned) as { understood: string; directives: string[] };
  } catch (err) {
    return {
      understood: `No pude leer el dibujo con visión (${(err as Error).message}). Probá escribir las ideas como notas/texto y usá "Interpretar".`,
      extracted: [],
      createdDirectives: [],
      noteCount: 0,
    };
  }

  const createdDirectives: Directive[] = [];
  const extracted: BoardInterpretation['extracted'] = [];
  for (const text of (llm.directives ?? []).slice(0, 6)) {
    if (!text || !text.trim()) continue;
    const d = createDirective(brand.name, text.trim(), 'pizarra');
    createdDirectives.push(d);
    extracted.push({ goal: text.trim(), asDirectiveText: d.interpretation });
  }
  return {
    understood: llm.understood || 'Leí tu dibujo y generé las directivas.',
    extracted,
    createdDirectives,
    noteCount: extracted.length,
  };
};
