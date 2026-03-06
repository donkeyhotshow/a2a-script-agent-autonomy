/**
 * Command Execution Tests
 */

import fetch from 'node-fetch';
import chalk from 'chalk';

const API_URL = process.env.A2A_API_URL || 'http://localhost:3001';
const SESSION_ID = process.env.A2A_SESSION_ID || 'tester-session';

/**
 * Run command execution tests
 */
export async function run(options = {}) {
  const apiUrl = options.apiUrl || API_URL;
  const sessionId = options.session || SESSION_ID;
  const verbose = options.verbose || false;

  console.log(chalk.blue('🧪 Testing Command Execution\n'));

  const tests = [
    testBasicCommand,
    testCommandWithData,
    testCommandResponse,
    testInvalidCommand,
    testAsyncCommand,
    testCommandTimeout
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
    throw new Error(`${failed} command tests failed`);
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
 * Test basic command execution
 */
async function testBasicCommand(options) {
  const result = await sendCommand('ping', {}, options);

  await new Promise(resolve => setTimeout(resolve, 500));

  return result.success !== false;
}

/**
 * Test command with data payload
 */
async function testCommandWithData(options) {
  const testData = {
    message: 'test message',
    timestamp: Date.now(),
    metadata: { source: 'test', version: '1.0' }
  };

  const result = await sendCommand('echo', testData, options);

  await new Promise(resolve => setTimeout(resolve, 500));

  return result.success !== false && result.data?.echoed === testData;
}

/**
 * Test command response handling
 */
async function testCommandResponse(options) {
  const startTime = Date.now();
  const result = await sendCommand('get_timestamp', {}, options);

  await new Promise(resolve => setTimeout(resolve, 500));

  const responseTime = Date.now() - startTime;

  return result.success !== false &&
         result.data?.timestamp &&
         responseTime < 2000; // Should respond within 2 seconds
}

/**
 * Test invalid command handling
 */
async function testInvalidCommand(options) {
  try {
    await sendCommand('invalid_command_xyz', {}, options);
    return false; // Should have failed
  } catch (error) {
    // Expected to fail
    return error.message.includes('Command failed');
  }
}

/**
 * Test async command execution
 */
async function testAsyncCommand(options) {
  const result = await sendCommand('async_operation', {
    duration: 1000,
    operation: 'test_async'
  }, options);

  // Wait longer for async operation
  await new Promise(resolve => setTimeout(resolve, 1500));

  return result.success !== false && result.data?.completed === true;
}

/**
 * Test command timeout handling
 */
async function testCommandTimeout(options) {
  const startTime = Date.now();

  try {
    await sendCommand('long_running_operation', {
      timeout: 100 // Very short timeout
    }, options);

    await new Promise(resolve => setTimeout(resolve, 2000));

    const elapsed = Date.now() - startTime;
    return elapsed < 1500; // Should have timed out quickly

  } catch (error) {
    return error.message.includes('timeout') || error.message.includes('Command failed');
  }
}