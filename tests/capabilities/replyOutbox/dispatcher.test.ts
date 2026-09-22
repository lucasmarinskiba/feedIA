import { describe, expect, it, vi } from 'vitest';
import { createDispatcher, type RateProbe } from '../../../src/capabilities/replyOutbox/dispatcher.js';
import { createMemoryLogs } from '../../../src/capabilities/replyOutbox/store.js';
import type { OutboxEntry } from '../../../src/capabilities/replyOutbox/types.js';
import { input, makeClock, makeHarness, makeStore, MIN, SEC, type SendFn } from './helpers.js';

const enqueue = (h: ReturnType<typeof makeHarness>, over: Parameters<typeof input>[0] = {}): string => {
  const r = h.outbox.enqueue({ ...input(over) });
  if (!r.ok) throw new Error(`enqueue: ${r.reason}`);
  return r.entry.id;
};

const rate = (over: Partial<RateProbe> = {}): RateProbe => ({ allowed: true, count: 0, limit: 30, ...over });

describe('dispatcher: ritmo', () => {
  it('con la cola libre envía en el acto', async () => {
    const h = makeHarness();
    const id = enqueue(h);
    expect(await h.outbox.dispatcher.tickOnce()).toEqual({ kind: 'sent', id });
    expect(h.send).toHaveBeenCalledWith('c-1', input().text);
    expect(h.store.get(id)?.status).toBe('sent');
  });

  it('separa los envíos: la segunda respuesta espera la separación mínima', async () => {
    const h = makeHarness();
    enqueue(h, { commentId: 'a' });
    const second = enqueue(h, { commentId: 'b' });
    await h.outbox.dispatcher.tickOnce();

    const wait = await h.outbox.dispatcher.tickOnce();
    expect(wait).toMatchObject({ kind: 'throttled', wakeAt: h.clock.now() + 30 * SEC });
    expect(h.send).toHaveBeenCalledTimes(1);

    h.clock.advance(30 * SEC);
    expect(await h.outbox.dispatcher.tickOnce()).toEqual({ kind: 'sent', id: second });
  });

  it('el jitter agrega una espera al azar acotada (no es un metrónomo)', async () => {
    const seen = new Set<number>();
    for (const r of [0, 0.5, 0.99]) {
      const h = makeHarness({ rng: () => r, settings: { minGapSec: 30, jitterSec: 10 } });
      enqueue(h, { commentId: 'a' });
      enqueue(h, { commentId: 'b' });
      await h.outbox.dispatcher.tickOnce();
      const t = await h.outbox.dispatcher.tickOnce();
      if (t.kind !== 'throttled') throw new Error('esperaba throttled');
      const gap = t.wakeAt - h.clock.now();
      expect(gap).toBeGreaterThanOrEqual(30 * SEC);
      expect(gap).toBeLessThan(40 * SEC);
      seen.add(gap);
    }
    expect(seen.size).toBeGreaterThan(1);
  });

  it('respeta el límite de compliance: espera lo que diga el limitador y después envía', async () => {
    let probe = rate({ allowed: false, waitSec: 90, reason: 'Límite de 30 acciones/hora' });
    const h = makeHarness({ probeRate: () => probe });
    const id = enqueue(h);

    const t = await h.outbox.dispatcher.tickOnce();
    expect(t).toMatchObject({ kind: 'throttled', reason: 'Límite de 30 acciones/hora' });
    if (t.kind === 'throttled') expect(t.wakeAt - h.clock.now()).toBeGreaterThanOrEqual(90 * SEC);
    expect(h.send).not.toHaveBeenCalled();

    probe = rate();
    expect(await h.outbox.dispatcher.tickOnce()).toEqual({ kind: 'sent', id });
  });

  it('reserva cupo horario para personas: con el tope casi lleno, el bot no gasta lo que queda', async () => {
    // limit 30, reserva 20% = 6 → el bot solo puede usar hasta 23 en la hora.
    const h = makeHarness({ probeRate: () => rate({ count: 24, limit: 30 }) });
    const auto = enqueue(h, { commentId: 'bot', origin: 'auto' });
    expect(await h.outbox.dispatcher.tickOnce()).toMatchObject({ kind: 'idle' });
    expect(h.send).not.toHaveBeenCalled();

    const human = enqueue(h, { commentId: 'persona', origin: 'human' });
    expect(await h.outbox.dispatcher.tickOnce()).toEqual({ kind: 'sent', id: human });
    expect(h.store.get(auto)?.status).toBe('queued');
  });

  it('las personas salen antes que el bot aunque hayan llegado después', async () => {
    const h = makeHarness();
    enqueue(h, { commentId: 'bot', origin: 'auto' });
    h.clock.advance(SEC);
    const human = enqueue(h, { commentId: 'persona', origin: 'human' });
    expect(await h.outbox.dispatcher.tickOnce()).toEqual({ kind: 'sent', id: human });
  });
});

