/**
 * Операции с файлами
 * Модуль содержит функции для работы с файлами и директориями
 */

import path from 'path';

/**
 * Класс для операций с файлами
 */
class FileOperations {
  constructor(fsPromises, fsSync, logger = console) {
    this.fs = fsPromises;
    this.fsSync = fsSync;
    this.logger = logger;
    this.path = path;
  }

  /**
   * Синхронное получение директории файла
   */
  getDirname(filePath) {
    try {
      return this.path.dirname(filePath);
    } catch (error) {
      this.logger.error(`Ошибка получения dirname для ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Объединение путей
   */
  join(...paths) {
    try {
      return this.path.join(...paths);
    } catch (error) {
      this.logger.error(`Ошибка объединения путей:`, error.message);
      throw error;
    }
  }

  /**
   * Разрешение пути (преобразование относительного пути в абсолютный)
   */
  resolve(...paths) {
    try {
      return this.path.resolve(...paths);
    } catch (error) {
      this.logger.error(`Ошибка разрешения пути:`, error.message);
      throw error;
    }
  }

  /**
   * Получение относительного пути
   */
  getRelativePath(from, to) {
    try {
      return this.path.relative(from, to);
    } catch (error) {
      this.logger.error(`Ошибка получения относительного пути:`, error.message);
      throw error;
    }
  }

  /**
   * Проверка, является ли путь абсолютным
   */
  isAbsolute(filePath) {
    try {
      return this.path.isAbsolute(filePath);
    } catch (error) {
      this.logger.error(`Ошибка проверки абсолютного пути:`, error.message);
      return false;
    }
  }

  /**
   * Получение расширения файла
   */
  getExtension(filePath) {
    try {
      return this.path.extname(filePath);
    } catch (error) {
      this.logger.error(`Ошибка получения расширения файла:`, error.message);
      return '';
    }
  }

  /**
   * Получение имени файла без расширения
   */
  getBasename(filePath) {
    try {
      return this.path.basename(filePath, this.path.extname(filePath));
    } catch (error) {
      this.logger.error(`Ошибка получения basename:`, error.message);
      return '';
    }
  }

  /**
   * Получение имени файла с расширением
   */
  getFilename(filePath) {
    try {
      return this.path.basename(filePath);
    } catch (error) {
      this.logger.error(`Ошибка получения filename:`, error.message);
      return '';
    }
  }

  /**
   * Асинхронное чтение содержимого директории
   */
  async readdir(dirPath) {
    try {
      const entries = await this.fs.readdir(dirPath, { withFileTypes: true });
      return entries.map(entry => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile(),
        path: this.join(dirPath, entry.name)
      }));
    } catch (error) {
      this.logger.error(`Ошибка чтения директории ${dirPath}:`, error.message);
      throw error;
    }
  }

  /**
   * Асинхронное получение статистики файла/директории
   */
  async stat(filePath) {
    try {
      return await this.fs.stat(filePath);
    } catch (error) {
      this.logger.error(`Ошибка получения статистики ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Синхронная проверка существования файла/директории
   */
  existsSync(filePath) {
    try {
      return this.fsSync.existsSync(filePath);
    } catch (error) {
      this.logger.error(`Ошибка проверки существования ${filePath}:`, error.message);
      return false;
    }
  }

  /**
   * Синхронное чтение файла
   */
  readFileSync(filePath, encoding = 'utf8') {
    try {
      return this.fsSync.readFileSync(filePath, encoding);
    } catch (error) {
      this.logger.error(`Ошибка чтения файла ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Синхронная запись файла
   */
  writeFileSync(filePath, content, encoding = 'utf8') {
    try {
      // Создаем директорию если её нет
      this.ensureDirSync(this.getDirname(filePath));
      this.fsSync.writeFileSync(filePath, content, encoding);
    } catch (error) {
      this.logger.error(`Ошибка записи файла ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Синхронное добавление в файл
   */
  appendFileSync(filePath, content, encoding = 'utf8') {
    try {
      this.fsSync.appendFileSync(filePath, content, encoding);
    } catch (error) {
      this.logger.error(`Ошибка добавления в файл ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Синхронная статистика файла/директории
   */
  statSync(filePath) {
    try {
      return this.fsSync.statSync(filePath);
    } catch (error) {
      this.logger.error(`Ошибка получения статистики ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Синхронное чтение содержимого директории
   */
  readdirSync(dirPath) {
    try {
      return this.fsSync.readdirSync(dirPath);
    } catch (error) {
      this.logger.error(`Ошибка чтения директории ${dirPath}:`, error.message);
      throw error;
    }
  }

  /**
   * Синхронное создание директории
   */
  ensureDirSync(dirPath, options = {}) {
    try {
      this.fsSync.mkdirSync(dirPath, { recursive: true, ...options });
    } catch (error) {
      // Игнорируем ошибку EEXIST (директория уже существует)
      if (error.code !== 'EEXIST') {
        this.logger.error(`Ошибка создания директории ${dirPath}:`, error.message);
        throw error;
      }
    }
  }

  /**
   * Асинхронная проверка существования файла/директории
   */
  async exists(filePath) {
    try {
      await this.fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Асинхронное чтение файла
   */
  async readFile(filePath, encoding = 'utf8') {
    try {
      this.logger.debug(`Attempting to read file: ${filePath}`);
      return await this.fs.readFile(filePath, encoding);
    } catch (error) {
      this.logger.error(`Ошибка чтения файла ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Асинхронная запись файла
   */
  async writeFile(filePath, content, encoding = 'utf8') {
    try {
      // Создаем директорию если её нет
      await this.ensureDir(this.getDirname(filePath));
      await this.fs.writeFile(filePath, content, encoding);
      return true;
    } catch (error) {
      this.logger.error(`Ошибка записи файла ${filePath}:`, error.message);
      return false;
    }
  }

  /**
   * Асинхронное добавление в файл
   */
  async appendFile(filePath, content, encoding = 'utf8') {
    try {
      await this.ensureDir(this.getDirname(filePath));
      await this.fs.appendFile(filePath, content, encoding);
    } catch (error) {
      this.logger.error(`Ошибка добавления в файл ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Асинхронное создание директории
   */
  async ensureDir(dirPath, options = {}) {
    try {
      await this.fs.mkdir(dirPath, { recursive: true, ...options });
      return true;
    } catch (error) {
      if (error.code === 'EEXIST') {
        return true;
      } else {
        this.logger.error(`Ошибка создания директории ${dirPath}:`, error.message);
        throw error;
      }
    }
  }

  /**
   * Алиас для ensureDir - создание директории
   */
  async mkdir(dirPath, options = {}) {
    return this.ensureDir(dirPath, options);
  }

  /**
   * Асинхронное удаление файла/директории
   */
  async remove(filePath, options = {}) {
    try {
      const stats = await this.stat(filePath);

      if (stats.isDirectory()) {
        await this.fs.rmdir(filePath, { recursive: true, ...options });
      } else {
        await this.fs.unlink(filePath);
      }
    } catch (error) {
      this.logger.error(`Ошибка удаления ${filePath}:`, error.message);
      throw error;
    }
  }

  /**
   * Асинхронное копирование файла
   */
  async copyFile(source, destination) {
    try {
      await this.ensureDir(this.getDirname(destination));
      await this.fs.copyFile(source, destination);
    } catch (error) {
      this.logger.error(`Ошибка копирования ${source} -> ${destination}:`, error.message);
      throw error;
    }
  }

  /**
   * Асинхронное перемещение/переименование файла
   */
  async moveFile(oldPath, newPath) {
    try {
      await this.ensureDir(this.getDirname(newPath));
      await this.fs.rename(oldPath, newPath);
    } catch (error) {
      this.logger.error(`Ошибка перемещения ${oldPath} -> ${newPath}:`, error.message);
      throw error;
    }
  }

  /**
   * Получение текущей рабочей директории
   */
  getCurrentWorkingDir(isBrowser, APP_ROOT) {
    try {
      if (isBrowser) {
        return APP_ROOT;
      }
      return process.cwd();
    } catch (error) {
      this.logger.error(`Ошибка получения текущей директории:`, error.message);
      return '.';
    }
  }

  /**
   * Нормализация пути
   */
  normalize(filePath) {
    try {
      return this.path.normalize(filePath);
    } catch (error) {
      this.logger.error(`Ошибка нормализации пути:`, error.message);
      return filePath;
    }
  }
}

export default FileOperations;
