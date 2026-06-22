import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { log } from '../agent/logger.js';

export interface RenderRequest {
  type: 'carrusel' | 'reel' | 'imagen';
  payload: Record<string, unknown>;
  outputDir?: string;
}

export interface RenderResult {
  ok: boolean;
  artifactPath?: string;
  externalUrl?: string;
  error?: string;
}

export const renderArtifact = async (req: RenderRequest): Promise<RenderResult> => {
  const dir = resolve(req.outputDir ?? 'output');
  mkdirSync(dir, { recursive: true });
  const filename = `${req.type}-${Date.now()}.json`;
  const fullPath = resolve(dir, filename);
  writeFileSync(fullPath, JSON.stringify(req.payload, null, 2), 'utf-8');
  log.success(`Artifact ${req.type} guardado en ${fullPath}`);
  log.debug(
    'Para producción real: enchufar Canva/Adobe Express (carruseles), Veo/Zebracat (reels), DALL·E/Flux (imágenes).',
  );
  return { ok: true, artifactPath: fullPath };
};
