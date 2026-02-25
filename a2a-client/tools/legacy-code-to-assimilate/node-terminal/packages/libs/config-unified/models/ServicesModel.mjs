/**
 * Модель для управления сервисами (ESM версия)
 * Расширяет BaseModel специфичной функциональностью для сервисов
 */

import { BaseModel } from '../core/BaseModel.mjs';

class ServicesModel extends BaseModel {
  constructor(config = {}) {
    super(config, {
      schema: {
        type: 'object',
        properties: {
          version: { type: 'string' },
          global: {
            type: 'object',
            properties: {
              logging: { type: 'object' },
              monitoring: { type: 'object' },
              security: { type: 'object' }
            }
          },
          services: {
            type: 'object',
            patternProperties: {
              '^[a-zA-Z0-9-_]+$': {
                type: 'object',
                properties: {
                  appId: { type: 'string' },
                  name: { type: 'string' },
                  enabled: { type: 'boolean' },
                  group: { type: 'string' },
                  status: { type: 'string', enum: ['running', 'stopped', 'error', 'starting', 'stopping'] },
                  type: { type: 'string' },
                  load: { type: 'number', minimum: 0, maximum: 100 },
                  region: { type: 'string' },
                  description: { type: 'string' },
                  environment: { type: 'object' },
                  ports: { type: 'array' },
                  startCommands: { type: 'array' },
                  resources: { type: 'object' },
                  logging: { type: 'object' },
                  process: { type: 'object' },
                  dependencies: { type: 'array' },
                  notifications: { type: 'object' }
                },
                required: ['appId', 'name', 'enabled']
              }
            }
          },
          required: ['version']
        }
      }
    });

    this.services = this.config.services || {};
  }

  /**
   * Получение всех сервисов
   */
  getAllServices() {
    return this.services;
  }

  /**
   * Получение сервиса по имени
   */
  getService(name) {
    return this.services[name] || null;
  }

  /**
   * Добавление сервиса
   */
  addService(name, serviceConfig) {
    this.services[name] = serviceConfig;
    this.updateConfig({ services: this.services });
  }

  /**
   * Обновление сервиса
   */
  updateService(name, updates) {
    if (this.services[name]) {
      this.services[name] = { ...this.services[name], ...updates };
      this.updateConfig({ services: this.services });
    }
  }

  /**
   * Удаление сервиса
   */
  removeService(name) {
    if (this.services[name]) {
      delete this.services[name];
      this.updateConfig({ services: this.services });
    }
  }

  /**
   * Получение сервисов по статусу
   */
  getServicesByStatus(status) {
    return Object.keys(this.services).filter(name => this.services[name].status === status);
  }

  /**
   * Получение сервисов по группе
   */
  getServicesByGroup(group) {
    return Object.keys(this.services).filter(name => this.services[name].group === group);
  }

  /**
   * Валидация конфигурации сервиса
   */
  validateService(serviceConfig) {
    return this.validate(serviceConfig);
  }
}

export { ServicesModel };
