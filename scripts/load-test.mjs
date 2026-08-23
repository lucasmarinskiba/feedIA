#!/usr/bin/env node

/**
 * FeedIA Backend Load Testing Script
 * Tests critical endpoints and measures performance
 *
 * Usage:
 *   node scripts/load-test.mjs --url http://localhost:3000 --concurrency 10 --duration 60
 *
 * Tests:
 *   - GET /api/trends/detect (analytics heavy)
 *   - GET /api/trends/audio (simple lookup)
 *   - POST /api/roi/calculate (CPU heavy)
 *   - POST /api/roi/compare (multi-format comparison)
 *   - GET /api/abtest/:id/results (aggregation)
 *   - GET /api/carousel/:id/metrics (cache test)
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';
import { performance } from 'perf_hooks';

// Parse command line arguments
const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i += 2) {
  if (args[i].startsWith('--')) {
    flags[args[i].slice(2)] = args[i + 1] || true;
  }
}

const BASE_URL = flags.url || 'http://localhost:3000';
const CONCURRENCY = parseInt(flags.concurrency || '5', 10);
const DURATION_SECONDS = parseInt(flags.duration || '30', 10);
const API_KEY = flags.key || 'test-key-load-testing';

// Test suite
const tests = [
  {
    name: 'Trends Detection (user-specific)',
    method: 'GET',
    path: '/api/trends/detect?days=7',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
  },
  {
    name: 'Trending Audio (platform query)',
    method: 'GET',
    path: '/api/trends/audio?platform=tiktok&limit=10',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
  },
  {
    name: 'ROI Calculate (CPU intensive)',
    method: 'POST',
    path: '/api/roi/calculate',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      format: 'carousel',
      topic: 'Premium skincare products',
      targetAudience: 'luxury beauty enthusiasts 25-45',
      budget: 500,
      platform: 'instagram',
    }),
  },
  {
    name: 'ROI Compare (multi-format)',
    method: 'POST',
    path: '/api/roi/compare',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      formats: ['carousel', 'reel', 'story'],
      topic: 'Luxury skincare',
      targetAudience: 'premium women 25-45',
      budget: 500,
      platform: 'instagram',
    }),
  },
  {
    name: 'A/B Test Results (aggregation)',
    method: 'GET',
    path: '/api/abtest/test-123/results',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
  },
  {
    name: 'Carousel Metrics (cache test)',
    method: 'GET',
    path: '/api/carousel/carousel-123/metrics',
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
  },
];

// Performance tracking
const results = {};
const startTime = Date.now();
let totalRequests = 0;
let successfulRequests = 0;
let failedRequests = 0;

/**
 * Make HTTP request
 */
const makeRequest = (testConfig) => {
  return new Promise((resolve) => {
    const url = new URL(testConfig.path, BASE_URL);
    const client = url.protocol === 'https:' ? https : http;

    const requestStart = performance.now();

    const req = client.request(url, {
      method: testConfig.method,
      headers: testConfig.headers,
    }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        const duration = performance.now() - requestStart;

        resolve({
          statusCode: res.statusCode,
          duration,
          size: data.length,
          success: res.statusCode >= 200 && res.statusCode < 300,
        });
      });
    });

    req.on('error', (err) => {
      const duration = performance.now() - requestStart;
      resolve({
        statusCode: 0,
        duration,
        error: err.message,
        success: false,
      });
    });

    req.setTimeout(5000, () => {
      req.destroy();
      const duration = performance.now() - requestStart;
      resolve({
        statusCode: 0,
        duration,
        error: 'Timeout',
        success: false,
      });
    });

    if (testConfig.body) {
      req.write(testConfig.body);
    }

    req.end();
  });
};

/**
 * Run concurrent load test
 */
