/**
 * DeploymentConfigManager - Менеджер конфигурации развертывания
 * Управляет конфигурацией провайдеров, политик и настроек развертывания
 */

const fs = require('fs').promises;
const path = require('path');





class DeploymentConfigManager {
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
            console.error('Ошибка получения конфигурации развертывания:', error);
            return this.getDefaultConfig();
        }
    }

    async loadConfig() {
        try {
            const content = await fs.readFile(this.configPath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            console.warn('Не удалось загрузить конфигурацию развертывания, используется по умолчанию');
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
            console.error('Ошибка сохранения конфигурации развертывания:', error);
            throw error;
        }
    }

    getDefaultConfig() {
        return {
            providers: {},
            policies: {},
            environments: {},
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Конфигурация развертывания'
            }
        };
    }

    async getProvider(providerName) {
        const config = await this.getConfig();
        return config.providers[providerName] || null;
    }

    async addProvider(providerName, providerConfig) {
        const config = await this.getConfig();
        if (config.providers[providerName]) {
            throw new Error(`Провайдер ${providerName} уже существует`);
        }
        config.providers[providerName] = providerConfig;
        await this.saveConfig(config);
    }

    async getPolicy(policyName) {
        const config = await this.getConfig();
        return config.policies[policyName] || null;
    }

    async addPolicy(policyName, policyConfig) {
        const config = await this.getConfig();
        config.policies[policyName] = policyConfig;
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
                console.error('Ошибка в наблюдателе конфигурации развертывания:', error);
            }
        });
    }

    clearCache() {
        this.cache = null;
        this.lastModified = null;
    }

    getInfo() {
        return {
            name: 'deployment',
            path: this.configPath,
            hasCache: !!this.cache,
            watchersCount: this.watchers.size,
            lastModified: this.lastModified
        };
    }
}

const deploymentConfigManager = new DeploymentConfigManager();

module.exports = deploymentConfigManager;
