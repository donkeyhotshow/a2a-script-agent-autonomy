import winston from "winston";
export declare const logger: winston.Logger;
export declare function requestLogger(req: any, res: any, next: any): void;
export declare function cleanupOldLogs(): Promise<void>;
export declare function performanceMonitor(): void;
export declare function createLogger(label: string): winston.Logger;
export declare const log: {
    info: (message: string, meta?: Record<string, unknown>) => winston.Logger;
    error: (message: string, meta?: Record<string, unknown>) => winston.Logger;
    warn: (message: string, meta?: Record<string, unknown>) => winston.Logger;
    debug: (message: string, meta?: Record<string, unknown>) => winston.Logger;
};
export default logger;
//# sourceMappingURL=logger.d.ts.map