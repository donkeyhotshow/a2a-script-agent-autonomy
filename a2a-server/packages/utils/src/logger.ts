import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import * as fs from "node:fs/promises";
import * as path from "path";
import { config } from "@a2a/server-config/index.js";

const logsDir = path.join(process.cwd(), "logs");

// Define log format
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  config.logFormat === "pretty"
    ? winston.format.printf(({ level, message, timestamp, ...metadata }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(metadata).length > 0) {
          msg += ` ${JSON.stringify(metadata)}`;
        }
        return msg;
      })
    : winston.format.json(),
);

const consoleFormat =
  config.logFormat === "pretty"
    ? winston.format.combine(winston.format.colorize(), logFormat)
    : logFormat;

// Ensure logs directory exists
async function ensureLogsDir(): Promise<void> {
  try {
    await fs.access(logsDir);
  } catch {
    await fs.mkdir(logsDir, { recursive: true });
  }
}

/** Windows/other: skip if another process holds the file (tail, IDE, second server). */
async function safeUnlink(filePath: string): Promise<boolean> {
  try {
    await fs.unlink(filePath);
    return true;
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === "EBUSY" || code === "EPERM" || code === "ENOENT") {
      return false;
    }
    throw err;
  }
}

/** Boot-clean: удаляем старые логи при запуске (старше 30 дней) */
async function bootClean(): Promise<void> {
  try {
    const files = await fs.readdir(logsDir, { withFileTypes: true });
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    let cleanedCount = 0;

    for (const file of files) {
      if (file.isDirectory()) continue;

      const filePath = path.join(logsDir, file.name);
      const stats = await fs.stat(filePath);

      if (now - stats.mtime.getTime() > maxAge) {
        if (await safeUnlink(filePath)) {
          cleanedCount++;
        }
      }
    }

    if (cleanedCount > 0) {
      console.log(`[Boot-Clean] Removed ${cleanedCount} old log files`);
    }
  } catch (error) {
    console.error("[Boot-Clean] Error during cleanup:", error);
  }
}

// Create logger instance
export const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  defaultMeta: { service: "a2a-server" },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});

// Initialize logger with daily rotation
(async () => {
  try {
    await ensureLogsDir();
    await bootClean();

    // Add daily rotation file transport
    const dailyRotateTransport = new DailyRotateFile({
      filename: path.join(logsDir, "a2a-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "100m",
      maxFiles: "30d", // Keep logs for 30 days
      format: logFormat,
      level: config.logLevel,
    });

    logger.add(dailyRotateTransport);
    console.log(
      `[Logger] Initialized with daily rotation, level: ${config.logLevel}, format: ${config.logFormat}`,
    );
  } catch (error) {
    console.error("Failed to initialize log rotation:", error);
  }
})();

// Request logging middleware
export function requestLogger(req: any, res: any, next: any): void {
  const start = Date.now();
  const clientId = req.client?.id || "anonymous";
  const userAgent = req.get("User-Agent") || "";
  const ip = req.ip || req.connection.remoteAddress || "unknown";

  // Log when request finishes
  res.on("finish", () => {
    const duration = Date.now() - start;
    const logEntry = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms - ${clientId} - ${ip} - ${userAgent}`;

    if (res.statusCode >= 400) {
      logger.warn(logEntry);
    } else {
      logger.info(logEntry);
    }
  });

  next();
}

// Cleanup old log files (older than 30 days, excluding the active log and directories)
export async function cleanupOldLogs(): Promise<void> {
  try {
    const files = await fs.readdir(logsDir, { withFileTypes: true });
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    let cleanedCount = 0;

    for (const file of files) {
      if (file.isDirectory()) continue;

      const filePath = path.join(logsDir, file.name);
      const stats = await fs.stat(filePath);

      if (now - stats.mtime.getTime() > maxAge) {
        if (await safeUnlink(filePath)) {
          cleanedCount++;
        }
      }
    }

    if (cleanedCount > 0) {
      logger.info(`Cleaned up ${cleanedCount} old log files`);
    }
  } catch (error) {
    logger.error("Log cleanup error:", error);
  }
}

// Performance monitoring
export function performanceMonitor(): void {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();

  logger.info("Performance metrics", {
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

/** Scoped logger (winston child) for modules that expect `createLogger(name)`. */
export function createLogger(label: string) {
  return logger.child({ label });
}

// Export convenience methods
export const log = {
  info: (message: string, meta?: Record<string, unknown>) =>
    logger.info(message, meta),
  error: (message: string, meta?: Record<string, unknown>) =>
    logger.error(message, meta),
  warn: (message: string, meta?: Record<string, unknown>) =>
    logger.warn(message, meta),
  debug: (message: string, meta?: Record<string, unknown>) =>
    logger.debug(message, meta),
};

export default logger;
