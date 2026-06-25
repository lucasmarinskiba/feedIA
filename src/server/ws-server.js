/**
 * Real-Time Server — SSE (Server-Sent Events)
 * Replaces polling with instant push notifications
 * No external deps, works in all browsers
 */

import { EventEmitter } from 'node:events';

const emitter = new EventEmitter();
emitter.setMaxListeners(100);

const clients = new Set();

export const subscribeToAchievementUpdates = (res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  clients.add(res);
  console.log(`[SSE] Client connected. Total: ${clients.size}`);

  // Send initial ping
  res.write('event: connected\n');
  res.write(`data: ${JSON.stringify({ timestamp: new Date().toISOString() })}\n\n`);

  // Handle disconnect
  res.on('close', () => {
    clients.delete(res);
    console.log(`[SSE] Client disconnected. Total: ${clients.size}`);
  });

  res.on('error', () => {
    clients.delete(res);
  });
};

export const broadcastToAll = (eventType, data) => {
  const payload = JSON.stringify(data);
  const sseMessage = `event: ${eventType}\ndata: ${payload}\n\n`;

  clients.forEach((client) => {
    try {
      client.write(sseMessage);
    } catch (err) {
      clients.delete(client);
    }
  });
};

export const notifyAchievementUnlock = (achievement) => {
  broadcastToAll('achievement-unlock', {
    id: achievement.id,
    name: achievement.name,
    rarity: achievement.rarity,
    points: achievement.points,
    unlockedAt: new Date().toISOString(),
  });
};

export const notifyMetricsUpdate = (metrics) => {
  broadcastToAll('metrics-update', metrics);
};

export const notifyConnectionStatus = (platform, status) => {
  broadcastToAll('connection-status', {
    platform,
    status,
    timestamp: new Date().toISOString(),
  });
};

export const getClientCount = () => clients.size;
