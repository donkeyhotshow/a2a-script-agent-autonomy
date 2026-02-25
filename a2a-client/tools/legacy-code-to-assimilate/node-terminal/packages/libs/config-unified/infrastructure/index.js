/**
 * InfrastructureConfigManager - Менеджер конфигурации инфраструктуры
 * Управляет конфигурацией мастер-серверов, слейвов и инфраструктурных компонентов
 */

const fs = require('fs').promises;
const path = require('path');





class InfrastructureConfigManager {
    constructor() {
        this.configPath = path.join(__dirname, 'config.json');
        this.cache = null;
        this.lastModified = null;
        this.watchers = new Set();
    }

    async getConfig(forceReload = false) {
        try {
            if (!forceReload && this.cache) {
                const stats = await fs.stat(this.configPath);
                if (stats.mtime.getTime() === this.lastModified) {
                    return this.cache;
                }
            }

            const config = await this.loadConfig();
            this.cache = config;
            this.lastModified = (await fs.stat(this.configPath)).mtime.getTime();
            
            return config;
        } catch (error) {
            console.error('Ошибка получения конфигурации инфраструктуры:', error);
            return this.getDefaultConfig();
        }
    }

    async loadConfig() {
        try {
            const content = await fs.readFile(this.configPath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            console.warn('Не удалось загрузить конфигурацию инфраструктуры, используется по умолчанию');
            return this.getDefaultConfig();
        }
    }

    async saveConfig(config) {
        try {
            await fs.writeFile(this.configPath, JSON.stringify(config, null, 2), 'utf-8');
            this.cache = config;
            this.lastModified = (await fs.stat(this.configPath)).mtime.getTime();
            this.notifyWatchers(config);
        } catch (error) {
            console.error('Ошибка сохранения конфигурации инфраструктуры:', error);
            throw error;
        }
    }

    getDefaultConfig() {
        return {
            version: "2.0.0",
            lastUpdated: new Date().toISOString(),
            infrastructure: {
                master: {
                    host: "localhost",
                    port: 5179,
                    apiKey: "default-api-key",
                    environment: "development",
                    status: "active",
                    lastSeen: new Date().toISOString(),
                    capabilities: ["service_management", "monitoring"],
                    config: {
                        maxSlaves: 5,
                        autoDiscovery: false,
                        loadBalancing: false,
                        backupEnabled: false
                    }
                },
                slaves: []
            },
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Конфигурация инфраструктуры'
            }
        };
    }

    async getMasterConfig() {
        const config = await this.getConfig();
        return config.infrastructure.master;
    }

    async getSlaves() {
        const config = await this.getConfig();
        return config.infrastructure.slaves;
    }

    async getSlave(slaveId) {
        const slaves = await this.getSlaves();
        return slaves.find(slave => slave.id === slaveId) || null;
    }

    async addSlave(slaveConfig) {
        const config = await this.getConfig();
        
        if (!slaveConfig.id || !slaveConfig.host || !slaveConfig.port) {
            throw new Error('Слейв должен иметь id, host и port');
        }
        
        // Проверяем, что слейв с таким ID не существует
        const existingSlave = config.infrastructure.slaves.find(s => s.id === slaveConfig.id);
        if (existingSlave) {
            throw new Error(`Слейв с ID ${slaveConfig.id} уже существует`);
        }
        
        config.infrastructure.slaves.push({
            id: slaveConfig.id,
            host: slaveConfig.host,
            port: slaveConfig.port,
            apiKey: slaveConfig.apiKey || 'default-api-key',
            environment: slaveConfig.environment || 'development',
            status: slaveConfig.status || 'inactive',
            lastSeen: new Date().toISOString(),
            masterHost: config.infrastructure.master.host,
            masterPort: config.infrastructure.master.port,
            ...slaveConfig
        });
        
        await this.saveConfig(config);
    }

    async removeSlave(slaveId) {
        const config = await this.getConfig();
        config.infrastructure.slaves = config.infrastructure.slaves.filter(s => s.id !== slaveId);
        await this.saveConfig(config);
    }

    async updateSlaveStatus(slaveId, status) {
        const config = await this.getConfig();
        const slave = config.infrastructure.slaves.find(s => s.id === slaveId);
        
        if (!slave) {
            throw new Error(`Слейв с ID ${slaveId} не найден`);
        }
        
        slave.status = status;
        slave.lastSeen = new Date().toISOString();
        
        await this.saveConfig(config);
    }

    async getActiveSlaves() {
        const slaves = await this.getSlaves();
        return slaves.filter(slave => slave.status === 'active');
    }

    async updateMasterConfig(masterConfig) {
        const config = await this.getConfig();
        config.infrastructure.master = {
            ...config.infrastructure.master,
            ...masterConfig,
            lastSeen: new Date().toISOString()
        };
        await this.saveConfig(config);
    }

    addWatcher(callback) {
        this.watchers.add(callback);
        return () => this.watchers.delete(callback);
    }

    notifyWatchers(config) {
        this.watchers.forEach(callback => {
            try {
                callback(config);
            } catch (error) {
                console.error('Ошибка в наблюдателе конфигурации инфраструктуры:', error);
            }
        });
    }

    clearCache() {
        this.cache = null;
        this.lastModified = null;
    }

    getInfo() {
        return {
            name: 'infrastructure',
            path: this.configPath,
            hasCache: !!this.cache,
            watchersCount: this.watchers.size,
            lastModified: this.lastModified
        };
    }
}

const infrastructureConfigManager = new InfrastructureConfigManager();

module.exports = infrastructureConfigManager;
