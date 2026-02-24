/** ContextManager events. */

export type ContextEventType = 'set' | 'evict' | 'clear';

export interface ContextEvent {
  type: ContextEventType;
  sessionId?: string;
  contextType?: string;
  at: number;
}

type Listener = (e: ContextEvent) => void;
const listeners: Listener[] = [];

export function onContextEvent(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

export function emitContextEvent(e: Omit<ContextEvent, 'at'>): void {
  const payload: ContextEvent = { ...e, at: Date.now() };
  for (const fn of listeners) fn(payload);
}

