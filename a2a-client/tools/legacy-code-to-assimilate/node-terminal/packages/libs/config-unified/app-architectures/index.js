/**
 * AppArchitecturesConfigManager - Менеджер конфигурации архитектур приложений
 * Управляет конфигурацией различных архитектур и шаблонов приложений
 */

const fs = require('fs').promises;
const path = require('path');





class AppArchitecturesConfigManager {
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
            console.error('Ошибка получения конфигурации архитектур приложений:', error);
            return this.getDefaultConfig();
        }
    }

    async loadConfig() {
        try {
            const content = await fs.readFile(this.configPath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            console.warn('Не удалось загрузить конфигурацию архитектур приложений, используется по умолчанию');
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
            console.error('Ошибка сохранения конфигурации архитектур приложений:', error);
            throw error;
        }
    }

    getDefaultConfig() {
        return {
            architectures: {},
            templates: {},
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Конфигурация архитектур приложений'
            }
        };
    }

    async getArchitecture(archName) {
        const config = await this.getConfig();
        return config.architectures[archName] || null;
    }

    async getTemplate(templateName) {
        const config = await this.getConfig();
        return config.templates[templateName] || null;
    }

    async addArchitecture(archName, archConfig) {
        const config = await this.getConfig();
        if (config.architectures[archName]) {
            throw new Error(`Архитектура ${archName} уже существует`);
        }
        config.architectures[archName] = archConfig;
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
                console.error('Ошибка в наблюдателе конфигурации архитектур приложений:', error);
            }
        });
    }

    clearCache() {
        this.cache = null;
        this.lastModified = null;
    }

    getInfo() {
        return {
            name: 'app-architectures',
            path: this.configPath,
            hasCache: !!this.cache,
            watchersCount: this.watchers.size,
            lastModified: this.lastModified
        };
    }
}

const appArchitecturesConfigManager = new AppArchitecturesConfigManager();

module.exports = appArchitecturesConfigManager;
