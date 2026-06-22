/**
 * Live Stream — Streaming de acciones de agentes en tiempo real.
 * Permite observar qué hace cada agente segundo a segundo.
 */

import { log } from '../../agent/logger.js';

export interface LiveAction {
  id: string;
  agentId: string;
  action: string;
  status: 'started' | 'completed' | 'failed' | 'checkpoint';
  timestamp: string;
  details?: unknown;
  durationMs?: number;
}

export interface LiveStream {
  streamId: string;
  label: string;
  agentFilter?: string[];
  actions: LiveAction[];
  isActive: boolean;
  startedAt: string;
  endedAt?: string;
}

const activeStreams = new Map<string, LiveStream>();
const STREAM_STORAGE_KEY = 'live_streams';

const loadStreams = (): LiveStream[] => {
  try {
    const raw = process.env[STREAM_STORAGE_KEY];
    return raw ? (JSON.parse(raw) as LiveStream[]) : [];
  } catch {
    return [];
  }
};

const saveStreams = (streams: LiveStream[]): void => {
  process.env[STREAM_STORAGE_KEY] = JSON.stringify(streams.slice(-50));
};

export const startStream = (label: string, agentFilter?: string[]): LiveStream => {
  const stream: LiveStream = {
    streamId: `live-${Date.now()}`,
    label,
    agentFilter,
    actions: [],
    isActive: true,
    startedAt: new Date().toISOString(),
  };
  activeStreams.set(stream.streamId, stream);
  log.info(`[LiveStream] Started ${stream.streamId}: ${label}`);
  return stream;
};

export const endStream = (streamId: string): LiveStream | undefined => {
  const stream = activeStreams.get(streamId);
  if (!stream) return undefined;
  stream.isActive = false;
  stream.endedAt = new Date().toISOString();
  activeStreams.delete(streamId);

  const all = loadStreams();
  all.push(stream);
  saveStreams(all);

  log.info(`[LiveStream] Ended ${streamId}: ${stream.actions.length} actions`);
  return stream;
};

export const recordAction = (
  streamId: string,
  action: Omit<LiveAction, 'id' | 'timestamp'>,
): LiveAction | undefined => {
  const stream = activeStreams.get(streamId);
  if (!stream || !stream.isActive) return undefined;

  // Filter by agent if specified
  if (stream.agentFilter && !stream.agentFilter.includes(action.agentId)) return undefined;

  const liveAction: LiveAction = {
    ...action,
    id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  };

  stream.actions.push(liveAction);
  if (stream.actions.length > 1000) stream.actions.shift();

  return liveAction;
};

export const getStream = (streamId: string): LiveStream | undefined =>
  activeStreams.get(streamId) ?? loadStreams().find((s) => s.streamId === streamId);

export const listActiveStreams = (): LiveStream[] => Array.from(activeStreams.values());

export const getStreamStats = (
  streamId: string,
): { totalActions: number; byAgent: Record<string, number>; byStatus: Record<string, number> } | undefined => {
  const stream = getStream(streamId);
  if (!stream) return undefined;

  const byAgent: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  for (const a of stream.actions) {
    byAgent[a.agentId] = (byAgent[a.agentId] ?? 0) + 1;
    byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;
  }

  return { totalActions: stream.actions.length, byAgent, byStatus };
};
