/**
 * AutomationConfigManager - Менеджер конфигурации автоматизации
 * Управляет конфигурацией скриптов, воркфлоу и триггеров
 */

const fs = require('fs').promises;
const path = require('path');





class AutomationConfigManager {
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
            console.error('Ошибка получения конфигурации автоматизации:', error);
            return this.getDefaultConfig();
        }
    }

    async loadConfig() {
        try {
            const content = await fs.readFile(this.configPath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            console.warn('Не удалось загрузить конфигурацию автоматизации, используется по умолчанию');
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
            console.error('Ошибка сохранения конфигурации автоматизации:', error);
            throw error;
        }
    }

    getDefaultConfig() {
        return {
            scripts: {},
            workflows: {},
            triggers: {
                webhook: {},
                schedule: {}
            },
            settings: {
                maxConcurrentJobs: 5,
                defaultTimeout: 1800,
                defaultRetries: 3,
                notificationChannels: {
                    email: { enabled: true, recipients: [] },
                    slack: { enabled: false, webhook: "" },
                    telegram: { enabled: false, botToken: "", chatId: "" }
                },
                logging: {
                    level: "info",
                    retention: "30d",
                    maxSize: "100MB"
                }
            },
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Конфигурация автоматизации'
            }
        };
    }

    async getScript(scriptId) {
        const config = await this.getConfig();
        return config.scripts[scriptId] || null;
    }

    async addScript(scriptId, scriptConfig) {
        const config = await this.getConfig();
        if (config.scripts[scriptId]) {
            throw new Error(`Скрипт с ID ${scriptId} уже существует`);
        }
        if (!scriptConfig.name) {
            throw new Error('Скрипт должен иметь имя');
        }
        config.scripts[scriptId] = {
            id: scriptId,
            name: scriptConfig.name,
            enabled: true,
            ...scriptConfig,
        };
        await this.saveConfig(config);
    }

    async removeScript(scriptId) {
        const config = await this.getConfig();
        delete config.scripts[scriptId];
        await this.saveConfig(config);
    }

    async getWorkflow(workflowId) {
        const config = await this.getConfig();
        return config.workflows[workflowId] || null;
    }

    async addWorkflow(workflowId, workflowConfig) {
        const config = await this.getConfig();
        config.workflows[workflowId] = {
            id: workflowId,
            enabled: true,
            ...workflowConfig
        };
        await this.saveConfig(config);
    }

    async getEnabledScripts() {
        const config = await this.getConfig();
        return Object.values(config.scripts).filter(script => script.enabled);
    }

    async getEnabledWorkflows() {
        const config = await this.getConfig();
        return Object.values(config.workflows).filter(workflow => workflow.enabled);
    }

    async updateSettings(settings) {
        const config = await this.getConfig();
        config.settings = { ...config.settings, ...settings };
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
                console.error('Ошибка в наблюдателе конфигурации автоматизации:', error);
            }
        });
    }

    clearCache() {
        this.cache = null;
        this.lastModified = null;
    }

    getInfo() {
        return {
            name: 'automation',
            path: this.configPath,
            hasCache: !!this.cache,
            watchersCount: this.watchers.size,
            lastModified: this.lastModified
        };
    }
}

const automationConfigManager = new AutomationConfigManager();

module.exports = automationConfigManager;
