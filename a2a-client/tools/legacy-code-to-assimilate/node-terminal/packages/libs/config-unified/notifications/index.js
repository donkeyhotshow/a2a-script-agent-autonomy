/**
 * NotificationsConfigManager - Менеджер конфигурации уведомлений
 * Управляет конфигурацией различных типов уведомлений и их настройками
 */

const fs = require('fs').promises;
const path = require('path');





class NotificationsConfigManager {
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
            console.error('Ошибка получения конфигурации уведомлений:', error);
            return this.getDefaultConfig();
        }
    }

    async loadConfig() {
        try {
            const content = await fs.readFile(this.configPath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            console.warn('Не удалось загрузить конфигурацию уведомлений, используется по умолчанию');
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
            console.error('Ошибка сохранения конфигурации уведомлений:', error);
            throw error;
        }
    }

    getDefaultConfig() {
        return {
            channels: {
                email: { enabled: true, recipients: [], template: 'default' },
                slack: { enabled: false, webhookUrl: '' },
                webhook: { enabled: false, endpoint: '' }
            },
            templates: {
                default: {
                    subject: 'Уведомление от Projects Manager',
                    body: 'Новое событие: {event}. Подробности: {details}'
                }
            },
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Конфигурация уведомлений'
            }
        };
    }

    async getChannelConfig(channelName) {
        const config = await this.getConfig();
        return config.channels[channelName] || null;
    }

    async updateChannelConfig(channelName, updates) {
        const config = await this.getConfig();
        if (!config.channels[channelName]) {
            throw new Error(`Канал уведомлений ${channelName} не найден`);
        }
        config.channels[channelName] = { ...config.channels[channelName], ...updates };
        await this.saveConfig(config);
    }

    async getTemplate(templateName) {
        const config = await this.getConfig();
        return config.templates[templateName] || null;
    }

    async addTemplate(templateName, templateConfig) {
        const config = await this.getConfig();
        if (config.templates[templateName]) {
            throw new Error(`Шаблон ${templateName} уже существует`);
        }
        config.templates[templateName] = templateConfig;
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
                console.error('Ошибка в наблюдателе конфигурации уведомлений:', error);
            }
        });
    }

    clearCache() {
        this.cache = null;
        this.lastModified = null;
    }

    getInfo() {
        return {
            name: 'notifications',
            path: this.configPath,
            hasCache: !!this.cache,
            watchersCount: this.watchers.size,
            lastModified: this.lastModified
        };
    }
}

const notificationsConfigManager = new NotificationsConfigManager();

module.exports = notificationsConfigManager;
