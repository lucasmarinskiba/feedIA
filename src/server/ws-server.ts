/**
 * Real-Time Server — SSE (Server-Sent Events)
 * Replaces polling with instant push notifications
 * No external deps, works in all browsers
 */

import type { ServerResponse } from 'node:http';

const clients = new Set<ServerResponse>();

export const subscribeToAchievementUpdates = (res: ServerResponse): void => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
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

export const broadcastToAll = (eventType: string, data: unknown): void => {
  const payload = JSON.stringify(data);
  const sseMessage = `event: ${eventType}\ndata: ${payload}\n\n`;

  clients.forEach((client) => {
    try {
      client.write(sseMessage);
    } catch {
      clients.delete(client);
    }
  });
};

interface AchievementNotification {
  id: string;
  name: string;
  rarity: string;
  points: number;
}

export const notifyAchievementUnlock = (achievement: AchievementNotification): void => {
  broadcastToAll('achievement-unlock', {
    id: achievement.id,
    name: achievement.name,
    rarity: achievement.rarity,
    points: achievement.points,
    unlockedAt: new Date().toISOString(),
  });
};

export const notifyMetricsUpdate = (metrics: unknown): void => {
  broadcastToAll('metrics-update', metrics);
};

export const notifyConnectionStatus = (platform: string, status: string): void => {
  broadcastToAll('connection-status', {
    platform,
    status,
    timestamp: new Date().toISOString(),
  });
};

export const getClientCount = (): number => clients.size;
