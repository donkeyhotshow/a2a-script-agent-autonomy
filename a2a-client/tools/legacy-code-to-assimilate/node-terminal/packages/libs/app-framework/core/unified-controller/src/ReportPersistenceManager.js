/**
 * Управление сохранением и загрузкой отчетов об ошибках.
 */

import { debugCritical } from './TaskReporterLogger';

export class ReportPersistenceManager {
    constructor(reports) {
        this.reports = reports;
    }

    /**
     * Загрузка существующих отчетов
     */
    async loadReports() {
        try {
            debugCritical('Загрузка существующих отчетов');

            // В браузерной среде используем localStorage
            if (typeof window !== 'undefined') {
                const stored = localStorage.getItem('task_reports');
                if (stored) {
                    this.reports = JSON.parse(stored);
                    debugCritical(`Загружено ${this.reports.length} отчетов из localStorage`);
                }
            }

            // В Node.js среде используем файловую систему
            if (typeof process !== 'undefined' && process.versions && process.versions.node) {
                try {
                    // Динамический импорт для избежания проблем с браузером
                    const fs = await import('fs');
                    const path = await import('path');
                    const reportsPath = path.default.join(process.cwd(), 'data', 'task-reports.json');
                    
                    if (fs.default.existsSync(reportsPath)) {
                        const data = fs.default.readFileSync(reportsPath, 'utf8');
                        this.reports = JSON.parse(data);
                        debugCritical(`Загружено ${this.reports.length} отчетов из файла`);
                    }
                } catch (error) {
                    debugCritical('Ошибка загрузки отчетов из файла:', {
                        error: error.message
                    });
                }
            }
        } catch (error) {
            debugCritical('Ошибка загрузки отчетов:', {
                error: error.message,
                stack: error.stack
            });
        }
    }

    /**
     * Сохранение отчетов
     */
    async saveReports() {
        try {
            debugCritical('Сохранение отчетов');

            // В браузерной среде используем localStorage
            if (typeof window !== 'undefined') {
                localStorage.setItem('task_reports', JSON.stringify(this.reports));
                debugCritical(`Сохранено ${this.reports.length} отчетов в localStorage`);
            }

            // В Node.js среде используем файловую систему
            if (typeof process !== 'undefined' && process.versions && process.versions.node) {
                try {
                    // Динамический импорт для избежания проблем с браузером
                    const fs = await import('fs');
                    const path = await import('path');
                    const dataDir = path.default.join(process.cwd(), 'data');
                    const reportsPath = path.default.join(dataDir, 'task-reports.json');
                    
                    // Создаем директорию если не существует
                    if (!fs.default.existsSync(dataDir)) {
                        fs.default.mkdirSync(dataDir, { recursive: true });
                    }
                    
                    fs.default.writeFileSync(reportsPath, JSON.stringify(this.reports, null, 2));
                    debugCritical(`Сохранено ${this.reports.length} отчетов в файл`);
                } catch (error) {
                    debugCritical('Ошибка сохранения отчетов в файл:', {
                        error: error.message
                    });
                }
            }
        } catch (error) {
            debugCritical('Ошибка сохранения отчетов:', {
                error: error.message,
                stack: error.stack
            });
        }
    }

    /**
     * Очистка старых отчетов
     */
    async cleanupOldReports(daysToKeep = 30) {
        try {
            debugCritical('Очистка старых отчетов', { daysToKeep });

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            const initialCount = this.reports.length;
            this.reports = this.reports.filter(report => {
                return new Date(report.timestamp) >= cutoffDate;
            });

            const removedCount = initialCount - this.reports.length;
            await this.saveReports();

            debugCritical('Очистка старых отчетов завершена', {
                removed: removedCount,
                remaining: this.reports.length
            });

            return removedCount;
        } catch (error) {
            debugCritical('Ошибка очистки старых отчетов:', {
                error: error.message,
                stack: error.stack
            });
            return 0;
        }
    }
}
