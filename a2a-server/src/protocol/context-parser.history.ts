/** Context change history (in-memory ring). */

export interface ContextHistoryEntry {
    at: number;
    sessionId: string;
    summary: string;
}

const history: ContextHistoryEntry[] = [];
const maxEntries = 100;

export function pushContextHistory(entry: Omit<ContextHistoryEntry, 'at'>): void {
    history.push({...entry, at: Date.now()});
    if (history.length > maxEntries) history.shift();
}

export function getContextHistory(sessionId?: string): ContextHistoryEntry[] {
    if (!sessionId) return [...history];
    return history.filter((e) => e.sessionId === sessionId);
}
