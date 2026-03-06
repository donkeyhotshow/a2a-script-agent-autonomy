/**
 * All Tests Runner
 */

import chalk from 'chalk';

/**
 * Run all test suites
 */
export async function run(options = {}) {
  console.log(chalk.blue('🚀 Running All Test Suites\n'));

  const testSuites = [
    { name: 'panels', module: './panels.js' },
    { name: 'sessions', module: './sessions.js' },
    { name: 'commands', module: './commands.js' },
    { name: 'performance', module: './performance.js' }
  ];

  let totalPassed = 0;
  let totalFailed = 0;
  const results = [];

  for (const suite of testSuites) {
    try {
      console.log(chalk.yellow(`\n📋 Running ${suite.name} tests...`));

      const testModule = await import(suite.module);
      await testModule.run(options);

      // If we get here, tests passed
      results.push({ suite: suite.name, status: 'passed' });
      totalPassed++;

    } catch (error) {
      results.push({ suite: suite.name, status: 'failed', error: error.message });
      totalFailed++;
      console.log(chalk.red(`❌ ${suite.name} tests failed: ${error.message}`));
    }
  }

  // Print summary
  console.log(chalk.blue('\n📊 Test Summary'));
  console.log(chalk.blue('='.repeat(50)));

  results.forEach(result => {
    const status = result.status === 'passed' ? chalk.green('✓') : chalk.red('✗');
    console.log(`${status} ${result.suite}`);
    if (result.error) {
      console.log(chalk.gray(`  Error: ${result.error}`));
    }
  });

  console.log(chalk.blue('='.repeat(50)));
  console.log(chalk.blue(`Total: ${totalPassed + totalFailed} suites`));
  console.log(chalk.green(`Passed: ${totalPassed}`));
  console.log(chalk.red(`Failed: ${totalFailed}`));

  if (totalFailed > 0) {
    console.log(chalk.red(`\n❌ ${totalFailed} test suite(s) failed`));
    throw new Error(`${totalFailed} test suite(s) failed`);
  } else {
    console.log(chalk.green('\n✅ All test suites passed!'));
  }
}