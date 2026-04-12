/**
 * Global Teardown — runs once after all test suites complete.
 *
 * Currently a no-op: test data created during suites is ephemeral
 * (the regression DB is dropped/recreated per run by the shell script).
 * Add cleanup logic here if you need to remove data from a shared environment.
 */

export default async function globalTeardown() {
  // Nothing to do — run-regression.sh handles DB lifecycle.
  console.log('\n🏁 Regression suite finished.\n');
}
