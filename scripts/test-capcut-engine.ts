#!/usr/bin/env node
/**
 * Script manual para validar el CapCut Engine y su webhook de retorno.
 *
 * Uso:
 *   npx tsx scripts/test-capcut-engine.ts
 *
 * En DRY_RUN=true el engine devuelve un MP4 simulado.
 */

import { CapCutEngine } from '../src/studio/engines/capcutEngine.js';
import { handleCapCutWebhook } from '../src/integrations/capcutWebhook.js';
import type { RenderRequest } from '../src/studio/types.js';

const request: RenderRequest = {
  id: `test-${Date.now()}`,
  format: 'mp4',
  title: 'Reel de prueba CapCut',
  brandProfileId: 'default',
  assets: [
    { id: 'v1', type: 'video', source: 'generated', url: 'https://cdn.test/video-base.mp4' },
    { id: 'a1', type: 'audio', source: 'generated', url: 'https://cdn.test/music.mp3' },
  ],
  fields: { texto_pantalla: 'Gancho inicial' },
  options: { beats: [{ texto: 'Beat 1', segundos: 3, notaVisual: 'b-roll genérico' }] },
};

async function main(): Promise<void> {
  const engine = new CapCutEngine({ recipe: 'capcut-auto-captions', brandName: 'TestBrand' });
  console.log('1) Renderizando con CapCutEngine...');
  const result = await engine.render(request);
  console.log(JSON.stringify(result, null, 2));

  if (!result.ok) {
    process.exit(1);
  }

  console.log('\n2) Simulando retorno de webhook de CapCut...');
  const webhookResult = handleCapCutWebhook({
    requestId: result.requestId,
    refinedUrl: result.artifactUrls?.[0],
  });
  console.log(JSON.stringify(webhookResult, null, 2));

  if (!webhookResult.ok) {
    process.exit(1);
  }
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
