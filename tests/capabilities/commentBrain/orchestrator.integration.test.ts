/**
 * Integración: rama de comentarios de generateSmartReply.
 * El brain se mockea (ya está cubierto en brain.test.ts); acá se prueba el cableado.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/capabilities/bot/conversationMemory.js', () => ({
  recordIncomingMessage: vi.fn(() => ({ userId: 'vecina_23', handle: 'vecina_23', channel: 'comentario', turnos: [] })),
  recordOutgoingReply: vi.fn(),
  escalateToHuman: vi.fn(),
  loadContext: vi.fn(() => null),
}));
vi.mock('../../../src/capabilities/bot/safetyRails.js', () => ({
  evaluateRails: vi.fn(() => ({ permitir: true, motivos: [], notas: 'OK' })),
}));
vi.mock('../../../src/capabilities/bot/crmContextResolver.js', () => ({
  resolveCRMContext: vi.fn(async () => ({ found: false, context: '' })),
}));
vi.mock('../../../src/capabilities/bot/clientMemory.js', () => ({
  getClientMemory: vi.fn(() => ({})),
  buildMemoryContext: vi.fn(() => ''),
  recordInteraction: vi.fn(),
  updateClientMemory: vi.fn(),
}));
vi.mock('../../../src/capabilities/bot/knowledgeRag.js', () => ({
  searchKnowledge: vi.fn(() => ({
    chunks: [
      { id: 'k1', source: 's', title: 'Plazos', content: '3-5 días hábiles', keywords: [], category: 'general' },
    ],
    query: 'q',
  })),
}));
vi.mock('../../../src/capabilities/community/faqDatabase.js', () => ({
  findMatchingFAQ: vi.fn(() => ({
    entry: { question: '¿Hacen envíos?', answer: 'Sí, a todo el país', alternativeAnswers: [] },
    similarity: 0.6,
    matchedPattern: '',
  })),
}));
vi.mock('../../../src/capabilities/community/toneGuardian.js', () => ({
  checkTone: vi.fn(async () => ({ passes: true, score: 90, issues: [], reasonsToReject: [] })),
}));
vi.mock('../../../src/brain/bridge/interactionLearner.js', () => ({
  learnFromInteraction: vi.fn(async () => undefined),
}));
vi.mock('../../../src/agent/tokenRouter.js', () => ({
  ask: vi.fn(async () => ({ text: 'respuesta del camino legacy' })),
}));
vi.mock('../../../src/capabilities/commentBrain/index.js', () => ({
  handleComment: vi.fn(),
  isCommentBrainEnabled: vi.fn(() => true),
  resolveBrainConfig: vi.fn(() => ({ autonomy: 'balanced', minConfidence: 0.7 })),
  getPostContext: vi.fn(async () => ({ postId: 'p-1', caption: 'Nueva línea de zapatillas' })),
  getThreadContext: vi.fn(async () => ({ parent: { handle: 'otro', text: 'hola', isFromBrand: false }, siblings: [] })),
}));

import { ask } from '../../../src/agent/tokenRouter.js';
import { evaluateRails } from '../../../src/capabilities/bot/safetyRails.js';
import { recordOutgoingReply } from '../../../src/capabilities/bot/conversationMemory.js';
import { findMatchingFAQ } from '../../../src/capabilities/community/faqDatabase.js';
import { searchKnowledge } from '../../../src/capabilities/bot/knowledgeRag.js';
import {
  getPostContext,
  getThreadContext,
  handleComment,
  isCommentBrainEnabled,
  resolveBrainConfig,
} from '../../../src/capabilities/commentBrain/index.js';
import type { BrainResult } from '../../../src/capabilities/commentBrain/types.js';
import {
  generateSmartReply,
  type SmartReplyInput,
} from '../../../src/capabilities/replies/unifiedReplyOrchestrator.js';
import { cls, makeBrand } from './helpers.js';

const input = (over: Partial<SmartReplyInput> = {}): SmartReplyInput => ({
  userId: 'vecina_23',
  handle: 'vecina_23',
  channel: 'comentario',
  message: '¿Hacen envíos a Córdoba?',
  brand: makeBrand(),
  postId: 'p-1',
  commentId: 'c-99',
  ...over,
});

const brainResult = (over: Partial<BrainResult>): BrainResult => ({
  action: 'reply',
  reply: 'Sí, llegamos a Córdoba en 3-5 días hábiles.',
  classification: cls({ kind: 'question', confidence: 0.93 }),
  plan: { action: 'reply', mode: 'answer', reasons: [] },
  issues: [],
  reasons: [],
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(isCommentBrainEnabled).mockReturnValue(true);
  vi.mocked(resolveBrainConfig).mockReturnValue({ autonomy: 'balanced', minConfidence: 0.7 });
  vi.mocked(evaluateRails).mockReturnValue({ permitir: true, motivos: [], notas: 'OK' });
});

describe('generateSmartReply — comentarios con el Comment Brain', () => {
  it('reply: devuelve sent=true, registra la respuesta y le pasa al brain post, hilo y hechos', async () => {
    vi.mocked(handleComment).mockResolvedValue(brainResult({}));
    const out = await generateSmartReply(input());

    expect(out).toMatchObject({
      sent: true,
      escalated: false,
      blocked: false,
      source: 'comment-brain',
      intent: 'question',
    });
    expect(out.reply).toBe('Sí, llegamos a Córdoba en 3-5 días hábiles.');
    expect(recordOutgoingReply).toHaveBeenCalledWith('vecina_23', out.reply, true, 'question');

    expect(getPostContext).toHaveBeenCalledWith('p-1');
    expect(getThreadContext).toHaveBeenCalledWith('c-99');
    const arg = vi.mocked(handleComment).mock.calls[0]?.[0];
    expect(arg?.commentId).toBe('c-99');
    expect(arg?.post?.caption).toBe('Nueva línea de zapatillas');
    expect(arg?.thread?.parent?.handle).toBe('otro');
    // FAQ y knowledge llegan como HECHOS citables, no como respuesta enlatada.
    expect(arg?.facts).toEqual(['¿Hacen envíos? → Sí, a todo el país', 'Plazos: 3-5 días hábiles']);
    expect(ask).not.toHaveBeenCalled();
  });

  it('draft-for-review: no se envía, queda escalado y no se registra respuesta saliente', async () => {
    vi.mocked(handleComment).mockResolvedValue(
      brainResult({ action: 'draft-for-review', reply: 'borrador', reasons: ['riesgo medio'] }),
    );
    const out = await generateSmartReply(input());

    expect(out).toMatchObject({ sent: false, escalated: true, reply: '', source: 'comment-brain' });
    expect(out.brain?.action).toBe('draft-for-review');
    expect(recordOutgoingReply).not.toHaveBeenCalled();
  });

  it('ignore: ni se envía ni se escala', async () => {
    vi.mocked(handleComment).mockResolvedValue(brainResult({ action: 'ignore', reply: undefined }));
    const out = await generateSmartReply(input());
    expect(out).toMatchObject({ sent: false, escalated: false, blocked: false, source: 'ignored' });
  });

  it('las reglas de seguridad corren ANTES: si bloquean, el brain ni se consulta', async () => {
    vi.mocked(evaluateRails).mockReturnValue({ permitir: false, motivos: ['queja-grave'], notas: '' });
    const out = await generateSmartReply(input());
    expect(out).toMatchObject({ blocked: true, sent: false });
    expect(handleComment).not.toHaveBeenCalled();
  });

  it('con el flag apagado vuelve al camino legacy (rollback)', async () => {
    vi.mocked(isCommentBrainEnabled).mockReturnValue(false);
    vi.mocked(findMatchingFAQ).mockReturnValue(null);
    vi.mocked(searchKnowledge).mockReturnValue({ chunks: [], query: 'q' });

    const out = await generateSmartReply(input());
    expect(handleComment).not.toHaveBeenCalled();
    expect(ask).toHaveBeenCalled();
    expect(out).toMatchObject({ sent: true, source: 'llm', reply: 'respuesta del camino legacy' });
  });

  it('los DMs no pasan por el Comment Brain', async () => {
    vi.mocked(findMatchingFAQ).mockReturnValue(null);
    vi.mocked(searchKnowledge).mockReturnValue({ chunks: [], query: 'q' });

    await generateSmartReply(input({ channel: 'dm', commentId: undefined }));
    expect(handleComment).not.toHaveBeenCalled();
    expect(ask).toHaveBeenCalled();
  });
});

describe('generateSmartReply — modo observación (suggest) y reglas de seguridad', () => {
  const noLegacyContext = (): void => {
    vi.mocked(findMatchingFAQ).mockReturnValue(null);
    vi.mocked(searchKnowledge).mockReturnValue({ chunks: [], query: 'q' });
  };

  it('en modo suggest las reglas se evalúan en observación: el interruptor maestro y el horario protegen ENVÍOS y no aplican', async () => {
    vi.mocked(resolveBrainConfig).mockReturnValue({ autonomy: 'suggest', minConfidence: 0.7 });
    vi.mocked(handleComment).mockResolvedValue(brainResult({ action: 'draft-for-review', reply: 'borrador' }));

    await generateSmartReply(input());
    expect(evaluateRails).toHaveBeenCalledWith(expect.anything(), expect.any(String), { observeOnly: true });
  });

  it('en balanced las reglas se evalúan con normalidad (el bot apagado SÍ bloquea)', async () => {
    vi.mocked(handleComment).mockResolvedValue(brainResult({}));

    await generateSmartReply(input());
    expect(evaluateRails).toHaveBeenCalledWith(expect.anything(), expect.any(String), { observeOnly: false });
  });

  it('los DMs nunca usan el modo observación, ni siquiera en suggest', async () => {
    vi.mocked(resolveBrainConfig).mockReturnValue({ autonomy: 'suggest', minConfidence: 0.7 });
    noLegacyContext();

    await generateSmartReply(input({ channel: 'dm', commentId: undefined }));
    expect(evaluateRails).toHaveBeenCalledWith(expect.anything(), expect.any(String), { observeOnly: false });
  });

  it('con el brain apagado (rollback al camino legacy) tampoco hay modo observación', async () => {
    vi.mocked(resolveBrainConfig).mockReturnValue({ autonomy: 'suggest', minConfidence: 0.7 });
    vi.mocked(isCommentBrainEnabled).mockReturnValue(false);
    noLegacyContext();

    await generateSmartReply(input());
    expect(evaluateRails).toHaveBeenCalledWith(expect.anything(), expect.any(String), { observeOnly: false });
  });

  it('defensa en profundidad: si en observación el brain devolviera "reply", NO se envía', async () => {
    vi.mocked(resolveBrainConfig).mockReturnValue({ autonomy: 'suggest', minConfidence: 0.7 });
    vi.mocked(handleComment).mockResolvedValue(brainResult({ action: 'reply', reply: 'esto no debería salir' }));

    const out = await generateSmartReply(input());
    expect(out.sent).toBe(false);
    expect(out.reply).toBe('');
    expect(recordOutgoingReply).not.toHaveBeenCalled();
  });
});
