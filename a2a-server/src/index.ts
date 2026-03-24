import http from 'http';
import app from './app.js';
import {config} from './config/index.js';
import {logger} from './utils/logger.js';
import {startRequestProcessor, stopRequestProcessor} from './daemon/request-processor-daemon.js';
import {actionRegistry} from './actions/action-registry.js';

// Create HTTP server
const server = http.createServer(app);

async function bootstrap(): Promise<void> {
    try {
        await actionRegistry.loadFromDirectory();
        logger.info('[Bootstrap] Action registry loaded', {count: actionRegistry.count});
    } catch (err) {
        logger.error('[Bootstrap] Action registry load failed — router will use empty registry / fallback', {
            error: err instanceof Error ? err.message : String(err),
        });
    }

    startRequestProcessor(config.requestProcessorIntervalMs);

    server.listen(config.port, () => {
        logger.info(`A2A Server started (Simulation Mode)`, {
            port: config.port,
            environment: config.nodeEnv,
            pid: process.pid,
            actionsRegistered: actionRegistry.count,
        });

        logger.info(`Health check: http://localhost:${config.port}/health`);
        logger.info(`API: http://localhost:${config.port}/api/v1/invoke`);
    });
}

void bootstrap();

// Graceful shutdown
const gracefulShutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    stopRequestProcessor();

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
