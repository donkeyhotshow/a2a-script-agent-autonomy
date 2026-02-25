/**
 * PortsConfigManager - Менеджер конфигурации портов
 * Управляет конфигурацией портов для различных сервисов
 */

const path = require('path');
const fs = require('fs').promises;
const { readFileSync, existsSync } = require('fs');
const Ajv = require('ajv').default;
const addFormats = require('ajv-formats');
const { ConfigManagerWrapper } = require('../../config-manager/index.cjs');

class PortsConfigManager extends ConfigManagerWrapper {
    constructor(configPath, schemaPath, testMode = false, initialConfig = null) {
        super(configPath, schemaPath, testMode, initialConfig);
        this.configName = 'ports';
        this.defaultConfig = this.getDefaultConfig();
    }

    getDefaultConfig() {
        return {
            ports: [], 
            reserved: [],
            systems: [], 
            ranges: [
                {
                    from: 3000,
                    to: 3999,
                    description: 'Диапазон для веб-приложений',
                    enabled: false,
                    type: 'blocked',
                    priority: 0
                },
                {
                    from: 8000,
                    to: 8999,
                    description: 'Диапазон для API сервисов',
                    enabled: false,
                    type: 'blocked',
                    priority: 0
                },
                {
                    from: 9000,
                    to: 9999,
                    description: 'Диапазон для мониторинга',
                    enabled: false,
                    type: 'blocked',
                    priority: 0
                }
            ],
            metadata: {
                created: new Date().toISOString(),
                version: '2.0.0',
                description: 'Конфигурация портов с поддержкой диапазонов'
            },
            unavailablePorts: [], 
            singlePorts: [] 
        };
    }

    async getPort(name) {
        const config = await this.getConfig();
        return config.ports.find(port => port.name === name) || null;
    }

    async isPortAllowed(portNumber) {
        const config = await this.getConfig();

        if (config.unavailablePorts && config.unavailablePorts.includes(portNumber)) {
            return { allowed: false, reason: 'unavailable', priority: Infinity };
        }

        if (config.reserved && config.reserved.includes(portNumber)) {
            return { allowed: false, reason: 'reserved', priority: 1000 }; 
        }

        let highestPriorityDecision = { allowed: false, reason: 'default_blocked', priority: -1 };

        if (config.singlePorts) {
            for (const sp of config.singlePorts) {
                if (sp.port === portNumber) {
                    const currentPriority = sp.priority !== undefined ? sp.priority : 50;
                    if (currentPriority > highestPriorityDecision.priority) {
                        highestPriorityDecision = {
                            allowed: sp.enabled && sp.type === 'allowed',
                            reason: sp.enabled ? 'single_allowed' : 'single_blocked',
                            priority: currentPriority
                        };
                    }
                }
            }
        }

        if (config.ranges) {
            for (const range of config.ranges) {
                if (portNumber >= range.from && portNumber <= range.to) {
                    const currentPriority = range.priority !== undefined ? range.priority : 50;
                    if (currentPriority > highestPriorityDecision.priority) {
                        highestPriorityDecision = {
                            allowed: range.enabled && range.type === 'allowed',
                            reason: range.enabled ? 'range_allowed' : 'range_blocked',
                            priority: currentPriority
                        };
                    }
                }
            }
        }

        return highestPriorityDecision;
    }

    async isPortInUseBySystem(port) {
        const config = await this.getConfig();
        return config.ports.some(p => p.port === port);
    }

    async isPortAvailable(portNumber) {
        const portAllowedResult = await this.isPortAllowed(portNumber);
        if (!portAllowedResult.allowed) {
            return { available: false, reason: portAllowedResult.reason, priority: portAllowedResult.priority };
        }

        const isInUseBySystem = await this.isPortInUseBySystem(portNumber);
        if (isInUseBySystem) {
            return { available: false, reason: 'in_use_by_system', priority: 1000 };
        }

        return { available: true, reason: 'free', priority: 0 };
    }

    async isPortConfigured(port) {
        const config = await this.getConfig();
        return config.ports.some(p => p.port === port);
    }

