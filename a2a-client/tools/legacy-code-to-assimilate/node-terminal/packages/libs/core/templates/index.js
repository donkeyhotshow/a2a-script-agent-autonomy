/**
 * Unified Template Utilities Library
 * Объединенная библиотека утилит для работы с шаблонами
 */

import { promises as fs } from "fs";
import fsSync from "fs";
import path from "path";
import Handlebars from 'handlebars';
import { defaultLogger } from '../../logging-monitoring/logging/index.js';

// Временная заглушка для логгера, если не передан
// const defaultLogger = console;

class TemplateUtils {
  constructor(options = {}) {
    this.logger = options.logger || defaultLogger;
    this.defaultTemplatesDir = options.templatesDir || 'templates';
    this.compiledTemplates = new Map(); // Кэш для скомпилированных шаблонов Handlebars
    this.templateCache = new Map(); // Кэш для содержимого шаблонов
    this.maxCacheSize = options.maxCacheSize || 100; // Максимальный размер кэша
  }

  /**
   * Рендеринг Handlebars шаблона
   * @param {string} templateName - Имя файла шаблона (например, 'my-template.hbs')
   * @param {object} data - Данные для рендеринга
   * @param {string} templatesDir - Директория с шаблонами (опционально)
   * @returns {Promise<string>}
   */
  async renderHandlebarsTemplate(templateName, data, templatesDir = null) {
    const dir = templatesDir || this.defaultTemplatesDir;
    const templatePath = path.join(dir, templateName);

    if (!fsSync.existsSync(templatePath)) {
      this.logger.error(`Шаблон Handlebars не найден: ${templateName} в ${dir}`);
      throw new Error(`Шаблон Handlebars не найден: ${templateName} в ${dir}`);
    }

    let template = this.compiledTemplates.get(templatePath);
    if (!template) {
      const source = await fs.readFile(templatePath, 'utf8');
      template = Handlebars.compile(source);
      this.compiledTemplates.set(templatePath, template);
      this._manageCacheSize(this.compiledTemplates);
    }
    return template(data);
  }

  /**
   * Рендеринг простого текстового шаблона с заменой переменных ({{VAR}})
   * @param {string} templateName - Имя файла шаблона
   * @param {object} variables - Переменные для замены
   * @param {string} templatesDir - Директория с шаблонами (опционально)
   * @returns {Promise<string>}
   */
  async renderTextTemplate(templateName, variables = {}, templatesDir = null) {
    const content = await this.getTemplateContent(templateName, templatesDir);
    if (!content) {
      this.logger.error(`Шаблон не найден: ${templateName}`);
      throw new Error(`Шаблон не найден: ${templateName}`);
    }

    let result = content;
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(placeholder, String(value));
    }
    return result;
  }

  /**
   * Получение содержимого шаблона с кэшированием
   * @param {string} templateName - Имя файла шаблона
   * @param {string} templatesDir - Директория с шаблонами (опционально)
   * @returns {Promise<string|null>}
   */
  async getTemplateContent(templateName, templatesDir = null) {
    const dir = templatesDir || this.defaultTemplatesDir;
    const templatePath = path.join(dir, templateName);

    if (!fsSync.existsSync(templatePath)) {
      return null;
    }

    if (this.templateCache.has(templatePath)) {
      const cached = this.templateCache.get(templatePath);
      if (Date.now() - cached.timestamp < 60000) { // Кэш на 1 минуту
        return cached.content;
      }
    }

    const content = await fs.readFile(templatePath, 'utf8');
    this.templateCache.set(templatePath, { content, timestamp: Date.now() });
    this._manageCacheSize(this.templateCache);

    return content;
  }

  /**
   * Получение всех шаблонов из директории
   * @param {string} templatesDir - Директория с шаблонами (опционально)
   * @returns {Promise<Array<string>>}
   */
  async getAllTemplates(templatesDir = null) {
    const dir = templatesDir || this.defaultTemplatesDir;
    const templates = [];
    if (fsSync.existsSync(dir)) {
      const files = await fs.readdir(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = await fs.stat(filePath);
        if (stats.isFile() && (file.endsWith('.md') || file.endsWith('.json') || file.endsWith('.txt') || file.endsWith('.hbs') || file.endsWith('.handlebars'))) {
          templates.push(file);
        }
      }
    }
    return templates;
  }

  /**
   * Создание нового шаблона
   * @param {string} templateName - Имя файла шаблона
   * @param {string} content - Содержимое шаблона
   * @param {string} templatesDir - Директория с шаблонами (опционально)
   * @returns {Promise<boolean>} - true в случае успеха, false если шаблон уже существует
   */
  async createTemplate(templateName, content, templatesDir = null) {
    const dir = templatesDir || this.defaultTemplatesDir;
    const templatePath = path.join(dir, templateName);

    if (fsSync.existsSync(templatePath)) {
      this.logger.warn(`Шаблон уже существует: ${templateName}`);
      return false;
    }

    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(templatePath, content, 'utf8');
    this._clearTemplateCache(templatePath);
    return true;
  }

  /**
   * Обновление существующего шаблона
   * @param {string} templateName - Имя файла шаблона
   * @param {string} content - Новое содержимое шаблона
   * @param {string} templatesDir - Директория с шаблонами (опционально)
   * @returns {Promise<boolean>} - true в случае успеха, false если шаблон не найден
   */
  async updateTemplate(templateName, content, templatesDir = null) {
    const dir = templatesDir || this.defaultTemplatesDir;
    const templatePath = path.join(dir, templateName);

    if (!fsSync.existsSync(templatePath)) {
      this.logger.error(`Шаблон не найден для обновления: ${templateName}`);
      return false;
    }

    await fs.writeFile(templatePath, content, 'utf8');
    this._clearTemplateCache(templatePath);
    return true;
  }

  /**
   * Удаление шаблона
   * @param {string} templateName - Имя файла шаблона
   * @param {string} templatesDir - Директория с шаблонами (опционально)
   * @returns {Promise<boolean>} - true в случае успеха, false если шаблон не найден
   */
  async deleteTemplate(templateName, templatesDir = null) {
    const dir = templatesDir || this.defaultTemplatesDir;
    const templatePath = path.join(dir, templateName);

    if (!fsSync.existsSync(templatePath)) {
      this.logger.warn(`Шаблон не найден для удаления: ${templateName}`);
      return false;
    }

    await fs.unlink(templatePath);
    this._clearTemplateCache(templatePath);
    return true;
  }

  /**
   * Очистка кэша для конкретного шаблона
   * @param {string} templatePath - Путь к шаблону
   */
  _clearTemplateCache(templatePath) {
    this.templateCache.delete(templatePath);
    this.compiledTemplates.delete(templatePath);
  }

  /**
   * Приватный метод валидации JSON с базовой схемой
   * @private
   */
  _validateAgainstSchema(data, schema) {
    const errors = [];
    if (schema.required && Array.isArray(schema.required)) {
      for (const field of schema.required) {
        if (!(field in data)) {
          errors.push(`Обязательное поле "${field}" отсутствует`);
        }
      }
    }
    if (schema.properties) {
      for (const [field, rules] of Object.entries(schema.properties)) {
        if (data[field] !== undefined) {
          if (rules.type && typeof data[field] !== rules.type) {
            errors.push(`Поле "${field}" должно быть типа ${rules.type}`);
          }
          if (rules.enum && !rules.enum.includes(data[field])) {
            errors.push(`Поле "${field}" должно быть одним из: ${rules.enum.join(', ')}`);
          }
        }
      }
    }
    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined, data };
  }
}

export { TemplateUtils };
export const templateUtils = new TemplateUtils();
