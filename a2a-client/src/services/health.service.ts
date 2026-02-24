/**
 * Health Service
 * Uses config for health checks. Routes → services only.
 */

import { checkDatabaseHealth } from '../config/database.js';
import { checkRedisHealth } from '../config/redis.js';

export interface HealthStatus {
  database: { status: 'healthy' | 'unhealthy'; latency?: number; error?: string };
  redis: { status: 'healthy' | 'unhealthy'; latency?: number; error?: string };
}

export async function getHealthStatus(): Promise<HealthStatus> {
  const [db, redis] = await Promise.all([
    checkDatabaseHealth().catch((e) => ({ status: 'unhealthy' as const, error: String(e) })),
    checkRedisHealth().catch((e) => ({ status: 'unhealthy' as const, error: String(e) })),
  ]);
  return { database: db, redis: redis };
}
