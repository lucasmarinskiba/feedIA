import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/index.js';
import { guardBudget, recordUsage } from './budget.js';

export const claude = new Anthropic({ apiKey: env.anthropicApiKey });

/** ¿Hay una API key de Anthropic configurada? (para chequeo previo en endpoints) */
export const hasApiKey = (): boolean => Boolean(env.anthropicApiKey && env.anthropicApiKey.trim());

const MISSING_KEY_MSG =
  'Falta configurar ANTHROPIC_API_KEY en el archivo .env para generar contenido con IA. ' +
  'Agregá tu clave (ANTHROPIC_API_KEY=sk-ant-...) y reiniciá el servidor.';

export class MissingApiKeyError extends Error {
  constructor() {
    super(MISSING_KEY_MSG);
    this.name = 'MissingApiKeyError';
  }
}

// ── Metering & circuit breaker sistémico ──────────────────────────────────
// Toda llamada a la API (orchestrator, talía, planner, crítico, ask, …) pasa
// por acá: se chequea el presupuesto ANTES y se contabiliza el consumo real
// DESPUÉS. Un único punto de control en vez de tocar cada caller. Si el tope
// diario está agotado lanza BudgetExceededError y el sistema cae a sus
// caminos deterministas (no gasta de más).
const _origCreate = claude.messages.create.bind(claude.messages);
claude.messages.create = (async (...args: Parameters<typeof _origCreate>): Promise<unknown> => {
  if (!hasApiKey()) throw new MissingApiKeyError();
  guardBudget();
  const res = await _origCreate(...args);
  const usage = (res as { usage?: { input_tokens?: number; output_tokens?: number } }).usage;
  const model = (args[0] as { model?: string }).model ?? 'unknown';
  if (usage) recordUsage(model, usage);
  return res;
}) as typeof claude.messages.create;

export interface PromptOptions {
  system?: string;
  maxTokens?: number;
  temperature?: number;
  fast?: boolean;
}

export const ask = async (prompt: string, opts: PromptOptions = {}): Promise<string> => {
  const model = opts.fast ? env.modelFast : env.modelPrimary;
  const response = await claude.messages.create({
    model,
    max_tokens: opts.maxTokens ?? 4096,
    temperature: opts.temperature ?? 0.7,
    ...(opts.system ? { system: opts.system } : {}),
    messages: [{ role: 'user', content: prompt }],
  });
  const block = response.content[0];
  if (!block || block.type !== 'text') {
    throw new Error('Respuesta inesperada de Claude (sin bloque de texto)');
  }
  return block.text;
};

export const askJson = async <T>(prompt: string, opts: PromptOptions = {}): Promise<T> => {
  const text = await ask(
    `${prompt}\n\nResponde EXCLUSIVAMENTE con JSON válido, sin texto antes ni después, sin bloques de código markdown.`,
    { ...opts, temperature: opts.temperature ?? 0.4 },
  );
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '');
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new Error(
      `No se pudo parsear JSON de Claude. Error: ${(err as Error).message}\nRespuesta:\n${text.slice(0, 500)}`,
    );
  }
};
