/**
 * DM Sales Pipeline
 *
 * Visualiza y gestiona leads desde el primer contacto hasta el cierre.
 * Kanban: nuevo → calificado → propuesta enviada → negociación → cerrado/ganado → cerrado/perdido
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../../agent/logger.js';

const PIPELINE_FILE = resolve('data/runtime/sales-pipeline.json');

export type PipelineStage =
  | 'nuevo'
  | 'calificado'
  | 'propuesta-enviada'
  | 'negociacion'
  | 'cerrado-ganado'
  | 'cerrado-perdido';

export interface Lead {
  id: string;
  handle: string;
  nombre?: string;
  email?: string;
  telefono?: string;
  stage: PipelineStage;
  source: string; // e.g. "reel:post-123", "dm-trigger:precio", "comment-to-dm:INFO"
  score: number; // 0-100
  firstContact: string; // ISO date
  lastContact: string;
  notes: string[];
  expectedValue?: number; // en USD
  tags: string[];
}

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime'), { recursive: true });
};

const loadLeads = (): Lead[] => {
  if (!existsSync(PIPELINE_FILE)) return [];
  try {
    return JSON.parse(readFileSync(PIPELINE_FILE, 'utf-8')) as Lead[];
  } catch {
    return [];
  }
};

const saveLeads = (leads: Lead[]): void => {
  ensureDir();
  writeFileSync(PIPELINE_FILE, JSON.stringify(leads, null, 2), 'utf-8');
};

export const getLeads = (stage?: PipelineStage): Lead[] => {
  const leads = loadLeads();
  if (stage) return leads.filter((l) => l.stage === stage);
  return leads;
};

export const getLead = (id: string): Lead | undefined => loadLeads().find((l) => l.id === id);

export const addOrUpdateLead = (
  handle: string,
  data: Partial<Omit<Lead, 'id' | 'handle' | 'firstContact'>> & { source: string },
): Lead => {
  const leads = loadLeads();
  const existing = leads.find((l) => l.handle === handle);
  const now = new Date().toISOString();

  if (existing) {
    existing.lastContact = now;
    if (data.stage) existing.stage = data.stage;
    if (data.score !== undefined) existing.score = data.score;
    if (data.notes) existing.notes.push(...data.notes);
    if (data.expectedValue !== undefined) existing.expectedValue = data.expectedValue;
    if (data.nombre) existing.nombre = data.nombre;
    if (data.email) existing.email = data.email;
    if (data.telefono) existing.telefono = data.telefono;
    if (data.tags) existing.tags = [...new Set([...existing.tags, ...data.tags])];
    saveLeads(leads);
    return existing;
  }

  const newLead: Lead = {
    id: `lead-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    handle,
    stage: data.stage ?? 'nuevo',
    source: data.source,
    score: data.score ?? 0,
    firstContact: now,
    lastContact: now,
    notes: data.notes ?? [],
    tags: data.tags ?? [],
    ...(data.nombre ? { nombre: data.nombre } : {}),
    ...(data.email ? { email: data.email } : {}),
    ...(data.telefono ? { telefono: data.telefono } : {}),
    ...(data.expectedValue ? { expectedValue: data.expectedValue } : {}),
  };
  leads.push(newLead);
  saveLeads(leads);
  log.success(`[SalesPipeline] Lead agregado: ${handle} (${newLead.source})`);
  return newLead;
};

export const moveLead = (id: string, newStage: PipelineStage, note?: string): Lead | undefined => {
  const leads = loadLeads();
  const lead = leads.find((l) => l.id === id);
  if (!lead) return undefined;
  lead.stage = newStage;
  lead.lastContact = new Date().toISOString();
  if (note) lead.notes.push(`${new Date().toISOString()}: ${note}`);
  saveLeads(leads);
  log.info(`[SalesPipeline] Lead ${lead.handle} → ${newStage}`);
  return lead;
};

export const deleteLead = (id: string): boolean => {
  const leads = loadLeads();
  const filtered = leads.filter((l) => l.id !== id);
  if (filtered.length === leads.length) return false;
  saveLeads(filtered);
  return true;
};

export const getPipelineStats = (): {
  totalLeads: number;
  byStage: Record<PipelineStage, number>;
  totalValue: number;
  conversionRate: number;
  avgDealSize: number;
} => {
  const leads = loadLeads();
  const byStage: Record<PipelineStage, number> = {
    nuevo: 0,
    calificado: 0,
    'propuesta-enviada': 0,
    negociacion: 0,
    'cerrado-ganado': 0,
    'cerrado-perdido': 0,
  };
  let totalValue = 0;
  let wonCount = 0;
  let wonValue = 0;

  for (const lead of leads) {
    byStage[lead.stage] = (byStage[lead.stage] ?? 0) + 1;
    if (lead.expectedValue) {
      totalValue += lead.expectedValue;
      if (lead.stage === 'cerrado-ganado') {
        wonCount++;
        wonValue += lead.expectedValue;
      }
    }
  }

  const totalClosed = (byStage['cerrado-ganado'] ?? 0) + (byStage['cerrado-perdido'] ?? 0);
  const conversionRate = totalClosed > 0 ? (byStage['cerrado-ganado'] ?? 0) / totalClosed : 0;
  const avgDealSize = wonCount > 0 ? wonValue / wonCount : 0;

  return { totalLeads: leads.length, byStage, totalValue, conversionRate, avgDealSize };
};
