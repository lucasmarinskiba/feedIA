/**
 * CU Optimizer — Placeholders para compilación
 * WIP: agregar batching, parallelization, caching
 */

export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  cacheReadTokens?: number;
  cacheCreationTokens?: number;
  totalCostUsd?: number;
}

export interface MessageWithCache {
  content: string;
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

export const optimizeCuPlan = (actions: unknown[]) => ({ strategy: { mode: 'sequential' }, batches: [], totalEstimatedMs: 0, savingsMs: 0, savingsPercent: 0 });

export const compressScreenshot = (screenshot: string): string => screenshot;
export const pruneMessageHistory = (messages: MessageWithCache[]): MessageWithCache[] => messages;
export const withCacheBreakpoint = (fn: Function): Function => fn;
export const clampCoordinate = (c: number): number => Math.max(0, Math.min(1280, c));
export const detectActionLoop = (): boolean => false;
export const clearActionHistory = (): void => {};
export const shouldAbortNoProgress = (): boolean => false;
export const newUsage = (): TokenUsage => ({ inputTokens: 0, outputTokens: 0 });
export const accumulateUsage = (a: TokenUsage, b: TokenUsage): TokenUsage => ({
  inputTokens: (a.inputTokens || 0) + (b.inputTokens || 0),
  outputTokens: (a.outputTokens || 0) + (b.outputTokens || 0),
});
