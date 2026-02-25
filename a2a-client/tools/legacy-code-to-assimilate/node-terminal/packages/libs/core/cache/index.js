/**
 * Unified Cache Utilities Library
 * Объединенная библиотека утилит для работы с кэшем
 */

const fs = require('fs').promises;
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');
const { LoggingUtils } = require('../logging');

/**
 * CacheUtils - Система управления кешем
 * Предоставляет унифицированный интерфейс для работы с кешем
 */
class CacheUtils {
  constructor(options = {}) {
    this.logger = options.logger || new LoggingUtils();
    this.config = options.config || { enabled: true, ttl: 300000, maxSize: 1000 }; // Дефолтная конфигурация
    this.cacheDir = options.cacheDir || path.join(process.cwd(), 'var/cache'); // Директория для дискового кэша
    this.cache = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      size: 0
    };
    
    this.initialize();
  }

  /**
   * Инициализация кэша
   */
  initialize() {
    if (!this.config.enabled) {
      this.logger.info('Кэширование отключено');
      return;
    }
    
    // Очистка устаревших записей каждые 5 минут
    setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    this.logger.info('Система кэширования инициализирована', {
      ttl: this.config.ttl,
      maxSize: this.config.maxSize,
      cacheDir: this.cacheDir
    });
  }

  /**
   * Получение значения из кэша
   */
  get(key) {
    if (!this.config.enabled) return null;

    const item = this.cache.get(key);
    
    if (!item) {
      this.stats.misses++;
      return null;
    }

    // Проверка TTL
    if (Date.now() > item.expiresAt) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return item.value;
  }

  /**
   * Установка значения в кэш
   */
  set(key, value, ttl = this.config.ttl) {
    if (!this.config.enabled) return false;

    // Проверка размера кэша
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt });
    
    this.stats.sets++;
    this.stats.size = this.cache.size;
    
    return true;
  }

  /**
   * Удаление значения из кэша
   */
  delete(key) {
    if (!this.config.enabled) return false;

    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.deletes++;
      this.stats.size = this.cache.size;
    }
    
    return deleted;
  }

  /**
   * Проверка существования ключа
   */
  has(key) {
    if (!this.config.enabled) return false;

    const item = this.cache.get(key);
    if (!item) return false;

    if (Date.now() > item.expiresAt) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Получение с автоматическим обновлением
   */
  async getOrSet(key, fetchFunction, ttl = this.config.ttl) {
    let value = this.get(key);
    
    if (value !== null) {
      return value;
    }

    try {
      value = await fetchFunction();
      this.set(key, value, ttl);
      return value;
    } catch (error) {
      this.logger.error('Ошибка получения данных для кэша:', error);
      throw error;
    }
  }

  /**
   * Получение нескольких значений
   */
  mget(keys) {
    if (!this.config.enabled) return {};

    const result = {};
    for (const key of keys) {
      result[key] = this.get(key);
    }
    return result;
  }

  /**
   * Установка нескольких значений
   */
  mset(items, ttl = this.config.ttl) {
    if (!this.config.enabled) return false;

    for (const [key, value] of Object.entries(items)) {
      this.set(key, value, ttl);
    }
    return true;
  }

  /**
   * Удаление по паттерну
   */
  deletePattern(pattern) {
    if (!this.config.enabled) return 0;

    const regex = new RegExp(pattern);
    let deletedCount = 0;

    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Очистка устаревших записей
   */
  cleanup() {
    if (!this.config.enabled) return 0;

    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiresAt) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    this.stats.size = this.cache.size;
    
    if (cleanedCount > 0) {
      this.logger.debug(`Очищено ${cleanedCount} устаревших записей кэша`);
    }

    return cleanedCount;
  }

  /**
   * Вытеснение по LRU (Least Recently Used)
   */
  evictLRU() {
    if (!this.config.enabled || this.cache.size === 0) return;

    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, item] of this.cache.entries()) {
      // Проверяем время истечения, чтобы найти самую старую запись
      // Если TTL одинаковый, можно добавить lastAccessed поле для истинного LRU
      if (item.expiresAt < oldestTime) {
        oldestTime = item.expiresAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.delete(oldestKey);
      this.logger.debug(`Вытеснена запись кэша по LRU: ${oldestKey}`);
    }
  }

  /**
   * Полная очистка кэша
   */
  clear() {
    if (!this.config.enabled) return;

    const size = this.cache.size;
    this.cache.clear();
    this.stats.size = 0;
    
    this.logger.info(`Кэш полностью очищен, удалено ${size} записей`);
  }

  /**
   * Получение статистики кэша
   */
  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      currentSize: this.cache.size,
      maxSize: this.config.maxSize,
      enabled: this.config.enabled,
      ttl: this.config.ttl
    };
  }

  /**
   * Получение ключей кэша
   */
  keys() {
    if (!this.config.enabled) return [];
    return Array.from(this.cache.keys());
  }

  /**
   * Получение размера кэша
   */
  size() {
    if (!this.config.enabled) return 0;
    return this.cache.size;
  }

  /**
   * Middleware для кэширования HTTP ответов
   * @param {number} ttl - Время жизни кэша в миллисекундах для данного middleware (переопределяет дефолтный).
   */
  middleware(ttl = this.config.ttl) {
    return (req, res, next) => {
      if (!this.config.enabled) {
        return next();
      }

      const key = `http:${req.method}:${req.originalUrl}`;
      const cached = this.get(key);

      if (cached) {
        this.logger.debug(`Cache hit for ${key}`);
        res.status(cached.status).json(cached.data);
        return;
      }

      const originalSend = res.json;
      res.json = (data) => {
        this.logger.debug(`Cache miss for ${key}, setting cache`);
        this.set(key, { status: res.statusCode, data }, ttl); // Используем this.set
        return originalSend.call(res, data);
      };

      next();
    };
  }

  /**
   * Сохранение кэша на диск
   * @param {string} filename - Имя файла для сохранения кэша.
   */
  async saveToDisk(filename = 'cache.json') {
    if (!this.config.enabled) return;
    const filePath = path.join(this.cacheDir, filename);
    try {
      await fs.mkdir(this.cacheDir, { recursive: true });
      const dataToSave = {};
      for (const [key, value] of this.cache.entries()) {
        dataToSave[key] = value;
      }
      await fs.writeFile(filePath, JSON.stringify(dataToSave, null, 2), 'utf8');
      this.logger.info(`Кэш сохранен в ${filePath}`);
      return { success: true, filePath };
    } catch (error) {
      this.logger.error(`Ошибка при сохранении кэша на диск (${filePath}): ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  /**
   * Загрузка кэша с диска
   * @param {string} filename - Имя файла для загрузки кэша.
   */
  async loadFromDisk(filename = 'cache.json') {
    if (!this.config.enabled) return;
    const filePath = path.join(this.cacheDir, filename);
    try {
      if (!fsSync.existsSync(filePath)) {
        this.logger.info(`Файл кэша не найден: ${filePath}`);
        return { success: false, message: 'Файл кэша не найден' };
      }
      const content = await fs.readFile(filePath, 'utf8');
      const loadedData = JSON.parse(content);
      this.cache.clear(); // Очищаем текущий кэш перед загрузкой
      for (const key in loadedData) {
        if (loadedData.hasOwnProperty(key)) {
          // Проверяем TTL при загрузке, чтобы не загружать просроченные данные
          if (Date.now() < loadedData[key].expiresAt) {
            this.cache.set(key, loadedData[key]);
          } else {
            this.logger.debug(`Пропущена просроченная запись кэша при загрузке: ${key}`);
          }
        }
      }
      this.stats.size = this.cache.size;
      this.logger.info(`Кэш загружен из ${filePath}, записей: ${this.cache.size}`);
      return { success: true, count: this.cache.size };
    } catch (error) {
      this.logger.error(`Ошибка при загрузке кэша с диска (${filePath}): ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

module.exports = { CacheUtils, cacheUtils: new CacheUtils() };
