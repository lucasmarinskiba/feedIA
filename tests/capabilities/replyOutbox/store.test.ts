import { appendFileSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  createFileLog,
  createMemoryLogs,
  createOutboxStore,
  HUMAN_RESERVE,
} from '../../../src/capabilities/replyOutbox/store.js';
import type { OutboxEvent } from '../../../src/capabilities/replyOutbox/types.js';
import { input, makeClock, makeStore, MIN, SEC, T0 } from './helpers.js';

describe('outbox store: alta e idempotencia', () => {
  it('encola con estado inicial, vencimiento por ttl y texto saneado', () => {
    const clock = makeClock();
    const store = makeStore(clock);
    const r = store.enqueue(input({ text: '  hola  ', commentId: ' c-1 ', ttlMs: 10 * MIN }));

    expect(r).toMatchObject({ ok: true, duplicate: false });
    if (!r.ok) return;
    expect(r.entry).toMatchObject({
      status: 'queued',
      commentId: 'c-1',
      text: 'hola',
      attempts: 0,
      enqueuedAt: T0,
      notBefore: T0,
      expiresAt: T0 + 10 * MIN,
    });
  });

  it.each([
    ['commentId vacío', { commentId: '  ' }],
    ['texto vacío', { text: '   ' }],
    ['texto de más de 2200 caracteres', { text: 'x'.repeat(2201) }],
    ['ttl no positivo', { ttlMs: 0 }],
  ])('rechaza %s', (_name, over) => {
    const r = makeStore(makeClock()).enqueue(input(over));
    expect(r).toMatchObject({ ok: false, reason: 'invalid' });
  });

  it('un comentario admite UNA respuesta activa: encolar de nuevo devuelve la existente', () => {
    const store = makeStore(makeClock());
    const first = store.enqueue(input());
    const second = store.enqueue(input({ text: 'otra respuesta distinta' }));

    expect(first.ok && second.ok).toBe(true);
    if (!first.ok || !second.ok) return;
    expect(second.duplicate).toBe(true);
    expect(second.entry.id).toBe(first.entry.id);
    expect(second.entry.text).toBe(first.entry.text);
    expect(store.list()).toHaveLength(1);
  });

  it('tras enviarse, el comentario tampoco admite otra respuesta', () => {
    const store = makeStore(makeClock());
    const e = store.enqueue(input());
    if (!e.ok) throw new Error('enqueue');
    const claimed = store.claim(e.entry.id, 'a', MIN);
    store.markSent(e.entry.id, claimed?.claim?.token ?? '', false);

    const again = store.enqueue(input({ text: 'segunda' }));
    expect(again).toMatchObject({ ok: true, duplicate: true });
  });

  it('si la anterior terminó cancelada, fallada o vencida, se puede encolar una nueva', () => {
    const store = makeStore(makeClock());
    const e = store.enqueue(input());
    if (!e.ok) throw new Error('enqueue');
    store.cancel(e.entry.id);

    const fresh = store.enqueue(input({ text: 'nueva' }));
    expect(fresh).toMatchObject({ ok: true, duplicate: false });
    if (fresh.ok) expect(fresh.entry.id).not.toBe(e.entry.id);
  });

  it('contrapresión: el bot se corta en maxQueued, las personas tienen un cupo extra', () => {
    const store = makeStore(makeClock(), undefined, { maxQueued: 2, humanReserve: 1 });
    expect(store.enqueue(input({ commentId: 'a', origin: 'auto' })).ok).toBe(true);
    expect(store.enqueue(input({ commentId: 'b', origin: 'auto' })).ok).toBe(true);
    expect(store.enqueue(input({ commentId: 'c', origin: 'auto' }))).toMatchObject({ ok: false, reason: 'full' });
    expect(store.enqueue(input({ commentId: 'd', origin: 'human' })).ok).toBe(true);
    expect(store.enqueue(input({ commentId: 'e', origin: 'human' }))).toMatchObject({ ok: false, reason: 'full' });
    expect(HUMAN_RESERVE).toBeGreaterThan(0);
  });

  it('si no puede escribir el log NO acepta el envío (no promete lo que se perdería)', () => {
    const logs = createMemoryLogs().open();
    const broken = {
      ...logs,
      append: (): void => {
        throw new Error('disco lleno');
      },
    };
    const r = createOutboxStore({ log: broken, now: makeClock().now }).enqueue(input());
    expect(r).toMatchObject({ ok: false, reason: 'storage' });
  });
});

