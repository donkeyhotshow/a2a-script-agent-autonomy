/**
 * In-memory message store for tests and stateless dev flows.
 * WARNING: Do not use in production; unbounded growth.
 * For production, implement disk-backed storage with TTL/LRU.
 */

import { randomUUID } from 'crypto';

export type MessageDirection = 'CLIENT_TO_SERVER' | 'SERVER_TO_CLIENT';

export interface MessageRecord {
    id: string;
    sessionId: string;
    direction: MessageDirection;
    content: Record<string, unknown>;
    status?: string;
    promiseId?: string;
    createdAt: number; // timestamp for eviction
}

const store = new Map<string, MessageRecord>();
const MAX_STORE_SIZE = 1000; // Bounded retention: max 1000 records

function genId(): string {
    return randomUUID(); // Stronger ID generation
}

function evictOldest() {
    if (store.size >= MAX_STORE_SIZE) {
        // Find oldest record
        let oldestKey: string | null = null;
        let oldestTime = Infinity;
        for (const [key, rec] of store) {
            if (rec.createdAt < oldestTime) {
                oldestTime = rec.createdAt;
                oldestKey = key;
            }
        }
        if (oldestKey) {
            store.delete(oldestKey);
        }
    }
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
            createdAt: Date.now(),
        };
        evictOldest();
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
