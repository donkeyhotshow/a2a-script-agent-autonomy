/**
 * @fileoverview Bootstrap система для Zero-4 Dashboard
 * @author Zero-4 Team
 * @version 2.3.0
 */

import fs from 'fs-extra';
import path from 'node:path';
import moduleAlias from 'module-alias';
import { fileURLToPath } from 'node:url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Bootstrap - Система инициализации и управления модулями
 * Предоставляет автоматическую загрузку модулей, управление алиасами
 * и инициализацию core библиотек
 */
class Bootstrap {
  constructor(options = {}) {
    this.config = {
      aliasesPath: options.aliasesPath || './aliases.json',
      modulesPath: options.modulesPath || './libs',
      autoLoad: options.autoLoad !== false,
      logger: options.logger || console,
      errorHandler: options.errorHandler || console,
      ...options
    };

    this.aliases = new Map();
    this.modules = new Map();
    this.loadedModules = new Set();
    this.isInitialized = false;

    this.initialize();
  }

  /**
   * Инициализация Bootstrap системы
   */
  async initialize() {
    try {
      this.config.logger.info('Bootstrap система инициализируется...');

      // Загрузка алиасов
      await this.loadAliases();

      // Применение алиасов
      this.applyAliases();

      // Автоматическая загрузка модулей
      if (this.config.autoLoad) {
        await this.autoLoadModules();
      }

      this.isInitialized = true;
      this.config.logger.info('Bootstrap система успешно инициализирована', {
        aliasesCount: this.aliases.size,
        modulesCount: this.modules.size,
        loadedModulesCount: this.loadedModules.size
      });
    } catch (error) {
      this.config.errorHandler.error('Ошибка инициализации Bootstrap системы:', error);
      throw error;
    }
  }

  /**
   * Загрузка алиасов из файла конфигурации
   */
  async loadAliases() {
    try {
      if (await fs.pathExists(this.config.aliasesPath)) {
        const aliasesData = await fs.readJson(this.config.aliasesPath);
        this.aliases = new Map(Object.entries(aliasesData));
        
        this.config.logger.info('Aliases загружены из файла конфигурации', {
          aliases: aliasesData,
          count: this.aliases.size
        });
      } else {
        // Создание алиасов по умолчанию
        this.createDefaultAliases();
        this.config.logger.info('Используется конфигурация алиасов по умолчанию');
      }
    } catch (error) {
      this.config.errorHandler.warn('Ошибка загрузки алиасов, используются значения по умолчанию:', error);
      this.createDefaultAliases();
    }
  }

  /**
   * Создание алиасов по умолчанию
   */
  createDefaultAliases() {
    const defaultAliases = {
      '@root': process.cwd(),
      '@libs': path.join(process.cwd(), 'libs'),
      '@core': path.join(process.cwd(), 'libs', 'core'),
      '@ui': path.join(process.cwd(), 'libs', 'ui'),
      '@api': path.join(process.cwd(), 'libs', 'api'),
      '@utils': path.join(process.cwd(), 'libs', 'utils'),
      '@shared': path.join(process.cwd(), 'libs', 'shared'),
      '@apps': path.join(process.cwd(), 'apps'),
      '@config': path.join(process.cwd(), 'config'),
      '@tests': path.join(process.cwd(), 'tests')
    };

    this.aliases = new Map(Object.entries(defaultAliases));
  }

  /**
   * Применение алиасов к модульной системе
   */
  applyAliases() {
    for (const [alias, aliasPath] of this.aliases) {
      try {
        const absolutePath = path.resolve(aliasPath);
        moduleAlias.addAlias(alias, absolutePath);
        
        this.config.logger.debug('Alias применен', {
          alias,
          path: absolutePath
        });
      } catch (error) {
        this.config.errorHandler.warn(`Ошибка применения алиаса ${alias}:`, error);
      }
    }
  }

  /**
   * Автоматическая загрузка модулей
   */
  async autoLoadModules() {
    try {
      if (!await fs.pathExists(this.config.modulesPath)) {
        this.config.logger.warn('Директория модулей не найдена:', this.config.modulesPath);
        return;
      }

      const moduleDirs = await fs.readdir(this.config.modulesPath);
      
      for (const dir of moduleDirs) {
        const modulePath = path.join(this.config.modulesPath, dir);
        const stat = await fs.stat(modulePath);
        
        if (stat.isDirectory()) {
          await this.loadModule(dir, modulePath);
        }
      }

      this.config.logger.info('Автоматическая загрузка модулей завершена', {
        totalModules: this.modules.size,
        loadedModules: this.loadedModules.size
      });
    } catch (error) {
      this.config.errorHandler.error('Ошибка автоматической загрузки модулей:', error);
    }
  }

  /**
   * Загрузка отдельного модуля
   */
  async loadModule(moduleName, modulePath) {
    try {
      const packageJsonPath = path.join(modulePath, 'package.json');
      const indexPath = path.join(modulePath, 'index.js');
      
      let moduleInfo = { name: moduleName, path: modulePath };
      
      // Чтение package.json если доступен
      if (await fs.pathExists(packageJsonPath)) {
        const packageData = await fs.readJson(packageJsonPath);
        moduleInfo = { ...moduleInfo, ...packageData };
      }

      // Проверка наличия основного файла
      if (await fs.pathExists(indexPath)) {
        this.modules.set(moduleName, moduleInfo);
        this.config.logger.debug('Модуль загружен', moduleInfo);
      } else {
        this.config.logger.debug('Модуль не содержит index.js', moduleInfo);
      }
    } catch (error) {
      this.config.errorHandler.warn(`Ошибка загрузки модуля ${moduleName}:`, error);
    }
  }

  /**
   * Добавление нового алиаса
   */
  addAlias(alias, path) {
    this.aliases.set(alias, path);
    moduleAlias.addAlias(alias, path);
    
    this.config.logger.info('Новый алиас добавлен', {
      alias,
      path
    });
  }

  /**
   * Удаление алиаса
   */
  removeAlias(alias) {
    if (this.aliases.has(alias)) {
      this.aliases.delete(alias);
      // Примечание: module-alias не поддерживает удаление алиасов
      this.config.logger.info('Алиас удален', { alias });
    }
  }

  /**
   * Получение всех алиасов
   */
  getAliases() {
    return Object.fromEntries(this.aliases);
  }

  /**
   * Получение всех модулей
   */
  getModules() {
    return Object.fromEntries(this.modules);
  }

  /**
   * Проверка инициализации
   */
  isReady() {
    return this.isInitialized;
  }

  /**
   * Получение информации о системе
   */
  getSystemInfo() {
    return {
      initialized: this.isInitialized,
      aliasesCount: this.aliases.size,
      modulesCount: this.modules.size,
      loadedModulesCount: this.loadedModules.size,
      config: this.config
    };
  }

  /**
   * Перезагрузка системы
   */
  async reload() {
    this.config.logger.info('Перезагрузка Bootstrap системы...');
    
    this.isInitialized = false;
    this.modules.clear();
    this.loadedModules.clear();
    
    await this.initialize();
  }

  /**
   * Очистка ресурсов
   */
  async cleanup() {
    this.config.logger.info('Очистка Bootstrap системы...');
    
    this.aliases.clear();
    this.modules.clear();
    this.loadedModules.clear();
    this.isInitialized = false;
  }
}

export default Bootstrap;
