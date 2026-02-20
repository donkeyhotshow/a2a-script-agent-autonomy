import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

/**
 * Database Configuration
 * Prisma client setup and connection management
 */

let prisma: PrismaClient | null = null;

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
    prisma.$on('query', (e) => logger.debug('Prisma query', { query: e.query }));
    prisma.$on('error', (e) => logger.error('Prisma error', { message: e.message }));
    prisma.$on('warn', (e) => logger.warn('Prisma warn', { message: e.message }));
  }
  
  return prisma;
}

/**
 * Connect to database
 */
export async function connectDatabase(): Promise<void> {
  const p = getPrismaClient();
  await p.$connect();
  logger.info('Database connected');
}

/**
 * Disconnect from database
 */
export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
    logger.info('Database disconnected');
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
    return { status: 'healthy', latency: Date.now() - start };
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
export type { PrismaClient };
