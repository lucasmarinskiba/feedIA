import { describe, expect, it, beforeEach } from 'vitest';
import { ingestMessage, getConversation } from '../../../src/capabilities/community/dmInbox.js';

let uid = 0;
const freshThreadId = (): string => `thread-story-reply-${Date.now()}-${uid++}`;

beforeEach(() => {
  uid = 0;
});

describe('ingestMessage: Story-reply tracking (AUTO-003)', () => {
  it('taggea la conversación nueva como story-reply y guarda el post referido', () => {
    const threadId = freshThreadId();
    const conv = ingestMessage({
      threadId,
      contactUsername: 'fan1',
      text: '🔥🔥🔥',
      isStoryReply: true,
      referredPostId: 'story-123',
    });

    expect(conv.tags).toContain('story-reply');
    expect(conv.context.referredPost).toBe('story-123');
    expect(conv.messages[0].isStoryReply).toBe(true);
  });

  it('un DM normal (sin story reply) no lleva el tag', () => {
    const threadId = freshThreadId();
    const conv = ingestMessage({ threadId, contactUsername: 'fan2', text: 'hola, precio?' });

    expect(conv.tags).not.toContain('story-reply');
    expect(conv.messages[0].isStoryReply).toBeUndefined();
  });

  it('un segundo story-reply en una conversación existente también taggea', () => {
    const threadId = freshThreadId();
    ingestMessage({ threadId, contactUsername: 'fan3', text: 'hola' });
    const conv = ingestMessage({
      threadId,
      contactUsername: 'fan3',
      text: 'te contesto tu story!',
      isStoryReply: true,
      referredPostId: 'story-456',
    });

    expect(conv.tags).toContain('story-reply');
    expect(conv.context.referredPost).toBe('story-456');

    const after = getConversation(conv.id);
    expect(after?.messages.some((m) => m.isStoryReply)).toBe(true);
  });
});
