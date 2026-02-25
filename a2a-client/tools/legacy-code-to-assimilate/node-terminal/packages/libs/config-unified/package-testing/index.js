/**
 * PackageTestingConfigManager - Менеджер конфигурации тестирования пакетов
 * Управляет конфигурацией для тестирования npm-пакетов и связанных с ними скриптов
 */

const fs = require('fs').promises;
const path = require('path');





class PackageTestingConfigManager {
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
            console.error('Ошибка получения конфигурации тестирования пакетов:', error);
            return this.getDefaultConfig();
        }
    }

    async loadConfig() {
        try {
            const content = await fs.readFile(this.configPath, 'utf-8');
            return JSON.parse(content);
        } catch (error) {
            console.warn('Не удалось загрузить конфигурацию тестирования пакетов, используется по умолчанию');
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
            console.error('Ошибка сохранения конфигурации тестирования пакетов:', error);
            throw error;
        }
    }

    getDefaultConfig() {
        return {
            packages: {
                "test-package-1": {
                    "name": "test-package-1",
                    "version": "1.0.0",
                    "path": "./packages/test-package-1",
                    "tests": [
                        "./tests/unit/test-package-1.test.js"
                    ]
                }
            },
            scripts: {
                "build-all": "lerna run build",
                "test-all": "lerna run test"
            },
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Конфигурация тестирования пакетов'
            }
        };
    }

    async getPackageConfig(packageName) {
        const config = await this.getConfig();
        return config.packages[packageName] || null;
    }

    async getScript(scriptName) {
        const config = await this.getConfig();
        return config.scripts[scriptName] || null;
    }

    async addPackage(packageName, packageDetails) {
        const config = await this.getConfig();
        if (config.packages[packageName]) {
            throw new Error(`Пакет ${packageName} уже существует`);
        }
        config.packages[packageName] = packageDetails;
        await this.saveConfig(config);
    }

    async updateScript(scriptName, scriptCommand) {
        const config = await this.getConfig();
        config.scripts[scriptName] = scriptCommand;
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
                console.error('Ошибка в наблюдателе конфигурации тестирования пакетов:', error);
            }
        });
    }

    clearCache() {
        this.cache = null;
        this.lastModified = null;
    }

    getInfo() {
        return {
            name: 'package-testing',
            path: this.configPath,
            hasCache: !!this.cache,
            watchersCount: this.watchers.size,
            lastModified: this.lastModified
        };
    }
}

const packageTestingConfigManager = new PackageTestingConfigManager();

module.exports = packageTestingConfigManager;
