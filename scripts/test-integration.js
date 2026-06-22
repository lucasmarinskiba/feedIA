#!/usr/bin/env node
/**
 * Test de integración end-to-end
 * Ejecuta el flujo completo en modo DRY_RUN para verificar que todo funciona.
 */

import { getDb, listAccounts, getPendingEmails } from '../dist/database/index.js';
import { listBrandIds, getActiveBrandId, loadBrandProfileById } from '../dist/config/accounts.js';
import { runPreFlightCheck } from '../dist/compliance/preflight.js';
import { runHealthChecks } from '../dist/compliance/healthCheck.js';
import { scoutTrends } from '../dist/integrations/trends.js';
import { trackCompetitor } from '../dist/integrations/competitors.js';
import { sendNotification } from '../dist/integrations/email.js';

const tests = [];
let passed = 0;
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

async function runTests() {
  console.log('\n🧪 Test de Integración End-to-End\n');

  for (const t of tests) {
    try {
      await t.fn();
      console.log(`  ✅ ${t.name}`);
      passed++;
    } catch (err) {
      console.log(`  ❌ ${t.name}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n${passed} pasados, ${failed} fallidos\n`);
  if (failed > 0) process.exit(1);
}

// Test 1: Multi-cuenta
test('Multi-cuenta: listar marcas', async () => {
  const ids = listBrandIds();
  if (ids.length === 0) throw new Error('No hay marcas');
  if (!ids.includes('default')) throw new Error('Falta marca default');
});

test('Multi-cuenta: cargar marca activa', async () => {
  const profile = loadBrandProfileById(getActiveBrandId());
  if (!profile.name) throw new Error('Marca sin nombre');
});

// Test 2: SQLite
test('SQLite: base de datos inicializada', async () => {
  const db = getDb();
  if (!db) throw new Error('DB no inicializada');
});

test('SQLite: cuenta sincronizada', async () => {
  const accounts = listAccounts();
  if (accounts.length === 0) throw new Error('No hay cuentas en DB');
  const acc = accounts.find((a) => a.id === 'default');
  if (!acc) throw new Error('Falta cuenta default');
});

// Test 3: Preflight
test('Preflight: ejecuta sin errores críticos de código', async () => {
  const report = await runPreFlightCheck();
  if (!report.checks || report.checks.length < 10) {
    throw new Error(`Solo ${report.checks?.length} checks, esperaba ≥10`);
  }
});

// Test 4: Health Check
test('Health check: ejecuta sin errores críticos de código', async () => {
  const health = await runHealthChecks();
  if (!health.checks || health.checks.length < 10) {
    throw new Error(`Solo ${health.checks?.length} checks, esperaba ≥10`);
  }
});

// Test 5: Trends (sin API keys, debe funcionar con Reddit)
test('Trends: scout funciona sin APIs configuradas', async () => {
  const trends = await scoutTrends(['marketing'], ['reddit']);
  if (!Array.isArray(trends)) throw new Error('No devolvió array');
});

// Test 6: Competitors (sin API keys, debe devolver fallback)
test('Competitors: track funciona sin APIs configuradas', async () => {
  const snap = await trackCompetitor('@instagram');
  if (!snap.handle) throw new Error('No devolvió handle');
  if (!snap.snapshotDate) throw new Error('No devolvió fecha');
});

// Test 7: Email (sin provider, debe encolar)
test('Email: encola en SQLite sin provider configurado', async () => {
  const before = getPendingEmails().length;
  await sendNotification('test@example.com', 'Test', 'Mensaje de prueba');
  const after = getPendingEmails().length;
  if (after <= before) throw new Error('No se encoló el email');
});

// Test 8: Meta integrations (sin token, modo simulado)
test('Meta: publishToInstagram respeta compliance (términos no aceptados)', async () => {
  const { publishToInstagram } = await import('../dist/integrations/meta.js');
  const result = await publishToInstagram({
    format: 'imagen',
    caption: 'Test',
    mediaUrls: ['https://example.com/img.jpg'],
  });
  // Cuando términos no están aceptados, debe bloquear incluso en dry-run
  if (result.ok) throw new Error('Debería bloquear sin términos aceptados');
  if (!result.error?.toLowerCase().includes('compliance'))
    throw new Error('Debería ser error de compliance: ' + result.error);
});

test('Meta: fetchInbound en dry-run devuelve array', async () => {
  const { fetchInbound } = await import('../dist/integrations/meta.js');
  const result = await fetchInbound(new Date(Date.now() - 86400000).toISOString());
  if (!Array.isArray(result)) throw new Error('No devolvió array');
});

test('Meta: insightsApi en dry-run devuelve valores por defecto', async () => {
  const { fetchPostInsights, fetchAccountInsights } = await import('../dist/integrations/insightsApi.js');
  const posts = await fetchPostInsights(new Date(Date.now() - 86400000).toISOString());
  const account = await fetchAccountInsights(new Date(Date.now() - 86400000).toISOString());
  if (!Array.isArray(posts)) throw new Error('fetchPostInsights no devolvió array');
  if (account !== null && typeof account !== 'object') throw new Error('fetchAccountInsights formato inválido');
});

// Test 9: Video pipeline (sin provider, debe devolver error controlado)
test('Video: pipeline devuelve error controlado sin provider', async () => {
  const { runReelPipeline } = await import('../dist/capabilities/video/pipeline.js');
  const result = await runReelPipeline({ topic: 'Test', brandId: 'default' });
  if (result.ok) throw new Error('Debería fallar sin provider');
  if (!result.error) throw new Error('Debería tener mensaje de error');
});

// Test 10: A/B Testing
test('A/B Testing: listar funciona', async () => {
  const { listABTests } = await import('../dist/capabilities/abTesting/index.js');
  const tests = listABTests('default');
  if (!Array.isArray(tests)) throw new Error('No devolvió array');
});

await runTests();
console.log('🎉 Todos los tests de integración pasaron\n');
