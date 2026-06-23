/**
 * Script manual para validar briefFromStrategy.
 * Uso: npx tsx scripts/test-brief-from-strategy.mjs
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { planNextContent } from '../src/capabilities/strategy/index.js';
import { briefFromStrategy } from '../src/capabilities/pipelines/briefToPublish.js';

const brand = JSON.parse(readFileSync(join(process.cwd(), 'data', 'brand.json'), 'utf8'));

const plan = await planNextContent(brand, { windowDays: 1, briefsPerWindow: 1, dryRun: true });
const brief = plan.briefs[0];
if (!brief) {
  console.error('No se generó brief');
  process.exit(1);
}

console.log('Brief estratégico:', brief.topic, `(${brief.format})`);
const outcome = await briefFromStrategy(brand, brief);
console.log('Outcome:', {
  pendienteAprobacion: outcome.pendienteAprobacion,
  tasteScore: outcome.tasteScore?.overall,
  qualityGate: outcome.qualityGate?.combinedScore,
  renderOk: outcome.render?.ok,
  videoOk: outcome.video?.ok,
});
