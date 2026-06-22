#!/usr/bin/env node
// Post-deploy smoke tests.
// Usage: node scripts/smoke-tests.mjs https://feedia.vercel.app

const baseUrl = process.argv[2] || process.env.PUBLIC_BASE_URL;

if (!baseUrl) {
  console.error('Usage: node scripts/smoke-tests.mjs <url>');
  process.exit(1);
}

const url = baseUrl.replace(/\/$/, '');

async function request(path, opts = {}) {
  const res = await fetch(`${url}${path}`, { ...opts, redirect: 'follow' });
  const text = await res.text();
  return { status: res.status, headers: res.headers, text };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  console.log(`\n🔥 Smoke testing ${url}...\n`);

  // 1. Health check
  const health = await request('/api/v1/health');
  assert(health.status === 200, `/api/v1/health returned ${health.status}`);
  const healthBody = JSON.parse(health.text);
  assert(healthBody.status === 'ok' || healthBody.ok === true, 'Health body does not indicate ok');
  console.log('✅ /api/v1/health');

  // 2. OpenAPI spec is reachable
  const openapi = await request('/api/v1/openapi.json');
  assert(openapi.status === 200, `/api/v1/openapi.json returned ${openapi.status}`);
  console.log('✅ /api/v1/openapi.json');

  // 3. Frontend index includes version meta
  const index = await request('/');
  assert(index.status === 200, `GET / returned ${index.status}`);
  assert(index.text.includes('x-feedia-version'), 'index.html missing x-feedia-version meta');
  console.log('✅ index.html has x-feedia-version');

  // 4. Security headers on root
  assert(index.headers.get('x-content-type-options') === 'nosniff', 'Missing X-Content-Type-Options');
  assert(
    index.headers.get('x-frame-options') === 'DENY' || index.headers.get('content-security-policy'),
    'Missing frame/CSP protection',
  );
  console.log('✅ Security headers present');

  // 5. Admin monitoring requires auth (should return 401/403, not 500)
  const monitoring = await request('/api/admin/monitoring');
  assert(
    monitoring.status === 401 || monitoring.status === 403,
    `/api/admin/monitoring returned ${monitoring.status}, expected 401/403`,
  );
  console.log('✅ /api/admin/monitoring is protected');

  console.log('\n🎉 All smoke tests passed.\n');
}

run().catch((err) => {
  console.error('\n❌ Smoke test failed:', err.message);
  process.exit(1);
});