describe('outbox store: claim y ciclo de vida', () => {
  const setup = (): { store: ReturnType<typeof makeStore>; id: string; clock: ReturnType<typeof makeClock> } => {
    const clock = makeClock();
    const store = makeStore(clock);
    const r = store.enqueue(input());
    if (!r.ok) throw new Error('enqueue');
    return { store, id: r.entry.id, clock };
  };

  it('el claim pasa la entrada a "sending" con lease', () => {
    const { store, id, clock } = setup();
    const c = store.claim(id, 'daemon:1', 5 * MIN);
    expect(c?.status).toBe('sending');
    expect(c?.claim).toMatchObject({ owner: 'daemon:1', leaseUntil: clock.now() + 5 * MIN });
    expect(store.claim(id, 'daemon:2', 5 * MIN)).toBeNull();
  });

  it('enviado: registra sentAt, cuenta el intento y suelta el claim', () => {
    const { store, id, clock } = setup();
    const token = store.claim(id, 'a', MIN)?.claim?.token ?? '';
    clock.advance(SEC);
    expect(store.markSent(id, token, true)).toBe(true);
    expect(store.get(id)).toMatchObject({ status: 'sent', sentAt: clock.now(), dryRun: true, attempts: 1 });
    expect(store.get(id)?.claim).toBeUndefined();
  });

  it('un token ajeno no puede cerrar la entrada', () => {
    const { store, id } = setup();
    store.claim(id, 'a', MIN);
    expect(store.markSent(id, 'token-ajeno', false)).toBe(false);
    expect(store.get(id)?.status).toBe('sending');
  });

  it('retry consumido cuenta el intento; retry por ritmo (no consumido) no', () => {
    const { store, id, clock } = setup();
    const t1 = store.claim(id, 'a', MIN)?.claim?.token ?? '';
    store.markRetry(id, t1, { notBefore: clock.now() + MIN, error: 'red caída', consumed: true });
    expect(store.get(id)).toMatchObject({ status: 'queued', attempts: 1, lastError: 'red caída' });

    clock.advance(MIN);
    const t2 = store.claim(id, 'a', MIN)?.claim?.token ?? '';
    store.markRetry(id, t2, {
      notBefore: clock.now() + MIN,
      error: 'ritmo',
      code: 'compliance-spacing',
      consumed: false,
    });
    expect(store.get(id)).toMatchObject({ status: 'queued', attempts: 1, lastErrorCode: 'compliance-spacing' });
  });

  it('un retry con notBefore futuro sale de due() hasta que llega su hora', () => {
    const { store, id, clock } = setup();
    const t = store.claim(id, 'a', MIN)?.claim?.token ?? '';
    store.markRetry(id, t, { notBefore: clock.now() + 5 * MIN, error: 'x', consumed: true });
    expect(store.due(clock.now())).toHaveLength(0);
    expect(store.due(clock.now() + 5 * MIN)).toHaveLength(1);
  });

  it('due(): personas primero, después por antigüedad', () => {
    const clock = makeClock();
    const store = makeStore(clock);
    store.enqueue(input({ commentId: 'auto-1', origin: 'auto' }));
    clock.advance(SEC);
    store.enqueue(input({ commentId: 'human-1', origin: 'human' }));
    clock.advance(SEC);
    store.enqueue(input({ commentId: 'auto-2', origin: 'auto' }));
    clock.advance(SEC);
    store.enqueue(input({ commentId: 'human-2', origin: 'human' }));

    expect(store.due(clock.now()).map((e) => e.commentId)).toEqual(['human-1', 'human-2', 'auto-1', 'auto-2']);
  });

  it('cancelar solo vale en cola o fallida, nunca en vuelo', () => {
    const { store, id } = setup();
    store.claim(id, 'a', MIN);
    expect(store.cancel(id)).toBe(false);
    expect(store.get(id)?.status).toBe('sending');
  });

  it('requeue: revive una fallida con intentos en cero y nuevo vencimiento', () => {
    const { store, id, clock } = setup();
    const t = store.claim(id, 'a', MIN)?.claim?.token ?? '';
    store.markFailed(id, t, { kind: 'permanent', error: 'borrado', code: 'comment-unavailable' });
    expect(store.get(id)).toMatchObject({ status: 'failed', failureKind: 'permanent', attempts: 1 });

    clock.advance(MIN);
    expect(store.requeue(id, 30 * MIN)).toBe(true);
    expect(store.get(id)).toMatchObject({
      status: 'queued',
      attempts: 0,
      notBefore: clock.now(),
      expiresAt: clock.now() + 30 * MIN,
    });
    expect(store.get(id)?.lastError).toBeUndefined();
  });

  it('requeue no duplica: si el comentario ya tiene otra respuesta activa, se niega', () => {
    const { store, id } = setup();
    const t = store.claim(id, 'a', MIN)?.claim?.token ?? '';
    store.markFailed(id, t, { kind: 'permanent', error: 'x' });
    const other = store.enqueue(input({ text: 'otra' }));
    expect(other).toMatchObject({ ok: true, duplicate: false });

    expect(store.requeue(id, MIN)).toBe(false);
    expect(store.get(id)?.status).toBe('failed');
  });

  it('vencimiento: lo que ya no llegó a tiempo pasa a "expired" y solo entonces', () => {
    const clock = makeClock();
    const store = makeStore(clock);
    const r = store.enqueue(input({ ttlMs: 10 * MIN }));
    if (!r.ok) throw new Error('enqueue');

    clock.advance(9 * MIN);
    expect(store.expireDue()).toEqual([]);
    clock.advance(2 * MIN);
    expect(store.expireDue()).toEqual([r.entry.id]);
    expect(store.get(r.entry.id)?.status).toBe('expired');
    expect(store.requeue(r.entry.id, 10 * MIN)).toBe(true);
  });

  it('nextEventAt: el próximo instante en que algo cambia solo', () => {
    const clock = makeClock();
    const store = makeStore(clock);
    expect(store.nextEventAt()).toBeNull();
    const r = store.enqueue(input({ ttlMs: 10 * MIN }));
    if (!r.ok) throw new Error('enqueue');
    expect(store.nextEventAt()).toBe(T0);
    const t = store.claim(r.entry.id, 'a', 2 * MIN)?.claim?.token ?? '';
    expect(store.nextEventAt()).toBe(T0 + 2 * MIN);
    store.markRetry(r.entry.id, t, { notBefore: T0 + 5 * MIN, error: 'x', consumed: true });
    expect(store.nextEventAt()).toBe(T0 + 5 * MIN);
  });
});

