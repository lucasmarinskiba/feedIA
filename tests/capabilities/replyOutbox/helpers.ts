import { vi } from 'vitest';
import {
  createMemoryLogs,
  createOutboxStore,
  type EventLog,
  type OutboxStore,
} from '../../../src/capabilities/replyOutbox/store.js';
import {
  createReplyOutbox,
  type CreateOutboxOptions,
  type ReplyOutbox,
} from '../../../src/capabilities/replyOutbox/outbox.js';
import type { SendResult } from '../../../src/capabilities/replyOutbox/errors.js';
import type { EnqueueInput } from '../../../src/capabilities/replyOutbox/types.js';

export const T0 = 1_700_000_000_000;
export const SEC = 1000;
export const MIN = 60 * SEC;

export interface Clock {
  now: () => number;
  advance: (ms: number) => void;
}

export const makeClock = (start = T0): Clock => {
  let t = start;
  return {
    now: () => t,
    advance: (ms) => {
      t += ms;
    },
  };
};

export const input = (over: Partial<EnqueueInput> = {}): EnqueueInput => ({
  commentId: 'c-1',
  text: 'Ni las zapatillas se animan a discutirte eso',
  origin: 'human',
  accountKey: 'brand-1',
  handle: 'vecina_23',
  ttlMs: 60 * MIN,
  ...over,
});

export const makeStore = (
  clock: Clock,
  log?: EventLog,
  opts: Partial<Parameters<typeof createOutboxStore>[0]> = {},
): OutboxStore => createOutboxStore({ log: log ?? createMemoryLogs().open(), now: clock.now, ...opts });

export type SendFn = (commentId: string, text: string) => Promise<SendResult>;

export interface Harness {
  clock: Clock;
  outbox: ReplyOutbox;
  store: OutboxStore;
  send: ReturnType<typeof vi.fn<SendFn>>;
}

/** Outbox con reloj falso, azar fijo (sin jitter) y envío simulado: el ritmo se controla a mano. */
export const makeHarness = (over: Partial<CreateOutboxOptions> = {}, clock: Clock = makeClock()): Harness => {
  const send = vi.fn<SendFn>(async () => ({ ok: true }));
  const store = over.store ?? makeStore(clock, undefined, { maxQueued: over.settings?.maxQueued });
  const outbox = createReplyOutbox({
    store,
    send: over.send ?? send,
    now: clock.now,
    rng: () => 0,
    owner: 'test',
    settings: { minGapSec: 30, jitterSec: 0, maxAttempts: 3, autoTtlMin: 180, humanTtlMin: 1440, maxQueued: 200 },
    ...over,
  });
  return { clock, outbox, store, send };
};
