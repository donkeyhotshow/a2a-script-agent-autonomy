/**
 * Panel Management Tests
 */

import fetch from 'node-fetch';
import chalk from 'chalk';

const API_URL = process.env.A2A_API_URL || 'http://localhost:3001';
const SESSION_ID = process.env.A2A_SESSION_ID || 'tester-session';

/**
 * Run panel management tests
 */
export async function run(options = {}) {
  const apiUrl = options.apiUrl || API_URL;
  const sessionId = options.session || SESSION_ID;
  const verbose = options.verbose || false;

  console.log(chalk.blue('🧪 Testing Panel Management\n'));

  const tests = [
    testPanelShow,
    testPanelHide,
    testPanelMove,
    testPanelResize,
    testPanelMinimize,
    testPanelMaximize,
    testPanelClose
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
    throw new Error(`${failed} panel tests failed`);
  }
}

/**
 * Send command to web client
 */
async function sendCommand(command, data, { apiUrl, sessionId }) {
  const payload = {
    type: 'tester_command',
    command: 'panel_control',
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
 * Test panel show command
 */
async function testPanelShow(options) {
  const result = await sendCommand('show', { panelId: 'test-panel' }, options);

  // Wait for response or timeout
  await new Promise(resolve => setTimeout(resolve, 1000));

  return result.success !== false;
}

/**
 * Test panel hide command
 */
async function testPanelHide(options) {
  const result = await sendCommand('hide', { panelId: 'test-panel' }, options);

  await new Promise(resolve => setTimeout(resolve, 1000));

  return result.success !== false;
}

/**
 * Test panel move command
 */
async function testPanelMove(options) {
  const result = await sendCommand('move', {
    panelId: 'test-panel',
    position: { x: 100, y: 200 }
  }, options);

  await new Promise(resolve => setTimeout(resolve, 1000));

  return result.success !== false;
}

/**
 * Test panel resize command
 */
async function testPanelResize(options) {
  const result = await sendCommand('resize', {
    panelId: 'test-panel',
    size: { width: 400, height: 300 }
  }, options);

  await new Promise(resolve => setTimeout(resolve, 1000));

  return result.success !== false;
}

/**
 * Test panel minimize command
 */
async function testPanelMinimize(options) {
  const result = await sendCommand('minimize', { panelId: 'test-panel' }, options);

  await new Promise(resolve => setTimeout(resolve, 1000));

  return result.success !== false;
}

/**
 * Test panel maximize command
 */
async function testPanelMaximize(options) {
  const result = await sendCommand('maximize', { panelId: 'test-panel' }, options);

  await new Promise(resolve => setTimeout(resolve, 1000));

  return result.success !== false;
}

/**
 * Test panel close command
 */
async function testPanelClose(options) {
  const result = await sendCommand('close', { panelId: 'test-panel' }, options);

  await new Promise(resolve => setTimeout(resolve, 1000));

  return result.success !== false;
}