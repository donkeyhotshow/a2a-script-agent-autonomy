import fs from 'fs-extra';
import path from 'path';
import unzipper from 'unzipper';
import tar from 'tar';

export class ArchiveExtractor {
  constructor(options = {}) {
    this.password = options.password || null;
  }

  async extractArchive(archivePath, extractPath = '.', options = {}) {
    const {
      overwrite = false,
      filter = null,
      password = this.password
    } = options;

    try {
      if (!await fs.pathExists(archivePath)) {
        throw new Error(`Архив не найден: ${archivePath}`);
      }

      await fs.ensureDir(extractPath);

      const format = path.extname(archivePath).toLowerCase();
      let extractedFiles = [];

      if (format === '.zip') {
        extractedFiles = await this._extractZip(archivePath, extractPath, { overwrite, filter, password });
      } else if (format === '.tar' || format === '.tar.gz' || format === '.tgz') {
        extractedFiles = await this._extractTar(archivePath, extractPath, { overwrite, filter });
      } else {
        throw new Error(`Неподдерживаемый формат архива: ${format}`);
      }

      return {
        success: true,
        archivePath,
        extractPath,
        extractedFiles,
        message: `Архив извлечен успешно: ${extractedFiles.length} файлов`
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        archivePath,
        extractPath,
        message: `Ошибка извлечения архива: ${error.message}`
      };
    }
  }

  async _extractZip(archivePath, extractPath, options) {
    const { overwrite, filter, password } = options;
    const extractedFiles = [];

    return new Promise((resolve, reject) => {
      fs.createReadStream(archivePath)
        .pipe(unzipper.Parse({ password }))
        .on('entry', (entry) => {
          const fileName = entry.path;
          
          if (filter && !filter(fileName)) {
            entry.autodrain();
            return;
          }

          if (entry.type === 'File') {
            const filePath = path.join(extractPath, fileName);
            
            if (!overwrite && fs.existsSync(filePath)) {
              entry.autodrain();
              return;
            }

            fs.ensureDirSync(path.dirname(filePath));
            entry.pipe(fs.createWriteStream(filePath));
            extractedFiles.push(fileName);
          } else {
            entry.autodrain();
          }
        })
        .on('close', () => resolve(extractedFiles))
        .on('error', reject);
    });
  }

  async _extractTar(archivePath, extractPath, options) {
    const { overwrite, filter } = options;
    
    await tar.extract({
      file: archivePath,
      cwd: extractPath,
      filter: filter,
      overwrite: overwrite
    });

    const extractedFiles = [];
    const walkDir = async (dir) => {
      const files = await fs.readdir(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);
        if (stats.isFile()) {
          extractedFiles.push(path.relative(extractPath, filePath));
        } else if (stats.isDirectory()) {
          await walkDir(filePath);
        }
      }
    };
    
    await walkDir(extractPath);
    return extractedFiles;
  }
}
