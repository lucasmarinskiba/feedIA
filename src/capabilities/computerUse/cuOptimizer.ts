/**
 * CU Optimizer — utilities para optimizar el agente Computer Use.
 *
 * Objetivos:
 *   - Reducir tokens (image compression, history pruning, prompt caching)
 *   - Evitar cuelgues (sanitize coords, loop detection)
 *   - Mejorar velocidad (caching, batch ops)
 *
 * Sin dependencias externas — usa solo Node built-ins.
 */

import { log } from '../../agent/logger.js';

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface MessageWithCache {
  role: 'user' | 'assistant';
  content: unknown;
}

export interface PruneOptions {
  keepLastScreenshots: number; // default 4
  keepFirstNTurns: number; // default 1 (mantener prompt inicial)
  maxTotalMessages: number; // default 50
}

export interface CompressOptions {
  maxWidth: number; // default 1280
  jpegQuality: number; // default 70 (0-100)
  forceJpeg: boolean; // convertir PNG→JPEG (mucho menor)
}

export interface ActionFingerprint {
  action: string;
  coordinate?: string; // "x,y" rounded a bucket de 10px
  text?: string;
  turn: number;
}

// ── Image compression ────────────────────────────────────────────────────────

/**
 * Estima tamaño en bytes de base64.
 * 4 chars base64 = 3 bytes raw.
 */
export const estimateBase64Bytes = (b64: string): number => Math.floor((b64.length * 3) / 4);

/**
 * Estima tokens consumidos por imagen. Anthropic cobra ~750 tokens por imagen 1568x1568.
 * Para imágenes menores, escala proporcional.
 */
export const estimateImageTokens = (b64: string, width = 1280, height = 800): number => {
  const pixels = width * height;
  const refPixels = 1568 * 1568;
  return Math.round(750 * (pixels / refPixels));
};

/**
 * Convierte base64 PNG a JPEG comprimido reduciendo tamaño ~80%.
 * No requiere libs externas — usa Sharp si está disponible, fallback noop.
 */
export const compressScreenshot = async (
  b64: string,
  opts: Partial<CompressOptions> = {},
): Promise<{ b64: string; mediaType: 'image/jpeg' | 'image/png'; sizeBytes: number; savedBytes: number }> => {
  const cfg: CompressOptions = { maxWidth: 1280, jpegQuality: 70, forceJpeg: true, ...opts };
  const originalBytes = estimateBase64Bytes(b64);

  try {
    const sharp = (await import('sharp' as string).catch(() => null)) as { default?: (b: Buffer) => unknown } | null;
    if (!sharp?.default) {
      // Sin sharp → devolvemos original sin tocar
      return { b64, mediaType: 'image/png', sizeBytes: originalBytes, savedBytes: 0 };
    }
    const buf = Buffer.from(b64, 'base64');
    const pipeline = sharp.default(buf) as {
      resize: (o: { width: number; withoutEnlargement: boolean }) => unknown;
      jpeg: (o: { quality: number; mozjpeg: boolean }) => unknown;
      png: (o: { compressionLevel: number }) => unknown;
      toBuffer: () => Promise<Buffer>;
    };
    const resized = pipeline.resize({ width: cfg.maxWidth, withoutEnlargement: true }) as typeof pipeline;
    const out = cfg.forceJpeg
      ? await (resized.jpeg({ quality: cfg.jpegQuality, mozjpeg: true }) as typeof pipeline).toBuffer()
      : await (resized.png({ compressionLevel: 9 }) as typeof pipeline).toBuffer();
    const compressed = out.toString('base64');
    const newBytes = estimateBase64Bytes(compressed);
    return {
      b64: compressed,
      mediaType: cfg.forceJpeg ? 'image/jpeg' : 'image/png',
      sizeBytes: newBytes,
      savedBytes: originalBytes - newBytes,
    };
  } catch (err) {
    log.warn('[cuOptimizer] compress failed, using original', { err: String(err) });
    return { b64, mediaType: 'image/png', sizeBytes: originalBytes, savedBytes: 0 };
  }
};

