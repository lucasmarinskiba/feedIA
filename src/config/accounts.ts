import { readFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve, basename, extname } from 'node:path';
import { BrandProfileSchema, type BrandProfile } from './types.js';
import { upsertAccount, listAccounts } from '../database/index.js';

const BRANDS_DIR = resolve('data/brands');
const DEFAULT_BRAND_PATH = resolve('data/brand.json');

function ensureBrandsDir(): void {
  if (!existsSync(BRANDS_DIR)) mkdirSync(BRANDS_DIR, { recursive: true });
}

export const loadBrandProfile = (path?: string): BrandProfile => {
  const resolved = resolve(path ?? DEFAULT_BRAND_PATH);
  if (!existsSync(resolved)) {
    throw new Error(
      `No se encontró perfil de marca en ${resolved}. Copiá data/brand.example.json a data/brand.json y completalo.`,
    );
  }
  const raw = JSON.parse(readFileSync(resolved, 'utf-8')) as unknown;
  return BrandProfileSchema.parse(raw);
};

export const loadBrandProfileById = (brandId: string): BrandProfile => {
  ensureBrandsDir();
  const path = resolve(BRANDS_DIR, `${brandId}.json`);
  if (!existsSync(path)) {
    // fallback to default if brandId is 'default'
    if (brandId === 'default' && existsSync(DEFAULT_BRAND_PATH)) {
      return loadBrandProfile(DEFAULT_BRAND_PATH);
    }
    throw new Error(`No se encontró perfil de marca para "${brandId}" en ${path}`);
  }
  const raw = JSON.parse(readFileSync(path, 'utf-8')) as unknown;
  return BrandProfileSchema.parse(raw);
};

export const listBrandIds = (): string[] => {
  ensureBrandsDir();
  const files = readdirSync(BRANDS_DIR)
    .filter((f) => extname(f) === '.json')
    .map((f) => basename(f, '.json'));
  if (existsSync(DEFAULT_BRAND_PATH) && !files.includes('default')) {
    files.unshift('default');
  }
  return files;
};

export const listBrandProfiles = (): Array<{ id: string; profile: BrandProfile }> =>
  listBrandIds().map((id) => ({ id, profile: loadBrandProfileById(id) }));

export const getActiveBrandId = (): string => process.env.ACTIVE_BRAND_ID ?? 'default';

export const getActiveBrandProfile = (): BrandProfile => loadBrandProfileById(getActiveBrandId());

import { writeFileSync } from 'node:fs';

export const saveBrandProfile = (brandId: string, profile: BrandProfile): void => {
  ensureBrandsDir();
  const path = resolve(BRANDS_DIR, `${brandId}.json`);
  writeFileSync(path, JSON.stringify(profile, null, 2));
  // Sync to DB
  syncBrandToDb(brandId, profile);
};

export const syncBrandToDb = (brandId: string, profile: BrandProfile): void => {
  upsertAccount({
    id: brandId,
    name: profile.name,
    niche: profile.niche ?? undefined,
    type: profile.type ?? undefined,
    brandJson: JSON.stringify(profile),
  });
};

export const syncAllBrandsToDb = (): void => {
  for (const { id, profile } of listBrandProfiles()) {
    syncBrandToDb(id, profile);
  }
};

export const getBrandAccountsFromDb = (): ReturnType<typeof listAccounts> => listAccounts();
