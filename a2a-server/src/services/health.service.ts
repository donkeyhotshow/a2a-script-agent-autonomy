/**
 * Health Service
 * Uses config for health checks. Routes → services only.
 */

import {checkDatabaseHealth} from '../config/database.js';

export interface HealthStatus {
    database: { status: 'healthy' | 'unhealthy'; latency?: number; error?: string };
}

export async function getHealthStatus(): Promise<HealthStatus> {
    const db = await checkDatabaseHealth().catch((e) => ({status: 'unhealthy' as const, error: String(e)}));
    return {database: db};
}
