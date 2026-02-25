const fs = require('fs');
const { FileSystemUtils } = require('C:/apps/libs/app-framework/core/file-utils/file-system/index.js');

class ConfigurationLoader {
  constructor(logger = console) {
    this.logger = logger;
    this.fileSystem = new FileSystemUtils(logger);
  }

  /**
   * Загружает конфигурацию цепочек
   */
  async loadChainConfig(configPath) {
    try {
      if (await this.fileSystem.exists(configPath)) {
        const content = await this.fileSystem.readFile(configPath);
        const config = JSON.parse(content);
        this.logger.log(`✅ Конфигурация загружена из: ${configPath}`);
        return config;
      } else {
        this.logger.error(`❌ Файл конфигурации не найден: ${configPath}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`❌ Ошибка загрузки конфигурации: ${error.message}`);
      return null;
    }
  }

  /**
   * Загружает правила цепочек
   */
  async loadChainRules(rulesPath) {
    try {
      if (await this.fileSystem.exists(rulesPath)) {
        const content = await this.fileSystem.readFile(rulesPath);
        const rules = JSON.parse(content);
        this.logger.log(`✅ Правила загружены из: ${rulesPath}`);
        return rules;
      } else {
        this.logger.error(`❌ Файл правил не найден: ${rulesPath}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`❌ Ошибка загрузки правил: ${error.message}`);
      return null;
    }
  }

  /**
   * Сортирует цепочки по приоритету
   */
  sortChainsByPriority(chains) {
    return chains.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Валидирует конфигурацию
   */
  validateConfig(config) {
    if (!config || !config.execution_pipelines) {
      this.logger.error('❌ Некорректная конфигурация: отсутствует execution_pipelines');
      return false;
    }
    
    if (!Array.isArray(config.execution_pipelines)) {
      this.logger.error('❌ Некорректная конфигурация: execution_pipelines не является массивом');
      return false;
    }

    return true;
  }

  /**
   * Валидирует правила
   */
  validateRules(rules) {
    if (!rules || !rules.rule_sets) {
      this.logger.error('❌ Некорректные правила: отсутствует rule_sets');
      return false;
    }
    
    if (!Array.isArray(rules.rule_sets)) {
      this.logger.error('❌ Некорректные правила: rule_sets не является массивом');
      return false;
    }

    return true;
  }
}

export { ConfigurationLoader };
