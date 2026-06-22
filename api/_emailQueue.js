/**
 * Cola simple de emails en KV para alertas y notificaciones.
 */
import * as store from './_store.js';

const QUEUE_KEY = 'feedia:email:queue';

export const enqueue = async (to, subject, body) => {
  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    to,
    subject,
    body,
    createdAt: new Date().toISOString(),
  };
  await store.lpush(QUEUE_KEY, item);
  return item;
};

export const dequeue = async (limit = 10) => {
  const items = await store.lrange(QUEUE_KEY, 0, limit - 1);
  return items
    .map((x) =>
      typeof x === 'string'
        ? (() => {
            try {
              return JSON.parse(x);
            } catch {
              return null;
            }
          })()
        : x,
    )
    .filter(Boolean);
};

export const markSent = async (id) => {
  const items = await store.lrange(QUEUE_KEY, 0, -1);
  for (let i = 0; i < items.length; i++) {
    const item = typeof items[i] === 'string' ? JSON.parse(items[i]) : items[i];
    if (item?.id === id) {
      item.sent = true;
      item.sentAt = new Date().toISOString();
      // En Redis se podría usar LSET; en el wrapper simple re-empujamos.
      await store.del(QUEUE_KEY);
      for (let j = items.length - 1; j >= 0; j--) {
        const re = j === i ? item : typeof items[j] === 'string' ? JSON.parse(items[j]) : items[j];
        await store.lpush(QUEUE_KEY, re);
      }
      return true;
    }
  }
  return false;
};
