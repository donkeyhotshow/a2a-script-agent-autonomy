import { appsListConfigManager } from '../index.js';
import assert from 'assert';

async function runTests() {
  console.log('Running AppsListConfigManager tests...');

  // Test 1: Successful loading and validation of the main configuration
  try {
    assert.ok(appsListConfigManager.config, 'Main config should be loaded and validated');
    assert.strictEqual(appsListConfigManager.config.version, '1.0.0', 'Config version should be 1.0.0');
    console.log('Test 1: Main config loading and validation - PASSED');
  } catch (error) {
    console.error('Test 1: Main config loading and validation - FAILED', error.message);
  }

  // Test 2: Get all applications
  try {
    const allApps = appsListConfigManager.getAllApps();
    assert.ok(Array.isArray(allApps), 'Should return an array of applications');
    assert.ok(allApps.length > 0, 'Should contain at least one application');
    console.log('Test 2: getAllApps - PASSED');
  } catch (error) {
    console.error('Test 2: getAllApps - FAILED', error.message);
  }

  // Test 3: Get application by appId (projects-manager-ui)
  try {
    const app = appsListConfigManager.getAppById('projects-manager-ui');
    assert.ok(app, 'Should return projects-manager-ui app');
    assert.strictEqual(app.title, 'Projects Manager UI', 'App title should match');
    console.log('Test 3: getAppById (projects-manager-ui) - PASSED');
  } catch (error) {
    console.error('Test 3: getAppById (projects-manager-ui) - FAILED', error.message);
  }

  // Test 3.1: Get node-terminal application by appId
  try {
    const app = appsListConfigManager.getAppById('node-terminal');
    assert.ok(app, 'Should return node-terminal app');
    assert.strictEqual(app.title, 'Node Terminal', 'App title should match');
    assert.strictEqual(app.path, 'C:\\apps\\root\\mcp\\node-terminal', 'App path should match');
    assert.ok(app.ports, 'App should have ports');
    assert.strictEqual(app.ports[0].value, 3000, 'App port should be 3000');
    console.log('Test 3.1: getAppById (node-terminal) - PASSED');
  } catch (error) {
    console.error('Test 3.1: getAppById (node-terminal) - FAILED', error.message);
  }

  // Test 4: Get application by title
  try {
    const app = appsListConfigManager.getAppByTitle('Desktop App Clicker');
    assert.ok(app, 'Should return Desktop App Clicker app');
    assert.strictEqual(app.appId, 'desktop-app-clicker', 'App appId should match');
    console.log('Test 4: getAppByTitle - PASSED');
  } catch (error) {
    console.error('Test 4: getAppByTitle - FAILED', error.message);
  }

  // Test 5: Get a non-existent application by appId
  try {
    const app = appsListConfigManager.getAppById('non-existent-app');
    assert.strictEqual(app, undefined, 'Should return undefined for non-existent app');
    console.log('Test 5: getAppById (non-existent) - PASSED');
  } catch (error) {
    console.error('Test 5: getAppById (non-existent) - FAILED', error.message);
  }

  console.log('AppsListConfigManager tests finished.');
}

// Export for external usage
export { runTests };

// Auto-run tests
runTests();