const runLoadTest = async () => {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`FeedIA Backend Load Test`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Target: ${BASE_URL}`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  console.log(`Duration: ${DURATION_SECONDS}s`);
  console.log(`Endpoints: ${tests.length}`);
  console.log(`${'='.repeat(70)}\n`);

  // Initialize results
  for (const test of tests) {
    results[test.name] = {
      count: 0,
      successful: 0,
      failed: 0,
      timings: [],
      errors: {},
      minTime: Infinity,
      maxTime: 0,
      avgTime: 0,
    };
  }

  // Load testing loop
  let testIndex = 0;
  const activeFutures = [];

  while (Date.now() - startTime < DURATION_SECONDS * 1000) {
    // Maintain concurrency
    while (activeFutures.length < CONCURRENCY && Date.now() - startTime < DURATION_SECONDS * 1000) {
      const test = tests[testIndex % tests.length];
      testIndex++;

      const promise = makeRequest(test).then((response) => {
        totalRequests++;

        const testResults = results[test.name];
        testResults.count++;
        testResults.timings.push(response.duration);

        if (response.success) {
          testResults.successful++;
          successfulRequests++;
        } else {
          testResults.failed++;
          failedRequests++;

          const errKey = response.error || `HTTP ${response.statusCode}`;
          testResults.errors[errKey] = (testResults.errors[errKey] || 0) + 1;
        }

        testResults.minTime = Math.min(testResults.minTime, response.duration);
        testResults.maxTime = Math.max(testResults.maxTime, response.duration);
      });

      activeFutures.push(promise);
    }

    // Wait for one to complete
    if (activeFutures.length > 0) {
      await Promise.race(activeFutures);
      // Remove completed promises
      const index = activeFutures.findIndex((p) => p.status !== 'pending');
      if (index >= 0) {
        activeFutures.splice(index, 1);
      }
    }
  }

  // Wait for remaining requests
  await Promise.all(activeFutures);

  // Print results
  console.log('\nRESULTS:');
  console.log(`Total Requests: ${totalRequests}`);
  console.log(`Successful: ${successfulRequests} (${((successfulRequests / totalRequests) * 100).toFixed(1)}%)`);
  console.log(`Failed: ${failedRequests}`);
  console.log(`Total Duration: ${((Date.now() - startTime) / 1000).toFixed(1)}s`);
  console.log(`Throughput: ${(totalRequests / ((Date.now() - startTime) / 1000)).toFixed(1)} req/s\n`);

  // Per-endpoint stats
  console.log(`${'Endpoint'.padEnd(40)} ${'Requests'.padEnd(12)} ${'Success%'.padEnd(12)} ${'Avg (ms)'.padEnd(12)} ${'Min/Max (ms)'.padEnd(15)}`);
  console.log('-'.repeat(91));

  for (const test of tests) {
    const testResults = results[test.name];
    if (testResults.count === 0) continue;

    const avgTime = testResults.timings.reduce((a, b) => a + b, 0) / testResults.timings.length;
    testResults.avgTime = avgTime;

    const successRate = ((testResults.successful / testResults.count) * 100).toFixed(1);
    const minMax = `${testResults.minTime.toFixed(0)}/${testResults.maxTime.toFixed(0)}`;

    console.log(
      `${test.name.padEnd(40)} ${testResults.count.toString().padEnd(12)} ${successRate.padEnd(12)} ${avgTime.toFixed(1).padEnd(12)} ${minMax.padEnd(15)}`
    );

    if (Object.keys(testResults.errors).length > 0) {
      console.log(`  Errors: ${JSON.stringify(testResults.errors)}`);
    }
  }

  console.log(`\n${'='.repeat(70)}\n`);

  // Performance recommendations
  console.log('PERFORMANCE ANALYSIS:');
  const slowTests = Object.entries(results)
    .filter(([_, r]) => r.avgTime > 200)
    .sort((a, b) => b[1].avgTime - a[1].avgTime);

  if (slowTests.length > 0) {
    console.log('\nSLOW ENDPOINTS (> 200ms):');
    for (const [name, r] of slowTests) {
      console.log(`  - ${name}: ${r.avgTime.toFixed(0)}ms (p95: ${r.timings.sort((a, b) => a - b)[Math.floor(r.timings.length * 0.95)].toFixed(0)}ms)`);
    }
  }

  const failureTests = Object.entries(results)
    .filter(([_, r]) => r.failed > 0)
    .sort((a, b) => b[1].failed - a[1].failed);

  if (failureTests.length > 0) {
    console.log('\nFAILING ENDPOINTS:');
    for (const [name, r] of failureTests) {
      const failRate = ((r.failed / r.count) * 100).toFixed(1);
      console.log(`  - ${name}: ${failRate}% failures (${Object.entries(r.errors).map(([e, c]) => `${e}: ${c}`).join(', ')})`);
    }
  }

  if (slowTests.length === 0 && failureTests.length === 0) {
    console.log('\n✓ All endpoints healthy!');
    console.log('  - All response times < 200ms');
    console.log('  - No failures detected');
  }

  console.log('\nRECOMMENDATIONS:');
  console.log('1. Enable Redis caching (via cache-strategy.ts)');
  console.log('2. Apply database indexes (via src/db/optimization.sql)');
  console.log('3. Monitor slow queries in PostgreSQL logs');
  console.log('4. Consider query result batch caching for read-heavy endpoints\n');
};

// Run load test
runLoadTest().catch((err) => {
  console.error('Load test failed:', err);
  process.exit(1);
});
