import { errorHandlingConfigManager } from '../index.js';
import assert from 'assert';

async function runTests() {
  console.log('Running ErrorHandlingConfigManager tests...');

  // Test 1: Successful loading and validation of the configuration
  try {
    assert.ok(errorHandlingConfigManager.config, 'Config should be loaded and validated');
    console.log('Test 1: Config loading and validation - PASSED');
  } catch (error) {
    console.error('Test 1: Config loading and validation - FAILED', error.message);
  }

  // Test 2: Get Logging Configuration
  try {
    const loggingConfig = errorHandlingConfigManager.getLoggingConfig();
    assert.ok(loggingConfig, 'Should return logging configuration');
    assert.strictEqual(loggingConfig.level, 'info', 'Logging level should be info');
    console.log('Test 2: getLoggingConfig - PASSED');
  } catch (error) {
    console.error('Test 2: getLoggingConfig - FAILED', error.message);
  }

  // Test 3: Get Monitoring Configuration
  try {
    const monitoringConfig = errorHandlingConfigManager.getMonitoringConfig();
    assert.ok(monitoringConfig, 'Should return monitoring configuration');
    assert.strictEqual(monitoringConfig.enabled, true, 'Monitoring should be enabled');
    console.log('Test 3: getMonitoringConfig - PASSED');
  } catch (error) {
    console.error('Test 3: getMonitoringConfig - FAILED', error.message);
  }

  // Test 4: Get Templates
  try {
    const templates = errorHandlingConfigManager.getTemplates();
    assert.ok(templates, 'Should return templates');
    assert.ok(templates.critical, 'Should contain critical template');
    console.log('Test 4: getTemplates - PASSED');
  } catch (error) {
    console.error('Test 4: getTemplates - FAILED', error.message);
  }

  // Test 5: Get Priorities
  try {
    const priorities = errorHandlingConfigManager.getPriorities();
    assert.ok(priorities, 'Should return priorities');
    assert.ok(priorities.critical, 'Should contain critical priority');
    console.log('Test 5: getPriorities - PASSED');
  } catch (error) {
    console.error('Test 5: getPriorities - FAILED', error.message);
  }

  // Test 6: Get Task Manager Configuration
  try {
    const taskManagerConfig = errorHandlingConfigManager.getTaskManagerConfig();
    assert.ok(taskManagerConfig, 'Should return task manager configuration');
    assert.strictEqual(taskManagerConfig.enabled, true, 'Task manager should be enabled');
    console.log('Test 6: getTaskManagerConfig - PASSED');
  } catch (error) {
    console.error('Test 6: getTaskManagerConfig - FAILED', error.message);
  }

  // Test 7: Get Notifications Configuration
  try {
    const notificationsConfig = errorHandlingConfigManager.getNotificationsConfig();
    assert.ok(notificationsConfig, 'Should return notifications configuration');
    assert.strictEqual(notificationsConfig.enabled, true, 'Notifications should be enabled');
    console.log('Test 7: getNotificationsConfig - PASSED');
  } catch (error) {
    console.error('Test 7: getNotificationsConfig - FAILED', error.message);
  }

  // Test 8: Get Global Configuration
  try {
    const globalConfig = errorHandlingConfigManager.getGlobalConfig();
    assert.ok(globalConfig, 'Should return global configuration');
    assert.strictEqual(globalConfig.enabled, true, 'Global enabled should be true');
    assert.strictEqual(globalConfig.logLevel, 'info', 'Global log level should be info');
    console.log('Test 8: getGlobalConfig - PASSED');
  } catch (error) {
    console.error('Test 8: getGlobalConfig - FAILED', error.message);
  }

  console.log('ErrorHandlingConfigManager tests finished.');
}

runTests();
