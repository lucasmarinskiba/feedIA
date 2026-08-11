#!/usr/bin/env node

/**
 * Load Test — Webhook Throughput
 *
 * Simulates high-volume webhook traffic to test:
 * - Throughput (req/sec)
 * - Latency (p50, p95, p99)
 * - Error rates
 * - Idempotency cache behavior
 *
 * Usage:
 * node scripts/load-test-webhooks.mjs --url http://localhost:3000 --rps 1000 --duration 60
 */

import { parseArgs } from 'node:util';
import { performance } from 'node:perf_hooks';

const { values } = parseArgs({
  options: {
    url: { type: 'string', default: 'http://localhost:3000', short: 'u' },
    rps: { type: 'string', default: '100', short: 'r' },
    duration: { type: 'string', default: '30', short: 'd' },
    verbose: { type: 'boolean', short: 'v' },
  },
});

const API_URL = values.url;
const REQUESTS_PER_SEC = parseInt(values.rps, 10);
const DURATION_SEC = parseInt(values.duration, 10);
const VERBOSE = values.verbose ?? false;

const ACCOUNT_ID = `load-test-${Date.now()}`;
let totalRequests = 0;
let successCount = 0;
let errorCount = 0;
let duplicateCount = 0;
const latencies = [];

console.log(`
╔════════════════════════════════════════════════════════════════╗
║  Load Test: Webhook Throughput                                 ║
╠════════════════════════════════════════════════════════════════╣
║  URL:      ${API_URL.padEnd(50)} ║
║  RPS:      ${REQUESTS_PER_SEC.toString().padEnd(50)} ║
║  Duration: ${DURATION_SEC.toString().padEnd(50)} ║
║  Total:    ${(REQUESTS_PER_SEC * DURATION_SEC).toString().padEnd(50)} ║
╚════════════════════════════════════════════════════════════════╝
`);

// Throttle to desired RPS
const delayMs = 1000 / REQUESTS_PER_SEC;
const startTime = performance.now();
const endTime = startTime + DURATION_SEC * 1000;

const sendWebhook = async (index) => {
  const reqStart = performance.now();

  try {
    const payload = {
      postId: `post-load-${index}`,
      value: Math.random() * 100,
      timestamp: new Date().toISOString(),
      source: 'instagram',
      fanId: `fan-load-${index % 1000}`, // Repeat fan IDs to test cache
    };

    const res = await fetch(`${API_URL}/api/realdata/webhook/conversion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Account-ID': ACCOUNT_ID,
        'X-API-Key': 'sk_prod_test123',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    const latency = performance.now() - reqStart;
    latencies.push(latency);
    totalRequests++;

    const result = await res.json();

    if (res.ok && result.success) {
      successCount++;
      if (result.duplicate) {
        duplicateCount++;
      }
    } else {
      errorCount++;
      if (VERBOSE) {
        console.error(`  ✗ Request ${index} failed:`, res.status, result);
      }
    }
  } catch (err) {
    errorCount++;
    if (VERBOSE) {
      console.error(`  ✗ Request ${index} error:`, String(err));
    }
  }
};

// Main load test loop
const runLoadTest = async () => {
  let requestIndex = 0;

  while (performance.now() < endTime) {
    // Send batch of requests at target RPS
    const batchStart = performance.now();

    // Fire off requests with delay to maintain RPS
    const promises = [];
    while (performance.now() - batchStart < delayMs && performance.now() < endTime) {
      promises.push(sendWebhook(requestIndex++));
    }

    await Promise.all(promises);

    // Throttle to maintain target RPS
    const elapsed = performance.now() - batchStart;
    if (elapsed < delayMs) {
      await new Promise((resolve) => setTimeout(resolve, delayMs - elapsed));
    }

    // Progress every 10% of duration
    const progress = ((performance.now() - startTime) / (DURATION_SEC * 1000)) * 100;
    if (progress % 10 < 1) {
      console.log(`  ${progress.toFixed(0)}% complete (${successCount} success, ${errorCount} errors)`);
    }
  }
};

// Run test
await runLoadTest();

// Calculate percentiles
latencies.sort((a, b) => a - b);
const p50 = latencies[Math.floor(latencies.length * 0.5)];
const p95 = latencies[Math.floor(latencies.length * 0.95)];
const p99 = latencies[Math.floor(latencies.length * 0.99)];
const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;

const errorRate = (errorCount / totalRequests) * 100;
const successRate = (successCount / totalRequests) * 100;
const duplicateRate = (duplicateCount / successCount) * 100;

console.log(`
╔════════════════════════════════════════════════════════════════╗
║  Results                                                       ║
╠════════════════════════════════════════════════════════════════╣
║  Total Requests:  ${totalRequests.toString().padEnd(50)} ║
║  Success:         ${successCount.toString().padEnd(50)} ║
║  Errors:          ${errorCount.toString().padEnd(50)} ║
║  Success Rate:    ${successRate.toFixed(2).padEnd(50)}% ║
║  Error Rate:      ${errorRate.toFixed(2).padEnd(50)}% ║
║  Duplicates:      ${duplicateCount.toString().padEnd(50)} ║
║  Duplicate Rate:  ${duplicateRate.toFixed(2).padEnd(50)}% ║
╠════════════════════════════════════════════════════════════════╣
║  Latency (ms)                                                  ║
║  ├─ Avg:          ${avgLatency.toFixed(2).padEnd(50)} ║
║  ├─ P50:          ${p50.toFixed(2).padEnd(50)} ║
║  ├─ P95:          ${p95.toFixed(2).padEnd(50)} ║
║  └─ P99:          ${p99.toFixed(2).padEnd(50)} ║
║  Throughput:      ${(totalRequests / DURATION_SEC).toFixed(2).padEnd(50)} req/sec ║
╠════════════════════════════════════════════════════════════════╣
║  Pass Criteria                                                 ║
╠════════════════════════════════════════════════════════════════╣
║  ✓ Success Rate > 95%:  ${successRate > 95 ? '✅ PASS' : '❌ FAIL'} ║
║  ✓ P95 Latency < 500ms: ${p95 < 500 ? '✅ PASS' : '❌ FAIL'} ║
║  ✓ P99 Latency < 1000ms: ${p99 < 1000 ? '✅ PASS' : '❌ FAIL'} ║
║  ✓ Throughput > 80 RPS: ${totalRequests / DURATION_SEC > 80 ? '✅ PASS' : '❌ FAIL'} ║
╚════════════════════════════════════════════════════════════════╝
`);

// Exit with appropriate code
const allPass = successRate > 95 && p95 < 500 && p99 < 1000 && totalRequests / DURATION_SEC > 80;
process.exit(allPass ? 0 : 1);
