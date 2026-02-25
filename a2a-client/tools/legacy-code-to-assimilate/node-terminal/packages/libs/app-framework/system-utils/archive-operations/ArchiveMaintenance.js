import fs from 'fs-extra';
import path from 'path';

export class ArchiveMaintenance {
  constructor(archiveOperationsInstance) {
    this.archiveOperations = archiveOperationsInstance; // Reference to the main ArchiveOperations instance
  }

  async getArchiveStatistics() {
    try {
      const archives = await this.archiveOperations.listAllArchives();
      const totalSize = archives.reduce((sum, archive) => sum + archive.size, 0);
      
      const formats = {};
      archives.forEach(archive => {
        const format = path.extname(archive.path).toLowerCase();
        formats[format] = (formats[format] || 0) + 1;
      });

      const largestArchive = archives.reduce((largest, current) => 
        current.size > largest.size ? current : largest, { size: 0 });

      const recentArchives = archives
        .sort((a, b) => b.mtime - a.mtime)
        .slice(0, 5);

      return {
        totalArchives: archives.length,
        totalSize,
        largestArchive: largestArchive.size > 0 ? largestArchive : null,
        recentArchives,
        formats,
        averageSize: archives.length > 0 ? totalSize / archives.length : 0
      };

    } catch (error) {
      return {
        totalArchives: 0,
        totalSize: 0,
        largestArchive: null,
        recentArchives: [],
        formats: {},
        error: error.message
      };
    }
  }

  async cleanupOldArchives(options = {}) {
    const {
      maxAge = 30, // дни
      maxSize = 1024 * 1024 * 1024, // 1GB
      dryRun = true
    } = options;

    try {
      const archives = await this.archiveOperations.listAllArchives();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - maxAge);
      
      const oldArchives = archives.filter(archive => 
        archive.mtime < cutoffDate || archive.size > maxSize
      );

      if (oldArchives.length === 0) {
        return {
          success: true,
          removedArchives: [],
          freedSpace: 0,
          options: { maxAge, maxSize, dryRun },
          message: 'Нет старых архивов для удаления'
        };
      }

      const removedArchives = [];
      let freedSpace = 0;

      for (const archive of oldArchives) {
        if (!dryRun) {
          try {
            await fs.remove(archive.path);
            removedArchives.push(archive);
            freedSpace += archive.size;
          } catch (error) {
            console.error(`Ошибка удаления архива ${archive.name}: ${error.message}`);
          }
        } else {
          removedArchives.push(archive);
          freedSpace += archive.size;
        }
      }

      return {
        success: true,
        removedArchives,
        freedSpace,
        options: { maxAge, maxSize, dryRun },
        message: `${dryRun ? 'Будет удалено' : 'Удалено'} ${removedArchives.length} архивов, освобождено ${(freedSpace / 1024 / 1024).toFixed(2)} MB`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        removedArchives: [],
        freedSpace: 0,
        options: { maxAge, maxSize, dryRun },
        message: `Ошибка очистки архивов: ${error.message}`
      };
    }
  }
}