// ── History pruning ──────────────────────────────────────────────────────────

/**
 * Elimina screenshots viejas del historial para evitar explosión de tokens.
 *
 * Estrategia:
 *   1. Mantener los primeros N turns (contexto inicial).
 *   2. Mantener los últimos M screenshots completos.
 *   3. Para screenshots intermedias, reemplazar por placeholder de texto.
 */
export const pruneMessageHistory = (
  messages: MessageWithCache[],
  opts: Partial<PruneOptions> = {},
): MessageWithCache[] => {
  const cfg: PruneOptions = {
    keepLastScreenshots: 4,
    keepFirstNTurns: 1,
    maxTotalMessages: 50,
    ...opts,
  };

  if (messages.length <= cfg.maxTotalMessages) {
    return pruneScreenshotsInPlace(messages, cfg);
  }

  // Mantener primer N + últimos (maxTotalMessages - N)
  const keepFirst = messages.slice(0, cfg.keepFirstNTurns * 2);
  const keepLast = messages.slice(-(cfg.maxTotalMessages - keepFirst.length));
  const trimmed = [...keepFirst, ...keepLast];
  return pruneScreenshotsInPlace(trimmed, cfg);
};

const pruneScreenshotsInPlace = (messages: MessageWithCache[], cfg: PruneOptions): MessageWithCache[] => {
  // Recolectar índices de mensajes con screenshots
  const screenshotIndices: number[] = [];
  messages.forEach((m, i) => {
    if (Array.isArray(m.content)) {
      const hasImage = m.content.some((c: unknown) => {
        const block = c as { type?: string; source?: { type?: string } };
        return block.type === 'image' || (block.type === 'tool_result' && JSON.stringify(c).includes('image'));
      });
      if (hasImage) screenshotIndices.push(i);
    }
  });

  // Mantener solo las últimas N screenshots, las anteriores reemplazar
  if (screenshotIndices.length <= cfg.keepLastScreenshots) return messages;
  const toPrune = screenshotIndices.slice(0, screenshotIndices.length - cfg.keepLastScreenshots);

  return messages.map((m, i) => {
    if (!toPrune.includes(i)) return m;
    if (!Array.isArray(m.content)) return m;
    // Reemplazar imágenes por placeholder
    const newContent = m.content.map((c: unknown) => {
      const block = c as { type?: string; source?: unknown };
      if (block.type === 'image') {
        return { type: 'text', text: '[screenshot anterior - omitida para ahorrar tokens]' };
      }
      // tool_result con imagen
      if (block.type === 'tool_result') {
        const tr = c as { type: 'tool_result'; tool_use_id: string; content?: unknown[] };
        return {
          type: 'tool_result',
          tool_use_id: tr.tool_use_id,
          content: [{ type: 'text', text: '[screenshot anterior - omitida]' }],
        };
      }
      return c;
    });
    return { role: m.role, content: newContent };
  });
};

// ── Prompt caching helpers ───────────────────────────────────────────────────

/**
 * Marca el último bloque del system con cache_control: ephemeral.
 * El system + tool definitions se cachean → ahorra ~90% input tokens en turns 2+.
 *
 * Requiere beta header `prompt-caching-2024-07-31` o ya GA según versión.
 */
export const withCacheBreakpoint = (
  systemBlocks: Array<{ type: 'text'; text: string; cache_control?: { type: 'ephemeral' } }>,
): typeof systemBlocks => {
  if (systemBlocks.length === 0) return systemBlocks;
  const last = { ...systemBlocks[systemBlocks.length - 1]!, cache_control: { type: 'ephemeral' as const } };
  return [...systemBlocks.slice(0, -1), last];
};

// ── Coordinate sanitization ──────────────────────────────────────────────────

/**
 * Clamp coordenadas dentro del viewport para evitar errores Playwright.
 */
export const clampCoordinate = (x: number, y: number, width: number, height: number): [number, number] => {
  return [Math.max(0, Math.min(width - 1, Math.round(x))), Math.max(0, Math.min(height - 1, Math.round(y)))];
};