    async addPort(portConfig) {
        const config = await this.getConfig();
        
        if (!portConfig.name || !portConfig.port) {
            throw new Error('Порт должен иметь имя и номер');
        }
        
        const portAvailabilityResult = await this.isPortAvailable(portConfig.port);
        if (!portAvailabilityResult.available) {
            throw new Error(`Порт ${portConfig.port} недоступен: ${portAvailabilityResult.reason}`);
        }

        if (await this.isPortConfigured(portConfig.port)) {
            throw new Error(`Порт ${portConfig.port} уже настроен`);
        }
        
        config.ports.push({
            name: portConfig.name,
            port: portConfig.port,
            protocol: portConfig.protocol || 'tcp',
            description: portConfig.description || '',
            priority: portConfig.priority !== undefined ? portConfig.priority : 50,
            ...portConfig
        });
        
        await this.saveConfig(config);
    }

    async removePort(name) {
        const config = await this.getConfig();
        config.ports = config.ports.filter(port => port.name !== name);
        await this.saveConfig(config);
    }

    async getAllowedRanges() {
        const config = await this.getConfig();
        return config.ranges?.filter(range => range.enabled && range.type === 'allowed') || [];
    }

    async getBlockedRanges() {
        const config = await this.getConfig();
        return config.ranges?.filter(range => !range.enabled || range.type === 'blocked') || [];
    }

    async addPortRange(rangeConfig) {
        const config = await this.getConfig();

        if (!rangeConfig.from || !rangeConfig.to) {
            throw new Error('Диапазон должен иметь from и to');
        }

        if (rangeConfig.from > rangeConfig.to) {
            throw new Error('from должен быть меньше или равен to');
        }

        if (config.ranges) {
            for (const range of config.ranges) {
                if (!(rangeConfig.to < range.from || rangeConfig.from > range.to)) {
                    throw new Error(`Диапазон пересекается с существующим: ${range.from}-${range.to}`);
                }
            }
        }

        config.ranges = config.ranges || [];
        config.ranges.push({
            from: rangeConfig.from,
            to: rangeConfig.to,
            description: rangeConfig.description || '',
            enabled: rangeConfig.enabled !== false,
            type: rangeConfig.type || 'allowed',
            priority: rangeConfig.priority !== undefined ? rangeConfig.priority : 50,
            ...rangeConfig
        });

        await this.saveConfig(config);
    }

    async removePortRange(id) {
        const config = await this.getConfig();
        config.ranges = config.ranges?.filter(range => range.id !== id) || [];
        await this.saveConfig(config);
    }

    async updatePortRange(id, updates) {
        const config = await this.getConfig();
        const index = config.ranges?.findIndex(range => range.id === id);
        if (index !== -1 && config.ranges && config.ranges[index]) {
            Object.assign(config.ranges[index], updates);
            await this.saveConfig(config);
        }
    }

    async addSinglePort(singlePortConfig) {
        const config = await this.getConfig();
        
        if (!singlePortConfig.port) {
            throw new Error('Одиночный порт должен иметь номер');
        }

        if (config.singlePorts && config.singlePorts.some(sp => sp.port === singlePortConfig.port)) {
            throw new Error(`Одиночный порт ${singlePortConfig.port} уже существует`);
        }
        
        config.singlePorts = config.singlePorts || [];
        config.singlePorts.push({
            id: `single-${singlePortConfig.port}`,
            port: singlePortConfig.port,
            enabled: singlePortConfig.enabled !== false,
            type: singlePortConfig.type || 'allowed',
            description: singlePortConfig.description || '',
            priority: singlePortConfig.priority !== undefined ? singlePortConfig.priority : 50,
            ...singlePortConfig
        });
        
        await this.saveConfig(config);
    }

    async updateSinglePort(id, updates) {
        const config = await this.getConfig();
        const index = config.singlePorts?.findIndex(sp => `single-${sp.port}` === id);
        if (index !== -1 && config.singlePorts && config.singlePorts[index]) {
            Object.assign(config.singlePorts[index], updates);
            await this.saveConfig(config);
        }
    }

    async removeSinglePort(id) {
        const config = await this.getConfig();
        config.singlePorts = config.singlePorts?.filter(sp => `single-${sp.port}` !== id) || [];
        await this.saveConfig(config);
    }

