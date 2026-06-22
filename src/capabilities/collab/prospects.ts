import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type ProspectStatus =
  | 'nuevo'
  | 'evaluado'
  | 'outreach-enviado'
  | 'en-conversacion'
  | 'aceptado'
  | 'rechazado'
  | 'descartado';

export interface CreatorProspect {
  id: string;
  handle: string;
  followersAprox?: number;
  nicho: string;
  alineacion: number;
  riesgoMarca: 'bajo' | 'medio' | 'alto';
  motivacion: string;
  formatoColabSugerido: 'co-creacion' | 'menciones-cruzadas' | 'live-conjunto' | 'paid-partnership' | 'guest-post';
  status: ProspectStatus;
  borradorOutreach?: string;
  ultimoContacto?: string;
  notas: string;
  capturadoEn: string;
}

const STORE = resolve('data/runtime/collab-prospects.json');

const ensureDir = (): void => {
  mkdirSync(resolve('data/runtime'), { recursive: true });
};

export const loadProspects = (): CreatorProspect[] =>
  existsSync(STORE) ? (JSON.parse(readFileSync(STORE, 'utf-8')) as CreatorProspect[]) : [];

export const saveProspects = (list: CreatorProspect[]): void => {
  ensureDir();
  writeFileSync(STORE, JSON.stringify(list, null, 2), 'utf-8');
};

export const upsertProspect = (prospect: CreatorProspect): CreatorProspect => {
  const all = loadProspects();
  const idx = all.findIndex((p) => p.handle === prospect.handle);
  if (idx >= 0) all[idx] = prospect;
  else all.push(prospect);
  saveProspects(all);
  return prospect;
};

export const setStatus = (id: string, status: ProspectStatus, nota?: string): CreatorProspect | null => {
  const all = loadProspects();
  const p = all.find((x) => x.id === id);
  if (!p) return null;
  p.status = status;
  if (nota) p.notas = `${p.notas}\n[${new Date().toISOString()}] ${nota}`.trim();
  if (status === 'outreach-enviado' || status === 'en-conversacion') {
    p.ultimoContacto = new Date().toISOString();
  }
  saveProspects(all);
  return p;
};

export const listByStatus = (status?: ProspectStatus): CreatorProspect[] =>
  status ? loadProspects().filter((p) => p.status === status) : loadProspects();
