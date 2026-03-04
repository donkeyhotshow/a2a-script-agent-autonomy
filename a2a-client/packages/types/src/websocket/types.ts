/**
 * WebSocket Types
 * 
 * Types related to WebSocket events
 */

export type WsEventType = 'task:progress' | 'task:completed' | 'files:updated' | 'files:requested' | 'error';

export interface WsEvent<T = unknown> {
    type: WsEventType;
    payload: T;
    timestamp: Date;
}
