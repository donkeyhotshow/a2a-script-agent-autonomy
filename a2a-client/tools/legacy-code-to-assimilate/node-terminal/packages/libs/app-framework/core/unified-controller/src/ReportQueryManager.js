/**
 * Управление запросами и фильтрацией отчетов об ошибках.
 */

import { debugCritical } from './TaskReporterLogger';

export class ReportQueryManager {
    constructor(reports) {
        this.reports = reports;
    }

    /**
     * Получение отчетов по фильтрам
     */
    getReports(filters = {}) {
        try {
            let filteredReports = [...this.reports];

            // Фильтр по статусу
            if (filters.status) {
                filteredReports = filteredReports.filter(r => r.status === filters.status);
            }

            // Фильтр по приоритету
            if (filters.priority) {
                filteredReports = filteredReports.filter(r => r.priority === filters.priority);
            }

            // Фильтр по источнику
            if (filters.source) {
                filteredReports = filteredReports.filter(r => r.context.source === filters.source);
            }

            // Фильтр по плагину
            if (filters.plugin) {
                filteredReports = filteredReports.filter(r => r.context.plugin === filters.plugin);
            }

            // Фильтр по дате
            if (filters.since) {
                const sinceDate = new Date(filters.since);
                filteredReports = filteredReports.filter(r => new Date(r.timestamp) >= sinceDate);
            }

            // Сортировка
            if (filters.sortBy) {
                filteredReports.sort((a, b) => {
                    switch (filters.sortBy) {
                        case 'timestamp':
                            return new Date(b.timestamp) - new Date(a.timestamp);
                        case 'priority':
                            const priorityOrder = { critical: 3, high: 2, medium: 1, low: 0 };
                            return priorityOrder[b.priority] - priorityOrder[a.priority];
                        default:
                            return 0;
                    }
                });
            }

            debugCritical('Получены отфильтрованные отчеты', {
                total: this.reports.length,
                filtered: filteredReports.length,
                filters: filters
            });

            return filteredReports;
        } catch (error) {
            debugCritical('Ошибка получения отчетов:', {
                error: error.message,
                stack: error.stack
            });
            return [];
        }
    }
}
