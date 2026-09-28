/**
 * Brand Registry — multi-tenant en caliente
 * ─────────────────────────────────────────────────────────────────────────
 * El daemon arranca con UN objeto `BrandProfile` cuya IDENTIDAD se mantiene
 * estable para siempre. Cientos de closures en dashboardApi capturan ese
 * objeto. Para cambiar de cuenta SIN reiniciar, mutamos el contenido del
 * MISMO objeto in-place (borramos claves + Object.assign). Así todas las
 * rutas ya cableadas pasan a operar sobre la nueva marca al instante.
 *
 * La elección se persiste en data/runtime/activeBrand.json (un puntero al
 * archivo de perfil), de modo que un reinicio mantiene la cuenta activa sin
 * sobrescribir ningún perfil.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { BrandProfileSchema, type BrandProfile } from './types.js';

const DATA_DIR = resolve('data');
const POINTER = resolve('data/runtime/activeBrand.json');

let active: BrandProfile | null = null;
let activeFile = 'brand.json';

const readProfileFile = (file: string): BrandProfile => {
  const p = resolve(DATA_DIR, file);
  if (!existsSync(p)) throw new Error(`Perfil de marca no encontrado: ${file}`);
  const raw = JSON.parse(readFileSync(p, 'utf-8')) as unknown;
  return BrandProfileSchema.parse(raw);
};

const readPointer = (): string | null => {
  if (!existsSync(POINTER)) return null;
  try {
    return (JSON.parse(readFileSync(POINTER, 'utf-8')) as { file?: string }).file ?? null;
  } catch {
    return null;
  }
};

const writePointer = (file: string): void => {
  mkdirSync(dirname(POINTER), { recursive: true });
  writeFileSync(POINTER, JSON.stringify({ file, at: new Date().toISOString() }, null, 2), 'utf-8');
};

/** Mutate the stable object IN PLACE so captured references keep working. */
const swapInPlace = (target: BrandProfile, next: BrandProfile): void => {
  for (const k of Object.keys(target)) {
    delete (target as Record<string, unknown>)[k];
  }
  Object.assign(target, next);
};

/**
 * Initialise the registry. Returns the STABLE brand object the daemon must
 * pass to buildDashboardRoutes. Honours a previously activated profile.
 */
export const initBrandRegistry = (): BrandProfile => {
  const pointer = readPointer();
  const file = pointer && existsSync(resolve(DATA_DIR, pointer)) ? pointer : 'brand.json';
  activeFile = file;
  active = readProfileFile(file);
  return active;
};

export const getActiveBrand = (): BrandProfile => {
  if (!active) return initBrandRegistry();
  return active;
};

export const getActiveBrandFile = (): string => activeFile;

export interface BrandProfileEntry {
  file: string;
  name: string;
  niche: string;
  active: boolean;
}

/** A file qualifies as a tenant profile only if it parses as a BrandProfile. */
const isValidProfileFile = (file: string): { name: string; niche: string } | null => {
  try {
    const raw = JSON.parse(readFileSync(resolve(DATA_DIR, file), 'utf-8')) as unknown;
    const parsed = BrandProfileSchema.safeParse(raw);
    if (!parsed.success) return null;
    return { name: parsed.data.name, niche: parsed.data.niche };
  } catch {
    return null;
  }
};

export const listBrandProfiles = (): BrandProfileEntry[] => {
  let files: string[] = [];
  try {
    files = readdirSync(DATA_DIR).filter((f) => /\.json$/i.test(f) && !/example|runtime/i.test(f));
  } catch {
    /* sin data dir */
  }
  const out: BrandProfileEntry[] = [];
  for (const file of files) {
    const meta = isValidProfileFile(file);
    if (!meta) continue; // descarta docs que no son perfiles de marca
    out.push({ file, name: meta.name, niche: meta.niche, active: file === activeFile });
  }
  return out;
};

export interface ActivationResult {
  ok: boolean;
  activeFile: string;
  brand: { name: string; niche: string };
  error?: string;
}

/**
 * Hot-switch the active brand. Mutates the stable object in place — every
 * route that captured it now serves the new account immediately. No restart.
 */
export const activateBrandProfile = (file: string): ActivationResult => {
  if (!active) initBrandRegistry();
  try {
    const next = readProfileFile(file);
    swapInPlace(active!, next);
    activeFile = file;
    writePointer(file);
    return { ok: true, activeFile: file, brand: { name: active!.name, niche: active!.niche } };
  } catch (err) {
    return {
      ok: false,
      activeFile,
      brand: { name: active?.name ?? '', niche: active?.niche ?? '' },
      error: (err as Error).message,
    };
  }
};

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** One-level-aware recursive merge: plain objects merge key-by-key, arrays/primitives replace. */
const deepMerge = <T extends Record<string, unknown>>(base: T, patch: Record<string, unknown>): T => {
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    const existing = out[k];
    out[k] = isPlainObject(v) && isPlainObject(existing) ? deepMerge(existing, v) : v;
  }
  return out as T;
};

/**
 * Merge a partial patch (e.g. Brand Kit edits from the UI) into the active
 * BrandProfile, validate it, persist to the active profile file, and mutate
 * the stable in-memory object in place so every route sees it instantly.
 */
export const updateActiveBrand = (patch: Record<string, unknown>): BrandProfile => {
  if (!active) initBrandRegistry();
  const merged = deepMerge(active as unknown as Record<string, unknown>, patch);
  const validated = BrandProfileSchema.parse(merged);
  writeFileSync(resolve(DATA_DIR, activeFile), JSON.stringify(validated, null, 2), 'utf-8');
  swapInPlace(active!, validated);
  return active!;
};