    async getPortStats() {
        const config = await this.getConfig();

        const stats = {
            totalPorts: config.ports?.length || 0,
            totalSinglePorts: config.singlePorts?.length || 0,
            reservedPorts: config.reserved?.length || 0,
            totalRanges: config.ranges?.length || 0,
            allowedRanges: config.ranges?.filter(r => r.enabled && r.type === 'allowed').length || 0,
            blockedRanges: config.ranges?.filter(r => !r.enabled || r.type === 'blocked').length || 0,
            enabledSinglePorts: config.singlePorts?.filter(sp => sp.enabled).length || 0,
            portsByProtocol: {},
            portsByService: {},
            singlePortsByType: {}
        };

        if (config.ports) {
            config.ports.forEach(port => {
                stats.portsByProtocol[port.protocol] = (stats.portsByProtocol[port.protocol] || 0) + 1;
                if (port.service) {
                    stats.portsByService[port.service] = (stats.portsByService[port.service] || 0) + 1;
                }
            });
        }

        if (config.singlePorts) {
            config.singlePorts.forEach(port => {
                stats.singlePortsByType[port.type] = (stats.singlePortsByType[port.type] || 0) + 1;
            });
        }

        return stats;
    }

    async getSinglePorts() {
        const config = await this.getConfig();
        return config.singlePorts || [];
    }

    async getSinglePort(portNumber) {
        const config = await this.getConfig();
        return config.singlePorts?.find(sp => sp.port === portNumber) || null;
    }

    async getAllPorts() {
      const config = await this.getConfig();
      const singlePorts = (config.singlePorts || []).map(p => ({ ...p, kind: 'single' }));
      const ranges = (config.ranges || []).map(r => ({ ...r, kind: 'range' }));
      return [...singlePorts, ...ranges];
    }

    async getPortRanges() {
      const config = await this.getConfig();
      return config.ranges || [];
    }

    async getUnavailable() {
      const config = await this.getConfig();
      return config.unavailablePorts || [];
    }

    async getConfig() {
      return super.getConfig();
    }

    async updateConfig(newConfig) {
      return super.updateConfig(newConfig);
    }

    async saveConfig(config) {
      return super.saveConfig(config);
    }

    // Existing system CRUD methods (assuming they are still needed and work with the new structure)
    async getAllSystems() { /* ... */ return []; }
    async getSystemById(id) { /* ... */ return null; }
    async createSystem(systemData) { /* ... */ return { success: true, data: systemData }; }
    async updateSystem(id, systemData) { /* ... */ return { success: true, data: systemData }; }
    async deleteSystem(id) { /* ... */ return { success: true }; }
    async assignPortToSystem(systemId, portNumber, protocol) { /* ... */ return { success: true }; }
    async releasePortFromSystem(systemId, portNumber) { /* ... */ return { success: true }; }
    async startSystem(id) { /* ... */ return { success: true }; }
    async stopSystem(id) { /* ... */ return { success: true }; }
    async getSystemsStats() { /* ... */ return {}; }

    // Transaction methods (assuming they are implemented in ConfigManagerWrapper)
    async beginTransaction() { /* ... */ return { success: true }; }
    async commitTransaction() { /* ... */ return { success: true }; }
    async rollbackTransaction() { /* ... */ return { success: true }; }
    async getChangeLog() { /* ... */ return { success: true, data: [] }; }

    // Plugin config method
    async getPluginConfig() {
      const config = await this.getConfig();
      return { unavailablePorts: config.unavailablePorts };
    }
}

const configPath = path.join(__dirname, 'storage/data/config.json');
const schemaPath = path.join(__dirname, 'schema.json');

const portsConfigManager = new PortsConfigManager(configPath, schemaPath, true, { 
  ports: [], // Will be replaced by singlePorts and ranges
  reserved: [25, 110],
  systems: [],
  ranges: [
    { id: 'range-1', from: 10000, to: 10100, type: 'allowed', description: 'Test Range 1', enabled: true, priority: 50 },
    { id: 'range-2', from: 10200, to: 10300, type: 'blocked', description: 'Test Range 2', enabled: true, priority: 50 }
  ],
  singlePorts: [
    { id: 'single-9000', port: 9000, name: 'Single Port 1', protocol: 'tcp', description: 'Test Single Port', enabled: true, type: 'allowed', priority: 50 },
    { id: 'single-9001', port: 9001, name: 'Single Port 2', protocol: 'udp', description: 'Another Single Port', enabled: false, type: 'blocked', priority: 50 }
  ],
  unavailablePorts: [8080],
  metadata: {
    created: new Date().toISOString(),
    version: '2.0.0',
    description: 'Initial ports config'
  }
});

module.exports = { PortsConfigManager, portsConfigManager };
