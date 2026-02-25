import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GatewayConfigManager } from '../index.cjs';
import path from 'path';
import fs from 'fs/promises';

const testConfigPath = path.join(__dirname, 'temp-gateway-config.json');
const testSchemaPath = path.join(__dirname, '..', 'schema.json');

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readFile: vi.fn((filepath) => {
      if (filepath === testConfigPath) {
        return Promise.resolve(JSON.stringify(global.mockGatewayConfig));
      } else if (filepath === testSchemaPath) {
        return actual.readFile(path.join(__dirname, '..', 'schema.json')); // Read actual schema
      }
      return Promise.reject(new Error(`File not found: ${filepath}`));
    }),
    writeFile: vi.fn((filepath, data) => {
      if (filepath === testConfigPath) {
        global.mockGatewayConfig = JSON.parse(data);
        return Promise.resolve();
      }
      return Promise.reject(new Error(`File not found: ${filepath}`));
    }),
    access: vi.fn((filepath) => {
      if (filepath === testConfigPath || filepath === testSchemaPath) {
        return Promise.resolve();
      }
      return Promise.reject(new Error(`File not found: ${filepath}`));
    }),
  };
});

describe('GatewayConfigManager', () => {
  let manager;
  let initialConfigContent;

  beforeEach(async () => {
    initialConfigContent = {
      rules: [
        {
          id: 'rule1',
          name: 'Test Rule 1',
          path: '/test1',
          targetUrl: 'http://localhost:3000/1',
          status: 'active',
          priority: 50,
          created: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z',
        },
        {
          id: 'rule2',
          name: 'Test Rule 2',
          path: '/test2',
          targetUrl: 'http://localhost:3000/2',
          status: 'inactive',
          priority: 60,
          created: '2024-01-02T00:00:00Z',
          updated: '2024-01-02T00:00:00Z',
        },
      ],
      metadata: {
        created: '2024-01-01T00:00:00Z',
        version: '1.0.0',
        description: 'Initial config for tests',
      },
    };
    global.mockGatewayConfig = JSON.parse(JSON.stringify(initialConfigContent)); // Deep copy
    fs.writeFile.mockClear(); // Clear mock history for writeFile
    manager = new GatewayConfigManager(testConfigPath, testSchemaPath, true, global.mockGatewayConfig); // Pass initial config for test mode
  });

  it('should return all rules', async () => {
    const rules = await manager.getAllRules();
    expect(rules).toHaveLength(2);
    expect(rules[0].id).toBe('rule1');
  });

  it('should return a rule by ID', async () => {
    const rule = await manager.getRule('rule1');
    expect(rule).toBeDefined();
    expect(rule.name).toBe('Test Rule 1');
  });

  it('should return null if rule not found', async () => {
    const rule = await manager.getRule('nonexistent');
    expect(rule).toBeNull();
  });

  it('should add a new rule', async () => {
    const newRule = {
      id: 'rule3',
      name: 'Test Rule 3',
      path: '/test3',
      targetUrl: 'http://localhost:3000/3',
      status: 'active',
      priority: 70,
    };
    const addedRule = await manager.addRule(newRule);
    expect(addedRule).toMatchObject(newRule);
    expect(addedRule.created).toBeDefined();
    expect(addedRule.updated).toBeDefined();
    const rules = await manager.getAllRules();
    expect(rules).toHaveLength(3);
    expect(fs.writeFile).toHaveBeenCalledTimes(1);
  });

  it('should throw error if adding duplicate rule ID', async () => {
    const duplicateRule = {
      id: 'rule1',
      name: 'Duplicate Rule',
      path: '/dup',
      targetUrl: 'http://localhost:3000/dup',
      status: 'active',
      priority: 50,
    };
    await expect(manager.addRule(duplicateRule)).rejects.toThrow(`Gateway rule with ID 'rule1' already exists.`);
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('should update an existing rule', async () => {
    const updates = {
      name: 'Updated Test Rule 1',
      status: 'inactive',
      priority: 99,
    };
    const updatedRule = await manager.updateRule('rule1', updates);
    expect(updatedRule).toMatchObject(updates);
    expect(updatedRule.updated).toBeGreaterThan(updatedRule.created); // Check updated timestamp
    const rule = await manager.getRule('rule1');
    expect(rule.name).toBe('Updated Test Rule 1');
    expect(fs.writeFile).toHaveBeenCalledTimes(1);
  });

  it('should throw error if updating non-existent rule', async () => {
    await expect(manager.updateRule('nonexistent', { name: 'New Name' })).rejects.toThrow(`Gateway rule with ID 'nonexistent' not found.`);
    expect(fs.writeFile).not.toHaveBeenCalled();
  });

  it('should delete a rule', async () => {
    const result = await manager.deleteRule('rule1');
    expect(result).toBe(true);
    const rules = await manager.getAllRules();
    expect(rules).toHaveLength(1);
    expect(rules[0].id).toBe('rule2');
    expect(fs.writeFile).toHaveBeenCalledTimes(1);
  });

  it('should throw error if deleting non-existent rule', async () => {
    await expect(manager.deleteRule('nonexistent')).rejects.toThrow(`Gateway rule with ID 'nonexistent' not found for deletion.`);
    expect(fs.writeFile).not.toHaveBeenCalled();
  });
});
