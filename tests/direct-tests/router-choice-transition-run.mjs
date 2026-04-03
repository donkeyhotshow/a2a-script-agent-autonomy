/**
 * CLI entry: `node tests/direct-tests/router-choice-transition-run.mjs`
 * Requires a running a2a-server (see tests/direct-tests/README.md).
 */

import {
  testAgentChoice,
  testRouterTransition,
  testTaskDecompositionChoice,
} from './router-choice-transition-core.mjs';

async function main() {
  console.log('=== Router Choice Transition Tests ===\n');

  try {
    await testRouterTransition();
    await testAgentChoice();
    await testTaskDecompositionChoice();
    console.log('\n=== All tests passed! ===');
    process.exit(0);
  } catch (err) {
    console.error('\n[FAIL]', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
