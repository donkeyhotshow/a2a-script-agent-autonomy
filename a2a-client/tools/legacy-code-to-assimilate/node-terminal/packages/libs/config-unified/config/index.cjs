/**
 * ConfigConfigManager - Менеджер общей конфигурации приложения
 * Управляет основными настройками приложения
 */

const path = require('path');
const fs = require('fs').promises;
const { readFileSync, existsSync } = require('fs');
const Ajv = require('ajv').default;
const addFormats = require('ajv-formats');
const { ConfigManagerWrapper } = require('../../config-manager/index.cjs');

class ConfigConfigManager extends ConfigManagerWrapper {
    constructor(configPath, schemaPath, testMode = false, initialConfig = null) {
        super(configPath, schemaPath, testMode, initialConfig);
        this.configName = 'config';
        this.defaultConfig = this.getDefaultConfig();
    }

    getDefaultConfig() {
        return {
            app: {
                name: 'Projects Manager',
                version: '1.0.0',
                environment: 'development',
                port: 3012,
                logLevel: 'info'
            },
            database: {
                host: 'localhost',
                port: 5432,
                name: 'projects_manager',
                username: 'postgres',
                password: 'password'
            },
            logging: {
                level: 'info',
                file: 'logs/app.log',
                maxSize: '10m',
                maxFiles: 5
            },
            features: {
                enableMetrics: true,
                enableNotifications: true,
                enableTaskManager: true
            },
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Main application configuration'
            }
        };
    }

    async getConfig() {
        return super.getConfig();
    }

    async updateConfig(newConfig) {
        return super.updateConfig(newConfig);
    }

    async saveConfig(config) {
        return super.saveConfig(config);
    }

    async getConfigSchema() {
        try {
            const schemaPath = path.join(__dirname, 'schema.json');
            if (existsSync(schemaPath)) {
                const schemaContent = readFileSync(schemaPath, 'utf8');
                return JSON.parse(schemaContent);
            }
            return null;
        } catch (error) {
            console.error('[ConfigConfigManager] Error loading schema:', error);
            return null;
        }
    }

    async validateConfig(configData) {
        try {
            const schema = await this.getConfigSchema();
            if (!schema) {
                return { isValid: true, errors: [] };
            }

            const ajv = new Ajv({ allErrors: true });
            addFormats(ajv);
            const validate = ajv.compile(schema);
            const isValid = validate(configData);

            return {
                isValid,
                errors: validate.errors || []
            };
        } catch (error) {
            console.error('[ConfigConfigManager] Error validating config:', error);
            return {
                isValid: false,
                errors: [{ message: error.message }]
            };
        }
    }

    async getAppConfig() {
        const config = await this.getConfig();
        return config.app || {};
    }

    async updateAppConfig(appConfig) {
        const config = await this.getConfig();
        config.app = { ...config.app, ...appConfig };
        await this.saveConfig(config);
        return config.app;
    }

    async getDatabaseConfig() {
        const config = await this.getConfig();
        return config.database || {};
    }

    async updateDatabaseConfig(dbConfig) {
        const config = await this.getConfig();
        config.database = { ...config.database, ...dbConfig };
        await this.saveConfig(config);
        return config.database;
    }

    async getLoggingConfig() {
        const config = await this.getConfig();
        return config.logging || {};
    }

    async updateLoggingConfig(loggingConfig) {
        const config = await this.getConfig();
        config.logging = { ...config.logging, ...loggingConfig };
        await this.saveConfig(config);
        return config.logging;
    }

    async getFeatures() {
        const config = await this.getConfig();
        return config.features || {};
    }

    async updateFeatures(features) {
        const config = await this.getConfig();
        config.features = { ...config.features, ...features };
        await this.saveConfig(config);
        return config.features;
    }

    async isFeatureEnabled(featureName) {
        const features = await this.getFeatures();
        return features[featureName] === true;
    }

    async enableFeature(featureName) {
        const features = await this.getFeatures();
        features[featureName] = true;
        await this.updateFeatures(features);
        return true;
    }

    async disableFeature(featureName) {
        const features = await this.getFeatures();
        features[featureName] = false;
        await this.updateFeatures(features);
        return false;
    }

    async getEnvironment() {
        const appConfig = await this.getAppConfig();
        return appConfig.environment || 'development';
    }

    async setEnvironment(environment) {
        return await this.updateAppConfig({ environment });
    }

    async getLogLevel() {
        const appConfig = await this.getAppConfig();
        return appConfig.logLevel || 'info';
    }

    async setLogLevel(logLevel) {
        return await this.updateAppConfig({ logLevel });
    }

    async getPort() {
        const appConfig = await this.getAppConfig();
        return appConfig.port || 3012;
    }

    async setPort(port) {
        return await this.updateAppConfig({ port });
    }

    async getMetadata() {
        const config = await this.getConfig();
        return config.metadata || {};
    }

    async updateMetadata(metadata) {
        const config = await this.getConfig();
        config.metadata = { ...config.metadata, ...metadata };
        await this.saveConfig(config);
        return config.metadata;
    }
}

const configPath = path.join(__dirname, 'storage/data/config.json');
const schemaPath = path.join(__dirname, 'schema.json');

const configConfigManager = new ConfigConfigManager(configPath, schemaPath, false);

module.exports = { ConfigConfigManager, configConfigManager };
