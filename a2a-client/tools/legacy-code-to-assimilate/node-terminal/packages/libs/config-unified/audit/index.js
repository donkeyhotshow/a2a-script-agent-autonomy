/**
 * AuditConfigManager - Менеджер конфигурации аудита
 * Управляет конфигурацией аудита и логирования действий
 */

const fs = require('fs').promises;
const path = require('path');





class AuditConfigManager {
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
            console.error('Ошибка получения конфигурации аудита:', error);
            return this.getDefaultConfig();
        }
    }

    async loadConfig() {
        try {
            const content = await fs.readFile(this.configPath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            console.warn('Не удалось загрузить конфигурацию аудита, используется по умолчанию');
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
            console.error('Ошибка сохранения конфигурации аудита:', error);
            throw error;
        }
    }

    getDefaultConfig() {
        return {
            users: ["admin", "editor", "viewer", "guest", "system"],
            actions: [
                "создал проект",
                "удалил файл", 
                "изменил настройку",
                "просмотрел отчет",
                "запустил сервис",
                "остановил сервис"
            ],
            detailsTemplates: [
                "ID: {{randomInt:1000-9999}}",
                "File: /path/to/{{randomWord}}.log",
                "Service: {{randomElement:services}}",
                "Project: {{randomElement:projects}}"
            ],
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Конфигурация аудита'
            }
        };
    }

    async addUser(user) {
        const config = await this.getConfig();
        if (config.users.includes(user)) {
            throw new Error(`Пользователь ${user} уже существует`);
        }
        config.users.push(user);
        await this.saveConfig(config);
    }

    async removeUser(user) {
        const config = await this.getConfig();
        config.users = config.users.filter(u => u !== user);
        await this.saveConfig(config);
    }

    async addAction(action) {
        const config = await this.getConfig();
        if (!config.actions.includes(action)) {
            config.actions.push(action);
            await this.saveConfig(config);
        }
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
                console.error('Ошибка в наблюдателе конфигурации аудита:', error);
            }
        });
    }

    clearCache() {
        this.cache = null;
        this.lastModified = null;
    }

    getInfo() {
        return {
            name: 'audit',
            path: this.configPath,
            hasCache: !!this.cache,
            watchersCount: this.watchers.size,
            lastModified: this.lastModified
        };
    }
}

const auditConfigManager = new AuditConfigManager();

module.exports = auditConfigManager;
