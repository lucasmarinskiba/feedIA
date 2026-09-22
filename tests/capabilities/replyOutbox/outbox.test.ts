import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_OUTBOX_SETTINGS, normalizeSettings } from '../../../src/capabilities/replyOutbox/outbox.js';
import type { SendFn } from './helpers.js';
import { input, makeHarness, MIN, SEC } from './helpers.js';

const { ttlMs: _ttl, origin: _origin, ...base } = input();

describe('normalizeSettings', () => {
  it('sin valores usa los de fábrica', () => {
    expect(normalizeSettings()).toEqual(DEFAULT_OUTBOX_SETTINGS);
  });

  it('nunca baja de la separación que exige compliance (20 s)', () => {
    expect(normalizeSettings({ minGapSec: 5 }).minGapSec).toBe(20);
    expect(normalizeSettings({ minGapSec: 45 }).minGapSec).toBe(45);
  });

  it('valores basura (variables de entorno mal escritas) vuelven al valor de fábrica', () => {
    const s = normalizeSettings({
      minGapSec: Number.NaN,
      jitterSec: -3,
      maxAttempts: 0,
      autoTtlMin: -1,
      humanTtlMin: Number.NaN,
      maxQueued: 0,
    });
    expect(s).toMatchObject({
      minGapSec: 30,
      jitterSec: DEFAULT_OUTBOX_SETTINGS.jitterSec,
      maxAttempts: DEFAULT_OUTBOX_SETTINGS.maxAttempts,
      autoTtlMin: DEFAULT_OUTBOX_SETTINGS.autoTtlMin,
      humanTtlMin: DEFAULT_OUTBOX_SETTINGS.humanTtlMin,
      maxQueued: DEFAULT_OUTBOX_SETTINGS.maxQueued,
    });
  });

  it('acota los intentos entre 1 y 10 y admite jitter 0', () => {
    expect(normalizeSettings({ maxAttempts: 99 }).maxAttempts).toBe(10);
    expect(normalizeSettings({ jitterSec: 0 }).jitterSec).toBe(0);
  });
});

describe('ReplyOutbox', () => {
  it('el vencimiento depende del origen: una persona espera más que el bot', () => {
    const h = makeHarness({ settings: { autoTtlMin: 60, humanTtlMin: 600 } });
    const auto = h.outbox.enqueue({ ...base, commentId: 'a', origin: 'auto' });
    const human = h.outbox.enqueue({ ...base, commentId: 'b', origin: 'human' });
    if (!auto.ok || !human.ok) throw new Error('enqueue');
    expect(auto.entry.expiresAt - auto.entry.enqueuedAt).toBe(60 * MIN);
    expect(human.entry.expiresAt - human.entry.enqueuedAt).toBe(600 * MIN);
  });

  it('las vistas no exponen el token de claim y las pendientes traen posición y ETA', async () => {
    const h = makeHarness();
    h.outbox.enqueue({ ...base, commentId: 'a', origin: 'human' });
    h.outbox.enqueue({ ...base, commentId: 'b', origin: 'human' });
    await h.outbox.dispatcher.tickOnce();

    const [queued] = h.outbox.list({ statuses: ['queued'] });
    expect(queued).toMatchObject({ commentId: 'b', ahead: 0 });
    expect(queued?.etaSec).toBe(30);

    const id = h.store.list({ statuses: ['queued'] })[0]?.id ?? '';
    h.store.claim(id, 'x', MIN);
    const sending = h.outbox.view(id);
    expect(sending?.status).toBe('sending');
    expect(sending).not.toHaveProperty('claim');
    expect(JSON.stringify(sending)).not.toContain('lastToken');
  });

  it('retry: revive una fallida y la despacha en el acto', async () => {
    const send = vi.fn<SendFn>(async () => ({ ok: false, error: 'Object does not exist', code: '100/33/X' }));
    const h = makeHarness({ send });
    const r = h.outbox.enqueue({ ...base, commentId: 'a', origin: 'human' });
    if (!r.ok) throw new Error('enqueue');
    await h.outbox.dispatcher.tickOnce();
    expect(h.store.get(r.entry.id)?.status).toBe('failed');

    send.mockResolvedValue({ ok: true });
    h.clock.advance(SEC);
    const res = await h.outbox.retry(r.entry.id);
    expect(res).toMatchObject({ ok: true, entry: { status: 'sent', attempts: 1 } });
  });

  it('retry: solo vale para fallidas o vencidas', async () => {
    const h = makeHarness();
    const r = h.outbox.enqueue({ ...base, commentId: 'a', origin: 'human' });
    if (!r.ok) throw new Error('enqueue');
    expect(await h.outbox.retry(r.entry.id)).toEqual({ ok: false, code: 'not-allowed' });
    expect(await h.outbox.retry('nope')).toEqual({ ok: false, code: 'not-found' });
  });

  it('retry: no duplica si el comentario ya tiene otra respuesta activa', async () => {
    const send = vi.fn<SendFn>(async () => ({ ok: false, error: 'Object does not exist', code: '100/33/X' }));
    const h = makeHarness({ send });
    const first = h.outbox.enqueue({ ...base, commentId: 'a', origin: 'human' });
    if (!first.ok) throw new Error('enqueue');
    await h.outbox.dispatcher.tickOnce();
    h.outbox.enqueue({ ...base, commentId: 'a', text: 'otra', origin: 'human' });

    expect(await h.outbox.retry(first.entry.id)).toEqual({ ok: false, code: 'duplicate' });
  });

  it('cancel: descarta en cola o fallida; no en vuelo ni enviada', async () => {
    const h = makeHarness();
    const q = h.outbox.enqueue({ ...base, commentId: 'a', origin: 'human' });
    const s = h.outbox.enqueue({ ...base, commentId: 'b', origin: 'human' });
    if (!q.ok || !s.ok) throw new Error('enqueue');

    expect(h.outbox.cancel(q.entry.id)).toMatchObject({ ok: true, entry: { status: 'cancelled' } });
    await h.outbox.dispatcher.tickOnce();
    expect(h.outbox.cancel(s.entry.id)).toEqual({ ok: false, code: 'not-allowed' });

    const c = h.outbox.enqueue({ ...base, commentId: 'c', origin: 'human' });
    if (!c.ok) throw new Error('enqueue');
    h.store.claim(c.entry.id, 'x', MIN);
    expect(h.outbox.cancel(c.entry.id)).toEqual({ ok: false, code: 'busy' });
    expect(h.outbox.cancel('nope')).toEqual({ ok: false, code: 'not-found' });
  });

  it('report: resumen + estado del despachador + configuración', async () => {
    const h = makeHarness();
    h.outbox.enqueue({ ...base, commentId: 'a', origin: 'human' });
    await h.outbox.dispatcher.tickOnce();
    const r = h.outbox.report();
    expect(r.summary.counts.sent).toBe(1);
    expect(r.dispatcher).toMatchObject({ started: false, holdUntil: null });
    expect(r.settings.minGapSec).toBe(30);
  });
});
