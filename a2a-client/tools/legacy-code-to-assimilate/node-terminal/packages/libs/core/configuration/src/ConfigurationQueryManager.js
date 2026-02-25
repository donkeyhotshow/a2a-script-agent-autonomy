/**
 * Управление запросами и изменениями конфигураций.
 */

import * as yaml from 'js-yaml';
import * as path from 'path';

export class ConfigurationQueryManager {
    constructor(configs, defaults, logger, sensitiveFields, securityManager, loaderSaver, schemas, defaultOutputCharLimit) {
        this.configs = configs;
        this.defaults = defaults;
        this.logger = logger;
        this.sensitiveFields = sensitiveFields;
        this.securityManager = securityManager;
        this.loaderSaver = loaderSaver;
        this.schemas = schemas;
        this.defaultOutputCharLimit = defaultOutputCharLimit;
    }

    /**
     * Получение конфигурации с автоматической расшифровкой
     */
    get(configName, key, defaultValue) {
        if (!this.configs.has(configName)) {
            // Пытаемся загрузить конфигурацию синхронно
            try {
                this.loaderSaver.load(configName);
            } catch (error) {
                this.logger.warn(`Не удалось загрузить конфигурацию ${configName}:`, error.message);
            }
        }
        
        const config = this.configs.get(configName);
        if (!config) {
            return defaultValue;
        }
        
        let data = config.data;
        if (this.sensitiveFields.length > 0) {
            data = this.securityManager.decryptSensitiveFields(data, this.sensitiveFields);
        }
        
        if (key === undefined) {
            return data;
        }
        
        return this.getNestedValue(data, key, defaultValue);
    }

    /**
     * Установка значения с автоматическим шифрованием
     */
    async set(configName, key, value, encryptIfSensitive = true) {
        if (typeof window !== 'undefined') {
            this.logger.warn(`Установка конфигурации ${configName} не поддерживается в браузере.`);
            return false;
        }

        const configEntry = this.configs.get(configName);
        if (!configEntry) {
            this.logger.warn(`Конфигурация ${configName} не найдена, попытка загрузки.`);
            await this.loaderSaver.load(configName);
            if (!this.configs.has(configName)) {
                this.logger.error(`Не удалось найти или загрузить конфигурацию ${configName} для установки значения.`);
                return false;
            }
        }

        const config = this.configs.get(configName);
        let data = { ...config.data };

        this.setNestedValue(data, key, value);

        if (encryptIfSensitive && this.sensitiveFields.includes(key.split('.')[0])) { // Упрощенная проверка на чувствительность
            data = this.securityManager.encryptSensitiveFields(data, this.sensitiveFields);
        }

        // Обновляем данные в кэше
        config.data = data;
        this.configs.set(configName, config);

        return this.loaderSaver.save(configName, data);
    }

    /**
     * Экспортирует конфигурацию
     */
    exportConfig(configName, format = 'json') {
        if (typeof window !== 'undefined') {
            this.logger.warn(`Экспорт конфигурации ${configName} не поддерживается в браузере.`);
            return '';
        }

        const config = this.get(configName);
        if (!config) {
            throw new Error(`Конфигурация ${configName} не найдена`);
        }

        let exportedContent = '';
        if (format === 'json') {
            exportedContent = JSON.stringify(config, null, 2);
        } else if (format === 'yaml') {
            exportedContent = yaml.dump(config);
        } else {
            this.logger.warn(`Неподдерживаемый формат экспорта: ${format}`);
            return '';
        }
        return exportedContent;
    }

    /**
     * Импортирует конфигурацию
     */
    importConfig(configName, data, format = 'json') {
        if (typeof window !== 'undefined') {
            this.logger.warn(`Импорт конфигурации ${configName} не поддерживается в браузере.`);
            return false;
        }

        let parsedData;
        try {
            if (format === 'json') {
                parsedData = JSON.parse(data);
            } else if (format === 'yaml') {
                parsedData = yaml.load(data);
            } else {
                this.logger.error(`Неподдерживаемый формат импорта: ${format}`);
                return false;
            }
        } catch (error) {
            this.logger.error(`Ошибка парсинга импортированных данных для ${configName}:`, error.message);
            return false;
        }

        // Загружаем существующую конфигурацию, чтобы не перезаписывать все, а только обновить
        const existingConfig = this.get(configName) || {};
        const mergedConfig = this.mergeConfigs(existingConfig, parsedData);

        // Сохраняем в кэш
        this.configs.set(configName, {
            data: mergedConfig,
            path: path.join(this.loaderSaver.configDir || '', `${configName}.json`),
            lastModified: new Date(),
            isEncrypted: false,
            validationResult: null
        });

        // Сохраняем в файловую систему
        this.loaderSaver.save(configName, mergedConfig);

        return true;
    }

    /**
     * Получение информации о конфигурациях
     */
    getConfigInfo() {
        const info = [];
        for (const [configName, config] of this.configs.entries()) {
            info.push({
                name: configName,
                path: config.path,
                lastModified: config.lastModified,
                size: JSON.stringify(config.data).length,
                isEncrypted: config.isEncrypted,
                hasSchema: this.schemas.has(configName),
                validationResult: config.validationResult
            });
        }
        return info;
    }

    /**
     * Получение лимита символов вывода
     */
    getOutputCharLimit() {
        return this.defaultOutputCharLimit;
    }

    mergeConfigs(defaults, overrides) {
        const result = { ...defaults };
        for (const [key, value] of Object.entries(overrides)) {
            if (value !== null && value !== undefined) {
                if (typeof value === 'object' && !Array.isArray(value) &&
                    typeof result[key] === 'object' && !Array.isArray(result[key])) {
                    result[key] = this.mergeConfigs(result[key], value);
                } else if (Array.isArray(value) && Array.isArray(result[key])) {
                    // Для массивов объединяем элементы
                    result[key] = [...result[key], ...value];
                } else {
                    result[key] = value;
                }
            }
        }
        return result;
    }

    getNestedValue(obj, path, defaultValue = undefined) {
        const keys = path.split('.');
        let value = obj;
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return defaultValue;
            }
        }
        return value;
    }

    setNestedValue(obj, path, value) {
        const keys = path.split('.');
        let current = obj;
        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!(key in current) || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }
        current[keys[keys.length - 1]] = value;
    }
}
