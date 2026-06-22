/**
 * Validación manual del RobotModeRouter en DRY_RUN.
 * Ejecutar con: npx tsx scripts/validate-robot-mode.ts
 */

import { executeRobotAction, clearRobotModeHistory } from '../src/robotMode/RobotModeRouter.js';
import { checkUnifiedRateLimit, calculateWarmupFactor } from '../src/robotMode/unifiedRateLimiter.js';
import { buildAccountContext, resetWarmupState, getWarmupStats } from '../src/robotMode/warmupTracker.js';
import { scanForBlocks, analyzeShadowbanSignals, setKillSwitch } from '../src/robotMode/blockDetection.js';
import type { BrandProfile } from '../src/config/types.js';

const mockBrand: BrandProfile = {
  name: 'TestBrand',
  handle: '@testbrand',
  niche: 'test',
  tone: 'professional',
  audience: 'testers',
  goals: ['awareness'],
  pillars: ['testing'],
  contentTypes: ['carousel'],
  postingFrequency: 'daily',
  hashtagStrategy: 'mixed',
  visualStyle: 'clean',
  competitorHandles: [],
  valueProposition: 'Testing',
  ctaStyle: 'soft',
  language: 'es',
  emojiUsage: 'moderate',
};

const assert = (condition: boolean, message: string): void => {
  if (!condition) throw new Error(`❌ FAIL: ${message}`);
  console.log(`✅ PASS: ${message}`);
};

async function runTests() {
  console.log('\n🧪 Validando RobotModeRouter (DRY_RUN)\n');
  console.log('='.repeat(50));

  // ── UnifiedRateLimiter ─────────────────────────────────────────────────────
  console.log('\n📊 UnifiedRateLimiter');

  const ctx = { followerCount: 100, robotAgeDays: 0 };
  const rateCheck = checkUnifiedRateLimit('publish', ctx);
  assert(rateCheck.allowed, 'Primera acción permitida durante warmup');
  assert(rateCheck.warmupFactor === 0.1, 'Warmup factor inicial = 0.1');
  assert(rateCheck.tier === 'new', 'Tier = new para 100 seguidores');

  const enterprise = checkUnifiedRateLimit('like', { followerCount: 1_000_000 });
  assert(enterprise.tier === 'enterprise', 'Tier = enterprise para 1M seguidores');

  assert(calculateWarmupFactor({ currentDay: 0, warmupDays: 21, initialFactor: 0.1 }) === 0.1, 'Warmup día 0 = 0.1');
  assert(calculateWarmupFactor({ currentDay: 21, warmupDays: 21, initialFactor: 0.1 }) === 1.0, 'Warmup día 21 = 1.0');

  // ── WarmupTracker ──────────────────────────────────────────────────────────
  console.log('\n🔥 WarmupTracker');

  resetWarmupState(mockBrand);
  const stats = getWarmupStats(mockBrand);
  assert(stats.currentDay === 0, 'Día inicial = 0');
  assert(stats.totalActions === 0, 'Acciones iniciales = 0');

  const accountCtx = buildAccountContext(mockBrand, 5000);
  assert(accountCtx.followerCount === 5000, 'Follower count en contexto');
  assert(accountCtx.warmup!.currentDay === 0, 'Warmup day en contexto');

  // ── BlockDetection ─────────────────────────────────────────────────────────
  console.log('\n🛡️ BlockDetection');

  const challenge = scanForBlocks('Por favor confirma tu identidad para continuar');
  assert(challenge.blocked, 'Detecta challenge de verificación');
  assert(
    challenge.indicators.some((i) => i.id === 'IG-CHALLENGE'),
    'Indicador IG-CHALLENGE presente',
  );

  const actionBlocked = scanForBlocks('Acción bloqueada. Inténtalo de nuevo más tarde.');
  assert(actionBlocked.blocked, 'Detecta action blocked');

  const captcha = scanForBlocks('Por favor completa el CAPTCHA');
  assert(captcha.blocked, 'Detecta CAPTCHA');

  const normal = scanForBlocks('Tu publicación ha sido compartida exitosamente');
  assert(!normal.blocked, 'No detecta bloqueo en texto normal');

  const shadowban = analyzeShadowbanSignals({
    reachDropRatio: 0.2,
    hashtagInvisible: true,
    feedInvisible: false,
    accountRestrictions: [],
  });
  assert(shadowban.shadowbanLikely, 'Detecta shadowban con señales fuertes');
  assert(shadowban.confidence > 50, 'Confianza de shadowban > 50%');

  // ── RobotModeRouter ────────────────────────────────────────────────────────
  console.log('\n🤖 RobotModeRouter (DRY_RUN)');

  clearRobotModeHistory(mockBrand);
  setKillSwitch(false); // desactivar para tests

  const pubResult = await executeRobotAction({
    type: 'publish',
    brand: mockBrand,
    format: 'post',
    mediaPaths: ['test.jpg'],
    caption: 'Test post',
  });
  assert(pubResult.ok, `Publish OK en DRY_RUN (vía: ${pubResult.via})`);
  assert(pubResult.actionType === 'publish', 'Action type = publish');

  const likeResult = await executeRobotAction({
    type: 'like',
    brand: mockBrand,
    postUrl: 'https://instagram.com/p/test',
  });
  assert(likeResult.actionType === 'like', 'Action type = like');

  const commentResult = await executeRobotAction({
    type: 'comment',
    brand: mockBrand,
    postUrl: 'https://instagram.com/p/test',
    text: 'Great post!',
  });
  assert(commentResult.actionType === 'comment', 'Action type = comment');

  console.log('\n' + '='.repeat(50));
  console.log('✅ Todos los tests pasaron correctamente');
  console.log('='.repeat(50) + '\n');
}

runTests().catch((err) => {
  console.error('\n💥 Error en validación:', err);
  process.exit(1);
});
