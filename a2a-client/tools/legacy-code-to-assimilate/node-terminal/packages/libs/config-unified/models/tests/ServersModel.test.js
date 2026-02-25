import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServersModel } from '../ServersModel.mjs';
import { BaseModel } from '../../core/BaseModel.mjs';

// Mock BaseModel to isolate ServersModel's specific logic
vi.mock('../../core/BaseModel.mjs', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    BaseModel: vi.fn(() => ({ // Mock BaseModel constructor
      config: {}, // Mock internal config
      schema: null,
      validators: [],
      cacheMap: new Map(),
      events: new Map(),
      isLoaded: false,
      lastModified: null,
      // Mock BaseModel methods
      get: vi.fn(function(key, defaultValue = null) {
        if (!key) return this.config;
        const keys = key.split('.');
        let value = this.config;
        for (const k of keys) {
          if (value && typeof value === 'object' && k in value) {
            value = value[k];
          } else {
            return defaultValue;
          }
        }
        return value;
      }),
      set: vi.fn(function(key, value) {
        const keys = key.split('.');
        let target = this.config;
        for (let i = 0; i < keys.length - 1; i++) {
          if (!target[keys[i]] || typeof target[keys[i]] !== 'object') {
            target[keys[i]] = {};
          }
          target = target[keys[i]];
        }
        target[keys[keys.length - 1]] = value;
        this.lastModified = new Date();
        this.clearCache();
        return this;
      }),
      emit: vi.fn(),
      clearCache: vi.fn(),
      validate: vi.fn(() => ({ valid: true, errors: [] })), // Default to valid
      // Additional methods that might be called
      toJSON: vi.fn(() => ({ config: {}, schema: null, lastModified: null, version: '1.0.0' })),
      getMetadata: vi.fn(() => ({ cacheSize: 0, eventListeners: [] })),
      updateAll: vi.fn(function(data) { this.config = data; return this; }),
    })),
  };
});

