const fs = require('fs');
const path = require('path');
const { LoggerCore, errorHandler } = require('../tests/mocks');

class ArchiveManager {
    constructor(options = {}) {
        this.logger = options.logger || new LoggerCore();
        this.errorHandler = errorHandler;
        this.archiveDir = path.join(process.cwd(), 'archive');
        this.ensureArchiveDir();
    }

    ensureArchiveDir() {
        try {
            if (!fs.existsSync(this.archiveDir)) {
                fs.mkdirSync(this.archiveDir, { recursive: true });
                this.logger.info('Created archive directory:', this.archiveDir);
            }
            return true;
        } catch (error) {
            this.logger.error('Failed to create archive directory:', error.message);
            return false;
        }
    }

    async archiveFiles(files, options = {}) {
        const {
            archiveName = `archive_${Date.now()}`,
            compression = 'zip',
            includeMetadata = true
        } = options;

        try {
            this.logger.info('Starting archive operation', {
                files: files.length,
                archiveName,
                compression
            });

            const archivePath = path.join(this.archiveDir, `${archiveName}.${compression}`);

            // Создаем метаданные архива
            const metadata = {
                created: new Date().toISOString(),
                files: files.map(file => ({
                    path: file,
                    exists: fs.existsSync(file),
                    size: fs.existsSync(file) ? fs.statSync(file).size : 0
                })),
                totalFiles: files.length,
                compression
            };

            // Собираем только реально существующие файлы
            const existingFiles = files.filter(file => fs.existsSync(file));
            const archiveContent = {
                metadata: includeMetadata ? metadata : null,
                files: []
            };

            for (const file of existingFiles) {
                try {
                    const content = fs.readFileSync(file, 'utf8');
                    archiveContent.files.push({
                        path: file,
                        content: content,
                        size: content.length
                    });
                } catch (error) {
                    this.logger.warn(`Failed to read file ${file}:`, error.message);
                }
            }

            // Если нет ни одного файла — архив не создаем
            if (archiveContent.files.length === 0) {
                this.logger.error('No existing files to archive. Archive not created.');
                return {
                    success: false,
                    archivePath,
                    filesArchived: 0,
                    errors: ['No existing files to archive']
                };
            }

            // Сохраняем архив как JSON (упрощенная версия)
            fs.writeFileSync(archivePath, JSON.stringify(archiveContent, null, 2));

            // Сохраняем метаданные отдельным файлом, если требуется
            if (includeMetadata) {
                const metadataPath = path.join(this.archiveDir, `${archiveName}.meta.json`);
                fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
            }

            this.logger.info('Archive created successfully', {
                archivePath,
                filesArchived: archiveContent.files.length
            });

            return {
                success: true,
                archivePath,
                filesArchived: archiveContent.files.length,
                metadata
            };

        } catch (error) {
            this.errorHandler.handle(error, 'ArchiveManager.archiveFiles');
            throw error;
        }
    }

    async getArchiveInfo(archivePath) {
        try {
            if (!fs.existsSync(archivePath)) {
                throw new Error(`Archive not found: ${archivePath}`);
            }

            const content = fs.readFileSync(archivePath, 'utf8');
            const archiveData = JSON.parse(content);

            return {
                path: archivePath,
                size: fs.statSync(archivePath).size,
                files: archiveData.files?.length || 0,
                metadata: archiveData.metadata,
                created: archiveData.metadata?.created
            };

        } catch (error) {
            this.errorHandler.handle(error, 'ArchiveManager.getArchiveInfo');
            throw error;
        }
    }

    async searchArchive(archivePath, searchTerm) {
        try {
            if (!fs.existsSync(archivePath)) {
                throw new Error(`Archive not found: ${archivePath}`);
            }

            const content = fs.readFileSync(archivePath, 'utf8');
            const archiveData = JSON.parse(content);

            const results = [];

            if (archiveData.files) {
                for (const file of archiveData.files) {
                    if (file.path.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        file.content.toLowerCase().includes(searchTerm.toLowerCase())) {
                        results.push({
                            file: file.path,
                            matches: file.content.toLowerCase().split(searchTerm.toLowerCase()).length - 1
                        });
                    }
                }
            }

            return {
                searchTerm,
                results,
                totalMatches: results.length
            };

        } catch (error) {
            this.errorHandler.handle(error, 'ArchiveManager.searchArchive');
            throw error;
        }
    }

    async extractArchive(archivePath, extractTo) {
        try {
            if (!fs.existsSync(archivePath)) {
                throw new Error(`Archive not found: ${archivePath}`);
            }

            const content = fs.readFileSync(archivePath, 'utf8');
            const archiveData = JSON.parse(content);

            if (!fs.existsSync(extractTo)) {
                fs.mkdirSync(extractTo, { recursive: true });
            }

            let extractedCount = 0;

            if (archiveData.files) {
                for (const file of archiveData.files) {
                    try {
                        const targetPath = path.join(extractTo, file.path);
                        const targetDir = path.dirname(targetPath);
                        
                        if (!fs.existsSync(targetDir)) {
                            fs.mkdirSync(targetDir, { recursive: true });
                        }

                        fs.writeFileSync(targetPath, file.content);
                        extractedCount++;
                    } catch (error) {
                        this.logger.warn(`Failed to extract file ${file.path}:`, error.message);
                    }
                }
            }

            this.logger.info('Archive extracted successfully', { 
                archivePath, 
                extractTo, 
                filesExtracted: extractedCount 
            });

            return {
                success: true,
                extractTo,
                filesExtracted: extractedCount
            };

        } catch (error) {
            this.errorHandler.handle(error, 'ArchiveManager.extractArchive');
            throw error;
        }
    }

    listArchives() {
        try {
            const files = fs.readdirSync(this.archiveDir);
            const archives = files
                .filter(file => file.endsWith('.zip') || file.endsWith('.json'))
                .map(file => {
                    const filePath = path.join(this.archiveDir, file);
                    const stats = fs.statSync(filePath);
                    return {
                        name: file,
                        path: filePath,
                        size: stats.size,
                        created: stats.birthtime
                    };
                });

            return archives;

        } catch (error) {
            this.errorHandler.handle(error, 'ArchiveManager.listArchives');
            return [];
        }
    }
}

export default ArchiveManager;