describe('outbox store: envío como mucho una vez', () => {
  it('si el dueño muere, tras el lease NO se reenvía: queda "uncertain" para una persona', () => {
    const clock = makeClock();
    const store = makeStore(clock);
    const r = store.enqueue(input());
    if (!r.ok) throw new Error('enqueue');
    store.claim(r.entry.id, 'proceso-muerto', 5 * MIN);

    clock.advance(4 * MIN);
    expect(store.recoverStale()).toEqual([]);
    clock.advance(2 * MIN);
    expect(store.recoverStale()).toEqual([r.entry.id]);
    expect(store.get(r.entry.id)).toMatchObject({
      status: 'failed',
      failureKind: 'uncertain',
      lastErrorCode: 'interrupted',
    });
    expect(store.due(clock.now())).toHaveLength(0);
  });

  it('confirmación tardía: si el dueño lento terminó de enviar, la entrada pasa a "sent" (no queda como fallida)', () => {
    const clock = makeClock();
    const store = makeStore(clock);
    const r = store.enqueue(input());
    if (!r.ok) throw new Error('enqueue');
    const token = store.claim(r.entry.id, 'lento', MIN)?.claim?.token ?? '';

    clock.advance(2 * MIN);
    store.recoverStale();
    expect(store.get(r.entry.id)?.status).toBe('failed');

    expect(store.markSent(r.entry.id, token, false)).toBe(true);
    expect(store.get(r.entry.id)).toMatchObject({ status: 'sent' });
    expect(store.get(r.entry.id)?.failureKind).toBeUndefined();
  });

  it('un token que no fue el último claim no puede reconciliar', () => {
    const clock = makeClock();
    const store = makeStore(clock);
    const r = store.enqueue(input());
    if (!r.ok) throw new Error('enqueue');
    store.claim(r.entry.id, 'a', MIN);
    clock.advance(2 * MIN);
    store.recoverStale();
    expect(store.markSent(r.entry.id, 'otro-token', false)).toBe(false);
    expect(store.get(r.entry.id)?.status).toBe('failed');
  });
});

