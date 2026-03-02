/** Auth audit log (in-memory). */

export interface AuditEntry {
    at: number;
    event: string;
    userId?: string;
    meta?: Record<string, unknown>;
}

const log: AuditEntry[] = [];
const maxEntries = 1000;

export function auditLog(event: string, userId?: string, meta?: Record<string, unknown>): void {
    log.push({at: Date.now(), event, userId, meta});
    if (log.length > maxEntries) log.shift();
}

export function getAuditLog(limit = 100): AuditEntry[] {
    return log.slice(-limit).reverse();
}

