/**
 * Модель для управления серверами (CommonJS версия)
 * Расширяет BaseModel специфичной функциональностью для серверов
 */

const { BaseModel } = require('../core/BaseModel.cjs');

class ServersModel extends BaseModel {
  constructor(config = {}) {
    super(config, {
      schema: {
        type: 'object',
        properties: {
          version: { type: 'string' },
          servers: {
            type: 'object',
            patternProperties: {
              '^[a-zA-Z0-9-_]+$': {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  host: { type: 'string' },
                  port: { type: 'number', minimum: 1, maximum: 65535 },
                  protocol: { type: 'string', enum: ['http', 'https', 'ws', 'wss', 'tcp', 'udp'] },
                  status: { type: 'string', enum: ['online', 'offline', 'maintenance', 'error'] },
                  environment: { type: 'string', enum: ['development', 'staging', 'production', 'testing'] },
                  region: { type: 'string' },
                  description: { type: 'string' },
                  credentials: { type: 'object' },
                  monitoring: { type: 'object' },
                  metadata: { type: 'object' }
                },
                required: ['id', 'name', 'host', 'port', 'protocol']
              }
            }
          },
          clusters: {
            type: 'object',
            patternProperties: {
              '^[a-zA-Z0-9-_]+$': {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  name: { type: 'string' },
                  description: { type: 'string' },
                  servers: { type: 'array' },
                  loadBalancer: { type: 'object' },
                  failover: { type: 'object' }
                },
                required: ['id', 'name']
              }
            }
          },
          required: ['version']
        }
      }
    });

    this.servers = this.config.servers || {};
    this.clusters = this.config.clusters || {};
  }

  /**
   * Получение всех серверов
   */
  getAllServers() {
    return this.servers;
  }

  /**
   * Получение сервера по ID
   */
  getServer(id) {
    return this.servers[id] || null;
  }

  /**
   * Добавление сервера
   */
  addServer(id, serverConfig) {
    this.servers[id] = serverConfig;
    this.updateConfig({ servers: this.servers });
  }

  /**
   * Обновление сервера
   */
  updateServer(id, updates) {
    if (this.servers[id]) {
      this.servers[id] = { ...this.servers[id], ...updates };
      this.updateConfig({ servers: this.servers });
    }
  }

  /**
   * Удаление сервера
   */
  removeServer(id) {
    if (this.servers[id]) {
      delete this.servers[id];
      this.updateConfig({ servers: this.servers });
    }
  }

  /**
   * Получение серверов по статусу
   */
  getServersByStatus(status) {
    return Object.keys(this.servers).filter(id => this.servers[id].status === status);
  }

  /**
   * Получение серверов по окружению
   */
  getServersByEnvironment(environment) {
    return Object.keys(this.servers).filter(id => this.servers[id].environment === environment);
  }

  /**
   * Получение всех кластеров
   */
  getAllClusters() {
    return this.clusters;
  }

  /**
   * Получение кластера по ID
   */
  getCluster(id) {
    return this.clusters[id] || null;
  }

  /**
   * Добавление кластера
   */
  addCluster(id, clusterConfig) {
    this.clusters[id] = clusterConfig;
    this.updateConfig({ clusters: this.clusters });
  }

  /**
   * Валидация конфигурации сервера
   */
  validateServer(serverConfig) {
    return this.validate(serverConfig);
  }
}

module.exports = { ServersModel };
