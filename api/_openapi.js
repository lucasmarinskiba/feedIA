/**
 * OpenAPI spec loader — sirve docs/openapi.yaml como JSON.
 */
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OPENAPI_PATH = resolve(__dirname, '..', 'docs', 'openapi.yaml');

let cached = null;
let cachedAt = 0;
const CACHE_TTL_MS = 60_000;

export const getOpenApiSpec = async () => {
  if (cached && Date.now() - cachedAt < CACHE_TTL_MS) return cached;
  try {
    const raw = await readFile(OPENAPI_PATH, 'utf-8');
    const spec = yaml.load(raw);
    cached = spec;
    cachedAt = Date.now();
    return spec;
  } catch (err) {
    return { error: err.message, note: 'docs/openapi.yaml no encontrado o inválido' };
  }
};