describe('dispatcher: puertas', () => {
  it('bot apagado u horario silencioso: lo del bot espera, lo de una persona sale', async () => {
    let open = false;
    const h = makeHarness({ autoGate: () => (open ? { open: true } : { open: false, reason: 'comment-bot apagado' }) });
    const auto = enqueue(h, { commentId: 'bot', origin: 'auto' });
    const human = enqueue(h, { commentId: 'persona', origin: 'human' });

    expect(await h.outbox.dispatcher.tickOnce()).toEqual({ kind: 'sent', id: human });
    h.clock.advance(MIN);
    expect(await h.outbox.dispatcher.tickOnce()).toMatchObject({ kind: 'idle' });
    expect(h.store.get(auto)?.status).toBe('queued');

    open = true;
    expect(await h.outbox.dispatcher.tickOnce()).toEqual({ kind: 'sent', id: auto });
  });

  it('una respuesta que espera por la puerta no genera un bucle de reintentos rápidos', async () => {
    const h = makeHarness({ autoGate: () => ({ open: false, reason: 'horario silencioso' }) });
    enqueue(h, { origin: 'auto' });
    const t = await h.outbox.dispatcher.tickOnce();
    expect(t).toMatchObject({ kind: 'idle' });
    if (t.kind === 'idle') expect(t.wakeAt).toBeGreaterThan(h.clock.now());
  });

  it('preflight cerrado (emergencia, GlassBox en pausa): no se intenta NADA, ni de personas', async () => {
    let ok = false;
    const h = makeHarness({
      preflight: () =>
        ok ? { ok: true } : { ok: false, code: 'glassbox-paused', reason: 'GlassBox en pausa', waitMs: 60_000 },
    });
    const id = enqueue(h, { origin: 'human' });

    const t = await h.outbox.dispatcher.tickOnce();
    expect(t).toMatchObject({ kind: 'held', wakeAt: h.clock.now() + 60_000 });
    expect(h.send).not.toHaveBeenCalled();
    expect(h.outbox.dispatcher.status().holdReason).toContain('glassbox-paused');

    ok = true;
    h.clock.advance(60_000);
    expect(await h.outbox.dispatcher.tickOnce()).toEqual({ kind: 'sent', id });
    expect(h.outbox.dispatcher.status().holdReason).toBeNull();
  });
});

