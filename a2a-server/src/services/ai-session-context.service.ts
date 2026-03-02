/** AI session context: per-session context bag for AI requests. */

const sessionContext = new Map<string, Record<string, unknown>>();

export function getSessionContext(sessionId: string): Record<string, unknown> {
    return sessionContext.get(sessionId) ?? {};
}

export function setSessionContext(sessionId: string, key: string, value: unknown): void {
    const ctx = sessionContext.get(sessionId) ?? {};
    ctx[key] = value;
    sessionContext.set(sessionId, ctx);
}

export function clearSessionContext(sessionId: string): void {
    sessionContext.delete(sessionId);
}
