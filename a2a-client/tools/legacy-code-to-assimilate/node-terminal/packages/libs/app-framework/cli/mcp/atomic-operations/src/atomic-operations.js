const fs = require('fs-extra');
const path = require('path');
const { LoggerCore } = require('../../../logging-reporting/core-logger/index.js'); // Updated path after libs reorganization
const ErrorHandler = require('../../../core/error-handler/index.js');

class AtomicOperations {
    constructor(options = {}) {
        // Инициализируем логгер с базовой конфигурацией
        this.logger = options.logger || new LoggerCore({
            level: 'info',
            console: { enabled: true },
            file: { enabled: false }
        });
        
        // Инициализируем обработчик ошибок с логгером
        this.errorHandler = new ErrorHandler({ logger: this.logger });
        
        this.backupDir = path.join(process.cwd(), 'backup');
        this.ensureBackupDir();
    }

    ensureBackupDir() {
        try {
            if (!fs.existsSync(this.backupDir)) {
                fs.mkdirSync(this.backupDir, { recursive: true });
            }
        } catch (error) {
            this.logger.error('Failed to create backup directory:', error.message);
        }
    }

    async createDirectory(dirPath) {
        this.logger.info(`Создание директории: ${dirPath}`);
        await fs.ensureDir(dirPath);
    }

    async createFile(filePath, content = '') {
        this.logger.info(`Создание файла: ${filePath}`);
        await fs.writeFile(filePath, content, 'utf8');
    }

    async copyFile(fromPath, toPath) {
        this.logger.info(`Копирование файла из ${fromPath} в ${toPath}`);
        await fs.copy(fromPath, toPath);
    }

    async moveFile(fromPath, toPath) {
        this.logger.info(`Перемещение файла из ${fromPath} в ${toPath}`);
        await fs.move(fromPath, toPath);
    }

    async removeFile(filePath) {
        this.logger.info(`Удаление файла: ${filePath}`);
        await fs.remove(filePath); // fs-extra remove может удалять и файлы, и папки
    }

    async removeDirectory(dirPath) {
        this.logger.info(`Удаление директории: ${dirPath}`);
        await fs.remove(dirPath); // fs-extra remove может удалять и файлы, и папки
    }

    async removeByPattern(basePath, pattern) {
        this.logger.info(`Удаление файлов по шаблону '${pattern}' в директории: ${basePath}`);
        const files = await fs.readdir(basePath);
        const regex = new RegExp(pattern.replace(/\*/g, '.*'));

        for (const file of files) {
            if (regex.test(file)) {
                const filePath = path.join(basePath, file);
                await fs.remove(filePath);
                this.logger.info(`Удален файл/директория по шаблону: ${filePath}`);
            }
        }
    }

    async removeDirectoryIfEmpty(dirPath) {
        this.logger.info(`Удаление директории, если пуста: ${dirPath}`);
        try {
            const files = await fs.readdir(dirPath);
            if (files.length === 0) {
                await fs.remove(dirPath);
                this.logger.info(`Пустая директория удалена: ${dirPath}`);
            }
        } catch (error) {
            this.logger.warn(`Не удалось удалить пустую директорию ${dirPath}: ${error.message}`);
        }
    }

    async changePermissions(filePath, mode) {
        this.logger.info(`Изменение прав доступа для ${filePath} на ${mode}`);
        await fs.chmod(filePath, mode);
    }

    async createSymlink(target, link) {
        this.logger.info(`Создание символической ссылки: ${link} -> ${target}`);
        await fs.symlink(target, link);
    }

