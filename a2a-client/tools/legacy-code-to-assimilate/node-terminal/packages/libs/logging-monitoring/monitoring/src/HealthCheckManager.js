const http = require('http');

class HealthCheckManager {
  constructor(options = {}, logger) {
    this.options = {
      timeout: options.timeout || 5000, // Таймаут для HTTP-запросов
      ...options
    };
    this.logger = logger;
  }

  /**
   * Выполняет HTTP Health Check по указанному URL.
   * @param {string} url - URL для проверки здоровья.
   * @returns {Promise<object>} Результат проверки: { ok: boolean, status?: number, message: string }
   */
  async checkUrl(url) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);
      this.logger.debug(`[HealthCheckManager] Performing health check for URL: ${url}`);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (response.ok) {
        this.logger.debug(`[HealthCheckManager] Health check successful for URL: ${url}, status: ${response.status}`);
        return { ok: true, status: response.status, message: 'OK' };
      } else {
        this.logger.warn(`[HealthCheckManager] Health check failed for URL: ${url}, status: ${response.status}`);
        return { ok: false, status: response.status, message: `HTTP Error: ${response.status}` };
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        this.logger.error(`[HealthCheckManager] Health check timed out for URL: ${url}`);
        return { ok: false, message: `Health check timed out after ${this.options.timeout}ms` };
      } else {
        this.logger.error(`[HealthCheckManager] Health check error for URL: ${url}: ${error.message}`);
        return { ok: false, message: `Network Error: ${error.message}` };
      }
    }
  }

  /**
   * Проверяет health endpoint с использованием HTTP модуля Node.js.
   * @param {string} url - URL для проверки здоровья.
   * @param {number} timeout - Таймаут в мс.
   * @returns {Promise<object>} Результат проверки: { ok: boolean, statusCode?: number, error?: string }.
   */
  async checkHealthEndpoint(url, timeout = this.options.timeout) {
    return new Promise((resolve) => {
      const req = http.get(url, { timeout }, (res) => {
        resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, statusCode: res.statusCode });
      });
      
      req.on('error', (e) => {
        this.logger.error(`[HealthCheckManager] Health endpoint error for ${url}: ${e.message}`);
        resolve({ ok: false, error: e.message });
      });
      
      req.on('timeout', () => {
        req.destroy();
        this.logger.error(`[HealthCheckManager] Health endpoint timeout for ${url} after ${timeout}ms.`);
        resolve({ ok: false, error: 'Timeout' });
      });
    });
  }

  /**
   * Комплексная проверка здоровья сервиса с портом.
   * @param {object} serviceConfig - Конфигурация сервиса (должна содержать port и healthUrl).
   * @param {function} checkPortWithNetstatNativeCallback - Колбэк для проверки порта через netstat.
   * @returns {Promise<object>} Объект статуса здоровья сервиса.
   */
  async checkServiceHealth(serviceConfig, checkPortWithNetstatNativeCallback) {
    const { port, healthUrl, name } = serviceConfig;
    
    if (!port) {
      this.logger.warn(`[HealthCheckManager] Service health check: Port not specified for ${name}.`);
      return { status: 'unknown', details: { error: 'Порт не указан' } };
    }
    
    // 1. Проверяем netstat
    const netstatCheck = await checkPortWithNetstatNativeCallback(port);
    
    if (!netstatCheck.listening) {
      this.logger.error(`[HealthCheckManager] Service health check: Port ${port} not listening for ${name}. Details:`, netstatCheck);
      return { 
        status: 'stopped', 
        details: { 
          netstat: netstatCheck,
          message: `Порт ${port} не прослушивается` 
        } 
      };
    }
    
    // 2. Если есть healthUrl, проверяем его
    if (healthUrl) {
      const healthCheck = await this.checkHealthEndpoint(healthUrl);
      if (!healthCheck.ok) {
        this.logger.error(`[HealthCheckManager] Service health check: Health URL ${healthUrl} failed for ${name}. Details:`, healthCheck);
      }
      return {
        status: healthCheck.ok ? 'running' : 'error',
        details: {
          netstat: netstatCheck,
          health: healthCheck,
          message: healthCheck.ok 
            ? `Сервис ${name} работает нормально` 
            : `Сервис ${name} отвечает с ошибкой`
        }
      };
    }
    
    // 3. Если нет healthUrl, но порт слушается - считаем работающим
    return {
      status: 'running',
      details: {
        netstat: netstatCheck,
        message: `Порт ${port} прослушивается`
      }
    };
  }
}

module.exports = { HealthCheckManager };
