/**
 * Health Service
 * Uses config for health checks. Routes → services only.
 */

import {checkDatabaseHealth} from '@a2a/config';

export interface HealthStatus {
    database: { status: 'healthy' | 'unhealthy'; latency?: number; error?: string };
}

export async function getHealthStatus(): Promise<HealthStatus> {
    const db = await checkDatabaseHealth().catch((e: unknown) => ({status: 'unhealthy' as const, error: e instanceof Error ? e.message : String(e), stack: e instanceof Error ? e.stack : undefined}));
    return {database: db};
}
