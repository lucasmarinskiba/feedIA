import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { metaFetch, MetaApiError, isRetriableStatus } from '../../src/integrations/metaApiClient.js';

describe('metaApiClient', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('reintenta errores 5xx y finalmente tiene éxito', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('error', { status: 500 }))
      .mockResolvedValueOnce(new Response('error', { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'post-123' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const promise = metaFetch('https://graph.facebook.com/v18.0/me/media', { method: 'POST' });
    await vi.runAllTimersAsync();
    const res = (await promise) as Response;

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(res.ok).toBe(true);
    expect(await res.json()).toEqual({ id: 'post-123' });
  });

  it('respeta Retry-After en 429 y reintenta', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: 'Rate limit', code: 4 } }), {
          status: 429,
          headers: { 'retry-after': '1' },
        }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'post-123' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const promise = metaFetch('https://graph.facebook.com/v18.0/me/media', {}, { maxAttempts: 3, baseDelayMs: 50 });
    await vi.runAllTimersAsync();
    const res = (await promise) as Response;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.ok).toBe(true);
  });

  it('no reintenta errores fatales (401) y expone isFatal', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'Invalid token', code: 190, type: 'OAuthException' } }), {
        status: 401,
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    await expect(metaFetch('https://graph.facebook.com/v18.0/me', {}, { maxAttempts: 3 })).rejects.toSatisfy(
      (err: unknown) => {
        const metaErr = err as MetaApiError;
        expect(metaErr).toBeInstanceOf(MetaApiError);
        expect(metaErr.status).toBe(401);
        expect(metaErr.isFatal).toBe(true);
        expect(metaErr.isRetriable).toBe(false);
        return true;
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('reintenta errores de red y finalmente tiene éxito', async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError('fetch failed'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: 'post-123' }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const promise = metaFetch('https://graph.facebook.com/v18.0/me/media', {}, { maxAttempts: 3, baseDelayMs: 10 });
    await vi.runAllTimersAsync();
    const res = (await promise) as Response;

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(res.ok).toBe(true);
  });

  it('agota reintentos en 500 y lanza error retriable', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('Internal error', { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(metaFetch('https://graph.facebook.com/v18.0/me', {}, { maxAttempts: 2 })).rejects.toSatisfy(
      (err: unknown) => {
        const metaErr = err as MetaApiError;
        expect(metaErr.status).toBe(500);
        expect(metaErr.isRetriable).toBe(true);
        expect(metaErr.attempts).toBe(2);
        return true;
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('clasifica correctamente estados recuperables vs fatales', () => {
    expect(isRetriableStatus(429)).toBe(true);
    expect(isRetriableStatus(500)).toBe(true);
    expect(isRetriableStatus(503)).toBe(true);
    expect(isRetriableStatus(0)).toBe(true);
    expect(isRetriableStatus(400)).toBe(false);
    expect(isRetriableStatus(401)).toBe(false);
    expect(isRetriableStatus(403)).toBe(false);
    expect(isRetriableStatus(404)).toBe(false);
  });
});
