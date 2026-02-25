/**
 * Управление статистикой отчетов об ошибках.
 */

import { debugCritical } from './TaskReporterLogger';

export class ReportStatisticsManager {
    constructor(reports) {
        this.reports = reports;
    }

    /**
     * Получение статистики отчетов
     */
    getReportStats() {
        try {
            const stats = {
                total: this.reports.length,
                byStatus: {},
                byPriority: {},
                bySource: {},
                byPlugin: {},
                recent: this.reports.filter(r => {
                    const reportDate = new Date(r.timestamp);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return reportDate >= weekAgo;
                }).length
            };

            this.reports.forEach(report => {
                // По статусу
                stats.byStatus[report.status] = (stats.byStatus[report.status] || 0) + 1;

                // По приоритету
                stats.byPriority[report.priority] = (stats.byPriority[report.priority] || 0) + 1;

                // По источнику
                const source = report.context.source || 'unknown';
                stats.bySource[source] = (stats.bySource[source] || 0) + 1;

                // По плагину
                if (report.context.plugin) {
                    stats.byPlugin[report.context.plugin] = (stats.byPlugin[report.context.plugin] || 0) + 1;
                }
            });

            debugCritical('Статистика отчетов получена', stats);

            return stats;
        } catch (error) {
            debugCritical('Ошибка получения статистики отчетов:', {
                error: error.message,
                stack: error.stack
            });
            return {
                total: 0,
                byStatus: {},
                byPriority: {},
                bySource: {},
                byPlugin: {},
                recent: 0
            };
        }
    }
}
