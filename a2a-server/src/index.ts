import http from 'http';
import app from './app.js';
import {config} from './config/index.js';
import {logger} from './utils/logger.js';
import {setDatabaseLogger} from './config/database.js';
import {startRequestProcessor, stopRequestProcessor} from './services/request-processor.service.js';
import {sessionWebSocketManager} from './routes/sessions.websocket.js';

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket server
sessionWebSocketManager.initialize(server);

// Wire shared logger into database layer without introducing config↔utils cycles
setDatabaseLogger(logger);

// Request processor: timer loop picks first pending request
startRequestProcessor(config.requestProcessorIntervalMs);

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
    sessionWebSocketManager.shutdown();

    server.close((err) => {
        if (err) {
            logger.error('Error during server shutdown', {error: err.message});
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
process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled promise rejection', {
        reason: String(reason),
        promise: String(promise),
    });
});

export default server;
