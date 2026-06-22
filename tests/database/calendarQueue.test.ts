import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  insertCalendarPost,
  getCalendarPost,
  listCalendarPostsByAccount,
  listDueScheduledPosts,
  markPublished,
  cancelCalendarPost,
} from '../../src/database/calendarQueue.js';
import { getDb, closeDb } from '../../src/database/db.js';
import { upsertAccount } from '../../src/database/accounts.js';

describe('CalendarQueue', () => {
  beforeEach(() => {
    const db = getDb();
    db.prepare("DELETE FROM posts WHERE account_id = 'test-account'").run();
    db.prepare("DELETE FROM accounts WHERE id = 'test-account'").run();
    upsertAccount({
      id: 'test-account',
      name: 'Test Brand',
      niche: 'test',
      brandJson: '{}',
    });
  });

  afterEach(() => {
    closeDb();
  });

  it('inserta y recupera un post', async () => {
    const post = await insertCalendarPost({
      accountId: 'test-account',
      format: 'carrusel',
      caption: 'Test caption',
      mediaUrls: ['https://example.com/1.png'],
      status: 'draft',
    });

    expect(post.id).toBeDefined();
    expect(post.status).toBe('draft');

    const fetched = await getCalendarPost(post.id);
    expect(fetched).toBeDefined();
    expect(fetched?.caption).toBe('Test caption');
    expect(fetched?.mediaUrls).toEqual(['https://example.com/1.png']);
  });

  it('lista posts por cuenta y estado', async () => {
    await insertCalendarPost({
      accountId: 'test-account',
      format: 'reel',
      caption: 'Reel 1',
      mediaUrls: ['https://example.com/video.mp4'],
      status: 'scheduled',
      scheduledAt: new Date(Date.now() + 60_000).toISOString(),
    });
    await insertCalendarPost({
      accountId: 'test-account',
      format: 'carrusel',
      caption: 'Carrusel 1',
      mediaUrls: ['https://example.com/2.png'],
      status: 'draft',
    });

    const scheduled = await listCalendarPostsByAccount('test-account', { status: 'scheduled' });
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0]?.caption).toBe('Reel 1');

    const all = await listCalendarPostsByAccount('test-account');
    expect(all).toHaveLength(2);
  });

  it('lista posts vencidos para publicar', async () => {
    await insertCalendarPost({
      accountId: 'test-account',
      format: 'reel',
      caption: 'Due post',
      mediaUrls: ['https://example.com/video.mp4'],
      status: 'scheduled',
      scheduledAt: new Date(Date.now() - 60_000).toISOString(),
    });
    await insertCalendarPost({
      accountId: 'test-account',
      format: 'reel',
      caption: 'Future post',
      mediaUrls: ['https://example.com/video.mp4'],
      status: 'scheduled',
      scheduledAt: new Date(Date.now() + 60_000).toISOString(),
    });

    const due = await listDueScheduledPosts(10);
    expect(due.length).toBeGreaterThanOrEqual(1);
    expect(due.some((p) => p.caption === 'Due post')).toBe(true);
    expect(due.some((p) => p.caption === 'Future post')).toBe(false);
  });

  it('actualiza estado a publicado', async () => {
    const post = await insertCalendarPost({
      accountId: 'test-account',
      format: 'carrusel',
      caption: 'To publish',
      mediaUrls: ['https://example.com/1.png'],
      status: 'scheduled',
      scheduledAt: new Date().toISOString(),
    });

    await markPublished(post.id, 'meta-123');
    const updated = await getCalendarPost(post.id);
    expect(updated?.status).toBe('published');
    expect(updated?.metaPostId).toBe('meta-123');
    expect(updated?.publishedAt).toBeDefined();
  });

  it('cancela un post', async () => {
    const post = await insertCalendarPost({
      accountId: 'test-account',
      format: 'carrusel',
      caption: 'To cancel',
      mediaUrls: ['https://example.com/1.png'],
      status: 'scheduled',
    });

    await cancelCalendarPost(post.id);
    const updated = await getCalendarPost(post.id);
    expect(updated?.status).toBe('cancelled');
  });

  it('incrementa attempts al marcar fallido', async () => {
    const post = await insertCalendarPost({
      accountId: 'test-account',
      format: 'reel',
      caption: 'Failing',
      mediaUrls: ['https://example.com/video.mp4'],
      status: 'scheduled',
    });

    const { markFailed } = await import('../../src/database/calendarQueue.js');
    await markFailed(post.id, 'network error');
    const once = await getCalendarPost(post.id);
    expect(once?.attempts).toBe(1);
    expect(once?.status).toBe('scheduled');

    await markFailed(post.id, 'network error');
    await markFailed(post.id, 'network error');
    const thrice = await getCalendarPost(post.id);
    expect(thrice?.attempts).toBe(3);
    expect(thrice?.status).toBe('failed');
  });
});
