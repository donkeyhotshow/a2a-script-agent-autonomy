/**
 * TestsConfigManager - Менеджер конфигурации тестов
 * Управляет конфигурацией различных типов тестов (unit, integration, e2e, performance, security)
 */

const fs = require('fs').promises;
const path = require('path');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { readFileSync } = require('fs');


const configPath = path.join(__dirname, 'config.json');
const schemaPath = path.join(__dirname, 'schema.json');


class TestsConfigManager {
    constructor() {
        this.configPath = path.join(__dirname, 'config.json');
        this.cache = null;
        this.lastModified = null;
        this.watchers = new Set();

        this.ajv = new Ajv();
        addFormats(this.ajv);
        try {
            this.schemaPath = path.join(__dirname, 'schema.json');
            const schema = JSON.parse(readFileSync(this.schemaPath, 'utf8'));
            this.validate = this.ajv.compile(schema);
        } catch (error) {
            console.error(`Failed to load or compile schema for tests config: ${error.message}`);
        }
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
            console.error('Ошибка получения конфигурации тестов:', error);
            return this.getDefaultConfig();
        }
    }

    async loadConfig() {
        try {
            const content = await fs.readFile(this.configPath, 'utf-8');
            const configData = JSON.parse(content);
            if (this.validate && !this.validate(configData)) {
                const errorMessage = `Tests Configuration failed validation: ${this.ajv.errorsText(this.validate.errors)}`;
                console.error(errorMessage);
                // throw new Error(errorMessage);
            }
            return configData;
        } catch (error) {
            console.warn('Не удалось загрузить конфигурацию тестов, используется по умолчанию');
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
            console.error('Ошибка сохранения конфигурации тестов:', error);
            throw error;
        }
    }

    getDefaultConfig() {
        return {
            types: {},
            matrix: [],
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Конфигурация тестов'
            }
        };
    }

    async getTestType(typeName) {
        const config = await this.getConfig();
        return config.types[typeName] || null;
    }

    async getTestMatrix() {
        const config = await this.getConfig();
        return config.matrix;
    }

    async addTestType(typeName, typeConfig) {
        const config = await this.getConfig();
        if (config.types[typeName]) {
            throw new Error(`Тип теста ${typeName} уже существует`);
        }
        config.types[typeName] = typeConfig;
        await this.saveConfig(config);
    }

    async updateTestMatrixEntry(appId, updates) {
        const config = await this.getConfig();
        const entryIndex = config.matrix.findIndex(e => e.appId === appId);
        if (entryIndex === -1) {
            throw new Error(`Запись для appId ${appId} не найдена в матрице тестов`);
        }
        config.matrix[entryIndex] = { ...config.matrix[entryIndex], ...updates };
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
                console.error('Ошибка в наблюдателе конфигурации тестов:', error);
            }
        });
    }

    clearCache() {
        this.cache = null;
        this.lastModified = null;
    }

    getInfo() {
        return {
            name: 'tests',
            path: this.configPath,
            hasCache: !!this.cache,
            watchersCount: this.watchers.size,
            lastModified: this.lastModified
        };
    }
}

const testsConfigManager = new TestsConfigManager();

module.exports = testsConfigManager;
