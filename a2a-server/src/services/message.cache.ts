/**
 * In-memory cache layer for MessageService.
 * Use only for server-owned message metadata/ids. Do not cache client-sent content for reuse between requests.
 */

const byId = new Map<string, Record<string, unknown>>();
const bySession = new Map<string, string[]>();

export function getMessageById(id: string): Record<string, unknown> | undefined {
  return byId.get(id);
}

export function setMessageInCache(id: string, sessionId: string, message: Record<string, unknown>): void {
  byId.set(id, message);
  const list = bySession.get(sessionId) ?? [];
  if (!list.includes(id)) list.push(id);
  bySession.set(sessionId, list);
}

export function invalidateMessage(id: string): void {
  byId.delete(id);
  for (const [sessionId, list] of bySession) {
    const i = list.indexOf(id);
    if (i >= 0) {
      list.splice(i, 1);
      if (list.length === 0) bySession.delete(sessionId);
      break;
    }
  }
}

export function invalidateSession(sessionId: string): void {
  const list = bySession.get(sessionId);
  if (list) {
    for (const id of list) byId.delete(id);
    bySession.delete(sessionId);
  }
}

