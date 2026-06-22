/**
 * metaApiClient — cliente robusto para Meta Graph API.
 *
 * Características:
 *  - Retries con backoff exponencial + jitter.
 *  - Respeto del header Retry-After en 429.
 *  - Clasificación de errores en recuperables (retriables) y fatales.
 *  - Errores tipados como MetaApiError.
 */

import { log } from '../agent/logger.js';

export class MetaApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly isRetriable: boolean;
  readonly isFatal: boolean;
  readonly attempts: number;

  constructor(
    message: string,
    opts: {
      status?: number;
      code?: string;
      isRetriable?: boolean;
      attempts?: number;
    } = {},
  ) {
    super(message);
    this.name = 'MetaApiError';
    this.status = opts.status ?? 0;
    this.code = opts.code;
    this.isRetriable = opts.isRetriable ?? isRetriableStatus(this.status);
    this.isFatal = !this.isRetriable;
    this.attempts = opts.attempts ?? 1;
  }
}

const isNetworkError = (err: unknown): boolean => {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return (
    msg.includes('fetch') ||
    msg.includes('network') ||
    msg.includes('econnrefused') ||
    msg.includes('etimedout') ||
    msg.includes('enotfound') ||
    msg.includes('abort')
  );
};

export const isRetriableStatus = (status: number): boolean => {
  if (status === 429) return true;
  if (status >= 500 && status <= 599) return true;
  if (status === 0) return true; // network / fetch failure
  return false;
};

const extractRetryAfterMs = (headers: Headers): number | null => {
  const value = headers.get('retry-after');
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  return null;
};

interface MetaErrorBody {
  error?: {
    message?: string;
    code?: number;
    error_subcode?: number;
    type?: string;
    fbtrace_id?: string;
  };
}

const parseMetaErrorBody = async (response: Response): Promise<{ message: string; code?: string }> => {
  let message = `Meta API ${response.status}`;
  let code: string | undefined;
  try {
    const body = (await response.json()) as MetaErrorBody;
    if (body.error) {
      message = body.error.message ?? message;
      const parts: string[] = [];
      if (body.error.code) parts.push(String(body.error.code));
      if (body.error.error_subcode) parts.push(String(body.error.error_subcode));
      if (body.error.type) parts.push(body.error.type);
      if (parts.length > 0) code = parts.join('/');
    }
  } catch {
    try {
      const text = await response.text();
      if (text) message += `: ${text.slice(0, 200)}`;
    } catch {
      // ignore
    }
  }
  return { message, code };
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const jitter = (ms: number): number => {
  const delta = ms * 0.2;
  return ms + (Math.random() * delta - delta / 2);
};

export interface MetaFetchOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  description?: string;
}

const DEFAULT_MAX_ATTEMPTS = 4;
const DEFAULT_BASE_DELAY_MS = 500;
const DEFAULT_MAX_DELAY_MS = 16_000;

export const metaFetch = async (
  input: string | URL | Request,
  init?: RequestInit,
  opts: MetaFetchOptions = {},
): Promise<Response> => {
  const maxAttempts = Math.max(1, opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
  const baseDelayMs = opts.baseDelayMs ?? DEFAULT_BASE_DELAY_MS;
  const maxDelayMs = opts.maxDelayMs ?? DEFAULT_MAX_DELAY_MS;

  let lastError: MetaApiError | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(input, init);

      if (response.ok) {
        return response;
      }

      const { message, code } = await parseMetaErrorBody(response);
      const retriable = isRetriableStatus(response.status);
      lastError = new MetaApiError(message, {
        status: response.status,
        code,
        isRetriable: retriable,
        attempts: attempt,
      });

      if (!retriable || attempt === maxAttempts) {
        throw lastError;
      }

      const retryAfter = extractRetryAfterMs(response.headers);
      const exponential = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      const delay = retryAfter ?? jitter(exponential);

      log.warn(
        `[metaApiClient] ${opts.description ?? input.toString()} recibió ${response.status} (${code}). Reintento ${attempt}/${maxAttempts - 1} en ${Math.round(delay)}ms`,
      );
      await sleep(delay);
    } catch (err) {
      if (err instanceof MetaApiError) {
        if (!err.isRetriable || attempt === maxAttempts) throw err;
        lastError = err;
      } else if (isNetworkError(err)) {
        lastError = new MetaApiError(err instanceof Error ? err.message : String(err), {
          status: 0,
          isRetriable: true,
          attempts: attempt,
        });
        if (attempt === maxAttempts) throw lastError;
      } else {
        // Errores inesperados no relacionados con la red no se reintentan.
        throw err;
      }

      const exponential = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      const delay = jitter(exponential);
      log.warn(
        `[metaApiClient] ${opts.description ?? input.toString()} error de red (intento ${attempt}/${maxAttempts - 1}), reintento en ${Math.round(delay)}ms`,
      );
      await sleep(delay);
    }
  }

  throw lastError ?? new MetaApiError('Unknown error', { attempts: maxAttempts });
};
