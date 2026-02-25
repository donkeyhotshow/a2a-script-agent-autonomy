import { systemConfigManager } from '../index.js';
import assert from 'assert';

async function runTests() {
  console.log('Running SystemConfigManager tests...');

  // Test loading system config
  try {
    const config = systemConfigManager.getServiceManagerConfig();
    assert.ok(config, 'Should return service manager configuration');
    assert.deepStrictEqual(config, {
      retryDelaysMs: [1000, 2000, 4000],
      statusCheckInterval: 10000,
      restartBackoffMs: 60000,
    }, 'Service manager config should match expected values');
    console.log('Test: getServiceManagerConfig - PASSED');
  } catch (error) {
    console.error('Test: getServiceManagerConfig - FAILED', error.message);
  }

  // Test getRetryDelays
  try {
    const retryDelays = systemConfigManager.getRetryDelays();
    assert.deepStrictEqual(retryDelays, [1000, 2000, 4000], 'Retry delays should match expected values');
    console.log('Test: getRetryDelays - PASSED');
  } catch (error) {
    console.error('Test: getRetryDelays - FAILED', error.message);
  }

  // Test getStatusCheckInterval
  try {
    const statusCheckInterval = systemConfigManager.getStatusCheckInterval();
    assert.strictEqual(statusCheckInterval, 10000, 'Status check interval should match expected value');
    console.log('Test: getStatusCheckInterval - PASSED');
  } catch (error) {
    console.error('Test: getStatusCheckInterval - FAILED', error.message);
  }

  // Test getRestartBackoff
  try {
    const restartBackoff = systemConfigManager.getRestartBackoff();
    assert.strictEqual(restartBackoff, 60000, 'Restart backoff should match expected value');
    console.log('Test: getRestartBackoff - PASSED');
  } catch (error) {
    console.error('Test: getRestartBackoff - FAILED', error.message);
  }

  console.log('SystemConfigManager tests finished.');
}

runTests();
