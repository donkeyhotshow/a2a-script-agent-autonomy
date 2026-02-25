/**
 * Управление операциями создания, обновления и удаления отчетов об ошибках.
 */

import { debugCritical } from './TaskReporterLogger';

export class ReportCrudOperations {
    constructor(reports, persistenceManager, sendReportCallback) {
        this.reports = reports;
        this.persistenceManager = persistenceManager;
        this.sendReportCallback = sendReportCallback;
    }

    /**
     * Создание отчета об ошибке
     */
    createErrorReport(error, context = {}) {
        try {
            debugCritical('Создание отчета об ошибке', {
                error: error.message,
                context: context
            });

            const report = {
                id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                type: 'error_report',
                timestamp: new Date().toISOString(),
                status: 'open',
                priority: this.determinePriority(error, context),
                error: {
                    message: error.message,
                    stack: error.stack,
                    name: error.name,
                    code: error.code
                },
                context: {
                    url: typeof window !== 'undefined' ? window.location.href : 'server',
                    userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'node',
                    ...context
                },
                metadata: {
                    createdBy: 'TaskReporter',
                    version: '1.0.0'
                }
            };

            this.reports.push(report);
            debugCritical('Отчет об ошибке создан', {
                reportId: report.id,
                priority: report.priority
            });

            // Автоматическое сохранение
            this.persistenceManager.saveReports();

            return report;
        } catch (error) {
            debugCritical('Ошибка создания отчета:', {
                error: error.message,
                stack: error.stack
            });
            return null;
        }
    }

    /**
     * Определение приоритета ошибки
     */
    determinePriority(error, context) {
        // Критические ошибки
        if (error.name === 'TypeError' || error.name === 'ReferenceError') {
            return 'critical';
        }

        // Ошибки сети
        if (error.message.includes('fetch') || error.message.includes('network')) {
            return 'high';
        }

        // Ошибки плагинов
        if (context.plugin) {
            return 'medium';
        }

        // Ошибки API
        if (context.api || error.message.includes('api')) {
            return 'medium';
        }

        // Остальные ошибки
        return 'low';
    }

    /**
     * Запись ошибки плагина
     */
    recordPluginError(pluginName, error, context = '') {
        try {
            debugCritical('Запись ошибки плагина', {
                plugin: pluginName,
                error: error.message,
                context: context
            });

            return this.createErrorReport(error, {
                plugin: pluginName,
                context: context,
                source: 'plugin'
            });
        } catch (e) {
            debugCritical('Ошибка записи ошибки плагина:', {
                plugin: pluginName,
                error: e.message,
                stack: e.stack
            });
            return null;
        }
    }

    /**
     * Запись ошибки API
     */
    recordApiError(endpoint, error, context = {}) {
        try {
            debugCritical('Запись ошибки API', {
                endpoint: endpoint,
                error: error.message,
                context: context
            });

            return this.createErrorReport(error, {
                api: endpoint,
                ...context,
                source: 'api'
            });
        } catch (e) {
            debugCritical('Ошибка записи ошибки API:', {
                endpoint: endpoint,
                error: e.message,
                stack: e.stack
            });
            return null;
        }
    }

    /**
     * Запись ошибки компонента
     */
    recordComponentError(componentName, error, context = {}) {
        try {
            debugCritical('Запись ошибки компонента', {
                component: componentName,
                error: error.message,
                context: context
            });

            return this.createErrorReport(error, {
                component: componentName,
                ...context,
                source: 'component'
            });
        } catch (e) {
            debugCritical('Ошибка записи ошибки компонента:', {
                component: componentName,
                error: e.message,
                stack: e.stack
            });
            return null;
        }
    }

    /**
     * Отправка отчета на сервер
     */
    async sendReport(reportId) {
        try {
            debugCritical('Отправка отчета на сервер', { reportId });

            const report = this.reports.find(r => r.id === reportId);
            if (!report) {
                debugCritical('Отчет не найден', { reportId });
                return false;
            }

            // Отправка через unified API
            const response = await fetch('/api/error-management/report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(report)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            // Обновление статуса отчета
            report.status = 'sent';
            report.sentAt = new Date().toISOString();

            await this.persistenceManager.saveReports();

            debugCritical('Отчет успешно отправлен', {
                reportId: reportId,
                responseStatus: response.status
            });

            return true;
        } catch (error) {
            debugCritical('Ошибка отправки отчета:', {
                reportId: reportId,
                error: error.message,
                stack: error.stack
            });
            return false;
        }
    }

    /**
     * Обновление статуса отчета
     */
    updateReportStatus(reportId, status, notes = '') {
        try {
            debugCritical('Обновление статуса отчета', {
                reportId: reportId,
                status: status,
                notes: notes
            });

            const report = this.reports.find(r => r.id === reportId);
            if (!report) {
                debugCritical('Отчет не найден для обновления', { reportId });
                return false;
            }

            report.status = status;
            report.notes = notes;
            report.updatedAt = new Date().toISOString();

            this.persistenceManager.saveReports();

            debugCritical('Статус отчета обновлен', {
                reportId: reportId,
                newStatus: status
            });

            return true;
        } catch (error) {
            debugCritical('Ошибка обновления статуса отчета:', {
                reportId: reportId,
                error: error.message,
                stack: error.stack
            });
            return false;
        }
    }

    /**
     * Удаление отчета
     */
    deleteReport(reportId) {
        try {
            debugCritical('Удаление отчета', { reportId });

            const index = this.reports.findIndex(r => r.id === reportId);
            if (index === -1) {
                debugCritical('Отчет не найден для удаления', { reportId });
                return false;
            }

            this.reports.splice(index, 1);
            this.persistenceManager.saveReports();

            debugCritical('Отчет удален', { reportId });

            return true;
        } catch (error) {
            debugCritical('Ошибка удаления отчета:', {
                reportId: reportId,
                error: error.message,
                stack: error.stack
            });
            return false;
        }
    }
}
