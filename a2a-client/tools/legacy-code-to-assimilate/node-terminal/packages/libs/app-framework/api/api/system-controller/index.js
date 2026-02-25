const express = require('express');
const path = require('path');
// const fs = require('fs-extra'); // Удален старый импорт
const { ApiUtils } = require('../../utils/api'); // Обновлен импорт
const { LoggingUtils } = require('../../utils/logging'); // Обновлен импорт для LoggingUtils
const { FileSystemUtils } = require('../../utils/file-system'); // Обновлен импорт для FileSystemUtils
const { ConfigurationUtils } = require('../../utils/configuration'); // Обновлен импорт для ConfigurationUtils
const { ProcessManagementUtils } = require('../../utils/process-management'); // Обновлен импорт для ProcessManagementUtils
const { CacheUtils } = require('../../utils/cache'); // Новый импорт для CacheUtils
const { SharedUtils } = require('../../utils/shared'); // Новый импорт для SharedUtils

class SystemController {
    constructor(options = {}) {
        this.logger = options.logger || new LoggingUtils();
        this.processDaemon = options.processDaemon || new ProcessManagementUtils({ logger: this.logger });
        this.cacheManager = options.cacheManager || new CacheUtils({ logger: this.logger });
        this.configManager = options.configManager || new ConfigurationUtils({ logger: this.logger });
        this.fileSystemUtils = options.fileSystemUtils || new FileSystemUtils({ logger: this.logger });
        this.sharedUtils = options.sharedUtils || new SharedUtils();

        // Зависимости, которые теперь будут методами экземпляров классов
        this.systemPaths = options.systemPaths || this.fileSystemUtils; // FileSystemUtils теперь предоставляет методы для путей
        this.getLogFiles = options.getLogFiles || this.logger.listLogFiles.bind(this.logger); // Метод LoggingUtils
        this.getLogFileContent = options.getLogFileContent || this.logger.readLogFile.bind(this.logger); // Метод LoggingUtils
        this.getSystemInfo = options.getSystemInfo || this.sharedUtils.getSystemInfo.bind(this.sharedUtils); // Метод SharedUtils

        if (!this.processDaemon) this.logger.warn('SystemController: ProcessDaemon не предоставлен. Будет использоваться экземпляр по умолчанию.');
        if (!this.cacheManager) this.logger.warn('SystemController: CacheManager не предоставлен. Будет использоваться экземпляр по умолчанию.');
        if (!this.configManager) this.logger.warn('SystemController: ConfigManager не предоставлен. Будет использоваться экземпляр по умолчанию.');
        if (!this.systemPaths) this.logger.warn('SystemController: systemPaths не предоставлен. Будет использоваться FileSystemUtils.');
        if (!this.getLogFiles) this.logger.warn('SystemController: getLogFiles не предоставлен. Будет использоваться LoggingUtils.');
        if (!this.getLogFileContent) this.logger.warn('SystemController: getLogFileContent не предоставлен. Будет использоваться LoggingUtils.');
        if (!this.getSystemInfo) this.logger.warn('SystemController: getSystemInfo не предоставлен. Будет использоваться SharedUtils.');
    }

