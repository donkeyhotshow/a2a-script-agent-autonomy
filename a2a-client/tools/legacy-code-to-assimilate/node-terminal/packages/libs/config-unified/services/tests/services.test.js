import servicesConfig from '../index.js';
import assert from 'assert';

function runTests() {
  console.log('Running Unified Services Configuration tests...');

  // Test if servicesConfig is loaded
  try {
    assert.ok(servicesConfig, 'servicesConfig should be loaded');
    console.log('Test: servicesConfig loaded - PASSED');
  } catch (error) {
    console.error('Test: servicesConfig loaded - FAILED', error.message);
  }

  // Test if servicesConfig has expected properties
  try {
    assert.ok(servicesConfig.version, 'servicesConfig should have a version');
    assert.ok(servicesConfig.services, 'servicesConfig should have services property');
    assert.ok(typeof servicesConfig.services === 'object', 'services property should be an object');
    assert.ok(servicesConfig.groups, 'servicesConfig should have groups property');
    assert.ok(typeof servicesConfig.groups === 'object', 'groups property should be an object');
    assert.ok(servicesConfig.settings, 'servicesConfig should have settings property');
    assert.ok(typeof servicesConfig.settings === 'object', 'settings property should be an object');
    assert.ok(servicesConfig.gateway, 'servicesConfig should have gateway property');
    assert.ok(typeof servicesConfig.gateway === 'object', 'gateway property should be an object');
    console.log('Test: servicesConfig properties - PASSED');
  } catch (error) {
    console.error('Test: servicesConfig properties - FAILED', error.message);
  }

  // Test specific service property (projects-manager-ui)
  try {
    const projectsManagerUi = servicesConfig.services['projects-manager-ui'];
    assert.ok(projectsManagerUi, 'projects-manager-ui service should exist');
    assert.strictEqual(projectsManagerUi.name, 'Projects Manager UI', 'projects-manager-ui name should be correct');
    assert.strictEqual(projectsManagerUi.group, 'development', 'projects-manager-ui group should be correct');
    console.log('Test: specific service property (projects-manager-ui) - PASSED');
  } catch (error) {
    console.error('Test: specific service property (projects-manager-ui) - FAILED', error.message);
  }

  // Test node-terminal service property
  try {
    const nodeTerminal = servicesConfig.services['node-terminal'];
    assert.ok(nodeTerminal, 'node-terminal service should exist');
    assert.strictEqual(nodeTerminal.name, 'Node Terminal', 'node-terminal name should be correct');
    assert.strictEqual(nodeTerminal.group, 'tools', 'node-terminal group should be correct');
    assert.strictEqual(nodeTerminal.type, 'mcp-server', 'node-terminal type should be correct');
    assert.strictEqual(nodeTerminal.environment.PORT, '3000', 'node-terminal port should be 3000');
    assert.strictEqual(nodeTerminal.environment.LOG_LEVEL, 'info', 'node-terminal log level should be info');
    console.log('Test: node-terminal service property - PASSED');
  } catch (error) {
    console.error('Test: node-terminal service property - FAILED', error.message);
  }

  // Test node-terminal service ports
  try {
    const nodeTerminal = servicesConfig.services['node-terminal'];
    assert.ok(nodeTerminal.ports, 'node-terminal should have ports');
    assert.strictEqual(nodeTerminal.ports.length, 1, 'node-terminal should have 1 port');
    assert.strictEqual(nodeTerminal.ports[0].name, 'mcp-server', 'port name should be mcp-server');
    assert.strictEqual(nodeTerminal.ports[0].value, 3000, 'port value should be 3000');
    assert.strictEqual(nodeTerminal.ports[0].protocol, 'http', 'port protocol should be http');
    console.log('Test: node-terminal service ports - PASSED');
  } catch (error) {
    console.error('Test: node-terminal service ports - FAILED', error.message);
  }

  console.log('Unified Services Configuration tests finished.');
}

// Export for external usage
export { runTests };

runTests();
