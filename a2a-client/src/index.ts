import http from 'http';
import app from './app.js';
import { config } from './config/index.js';
import { logger } from './utils/logger.js';
import { initWebSocket } from './websocket/index.js';
import { startRequestProcessor, stopRequestProcessor } from './services/request-processor.service.js';
import { startWatchdog, stopWatchdog } from './services/watchdog.service.js';

// Create HTTP server
const server = http.createServer(app);

// WebSocket (handles upgrade on /ws/sessions/*)
initWebSocket(server);

// Services
startRequestProcessor(config.requestProcessorIntervalMs);
startWatchdog();

// Start server
server.listen(config.port, () => {
  logger.info(`A2A Server started`, {
    port: config.port,
    environment: config.nodeEnv,
    pid: process.pid,
  });
  
  logger.info(`Health check available at http://localhost:${config.port}/health`);
  logger.info(`API available at http://localhost:${config.port}/api/v1`);
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  stopRequestProcessor();
  stopWatchdog();

  server.close((err) => {
    if (err) {
      logger.error('Error during server shutdown', { error: err.message });
      process.exit(1);
    }
    
    logger.info('Server closed successfully');
    process.exit(0);
  });
  
  // Force shutdown after timeout
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack,
  });
  process.exit(1);
});

// Handle unhandled promise rejections
// ВИПРАВЛЕНО: Тепер викидає помилку замість продовження роботи
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled promise rejection', {
    reason: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
    promise: String(promise),
  });
  // В production потрібно зупинити процес
  if (process.env['NODE_ENV'] === 'production') {
    process.exit(1);
  }
});

export default server;
