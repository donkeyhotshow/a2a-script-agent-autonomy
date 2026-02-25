/**
 * TestMetrics - Управление метриками тестов
 * Содержит логику для сбора, анализа и экспорта метрик тестирования
 */

const {fileSystemUtils} = require('@libs/system/file-operations/index.js');
const {errorUtils} = require('@libs/error-management/error-handler/error-utils.js');
const {consoleUtils} = require('@libs/logging-monitoring/logging/console-utils.js');
const fs = require('fs');
const path = require('path');

class TestMetrics {
    constructor() {
        this.testMetricsPath = fileSystemUtils.join(process.cwd(), 'work', 'test_metrics.json');
        this.testStats = {
            total_runs: 0,
            successful: 0,
            failed: 0,
            timeout: 0,
            interrupted: 0,
            total_duration: 0,
            average_duration: 0
        };

        this.initializeMetrics();
    }

    /**
     * Инициализация файла метрик
     */
    initializeMetrics() {
        if (!fileSystemUtils.existsSync(this.testMetricsPath)) {
            fs.writeFileSync(this.testMetricsPath, JSON.stringify(this.testStats, null, 2));
        } else {
            try {
                const existingData = fs.readFileSync(this.testMetricsPath, 'utf8');
                this.testStats = {...this.testStats, ...JSON.parse(existingData)};
            } catch (error) {
                consoleUtils.warn('Failed to load existing test metrics, using defaults');
            }
        }
    }

    /**
     * Обновление статистики тестов
     */
    updateStats(testResult) {
        this.testStats.total_runs++;

        switch (testResult.status) {
            case 'success':
                this.testStats.successful++;
                break;
            case 'failure':
                this.testStats.failed++;
                break;
            case 'timeout':
                this.testStats.timeout++;
                break;
            case 'interrupted':
                this.testStats.interrupted++;
                break;
        }

        if (testResult.duration) {
            this.testStats.total_duration += testResult.duration;
            this.testStats.average_duration = this.testStats.total_duration / this.testStats.total_runs;
        }

        this.saveMetrics();
    }

    /**
     * Сохранение метрик в файл
     */
    saveMetrics() {
        try {
            fs.writeFileSync(this.testMetricsPath, JSON.stringify(this.testStats, null, 2));
        } catch (error) {
            consoleUtils.error('Failed to save test metrics:', error);
        }
    }

    /**
     * Получение статистики
     */
    getStats() {
        return {...this.testStats};
    }

    /**
     * Сброс статистики
     */
    resetStats() {
        this.testStats = {
            total_runs: 0,
            successful: 0,
            failed: 0,
            timeout: 0,
            interrupted: 0,
            total_duration: 0,
            average_duration: 0
        };
        this.saveMetrics();
    }

    /**
     * Экспорт метрик
     */
    exportMetrics(format = 'json') {
        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(this.testStats, null, 2);
            case 'csv':
                return this.exportToCSV();
            case 'html':
                return this.exportToHTML();
            default:
                throw errorUtils.createError(`Unsupported export format: ${format}`);
        }
    }

    /**
     * Экспорт в CSV
     */
    exportToCSV() {
        const headers = Object.keys(this.testStats).join(',');
        const values = Object.values(this.testStats).join(',');
        return `${headers}\n${values}`;
    }

    /**
     * Экспорт в HTML
     */
    exportToHTML() {
        return `
<!DOCTYPE html>
<html>
<head>
    <title>Test Metrics Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .metric { margin: 10px 0; padding: 10px; background: #f5f5f5; }
        .metric-name { font-weight: bold; }
        .metric-value { color: #0066cc; }
    </style>
</head>
<body>
    <h1>Test Metrics Report</h1>
    ${Object.entries(this.testStats).map(([key, value]) => `
        <div class="metric">
            <span class="metric-name">${key}:</span>
            <span class="metric-value">${value}</span>
        </div>
    `).join('')}
</body>
</html>`;
    }

    /**
     * Получение рекомендаций на основе метрик
     */
    getRecommendations() {
        const recommendations = [];

        if (this.testStats.failed > this.testStats.successful) {
            recommendations.push('High failure rate detected. Consider reviewing test cases and fixing failing tests.');
        }

        if (this.testStats.timeout > this.testStats.total_runs * 0.1) {
            recommendations.push('High timeout rate detected. Consider increasing timeout values or optimizing slow tests.');
        }

        if (this.testStats.average_duration > 30) {
            recommendations.push('Tests are running slowly. Consider optimizing test performance.');
        }

        if (this.testStats.total_runs === 0) {
            recommendations.push('No tests have been run yet. Start running tests to collect metrics.');
        }

        return recommendations;
    }

    /**
     * Генерация отчета
     */
    generateReport() {
        const stats = this.getStats();
        const recommendations = this.getRecommendations();

        return {
            timestamp: new Date().toISOString(),
            stats,
            recommendations,
            summary: {
                successRate: stats.total_runs > 0 ? (stats.successful / stats.total_runs * 100).toFixed(2) + '%' : '0%',
                averageDuration: stats.average_duration.toFixed(2) + 's',
                totalRuns: stats.total_runs
            }
        };
    }
}

module.exports = {TestMetrics};

