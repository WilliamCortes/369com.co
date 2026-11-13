/**
 * Master Verification Suite Runner
 * Executes all E2E test files across all Tiers and validates exit code 0.
 */

import { getTestSummary } from './runner.ts';

console.log('======================================================================');
console.log('  369com.co E2E Verification Suite Execution (Tiers 1-4)');
console.log('======================================================================\n');

async function runAll() {
  const startTime = Date.now();

  console.log('Loading test suites:');
  console.log(' - Tier 1: Feature Coverage (F1 to F11)');
  await import('./tier1-features.test.ts');

  console.log(' - Tier 2: Boundary & Corner Cases (F1 to F11)');
  await import('./tier2-boundaries.test.ts');

  console.log(' - Tier 3: Cross-Feature Combinations & Pairwise Integration');
  await import('./tier3-cross-feature.test.ts');

  console.log(' - Tier 4: Real-World Application Scenarios (Full User Journeys)');
  await import('./tier4-scenarios.test.ts');

  console.log(' - Module E2E: Checkout Pipeline');
  await import('./checkout.test.ts');

  console.log(' - Module E2E: Webhook Cryptographic Verification');
  await import('./webhook.test.ts');

  console.log(' - Module E2E: Fulfillment & Autonomous Delivery');
  await import('./fulfillment.test.ts');

  // Allow any trailing async microtasks to settle
  await new Promise((resolve) => setTimeout(resolve, 50));

  const duration = Date.now() - startTime;
  const summary = getTestSummary();

  console.log('\n----------------------------------------------------------------------');
  console.log(`Execution Complete in ${duration}ms`);
  console.log(`Total Test Cases Executed: ${summary.total}`);
  console.log(`Passed:                   ${summary.passed}`);
  console.log(`Failed:                   ${summary.failed}`);
  console.log('----------------------------------------------------------------------\n');

  if (summary.failed > 0) {
    console.error('FAILURES DETECTED:');
    for (const f of summary.failures) {
      console.error(`❌ [${f.suite}] -> ${f.test}:`);
      console.error(`   ${f.error?.message || f.error}\n`);
    }
    process.exit(1);
  } else {
    console.log('✅ ALL TEST SUITES PASSED CLEANLY (Exit Code 0)\n');
    process.exit(0);
  }
}

runAll().catch((err) => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
