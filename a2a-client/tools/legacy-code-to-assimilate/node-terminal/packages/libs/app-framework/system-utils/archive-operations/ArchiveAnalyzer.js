import fs from 'fs-extra';
import path from 'path';
import unzipper from 'unzipper';
import tar from 'tar';

export class ArchiveAnalyzer {
  constructor(options = {}) {
    this.password = options.password || null; // Not directly used in analyzer, but might be needed for listing encrypted archives
  }

  async listArchiveFiles(archivePath) {
    try {
      if (!await fs.pathExists(archivePath)) {
        throw new Error(`Архив не найден: ${archivePath}`);
      }

      const format = path.extname(archivePath).toLowerCase();
      const files = [];

      if (format === '.zip') {
        return new Promise((resolve, reject) => {
          fs.createReadStream(archivePath)
            .pipe(unzipper.Parse({ password: this.password }))
            .on('entry', (entry) => {
              files.push({
                name: entry.path,
                size: entry.vars.uncompressedSize,
                type: entry.type,
                date: entry.vars.lastModifiedDate
              });
              entry.autodrain();
            })
            .on('close', () => resolve(files))
            .on('error', reject);
        });
      } else if (format === '.tar' || format === '.tar.gz' || format === '.tgz') {
        const entries = await tar.list({ file: archivePath });
        return entries.map(entry => ({
          name: entry.name,
          size: entry.size,
          type: entry.type,
          date: entry.mtime
        }));
      } else {
        throw new Error(`Неподдерживаемый формат архива: ${format}`);
      }

    } catch (error) {
      return [];
    }
  }

  async searchInArchive(archivePath, query, options = {}) {
    const {
      caseSensitive = false,
      maxResults = 100,
      fileTypes = [],
      includeContent = false
    } = options;

    try {
      const files = await this.listArchiveFiles(archivePath);
      const results = [];

      for (const file of files) {
        if (results.length >= maxResults) break;

        const fileName = caseSensitive ? file.name : file.name.toLowerCase();
        const searchQuery = caseSensitive ? query : query.toLowerCase();

        if (fileTypes.length > 0) {
          const fileExt = path.extname(file.name).toLowerCase();
          if (!fileTypes.includes(fileExt)) continue;
        }

        if (fileName.includes(searchQuery)) {
          results.push({
            file: file.name,
            size: file.size,
            type: file.type,
            date: file.date,
            matchType: 'filename'
          });
        }
      }

      return {
        archivePath,
        query,
        results,
        totalFound: results.length,
        searchOptions: { caseSensitive, maxResults, fileTypes, includeContent }
      };

    } catch (error) {
      return {
        archivePath,
        query,
        results: [],
        totalFound: 0,
        error: error.message,
        searchOptions: { caseSensitive, maxResults, fileTypes, includeContent }
      };
    }
  }

  async getArchiveInfo(archivePath) {
    try {
      if (!await fs.pathExists(archivePath)) {
        throw new Error(`Архив не найден: ${archivePath}`);
      }

      const stats = await fs.stat(archivePath);
      const files = await this.listArchiveFiles(archivePath);
      
      const totalSize = files.reduce((sum, file) => sum + (file.size || 0), 0);
      const compressionRatio = totalSize > 0 ? ((totalSize - stats.size) / totalSize * 100) : 0;

      return {
        path: archivePath,
        exists: true,
        size: stats.size,
        fileCount: files.length,
        uncompressedSize: totalSize,
        compressionRatio: Math.round(compressionRatio * 100) / 100,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        format: path.extname(archivePath).toLowerCase(),
        files: files.slice(0, 10) // Первые 10 файлов для предварительного просмотра
      };

    } catch (error) {
      return {
        path: archivePath,
        exists: false,
        error: error.message,
        size: 0,
        fileCount: 0,
        compressionRatio: 0,
        createdAt: null,
        format: 'unknown'
      };
    }
  }

  async validateArchive(archivePath) {
    try {
      if (!await fs.pathExists(archivePath)) {
        throw new Error(`Архив не найден: ${archivePath}`);
      }

      const format = path.extname(archivePath).toLowerCase();
      const errors = [];
      const warnings = [];

      try {
        await this.listArchiveFiles(archivePath);
      } catch (error) {
        errors.push(`Ошибка чтения архива: ${error.message}`);
      }

      const stats = await fs.stat(archivePath);
      if (stats.size === 0) {
        errors.push('Архив пустой');
      } else if (stats.size < 100) {
        warnings.push('Архив очень маленький, возможно поврежден');
      }

      return {
        path: archivePath,
        isValid: errors.length === 0,
        errors,
        warnings,
        size: stats.size,
        format,
        message: errors.length === 0 ? 'Архив валиден' : 'Архив содержит ошибки'
      };

    } catch (error) {
      return {
        path: archivePath,
        isValid: false,
        errors: [error.message],
        warnings: [],
        message: `Ошибка проверки архива: ${error.message}`
      };
    }
  }
}
