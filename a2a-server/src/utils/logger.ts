import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import * as fs from 'fs/promises';
import * as path from 'path';
import {config} from '../config/index.js';

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
    winston.format.errors({stack: true}),
    winston.format.splat(),
    config.logFormat === 'pretty'
        ? winston.format.printf(({level, message, timestamp, ...metadata}) => {
            let msg = `${timestamp} [${level}]: ${message}`;
            if (Object.keys(metadata).length > 0) {
                msg += ` ${JSON.stringify(metadata)}`;
            }
            return msg;
        })
        : winston.format.json()
);

// Ensure logs directory exists
async function ensureLogsDir(): Promise<void> {
    const logsDir = path.join(process.cwd(), 'logs');
    try {
        await fs.access(logsDir);
    } catch {
        await fs.mkdir(logsDir, { recursive: true });
    }
}

// Create logger instance
export const logger = winston.createLogger({
    level: config.logLevel,
    format: logFormat,
    defaultMeta: {service: 'a2a-server'},
    transports: [
        // Console transport
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), logFormat),
        }),
    ],
});

// Add file transports with rotation
(async () => {
    await ensureLogsDir();

    // Error logs with daily rotation
    logger.add(new DailyRotateFile({
        filename: 'logs/error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '14d', // Keep logs for 14 days
        zippedArchive: true,
    }));

    // Combined logs with daily rotation
    logger.add(new DailyRotateFile({
        filename: 'logs/combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d', // Keep logs for 14 days
        zippedArchive: true,
    }));

    // Access logs for requests
    logger.add(new DailyRotateFile({
        filename: 'logs/access-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '7d', // Keep access logs for 7 days
        zippedArchive: true,
    }));
})();

// Access logger for HTTP requests
export const accessLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp({format: 'YYYY-MM-DD HH:mm:ss'}),
        winston.format.printf(({timestamp, message}) => `${timestamp} ${message}`)
    ),
    transports: [
        new DailyRotateFile({
            filename: 'logs/access-%DATE%.log',
            datePattern: 'YYYY-MM-DD',
            maxSize: '20m',
            maxFiles: '7d',
            zippedArchive: true,
        }),
    ],
});

// Request logging middleware
export function requestLogger(req: any, res: any, next: any): void {
    const start = Date.now();
    const clientId = req.client?.id || 'anonymous';
    const userAgent = req.get('User-Agent') || '';
    const ip = req.ip || req.connection.remoteAddress || 'unknown';

    // Log when request finishes
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logEntry = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms - ${clientId} - ${ip} - ${userAgent}`;

        if (res.statusCode >= 400) {
            accessLogger.warn(logEntry);
        } else {
            accessLogger.info(logEntry);
        }
    });

    next();
}

// Cleanup old log archives (older than 30 days)
export async function cleanupOldLogs(): Promise<void> {
    try {
        const logsDir = path.join(process.cwd(), 'logs');
        const files = await fs.readdir(logsDir);
        const now = Date.now();
        const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
        let cleanedCount = 0;

        for (const file of files) {
            if (!file.endsWith('.gz')) continue;

            const filePath = path.join(logsDir, file);
            const stats = await fs.stat(filePath);

            if (now - stats.mtime.getTime() > maxAge) {
                await fs.unlink(filePath);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            logger.info(`Cleaned up ${cleanedCount} old log archives`);
        }
    } catch (error) {
        logger.error('Log cleanup error:', error);
    }
}

// Performance monitoring
export function performanceMonitor(): void {
    const memUsage = process.memoryUsage();
    const uptime = process.uptime();

    logger.info('Performance metrics', {
        memory: {
            rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
            heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
            heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
            external: `${Math.round(memUsage.external / 1024 / 1024)}MB`,
        },
        uptime: `${Math.round(uptime / 3600)}h ${Math.round((uptime % 3600) / 60)}m`,
        pid: process.pid,
    });
}

// Run performance monitoring every 5 minutes
setInterval(performanceMonitor, 5 * 60 * 1000);

// Run cleanup every 24 hours
setInterval(cleanupOldLogs, 24 * 60 * 60 * 1000);

// Export convenience methods
export const log = {
    info: (message: string, meta?: Record<string, unknown>) => logger.info(message, meta),
    error: (message: string, meta?: Record<string, unknown>) => logger.error(message, meta),
    warn: (message: string, meta?: Record<string, unknown>) => logger.warn(message, meta),
    debug: (message: string, meta?: Record<string, unknown>) => logger.debug(message, meta),
};

export default logger;
