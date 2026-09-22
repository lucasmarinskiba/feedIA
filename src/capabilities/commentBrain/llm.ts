/**
 * Cliente LLM del Comment Brain.
 *
 * Interfaz mínima e inyectable (los tests usan un fake). La implementación por
 * defecto usa Claude (modelo "fast") cuando hay API key y presupuesto, y cae a
 * los proveedores gratuitos del TokenRouter cuando no.
 */

import { ask as claudeAsk, hasApiKey } from '../../agent/claude.js';
import { ask as routerAsk, budgetAwareFreeOnly } from '../../agent/tokenRouter.js';

export interface LlmCall {
  system: string;
  prompt: string;
}

export interface CommentLlm {
  /** Clasificación: determinista, respuesta JSON. */
  json: (call: LlmCall) => Promise<string>;
  /** Redacción: creativa, texto libre (JSON según el prompt). */
  write: (call: LlmCall) => Promise<string>;
}

const useClaude = (): boolean => hasApiKey() && !budgetAwareFreeOnly(false);

/**
 * El router cachea semánticamente todo lo que pida temperature <= 0.5. Para
 * clasificar comentarios eso es peligroso: "buenísimo" y "buenísimo 🙄" son
 * casi el mismo prompt y darían la misma etiqueta. Por eso el camino gratuito
 * usa 0.51 (por encima del umbral de cache).
 */
const FREE_CLASSIFY_TEMPERATURE = 0.51;

export const defaultCommentLlm: CommentLlm = {
  json: async ({ system, prompt }: LlmCall): Promise<string> => {
    if (useClaude()) {
      return claudeAsk(prompt, { system, fast: true, temperature: 0.1, maxTokens: 700 });
    }
    const res = await routerAsk(prompt, {
      taskType: 'analysis',
      systemPrompt: system,
      temperature: FREE_CLASSIFY_TEMPERATURE,
      maxTokens: 700,
      freeOnly: true,
    });
    return res.text;
  },
  write: async ({ system, prompt }: LlmCall): Promise<string> => {
    if (useClaude()) {
      return claudeAsk(prompt, { system, fast: true, temperature: 0.85, maxTokens: 700 });
    }
    const res = await routerAsk(prompt, {
      taskType: 'response',
      systemPrompt: system,
      temperature: 0.85,
      maxTokens: 700,
      freeOnly: true,
    });
    return res.text;
  },
};

/**
 * Extrae el primer objeto JSON de una respuesta de LLM, tolerando cercos
 * markdown y texto alrededor. Lanza si no hay JSON parseable.
 */
export const extractJson = (raw: string): unknown => {
  const cleaned = raw.replace(/```(?:json)?/gi, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('La respuesta del LLM no contiene un objeto JSON');
  }
  return JSON.parse(cleaned.slice(start, end + 1)) as unknown;
};
