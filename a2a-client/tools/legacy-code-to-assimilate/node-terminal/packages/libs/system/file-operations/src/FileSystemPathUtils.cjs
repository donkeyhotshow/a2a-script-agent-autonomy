const path = require('path');

class FileSystemPathUtils {
  constructor(logger) {
    this.logger = logger;
  }

  /**
   * Приводит путь к нормализованному виду.
   * @param {string} filePath - Путь.
   * @returns {string} Нормализованный путь.
   */
  normalizePath(filePath) {
    if (typeof window !== 'undefined') {
      // В браузере нормализация путей для локальной ФС неактуальна
      return filePath; 
    }
    return path.normalize(filePath);
  }

  /**
   * Разрешает относительный путь к абсолютному.
   * @param {string} from - Откуда относительно.
   * @param {string} to - К чему относительно.
   * @returns {string} Абсолютный путь.
   */
  resolvePath(from, to) {
    if (typeof window !== 'undefined') {
      // В браузере разрешение путей для локальной ФС неактуально
      return to; 
    }
    return path.resolve(from, to);
  }

  /**
   * Получает относительный путь от одного к другому.
   * @param {string} from - Путь, относительно которого будет построен относительный путь.
   * @param {string} to - Путь, к которому будет построен относительный путь.
   * @returns {string} Относительный путь.
   */
  relativePath(from, to) {
    if (typeof window !== 'undefined') {
      // В браузере относительные пути для локальной ФС неактуальны
      return to; 
    }
    return path.relative(from, to);
  }

  /**
   * Получает базовое имя файла или директории из пути.
   * @param {string} filePath - Путь.
   * @param {string} ext - Опционально: расширение для удаления.
   * @returns {string} Базовое имя.
   */
  basename(filePath, ext) {
    if (typeof window !== 'undefined') {
      // В браузере basename можно получить, но функциональность ограничена URL
      const url = new URL(filePath, window.location.origin);
      return path.basename(url.pathname, ext);
    }
    return path.basename(filePath, ext);
  }

  /**
   * Получает расширение файла из пути.
   * @param {string} filePath - Путь.
   * @returns {string} Расширение файла (включая точку).
   */
  extname(filePath) {
    if (typeof window !== 'undefined') {
      const url = new URL(filePath, window.location.origin);
      return path.extname(url.pathname);
    }
    return path.extname(filePath);
  }

  /**
   * Получает имя директории из пути.
   * @param {string} filePath - Путь.
   * @returns {string} Имя директории.
   */
  dirname(filePath) {
    if (typeof window !== 'undefined') {
      const url = new URL(filePath, window.location.origin);
      return path.dirname(url.pathname);
    }
    return path.dirname(filePath);
  }

  /**
   * Проверяет, является ли путь абсолютным.
   * @param {string} filePath - Путь.
   * @returns {boolean} true, если абсолютный, иначе false.
   */
  isAbsolutePath(filePath) {
    if (typeof window !== 'undefined') {
      // В браузере это может быть проверено, если путь является полным URL
      try {
        new URL(filePath);
        return true;
      } catch {
        return false;
      }
    }
    return path.isAbsolute(filePath);
  }

  /**
   * Объединяет сегменты пути в один путь.
   * @param {...string} paths - Сегменты пути.
   * @returns {string} Объединенный путь.
   */
  joinPath(...paths) {
    if (typeof window !== 'undefined') {
      // В браузере можно просто объединить строки
      return paths.join('/').replace(/\/\/+/g, '/');
    }
    return path.join(...paths);
  }

  /**
   * Изменяет расширение файла в пути.
   * @param {string} filePath - Исходный путь.
   * @param {string} newExt - Новое расширение (включая точку).
   * @returns {string} Путь с измененным расширением.
   */
  changeExtension(filePath, newExt) {
    if (typeof window !== 'undefined') {
      const currentExt = this.extname(filePath);
      return filePath.substring(0, filePath.length - currentExt.length) + newExt;
    }
    return filePath.substring(0, filePath.length - this.extname(filePath).length) + newExt;
  }
}

module.exports = { FileSystemPathUtils };
