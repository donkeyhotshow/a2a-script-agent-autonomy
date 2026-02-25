const { FileSystemUtils } = require('@libs/app-framework/core/file-utils/file-system/index.js');
const fs = require('fs');

class WorkDirectoryManager {
    constructor(logger = console) {
        this.fileSystem = new FileSystemUtils(logger);
        this.logger = logger;
    }

    /**
     * Создает рабочую директорию если её нет
     */
    async createWorkDirectory(workDirectoryPath) {
        if (!fs.existsSync(workDirectoryPath)) {
            await this.fileSystem.ensureDir(workDirectoryPath);
            this.logger.log(`📁 Создана папка work: ${workDirectoryPath}`);
        }
    }

    /**
     * Очищает рабочую директорию от файлов .md и .json
     */
    async cleanupWorkDirectory(workDirectoryPath) {
        try {
            const files = fs.readdirSync(workDirectoryPath);
            for (const file of files) {
                if (file.endsWith('.md') || file.endsWith('.json')) {
                    fs.unlinkSync(this.fileSystem.join(workDirectoryPath, file));
                }
            }
            this.logger.log(`🧹 Папка work очищена: ${workDirectoryPath}`);
        } catch (error) {
            this.logger.log(`⚠️  Не удалось очистить папку work: ${error.message}`);
        }
    }

    /**
     * Полная инициализация рабочей директории
     */
    async initializeWorkDirectory(workDirectoryPath) {
        await this.createWorkDirectory(workDirectoryPath);
        await this.cleanupWorkDirectory(workDirectoryPath);
    }
}

export { WorkDirectoryManager };
