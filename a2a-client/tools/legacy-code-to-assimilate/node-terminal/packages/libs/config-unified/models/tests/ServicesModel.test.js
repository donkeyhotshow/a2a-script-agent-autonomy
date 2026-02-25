import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ServicesModel } from '../ServicesModel.mjs';
import { BaseModel } from '../../core/BaseModel.mjs';

// Mock BaseModel to isolate ServicesModel's specific logic
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

describe('ServicesModel', () => {
  let servicesModel;
  let mockBaseModelInstance;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // The mock BaseModel instance that BaseModel.mockImplementation will return
    mockBaseModelInstance = new BaseModel(); // This will be the mocked instance

    // Initial setup for the mocked BaseModel's config and schema
    mockBaseModelInstance.config = {
      version: '1.0.0',
      services: {
        'service1': { appId: 'service1', name: 'TestService1', enabled: true, group: 'core', status: 'running', type: 'backend', load: 50, region: 'local' },
        'service2': { appId: 'service2', name: 'TestService2', enabled: false, group: 'core', status: 'stopped', type: 'frontend', load: 10, region: 'us-east-1' },
      },
      groups: {
        'core': { id: 'core', name: 'Core Services', type: 'system', services: ['service1', 'service2'], autoStart: true, enabled: true },
        'frontend': { id: 'frontend', name: 'Frontend Services', type: 'user', services: [], autoStart: false, enabled: false },
      },
    };

    servicesModel = new ServicesModel(mockBaseModelInstance.config); // Pass initial config to the constructor
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should extend BaseModel', () => {
    expect(servicesModel).toBeInstanceOf(BaseModel);
  });

  describe('getServices', () => {
    it('should return all services', () => {
      const services = servicesModel.getServices();
      expect(services).toEqual(mockBaseModelInstance.config.services);
    });
  });

  describe('getService', () => {
    it('should return a service by ID', () => {
      const service = servicesModel.getService('service1');
      expect(service).toEqual(mockBaseModelInstance.config.services.service1);
    });

    it('should return null for a non-existent service', () => {
      const service = servicesModel.getService('nonExistent');
      expect(service).toBeNull();
    });
  });

  describe('getServicesByGroup', () => {
    it('should return services belonging to a specific group', () => {
      const coreServices = servicesModel.getServicesByGroup('core');
      expect(coreServices.length).toBe(2);
      expect(coreServices[0].appId).toBe('service1');
      expect(coreServices[1].appId).toBe('service2');
    });

    it('should return an empty array if group not found', () => {
      const nonExistentGroupServices = servicesModel.getServicesByGroup('nonExistent');
      expect(nonExistentGroupServices).toEqual([]);
    });

    it('should return an empty array if group has no services', () => {
      const frontendServices = servicesModel.getServicesByGroup('frontend');
      expect(frontendServices).toEqual([]);
    });
  });

  describe('getGroups', () => {
    it('should return all groups', () => {
      const groups = servicesModel.getGroups();
      expect(groups).toEqual(mockBaseModelInstance.config.groups);
    });
  });

  describe('getGroup', () => {
    it('should return a group by ID', () => {
      const group = servicesModel.getGroup('core');
      expect(group).toEqual(mockBaseModelInstance.config.groups.core);
    });

    it('should return null for a non-existent group', () => {
      const group = servicesModel.getGroup('nonExistent');
      expect(group).toBeNull();
    });
  });

  describe('addService', () => {
    it('should add a new service with default values', () => {
      const newServiceData = { appId: 'service3', name: 'TestService3', enabled: true };
      servicesModel.addService(newServiceData);
      const services = servicesModel.getServices();
      expect(services.service3).toBeDefined();
      expect(services.service3.status).toBe('stopped'); // Default status
      expect(services.service3.load).toBe(0); // Default load
      expect(mockBaseModelInstance.set).toHaveBeenCalledWith(
        'services.service3',
        expect.objectContaining({ appId: 'service3', status: 'stopped', load: 0 })
      );
      expect(mockBaseModelInstance.emit).toHaveBeenCalledWith('serviceAdded', { serviceId: 'service3', service: newServiceData });
    });

    it('should add a new service with provided values', () => {
      const newServiceData = { appId: 'service4', name: 'TestService4', enabled: false, group: 'newGroup', status: 'running', load: 75, region: 'eu-west-1' };
      servicesModel.addService(newServiceData);
      const services = servicesModel.getServices();
      expect(services.service4).toEqual(newServiceData);
    });

    it('should throw an error if service ID is missing', () => {
      const invalidServiceData = { name: 'Invalid', enabled: true };
      expect(() => servicesModel.addService(invalidServiceData)).toThrow('Service must have appId or id');
    });

    it('should throw an error if service with ID already exists', () => {
      const duplicateServiceData = { appId: 'service1', name: 'Duplicate', enabled: true };
      expect(() => servicesModel.addService(duplicateServiceData)).toThrow('Service with ID \"service1\" already exists');
    });
  });

  describe('updateService', () => {
    it('should update an existing service', () => {
      const updates = { status: 'running', load: 80 };
      const updatedService = servicesModel.updateService('service1', updates);
      expect(updatedService.status).toBe('running');
      expect(updatedService.load).toBe(80);
      expect(mockBaseModelInstance.set).toHaveBeenCalledWith(
        'services.service1',
        expect.objectContaining(updates)
      );
      expect(mockBaseModelInstance.emit).toHaveBeenCalledWith(
        'serviceUpdated',
        expect.objectContaining({ serviceId: 'service1', updates })
      );
    });

    it('should throw an error if service not found', () => {
      expect(() => servicesModel.updateService('nonExistent', {})).toThrow('Service with ID \"nonExistent\" not found');
    });
  });

  describe('removeService', () => {
    it('should remove a service and update groups', () => {
      servicesModel.removeService('service1');
      expect(servicesModel.getService('service1')).toBeNull();
      expect(servicesModel.getGroup('core').services).not.toContain('service1');
      expect(mockBaseModelInstance.emit).toHaveBeenCalledWith('serviceRemoved', expect.any(Object));
    });

    it('should throw an error if service not found', () => {
      expect(() => servicesModel.removeService('nonExistent')).toThrow('Service with ID \"nonExistent\" not found');
    });
  });

  describe('setServiceStatus', () => {
    it('should set the status of a service', () => {
      const updatedService = servicesModel.setServiceStatus('service1', 'stopped');
      expect(updatedService.status).toBe('stopped');
      expect(mockBaseModelInstance.emit).toHaveBeenCalledWith(
        'serviceStatusChanged',
        expect.objectContaining({ serviceId: 'service1', newStatus: 'stopped' })
      );
    });

    it('should throw an error for an invalid status', () => {
      expect(() => servicesModel.setServiceStatus('service1', 'invalidStatus')).toThrow(/Invalid status/);
    });

    it('should throw an error if service not found', () => {
      expect(() => servicesModel.setServiceStatus('nonExistent', 'running')).toThrow('Service with ID \"nonExistent\" not found');
    });
  });

  describe('startService', () => {
    it('should set service status to running', () => {
      servicesModel.startService('service2');
      const service = servicesModel.getService('service2');
      expect(service.status).toBe('running');
    });
  });

  describe('stopService', () => {
    it('should set service status to stopped', () => {
      servicesModel.stopService('service1');
      const service = servicesModel.getService('service1');
      expect(service.status).toBe('stopped');
    });
  });

  describe('getServicesByStatus', () => {
    it('should return services matching a specific status', () => {
      const runningServices = servicesModel.getServicesByStatus('running');
      expect(runningServices.length).toBe(1);
      expect(runningServices[0].appId).toBe('service1');
    });

    it('should return an empty array if no services match status', () => {
      const errorServices = servicesModel.getServicesByStatus('error');
      expect(errorServices.length).toBe(0);
    });
  });

  describe('getActiveServices', () => {
    it('should return only active (running) services', () => {
      const activeServices = servicesModel.getActiveServices();
      expect(activeServices.length).toBe(1);
      expect(activeServices[0].appId).toBe('service1');
    });
  });

  describe('getErrorServices', () => {
    it('should return only services with error status', () => {
      servicesModel.setServiceStatus('service1', 'error');
      const errorServices = servicesModel.getErrorServices();
      expect(errorServices.length).toBe(1);
      expect(errorServices[0].appId).toBe('service1');
    });
  });

  describe('addGroup', () => {
    it('should add a new group with default values', () => {
      const newGroupData = { id: 'newGroup', name: 'New Group', type: 'user' };
      servicesModel.addGroup(newGroupData);
      const groups = servicesModel.getGroups();
      expect(groups.newGroup).toBeDefined();
      expect(groups.newGroup.autoStart).toBe(true); // Default autoStart
      expect(groups.newGroup.enabled).toBe(true); // Default enabled
      expect(mockBaseModelInstance.set).toHaveBeenCalledWith(
        'groups.newGroup',
        expect.objectContaining({ id: 'newGroup', autoStart: true, enabled: true })
      );
      expect(mockBaseModelInstance.emit).toHaveBeenCalledWith('groupAdded', { groupId: 'newGroup', group: newGroupData });
    });

    it('should add a new group with provided values', () => {
      const newGroupData = { id: 'anotherGroup', name: 'Another Group', type: 'system', autoStart: false, enabled: false, services: ['service1'] };
      servicesModel.addGroup(newGroupData);
      const groups = servicesModel.getGroups();
      expect(groups.anotherGroup).toEqual(newGroupData);
    });

    it('should throw an error if group ID is missing', () => {
      const invalidGroupData = { name: 'Invalid', type: 'user' };
      expect(() => servicesModel.addGroup(invalidGroupData)).toThrow('Group must have id');
    });

    it('should throw an error if group with ID already exists', () => {
      const duplicateGroupData = { id: 'core', name: 'Duplicate', type: 'user' };
      expect(() => servicesModel.addGroup(duplicateGroupData)).toThrow('Group with ID \"core\" already exists');
    });
  });

  describe('updateGroup', () => {
    it('should update an existing group', () => {
      const updates = { name: 'Updated Core Services', autoStart: false };
      const updatedGroup = servicesModel.updateGroup('core', updates);
      expect(updatedGroup.name).toBe('Updated Core Services');
      expect(updatedGroup.autoStart).toBe(false);
      expect(mockBaseModelInstance.set).toHaveBeenCalledWith(
        'groups.core',
        expect.objectContaining(updates)
      );
      expect(mockBaseModelInstance.emit).toHaveBeenCalledWith(
        'groupUpdated',
        expect.objectContaining({ groupId: 'core', updates })
      );
    });

    it('should throw an error if group not found', () => {
      expect(() => servicesModel.updateGroup('nonExistent', {})).toThrow('Group with ID \"nonExistent\" not found');
    });
  });

  describe('removeGroup', () => {
    it('should remove a group', () => {
      servicesModel.removeGroup('core');
      expect(servicesModel.getGroup('core')).toBeNull();
      expect(mockBaseModelInstance.emit).toHaveBeenCalledWith('groupRemoved', expect.any(Object));
    });

    it('should throw an error if group not found', () => {
      expect(() => servicesModel.removeGroup('nonExistent')).toThrow('Group with ID \"nonExistent\" not found');
    });
  });

  describe('addServiceToGroup', () => {
    it('should add a service to an existing group', () => {
      servicesModel.addService(
        { appId: 'service5', name: 'S5', enabled: true, status: 'stopped', type: 'backend' }
      );
      servicesModel.addServiceToGroup('service5', 'frontend');
      const group = servicesModel.getGroup('frontend');
      expect(group.services).toContain('service5');
      expect(mockBaseModelInstance.emit).toHaveBeenCalledWith('serviceAddedToGroup', { serviceId: 'service5', groupId: 'frontend' });
    });

    it('should throw an error if service not found', () => {
      expect(() => servicesModel.addServiceToGroup('nonExistentService', 'core')).toThrow('Service with ID \"nonExistentService\" not found');
    });

    it('should throw an error if group not found', () => {
      expect(() => servicesModel.addServiceToGroup('service1', 'nonExistentGroup')).toThrow('Group with ID \"nonExistentGroup\" not found');
    });

    it('should throw an error if service is already in group', () => {
      expect(() => servicesModel.addServiceToGroup('service1', 'core')).toThrow('Service \"service1\" is already in group \"core\"');
    });
  });

  describe('removeServiceFromGroup', () => {
    it('should remove a service from a group', () => {
      servicesModel.removeServiceFromGroup('service1', 'core');
      const group = servicesModel.getGroup('core');
      expect(group.services).not.toContain('service1');
      expect(mockBaseModelInstance.emit).toHaveBeenCalledWith('serviceRemovedFromGroup', { serviceId: 'service1', groupId: 'core' });
    });

    it('should throw an error if group not found', () => {
      expect(() => servicesModel.removeServiceFromGroup('service1', 'nonExistentGroup')).toThrow('Group with ID \"nonExistentGroup\" not found');
    });

    it('should throw an error if service not in group', () => {
      expect(() => servicesModel.removeServiceFromGroup('service3', 'core')).toThrow('Service \"service3\" is not in group \"core\"');
    });
  });

  describe('getServicesStats', () => {
    it('should return correct service statistics', () => {
      servicesModel.addService({ appId: 'service3', name: 'S3', enabled: true, status: 'running' });
      servicesModel.setServiceStatus('service2', 'error');
      const stats = servicesModel.getServicesStats();
      expect(stats.total).toBe(3);
      expect(stats.running).toBe(2);
      expect(stats.stopped).toBe(0);
      expect(stats.error).toBe(1);
    });

    it('should handle empty services list', () => {
      servicesModel = new ServicesModel({});
      const stats = servicesModel.getServicesStats();
      expect(stats.total).toBe(0);
      expect(stats.running).toBe(0);
    });
  });

  describe('getGroupsStats', () => {
    it('should return correct group statistics', () => {
      servicesModel.addGroup({ id: 'group3', name: 'G3', type: 'user', autoStart: true, enabled: true });
      servicesModel.updateGroup('frontend', { enabled: true });

      const stats = servicesModel.getGroupsStats();
      expect(stats.total).toBe(3);
      expect(stats.enabled).toBe(2); // core, frontend, group3
      expect(stats.autoStart).toBe(2); // core, group3
    });

    it('should handle empty groups list', () => {
      servicesModel.set('groups', {});
      const stats = servicesModel.getGroupsStats();
      expect(stats.total).toBe(0);
      expect(stats.enabled).toBe(0);
      expect(stats.autoStart).toBe(0);
    });
  });
});
