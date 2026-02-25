import { projectTypesConfigManager } from '../index.js';
import assert from 'assert';

async function runTests() {
  console.log('Running ProjectTypesConfigManager tests...');

  // Test getAllProjectTypes
  try {
    const allTypes = projectTypesConfigManager.getAllProjectTypes();
    assert.ok(allTypes, 'Should return all project types');
    assert.ok(allTypes.node, 'Should contain node project type');
    assert.ok(allTypes.vue, 'Should contain vue project type');
    console.log(`Test: getAllProjectTypes - PASSED`);
  } catch (error) {
    console.error(`Test: getAllProjectTypes - FAILED`, error.message);
  }

  // Test getProjectType for 'node'
  try {
    const nodeType = projectTypesConfigManager.getProjectType('node');
    assert.ok(nodeType, 'Should return the node project type');
    assert.strictEqual(nodeType.name, 'Node.js', 'Node project name should match');
    console.log(`Test: getProjectType ('node') - PASSED`);
  } catch (error) {
    console.error(`Test: getProjectType ('node') - FAILED`, error.message);
  }

  // Test getProjectDetectionFiles for 'vue'
  try {
    const vueDetectionFiles = projectTypesConfigManager.getProjectDetectionFiles('vue');
    assert.deepStrictEqual(vueDetectionFiles, ['package.json'], 'Vue detection files should match');
    console.log(`Test: getProjectDetectionFiles ('vue') - PASSED`);
  } catch (error) {
    console.error(`Test: getProjectDetectionFiles ('vue') - FAILED`, error.message);
  }

  // Test getProjectConfigPort for 'react'
  try {
    const reactPort = projectTypesConfigManager.getProjectConfigPort('react');
    assert.strictEqual(reactPort, 3000, 'React config port should match');
    console.log(`Test: getProjectConfigPort ('react') - PASSED`);
  } catch (error) {
    console.error(`Test: getProjectConfigPort ('react') - FAILED`, error.message);
  }

  // Test getProjectConfigStartCommand for 'php'
  try {
    const phpStartCommand = projectTypesConfigManager.getProjectConfigStartCommand('php');
    assert.strictEqual(phpStartCommand, 'php -S localhost:8000', 'PHP start command should match');
    console.log(`Test: getProjectConfigStartCommand ('php') - PASSED`);
  } catch (error) {
    console.error(`Test: getProjectConfigStartCommand ('php') - FAILED`, error.message);
  }

  // Test getProjectDetectionDependencies for 'vite'
  try {
    const viteDependencies = projectTypesConfigManager.getProjectDetectionDependencies('vite');
    assert.deepStrictEqual(viteDependencies, ['vite'], 'Vite dependencies should match');
    console.log(`Test: getProjectDetectionDependencies ('vite') - PASSED`);
  } catch (error) {
    console.error(`Test: getProjectDetectionDependencies ('vite') - FAILED`, error.message);
  }

  console.log('ProjectTypesConfigManager tests finished.');
}

runTests();
