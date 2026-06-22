/**
 * Concept Template Filler
 * ─────────────────────────────────────────────────────────────────────────
 * Takes a Concept Template + an idea + brand context and asks the LLM to
 * fill each slot. The output is a structured piece that the existing
 * Autonomous Producer / pipelines can render or render-and-publish.
 *
 * The LLM is constrained slot-by-slot — each slot has an explicit role,
 * instruction, and max length — so the model cannot drift off-template.
 */

import { askJson } from '../../agent/claude.js';
import { brandContext } from '../../agent/memory.js';
import type { BrandProfile } from '../../config/types.js';
import type { ConceptTemplate } from './templates.js';

export interface FilledTemplate {
  templateId: string;
  templateName: string;
  format: ConceptTemplate['format'];
  funnelPosition: ConceptTemplate['funnelPosition'];
  filledSlots: Array<{
    key: string;
    role: string;
    content: string;
  }>;
  rationale: string;
}

export const fillTemplate = async (
  brand: BrandProfile,
  template: ConceptTemplate,
  idea: string,
): Promise<FilledTemplate> => {
  const slotInstructions = template.slots
    .map(
      (s, i) =>
        `${i + 1}. [${s.key}] ${s.role}\n   Instrucción: ${s.instruction}\n   Máximo: ${s.maxLength ?? 200} caracteres`,
    )
    .join('\n\n');

  const prompt = `Actuás como productor de contenido senior aplicando una plantilla conceptual probada para Instagram.

${brandContext(brand)}

PLANTILLA: ${template.name} (${template.format} · funnel: ${template.funnelPosition} · goals: ${template.goals.join(', ')})
Por qué esta plantilla funciona: ${template.whyItWorks}
Ejemplo de uso: ${template.example}
Evitar: ${template.pitfalls.join(' · ')}

IDEA / ÁNGULO: ${idea}

LLENÁ CADA SLOT EN ORDEN. Cada slot tiene un rol narrativo concreto. NO inventes slots nuevos, NO los reordenes.

SLOTS:
${slotInstructions}

REGLAS DURAS:
- Cada slot debe respetar su instrucción y max length.
- Voz de marca: ${brand.voice.tone.join(', ')}.
- Prohibido decir: ${brand.voice.forbidden.join(', ') || '—'}.
- No clichés ni hedging.

JSON EXCLUSIVO:
{
  "filledSlots": [
    { "key": "slot-key-exact", "content": "contenido del slot" }
  ],
  "rationale": "1 oración: por qué esta instanciación va a performar"
}`;

  const result = await askJson<{
    filledSlots: Array<{ key: string; content: string }>;
    rationale: string;
  }>(prompt, { maxTokens: 2000 });

  // Re-attach role labels from the template so the consumer has full context.
  const filledSlots = template.slots.map((slot) => {
    const filled = result.filledSlots?.find((f) => f.key === slot.key);
    return {
      key: slot.key,
      role: slot.role,
      content: filled?.content ?? '',
    };
  });

  return {
    templateId: template.id,
    templateName: template.name,
    format: template.format,
    funnelPosition: template.funnelPosition,
    filledSlots,
    rationale: result.rationale ?? '',
  };
};

/**
 * Convert a filled template into the standard ContentPiece-ish shape used
 * downstream (compatible with content-scorer and originality-checker).
 */
export const flattenToContentDraft = (
  filled: FilledTemplate,
): {
  format: FilledTemplate['format'];
  hook: string;
  body: string;
  caption: string;
  cta: string;
} => {
  // Heuristic: first slot is the hook, last slot is the CTA, the rest is body.
  const slots = filled.filledSlots;
  const hook = slots[0]?.content ?? '';
  const cta = slots[slots.length - 1]?.content ?? '';
  const middle = slots
    .slice(1, -1)
    .map((s) => `${s.role.toUpperCase()}\n${s.content}`)
    .join('\n\n');
  return {
    format: filled.format,
    hook,
    body: middle,
    caption: `${hook}\n\n${middle}\n\n${cta}`,
    cta,
  };
};
