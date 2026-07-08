/**
 * CU Optimizer — Placeholders para compilación
 * WIP: agregar batching, parallelization, caching
 */

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheCreationTokens: number;
  totalCostUsd: number;
}

export interface MessageWithCache {
  role?: string;
  content: string | unknown[];
  cache?: boolean;
}

/** Single executable Computer-Use step (click/type/scroll/etc). */
export interface CuAction {
  kind: 'click' | 'type' | 'scroll' | 'wait' | 'screenshot' | 'key';
  selector?: string;
  text?: string;
  priority: number;
  id: string;
  timestamp: number;
}

export interface CompressedScreenshot {
  b64: string;
  mediaType: 'image/png' | 'image/jpeg';
  sizeBytes: number;
  savedBytes: number;
}

export interface LoopCheckResult {
  isLoop: boolean;
  reason?: string;
}

export const optimizeCuPlan = (
  actions: CuAction[],
): { strategy: { mode: string }; batches: { actions: CuAction[] }[]; totalEstimatedMs: number; savingsMs: number; savingsPercent: number } => ({
  strategy: { mode: 'sequential' },
  batches: [{ actions }],
  totalEstimatedMs: 0,
  savingsMs: 0,
  savingsPercent: 0,
});

export const compressScreenshot = async (
  screenshot: string,
  _opts?: { maxWidth?: number; jpegQuality?: number; forceJpeg?: boolean },
): Promise<CompressedScreenshot> => ({
  b64: screenshot,
  mediaType: 'image/png',
  sizeBytes: screenshot.length,
  savedBytes: 0,
});

export const pruneMessageHistory = (
  messages: MessageWithCache[],
  _opts?: { keepLastScreenshots?: number; keepFirstNTurns?: number; maxTotalMessages?: number },
): MessageWithCache[] => messages;

export const withCacheBreakpoint = <T>(blocks: T): T => blocks;

export const clampCoordinate = (
  x: number,
  y: number,
  maxX: number = 1280,
  maxY: number = 800,
): [number, number] => [Math.max(0, Math.min(maxX, x)), Math.max(0, Math.min(maxY, y))];

export const detectActionLoop = (
  _sessionId?: string,
  _action?: string,
  _coordinate?: [number, number],
  _text?: string,
  _turn?: number,
): LoopCheckResult => ({ isLoop: false });

export const clearActionHistory = (_sessionId?: string): void => {};

export const shouldAbortNoProgress = (consecutiveEmptyTurns: number, maxEmptyTurns: number): boolean =>
  consecutiveEmptyTurns >= maxEmptyTurns;

export const newUsage = (): TokenUsage => ({
  inputTokens: 0,
  outputTokens: 0,
  cacheReadTokens: 0,
  cacheCreationTokens: 0,
  totalCostUsd: 0,
});

export const accumulateUsage = (a: TokenUsage, b: Partial<TokenUsage>): TokenUsage => ({
  inputTokens: a.inputTokens + (b.inputTokens || 0),
  outputTokens: a.outputTokens + (b.outputTokens || 0),
  cacheReadTokens: a.cacheReadTokens + (b.cacheReadTokens || 0),
  cacheCreationTokens: a.cacheCreationTokens + (b.cacheCreationTokens || 0),
  totalCostUsd: a.totalCostUsd + (b.totalCostUsd || 0),
});
