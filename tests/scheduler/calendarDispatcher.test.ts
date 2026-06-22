import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { insertCalendarPost, getCalendarPost } from '../../src/database/calendarQueue.js';
import { getDb, closeDb } from '../../src/database/db.js';
import { upsertAccount } from '../../src/database/accounts.js';
import { findJob } from '../../src/scheduler/jobs.js';

describe('calendar-dispatcher job', () => {
  beforeEach(() => {
    const db = getDb();
    db.prepare("DELETE FROM posts WHERE account_id = 'test-dispatcher'").run();
    db.prepare("DELETE FROM accounts WHERE id = 'test-dispatcher'").run();
    upsertAccount({
      id: 'test-dispatcher',
      name: 'Dispatcher Test',
      niche: 'test',
      brandJson: '{}',
    });
  });

  afterEach(() => {
    closeDb();
  });

  it('encuentra posts vencidos y los marca como publishing', async () => {
    const post = await insertCalendarPost({
      accountId: 'test-dispatcher',
      format: 'reel',
      caption: 'Dispatcher due',
      mediaUrls: ['https://example.com/video.mp4'],
      status: 'scheduled',
      scheduledAt: new Date(Date.now() - 60_000).toISOString(),
    });

    const job = findJob('calendar-dispatcher');
    expect(job).toBeDefined();
    const result = await job!.handler({} as never);

    expect(result).toMatchObject({
      total: 1,
    });

    // Sin REDIS configurado, addJob falla y el post vuelve a scheduled
    const updated = await getCalendarPost(post.id);
    expect(updated?.status).toBe('scheduled');
  });

  it('no toca posts futuros', async () => {
    const post = await insertCalendarPost({
      accountId: 'test-dispatcher',
      format: 'carrusel',
      caption: 'Future',
      mediaUrls: ['https://example.com/1.png'],
      status: 'scheduled',
      scheduledAt: new Date(Date.now() + 60_000).toISOString(),
    });

    const job = findJob('calendar-dispatcher');
    const result = await job!.handler({} as never);
    expect(result).toEqual({ dispatched: 0 });

    const updated = await getCalendarPost(post.id);
    expect(updated?.status).toBe('scheduled');
  });
});
