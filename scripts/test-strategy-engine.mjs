/**
 * Script manual para validar el Content Strategy Engine.
 * Uso: npx tsx scripts/test-strategy-engine.mjs
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { planNextContent } from '../src/capabilities/strategy/index.js';

const brand = JSON.parse(readFileSync(join(process.cwd(), 'data', 'brand.json'), 'utf8'));

const result = await planNextContent(brand, {
  windowDays: 7,
  briefsPerWindow: 5,
  dryRun: true,
});

console.log('Plan generado para:', result.brandName);
console.log('Insights:', result.insights);
console.log('Briefs:');
result.briefs.forEach((b, i) => {
  console.log(`\n${i + 1}. [${b.format}] ${b.topic}`);
  console.log(`   Ángulo: ${b.angle}`);
  console.log(`   Pilar: ${b.pillar} | Engagement estimado: ${b.estimatedEngagement} | Confianza: ${b.confidence}%`);
  console.log(`   Por qué: ${b.why}`);
  console.log(`   CTA: ${b.cta}`);
  console.log(`   Hashtags: ${(b.hashtags ?? []).join(' ')}`);
  console.log(`   Mejor horario: ${b.bestDay} ${b.bestHour}`);
});
