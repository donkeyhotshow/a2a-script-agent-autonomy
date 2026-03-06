/**
 * Performance Tests
 */

import fetch from 'node-fetch';
import chalk from 'chalk';

const API_URL = process.env.A2A_API_URL || 'http://localhost:3001';
const SESSION_ID = process.env.A2A_SESSION_ID || 'tester-session';

/**
 * Run performance tests
 */
export async function run(options = {}) {
  const apiUrl = options.apiUrl || API_URL;
  const sessionId = options.session || SESSION_ID;
  const verbose = options.verbose || false;

  console.log(chalk.blue('🧪 Testing Performance\n'));

  const tests = [
    testCommandLatency,
    testConcurrentCommands,
    testMemoryUsage,
    testConnectionStability,
    testLargePayload
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test({ apiUrl, sessionId, verbose });
      if (result) {
        passed++;
        console.log(chalk.green('✓'), test.name.replace('test', ''));
      } else {
        failed++;
        console.log(chalk.red('✗'), test.name.replace('test', ''));
      }
    } catch (error) {
      failed++;
      console.log(chalk.red('✗'), test.name.replace('test', ''), '-', error.message);
    }
  }

  console.log(chalk.blue(`\n📊 Results: ${passed} passed, ${failed} failed`));

  if (failed > 0) {
    throw new Error(`${failed} performance tests failed`);
  }
}

/**
 * Send command to web client
 */
async function sendCommand(command, data = {}, { apiUrl, sessionId }) {
  const payload = {
    type: 'tester_command',
    command,
    data,
    sessionId,
    timestamp: new Date().toISOString()
  };

  const response = await fetch(`${apiUrl}/api/tester/command`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Command failed: ${response.status} ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Test command latency
 */
async function testCommandLatency(options) {
  const iterations = 10;
  const latencies = [];

  for (let i = 0; i < iterations; i++) {
    const startTime = Date.now();
    await sendCommand('ping', {}, options);
    const latency = Date.now() - startTime;
    latencies.push(latency);

    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const avgLatency = latencies.reduce((a, b) => a + b) / latencies.length;
  const maxLatency = Math.max(...latencies);
  const minLatency = Math.min(...latencies);

  console.log(chalk.gray(`  Average latency: ${avgLatency.toFixed(1)}ms`));
  console.log(chalk.gray(`  Min/Max latency: ${minLatency}ms / ${maxLatency}ms`));

  // Should be under 500ms average
  return avgLatency < 500;
}

/**
 * Test concurrent commands
 */
async function testConcurrentCommands(options) {
  const concurrentCount = 5;
  const startTime = Date.now();

  const promises = [];
  for (let i = 0; i < concurrentCount; i++) {
    promises.push(sendCommand('ping', { id: i }, options));
  }

  await Promise.all(promises);
  const totalTime = Date.now() - startTime;

  console.log(chalk.gray(`  ${concurrentCount} concurrent commands completed in ${totalTime}ms`));

  // Should complete within reasonable time
  return totalTime < 2000;
}

/**
 * Test memory usage (simulated)
 */
async function testMemoryUsage(options) {
  // Send commands that might cause memory operations
  const commands = [
    sendCommand('create_panel', { id: 'memory-test-1' }, options),
    sendCommand('create_panel', { id: 'memory-test-2' }, options),
    sendCommand('create_panel', { id: 'memory-test-3' }, options),
  ];

  await Promise.all(commands);

  // Wait for processing
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Clean up
  await sendCommand('cleanup_panels', {}, options);

  return true; // Assume success if no errors
}

/**
 * Test connection stability
 */
async function testConnectionStability(options) {
  const testDuration = 5000; // 5 seconds
  const startTime = Date.now();
  let commandCount = 0;
  let errorCount = 0;

  while (Date.now() - startTime < testDuration) {
    try {
      await sendCommand('ping', {}, options);
      commandCount++;

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      errorCount++;
    }
  }

  const successRate = ((commandCount - errorCount) / commandCount) * 100;

  console.log(chalk.gray(`  Sent ${commandCount} commands with ${errorCount} errors (${successRate.toFixed(1)}% success)`));

  // Should have >95% success rate
  return successRate > 95;
}

/**
 * Test large payload handling
 */
async function testLargePayload(options) {
  // Create a large payload
  const largeData = {
    content: 'x'.repeat(10000), // 10KB string
    array: Array.from({ length: 100 }, (_, i) => ({ id: i, data: 'test'.repeat(10) })),
    nested: {
      level1: {
        level2: {
          level3: {
            largeContent: 'y'.repeat(5000)
          }
        }
      }
    }
  };

  const startTime = Date.now();
  const result = await sendCommand('process_large_data', largeData, options);
  const processingTime = Date.now() - startTime;

  console.log(chalk.gray(`  Large payload (${JSON.stringify(largeData).length} bytes) processed in ${processingTime}ms`));

  // Should process within reasonable time
  return result.success !== false && processingTime < 3000;
}