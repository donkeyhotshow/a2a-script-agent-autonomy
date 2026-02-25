/**
 * Управление резервным копированием и восстановлением конфигураций.
 */

import { promises as fs } from 'fs';
import * as path from 'path';

export class ConfigurationBackupManager {
    constructor(backupDir, maxBackups, compressBackups, includeBackupMetadata, logger, fs, path, configDir = null) {
        this.backupDir = backupDir;
        this.maxBackups = maxBackups;
        this.compressBackups = compressBackups;
        this.includeBackupMetadata = includeBackupMetadata;
        this.logger = logger;
        this.fs = fs;
        this.path = path;
        this.configDir = configDir;
    }

    /**
     * Создает резервную копию конфигураций
     */
    async createBackup(configName, configData) {
        if (typeof window !== 'undefined') {
            this.logger.warn('Создание резервных копий не поддерживается в браузере.');
            return null;
        }
        
        try {
            const backupId = this.generateBackupId();
            const backupPath = this.path.join(this.backupDir, backupId);
            
            // Создаем директорию для бэкапа
            await this.fs.mkdir(backupPath, { recursive: true });
            
            // Сохраняем конфигурацию
            const configPath = this.path.join(backupPath, `${configName}.json`);
            await this.fs.writeFile(configPath, JSON.stringify(configData, null, 2));
            
            // Создаем метаданные бэкапа
            const metadata = {
                timestamp: new Date().toISOString(),
                version: '1.0',
                configs: [configName],
                totalSize: await this.getFileSize(configPath),
                checksum: await this.calculateChecksum(configData),
                environment: process.env.NODE_ENV || 'development',
                user: process.env.USER || 'unknown'
            };
            
            // Сохраняем метаданные
            const metadataPath = this.path.join(backupPath, 'metadata.json');
            await this.fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));
            
            return {
                id: backupId,
                path: backupPath,
                metadata
            };
        } catch (error) {
            this.logger.error('Ошибка создания резервной копии:', error.message);
            return null;
        }
    }

    /**
     * Восстанавливает конфигурации из резервной копии
     */
    async restoreBackup(configName, backupPath) {
        if (typeof window !== 'undefined') {
            this.logger.warn('Восстановление резервных копий не поддерживается в браузере.');
            return false;
        }
        
        try {
            const configPath = this.path.join(backupPath, `${configName}.json`);
            
            if (!await this.fileExists(configPath)) {
                this.logger.error(`Конфигурация ${configName} не найдена в резервной копии`);
                return false;
            }
            
            const configData = await this.readJsonFile(configPath);
            this.logger.info(`Восстановление конфигурации ${configName} из резервной копии`);
            
            // Восстанавливаем конфигурацию в файловую систему
            const restorePath = this.path.join(this.configDir || process.cwd(), `${configName}.json`);
            await this.fs.writeFile(restorePath, JSON.stringify(configData, null, 2));
            
            this.logger.info(`Конфигурация ${configName} восстановлена в ${restorePath}`);
            return true;
        } catch (error) {
            this.logger.error(`Ошибка восстановления конфигурации ${configName}:`, error.message);
            return false;
        }
    }

    /**
     * Получает список доступных резервных копий
     */
    async listBackups() {
        if (typeof window !== 'undefined') {
            this.logger.warn('Получение списка резервных копий не поддерживается в браузере.');
            return [];
        }

        const backupDir = this.backupDir;
        try {
            const items = await this.fs.readdir(backupDir, { withFileTypes: true });
            const backups = [];
            for (const item of items) {
                const itemPath = this.path.join(backupDir, item.name);
                let metadata;
                let stats;
                try {
                    stats = await this.fs.stat(itemPath);
                } catch (e) {
                    this.logger.warn(`Не удалось получить статистику для ${itemPath}:`, e.message);
                    continue;
                }

                if (item.isDirectory() || item.name.endsWith('.tar.gz') || item.name.endsWith('.zip')) {
                    const metadataPath = item.isDirectory() ? this.path.join(itemPath, 'metadata.json') : '';
                    if (metadataPath && await this.fileExists(metadataPath)) {
                        metadata = await this.readJsonFile(metadataPath);
                    } else {
                        metadata = {
                            timestamp: stats.mtime.toISOString(),
                            version: 'unknown',
                            configs: [],
                            totalSize: stats.size,
                            checksum: '',
                            environment: 'unknown',
                            user: 'unknown'
                        };
                    }
                    backups.push({
                        id: item.name,
                        path: itemPath,
                        metadata,
                        size: stats.size,
                        createdAt: stats.mtime
                    });
                }
            }
            return backups.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        } catch (error) {
            if (error.code === 'ENOENT') {
                return []; // Директория бэкапов не существует
            }
            this.logger.error('Ошибка получения списка резервных копий:', error.message);
            throw error;
        }
    }

    /**
     * Удаляет резервную копию
     */
    async deleteBackup(backupId) {
        this.logger.warn('Удаление резервных копий не поддерживается в браузере.');
        return false;
    }

    generateBackupId() {
        return `browser-backup-${Math.random().toString(36).substring(2, 8)}`;
    }

    calculateChecksum(data) {
        // В браузере используем более простую хеш-функцию
        const dataString = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < dataString.length; i++) {
            const char = dataString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0; // Convert to 32bit integer
        }
        return `browser-checksum-${Math.abs(hash).toString(36)}`;
    }

    async compressBackup(backupPath, backupId) {
        this.logger.warn('Сжатие резервных копий не поддерживается в браузере.');
        return backupPath;
    }

    async extractBackup(backupPath) {
        this.logger.warn('Распаковка резервных копий не поддерживается в браузере.');
        return this.path.dirname(backupPath);
    }

    async getFileSize(filePath) {
        if (typeof window !== 'undefined') {
            this.logger.warn('Получение размера файла не поддерживается в браузере.');
            return 0;
        }
        
        try {
            const stats = await this.fs.stat(filePath);
            return stats.size;
        } catch (error) {
            return 0;
        }
    }

    async fileExists(filePath) {
        if (typeof window !== 'undefined') {
            this.logger.warn('Проверка существования файла не поддерживается в браузере.');
            return false;
        }
        
        try {
            await this.fs.access(filePath);
            return true;
        } catch (error) {
            return false;
        }
    }

    async readJsonFile(filePath) {
        if (typeof window !== 'undefined') {
            this.logger.warn('Чтение JSON файла не поддерживается в браузере.');
            return {};
        }
        
        try {
            const content = await this.fs.readFile(filePath, 'utf8');
            return JSON.parse(content);
        } catch (error) {
            this.logger.error(`Ошибка чтения JSON файла ${filePath}:`, error.message);
            return {};
        }
    }

    async cleanupOldBackups() {
        this.logger.warn('Очистка старых резервных копий не поддерживается в браузере.');
    }
}
