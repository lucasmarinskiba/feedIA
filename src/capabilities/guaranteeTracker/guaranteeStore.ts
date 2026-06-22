/**
 * Guarantee Store — persistencia de garantías ejecutadas.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

const STORE_PATH = join(process.cwd(), 'data', 'runtime', 'guarantees.json');

export const GuaranteeTicketSchema = z.object({
  id: z.string(),
  promiseId: z.string(),
  clientId: z.string(),
  clientName: z.string(),
  status: z.enum(['open', 'compensated', 'waived', 'disputed']),
  promiseTitle: z.string(),
  targetMetric: z.number(),
  actualMetric: z.number(),
  achievementPct: z.number(),
  compensationType: z.enum(['refund_pct', 'credit_pct', 'free_months', 'manual_review']),
  compensationValue: z.number(),
  compensationDescription: z.string(),
  executedAt: z.string().optional(),
  createdAt: z.string(),
  notes: z.array(z.string()).default([]),
});

export type GuaranteeTicket = z.infer<typeof GuaranteeTicketSchema>;

interface GuaranteeStore {
  version: number;
  tickets: GuaranteeTicket[];
  lastUpdated: string;
}

const DEFAULT_STORE: GuaranteeStore = {
  version: 1,
  tickets: [],
  lastUpdated: new Date().toISOString(),
};

const ensureDir = (): void => {
  const dir = join(process.cwd(), 'data', 'runtime');
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
};

const loadStore = (): GuaranteeStore => {
  try {
    ensureDir();
    if (!existsSync(STORE_PATH)) return structuredClone(DEFAULT_STORE);
    return JSON.parse(readFileSync(STORE_PATH, 'utf8')) as GuaranteeStore;
  } catch {
    return structuredClone(DEFAULT_STORE);
  }
};

const saveStore = (store: GuaranteeStore): void => {
  ensureDir();
  store.lastUpdated = new Date().toISOString();
  writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf8');
};

export const createTicket = (ticket: Omit<GuaranteeTicket, 'id' | 'createdAt'>): GuaranteeTicket => {
  const store = loadStore();
  const full: GuaranteeTicket = {
    ...ticket,
    id: `gtx-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
    createdAt: new Date().toISOString(),
  };
  store.tickets.push(full);
  saveStore(store);
  return full;
};

export const updateTicket = (id: string, patch: Partial<GuaranteeTicket>): GuaranteeTicket | null => {
  const store = loadStore();
  const ticket = store.tickets.find((t) => t.id === id);
  if (!ticket) return null;
  Object.assign(ticket, patch);
  saveStore(store);
  return ticket;
};

export const getTicket = (id: string): GuaranteeTicket | null => {
  const store = loadStore();
  return store.tickets.find((t) => t.id === id) ?? null;
};

export const listTickets = (filters?: { clientId?: string; status?: GuaranteeTicket['status'] }): GuaranteeTicket[] => {
  let tickets = loadStore().tickets;
  if (filters?.clientId) tickets = tickets.filter((t) => t.clientId === filters.clientId);
  if (filters?.status) tickets = tickets.filter((t) => t.status === filters.status);
  return tickets.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

export const getGuaranteeStats = (): {
  totalTickets: number;
  open: number;
  compensated: number;
  totalCompensationValue: number;
  avgAchievementPct: number;
} => {
  const tickets = loadStore().tickets;
  const compensated = tickets.filter((t) => t.status === 'compensated');
  const avgAchievement = tickets.length > 0 ? tickets.reduce((s, t) => s + t.achievementPct, 0) / tickets.length : 0;
  return {
    totalTickets: tickets.length,
    open: tickets.filter((t) => t.status === 'open').length,
    compensated: compensated.length,
    totalCompensationValue: compensated.reduce((s, t) => s + t.compensationValue, 0),
    avgAchievementPct: avgAchievement,
  };
};
