/**
 * Integración: bot/runner.ts con el Comment Brain.
 * Se prueba qué se le pasa al orquestador y cómo reacciona el runner a cada decisión.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/integrations/meta.js', () => ({
  fetchInbound: vi.fn(async () => []),
  replyToComment: vi.fn(async () => ({ ok: true })),
  sendDm: vi.fn(async () => ({ ok: true })),
}));
vi.mock('../../../src/agent/bus.js', () => ({ emit: vi.fn() }));
vi.mock('../../../src/compliance/index.js', () => ({
  evaluate: vi.fn(() => ({ allowed: true })),
  recordSuccess: vi.fn(),
  recordFailure: vi.fn(),
}));
vi.mock('../../../src/capabilities/bot/conversationMemory.js', () => ({
  recordOutgoingReply: vi.fn(),
  escalateToHuman: vi.fn(),
}));
vi.mock('../../../src/capabilities/replies/unifiedReplyOrchestrator.js', () => ({ generateSmartReply: vi.fn() }));
vi.mock('../../../src/capabilities/conversion/index.js', () => ({
  evaluateComment: vi.fn(async () => ({ sent: false })),
  evaluateDm: vi.fn(async () => []),
}));

import { escalateToHuman } from '../../../src/capabilities/bot/conversationMemory.js';
import { processInbound, runOnce } from '../../../src/capabilities/bot/runner.js';
import { configureBotControlStore, setBotEnabled } from '../../../src/capabilities/botControl/state.js';
import type { SmartReplyOutput } from '../../../src/capabilities/replies/unifiedReplyOrchestrator.js';
import { generateSmartReply } from '../../../src/capabilities/replies/unifiedReplyOrchestrator.js';
import type { BrainResult } from '../../../src/capabilities/commentBrain/types.js';
import { fetchInbound, replyToComment, sendDm, type MetaInbound } from '../../../src/integrations/meta.js';
import { cls, makeBrand } from './helpers.js';

const comment: MetaInbound = {
  type: 'comentario',
  id: 'c-99',
  remitente: 'vecina_23',
  texto: 'Uy sí, re difícil comprar zapatillas lindas 😏',
  postId: 'p-1',
  recibidoEn: new Date().toISOString(),
};

const brain = (action: BrainResult['action']): BrainResult => ({
  action,
  classification: cls({ kind: 'banter' }),
  plan: { action, reasons: [] },
  issues: [],
  reasons: ['motivo de prueba'],
});

const outcome = (over: Partial<SmartReplyOutput>): SmartReplyOutput => ({
  reply: '',
  sent: false,
  escalated: false,
  blocked: false,
  source: 'comment-brain',
  intent: 'banter',
  confidence: 0.9,
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  configureBotControlStore(null); // estado de bots en memoria: todo prendido por defecto
});

describe('processInbound + Comment Brain', () => {
  it('pasa el id del comentario y NO inventa contexto de post (lo resuelve el brain)', async () => {
    vi.mocked(generateSmartReply).mockResolvedValue(outcome({ sent: false, source: 'ignored' }));
    await processInbound(makeBrand(), comment);

    const arg = vi.mocked(generateSmartReply).mock.calls[0]?.[0];
    expect(arg).toMatchObject({ channel: 'comentario', commentId: 'c-99', postId: 'p-1' });
    expect(arg?.postContext).toBeUndefined();
  });

  it('envía la respuesta aprobada como reply al comentario correcto', async () => {
    vi.mocked(generateSmartReply).mockResolvedValue(
      outcome({ sent: true, reply: 'Ni las zapatillas se animan a discutirte eso' }),
    );
    const res = await processInbound(makeBrand(), comment);

    expect(replyToComment).toHaveBeenCalledWith('c-99', 'Ni las zapatillas se animan a discutirte eso');
    expect(sendDm).not.toHaveBeenCalled();
    expect(res.envioOk).toBe(true);
  });

  it('un borrador en la cola NO marca al usuario como escalado (no se lo silencia para siempre)', async () => {
    vi.mocked(generateSmartReply).mockResolvedValue(outcome({ escalated: true, brain: brain('draft-for-review') }));
    await processInbound(makeBrand(), comment);

    expect(escalateToHuman).not.toHaveBeenCalled();
    expect(replyToComment).not.toHaveBeenCalled();
  });

  it('un escalamiento duro sí marca al usuario como escalado y no envía nada', async () => {
    vi.mocked(generateSmartReply).mockResolvedValue(outcome({ escalated: true, brain: brain('escalate') }));
    await processInbound(makeBrand(), comment);

    expect(escalateToHuman).toHaveBeenCalledTimes(1);
    expect(replyToComment).not.toHaveBeenCalled();
  });

  it('ignorar no envía ni escala', async () => {
    vi.mocked(generateSmartReply).mockResolvedValue(outcome({ source: 'ignored', brain: brain('ignore') }));
    const res = await processInbound(makeBrand(), comment);

    expect(escalateToHuman).not.toHaveBeenCalled();
    expect(replyToComment).not.toHaveBeenCalled();
    expect(res.envioOk).toBeUndefined();
  });

  it('un DM no lleva commentId', async () => {
    vi.mocked(generateSmartReply).mockResolvedValue(outcome({ sent: true, reply: 'hola' }));
    await processInbound(makeBrand(), { ...comment, type: 'dm', id: 'm-1', postId: undefined });

    const arg = vi.mocked(generateSmartReply).mock.calls[0]?.[0];
    expect(arg?.channel).toBe('dm');
    expect(arg?.commentId).toBeUndefined();
    expect(sendDm).toHaveBeenCalledWith('vecina_23', 'hola');
  });
});

describe('processInbound + Bot Control', () => {
  it('con el bot de comentarios apagado NO se consulta al orquestador (cero gasto) y el resultado lo dice', async () => {
    setBotEnabled('comment-bot', false);
    const res = await processInbound(makeBrand(), comment);

    expect(generateSmartReply).not.toHaveBeenCalled();
    expect(res.outcome).toMatchObject({
      source: 'disabled',
      sent: false,
      escalated: false,
      intent: 'bot-apagado:comment-bot',
    });
    expect(replyToComment).not.toHaveBeenCalled();
    expect(escalateToHuman).not.toHaveBeenCalled();
  });

  it('las menciones también las gobierna el bot de comentarios', async () => {
    setBotEnabled('comment-bot', false);
    await processInbound(makeBrand(), { ...comment, type: 'mencion' });
    expect(generateSmartReply).not.toHaveBeenCalled();
  });

  it('apagar el bot de comentarios NO apaga el de DMs (y viceversa)', async () => {
    vi.mocked(generateSmartReply).mockResolvedValue(outcome({ sent: true, reply: 'hola' }));
    setBotEnabled('comment-bot', false);
    await processInbound(makeBrand(), { ...comment, type: 'dm', id: 'm-1', postId: undefined });
    expect(generateSmartReply).toHaveBeenCalledTimes(1);

    vi.mocked(generateSmartReply).mockClear();
    setBotEnabled('comment-bot', true);
    setBotEnabled('dm-bot', false);
    await processInbound(makeBrand(), { ...comment, type: 'dm', id: 'm-2', postId: undefined });
    expect(generateSmartReply).not.toHaveBeenCalled();
    await processInbound(makeBrand(), comment);
    expect(generateSmartReply).toHaveBeenCalledTimes(1);
  });
});

describe('runOnce + Bot Control', () => {
  it('con ambos bots apagados ni siquiera se consulta a Meta', async () => {
    setBotEnabled('comment-bot', false);
    setBotEnabled('dm-bot', false);
    const out = await runOnce(makeBrand());
    expect(out).toEqual([]);
    expect(fetchInbound).not.toHaveBeenCalled();
  });

  it('al reactivar solo se atiende lo NUEVO: la ventana avanza mientras estuvo apagado (sin backlog ni pico de gasto)', async () => {
    setBotEnabled('comment-bot', false);
    setBotEnabled('dm-bot', false);
    const t0 = Date.now();
    await runOnce(makeBrand()); // apagado: avanza la ventana

    setBotEnabled('comment-bot', true);
    await runOnce(makeBrand());
    const since = vi.mocked(fetchInbound).mock.calls[0]?.[0] as string;
    expect(new Date(since).getTime()).toBeGreaterThanOrEqual(t0 - 5);
  });

  it('con UNO de los dos bots prendido sí consulta a Meta', async () => {
    setBotEnabled('dm-bot', false);
    await runOnce(makeBrand());
    expect(fetchInbound).toHaveBeenCalledTimes(1);
  });
});