describe('outbox store: dos procesos sobre el mismo log', () => {
  it('claim: exactamente uno gana, el otro ve que perdió', () => {
    const shared = createMemoryLogs();
    const clock = makeClock();
    const a = makeStore(clock, shared.open());
    const b = makeStore(clock, shared.open());
    const r = a.enqueue(input());
    if (!r.ok) throw new Error('enqueue');

    const wa = a.claim(r.entry.id, 'A', MIN);
    const wb = b.claim(r.entry.id, 'B', MIN);
    expect([wa, wb].filter((w) => w !== null)).toHaveLength(1);
    expect(a.get(r.entry.id)?.claim?.owner).toBe('A');
    expect(b.get(r.entry.id)?.claim?.owner).toBe('A');
  });

  it('carrera real: dos claims anexados antes de releer → gana el primero EN ORDEN DE ARCHIVO, en ambos procesos', () => {
    const shared = createMemoryLogs();
    const clock = makeClock();
    const a = makeStore(clock, shared.open());
    const b = makeStore(clock, shared.open());
    const r = a.enqueue(input());
    if (!r.ok) throw new Error('enqueue');
    b.sync();

    // Ambos ya vieron la entrada en cola y anexan su claim "al mismo tiempo".
    const raw = shared.open();
    const claim = (owner: string): OutboxEvent => ({
      t: 'claim',
      at: clock.now(),
      id: r.entry.id,
      token: `tok-${owner}`,
      owner,
      leaseUntil: clock.now() + MIN,
    });
    raw.append(claim('B'));
    raw.append(claim('A'));

    expect(a.get(r.entry.id)?.claim?.token).toBe('tok-B');
    expect(b.get(r.entry.id)?.claim?.token).toBe('tok-B');
    // El perdedor no puede cerrar la entrada con su token.
    expect(a.markSent(r.entry.id, 'tok-A', false)).toBe(false);
    expect(b.markSent(r.entry.id, 'tok-B', false)).toBe(true);
  });

  it('el mismo comentario encolado en simultáneo por dos procesos queda en UNA entrada', () => {
    const shared = createMemoryLogs();
    const clock = makeClock();
    const a = makeStore(clock, shared.open());
    const b = makeStore(clock, shared.open());
    a.sync();
    b.sync();

    const raw = shared.open();
    const enq = (id: string): OutboxEvent => ({
      t: 'enqueue',
      at: clock.now(),
      id,
      entry: { ...input(), notBefore: clock.now() },
    });
    raw.append(enq('ob-a'));
    raw.append(enq('ob-b'));

    expect(a.list().map((e) => e.id)).toEqual(['ob-a']);
    expect(b.list().map((e) => e.id)).toEqual(['ob-a']);
  });

  it('cada proceso ve lo que el otro encoló, sin reiniciar', () => {
    const shared = createMemoryLogs();
    const clock = makeClock();
    const a = makeStore(clock, shared.open());
    const b = makeStore(clock, shared.open());
    a.enqueue(input({ commentId: 'x' }));
    expect(b.list().map((e) => e.commentId)).toEqual(['x']);
  });
});

