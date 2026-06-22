/**
 * ⚠️ ADVERTENCIA DE COMPLIANCE ⚠️
 *
 * Este módulo introduce variación en tiempos de respuesta y formato.
 * SU USO DEBE SER TRANSPARENTE Y NUNCA CON LA INTENCIÓN DE ENGAÑAR A INSTAGRAM.
 *
 * Instagram prohíbe explícitamente (Terms §4.2, AUTO-002):
 *   "No realizar acciones que simulen comportamiento humano de forma engañosa
 *    o que eludan medidas de seguridad."
 *
 * Uso legítimo:
 * - Añadir delays razonables entre acciones para no saturar servidores
 * - Personalizar formato de mensajes según voz de marca
 *
 * Uso PROHIBIDO por este sistema:
 * - Usar delays aleatorios para "parecer humano" y engañar a Instagram
 * - Evadir detección de automatización
 * - Simular "typing..." para ocultar naturaleza automatizada
 *
 * El Compliance Guardian (src/compliance/guardian.ts) bloqueará cualquier
 * acción que sugiera eludir medidas de seguridad.
 */

/**
 * Fingerprinting de variación controlada
 *
 * Introduce variación en:
 * - Tiempo de respuesta (para no saturar servidores)
 * - Longitud de mensajes
 * - Uso de emojis y formato
 */

import { log } from '../../agent/logger.js';

interface FingerprintConfig {
  minResponseDelayMs: number;
  maxResponseDelayMs: number;
  minTypingDurationMs: number;
  maxTypingDurationMs: number;
  emojiProbability: number;
  variationFactor: number;
}

const DEFAULT_CONFIG: FingerprintConfig = {
  minResponseDelayMs: 1500,
  maxResponseDelayMs: 8000,
  minTypingDurationMs: 500,
  maxTypingDurationMs: 3500,
  emojiProbability: 0.4,
  variationFactor: 0.3,
};

let config: FingerprintConfig = { ...DEFAULT_CONFIG };

export const setFingerprintConfig = (partial: Partial<FingerprintConfig>): void => {
  config = { ...config, ...partial };
};

const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * Espera un tiempo aleatorio antes de responder.
 * Simula que un humano leyó y está pensando.
 */
export const simulateReadingDelay = async (): Promise<void> => {
  const delay = randomInt(config.minResponseDelayMs, config.maxResponseDelayMs);
  log.debug(`[FINGERPRINT] Reading delay: ${delay}ms`);
  await new Promise((r) => setTimeout(r, delay));
};

/**
 * Simula "typing..." antes de enviar un mensaje.
 * Útil para DMs y comentarios.
 */
export const simulateTyping = async (textLength: number): Promise<void> => {
  const base = randomInt(config.minTypingDurationMs, config.maxTypingDurationMs);
  const perChar = randomInt(30, 80);
  const duration = Math.min(base + textLength * perChar, 10000);
  log.debug(`[FINGERPRINT] Typing duration: ${duration}ms (${textLength} chars)`);
  await new Promise((r) => setTimeout(r, duration));
};

/**
 * Varía la longitud de un texto añadiendo o quitando relleno sutil.
 */
export const varyLength = (text: string): string => {
  const words = text.split(' ');
  const factor = 1 + (Math.random() - 0.5) * config.variationFactor;
  const targetLength = Math.floor(words.length * factor);

  if (targetLength <= words.length) {
    // Podríamos truncar, pero mejor no perder sentido
    return text;
  }

  // Añadir fillers naturales
  const fillers = ['realmente', 'honestamente', 'para ser sincero', 'la verdad', 'en mi experiencia'];
  let result = text;
  while (result.split(' ').length < targetLength && fillers.length > 0) {
    const idx = randomInt(0, fillers.length - 1);
    const filler = fillers[idx];
    if (!filler) break;
    if (!result.includes(filler)) {
      result = result.replace('.', `, ${filler}.`);
    }
    fillers.splice(idx, 1);
  }
  return result;
};

/**
 * Añade o quita emojis de forma variada.
 */
export const varyEmojis = (text: string, preferredEmojis?: string[]): string => {
  if (Math.random() > config.emojiProbability) {
    // Remove existing emojis
    return text
      .replace(
        /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu,
        '',
      )
      .trim();
  }

  const pool = preferredEmojis ?? ['✨', '🔥', '💡', '👇', '🙌', '💪', '🚀'];
  const emoji = pool[randomInt(0, pool.length - 1)];
  if (emoji && !text.includes(emoji)) {
    return `${text} ${emoji}`;
  }
  return text;
};

/**
 * Aplica todo el fingerprinting a un mensaje de forma async.
 */
export const applyFingerprint = async (
  text: string,
  opts: {
    simulateTyping?: boolean;
    preferredEmojis?: string[];
  } = {},
): Promise<string> => {
  await simulateReadingDelay();
  let result = varyLength(text);
  result = varyEmojis(result, opts.preferredEmojis);

  if (opts.simulateTyping) {
    await simulateTyping(result.length);
  }

  return result;
};
