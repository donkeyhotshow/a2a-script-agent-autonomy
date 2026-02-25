import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HostingConfigManager } from '../index.cjs';
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

describe('HostingConfigManager', () => {
  let manager;
  let mockConfig;

  beforeEach(async () => {
    mockConfig = {
      servers: [
        { id: 'server1', name: 'web01', ipAddress: '10.0.0.1', status: 'online', priority: 70 },
        { id: 'server2', name: 'db01', ipAddress: '10.0.0.2', status: 'offline', priority: 50 },
      ],
      metadata: {
        created: new Date().toISOString(),
        version: '1.0.0',
        description: 'Test hosting config'
      }
    };
    fs.readFile.mockResolvedValue(JSON.stringify(mockConfig));
    fs.writeFile.mockResolvedValue(undefined);

    manager = new HostingConfigManager(testConfigPath, testSchemaPath, true);
    await manager.loadConfig(); // Load initial config
  });

  it('should return all servers', async () => {
    const servers = await manager.getAllServers();
    expect(servers).toEqual(mockConfig.servers);
  });

  it('should return a server by ID', async () => {
    const server = await manager.getServer('server1');
    expect(server).toEqual(mockConfig.servers[0]);
  });

  it('should return null if server not found', async () => {
    const server = await manager.getServer('nonexistent');
    expect(server).toBeNull();
  });

  it('should add a new server', async () => {
    const newServer = { id: 'server3', name: 'cache01', ipAddress: '10.0.0.3', status: 'online', priority: 80 };
    await manager.addServer(newServer);

    const configAfterAdd = JSON.parse(fs.writeFile.mock.calls[0][1]);
    expect(configAfterAdd.servers).toHaveLength(3);
    expect(configAfterAdd.servers[2]).toEqual(expect.objectContaining({ ...newServer, created: expect.any(String) }));
  });

  it('should throw error if adding duplicate server ID', async () => {
    const duplicateServer = { id: 'server1', name: 'web01-clone', ipAddress: '10.0.0.4', status: 'online', priority: 70 };
    await expect(manager.addServer(duplicateServer)).rejects.toThrow('Server with ID server1 already exists.');
  });

  it('should update an existing server', async () => {
    const updates = { name: 'new-web01', status: 'maintenance', priority: 90 };
    const updatedServer = await manager.updateServer('server1', updates);

    expect(updatedServer).toEqual(expect.objectContaining({ ...mockConfig.servers[0], ...updates, updated: expect.any(String) }));
    const configAfterUpdate = JSON.parse(fs.writeFile.mock.calls[0][1]);
    expect(configAfterUpdate.servers[0]).toEqual(expect.objectContaining({ ...mockConfig.servers[0], ...updates, updated: expect.any(String) }));
  });

  it('should throw error if updating non-existent server', async () => {
    const updates = { name: 'nonexistent' };
    await expect(manager.updateServer('nonexistent', updates)).rejects.toThrow('Server with ID nonexistent not found.');
  });

  it('should delete a server', async () => {
    await manager.deleteServer('server1');

    const configAfterDelete = JSON.parse(fs.writeFile.mock.calls[0][1]);
    expect(configAfterDelete.servers).toHaveLength(1);
    expect(configAfterDelete.servers[0].id).toBe('server2');
  });

  it('should throw error if deleting non-existent server', async () => {
    await expect(manager.deleteServer('nonexistent')).rejects.toThrow('Server with ID nonexistent not found.');
  });
});

