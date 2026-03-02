import {PrismaClient} from '@prisma/client';

/**
 * Database Configuration
 *
 * Реализация на основе плана: plans/a2a-server-implementation-plan.md
 *
 * Prisma client setup and connection management
 */

let prisma: PrismaClient | null = null;

export type DatabaseLogger = {
    info: (message: string, meta?: Record<string, unknown>) => void;
    error: (message: string, meta?: Record<string, unknown>) => void;
    warn: (message: string, meta?: Record<string, unknown>) => void;
    debug: (message: string, meta?: Record<string, unknown>) => void;
};

let databaseLogger: DatabaseLogger = {
    info: (message, meta) => console.info(message, meta),
    error: (message, meta) => console.error(message, meta),
    warn: (message, meta) => console.warn(message, meta),
    debug: (message, meta) => console.debug(message, meta),
};

export function setDatabaseLogger(logger: DatabaseLogger): void {
    databaseLogger = logger;
}

/**
 * Get Prisma client instance
 */
export function getPrismaClient(): PrismaClient {
    if (!prisma) {
        prisma = new PrismaClient({
            log: [
                {
                    emit: 'event',
                    level: 'query',
                },
                {
                    emit: 'event',
                    level: 'error',
                },
                {
                    emit: 'event',
                    level: 'warn',
                },
            ],
        });
        prisma.$on('query', (e) => databaseLogger.debug('Prisma query', {query: e.query}));
        prisma.$on('error', (e) => databaseLogger.error('Prisma error', {message: e.message}));
        prisma.$on('warn', (e) => databaseLogger.warn('Prisma warn', {message: e.message}));
    }

    return prisma;
}

/**
 * Connect to database
 */
export async function connectDatabase(): Promise<void> {
    const p = getPrismaClient();
    await p.$connect();
    databaseLogger.info('Database connected');
}

/**
 * Disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
    if (prisma) {
        await prisma.$disconnect();
        prisma = null;
        databaseLogger.info('Database disconnected');
    }
}

/**
 * Check database health
 */
export async function checkDatabaseHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency?: number;
    error?: string;
}> {
    const start = Date.now();
    try {
        await getPrismaClient().$queryRaw`SELECT 1`;
        return {status: 'healthy', latency: Date.now() - start};
    } catch (e) {
        return {
            status: 'unhealthy',
            error: e instanceof Error ? e.message : String(e),
        };
    }
}

/**
 * Execute transaction
 */
export async function executeTransaction<T>(
    fn: (prisma: PrismaClient) => Promise<T>
): Promise<T> {
    return getPrismaClient().$transaction(fn);
}

// Export Prisma types
export type {PrismaClient};
