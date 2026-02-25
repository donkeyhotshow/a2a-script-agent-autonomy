import { settingsConfigManager } from '../index.js';
import assert from 'assert';

async function runTests() {
  console.log('Running SettingsConfigManager tests...');

  // Test getSettingsConfig
  try {
    const config = settingsConfigManager.getSettingsConfig();
    assert.ok(config, 'Should return the full settings config');
    assert.strictEqual(config.connection.serverUrl, 'http://localhost:3000/api', 'Server URL should match');
    console.log(`Test: getSettingsConfig - PASSED`);
  } catch (error) {
    console.error(`Test: getSettingsConfig - FAILED`, error.message);
  }

  // Test getConnectionServerUrl
  try {
    const serverUrl = settingsConfigManager.getConnectionServerUrl();
    assert.strictEqual(serverUrl, 'http://localhost:3000/api', 'Connection server URL should match');
    console.log(`Test: getConnectionServerUrl - PASSED`);
  } catch (error) {
    console.error(`Test: getConnectionServerUrl - FAILED`, error.message);
  }

  // Test getPerformanceRefreshInterval
  try {
    const interval = settingsConfigManager.getPerformanceRefreshInterval();
    assert.strictEqual(interval, 5000, 'Performance refresh interval should match');
    console.log(`Test: getPerformanceRefreshInterval - PASSED`);
  } catch (error) {
    console.error(`Test: getPerformanceRefreshInterval - FAILED`, error.message);
  }

  // Test getSecurityRequireAuth
  try {
    const requireAuth = settingsConfigManager.getSecurityRequireAuth();
    assert.strictEqual(requireAuth, false, 'Security require auth should be false');
    console.log(`Test: getSecurityRequireAuth - PASSED`);
  } catch (error) {
    console.error(`Test: getSecurityRequireAuth - FAILED`, error.message);
  }

  // Test getLoggingLevel
  try {
    const level = settingsConfigManager.getLoggingLevel();
    assert.strictEqual(level, 'info', 'Logging level should be info');
    console.log(`Test: getLoggingLevel - PASSED`);
  } catch (error) {
    console.error(`Test: getLoggingLevel - FAILED`, error.message);
  }

  // Test getInterfaceLanguage
  try {
    const language = settingsConfigManager.getInterfaceLanguage();
    assert.strictEqual(language, 'ru', 'Interface language should be ru');
    console.log(`Test: getInterfaceLanguage - PASSED`);
  } catch (error) {
    console.error(`Test: getInterfaceLanguage - FAILED`, error.message);
  }

  // Test getNotificationsEnabled
  try {
    const enabled = settingsConfigManager.getNotificationsEnabled();
    assert.strictEqual(enabled, true, 'Notifications should be enabled');
    console.log(`Test: getNotificationsEnabled - PASSED`);
  } catch (error) {
    console.error(`Test: getNotificationsEnabled - FAILED`, error.message);
  }

  // Test getSystemInfoAppVersion
  try {
    const appVersion = settingsConfigManager.getSystemInfoAppVersion();
    assert.strictEqual(appVersion, '2.1.0', 'System info app version should match');
    console.log(`Test: getSystemInfoAppVersion - PASSED`);
  } catch (error) {
    console.error(`Test: getSystemInfoAppVersion - FAILED`, error.message);
  }

  console.log('SettingsConfigManager tests finished.');
}

runTests();