    async atomicWrite(filePath, content, options = {}) {
        const {
            encoding = 'utf8',
            createBackup = true,
            validateContent = null
        } = options;

        try {
            this.logger.info('Starting atomic write operation', { filePath });

            // Валидация контента если предоставлена функция
            if (validateContent && typeof validateContent === 'function') {
                const isValid = await validateContent(content);
                if (!isValid) {
                    throw new Error('Content validation failed');
                }
            }

            // Создаем временный файл
            const tempPath = `${filePath}.tmp.${Date.now()}`;
            
            // Записываем во временный файл
            fs.writeFileSync(tempPath, content, encoding);

            // Создаем бэкап если нужно
            let backupPath = null;
            if (createBackup && fs.existsSync(filePath)) {
                // Убедимся, что директория для бэкапов существует
                this.ensureBackupDir();

                backupPath = path.join(this.backupDir, `${path.basename(filePath)}.backup.${Date.now()}`);
                fs.copyFileSync(filePath, backupPath);
            }

            // Атомарно переименовываем временный файл
            fs.renameSync(tempPath, filePath);

            this.logger.info('Atomic write completed successfully', { 
                filePath, 
                backupPath,
                contentLength: content.length 
            });

            return {
                success: true,
                filePath,
                backupPath,
                contentLength: content.length
            };

        } catch (error) {
            // Очищаем временный файл если он существует
            const tempPath = `${filePath}.tmp.${Date.now()}`;
            if (fs.existsSync(tempPath)) {
                try {
                    fs.unlinkSync(tempPath);
                } catch (cleanupError) {
                    this.logger.warn('Failed to cleanup temp file:', cleanupError.message);
                }
            }

            this.errorHandler.handle(error, 'AtomicOperations.atomicWrite');
            throw error;
        }
    }

    async atomicCopy(sourcePath, targetPath, options = {}) {
        const {
            createBackup = true,
            overwrite = false
        } = options;

        try {
            this.logger.info('Starting atomic copy operation', { sourcePath, targetPath });

            if (!fs.existsSync(sourcePath)) {
                throw new Error(`Source file not found: ${sourcePath}`);
            }

            if (fs.existsSync(targetPath) && !overwrite) {
                throw new Error(`Target file already exists: ${targetPath}`);
            }

            // Создаем бэкап если нужно
            let backupPath = null;
            if (createBackup && fs.existsSync(targetPath)) {
                backupPath = path.join(this.backupDir, `${path.basename(targetPath)}.backup.${Date.now()}`);
                fs.copyFileSync(targetPath, backupPath);
            }

            // Создаем временный файл
            const tempPath = `${targetPath}.tmp.${Date.now()}`;
            
            // Копируем во временный файл
            fs.copyFileSync(sourcePath, tempPath);

            // Атомарно переименовываем
            fs.renameSync(tempPath, targetPath);

            this.logger.info('Atomic copy completed successfully', { 
                sourcePath, 
                targetPath, 
                backupPath 
            });

            return {
                success: true,
                sourcePath,
                targetPath,
                backupPath
            };

        } catch (error) {
            // Очищаем временный файл если он существует
            const tempPath = `${targetPath}.tmp.${Date.now()}`;
            if (fs.existsSync(tempPath)) {
                try {
                    fs.unlinkSync(tempPath);
                } catch (cleanupError) {
                    this.logger.warn('Failed to cleanup temp file:', cleanupError.message);
                }
            }

            this.errorHandler.handle(error, 'AtomicOperations.atomicCopy');
            throw error;
        }
    }

    async atomicMove(sourcePath, targetPath, options = {}) {
        const {
            createBackup = true,
            overwrite = false
        } = options;

        try {
            this.logger.info('Starting atomic move operation', { sourcePath, targetPath });

            if (!fs.existsSync(sourcePath)) {
                throw new Error(`Source file not found: ${sourcePath}`);
            }

            if (fs.existsSync(targetPath) && !overwrite) {
                throw new Error(`Target file already exists: ${targetPath}`);
            }

            // Создаем бэкап если нужно
            let backupPath = null;
            if (createBackup && fs.existsSync(targetPath)) {
                backupPath = path.join(this.backupDir, `${path.basename(targetPath)}.backup.${Date.now()}`);
                fs.copyFileSync(targetPath, backupPath);
            }

            // Создаем временный файл
            const tempPath = `${targetPath}.tmp.${Date.now()}`;
            
            // Копируем во временный файл
            fs.copyFileSync(sourcePath, tempPath);

            // Атомарно переименовываем
            fs.renameSync(tempPath, targetPath);

            // Удаляем исходный файл
            fs.unlinkSync(sourcePath);

            this.logger.info('Atomic move completed successfully', { 
                sourcePath, 
                targetPath, 
                backupPath 
            });

            return {
                success: true,
                sourcePath,
                targetPath,
                backupPath
            };

        } catch (error) {
            // Очищаем временный файл если он существует
            const tempPath = `${targetPath}.tmp.${Date.now()}`;
            if (fs.existsSync(tempPath)) {
                try {
                    fs.unlinkSync(tempPath);
                } catch (cleanupError) {
                    this.logger.warn('Failed to cleanup temp file:', cleanupError.message);
                }
            }

            this.errorHandler.handle(error, 'AtomicOperations.atomicMove');
            throw error;
        }
    }