// Mock global fetch for checkServerHealth
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ServersModel', () => {
  let serversModel;
  let mockBaseModelInstance;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // The mock BaseModel instance that BaseModel.mockImplementation will return
    mockBaseModelInstance = new BaseModel(); // This will be the mocked instance

    // Initial setup for the mocked BaseModel's config and schema
    mockBaseModelInstance.config = {
      version: '1.0.0',
      servers: {
        'server1': { id: 'server1', name: 'TestServer1', host: 'localhost', port: 3000, protocol: 'http', status: 'online', environment: 'development', region: 'local' },
        'server2': { id: 'server2', name: 'TestServer2', host: '192.168.1.1', port: 8080, protocol: 'https', status: 'offline', environment: 'production', region: 'us-east-1' },
      },
      clusters: {
        'cluster1': { id: 'cluster1', name: 'TestCluster1', servers: ['server1'] },
      },
    };

    serversModel = new ServersModel(mockBaseModelInstance.config); // Pass initial config to the constructor
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should extend BaseModel', () => {
    expect(serversModel).toBeInstanceOf(BaseModel);
  });

  describe('getServers', () => {
    it('should return all servers', () => {
      const servers = serversModel.getServers();
      expect(servers).toEqual(mockBaseModelInstance.config.servers);
    });
  });

  describe('getServer', () => {
    it('should return a server by ID', () => {
      const server = serversModel.getServer('server1');
      expect(server).toEqual(mockBaseModelInstance.config.servers.server1);
    });

    it('should return null for a non-existent server', () => {
      const server = serversModel.getServer('nonExistent');
      expect(server).toBeNull();
    });
  });

  describe('getClusters', () => {
    it('should return all clusters', () => {
      const clusters = serversModel.getClusters();
      expect(clusters).toEqual(mockBaseModelInstance.config.clusters);
    });
  });

  describe('getCluster', () => {
    it('should return a cluster by ID', () => {
      const cluster = serversModel.getCluster('cluster1');
      expect(cluster).toEqual(mockBaseModelInstance.config.clusters.cluster1);
    });

    it('should return null for a non-existent cluster', () => {
      const cluster = serversModel.getCluster('nonExistent');
      expect(cluster).toBeNull();
    });
  });

  describe('addServer', () => {
    it('should add a new server with default values', () => {
      const newServerData = { id: 'server3', name: 'TestServer3', host: '10.0.0.1', port: 4000, protocol: 'tcp' };
      serversModel.addServer(newServerData);
      const servers = serversModel.getServers();
      expect(servers.server3).toBeDefined();
      expect(servers.server3.status).toBe('offline'); // Default status
      expect(mockBaseModelInstance.set).toHaveBeenCalledWith(
        'servers.server3',
        expect.objectContaining({ id: 'server3', status: 'offline' })
      );
      expect(mockBaseModelInstance.emit).toHaveBeenCalledWith('serverAdded', { serverId: 'server3', server: newServerData });
    });

    it('should add a new server with provided values', () => {
      const newServerData = { id: 'server4', name: 'TestServer4', host: '10.0.0.2', port: 5000, protocol: 'udp', status: 'online', environment: 'production', region: 'eu-west-1' };
      serversModel.addServer(newServerData);
      const servers = serversModel.getServers();
      expect(servers.server4).toEqual(newServerData);
    });

    it('should throw an error if server ID is missing', () => {
      const invalidServerData = { name: 'Invalid', host: '1.1.1.1', port: 1234, protocol: 'http' };
      expect(() => serversModel.addServer(invalidServerData)).toThrow('Server must have id');
    });

    it('should throw an error if server with ID already exists', () => {
      const duplicateServerData = { id: 'server1', name: 'Duplicate', host: '1.1.1.1', port: 1234, protocol: 'http' };
      expect(() => serversModel.addServer(duplicateServerData)).toThrow('Server with ID \"server1\" already exists');
    });
  });

  describe('updateServer', () => {
    it('should update an existing server', () => {
      const updates = { status: 'maintenance', port: 3001 };
      const updatedServer = serversModel.updateServer('server1', updates);
      expect(updatedServer.status).toBe('maintenance');
      expect(updatedServer.port).toBe(3001);
      expect(mockBaseModelInstance.set).toHaveBeenCalledWith(
        'servers.server1',
        expect.objectContaining(updates)
      );
      expect(mockBaseModelInstance.emit).toHaveBeenCalledWith(
        'serverUpdated',
        expect.objectContaining({ serverId: 'server1', updates })
      );
    });

    it('should throw an error if server not found', () => {
      expect(() => serversModel.updateServer('nonExistent', {})).toThrow('Server with ID \"nonExistent\" not found');
    });
  });

  describe('removeServer', () => {
    it('should remove a server and update clusters', () => {
      serversModel.removeServer('server1');
      expect(serversModel.getServer('server1')).toBeNull();
      expect(serversModel.getCluster('cluster1').servers).not.toContain('server1');
      expect(mockBaseModelInstance.emit).toHaveBeenCalledWith('serverRemoved', expect.any(Object));
    });

    it('should throw an error if server not found', () => {
      expect(() => serversModel.removeServer('nonExistent')).toThrow('Server with ID \"nonExistent\" not found');
    });
  });

  describe('setServerStatus', () => {
    it('should set the status of a server', () => {
      const updatedServer = serversModel.setServerStatus('server1', 'maintenance');
      expect(updatedServer.status).toBe('maintenance');
      expect(mockBaseModelInstance.emit).toHaveBeenCalledWith(
        'serverStatusChanged',
        expect.objectContaining({ serverId: 'server1', newStatus: 'maintenance' })
      );
    });

    it('should throw an error for an invalid status', () => {
      expect(() => serversModel.setServerStatus('server1', 'invalidStatus')).toThrow(/Invalid status/);
    });

    it('should throw an error if server not found', () => {
      expect(() => serversModel.setServerStatus('nonExistent', 'online')).toThrow('Server with ID \"nonExistent\" not found');
    });
  });

  describe('getServersByStatus', () => {
    it('should return servers matching a specific status', () => {
      const onlineServers = serversModel.getServersByStatus('online');
      expect(onlineServers.length).toBe(1);
      expect(onlineServers[0].id).toBe('server1');
    });

    it('should return an empty array if no servers match status', () => {
      const errorServers = serversModel.getServersByStatus('error');
      expect(errorServers.length).toBe(0);
    });
  });

  describe('getOnlineServers', () => {
    it('should return only online servers', () => {
      const onlineServers = serversModel.getOnlineServers();
      expect(onlineServers.length).toBe(1);
      expect(onlineServers[0].id).toBe('server1');
    });
  });

  describe('getServersByEnvironment', () => {
    it('should return servers matching a specific environment', () => {
      const devServers = serversModel.getServersByEnvironment('development');
      expect(devServers.length).toBe(1);
      expect(devServers[0].id).toBe('server1');
    });
  });

  describe('getServersByRegion', () => {
    it('should return servers matching a specific region', () => {
      const usEastServers = serversModel.getServersByRegion('us-east-1');
      expect(usEastServers.length).toBe(1);
      expect(usEastServers[0].id).toBe('server2');
    });
  });

  describe('addCluster', () => {
    it('should add a new cluster', () => {
      const newClusterData = { id: 'cluster2', name: 'TestCluster2', servers: ['server2'] };
      serversModel.addCluster(newClusterData);
      const clusters = serversModel.getClusters();
      expect(clusters.cluster2).toEqual(newClusterData);
      expect(mockBaseModelInstance.set).toHaveBeenCalledWith(
        'clusters.cluster2',
        expect.objectContaining({ id: 'cluster2' })
      );
      expect(mockBaseModelInstance.emit).toHaveBeenCalledWith('clusterAdded', { clusterId: 'cluster2', cluster: newClusterData });
    });

    it('should throw an error if cluster ID is missing', () => {
      const invalidClusterData = { name: 'Invalid' };
      expect(() => serversModel.addCluster(invalidClusterData)).toThrow('Cluster must have id');
    });

    it('should throw an error if cluster with ID already exists', () => {
      const duplicateClusterData = { id: 'cluster1', name: 'Duplicate' };
      expect(() => serversModel.addCluster(duplicateClusterData)).toThrow('Cluster with ID \"cluster1\" already exists');
    });
  });

  describe('updateCluster', () => {
    it('should update an existing cluster', () => {
      const updates = { name: 'UpdatedCluster', loadBalancer: { enabled: true } };
      const updatedCluster = serversModel.updateCluster('cluster1', updates);
      expect(updatedCluster.name).toBe('UpdatedCluster');
      expect(mockBaseModelInstance.set).toHaveBeenCalledWith(
        'clusters.cluster1',
        expect.objectContaining(updates)
      );
      expect(mockBaseModelInstance.emit).toHaveBeenCalledWith(
        'clusterUpdated',
        expect.objectContaining({ clusterId: 'cluster1', updates })
      );
    });

    it('should throw an error if cluster not found', () => {
      expect(() => serversModel.updateCluster('nonExistent', {})).toThrow('Cluster with ID \"nonExistent\" not found');
    });
  });

  describe('removeCluster', () => {
    it('should remove a cluster', () => {
      serversModel.removeCluster('cluster1');
      expect(serversModel.getCluster('cluster1')).toBeNull();
      expect(mockBaseModelInstance.emit).toHaveBeenCalledWith('clusterRemoved', expect.any(Object));
    });

    it('should throw an error if cluster not found', () => {
      expect(() => serversModel.removeCluster('nonExistent')).toThrow('Cluster with ID \"nonExistent\" not found');
    });
  });

  describe('addServerToCluster', () => {
    it('should add a server to an existing cluster', () => {
      serversModel.addServerToCluster('server2', 'cluster1');
      const cluster = serversModel.getCluster('cluster1');
      expect(cluster.servers).toContain('server2');
      expect(mockBaseModelInstance.emit).toHaveBeenCalledWith('serverAddedToCluster', { serverId: 'server2', clusterId: 'cluster1' });
    });

    it('should throw an error if server not found', () => {
      expect(() => serversModel.addServerToCluster('nonExistentServer', 'cluster1')).toThrow('Server with ID \"nonExistentServer\" not found');
    });

    it('should throw an error if cluster not found', () => {
      expect(() => serversModel.addServerToCluster('server1', 'nonExistentCluster')).toThrow('Cluster with ID \"nonExistentCluster\" not found');
    });

    it('should throw an error if server is already in cluster', () => {
      expect(() => serversModel.addServerToCluster('server1', 'cluster1')).toThrow('Server \"server1\" is already in cluster \"cluster1\"');
    });
  });

  describe('removeServerFromCluster', () => {
    it('should remove a server from a cluster', () => {
      serversModel.removeServerFromCluster('server1', 'cluster1');
      const cluster = serversModel.getCluster('cluster1');
      expect(cluster.servers).not.toContain('server1');
      expect(mockBaseModelInstance.emit).toHaveBeenCalledWith('serverRemovedFromCluster', { serverId: 'server1', clusterId: 'cluster1' });
    });

    it('should throw an error if cluster not found', () => {
      expect(() => serversModel.removeServerFromCluster('server1', 'nonExistentCluster')).toThrow('Cluster with ID \"nonExistentCluster\" not found');
    });

    it('should throw an error if server not in cluster', () => {
      serversModel.addServer(
        { id: 'serverNotInCluster', name: 'NotInCluster', host: '1.1.1.1', port: 1000, protocol: 'http' }
      );
      expect(() => serversModel.removeServerFromCluster('serverNotInCluster', 'cluster1')).toThrow('Server \"serverNotInCluster\" is not in cluster \"cluster1\"');
    });
  });

  describe('getServersStats', () => {
    it('should return correct server statistics', () => {
      // Add more servers for better stats coverage
      serversModel.addServer({ id: 'server3', name: 'S3', host: 'h3', port: 3, protocol: 'http', status: 'online', environment: 'production', region: 'us-east-1' });
      serversModel.addServer({ id: 'server4', name: 'S4', host: 'h4', port: 4, protocol: 'http', status: 'maintenance', environment: 'development', region: 'local' });

      const stats = serversModel.getServersStats();
      expect(stats.total).toBe(4);
      expect(stats.online).toBe(2); // server1, server3
      expect(stats.offline).toBe(1); // server2
      expect(stats.maintenance).toBe(1); // server4
      expect(stats.byEnvironment.development).toBe(2);
      expect(stats.byEnvironment.production).toBe(1);
      expect(stats.byEnvironment.local).toBe(1); // Default from addServer
      expect(stats.byRegion.local).toBe(2);
      expect(stats.byRegion['us-east-1']).toBe(1);
    });

    it('should handle empty servers list', () => {
      serversModel = new ServersModel({}); // Reset with empty config
      const stats = serversModel.getServersStats();
      expect(stats.total).toBe(0);
      expect(stats.online).toBe(0);
    });
  });

  describe('getClustersStats', () => {
    it('should return correct cluster statistics', () => {
      // Add more clusters and servers
      serversModel.addServer({ id: 'server5', name: 'S5', host: 'h5', port: 5, protocol: 'http' });
      serversModel.addCluster({ id: 'cluster2', name: 'C2', servers: ['server1', 'server5'] });

      const stats = serversModel.getClustersStats();
      expect(stats.total).toBe(2);
      expect(stats.totalServers).toBe(3); // server1 in cluster1, server1 and server5 in cluster2
      expect(stats.averageServersPerCluster).toBeCloseTo(1.5);
    });

    it('should handle empty clusters list', () => {
      serversModel.set('clusters', {}); // Clear clusters
      const stats = serversModel.getClustersStats();
      expect(stats.total).toBe(0);
      expect(stats.totalServers).toBe(0);
      expect(stats.averageServersPerCluster).toBe(0);
    });
  });

  describe('checkServerStatus', () => {
    it('should return online status for an online server', async () => {
      mockFetch.mockResolvedValueOnce({ ok: true, status: 200, statusText: 'OK' });
      serversModel.set('servers.server1.statusCheck', { endpoint: '/ping', timeout: 100 });
      const status = await serversModel.checkServerStatus('server1');
      expect(status.isOnline).toBe(true);
      expect(status.status).toBe('online');
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3000/ping', expect.any(Object));
      expect(mockBaseModelInstance.set).toHaveBeenCalledWith('servers.server1.status', 'online');
    });

    it('should return offline status for a failed server', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network Error'));
      const status = await serversModel.checkServerStatus('server1');
      expect(status.isOnline).toBe(false);
      expect(status.status).toBe('offline');
      expect(mockBaseModelInstance.set).toHaveBeenCalledWith('servers.server1.status', 'offline');
    });

    it('should throw an error if server not found', async () => {
      await expect(serversModel.checkServerStatus('nonExistent')).rejects.toThrow('Server with ID \"nonExistent\" not found');
    });

    it('should handle status check timeout', async () => {
      mockFetch.mockImplementationOnce(() => new Promise(resolve => setTimeout(() => resolve({ ok: true }), 200)));
      serversModel.set('servers.server1.statusCheck', { endpoint: '/slow', timeout: 50 });

      const status = await serversModel.checkServerStatus('server1');
      expect(status.isOnline).toBe(false);
      expect(status.status).toBe('offline');
      expect(status.error).toContain('abort');
      expect(mockBaseModelInstance.set).toHaveBeenCalledWith('servers.server1.status', 'offline');
    });
  });
});
