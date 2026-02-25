/**
 * ComplianceConfigManager - Менеджер конфигурации соответствия
 * Управляет конфигурацией политик соответствия и возможных нарушений
 */

const fs = require('fs').promises;
const path = require('path');





class ComplianceConfigManager {
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
            console.error('Ошибка получения конфигурации соответствия:', error);
            return this.getDefaultConfig();
        }
    }

    async loadConfig() {
        try {
            const content = await fs.readFile(this.configPath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            console.warn('Не удалось загрузить конфигурацию соответствия, используется по умолчанию');
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
            console.error('Ошибка сохранения конфигурации соответствия:', error);
            throw error;
        }
    }

    getDefaultConfig() {
        return {
            policies: [],
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Конфигурация соответствия'
            }
        };
    }

    async getPolicies() {
        const config = await this.getConfig();
        return config.policies;
    }

    async getPolicy(policyId) {
        const policies = await this.getPolicies();
        return policies.find(p => p.id === policyId) || null;
    }

    async addPolicy(newPolicy) {
        const config = await this.getConfig();
        if (!newPolicy.id || !newPolicy.name) {
            throw new Error('Политика должна иметь ID и имя');
        }
        config.policies.push(newPolicy);
        await this.saveConfig(config);
    }

    async updatePolicy(policyId, updates) {
        const config = await this.getConfig();
        const policyIndex = config.policies.findIndex(p => p.id === policyId);
        if (policyIndex === -1) {
            throw new Error(`Политика с ID ${policyId} не найдена`);
        }
        config.policies[policyIndex] = { ...config.policies[policyIndex], ...updates };
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
                console.error('Ошибка в наблюдателе конфигурации соответствия:', error);
            }
        });
    }

    clearCache() {
        this.cache = null;
        this.lastModified = null;
    }

    getInfo() {
        return {
            name: 'compliance',
            path: this.configPath,
            hasCache: !!this.cache,
            watchersCount: this.watchers.size,
            lastModified: this.lastModified
        };
    }
}

const complianceConfigManager = new ComplianceConfigManager();

module.exports = complianceConfigManager;