    async atomicDelete(filePath, options = {}) {
        const {
            createBackup = true,
            softDelete = false
        } = options;

        try {
            this.logger.info('Starting atomic delete operation', { filePath });

            if (!fs.existsSync(filePath)) {
                throw new Error(`File not found: ${filePath}`);
            }

            let backupPath = null;

            if (createBackup) {
                backupPath = path.join(this.backupDir, `${path.basename(filePath)}.deleted.${Date.now()}`);
                fs.copyFileSync(filePath, backupPath);
            }

            if (softDelete) {
                // Переименовываем файл с префиксом .deleted
                const deletedPath = `${filePath}.deleted.${Date.now()}`;
                fs.renameSync(filePath, deletedPath);
                
                this.logger.info('Soft delete completed successfully', { 
                    filePath, 
                    deletedPath, 
                    backupPath 
                });

                return {
                    success: true,
                    filePath,
                    deletedPath,
                    backupPath,
                    softDelete: true
                };
            } else {
                // Полное удаление
                fs.unlinkSync(filePath);
                
                this.logger.info('Hard delete completed successfully', { 
                    filePath, 
                    backupPath 
                });

                return {
                    success: true,
                    filePath,
                    backupPath,
                    softDelete: false
                };
            }

        } catch (error) {
            this.errorHandler.handle(error, 'AtomicOperations.atomicDelete');
            throw error;
        }
    }

    async rollbackOperation(backupPath, targetPath) {
        try {
            this.logger.info('Starting rollback operation', { backupPath, targetPath });

            if (!fs.existsSync(backupPath)) {
                throw new Error(`Backup file not found: ${backupPath}`);
            }

            // Создаем бэкап текущего файла если он существует
            let currentBackup = null;
            if (fs.existsSync(targetPath)) {
                currentBackup = path.join(this.backupDir, `${path.basename(targetPath)}.rollback.${Date.now()}`);
                fs.copyFileSync(targetPath, currentBackup);
            }

            // Восстанавливаем из бэкапа
            fs.copyFileSync(backupPath, targetPath);

            this.logger.info('Rollback completed successfully', { 
                backupPath, 
                targetPath, 
                currentBackup 
            });

            return {
                success: true,
                backupPath,
                targetPath,
                currentBackup
            };

        } catch (error) {
            this.errorHandler.handle(error, 'AtomicOperations.rollbackOperation');
            throw error;
        }
    }

    listBackups() {
        try {
            const files = fs.readdirSync(this.backupDir);
            const backups = files
                .filter(file => file.includes('.backup.') || file.includes('.deleted.') || file.includes('.rollback.'))
                .map(file => {
                    const filePath = path.join(this.backupDir, file);
                    const stats = fs.statSync(filePath);
                    return {
                        name: file,
                        path: filePath,
                        size: stats.size,
                        created: stats.birthtime,
                        type: file.includes('.backup.') ? 'backup' : 
                              file.includes('.deleted.') ? 'deleted' : 'rollback'
                    };
                });

            return backups;

        } catch (error) {
            this.errorHandler.handle(error, 'AtomicOperations.listBackups');
            return [];
        }
    }
}

export default AtomicOperations;
