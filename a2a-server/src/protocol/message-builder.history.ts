/** Message build history (for dedup / replay). */

export interface MessageHistoryEntry {
  at: number;
  sessionId: string;
  messageId: string;
}

const messageHistory: MessageHistoryEntry[] = [];
const maxEntries = 200;

export function pushMessageHistory(entry: Omit<MessageHistoryEntry, 'at'>): void {
  messageHistory.push({ ...entry, at: Date.now() });
  if (messageHistory.length > maxEntries) messageHistory.shift();
}

export function getMessageHistory(sessionId?: string): MessageHistoryEntry[] {
  if (!sessionId) return [...messageHistory];
  return messageHistory.filter((e) => e.sessionId === sessionId);
}
