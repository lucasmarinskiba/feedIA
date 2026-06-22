/**
 * Directive Store — persists standing directives + their run history.
 * Scoped per brand. The scheduler reads "due" directives from here.
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import type { Directive, DirectiveRun, DirectiveStatus } from './types.js';

interface Shape {
  directives: Directive[];
  runs: DirectiveRun[];
}

const PATH = resolve('data/runtime/directives.json');

const read = (): Shape => {
  if (!existsSync(PATH)) return { directives: [], runs: [] };
  try {
    return JSON.parse(readFileSync(PATH, 'utf-8')) as Shape;
  } catch {
    return { directives: [], runs: [] };
  }
};
const write = (s: Shape): void => {
  mkdirSync(dirname(PATH), { recursive: true });
  // Cap run history to last 300 to keep file bounded.
  if (s.runs.length > 300) s.runs.splice(0, s.runs.length - 300);
  writeFileSync(PATH, JSON.stringify(s, null, 2), 'utf-8');
};

export const saveDirective = (d: Directive): Directive => {
  const s = read();
  const idx = s.directives.findIndex((x) => x.id === d.id);
  if (idx >= 0) s.directives[idx] = d;
  else s.directives.push(d);
  write(s);
  return d;
};

export const listDirectives = (brandId: string, status?: DirectiveStatus): Directive[] =>
  read()
    .directives.filter((d) => d.brandId === brandId && (!status || d.status === status))
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

export const getDirective = (id: string): Directive | undefined => read().directives.find((d) => d.id === id);

export const updateDirectiveStatus = (id: string, status: DirectiveStatus): Directive | null => {
  const s = read();
  const d = s.directives.find((x) => x.id === id);
  if (!d) return null;
  d.status = status;
  write(s);
  return d;
};

export const deleteDirective = (id: string): boolean => {
  const s = read();
  const i = s.directives.findIndex((x) => x.id === id);
  if (i < 0) return false;
  s.directives.splice(i, 1);
  write(s);
  return true;
};

/** Directives whose nextRunAt is now/past and that are active. */
export const getDueDirectives = (brandId: string, now: Date = new Date()): Directive[] =>
  read().directives.filter(
    (d) => d.brandId === brandId && d.status === 'active' && (!d.nextRunAt || Date.parse(d.nextRunAt) <= now.getTime()),
  );

export const recordRun = (run: DirectiveRun, nextRunAt?: string): void => {
  const s = read();
  s.runs.push(run);
  const d = s.directives.find((x) => x.id === run.directiveId);
  if (d) {
    d.lastRunAt = run.startedAt;
    d.runCount += 1;
    if (nextRunAt) d.nextRunAt = nextRunAt;
    if (run.status === 'failed') d.status = 'error';
    if (d.recurrence.kind === 'once') d.status = 'completed';
  }
  write(s);
};

export const listRuns = (directiveId?: string, limit = 30): DirectiveRun[] => {
  const all = read()
    .runs.filter((r) => !directiveId || r.directiveId === directiveId)
    .sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt));
  return all.slice(0, limit);
};