describe('dispatcher: fallos de envío', () => {
  it('por ritmo: no gasta intentos y reprograma con la espera del limitador', async () => {
    const send = vi.fn<SendFn>(async () => ({ ok: false, error: 'Compliance: Debe esperar 20s entre acciones' }));
    const h = makeHarness({ send });
    const id = enqueue(h);

    expect(await h.outbox.dispatcher.tickOnce()).toMatchObject({ kind: 'retry', code: 'compliance-spacing' });
    const e = h.store.get(id);
    expect(e).toMatchObject({ status: 'queued', attempts: 0 });
    expect(e?.notBefore).toBeGreaterThanOrEqual(h.clock.now() + 20 * SEC);
  });

  it('por ritmo: si el limitador sabe cuánto falta, manda esa cifra', async () => {
    const send = vi.fn<SendFn>(async () => ({ ok: false, error: 'Compliance: Límite de 30 acciones/hora alcanzado' }));
    const h = makeHarness({ send, probeRate: () => rate() });
    // El probe del despachador dice "permitido" al elegir; después del fallo pregunta de nuevo:
    let calls = 0;
    const probe = (): RateProbe => (++calls <= 1 ? rate() : rate({ allowed: false, waitSec: 1234 }));
    const h2 = makeHarness({ send, probeRate: probe });
    const id = enqueue(h2);
    await h2.outbox.dispatcher.tickOnce();
    expect(h2.store.get(id)?.notBefore).toBeGreaterThanOrEqual(h2.clock.now() + 1234 * SEC);
    expect(h.send).not.toHaveBeenCalled();
  });

  it('del sistema (token vencido): pausa TODO el despacho y no gasta el intento', async () => {
    const send = vi.fn<SendFn>(async () => ({
      ok: false,
      error: 'Invalid OAuth access token',
      code: '190/OAuthException',
    }));
    const h = makeHarness({ send });
    const a = enqueue(h, { commentId: 'a' });
    enqueue(h, { commentId: 'b' });

    expect(await h.outbox.dispatcher.tickOnce()).toMatchObject({ kind: 'retry', code: 'auth' });
    expect(h.store.get(a)).toMatchObject({ status: 'queued', attempts: 0 });

    h.clock.advance(MIN);
    expect(await h.outbox.dispatcher.tickOnce()).toMatchObject({ kind: 'held' });
    expect(send).toHaveBeenCalledTimes(1);

    // Vuelve a intentar recién cuando termina la pausa (10 min).
    send.mockResolvedValue({ ok: true });
    h.clock.advance(10 * MIN);
    expect(await h.outbox.dispatcher.tickOnce()).toMatchObject({ kind: 'sent' });
  });

  it('transitorio: backoff exponencial, cada intento cuenta, y al agotarlos queda "failed/exhausted"', async () => {
    const send = vi.fn<SendFn>(async () => ({ ok: false, error: 'fetch failed' }));
    const onFailed = vi.fn<(e: OutboxEntry) => void>();
    // rng 0.5 → factor de jitter del backoff exactamente 1.0
    const h = makeHarness({ send, onFailed, rng: () => 0.5 });
    const id = enqueue(h);

    expect(await h.outbox.dispatcher.tickOnce()).toMatchObject({ kind: 'retry', code: 'network' });
    expect(h.store.get(id)).toMatchObject({ status: 'queued', attempts: 1, notBefore: h.clock.now() + 60 * SEC });

    // Antes del backoff no se toca.
    h.clock.advance(59 * SEC);
    expect(await h.outbox.dispatcher.tickOnce()).toMatchObject({ kind: 'idle' });
    h.clock.advance(SEC);
    await h.outbox.dispatcher.tickOnce();
    expect(h.store.get(id)).toMatchObject({ attempts: 2, notBefore: h.clock.now() + 120 * SEC });

    h.clock.advance(120 * SEC);
    expect(await h.outbox.dispatcher.tickOnce()).toEqual({ kind: 'failed', id, failure: 'exhausted' });
    expect(h.store.get(id)).toMatchObject({ status: 'failed', failureKind: 'exhausted', attempts: 3 });
    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledTimes(3);
  });

  it('permanente: falla de una, no reintenta, avisa', async () => {
    const send = vi.fn<SendFn>(async () => ({
      ok: false,
      error: 'Object does not exist',
      code: '100/33/GraphMethodException',
    }));
    const onFailed = vi.fn<(e: OutboxEntry) => void>();
    const h = makeHarness({ send, onFailed });
    const id = enqueue(h);

    expect(await h.outbox.dispatcher.tickOnce()).toEqual({ kind: 'failed', id, failure: 'permanent' });
    expect(h.store.get(id)).toMatchObject({
      status: 'failed',
      failureKind: 'permanent',
      lastErrorCode: 'comment-unavailable',
    });
    expect(onFailed).toHaveBeenCalledTimes(1);
    h.clock.advance(10 * MIN);
    await h.outbox.dispatcher.tickOnce();
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('si el envío lanza una excepción no se cae el ciclo: se trata como transitorio', async () => {
    const send = vi.fn<SendFn>(async () => {
      throw new Error('ECONNRESET');
    });
    const h = makeHarness({ send });
    const id = enqueue(h);
    expect(await h.outbox.dispatcher.tickOnce()).toMatchObject({ kind: 'retry' });
    expect(h.store.get(id)).toMatchObject({ status: 'queued', attempts: 1, lastError: 'ECONNRESET' });
  });

  it('si el envío no responde a tiempo queda "uncertain" y NO se reintenta (podría haber salido)', async () => {
    const send = vi.fn<SendFn>(() => new Promise(() => undefined));
    const onFailed = vi.fn<(e: OutboxEntry) => void>();
    const h = makeHarness({ send, onFailed, dispatcher: { sendTimeoutMs: 20, leaseMs: 1000 } });
    const id = enqueue(h);

    expect(await h.outbox.dispatcher.tickOnce()).toEqual({ kind: 'failed', id, failure: 'uncertain' });
    expect(h.store.get(id)).toMatchObject({
      status: 'failed',
      failureKind: 'uncertain',
      lastErrorCode: 'send-timeout',
    });
    expect(onFailed).toHaveBeenCalledTimes(1);
    h.clock.advance(10 * MIN);
    await h.outbox.dispatcher.tickOnce();
    expect(send).toHaveBeenCalledTimes(1);
  });
});

describe('dispatcher: ciclo de vida y garantías', () => {
  it('vence lo que ya no llegó a tiempo en vez de mandarlo tarde', async () => {
    const h = makeHarness({ settings: { autoTtlMin: 10 } });
    const id = enqueue(h, { origin: 'auto' });
    h.clock.advance(11 * MIN);
    expect(await h.outbox.dispatcher.tickOnce()).toMatchObject({ kind: 'idle' });
    expect(h.store.get(id)?.status).toBe('expired');
    expect(h.send).not.toHaveBeenCalled();
  });

  it('dueño muerto: la entrada a medias pasa a "uncertain" y no se reenvía sola', async () => {
    const h = makeHarness();
    const id = enqueue(h);
    h.store.claim(id, 'proceso-muerto', 5 * MIN);
    const onFailed = vi.fn<(e: OutboxEntry) => void>();
    const d = createDispatcher({ store: h.store, send: h.send, now: h.clock.now, rng: () => 0, onFailed });

    h.clock.advance(6 * MIN);
    await d.tickOnce();
    expect(h.store.get(id)).toMatchObject({ status: 'failed', failureKind: 'uncertain' });
    expect(onFailed).toHaveBeenCalledTimes(1);
    expect(h.send).not.toHaveBeenCalled();
  });

  it('DRY_RUN queda registrado en la entrada', async () => {
    const h = makeHarness({ isDryRun: () => true });
    const id = enqueue(h);
    await h.outbox.dispatcher.tickOnce();
    expect(h.store.get(id)).toMatchObject({ status: 'sent', dryRun: true });
  });

  it('si otro proceso ganó el claim, este no envía', async () => {
    const h = makeHarness();
    enqueue(h);
    const loser = { ...h.store, claim: (): null => null };
    const d = createDispatcher({ store: loser, send: h.send, now: h.clock.now, rng: () => 0 });
    expect(await d.tickOnce()).toEqual({ kind: 'lost-claim' });
    expect(h.send).not.toHaveBeenCalled();
  });

  it('dos despachadores sobre el mismo log: cada comentario sale EXACTAMENTE una vez', async () => {
    const shared = createMemoryLogs();
    const clock = makeClock();
    const sent: string[] = [];
    const send = vi.fn<SendFn>(async (commentId) => {
      sent.push(commentId);
      return { ok: true };
    });
    const mk = (owner: string) => {
      const store = makeStore(clock, shared.open());
      return { store, d: createDispatcher({ store, send, now: clock.now, rng: () => 0, owner }) };
    };
    const a = mk('A');
    const b = mk('B');
    for (let i = 0; i < 5; i += 1) a.store.enqueue(input({ commentId: `c-${i}` }));

    for (let round = 0; round < 12; round += 1) {
      await Promise.all([a.d.tickOnce(), b.d.tickOnce()]);
      clock.advance(31 * SEC);
    }

    expect([...sent].sort()).toEqual(['c-0', 'c-1', 'c-2', 'c-3', 'c-4']);
    expect(a.store.summary().counts.sent).toBe(5);
    expect(b.store.summary().counts.sent).toBe(5);
  });

  it('un hook que lanza no rompe el despacho', async () => {
    const h = makeHarness({
      onDelivered: () => {
        throw new Error('hook roto');
      },
    });
    const id = enqueue(h);
    expect(await h.outbox.dispatcher.tickOnce()).toEqual({ kind: 'sent', id });
  });

  it('dos ticks concurrentes en el mismo proceso comparten el mismo trabajo (un solo envío)', async () => {
    const h = makeHarness();
    enqueue(h);
    const [x, y] = await Promise.all([h.outbox.dispatcher.tickOnce(), h.outbox.dispatcher.tickOnce()]);
    expect(x).toEqual(y);
    expect(h.send).toHaveBeenCalledTimes(1);
  });
});

describe('dispatcher: estimaciones', () => {
  it('posición y ETA aproximado de lo que está en cola', async () => {
    const h = makeHarness();
    enqueue(h, { commentId: 'a' });
    enqueue(h, { commentId: 'b' });
    const c = enqueue(h, { commentId: 'c' });
    await h.outbox.dispatcher.tickOnce(); // sale la primera; quedan b y c

    const est = h.outbox.dispatcher.estimates();
    expect(est.size).toBe(2);
    const last = est.get(c);
    expect(last?.ahead).toBe(1);
    // espera la separación restante (30 s) + una respuesta adelante (30 s de separación media)
    expect(last?.etaMs).toBe(30 * SEC + 30 * SEC);
  });
});

describe('dispatcher: bucle en segundo plano', () => {
  it('start() despacha lo pendiente y stop() lo detiene', async () => {
    const realClock = { now: Date.now, advance: (): void => undefined };
    const h = makeHarness({}, realClock);
    enqueue(h, { commentId: 'a' });

    h.outbox.start();
    await vi.waitFor(() => expect(h.send).toHaveBeenCalledTimes(1), { timeout: 2000 });
    await h.outbox.stop();

    enqueue(h, { commentId: 'b' });
    await new Promise((r) => setTimeout(r, 150));
    expect(h.send).toHaveBeenCalledTimes(1);
  });

  it('kick() intenta despachar ya y devuelve aunque el envío tarde más que settleMs', async () => {
    let release: () => void = () => undefined;
    const send = vi.fn<SendFn>(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ ok: true });
        }),
    );
    const h = makeHarness({ send });
    enqueue(h);

    const t0 = Date.now();
    await h.outbox.kick(30);
    expect(Date.now() - t0).toBeLessThan(500);
    expect(send).toHaveBeenCalledTimes(1);
    release();
    await h.outbox.dispatcher.tickOnce();
    expect(h.store.summary().counts.sent).toBe(1);
  });
});
