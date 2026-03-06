#!/usr/bin/env node

/**
 * Health Check Script - Автоматизированная проверка системы через CLI
 *
 * Проверяет все компоненты системы используя CLI команды
 * и выводит отчет о состоянии.
 */

import { execSync } from 'child_process';
import chalk from 'chalk';
import fs from 'fs';

const CHECKS = [
  {
    name: 'API Server Health',
    command: 'node cli.js status',
    expected: 'Tester API Status',
    timeout: 5000
  },
  {
    name: 'CLI Command Response',
    command: 'node cli.js send ping',
    expected: 'Command sent successfully',
    timeout: 5000
  },
  {
    name: 'Panel Commands',
    command: 'node cli.js panel show test-panel',
    expected: 'Command executed successfully',
    timeout: 5000
  },
  {
    name: 'Session Commands',
    command: 'node cli.js session list',
    expected: 'sessions',
    timeout: 5000
  },
  {
    name: 'Monitoring Setup',
    command: 'timeout 2s node cli.js monitor --filter connected || true',
    expected: 'connected',
    timeout: 3000
  }
];

async function runHealthCheck() {
  console.log(chalk.blue('🔍 A2A System Health Check via CLI\n'));
  console.log(chalk.gray('='.repeat(50)));

  const results = [];
  let passed = 0;
  let failed = 0;

  for (const check of CHECKS) {
    console.log(chalk.yellow(`Testing: ${check.name}`));

    try {
      const startTime = Date.now();
      const output = execSync(check.command, {
        timeout: check.timeout,
        encoding: 'utf-8',
        cwd: process.cwd()
      });
      const duration = Date.now() - startTime;

      if (output.includes(check.expected)) {
        console.log(chalk.green('  ✓ PASSED'), chalk.gray(`(${duration}ms)`));
        results.push({ name: check.name, status: 'PASSED', duration, error: null });
        passed++;
      } else {
        console.log(chalk.red('  ✗ FAILED'), chalk.gray(`(${duration}ms)`));
        console.log(chalk.gray(`    Expected: "${check.expected}"`));
        results.push({ name: check.name, status: 'FAILED', duration, error: 'Unexpected output' });
        failed++;
      }

    } catch (error) {
      console.log(chalk.red('  ✗ ERROR'), chalk.gray(`(${check.timeout}ms timeout)`));
      console.log(chalk.gray(`    ${error.message}`));
      results.push({ name: check.name, status: 'ERROR', duration: check.timeout, error: error.message });
      failed++;
    }

    console.log('');
  }

  // Summary
  console.log(chalk.gray('='.repeat(50)));
  console.log(chalk.blue('📊 Health Check Summary'));
  console.log(chalk.green(`✓ Passed: ${passed}`));
  console.log(chalk.red(`✗ Failed: ${failed}`));
  console.log(chalk.blue(`Total: ${passed + failed}`));

  // Detailed results
  console.log(chalk.blue('\n📋 Detailed Results:'));
  results.forEach(result => {
    const status = result.status === 'PASSED' ? chalk.green('✓') : chalk.red('✗');
    console.log(`${status} ${result.name} (${result.duration}ms)`);
    if (result.error) {
      console.log(chalk.gray(`    Error: ${result.error}`));
    }
  });

  // Save report
  const report = {
    timestamp: new Date().toISOString(),
    summary: { passed, failed, total: passed + failed },
    results,
    system: {
      node: process.version,
      platform: process.platform,
      arch: process.arch
    }
  };

  const reportFile = `health-check-${new Date().toISOString().split('T')[0]}.json`;
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  console.log(chalk.blue(`\n💾 Report saved: ${reportFile}`));

  // Exit code
  if (failed > 0) {
    console.log(chalk.red(`\n❌ Health check failed: ${failed} checks failed`));
    process.exit(1);
  } else {
    console.log(chalk.green('\n✅ All health checks passed!'));
    process.exit(0);
  }
}

// Handle unhandled errors
process.on('unhandledRejection', (error) => {
  console.error(chalk.red('Unhandled error:'), error);
  process.exit(1);
});

process.on('SIGINT', () => {
  console.log(chalk.yellow('\nInterrupted by user'));
  process.exit(130);
});

// Run the health check
runHealthCheck().catch(error => {
  console.error(chalk.red('Health check failed:'), error);
  process.exit(1);
});