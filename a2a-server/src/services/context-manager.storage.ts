/**
 * ContextManager persistence (in-memory snapshot store).
 * DO NOT use for client context or user code. Server does not store client data between iterations.
 */

const snapshots = new Map<string, { data: unknown; at: number }>();

export function saveContextSnapshot(sessionId: string, data: unknown): void {
  snapshots.set(sessionId, { data, at: Date.now() });
}

export function loadContextSnapshot<T>(sessionId: string): T | undefined {
  const entry = snapshots.get(sessionId);
  return entry ? (entry.data as T) : undefined;
}

export function deleteContextSnapshot(sessionId: string): boolean {
  return snapshots.delete(sessionId);
}

