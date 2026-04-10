/**
 * In-memory message store for tests and stateless dev flows.
 */

export type MessageDirection = 'CLIENT_TO_SERVER' | 'SERVER_TO_CLIENT';

export interface MessageRecord {
    id: string;
    sessionId: string;
    direction: MessageDirection;
    content: Record<string, unknown>;
    status?: string;
    promiseId?: string;
}

const store = new Map<string, MessageRecord>();

function genId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export const messageService = {
    async create(data: {
        sessionId: string;
        direction: MessageDirection;
        content: Record<string, unknown>;
        status?: string;
        promiseId?: string;
    }): Promise<MessageRecord> {
        const id = genId();
        const rec: MessageRecord = {
            id,
            sessionId: data.sessionId,
            direction: data.direction,
            content: {...data.content},
            status: data.status,
            promiseId: data.promiseId,
        };
        store.set(id, rec);
        return rec;
    },

    async findById(id: string): Promise<MessageRecord | null> {
        return store.get(id) ?? null;
    },

    async findBySessionId(sessionId: string): Promise<MessageRecord[]> {
        return [...store.values()].filter((m) => m.sessionId === sessionId);
    },

    async findByPromiseId(promiseId: string): Promise<MessageRecord | null> {
        return [...store.values()].find((m) => m.promiseId === promiseId) ?? null;
    },

    async update(
        id: string,
        patch: {status?: string; content?: Record<string, unknown>}
    ): Promise<MessageRecord | null> {
        const cur = store.get(id);
        if (!cur) return null;
        const next: MessageRecord = {
            ...cur,
            ...(patch.status !== undefined ? {status: patch.status} : {}),
            ...(patch.content !== undefined ? {content: patch.content} : {}),
        };
        store.set(id, next);
        return next;
    },

    async delete(id: string): Promise<void> {
        store.delete(id);
    },
};
