import type { IncomingMessage, ServerResponse } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/capabilities/bot/index.js', () => ({ processInbound: vi.fn() }));
vi.mock('../../../src/capabilities/crisis/index.js', () => ({ ejecutarCrisisCheck: vi.fn(async () => undefined) }));
vi.mock('../../../src/integrations/notifications.js', () => ({ sendAlert: vi.fn(async () => undefined) }));
vi.mock('../../../src/agent/bus.js', () => ({
  emit: vi.fn(),
  emitLeadHotAlert: vi.fn(),
  emitCrisisDetected: vi.fn(),
  emitViralOpportunity: vi.fn(),
}));

import { processInbound } from '../../../src/capabilities/bot/index.js';
import { ejecutarCrisisCheck } from '../../../src/capabilities/crisis/index.js';
import { configureBotControlStore, setBotEnabled } from '../../../src/capabilities/botControl/state.js';
import { buildEventHandler } from '../../../src/server/metaWebhook.js';
import type { RouteContext } from '../../../src/server/http.js';
import { makeBrand } from '../commentBrain/helpers.js';

const IG_ACCOUNT = '1789000000000001';

const fakeRes = (): {
  res: ServerResponse;
  out: () => { status: number; body: { procesados?: Array<{ tipo: string; resultado: string }> } };
} => {
  const state = { statusCode: 200, body: '' };
  const res = {
    get statusCode(): number {
      return state.statusCode;
    },
    set statusCode(v: number) {
      state.statusCode = v;
    },
    setHeader: (): void => undefined,
    end: (b?: string): void => {
      state.body = b ?? '';
    },
  } as unknown as ServerResponse;
  return { res, out: () => ({ status: state.statusCode, body: state.body ? JSON.parse(state.body) : {} }) };
};

const commentPayload = (
  over: { fromId?: string; commentId?: string; text?: string; postId?: string } = {},
): unknown => ({
  object: 'instagram',
  entry: [
    {
      id: IG_ACCOUNT,
      time: Math.floor(Date.now() / 1000),
      changes: [
        {
          field: 'comments',
          value: {
            comment_id: over.commentId ?? 'c-1',
            text: over.text ?? 'Qué lindo el diseño',
            from: { id: over.fromId ?? '5550001', username: 'vecina_23' },
            media: { id: over.postId ?? 'p-1' },
          },
        },
      ],
    },
  ],
});

const send = async (payload: unknown): Promise<ReturnType<ReturnType<typeof fakeRes>['out']>> => {
  const { res, out } = fakeRes();
  const handler = buildEventHandler(makeBrand(), ''); // sin app secret: acepta sin firma (así lo hace hoy)
  const ctx = {
    rawBody: Buffer.from('{}'),
    body: payload,
    req: { headers: {} } as IncomingMessage,
    res,
    params: {},
    query: {},
  } as RouteContext;
  await handler(ctx);
  return out();
};

const outcome = (over: Partial<{ sent: boolean; source: string }> = {}): unknown => ({
  inbound: {},
  outcome: {
    reply: '',
    sent: false,
    escalated: false,
    blocked: false,
    source: 'comment-brain',
    intent: 'x',
    confidence: 1,
    ...over,
  },
});

beforeEach(() => {
  configureBotControlStore(null);
  vi.mocked(processInbound).mockReset();
  vi.mocked(processInbound).mockResolvedValue(outcome() as never);
  vi.mocked(ejecutarCrisisCheck).mockClear();
});

describe('webhook de Meta — ahorro y etiquetas', () => {
  it('un comentario de un tercero se procesa', async () => {
    const r = await send(commentPayload());
    expect(processInbound).toHaveBeenCalledTimes(1);
    expect(r.body.procesados).toEqual([{ tipo: 'comentario', resultado: 'derivado' }]);
  });

  it('el comentario de la PROPIA cuenta (nuestra respuesta volviendo por el webhook) se descarta: cero gasto y sin bucle', async () => {
    const r = await send(commentPayload({ fromId: IG_ACCOUNT }));
    expect(processInbound).not.toHaveBeenCalled();
    expect(r.body.procesados).toEqual([]);
  });

  it('con el bot de comentarios apagado el resultado dice "bot-apagado", no "derivado"', async () => {
    vi.mocked(processInbound).mockResolvedValue(outcome({ source: 'disabled' }) as never);
    const r = await send(commentPayload());
    expect(r.body.procesados?.[0]?.resultado).toBe('bot-apagado');
  });

  it('etiqueta cada resultado: auto-respondido / ignorado / derivado', async () => {
    vi.mocked(processInbound).mockResolvedValueOnce(outcome({ sent: true }) as never);
    vi.mocked(processInbound).mockResolvedValueOnce(outcome({ source: 'ignored' }) as never);
    const a = await send(commentPayload({ commentId: 'a' }));
    const b = await send(commentPayload({ commentId: 'b' }));
    expect(a.body.procesados?.[0]?.resultado).toBe('auto-respondido');
    expect(b.body.procesados?.[0]?.resultado).toBe('ignorado');
  });

  it('el chequeo de crisis (LLM) lo gobierna el bot de comentarios', async () => {
    setBotEnabled('comment-bot', false);
    // Post propio del test: el buffer de crisis del webhook es global y cuenta por post.
    for (let i = 1; i <= 5; i += 1)
      await send(
        commentPayload({ postId: 'post-crisis-off', commentId: `k${i}`, text: `comentario ${i} sobre el producto` }),
      );
    expect(ejecutarCrisisCheck).not.toHaveBeenCalled();
  });

  it('con el bot de comentarios prendido el chequeo de crisis sigue corriendo cada 5 comentarios', async () => {
    for (let i = 1; i <= 5; i += 1)
      await send(
        commentPayload({ postId: 'post-crisis-on', commentId: `z${i}`, text: `comentario ${i} sobre el producto` }),
      );
    expect(ejecutarCrisisCheck).toHaveBeenCalledTimes(1);
  });
});
