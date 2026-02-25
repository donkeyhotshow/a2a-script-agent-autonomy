/**
 * TestActivityTracker - Отслеживание активности тестов
 * Система "шороха" для отслеживания изменений и активности в тестовых файлах
 */

const {fileSystemUtils} = require('@libs/system/file-operations/index.js');
const {errorUtils} = require('@libs/error-management/error-handler/error-utils.js');
const {consoleUtils} = require('@libs/logging-monitoring/logging/console-utils.js');
const fs = require('fs');
const path = require('path');

class TestActivityTracker {
    constructor() {
        this.activityMap = new Map(); // Путь -> уровень активности
        this.changeHistory = new Map(); // Путь -> история изменений
        this.activityDecayRate = 0.95; // Скорость затухания активности
        this.maxActivityHistory = 100; // Максимум записей истории
        this.activityBoostMultiplier = 2.0; // Множитель приоритета для активных областей

        this.startActivityDecay();
    }

    /**
     * Запуск системы затухания активности
     */
    startActivityDecay() {
        setInterval(() => {
            this.decayActivity();
        }, 60000); // Каждую минуту
    }

    /**
     * Затухание активности
     */
    decayActivity() {
        for (const [filePath, activity] of this.activityMap.entries()) {
            const newActivity = activity * this.activityDecayRate;
            if (newActivity < 0.01) {
                this.activityMap.delete(filePath);
            } else {
                this.activityMap.set(filePath, newActivity);
            }
        }
    }

    /**
     * Регистрация активности файла
     */
    recordActivity(filePath, activityType = 'modify', intensity = 1.0) {
        const normalizedPath = this.normalizePath(filePath);
        const currentActivity = this.activityMap.get(normalizedPath) || 0;

        // Увеличиваем активность в зависимости от типа
        let activityIncrease = intensity;
        switch (activityType) {
            case 'create':
                activityIncrease *= 2.0;
                break;
            case 'modify':
                activityIncrease *= 1.5;
                break;
            case 'delete':
                activityIncrease *= 1.0;
                break;
            case 'test_run':
                activityIncrease *= 1.2;
                break;
            case 'test_failure':
                activityIncrease *= 2.5;
                break;
        }

        this.activityMap.set(normalizedPath, currentActivity + activityIncrease);

        // Добавляем в историю изменений
        this.addToChangeHistory(normalizedPath, {
            timestamp: Date.now(),
            type: activityType,
            intensity: activityIncrease,
            totalActivity: currentActivity + activityIncrease
        });
    }

    /**
     * Добавление в историю изменений
     */
    addToChangeHistory(filePath, changeRecord) {
        if (!this.changeHistory.has(filePath)) {
            this.changeHistory.set(filePath, []);
        }

        const history = this.changeHistory.get(filePath);
        history.push(changeRecord);

        // Ограничиваем размер истории
        if (history.length > this.maxActivityHistory) {
            history.splice(0, history.length - this.maxActivityHistory);
        }
    }

    /**
     * Получение уровня активности файла
     */
    getActivityLevel(filePath) {
        const normalizedPath = this.normalizePath(filePath);
        return this.activityMap.get(normalizedPath) || 0;
    }

    /**
     * Получение истории изменений файла
     */
    getChangeHistory(filePath) {
        const normalizedPath = this.normalizePath(filePath);
        return this.changeHistory.get(normalizedPath) || [];
    }

    /**
     * Получение самых активных файлов
     */
    getMostActiveFiles(limit = 10) {
        const entries = Array.from(this.activityMap.entries());
        entries.sort((a, b) => b[1] - a[1]);
        return entries.slice(0, limit).map(([path, activity]) => ({
            path,
            activity,
            level: this.getActivityLevelCategory(activity)
        }));
    }

    /**
     * Категоризация уровня активности
     */
    getActivityLevelCategory(activity) {
        if (activity >= 10) return 'very_high';
        if (activity >= 5) return 'high';
        if (activity >= 2) return 'medium';
        if (activity >= 0.5) return 'low';
        return 'very_low';
    }

    /**
     * Получение рекомендаций на основе активности
     */
    getActivityRecommendations() {
        const recommendations = [];
        const mostActive = this.getMostActiveFiles(5);

        if (mostActive.length > 0) {
            const veryHighActivity = mostActive.filter(f => f.level === 'very_high');
            if (veryHighActivity.length > 0) {
                recommendations.push({
                    type: 'high_activity',
                    message: `Files with very high activity detected: ${veryHighActivity.map(f => f.path).join(', ')}`,
                    suggestion: 'Consider reviewing these files for potential issues or optimization opportunities'
                });
            }

            const highActivity = mostActive.filter(f => f.level === 'high');
            if (highActivity.length > 3) {
                recommendations.push({
                    type: 'multiple_high_activity',
                    message: `Multiple files with high activity detected`,
                    suggestion: 'Consider running focused tests on these files'
                });
            }
        }

        return recommendations;
    }

    /**
     * Нормализация пути
     */
    normalizePath(filePath) {
        return path.resolve(filePath).replace(/\\/g, '/');
    }

    /**
     * Получение статистики активности
     */
    getActivityStats() {
        const entries = Array.from(this.activityMap.entries());
        const totalActivity = entries.reduce((sum, [_, activity]) => sum + activity, 0);
        const averageActivity = entries.length > 0 ? totalActivity / entries.length : 0;

        const levelCounts = {
            very_high: 0,
            high: 0,
            medium: 0,
            low: 0,
            very_low: 0
        };

        entries.forEach(([_, activity]) => {
            const level = this.getActivityLevelCategory(activity);
            levelCounts[level]++;
        });

        return {
            totalFiles: entries.length,
            totalActivity,
            averageActivity,
            levelCounts,
            mostActiveFile: entries.length > 0 ? entries[0] : null
        };
    }

    /**
     * Экспорт данных активности
     */
    exportActivityData() {
        return {
            timestamp: new Date().toISOString(),
            activityMap: Object.fromEntries(this.activityMap),
            changeHistory: Object.fromEntries(this.changeHistory),
            stats: this.getActivityStats(),
            recommendations: this.getActivityRecommendations()
        };
    }

    /**
     * Очистка старых данных
     */
    cleanupOldData(maxAgeHours = 24) {
        const cutoffTime = Date.now() - (maxAgeHours * 60 * 60 * 1000);

        // Очищаем историю изменений
        for (const [filePath, history] of this.changeHistory.entries()) {
            const filteredHistory = history.filter(record => record.timestamp > cutoffTime);
            if (filteredHistory.length === 0) {
                this.changeHistory.delete(filePath);
                this.activityMap.delete(filePath);
            } else {
                this.changeHistory.set(filePath, filteredHistory);
            }
        }
    }

    /**
     * Сброс всех данных активности
     */
    reset() {
        this.activityMap.clear();
        this.changeHistory.clear();
    }
}

module.exports = {TestActivityTracker};

