/**
 * Health Service
 * Uses config for health checks. Routes → services only.
 */

export interface HealthStatus {
    database: { status: 'healthy' | 'unhealthy'; latency?: number; error?: string };
}

export async function getHealthStatus(): Promise<HealthStatus> {
    // No external database in this deployment — always healthy
    return { database: { status: 'healthy' } };
}