describe('outbox store: persistencia en archivo', () => {
  let dir = '';
  let file = '';
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'outbox-'));
    file = join(dir, 'outbox.jsonl');
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('sobrevive a un reinicio: un store nuevo reconstruye el mismo estado', () => {
    const clock = makeClock();
    const a = makeStore(clock, createFileLog(file));
    const r = a.enqueue(input());
    if (!r.ok) throw new Error('enqueue');
    a.claim(r.entry.id, 'a', MIN);

    const b = makeStore(clock, createFileLog(file));
    expect(b.get(r.entry.id)).toMatchObject({ status: 'sending', commentId: 'c-1' });
  });

  it('claim exclusivo entre dos stores sobre el mismo archivo', () => {
    const clock = makeClock();
    const a = makeStore(clock, createFileLog(file));
    const b = makeStore(clock, createFileLog(file));
    const r = a.enqueue(input());
    if (!r.ok) throw new Error('enqueue');

    const results = [a.claim(r.entry.id, 'A', MIN), b.claim(r.entry.id, 'B', MIN)];
    expect(results.filter((x) => x !== null)).toHaveLength(1);
  });

  it('tolera líneas corruptas', () => {
    const clock = makeClock();
    const a = makeStore(clock, createFileLog(file));
    a.enqueue(input({ commentId: 'ok-1' }));
    appendFileSync(file, '{esto no es json\n', 'utf-8');
    a.enqueue(input({ commentId: 'ok-2' }));

    const b = makeStore(clock, createFileLog(file));
    expect(
      b
        .list()
        .map((e) => e.commentId)
        .sort(),
    ).toEqual(['ok-1', 'ok-2']);
  });

  it('una línea a medio escribir NO se consume hasta que llega su salto de línea', () => {
    const clock = makeClock();
    const a = makeStore(clock, createFileLog(file));
    a.enqueue(input({ commentId: 'entera' }));

    const line = JSON.stringify({
      t: 'enqueue',
      at: T0,
      id: 'ob-parcial',
      entry: { ...input({ commentId: 'parcial' }), notBefore: T0 },
    });
    const b = makeStore(clock, createFileLog(file));
    appendFileSync(file, line.slice(0, 40), 'utf-8');
    expect(b.list().map((e) => e.commentId)).toEqual(['entera']);

    appendFileSync(file, `${line.slice(40)}\n`, 'utf-8');
    expect(
      b
        .list()
        .map((e) => e.commentId)
        .sort(),
    ).toEqual(['entera', 'parcial']);
  });

  it('compactación al arrancar: reescribe el log sin perder estado ni la vista del otro proceso', () => {
    const clock = makeClock();
    const a = makeStore(clock, createFileLog(file));
    const ids: string[] = [];
    for (let i = 0; i < 6; i += 1) {
      const r = a.enqueue(input({ commentId: `c-${i}` }));
      if (!r.ok) throw new Error('enqueue');
      ids.push(r.entry.id);
      const t = a.claim(r.entry.id, 'a', MIN)?.claim?.token ?? '';
      a.markRetry(r.entry.id, t, { notBefore: clock.now(), error: 'x', consumed: false });
    }
    const linesBefore = readFileSync(file, 'utf-8').trim().split('\n').length;
    const sizeBefore = statSync(file).size;

    // `b` arranca con el umbral bajo: compacta.
    const b = createOutboxStore({ log: createFileLog(file), now: clock.now, compactAfterLines: 5 });
    expect(b.list()).toHaveLength(6);
    const linesAfter = readFileSync(file, 'utf-8').trim().split('\n').length;
    expect(linesAfter).toBeLessThan(linesBefore);
    expect(statSync(file).size).toBeLessThan(sizeBefore);

    // El proceso viejo detecta la reescritura y converge al mismo estado.
    expect(
      a
        .list()
        .map((e) => e.id)
        .sort(),
    ).toEqual([...ids].sort());
    const again = a.enqueue(input({ commentId: 'post-compact' }));
    expect(again).toMatchObject({ ok: true, duplicate: false });
    expect(b.list().some((e) => e.commentId === 'post-compact')).toBe(true);
  });

  it('la compactación descarta lo terminado hace más que la retención y conserva lo vivo', () => {
    const clock = makeClock();
    const a = createOutboxStore({ log: createFileLog(file), now: clock.now, retentionMs: 7 * 24 * 60 * MIN });
    const old = a.enqueue(input({ commentId: 'viejo' }));
    const live = a.enqueue(input({ commentId: 'vivo' }));
    if (!old.ok || !live.ok) throw new Error('enqueue');
    a.cancel(old.entry.id);

    clock.advance(8 * 24 * 60 * MIN);
    a.compact();

    const b = makeStore(clock, createFileLog(file));
    expect(b.list().map((e) => e.commentId)).toEqual(['vivo']);
    expect(existsSync(file)).toBe(true);
  });

  it('un log vacío o inexistente arranca limpio', () => {
    writeFileSync(file, '', 'utf-8');
    expect(makeStore(makeClock(), createFileLog(file)).list()).toEqual([]);
    expect(makeStore(makeClock(), createFileLog(join(dir, 'nunca-existio.jsonl'))).list()).toEqual([]);
  });
});

describe('outbox store: resumen', () => {
  it('cuenta por estado, incertidumbre y envíos reales de la última hora (los simulados no cuentan)', () => {
    const clock = makeClock();
    const store = makeStore(clock);
    const mk = (commentId: string): string => {
      const r = store.enqueue(input({ commentId }));
      if (!r.ok) throw new Error('enqueue');
      return r.entry.id;
    };
    const real = mk('real');
    const dry = mk('dry');
    const dead = mk('dead');
    mk('waiting');

    store.markSent(real, store.claim(real, 'a', MIN)?.claim?.token ?? '', false);
    store.markSent(dry, store.claim(dry, 'a', MIN)?.claim?.token ?? '', true);
    store.claim(dead, 'a', MIN);
    clock.advance(2 * MIN);
    store.recoverStale();

    const s = store.summary();
    expect(s.counts).toMatchObject({ queued: 1, sent: 2, failed: 1 });
    expect(s.uncertain).toBe(1);
    expect(s.sentLastHour).toBe(1);
    expect(s.oldestQueuedAt).toBe(T0);
    expect(s.lastSentAt).not.toBeNull();
  });
});
