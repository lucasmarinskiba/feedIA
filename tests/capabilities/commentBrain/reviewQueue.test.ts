import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/agent/bus.js', () => ({ emit: vi.fn() }));

import { emit } from '../../../src/agent/bus.js';
import {
  configureReviewStore,
  enqueueReview,
  listReviewQueue,
  resolveReview,
  summarizeQueue,
  type ReviewItem,
} from '../../../src/capabilities/commentBrain/reviewQueue.js';
import { cls } from './helpers.js';

let dir: string;
let file: string;

const item = (over: Partial<Omit<ReviewItem, 'id' | 'createdAt'>> = {}): Omit<ReviewItem, 'id' | 'createdAt'> => ({
  accountKey: 'brand-test',
  handle: 'vecina_23',
  commentText: 'Uy sí, re difícil comprar zapatillas lindas 😏',
  action: 'draft-for-review',
  mode: 'witty-comeback',
  draft: 'Nos declaramos culpables',
  reasons: ['modo sugerencia: nada se envía solo'],
  classification: cls({ kind: 'banter' }),
  ...over,
});

/** Simula un reinicio del proceso: memoria vacía, mismo archivo. */
const restart = (): void => configureReviewStore(file);

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'comment-brain-'));
  file = join(dir, 'review.jsonl');
  configureReviewStore(file);
  vi.mocked(emit).mockClear();
});

afterEach(() => {
  configureReviewStore(null);
  rmSync(dir, { recursive: true, force: true });
});

describe('persistencia de la cola de revisión', () => {
  it('sobrevive a un reinicio con comentario, borrador, motivos y clasificación', () => {
    const saved = enqueueReview(item({ wouldHaveReplied: true }));
    restart();

    const [loaded] = listReviewQueue();
    expect(loaded).toMatchObject({
      id: saved.id,
      handle: 'vecina_23',
      commentText: 'Uy sí, re difícil comprar zapatillas lindas 😏',
      draft: 'Nos declaramos culpables',
      wouldHaveReplied: true,
    });
    expect(loaded?.classification.kind).toBe('banter');
  });

  it('un item resuelto no vuelve después de reiniciar', () => {
    const a = enqueueReview(item({ handle: 'a' }));
    enqueueReview(item({ handle: 'b' }));
    expect(resolveReview(a.id)).toBe(true);
    restart();

    expect(listReviewQueue().map((i) => i.handle)).toEqual(['b']);
    expect(resolveReview('no-existe')).toBe(false);
  });

  it('tolera líneas corruptas (corte a mitad de escritura) sin perder el resto', () => {
    enqueueReview(item({ handle: 'ok' }));
    writeFileSync(file, `${readFileSync(file, 'utf-8')}{"t":"add","item":{"id":"cr-truncado\n`, 'utf-8');
    restart();
    expect(listReviewQueue().map((i) => i.handle)).toEqual(['ok']);
  });

  it('si el disco falla, encolar NO lanza (nunca rompe el flujo de respuestas)', () => {
    // El "directorio" padre es un archivo: mkdirSync falla.
    const blocker = join(dir, 'archivo.txt');
    writeFileSync(blocker, 'x', 'utf-8');
    configureReviewStore(join(blocker, 'hijo', 'review.jsonl'));

    expect(() => enqueueReview(item())).not.toThrow();
    expect(listReviewQueue()).toHaveLength(1); // igual queda en memoria
  });

  it('compacta el archivo cuando acumula demasiadas líneas', () => {
    for (let i = 0; i < 1100; i += 1) {
      const it = enqueueReview(item({ handle: `u${i}` }));
      if (i < 1000) resolveReview(it.id);
    }
    expect(readFileSync(file, 'utf-8').trim().split('\n').length).toBe(2100);

    restart();
    // La hidratación es perezosa: recién al leer la cola se compacta el archivo (2100 líneas → 100).
    expect(listReviewQueue()).toHaveLength(100);
    expect(readFileSync(file, 'utf-8').trim().split('\n').length).toBe(100);
  });
});

describe('cola: listado, filtros y resumen', () => {
  it('lista los más nuevos primero y filtra por acción y límite', () => {
    enqueueReview(item({ handle: 'a', action: 'draft-for-review' }));
    enqueueReview(item({ handle: 'b', action: 'escalate', draft: undefined }));
    enqueueReview(item({ handle: 'c', action: 'draft-for-review' }));

    expect(listReviewQueue().map((i) => i.handle)).toEqual(['c', 'b', 'a']);
    expect(listReviewQueue({ action: 'draft-for-review' }).map((i) => i.handle)).toEqual(['c', 'a']);
    expect(listReviewQueue({ limit: 1 }).map((i) => i.handle)).toEqual(['c']);
  });

  it('el resumen cuenta por acción, tipo y "se habría respondido solo"', () => {
    enqueueReview(item({ wouldHaveReplied: true }));
    enqueueReview(item({ wouldHaveReplied: false, classification: cls({ kind: 'complaint' }) }));
    enqueueReview(item({ action: 'ignore', draft: undefined, classification: cls({ kind: 'other' }) }));

    expect(summarizeQueue()).toEqual({
      total: 3,
      byAction: { 'draft-for-review': 2, ignore: 1 },
      byKind: { banter: 1, complaint: 1, other: 1 },
      wouldHaveReplied: 1,
    });
  });

  it('los "ignorados" de auditoría no ensucian el bus; borradores y escalamientos sí', () => {
    enqueueReview(item({ action: 'ignore', draft: undefined }));
    expect(emit).not.toHaveBeenCalled();

    enqueueReview(item({ action: 'draft-for-review' }));
    enqueueReview(item({ action: 'escalate', draft: undefined }));
    expect(emit).toHaveBeenCalledTimes(2);
    expect(vi.mocked(emit).mock.calls[1]?.[0]).toMatchObject({ priority: 'high' });
  });
});
