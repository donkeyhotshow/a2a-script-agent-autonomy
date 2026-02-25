class ServiceDataManager {
  constructor(serviceManager, serviceConfigManager, cache, cacheTimeout, logger) {
    this.serviceManager = serviceManager;
    this.serviceConfigManager = serviceConfigManager;
    this.cache = cache;
    this.cacheTimeout = cacheTimeout;
    this.logger = logger;
  }

  /**
   * Получить все сервисы в структурированном виде
   */
  async getServicesData(format = 'structured') {
    const cacheKey = `services:${format}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const services = this.serviceConfigManager.services;
    const groups = this.serviceConfigManager.groups;
    let result;

    switch (format) {
      case 'flat':
        result = Object.entries(services).map(([id, service]) => ({
          id,
          ...service,
          groupInfo: groups?.[service.group] || {}
        }));
        break;

      case 'grouped':
        result = {};
        for (const [groupId, group] of Object.entries(groups || {})) {
          result[groupId] = {
            ...group,
            services: group.services?.map(serviceId => ({
              id: serviceId,
              ...services[serviceId]
            })) || []
          };
        }
        break;

      case 'hierarchical':
        result = {
          groups: groups,
          services: services,
          metadata: {
            totalServices: Object.keys(services).length,
            totalGroups: Object.keys(groups || {}).length,
            enabledServices: Object.values(services).filter(s => s.enabled).length
          }
        };
        break;

      case 'api':
        result = {
          success: true,
          data: {
            services: services,
            groups: groups,
            timestamp: new Date().toISOString(),
            version: this.serviceConfigManager.rawConfig.version || '1.0.0'
          }
        };
        break;

      default: // structured
        result = {
          services: services,
          groups: groups,
          settings: this.serviceConfigManager.settings,
          gateway: this.serviceConfigManager.gateway
        };
    }

    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    return result;
  }

  /**
   * Получить конкретный сервис с детальной информацией
   */
  async getServiceData(serviceId, includeStatus = true) {
    const service = this.serviceConfigManager.services?.[serviceId];
    if (!service) {
      throw new Error(`Service '${serviceId}' not found`);
    }

    let result = {
      ...service,
      id: serviceId,
      groupInfo: this.serviceConfigManager.groups?.[service.group] || {}
    };

    if (includeStatus) {
      try {
        const status = await this.serviceManager.getServiceStatus(serviceId);
        result.status = status;
      } catch (error) {
        result.status = { error: error.message };
      }
    }

    return result;
  }

  /**
   * Получить статистику по сервисам
   */
  async getServicesStats() {
    const services = this.serviceConfigManager.services;
    const groups = this.serviceConfigManager.groups;

    const stats = {
      total: Object.keys(services).length,
      enabled: Object.values(services).filter(s => s.enabled).length,
      disabled: Object.values(services).filter(s => !s.enabled).length,
      autostart: Object.values(services).filter(s => s.autostart).length,
      byGroup: {},
      byType: {},
      byStatus: {}
    };

    // Статистика по группам
    for (const [groupId, group] of Object.entries(groups)) {
      const groupServices = group.services || [];
      stats.byGroup[groupId] = {
        total: groupServices.length,
        enabled: groupServices.filter(id => services[id]?.enabled).length,
        autostart: groupServices.filter(id => services[id]?.autostart).length
      };
    }

    // Статистика по типам
    for (const service of Object.values(services)) {
      const type = service.type || 'unknown';
      stats.byType[type] = (stats.byType[type] || 0) + 1;
    }

    return stats;
  }
}

module.exports = { ServiceDataManager };