// ── Loop detection ───────────────────────────────────────────────────────────

const recentActionsByCu = new Map<string, ActionFingerprint[]>();

/**
 * Detecta si el agente está en loop infinito (mismo gesto repetido).
 * Devuelve true si las últimas N acciones son sospechosamente similares.
 */
export const detectActionLoop = (
  sessionId: string,
  action: string,
  coordinate: [number, number] | undefined,
  text: string | undefined,
  turn: number,
  loopThreshold = 3,
): { isLoop: boolean; reason?: string } => {
  const history = recentActionsByCu.get(sessionId) ?? [];
  const fingerprint: ActionFingerprint = {
    action,
    coordinate: coordinate
      ? `${Math.round(coordinate[0] / 10) * 10},${Math.round(coordinate[1] / 10) * 10}`
      : undefined,
    text: text?.slice(0, 50),
    turn,
  };
  history.push(fingerprint);
  if (history.length > 10) history.shift();
  recentActionsByCu.set(sessionId, history);

  if (history.length < loopThreshold) return { isLoop: false };

  // Chequear si las últimas N acciones son idénticas
  const recent = history.slice(-loopThreshold);
  const allSame = recent.every(
    (a) => a.action === fingerprint.action && a.coordinate === fingerprint.coordinate && a.text === fingerprint.text,
  );
  if (allSame) {
    return { isLoop: true, reason: `Acción "${action}" repetida ${loopThreshold} veces idénticamente` };
  }
  return { isLoop: false };
};

export const clearActionHistory = (sessionId: string): void => {
  recentActionsByCu.delete(sessionId);
};

// ── Adaptive turn limits ─────────────────────────────────────────────────────

/**
 * Calcula si debe abortar la sesión basado en progreso.
 * Si los últimos N turns no produjeron acciones nuevas, abortar.
 */
export const shouldAbortNoProgress = (consecutiveEmptyTurns: number, maxEmptyTurns = 3): boolean =>
  consecutiveEmptyTurns >= maxEmptyTurns;

// ── Token usage tracking ─────────────────────────────────────────────────────

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  imagesProcessed: number;
  totalCostUsd: number;
}

const COST_PER_1M = {
  inputTokens: 3.0, // claude-opus-4 input
  outputTokens: 15.0,
  cacheCreationTokens: 3.75,
  cacheReadTokens: 0.3, // 10x cheaper
};

export const calculateCost = (usage: TokenUsage): number => {
  return (
    (usage.inputTokens / 1_000_000) * COST_PER_1M.inputTokens +
    (usage.outputTokens / 1_000_000) * COST_PER_1M.outputTokens +
    (usage.cacheCreationTokens / 1_000_000) * COST_PER_1M.cacheCreationTokens +
    (usage.cacheReadTokens / 1_000_000) * COST_PER_1M.cacheReadTokens
  );
};

export const accumulateUsage = (acc: TokenUsage, delta: Partial<TokenUsage>): TokenUsage => ({
  inputTokens: acc.inputTokens + (delta.inputTokens ?? 0),
  outputTokens: acc.outputTokens + (delta.outputTokens ?? 0),
  cacheReadTokens: acc.cacheReadTokens + (delta.cacheReadTokens ?? 0),
  cacheCreationTokens: acc.cacheCreationTokens + (delta.cacheCreationTokens ?? 0),
  imagesProcessed: acc.imagesProcessed + (delta.imagesProcessed ?? 0),
  totalCostUsd: calculateCost({
    inputTokens: acc.inputTokens + (delta.inputTokens ?? 0),
    outputTokens: acc.outputTokens + (delta.outputTokens ?? 0),
    cacheReadTokens: acc.cacheReadTokens + (delta.cacheReadTokens ?? 0),
    cacheCreationTokens: acc.cacheCreationTokens + (delta.cacheCreationTokens ?? 0),
    imagesProcessed: 0,
    totalCostUsd: 0,
  }),
});

export const newUsage = (): TokenUsage => ({
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheCreationTokens: 0,
  imagesProcessed: 0,
  totalCostUsd: 0,
});
