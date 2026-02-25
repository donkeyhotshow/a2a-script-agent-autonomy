import { serviceGroupsManager } from '../index.js';
import assert from 'assert';

async function runTests() {
  console.log('Running ServiceGroupsManager tests...');

  // Test getAllGroups
  try {
    const allGroups = serviceGroupsManager.getAllGroups();
    assert.ok(Array.isArray(allGroups), 'Should return an array of groups');
    assert.strictEqual(allGroups.length, 4, 'Should return 4 groups');
    console.log('Test: getAllGroups - PASSED');
  } catch (error) {
    console.error(`Test: getAllGroups - FAILED`, error.message);
  }

  // Test getGroupById for 'development'
  try {
    const devGroup = serviceGroupsManager.getGroupById('development');
    assert.ok(devGroup, 'Should return the development group');
    assert.strictEqual(devGroup.name, 'Development Environment', 'Development group name should match');
    assert.deepStrictEqual(devGroup.services, ['projects-manager-ui', 'desktop-app-clicker'], 'Development group services should match');
    console.log(`Test: getGroupById ('development') - PASSED`);
  } catch (error) {
    console.error(`Test: getGroupById ('development') - FAILED`, error.message);
  }

  // Test getGroupById for non-existent group
  try {
    const nonExistentGroup = serviceGroupsManager.getGroupById('non-existent');
    assert.strictEqual(nonExistentGroup, undefined, 'Should return undefined for non-existent group');
    console.log(`Test: getGroupById (non-existent) - PASSED`);
  } catch (error) {
    console.error(`Test: getGroupById (non-existent) - FAILED`, error.message);
  }

  // Test getServicesInGroup for 'development'
  try {
    const devServices = serviceGroupsManager.getServicesInGroup('development');
    assert.deepStrictEqual(devServices, ['projects-manager-ui', 'desktop-app-clicker'], 'Should return correct services for development group');
    console.log(`Test: getServicesInGroup ('development') - PASSED`);
  } catch (error) {
    console.error(`Test: getServicesInGroup ('development') - FAILED`, error.message);
  }

  // Test getServicesInGroup for non-existent group
  try {
    const nonExistentServices = serviceGroupsManager.getServicesInGroup('non-existent');
    assert.deepStrictEqual(nonExistentServices, [], 'Should return an empty array for non-existent group');
    console.log(`Test: getServicesInGroup (non-existent) - PASSED`);
  } catch (error) {
    console.error(`Test: getServicesInGroup (non-existent) - FAILED`, error.message);
  }

  // Test isGroupEnabled for 'development'
  try {
    const isDevEnabled = serviceGroupsManager.isGroupEnabled('development');
    assert.strictEqual(isDevEnabled, true, 'Development group should be enabled');
    console.log(`Test: isGroupEnabled ('development') - PASSED`);
  } catch (error) {
    console.error(`Test: isGroupEnabled ('development') - FAILED`, error.message);
  }

  // Test isGroupEnabled for non-existent group
  try {
    const isNonExistentEnabled = serviceGroupsManager.isGroupEnabled('non-existent');
    assert.strictEqual(isNonExistentEnabled, false, 'Non-existent group should not be enabled');
    console.log(`Test: isGroupEnabled (non-existent) - PASSED`);
  } catch (error) {
    console.error(`Test: isGroupEnabled (non-existent) - FAILED`, error.message);
  }

  // Test doesGroupAutoStart for 'development'
  try {
    const devAutoStart = serviceGroupsManager.doesGroupAutoStart('development');
    assert.strictEqual(devAutoStart, false, 'Development group should not auto-start');
    console.log(`Test: doesGroupAutoStart ('development') - PASSED`);
  } catch (error) {
    console.error(`Test: doesGroupAutoStart ('development') - FAILED`, error.message);
  }

  // Test doesGroupAutoStart for non-existent group
  try {
    const nonExistentAutoStart = serviceGroupsManager.doesGroupAutoStart('non-existent');
    assert.strictEqual(nonExistentAutoStart, false, 'Non-existent group should not auto-start');
    console.log(`Test: doesGroupAutoStart (non-existent) - PASSED`);
  } catch (error) {
    console.error(`Test: doesGroupAutoStart (non-existent) - FAILED`, error.message);
  }

  console.log('ServiceGroupsManager tests finished.');
}

runTests();
