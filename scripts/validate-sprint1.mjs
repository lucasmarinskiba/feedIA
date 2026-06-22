/**
 * Script de validación manual para Sprint 1.
 * Prueba las funciones clave en modo DRY_RUN sin framework de testing.
 */
import { applyStealthProfile, getBrowserFingerprint } from '../dist/browserOperators/core/stealthProfile.js';
import { inferTierFromFollowers, getRateLimiter } from '../dist/browserOperators/core/rateLimitSmart.js';
import { InstagramWebOperator } from '../dist/browserOperators/instagram/instagramWebOperator.js';
import { checkPublishHealth, publishToInstagramViaRouter } from '../dist/browserOperators/instagram/publishRouter.js';
import { loadBrandProfile } from '../dist/config/index.js';

const brand = loadBrandProfile();
let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`);
    failed++;
  }
}

function assertEqual(actual, expected, msg) {
  if (actual !== expected) throw new Error(`${msg}: expected ${expected}, got ${actual}`);
}

function assertTrue(value, msg) {
  if (!value) throw new Error(`${msg}: expected true, got ${value}`);
}

console.log('━━━ Validación Sprint 1 ━━━\n');

// StealthProfile
test('StealthProfile genera userAgent válido', () => {
  const p = applyStealthProfile();
  assertTrue(p.userAgent.includes('Mozilla/5.0'), 'userAgent');
  assertTrue(p.viewport.width > 0, 'viewport.width');
});

test('StealthProfile genera fingerprints únicos', () => {
  const p1 = applyStealthProfile();
  const p2 = applyStealthProfile();
  assertTrue(getBrowserFingerprint(p1) !== getBrowserFingerprint(p2), 'fingerprint uniqueness');
});

// RateLimitSmart
test('RateLimitSmart infiere tier correcto', () => {
  assertEqual(inferTierFromFollowers(100), 'new', 'new tier');
  assertEqual(inferTierFromFollowers(3000), 'small', 'small tier');
  assertEqual(inferTierFromFollowers(30000), 'medium', 'medium tier');
  assertEqual(inferTierFromFollowers(300000), 'large', 'large tier');
  assertEqual(inferTierFromFollowers(1000000), 'enterprise', 'enterprise tier');
});

test('RateLimitSmart limita posts por día', () => {
  const limiter = getRateLimiter('new');
  assertEqual(limiter.config.maxPostsPerDay, 1, 'maxPostsPerDay new');
  assertEqual(limiter.config.maxInteractionsPerHour, 10, 'maxInteractionsPerHour new');
});

test('RateLimitSmart permite primera acción', () => {
  const limiter = getRateLimiter('medium');
  assertTrue(limiter.canProceed('post_1'), 'canProceed first action');
});

// InstagramWebOperator
test('InstagramWebOperator inicializa en dry_run', () => {
  const op = new InstagramWebOperator({ brand, headless: true, dryRun: true });
  assertEqual(op.getPlatform(), 'instagram-web', 'platform');
  assertTrue(op.isDryRun(), 'dryRun');
});

// PublishRouter
test('checkPublishHealth retorna 3 vías', async () => {
  const health = await checkPublishHealth(brand);
  assertTrue(typeof health.api === 'boolean', 'api boolean');
  assertTrue(typeof health.web === 'boolean', 'web boolean');
  assertTrue(typeof health.app === 'boolean', 'app boolean');
  assertTrue(['api', 'web', 'app'].includes(health.recommended), 'recommended valid');
});

test('publishToInstagramViaRouter dry_run post', async () => {
  const result = await publishToInstagramViaRouter(brand, {
    format: 'post',
    mediaPaths: ['test.jpg'],
    caption: 'Test',
  });
  assertTrue(typeof result.ok === 'boolean', 'result.ok');
  assertTrue(typeof result.via === 'string', 'result.via');
});

test('publishToInstagramViaRouter dry_run story via web', async () => {
  const result = await publishToInstagramViaRouter(
    brand,
    {
      format: 'story',
      mediaPaths: ['test.jpg'],
      caption: '',
    },
    'web',
  );
  assertEqual(result.via, 'web', 'forced via web');
});

console.log(`\n━━━ Resultado: ${passed} passed, ${failed} failed ━━━`);
process.exit(failed > 0 ? 1 : 0);
