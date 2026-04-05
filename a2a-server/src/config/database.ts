/**
 * Database health hook for /health-style checks.
 * a2a-server invoke path is stateless; no pooled DB client here.
 */
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
}> {
  return {status: 'healthy'};
}
