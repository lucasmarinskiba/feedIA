#!/usr/bin/env node

/**
 * CLI runner for E2E integration test
 * Tests entire closed-loop viral optimization pipeline
 *
 * Usage:
 *   npx tsx src/bin/run-e2e-test.ts
 */

import { runFullE2ETest } from '../services/e2e-integration-test.js';
import { log } from '../agent/logger.js';

const main = async (): Promise<void> => {
  log.info('🚀 Starting E2E Integration Test');

  try {
    const result = await runFullE2ETest();

    log.info('✓ Test Execution Complete');
    console.log('\n========== E2E TEST RESULTS ==========\n');

    // Print stage results
    result.stages.forEach((stage, i) => {
      const icon = stage.passed ? '✓' : '✗';
      const status = stage.passed ? 'PASS' : 'FAIL';
      console.log(`${i + 1}. ${icon} ${stage.name} [${status}]`);
      if (!stage.passed || i === result.stages.length - 1) {
        console.log(`   Details: ${JSON.stringify(stage.details).slice(0, 150)}...`);
      }
    });

    console.log(`\n========== SUMMARY ==========\n`);
    console.log(`Overall: ${result.summary}`);
    console.log(`Stages passed: ${result.stages.filter((s) => s.passed).length}/${result.stages.length}`);

    if (result.passed) {
      console.log('\n✓ All stages passed — closed-loop pipeline working end-to-end');
      process.exit(0);
    } else {
      console.log('\n✗ One or more stages failed — see details above');
      process.exit(1);
    }
  } catch (err) {
    log.error('Fatal error during E2E test:', { error: String(err) });
    console.error('\n✗ Test failed with error:', String(err));
    process.exit(1);
  }
};

main();
