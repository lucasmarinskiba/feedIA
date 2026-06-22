#!/usr/bin/env node
/**
 * Script manual para probar post-producción CapCut/InShot inline
 * (sin colas ni Anthropic).
 */

import { CapCutEngine } from '../src/studio/engines/capcutEngine.js';
import { InShotEngine } from '../src/studio/engines/inshotEngine.js';
import type { RenderRequest } from '../src/studio/types.js';

const baseRequest = (provider: 'capcut' | 'inshot'): RenderRequest => ({
  id: `manual-${Date.now()}`,
  format: 'mp4',
  title: 'Reel de prueba post-producción',
  brandProfileId: 'default',
  assets: [
    { id: 'v1', type: 'video', source: 'generated', url: 'https://cdn.test/video-base.mp4' },
    { id: 'a1', type: 'audio', source: 'generated', url: 'https://cdn.test/audio.mp3' },
  ],
  fields: {},
  options: { durationSec: 15 },
});

async function main(): Promise<void> {
  console.log('1) CapCut inline...');
  const capcut = new CapCutEngine({ recipe: 'capcut-auto-captions', brandName: 'TestBrand' });
  const capcutResult = await capcut.render(baseRequest('capcut'));
  console.log(JSON.stringify(capcutResult, null, 2));

  console.log('\n2) InShot inline...');
  const inshot = new InShotEngine({ recipe: 'inshot-effects', brandName: 'TestBrand' });
  const inshotResult = await inshot.render(baseRequest('inshot'));
  console.log(JSON.stringify(inshotResult, null, 2));
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
