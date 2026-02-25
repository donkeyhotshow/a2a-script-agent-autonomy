class ServiceLogger {
  constructor(logger) {
    this.logger = logger;
  }

  logServiceEvent(serviceId, eventType, message, data = {}) {
    const eventData = data || {};
    this.logger.info(`[Service:${serviceId}][${eventType}] ${message}`, eventData);
  }

  logServiceError(serviceId, message, error, data = {}) {
    const errorMessage = error ? error.message : 'Unknown error';
    const errorStack = error ? error.stack : undefined;
    this.logger.error(`[Service:${serviceId}][ERROR] ${message}: ${errorMessage}`, { ...data, stack: errorStack });
  }

  logServiceWarn(serviceId, message, data = {}) {
    this.logger.warn(`[Service:${serviceId}][WARN] ${message}`, data);
  }

  logServiceDebug(serviceId, message, data = {}) {
    this.logger.debug(`[Service:${serviceId}][DEBUG] ${message}`, data);
  }
}

module.exports = { ServiceLogger };
