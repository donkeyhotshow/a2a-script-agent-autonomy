import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DomainsConfigManager } from '../index.cjs';
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

describe('DomainsConfigManager', () => {
  let manager;
  let mockConfig;

  beforeEach(async () => {
    mockConfig = {
      domains: [
        { id: 'domain1', name: 'test1.com', status: 'active', priority: 50, ipAddress: '1.1.1.1' },
        { id: 'domain2', name: 'test2.com', status: 'inactive', priority: 30, ipAddress: '2.2.2.2' },
      ],
      metadata: {
        created: new Date().toISOString(),
        version: '1.0.0',
        description: 'Test config'
      }
    };
    fs.readFile.mockResolvedValue(JSON.stringify(mockConfig));
    fs.writeFile.mockResolvedValue(undefined);

    manager = new DomainsConfigManager(testConfigPath, testSchemaPath, true);
    await manager.loadConfig(); // Load initial config
  });

  it('should return all domains', async () => {
    const domains = await manager.getAllDomains();
    expect(domains).toEqual(mockConfig.domains);
  });

  it('should return a domain by ID', async () => {
    const domain = await manager.getDomain('domain1');
    expect(domain).toEqual(mockConfig.domains[0]);
  });

  it('should return null if domain not found', async () => {
    const domain = await manager.getDomain('nonexistent');
    expect(domain).toBeNull();
  });

  it('should add a new domain', async () => {
    const newDomain = { id: 'domain3', name: 'test3.com', status: 'active', priority: 60, ipAddress: '3.3.3.3' };
    await manager.addDomain(newDomain);

    const configAfterAdd = JSON.parse(fs.writeFile.mock.calls[0][1]);
    expect(configAfterAdd.domains).toHaveLength(3);
    expect(configAfterAdd.domains[2]).toEqual(expect.objectContaining({ ...newDomain, created: expect.any(String) }));
  });

  it('should throw error if adding duplicate domain ID', async () => {
    const duplicateDomain = { id: 'domain1', name: 'test_duplicate.com', status: 'active', priority: 50, ipAddress: '1.1.1.1' };
    await expect(manager.addDomain(duplicateDomain)).rejects.toThrow('Domain with ID domain1 already exists.');
  });

  it('should update an existing domain', async () => {
    const updates = { name: 'updated.com', priority: 70 };
    const updatedDomain = await manager.updateDomain('domain1', updates);

    expect(updatedDomain).toEqual(expect.objectContaining({ ...mockConfig.domains[0], ...updates, updated: expect.any(String) }));
    const configAfterUpdate = JSON.parse(fs.writeFile.mock.calls[0][1]);
    expect(configAfterUpdate.domains[0]).toEqual(expect.objectContaining({ ...mockConfig.domains[0], ...updates, updated: expect.any(String) }));
  });

  it('should throw error if updating non-existent domain', async () => {
    const updates = { name: 'nonexistent.com' };
    await expect(manager.updateDomain('nonexistent', updates)).rejects.toThrow('Domain with ID nonexistent not found.');
  });

  it('should delete a domain', async () => {
    await manager.deleteDomain('domain1');

    const configAfterDelete = JSON.parse(fs.writeFile.mock.calls[0][1]);
    expect(configAfterDelete.domains).toHaveLength(1);
    expect(configAfterDelete.domains[0].id).toBe('domain2');
  });

  it('should throw error if deleting non-existent domain', async () => {
    await expect(manager.deleteDomain('nonexistent')).rejects.toThrow('Domain with ID nonexistent not found.');
  });
});
