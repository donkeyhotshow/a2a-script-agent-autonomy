/**
 * VulnerabilitiesConfigManager - Менеджер конфигурации уязвимостей
 * Управляет конфигурацией обнаруженных уязвимостей и их исправлений
 */

const fs = require('fs').promises; // Используем promises для асинхронных операций
const { readFileSync, existsSync } = require('fs'); // Для синхронного чтения схемы
const path = require('path');
const Ajv = require('ajv').default;
const addFormats = require('ajv-formats');
const ConfigManager = require('../../config-manager');

class VulnerabilitiesConfigManager extends ConfigManager {
    constructor(configPath, schemaPath) {
        super(configPath, schemaPath);
        this.configName = 'vulnerabilities';
        this.defaultConfig = this.getDefaultConfig();
    }

    getDefaultConfig() {
        return {
            vulnerabilities: [],
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Конфигурация уязвимостей'
            }
        };
    }

    async getVulnerabilities() {
        const config = await this.getConfig();
        return config.vulnerabilities;
    }

    async getVulnerability(vulnId) {
        const vulnerabilities = await this.getVulnerabilities();
        return vulnerabilities.find(v => v.id === vulnId) || null;
    }

    async addVulnerability(newVuln) {
        const config = await this.getConfig();
        if (!newVuln.id || !newVuln.title || !newVuln.severity) {
            throw new Error('Уязвимость должна иметь ID, заголовок и уровень серьезности');
        }
        config.vulnerabilities.push(newVuln);
        await this.saveConfig(config);
    }

    async updateVulnerability(vulnId, updates) {
        const config = await this.getConfig();
        const vulnIndex = config.vulnerabilities.findIndex(v => v.id === vulnId);
        if (vulnIndex === -1) {
            throw new Error(`Уязвимость с ID ${vulnId} не найдена`);
        }
        config.vulnerabilities[vulnIndex] = { ...config.vulnerabilities[vulnIndex], ...updates };
        await this.saveConfig(config);
    }
}

const configPath = path.join(__dirname, 'config.json');
const schemaPath = path.join(__dirname, 'schema.json');
const vulnerabilitiesConfigManager = new VulnerabilitiesConfigManager(configPath, schemaPath);

module.exports = vulnerabilitiesConfigManager;
module.exports.VulnerabilitiesConfigManager = VulnerabilitiesConfigManager;
