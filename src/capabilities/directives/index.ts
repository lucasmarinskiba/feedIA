export type { Directive, DirectiveRun, DirectiveAction, DirectiveStatus, Recurrence, ContentSpec } from './types.js';

export { parseDirective, computeNextRun, type ParseResult } from './parser.js';

export {
  saveDirective,
  listDirectives,
  getDirective,
  updateDirectiveStatus,
  deleteDirective,
  getDueDirectives,
  recordRun,
  listRuns,
} from './store.js';

export { executeDirective } from './engine.js';

import type { BrandProfile } from '../../config/types.js';
import { parseDirective, computeNextRun } from './parser.js';
import { saveDirective, getDueDirectives, recordRun } from './store.js';
import { executeDirective } from './engine.js';
import type { Directive, DirectiveRun } from './types.js';

/** Create + persist a directive from raw user text. */
export const createDirective = (brandId: string, rawText: string, source: Directive['source']): Directive => {
  const { directive } = parseDirective(rawText);
  const full: Directive = {
    ...directive,
    brandId,
    source,
    nextRunAt: computeNextRun(directive.recurrence),
  };
  return saveDirective(full);
};

/** Run every due directive for a brand (called by the scheduler tick). */
export const runDueDirectives = async (brand: BrandProfile): Promise<{ executed: number; runs: DirectiveRun[] }> => {
  const due = getDueDirectives(brand.name);
  const runs: DirectiveRun[] = [];
  for (const d of due) {
    const run = await executeDirective(brand, d);
    recordRun(run, computeNextRun(d.recurrence));
    runs.push(run);
  }
  return { executed: runs.length, runs };
};
