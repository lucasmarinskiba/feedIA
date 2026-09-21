import { BrandProfileSchema, type BrandProfile } from '../../../src/config/types.js';
import type { CommentLlm } from '../../../src/capabilities/commentBrain/llm.js';
import type { BrainConfig, Classification, CommentInput } from '../../../src/capabilities/commentBrain/types.js';
import type { GoldenCase } from './goldenSet.js';

export const makeBrand = (): BrandProfile =>
  BrandProfileSchema.parse({
    id: 'brand-test',
    name: 'Zapatos Norte',
    type: 'empresa',
    niche: 'calzado urbano',
    audience: { description: 'jóvenes urbanos', pains: [], desires: [] },
    voice: { tone: ['cercano', 'con humor'], forbidden: ['barato', 'gratis'] },
    visual: {},
    goals: { primary: 'engagement', metricsToWatch: [] },
  });

export const BALANCED: BrainConfig = { autonomy: 'balanced', minConfidence: 0.7 };
export const cleanVerdict = (): 'clean' => 'clean';

export const inputFor = (c: GoldenCase): CommentInput => ({
  commentId: `c-${c.id}`,
  handle: 'vecina_23',
  text: c.text,
  brand: makeBrand(),
  post: c.postCaption ? { postId: 'p-1', mediaType: 'IMAGE', caption: c.postCaption } : null,
  thread: null,
  facts: c.facts ?? [],
});

/** Frase única por caso: evita que el anti-repetición confunda respuestas guionadas entre sí. */
export const scriptedReply = (c: GoldenCase, variant: number): string =>
  `Variante ${variant} pensada para el caso ${c.id.replace(/-/g, ' ')} con texto propio`;

export interface ScriptOverrides {
  humorConfidence?: number;
  candidates?: (c: GoldenCase) => string[];
  pick?: number;
}

const findCase = (cases: GoldenCase[], prompt: string): GoldenCase => {
  const hits = cases.filter((c) => c.text.trim().length > 0 && prompt.includes(c.text.trim()));
  const best = hits.sort((a, b) => b.text.length - a.text.length)[0];
  if (!best) throw new Error('LLM guionado: no encuentro el caso en el prompt');
  return best;
};

/** LLM que responde con la etiqueta "ideal" del set dorado. Prueba política + flujo, no calidad de modelo. */
export const scriptedLlm = (cases: GoldenCase[], overrides: ScriptOverrides = {}): CommentLlm => ({
  json: async ({ prompt }) => {
    const c = findCase(cases, prompt);
    return JSON.stringify({
      kind: c.label.kind,
      sarcasm: { present: c.label.sarcasm !== null, stance: c.label.sarcasm },
      literalSentiment: 'neutral',
      trueSentiment: 'neutral',
      hostility: c.label.hostility,
      risk: c.label.risk,
      language: c.label.language ?? 'es',
      confidence: c.label.confidence,
      promptInjection: c.label.promptInjection ?? false,
      reasoning: 'etiqueta guionada',
    });
  },
  write: async ({ prompt }) => {
    const c = findCase(cases, prompt);
    const texts = overrides.candidates ? overrides.candidates(c) : [0, 1, 2].map((i) => scriptedReply(c, i));
    const grounded = c.label.grounded ?? true;
    return JSON.stringify({
      candidates: texts.map((text) => ({ text, angle: 'guionado' })),
      pick: overrides.pick ?? 0,
      grounded,
      needsHuman: !grounded,
      needsHumanReason: grounded ? '' : 'el dato no está en los hechos verificados',
      humorConfidence: overrides.humorConfidence ?? 0.9,
    });
  },
});

export const cls = (overrides: Partial<Classification> = {}): Classification => ({
  kind: 'praise',
  sarcasm: { present: false, stance: null },
  literalSentiment: 'neutral',
  trueSentiment: 'neutral',
  hostility: 0,
  risk: 'low',
  language: 'es',
  confidence: 0.9,
  promptInjection: false,
  hardFlags: [],
  reasoning: '',
  source: 'llm',
  ...overrides,
});
