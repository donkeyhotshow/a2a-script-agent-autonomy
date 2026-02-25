const fsOriginal = require('fs');
const path = require('path');
const { safeParse } = require('@mcp/core-json-utils');

class DataBackupAndRestore {
    constructor(dataManager, logger, errorHandler) {
        this.dataManager = dataManager;
        this.logger = logger;
        this.errorHandler = errorHandler;
    }

    async getInfo(key) {
        try {
            const filePath = this.dataManager.getFilePath(key);

            if (!fsOriginal.existsSync(filePath)) {
                return null;
            }

            const content = fsOriginal.readFileSync(filePath, 'utf8');
            const parseResult = safeParse(content);
            if (!parseResult.success) {
                this.logger.error('Failed to parse data file for info', { key, error: parseResult.error });
                return null;
            }
            const data = parseResult.data;
            const stats = fsOriginal.statSync(filePath);

            return {
                key,
                filePath,
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime,
                metadata: data.metadata,
                isExpired: data.metadata.expires ? 
                    Date.now() > new Date(data.metadata.expires).getTime() : false
            };

        } catch (error) {
            this.errorHandler.handle(error, 'DataBackupAndRestore.getInfo');
            return null;
        }
    }

    async getAllInfo() {
        try {
            const keys = await this.dataManager.keys();
            const info = [];

            for (const key of keys) {
                const keyInfo = await this.getInfo(key);
                if (keyInfo) {
                    info.push(keyInfo);
                }
            }

            return info;

        } catch (error) {
            this.errorHandler.handle(error, 'DataBackupAndRestore.getAllInfo');
            return [];
        }
    }

    async backup(backupPath = null) {
        try {
            if (!backupPath) {
                backupPath = path.join(this.dataManager.dataDir, `backup_${Date.now()}.json`);
            }

            const allData = {};
            const keys = await this.dataManager.keys();

            for (const key of keys) {
                const value = await this.dataManager.get(key);
                const info = await this.getInfo(key);
                allData[key] = {
                    value,
                    info
                };
            }

            const backup = {
                timestamp: new Date().toISOString(),
                totalKeys: keys.length,
                data: allData
            };

            fsOriginal.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

            this.logger.info('Backup created successfully', { 
                backupPath, 
                totalKeys: keys.length 
            });

            return {
                success: true,
                backupPath,
                totalKeys: keys.length
            };

        } catch (error) {
            this.errorHandler.handle(error, 'DataBackupAndRestore.backup');
            throw error;
        }
    }

    async restore(backupPath) {
        try {
            if (!fsOriginal.existsSync(backupPath)) {
                throw new Error(`Backup file not found: ${backupPath}`);
            }

            const content = fsOriginal.readFileSync(backupPath, 'utf8');
            const parseResult = safeParse(content);
            if (!parseResult.success) {
                throw new Error(`Failed to parse backup file: ${parseResult.error}`);
            }
            const backup = parseResult.data;

            // Очищаем текущие данные
            await this.dataManager.clear();

            // Восстанавливаем данные
            let restoredCount = 0;
            for (const [key, item] of Object.entries(backup.data)) {
                try {
                    await this.dataManager.set(key, item.value);
                    restoredCount++;
                } catch (error) {
                    this.logger.warn(`Failed to restore key ${key}:`, error.message);
                }
            }

            this.logger.info('Backup restored successfully', { 
                backupPath, 
                restoredCount,
                totalKeys: backup.totalKeys 
            });

            return {
                success: true,
                backupPath,
                restoredCount,
                totalKeys: backup.totalKeys
            };

        } catch (error) {
            this.errorHandler.handle(error, 'DataBackupAndRestore.restore');
            throw error;
        }
    }
}

export { DataBackupAndRestore };
