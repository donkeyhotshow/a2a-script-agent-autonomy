import { appsListConfigManager } from '../../apps-list/index.js';
import servicesConfig from '../../services/index.js';
import assert from 'assert';

async function runIntegrationTests() {
  console.log('Running Apps-Services Integration tests...');

  // Test 1: Cross-reference validation - all apps in apps-list should have services
  try {
    const allApps = appsListConfigManager.getAllApps();
    let missingServices = [];

    for (const app of allApps) {
      if (!servicesConfig.services[app.appId]) {
        missingServices.push(app.appId);
      }
    }

    assert.strictEqual(missingServices.length, 0, `Missing services for apps: ${missingServices.join(', ')}`);
    console.log('Test 1: Cross-reference validation (apps->services) - PASSED');
  } catch (error) {
    console.error('Test 1: Cross-reference validation (apps->services) - FAILED', error.message);
  }

  // Test 2: Node-terminal specific integration test
  try {
    const nodeTerminalApp = appsListConfigManager.getAppById('node-terminal');
    const nodeTerminalService = servicesConfig.services['node-terminal'];

    assert.ok(nodeTerminalApp, 'node-terminal app should exist in apps-list');
    assert.ok(nodeTerminalService, 'node-terminal service should exist in services');

    // Проверяем соответствие портов
    assert.strictEqual(
      nodeTerminalApp.ports[0].value,
      parseInt(nodeTerminalService.environment.PORT),
      'Port values should match between app and service config'
    );

    console.log('Test 2: Node-terminal specific integration - PASSED');
  } catch (error) {
    console.error('Test 2: Node-terminal specific integration - FAILED', error.message);
  }

  // Test 3: Environment variables consistency
  try {
    const nodeTerminalService = servicesConfig.services['node-terminal'];

    // Проверяем, что все необходимые переменные окружения определены
    assert.ok(nodeTerminalService.environment.PORT, 'PORT should be defined');
    assert.ok(nodeTerminalService.environment.HOST, 'HOST should be defined');
    assert.ok(nodeTerminalService.environment.LOG_LEVEL, 'LOG_LEVEL should be defined');
    assert.ok(nodeTerminalService.environment.NODE_ENV, 'NODE_ENV should be defined');

    console.log('Test 3: Environment variables consistency - PASSED');
  } catch (error) {
    console.error('Test 3: Environment variables consistency - FAILED', error.message);
  }

  // Test 4: Service group validation
  try {
    const nodeTerminalService = servicesConfig.services['node-terminal'];
    const toolsGroup = servicesConfig.groups.tools;

    assert.ok(toolsGroup, 'tools group should exist');
    assert.ok(toolsGroup.services.includes('node-terminal'), 'node-terminal should be in tools group');

    console.log('Test 4: Service group validation - PASSED');
  } catch (error) {
    console.error('Test 4: Service group validation - FAILED', error.message);
  }

  // Test 5: Port configuration consistency
  try {
    const nodeTerminalService = servicesConfig.services['node-terminal'];

    assert.ok(nodeTerminalService.ports, 'node-terminal should have ports');
    assert.strictEqual(nodeTerminalService.ports.length, 1, 'node-terminal should have exactly 1 port');

    const port = nodeTerminalService.ports[0];
    assert.strictEqual(port.name, 'mcp-server', 'port name should be mcp-server');
    assert.strictEqual(port.protocol, 'http', 'port protocol should be http');
    assert.strictEqual(port.value, 3000, 'port value should be 3000');
    assert.strictEqual(port.host, 'localhost', 'port host should be localhost');

    console.log('Test 5: Port configuration consistency - PASSED');
  } catch (error) {
    console.error('Test 5: Port configuration consistency - FAILED', error.message);
  }

  console.log('Apps-Services Integration tests finished.');
}

// Export for external usage
export { runIntegrationTests };

runIntegrationTests();
