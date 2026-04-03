/**
 * CLI entry: `node tests/direct-tests/router-choice-transition-run.mjs`
 * Requires a running a2a-server (see tests/direct-tests/README.md).
 */

import { scriptedRouterChoiceNoStickyRouter } from './router-choice-transition-lib.mjs';

async function main() {
  console.log('=== Router choice (scripted path, no sticky router) ===\n');

  try {
    await scriptedRouterChoiceNoStickyRouter();
    console.log('\n=== OK ===');
    process.exit(0);
  } catch (err) {
    console.error('\n[FAIL]', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}

main();
