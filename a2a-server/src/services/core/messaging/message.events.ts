/** MessageService events and hooks. */

export type MessageEventType = 'created' | 'updated' | 'deleted';

export interface MessageEvent {
    type: MessageEventType;
    messageId: string;
    sessionId: string;
    at: number;
}

type Listener = (e: MessageEvent) => void;
const listeners: Listener[] = [];

export function onMessageEvent(fn: Listener): () => void {
    listeners.push(fn);
    return () => {
        const i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
    };
}

export function emitMessageEvent(e: Omit<MessageEvent, 'at'>): void {
    const payload: MessageEvent = {...e, at: Date.now()};
    for (const fn of listeners) fn(payload);
}

