const path = require('path');
const fs = require('fs').promises;
const { ConfigManagerWrapper } = require('../../core/UnifiedConfigManager.cjs'); // Assuming UnifiedConfigManager exists

class HostingConfigManager extends ConfigManagerWrapper {
    constructor(configPath, schemaPath, testMode = false, initialConfig = null) {
        super(configPath, schemaPath, testMode, initialConfig);
        this.configName = 'hosting';
        this.defaultConfig = this.getDefaultConfig();
    }

    getDefaultConfig() {
        return {
            servers: [],
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Configuration for hosting servers'
            }
        };
    }

    async getServer(id) {
        const config = await this.getConfig();
        return config.servers?.find(s => s.id === id) || null;
    }

    async getAllServers() {
        const config = await this.getConfig();
        return config.servers || [];
    }

    async addServer(serverConfig) {
        const config = await this.getConfig();
        if (config.servers.some(s => s.id === serverConfig.id)) {
            throw new Error(`Server with ID ${serverConfig.id} already exists.`);
        }
        config.servers.push({ ...serverConfig, created: new Date().toISOString() });
        await this.saveConfig(config);
        return serverConfig;
    }

    async updateServer(id, updates) {
        const config = await this.getConfig();
        const index = config.servers?.findIndex(s => s.id === id);
        if (index !== -1 && config.servers && config.servers[index]) {
            Object.assign(config.servers[index], { ...updates, updated: new Date().toISOString() });
            await this.saveConfig(config);
            return config.servers[index];
        }
        throw new Error(`Server with ID ${id} not found.`);
    }

    async deleteServer(id) {
        const config = await this.getConfig();
        const initialLength = config.servers.length;
        config.servers = config.servers.filter(s => s.id !== id);
        if (config.servers.length === initialLength) {
            throw new Error(`Server with ID ${id} not found.`);
        }
        await this.saveConfig(config);
        return { success: true };
    }
}

const configPath = path.join(__dirname, 'storage/data/config.json');
const schemaPath = path.join(__dirname, 'schema.json');
const hostingConfigManager = new HostingConfigManager(configPath, schemaPath, true);

module.exports = { HostingConfigManager, hostingConfigManager };

