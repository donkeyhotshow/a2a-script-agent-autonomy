import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

// Configuration: how long a request can stay 'processing' before being considered stuck
const STUCK_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

let watchdogInterval: NodeJS.Timeout | null = null;

/**
 * Find and recover "stuck" requests
 */
async function checkStuckRequests() {
  const cutoff = new Date(Date.now() - STUCK_TIMEOUT_MS);

  try {
    const stuckRequests = await prisma.request.findMany({
      where: {
        status: 'processing',
        startedAt: {
          lt: cutoff,
        },
      },
      select: { promiseId: true, id: true },
    });

    if (stuckRequests.length === 0) return;

    logger.warn(`Watchdog: Found ${stuckRequests.length} stuck requests. Resetting to failed.`, {
      ids: stuckRequests.map(r => r.id),
    });

    const result = await prisma.request.updateMany({
      where: {
        promiseId: {
          in: stuckRequests.map(r => r.promiseId),
        },
      },
      data: {
        status: 'failed',
        completedAt: new Date(),
        error: {
          code: 'TIMEOUT_EXCEEDED',
          message: 'Process timed out or server crashed during execution',
        },
      },
    });

    logger.info(`Watchdog: Successfully recovered ${result.count} requests.`);
  } catch (error) {
    logger.error('Watchdog: Error during stuck request check', { error: String(error) });
  }
}

/**
 * Start the reliability watchdog
 */
export function startWatchdog() {
  if (watchdogInterval) return;

  logger.info('Watchdog: Starting reliability monitoring service...');
  
  // Initial check
  checkStuckRequests();

  // Periodic check
  watchdogInterval = setInterval(checkStuckRequests, CHECK_INTERVAL_MS);
}

/**
 * Stop the reliability watchdog
 */
export function stopWatchdog() {
  if (watchdogInterval) {
    clearInterval(watchdogInterval);
    watchdogInterval = null;
    logger.info('Watchdog: Reliability monitoring service stopped.');
  }
}
