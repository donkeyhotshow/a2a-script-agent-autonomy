/**
 * EnvironmentsConfigManager - Менеджер конфигурации окружений
 * Управляет переменными окружения для различных сред развертывания (dev, staging, prod, test)
 */

const fs = require('fs').promises;
const path = require('path');





class EnvironmentsConfigManager {
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
            console.error('Ошибка получения конфигурации окружений:', error);
            return this.getDefaultConfig();
        }
    }

    async loadConfig() {
        try {
            const content = await fs.readFile(this.configPath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            console.warn('Не удалось загрузить конфигурацию окружений, используется по умолчанию');
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
            console.error('Ошибка сохранения конфигурации окружений:', error);
            throw error;
        }
    }

    getDefaultConfig() {
        return {
            default: 'development',
            profiles: {
                development: { NODE_ENV: 'development', DEBUG: true, LOG_LEVEL: 'debug' },
                production: { NODE_ENV: 'production', DEBUG: false, LOG_LEVEL: 'info' }
            },
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Конфигурация окружений'
            }
        };
    }

    async getEnvironment(envName) {
        const config = await this.getConfig();
        return config.profiles[envName] || null;
    }

    async getDefaultEnvironment() {
        const config = await this.getConfig();
        return config.profiles[config.default] || null;
    }

    async addEnvironment(envName, envConfig) {
        const config = await this.getConfig();
        if (config.profiles[envName]) {
            throw new Error(`Окружение ${envName} уже существует`);
        }
        config.profiles[envName] = envConfig;
        await this.saveConfig(config);
    }

    async updateEnvironment(envName, updates) {
        const config = await this.getConfig();
        if (!config.profiles[envName]) {
            throw new Error(`Окружение ${envName} не найдено`);
        }
        config.profiles[envName] = { ...config.profiles[envName], ...updates };
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
                console.error('Ошибка в наблюдателе конфигурации окружений:', error);
            }
        });
    }

    clearCache() {
        this.cache = null;
        this.lastModified = null;
    }

    getInfo() {
        return {
            name: 'environments',
            path: this.configPath,
            hasCache: !!this.cache,
            watchersCount: this.watchers.size,
            lastModified: this.lastModified
        };
    }
}

const environmentsConfigManager = new EnvironmentsConfigManager();

module.exports = environmentsConfigManager;