    /**
     * Возвращает Express роутер с системными API
     * @returns {express.Router}
     */
    getRouter() {
        const router = express.Router();

        // Получить логи системы
        router.get('/logs', async (req, res) => {
            try {
                if (!this.getLogFiles || !this.systemPaths) {
                    return ApiUtils.errorResponse(res, 500, 'Функциональность логов недоступна');
                }
                const logsPath = this.systemPaths.getLogsDirectory(); // Используем метод FileSystemUtils
                const logs = await this.getLogFiles(logsPath);
                ApiUtils.successResponse(res, { logs: logs, total: logs.length });
            } catch (error) {
                this.logger.error('Ошибка при получении логов:', error);
                ApiUtils.errorResponse(res, 500, 'Ошибка при получении логов');
            }
        });

        // Получить содержимое лога
        router.get('/logs/:filename', async (req, res) => {
            try {
                if (!this.getLogFileContent || !this.systemPaths) {
                    return ApiUtils.errorResponse(res, 500, 'Функциональность логов недоступна');
                }
                const { filename } = req.params;
                const logsPath = this.systemPaths.getLogsDirectory();
                const logPath = path.join(logsPath, filename);

                if (!await this.fileSystemUtils.pathExists(logPath)) { // Используем FileSystemUtils
                    return ApiUtils.errorResponse(res, 404, 'Лог файл не найден');
                }

                const logContent = await this.getLogFileContent(logsPath, filename);
                ApiUtils.successResponse(res, logContent);
            } catch (error) {
                this.logger.error('Ошибка при получении содержимого лога:', error);
                ApiUtils.errorResponse(res, 500, 'Ошибка при получении содержимого лога');
            }
        });

        // Получить информацию о кэше
        router.get('/cache', async (req, res) => {
            try {
                if (!this.cacheManager) {
                    return ApiUtils.errorResponse(res, 500, 'Функциональность кэша недоступна');
                }
                const cacheInfo = this.cacheManager.getStats();
                ApiUtils.successResponse(res, { ...cacheInfo, path: this.systemPaths ? this.systemPaths.getCacheDirectory() : 'N/A' }); // Используем FileSystemUtils
            } catch (error) {
                this.logger.error('Ошибка при получении информации о кэше:', error);
                ApiUtils.errorResponse(res, 500, 'Ошибка при получении информации о кэше');
            }
        });

        // Очистить кэш
        router.post('/cache/clear', async (req, res) => {
            try {
                if (!this.cacheManager) {
                    return ApiUtils.errorResponse(res, 500, 'Функциональность кэша недоступна');
                }
                this.cacheManager.clear();
                ApiUtils.successResponse(res, null, 'Кэш очищен');
            } catch (error) {
                this.logger.error('Ошибка при очистке кэша:', error);
                ApiUtils.errorResponse(res, 500, 'Ошибка при очистке кэша');
            }
        });

        // Получить системную информацию
        router.get('/info', async (req, res) => {
            try {
                if (!this.getSystemInfo) {
                    return ApiUtils.errorResponse(res, 500, 'Функциональность системной информации недоступна');
                }
                const systemInfo = this.getSystemInfo();
                if (this.configManager) {
                    systemInfo.environment = this.configManager.get('server.environment');
                }
                ApiUtils.successResponse(res, systemInfo);
            } catch (error) {
                this.logger.error('Ошибка при получении системной информации:', error);
                ApiUtils.errorResponse(res, 500, 'Ошибка при получении системной информации');
            }
        });

        // Выполнить системную команду
        router.post('/execute', async (req, res) => {
            try {
                if (!this.processDaemon) {
                    return ApiUtils.errorResponse(res, 500, 'Функциональность выполнения команд недоступна');
                }
                const { command } = req.body;

                if (!command) {
                    return ApiUtils.errorResponse(res, 400, 'Команда обязательна');
                }

                // Используем ProcessManagementUtils для выполнения команды
                const result = await this.processDaemon.executeCommand(command, { cwd: this.systemPaths ? this.systemPaths.getCurrentWorkingDirectory() : process.cwd() }); // Обновлен метод

                if (!result.success) {
                    this.logger.error(`Ошибка выполнения команды: ${command}`, result.error);
                    return ApiUtils.errorResponse(res, 500, 'Ошибка выполнения команды');
                }

                ApiUtils.successResponse(res, result.output, 'Команда выполнена успешно');
            } catch (error) {
                this.logger.error('Ошибка при выполнении команды:', error);
                ApiUtils.errorResponse(res, 500, 'Ошибка при выполнении команды');
            }
        });

        return router;
    }
}

export default SystemController;
