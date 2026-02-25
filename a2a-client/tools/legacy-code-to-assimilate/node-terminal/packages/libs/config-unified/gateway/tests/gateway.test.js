/**
 * Тесты для GatewayConfigManager
 * Тестирует функциональность управления конфигурацией шлюза
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GatewayConfigManager } from '../index.cjs';
import path from 'path';
import fs from 'fs/promises';

const testConfigPath = path.join(__dirname, 'temp-config.json');
const testSchemaPath = path.join(__dirname, '..\schema.json');

// Mock the fs module to prevent actual file system operations during tests
vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal();
  const mockFs = {
    ...actual,
    readFile: vi.fn(),
    writeFile: vi.fn(),
    access: vi.fn(() => Promise.resolve()), // Assume file always exists
  };
  return mockFs;
});

describe('GatewayConfigManager', () => {
  let manager;
  let mockConfig;

    beforeEach(async () => {
    vi.clearAllMocks();
    mockConfig = {
      rules: [
        { id: 'r1', name: 'Rule Alpha', route: '/alpha', target: 'http://alpha.com', status: 'active', priority: 60 },
        { id: 'r2', name: 'Rule Beta', route: '/beta', target: 'http://beta.com', status: 'draft', priority: 80 },
      ],
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
        description: 'Test gateway config'
      }
    };
    fs.readFile.mockResolvedValue(JSON.stringify(mockConfig));
    fs.writeFile.mockResolvedValue(undefined);

    manager = new GatewayConfigManager(testConfigPath, testSchemaPath, true);
    await manager.loadConfig(); // Load initial config
  });

  it('should return all rules', async () => {
    const rules = await manager.getAllRules();
    expect(rules).toEqual(mockConfig.rules);
  });

  it('should return a rule by ID', async () => {
    const rule = await manager.getRule('r1');
    expect(rule).toEqual(mockConfig.rules[0]);
  });

  it('should return null if rule not found', async () => {
    const rule = await manager.getRule('nonexistent');
    expect(rule).toBeNull();
  });

  it('should add a new rule', async () => {
    const newRule = { id: 'r3', name: 'Rule Gamma', route: '/gamma', target: 'http://gamma.com', status: 'active', priority: 70 };
    await manager.addRule(newRule);

    const configAfterAdd = JSON.parse(fs.writeFile.mock.calls[0][1]);
    expect(configAfterAdd.rules).toHaveLength(3);
    expect(configAfterAdd.rules[2]).toEqual(expect.objectContaining({ ...newRule, created: expect.any(String) }));
  });

  it('should throw error if adding duplicate rule ID', async () => {
    const duplicateRule = { id: 'r1', name: 'Rule Alpha Clone', route: '/alpha-clone', target: 'http://alpha.clone.com', status: 'active', priority: 60 };
    await expect(manager.addRule(duplicateRule)).rejects.toThrow('Gateway rule with ID r1 already exists.');
  });

  it('should update an existing rule', async () => {
    const updates = { name: 'New Rule Alpha', priority: 90 };
    const updatedRule = await manager.updateRule('r1', updates);

    expect(updatedRule).toEqual(expect.objectContaining({ ...mockConfig.rules[0], ...updates, updated: expect.any(String) }));
    const configAfterUpdate = JSON.parse(fs.writeFile.mock.calls[0][1]);
    expect(configAfterUpdate.rules[0]).toEqual(expect.objectContaining({ ...mockConfig.rules[0], ...updates, updated: expect.any(String) }));
  });

  it('should throw error if updating non-existent rule', async () => {
    const updates = { name: 'nonexistent' };
    await expect(manager.updateRule('nonexistent', updates)).rejects.toThrow('Gateway rule with ID nonexistent not found.');
  });

  it('should delete a rule', async () => {
    await manager.deleteRule('r1');

    const configAfterDelete = JSON.parse(fs.writeFile.mock.calls[0][1]);
    expect(configAfterDelete.rules).toHaveLength(1);
    expect(configAfterDelete.rules[0].id).toBe('r2');
  });

  it('should throw error if deleting non-existent rule', async () => {
    await expect(manager.deleteRule('nonexistent')).rejects.toThrow('Gateway rule with ID nonexistent not found.');
    });
});
