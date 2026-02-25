/**
 * ServersConfigManager - Менеджер конфигурации серверов
 * Управляет конфигурацией серверов и их настройками
 */

const path = require('path');
const fs = require('fs').promises;
const { readFileSync, existsSync } = require('fs');
const Ajv = require('ajv').default;
const addFormats = require('ajv-formats');
const ConfigManager = require('../../config-manager');

class ServersConfigManager extends ConfigManager {
    constructor(configPath, schemaPath) {
        super(configPath, schemaPath);
        this.configName = 'servers';
        this.defaultConfig = this.getDefaultConfig();
    }

    getDefaultConfig() {
        return {
            servers: {
                gateway: {
                    port: 3012,
                    ssl: {
                        enabled: false,
                        cert: "./certs/server.crt",
                        key: "./certs/server.key"
                    },
                    rateLimit: {
                        enabled: true,
                        windowMs: 900000,
                        max: 100,
                        message: "Too many requests from this IP"
                    },
                    cors: {
                        origin: ["http://localhost:3000", "https://ui.example.com"],
                        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                        allowedHeaders: ["Content-Type", "Authorization"],
                        credentials: true
                    }
                }
            },
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Конфигурация серверов'
            }
        };
    }

    async getServer(name) {
        const config = await this.getConfig();
        return config.servers[name] || null;
    }

    async addServer(name, serverConfig) {
        const config = await this.getConfig();
        
        if (!name || !serverConfig) {
            throw new Error('Сервер должен иметь имя и конфигурацию');
        }
        
        config.servers[name] = {
            port: serverConfig.port || 3000,
            ssl: serverConfig.ssl || { enabled: false },
            rateLimit: serverConfig.rateLimit || { enabled: false },
            cors: serverConfig.cors || { origin: ["*"] },
            ...serverConfig
        };
        
        await this.saveConfig(config);
    }

    async removeServer(name) {
        const config = await this.getConfig();
        delete config.servers[name];
        await this.saveConfig(config);
    }

    async updateServer(name, updates) {
        const config = await this.getConfig();
        
        if (!config.servers[name]) {
            throw new Error(`Сервер ${name} не найден`);
        }
        
        config.servers[name] = {
            ...config.servers[name],
            ...updates
        };
        
        await this.saveConfig(config);
    }

    async getServersList() {
        const config = await this.getConfig();
        return Object.keys(config.servers);
    }
}

const configPath = path.join(__dirname, 'config.json');
const schemaPath = path.join(__dirname, 'schema.json');
const serversConfigManager = new ServersConfigManager(configPath, schemaPath);

module.exports = serversConfigManager;
