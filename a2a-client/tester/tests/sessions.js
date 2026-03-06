/**
 * Session Management Tests
 */

import fetch from 'node-fetch';
import chalk from 'chalk';

const API_URL = process.env.A2A_API_URL || 'http://localhost:3001';
const SESSION_ID = process.env.A2A_SESSION_ID || 'tester-session';

/**
 * Run session management tests
 */
export async function run(options = {}) {
  const apiUrl = options.apiUrl || API_URL;
  const sessionId = options.session || SESSION_ID;
  const verbose = options.verbose || false;

  console.log(chalk.blue('🧪 Testing Session Management\n'));

  const tests = [
    testSessionCreate,
    testSessionList,
    testSessionSwitch,
    testSessionStatus,
    testSessionDelete
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
    throw new Error(`${failed} session tests failed`);
  }
}

/**
 * Send command to web client
 */
async function sendCommand(command, data, { apiUrl, sessionId }) {
  const payload = {
    type: 'tester_command',
    command: 'session_control',
    data: { ...data, action: command },
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
 * Test session create command
 */
async function testSessionCreate(options) {
  const testSessionId = `test-session-${Date.now()}`;
  const result = await sendCommand('create', {
    sessionId: testSessionId,
    title: 'Test Session'
  }, options);

  await new Promise(resolve => setTimeout(resolve, 1000));

  return result.success !== false;
}

/**
 * Test session list command
 */
async function testSessionList(options) {
  const result = await sendCommand('list', {}, options);

  await new Promise(resolve => setTimeout(resolve, 1000));

  return result.success !== false && Array.isArray(result.data?.sessions);
}

/**
 * Test session switch command
 */
async function testSessionSwitch(options) {
  const result = await sendCommand('switch', {
    sessionId: 'test-session-123'
  }, options);

  await new Promise(resolve => setTimeout(resolve, 1000));

  return result.success !== false;
}

/**
 * Test session status command
 */
async function testSessionStatus(options) {
  const result = await sendCommand('status', {
    sessionId: options.sessionId
  }, options);

  await new Promise(resolve => setTimeout(resolve, 1000));

  return result.success !== false && result.data?.status;
}

/**
 * Test session delete command
 */
async function testSessionDelete(options) {
  const testSessionId = `test-session-delete-${Date.now()}`;
  const result = await sendCommand('delete', {
    sessionId: testSessionId
  }, options);

  await new Promise(resolve => setTimeout(resolve, 1000));

  return result.success !== false;
}