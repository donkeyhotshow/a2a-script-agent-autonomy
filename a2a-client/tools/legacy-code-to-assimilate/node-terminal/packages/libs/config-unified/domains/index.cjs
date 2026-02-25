const path = require('path');
const fs = require('fs').promises;
const { ConfigManagerWrapper } = require('../../core/UnifiedConfigManager.cjs'); // Assuming UnifiedConfigManager exists

class DomainsConfigManager extends ConfigManagerWrapper {
    constructor(configPath, schemaPath, testMode = false, initialConfig = null) {
        super(configPath, schemaPath, testMode, initialConfig);
        this.configName = 'domains';
        this.defaultConfig = this.getDefaultConfig();
    }

    getDefaultConfig() {
        return {
            domains: [],
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Configuration for domains'
            }
        };
    }

    async getDomain(id) {
        const config = await this.getConfig();
        return config.domains?.find(d => d.id === id) || null;
    }

    async getAllDomains() {
        const config = await this.getConfig();
        return config.domains || [];
    }

    async addDomain(domainConfig) {
        const config = await this.getConfig();
        if (config.domains.some(d => d.id === domainConfig.id)) {
            throw new Error(`Domain with ID ${domainConfig.id} already exists.`);
        }
        config.domains.push({ ...domainConfig, created: new Date().toISOString() });
        await this.saveConfig(config);
        return domainConfig;
    }

    async updateDomain(id, updates) {
        const config = await this.getConfig();
        const index = config.domains?.findIndex(d => d.id === id);
        if (index !== -1 && config.domains && config.domains[index]) {
            Object.assign(config.domains[index], { ...updates, updated: new Date().toISOString() });
            await this.saveConfig(config);
            return config.domains[index];
        }
        throw new Error(`Domain with ID ${id} not found.`);
    }

    async deleteDomain(id) {
        const config = await this.getConfig();
        const initialLength = config.domains.length;
        config.domains = config.domains.filter(d => d.id !== id);
        if (config.domains.length === initialLength) {
            throw new Error(`Domain with ID ${id} not found.`);
        }
        await this.saveConfig(config);
        return { success: true };
    }
}

const configPath = path.join(__dirname, 'storage/data/config.json');
const schemaPath = path.join(__dirname, 'schema.json');
const domainsConfigManager = new DomainsConfigManager(configPath, schemaPath, true);

module.exports = { DomainsConfigManager, domainsConfigManager };
