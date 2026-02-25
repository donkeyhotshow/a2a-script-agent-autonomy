/**
 * AnalyticsConfigManager - Менеджер конфигурации аналитики
 * Управляет конфигурацией аналитических данных и метрик
 */

const path = require('path');
const ConfigManager = require('../../config-manager/index.js');

const configPath = path.join(__dirname, 'config.json');
const schemaPath = path.join(__dirname, 'schema.json');


class AnalyticsConfigManager extends ConfigManager {
    constructor() {
        super(configPath, schemaPath);
        this.configName = 'analytics';
    }

    /**
     * Получить конфигурацию по умолчанию
     * @returns {Object} Конфигурация по умолчанию
     */
    getDefaultConfig() {
        return {
            performanceTrends: [
                { "date": "2023-10-01", "cpu": 35, "ram": 55, "network": 120 },
                { "date": "2023-10-02", "cpu": 40, "ram": 58, "network": 150 },
                { "date": "2023-10-03", "cpu": 38, "ram": 60, "network": 140 },
                { "date": "2023-10-04", "cpu": 45, "ram": 62, "network": 160 },
                { "date": "2023-10-05", "cpu": 50, "ram": 65, "network": 180 },
                { "date": "2023-10-06", "cpu": 48, "ram": 63, "network": 170 },
                { "date": "2023-10-07", "cpu": 55, "ram": 70, "network": 200 }
            ],
            metrics: {
                collectionInterval: 60000, // 1 минута
                retentionPeriod: 30, // 30 дней
                enabledMetrics: ['cpu', 'ram', 'network', 'disk', 'responseTime']
            },
            alerts: {
                enabled: true,
                thresholds: {
                    cpu: 80,
                    ram: 85,
                    network: 1000,
                    disk: 90
                }
            },
            metadata: {
                created: new Date().toISOString(),
                version: '1.0.0',
                description: 'Конфигурация аналитики'
            }
        };
    }

    /**
     * Добавить точку данных производительности
     * @param {Object} dataPoint - Точка данных
     * @returns {Promise<void>}
     */
    async addPerformanceData(dataPoint) {
        const config = await this.getConfig();
        
        if (!dataPoint.date || !dataPoint.cpu || !dataPoint.ram || !dataPoint.network) {
            throw new Error('Точка данных должна содержать date, cpu, ram и network');
        }
        
        config.performanceTrends.push(dataPoint);
        
        // Ограничиваем количество точек данных
        const maxPoints = 1000;
        if (config.performanceTrends.length > maxPoints) {
            config.performanceTrends = config.performanceTrends.slice(-maxPoints);
        }
        
        await this.saveConfig(config);
    }

    /**
     * Получить данные производительности за период
     * @param {Date} startDate - Начальная дата
     * @param {Date} endDate - Конечная дата
     * @returns {Promise<Array>} Данные производительности
     */
    async getPerformanceData(startDate, endDate) {
        const config = await this.getConfig();
        
        return config.performanceTrends.filter(point => {
            const pointDate = new Date(point.date);
            return pointDate >= startDate && pointDate <= endDate;
        });
    }

    /**
     * Получить последние N точек данных
     * @param {number} count - Количество точек
     * @returns {Promise<Array>} Последние точки данных
     */
    async getLatestPerformanceData(count = 10) {
        const config = await this.getConfig();
        return config.performanceTrends.slice(-count);
    }

    /**
     * Обновить настройки метрик
     * @param {Object} metricsConfig - Конфигурация метрик
     * @returns {Promise<void>}
     */
    async updateMetricsConfig(metricsConfig) {
        const config = await this.getConfig();
        config.metrics = { ...config.metrics, ...metricsConfig };
        await this.saveConfig(config);
    }

    /**
     * Обновить настройки алертов
     * @param {Object} alertsConfig - Конфигурация алертов
     * @returns {Promise<void>}
     */
    async updateAlertsConfig(alertsConfig) {
        const config = await this.getConfig();
        config.alerts = { ...config.alerts, ...alertsConfig };
        await this.saveConfig(config);
    }

    /**
     * Валидировать конфигурацию
     * @param {Object} config - Конфигурация для валидации
     * @returns {boolean} Результат валидации
     */
    validateConfig(config) {
        const baseValidation = super.validateConfig(config);
        if (!baseValidation) {
            return false;
        }

        if (!config || typeof config !== 'object') {
            return false;
        }
        
        if (!config.performanceTrends || !Array.isArray(config.performanceTrends)) {
            return false;
        }
        
        if (!config.metrics || typeof config.metrics !== 'object') {
            return false;
        }
        
        return true;
    }

    /**
     * Получить информацию о конфигурации
     * @returns {Object} Информация о конфигурации
     */
    getInfo() {
        const baseInfo = super.getInfo();
        return {
            ...baseInfo,
            name: 'analytics',
        };
    }
}

// Создаем экземпляр менеджера
const analyticsConfigManager = new AnalyticsConfigManager();

module.exports = analyticsConfigManager;

