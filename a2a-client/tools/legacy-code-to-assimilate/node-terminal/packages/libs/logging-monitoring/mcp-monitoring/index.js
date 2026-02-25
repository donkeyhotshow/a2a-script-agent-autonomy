/**
 * Unified MCP Monitoring Utilities Library
 * Объединенная библиотека утилит для мониторинга серверов Multi-Chain Protocol (MCP)
 */

const EventEmitter = require('eventemitter3');
const { LoggingUtils } = require('@libs/logging-monitoring/logging'); // Use alias system

// Simple error handler for MCP monitoring
class SimpleErrorHandler {
  constructor(options = {}) {
    this.logger = options.logger || new LoggingUtils();
  }
  
  handleError(error, context = {}) {
    this.logger.error(`[ErrorHandler] ${context.context || 'Unknown context'}:`, error.message, error.stack);
  }
}

class MCPMonitoringManager extends EventEmitter {
  constructor(options = {}) {
    super();
    this.logger = options.logger || new LoggingUtils();
    this.errorHandler = options.errorHandler || new SimpleErrorHandler({ logger: this.logger });
    this.mcpConnections = options.mcpConnections || new Map(); // Map of MCP connections (passed from daemon)
    this.monitoringInterval = options.monitoringInterval || 10000; // Интервал мониторинга MCP серверов
    this.inactivityTimeout = options.inactivityTimeout || 60000; // Таймаут неактивности для сервера (1 минута)
    this.monitoringTimer = null;
  }

  /**
   * Запускает цикл мониторинга MCP серверов.
   */
  startMCPMonitoring() {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
    this.monitoringTimer = setInterval(async () => {
      await this.monitorMCPServers();
    }, this.monitoringInterval);
    this.logger.info('[MCPMonitoringManager] Мониторинг MCP серверов запущен.');
  }

  /**
   * Останавливает цикл мониторинга MCP серверов.
   */
  stopMCPMonitoring() {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
      this.logger.info('[MCPMonitoringManager] Мониторинг MCP серверов остановлен.');
    }
  }

  /**
   * Мониторит состояние всех зарегистрированных MCP серверов.
   */
  async monitorMCPServers() {
    try {
      if (!this.mcpConnections || this.mcpConnections.size === 0) {
        this.logger.debug('[MCPMonitoringManager] Нет зарегистрированных MCP серверов для мониторинга.');
        return;
      }

      for (const [serverId, server] of this.mcpConnections.entries()) {
        const isHealthy = await this.checkMCPServerHealth(server);

        if (!isHealthy) {
          this.logger.warn('[MCPMonitoringManager] MCP сервер плохо', { serverId, serverInfo: server });
          this.emit('mcpServerBad', { serverId, server });
        }
      }
    } catch (error) {
      this.errorHandler.handleError(error, { context: 'MCPMonitoringManager.monitorMCPServers' });
    }
  }

  /**
   * Проверяет здоровье отдельного MCP сервера.
   * @param {object} server - Объект сервера с информацией о соединении и активности.
   * @returns {Promise<boolean>} true, если сервер здоров, false в противном случае.
   */
  async checkMCPServerHealth(server) {
    try {
      if (!server.connected) {
        return false;
      }

      const lastActivity = server.lastActivity || 0;
      const timeSinceLastActivity = Date.now() - lastActivity;

      if (timeSinceLastActivity > this.inactivityTimeout) {
        this.logger.warn('[MCPMonitoringManager] MCP сервер неактивен', { serverId: server.id, timeSinceLastActivity });
        return false;
      }

      // Дополнительные проверки могут быть добавлены здесь (например, пинг, запрос статуса)

      return true;
    } catch (error) {
      this.logger.error('[MCPMonitoringManager] Ошибка при проверке здоровья MCP сервера:', error);
      return false;
    }
  }

  /**
   * Регистрирует новый MCP сервер для мониторинга.
   * @param {string} serverId - Уникальный ID сервера.
   * @param {object} serverInfo - Объект с информацией о сервере (например, host, port).
   */
  registerMCPServer(serverId, serverInfo) {
    this.mcpConnections.set(serverId, {
      id: serverId,
      ...serverInfo,
      registeredAt: Date.now(),
      lastActivity: Date.now(),
      connected: true
    });
    this.logger.info('[MCPMonitoringManager] MCP сервер зарегистрирован', { serverId, serverInfo });
    this.emit('mcpServerRegistered', { serverId, serverInfo });
  }

  /**
   * Отменяет регистрацию MCP сервера.
   * @param {string} serverId - ID сервера для отмены регистрации.
   * @returns {boolean} true, если сервер был удален, false в противном случае.
   */
  unregisterMCPServer(serverId) {
    const removed = this.mcpConnections.delete(serverId);
    if (removed) {
      this.logger.info('[MCPMonitoringManager] MCP сервер отменен', { serverId });
      this.emit('mcpServerUnregistered', { serverId });
    }
    return removed;
  }

  /**
   * Обновляет время последней активности MCP сервера.
   * @param {string} serverId - ID сервера.
   * @returns {void}
   */
  updateMCPServerActivity(serverId) {
    const server = this.mcpConnections.get(serverId);
    if (server) {
      server.lastActivity = Date.now();
      this.logger.debug('[MCPMonitoringManager] Активность MCP сервера обновлена', { serverId });
    } else {
      this.logger.warn('[MCPMonitoringManager] Попытка обновить активность несуществующего MCP сервера', { serverId });
    }
  }

  /**
   * Получает информацию о зарегистрированном MCP сервере.
   * @param {string} serverId - ID сервера.
   * @returns {object|undefined}
   */
  getMCPServer(serverId) {
    return this.mcpConnections.get(serverId);
  }

  /**
   * Получает список всех зарегистрированных MCP серверов.
   * @returns {Array<object>}
   */
  getAllMCPServers() {
    return Array.from(this.mcpConnections.values());
  }
}

module.exports = { MCPMonitoringManager, SimpleErrorHandler, mcpMonitoringManager: new MCPMonitoringManager() };
