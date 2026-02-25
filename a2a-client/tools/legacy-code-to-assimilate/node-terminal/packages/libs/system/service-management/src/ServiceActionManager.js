class ServiceActionManager {
  constructor(serviceManager, serviceConfigManager, serviceValidator, cache, eventEmitter, logger) {
    this.serviceManager = serviceManager;
    this.serviceConfigManager = serviceConfigManager;
    this.serviceValidator = serviceValidator;
    this.cache = cache;
    this.eventEmitter = eventEmitter;
    this.logger = logger;
  }

  /**
   * Создать новый сервис
   */
  async createService(serviceData) {
    const validation = this.serviceValidator.validateServiceData(serviceData);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Проверяем, что ID уникален
    if (this.serviceConfigManager.services?.[serviceData.id]) {
      throw new Error(`Service with ID '${serviceData.id}' already exists`);
    }

    // Добавляем сервис в конфигурацию
    this.serviceConfigManager.rawConfig.services[serviceData.id] = {
      ...serviceData,
      status: 'stopped',
      startTime: null
    };

    // Добавляем сервис в группу
    if (serviceData.group && this.serviceConfigManager.groups?.[serviceData.group]) {
      if (!this.serviceConfigManager.rawConfig.groups[serviceData.group].services) {
        this.serviceConfigManager.rawConfig.groups[serviceData.group].services = [];
      }
      this.serviceConfigManager.rawConfig.groups[serviceData.group].services.push(serviceData.id);
    }

    // Сохраняем конфигурацию
    await this.serviceConfigManager.saveConfiguration();

    // Очищаем кэш
    this.cache.clear();

    // Уведомляем о событии
    this.eventEmitter.emit('service:created', serviceData);

    return {
      success: true,
      service: serviceData,
      message: 'Сервис успешно создан'
    };
  }

  /**
   * Обновить существующий сервис
   */
  async updateService(serviceId, updateData) {
    if (!this.serviceConfigManager.services?.[serviceId]) {
      throw new Error(`Service '${serviceId}' not found`);
    }

    const validation = this.serviceValidator.validateServiceData({ ...this.serviceConfigManager.services[serviceId], ...updateData });
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
    }

    // Обновляем сервис
    this.serviceConfigManager.rawConfig.services[serviceId] = {
      ...this.serviceConfigManager.services[serviceId],
      ...updateData
    };

    // Сохраняем конфигурацию
    await this.serviceConfigManager.saveConfiguration();

    // Очищаем кэш
    this.cache.clear();

    // Уведомляем о событии
    this.eventEmitter.emit('service:updated', { id: serviceId, data: updateData });

    return {
      success: true,
      service: this.serviceConfigManager.services[serviceId],
      message: 'Сервис успешно обновлен'
    };
  }

  /**
   * Удалить сервис
   */
  async deleteService(serviceId) {
    if (!this.serviceConfigManager.services?.[serviceId]) {
      throw new Error(`Service '${serviceId}' not found`);
    }

    const service = this.serviceConfigManager.services[serviceId];

    // Останавливаем сервис если запущен
    try {
      await this.serviceManager.stopService(serviceId);
    } catch (error) {
      this.logger.warn(`Failed to stop service ${serviceId}:`, error.message);
    }

    // Удаляем из группы
    if (service.group && this.serviceConfigManager.groups?.[service.group]) {
      const group = this.serviceConfigManager.rawConfig.groups[service.group];
      if (group.services) {
        group.services = group.services.filter(id => id !== serviceId);
      }
    }

    // Удаляем сервис
    delete this.serviceConfigManager.rawConfig.services[serviceId];

    // Сохраняем конфигурацию
    await this.serviceConfigManager.saveConfiguration();

    // Очищаем кэш
    this.cache.clear();

    // Уведомляем о событии
    this.eventEmitter.emit('service:deleted', { id: serviceId, service });

    return {
      success: true,
      message: 'Сервис успешно удален'
    };
  }
}

module.exports = { ServiceActionManager };
