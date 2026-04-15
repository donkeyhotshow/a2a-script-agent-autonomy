/**
 * EventBus — ADR-0063: Internal typed event bus for decoupled agent services.
 */
import { EventEmitter } from "events";
import { randomUUID } from "node:crypto";
const BUFFER_SIZE = 500;
class CircularBuffer {
    buf = [];
    head = 0;
    count = 0;
    lastAccessed = 0;
    push(event) {
        if (this.count < BUFFER_SIZE) {
            this.buf.push(event);
            this.count++;
        }
        else {
            this.buf[this.head] = event;
            this.head = (this.head + 1) % BUFFER_SIZE;
        }
        this.lastAccessed = Date.now();
    }
    toArray() {
        this.lastAccessed = Date.now();
        if (this.count < BUFFER_SIZE) {
            return this.buf.slice();
        }
        const tail = this.buf.slice(this.head);
        const head = this.buf.slice(0, this.head);
        return [...tail, ...head];
    }
    getLastAccessed() {
        return this.lastAccessed;
    }
}
export class EventBus {
    emitter = new EventEmitter();
    buffers = new Map();
    static MAX_IDLE_TIME_MS = 60 * 60 * 1000;
    static MAX_BUFFERS = 1000;
    constructor() {
        this.emitter.setMaxListeners(100);
    }
    publish(event) {
        const full = {
            id: randomUUID(),
            timestamp: Date.now(),
            ...event,
        };
        this._getBuffer(full.session_id).push(full);
        this.emitter.emit(full.type, full);
        return full;
    }
    subscribe(type, handler) {
        const listener = handler;
        this.emitter.on(type, listener);
        return () => this.emitter.off(type, listener);
    }
    replay(sessionId, fromTimestamp) {
        const all = this._getBuffer(sessionId).toArray();
        if (fromTimestamp === undefined)
            return all;
        return all.filter((e) => e.timestamp >= fromTimestamp);
    }
    getEventChain(correlationId) {
        const chain = [];
        this.buffers.forEach((buf) => {
            buf.toArray().forEach((evt) => {
                if (evt.correlation_id === correlationId)
                    chain.push(evt);
            });
        });
        chain.sort((a, b) => a.timestamp - b.timestamp);
        return chain;
    }
    _getBuffer(sessionId) {
        let buf = this.buffers.get(sessionId);
        if (!buf) {
            if (this.buffers.size >= EventBus.MAX_BUFFERS) {
                let lruSessionId = null;
                let lruTime = Date.now();
                this.buffers.forEach((buffer, id) => {
                    const lastAccessed = buffer.getLastAccessed();
                    if (lastAccessed < lruTime) {
                        lruTime = lastAccessed;
                        lruSessionId = id;
                    }
                });
                if (lruSessionId !== null) {
                    this.buffers.delete(lruSessionId);
                }
            }
            buf = new CircularBuffer();
            this.buffers.set(sessionId, buf);
        }
        return buf;
    }
    evictSession(sessionId) {
        this.buffers.delete(sessionId);
    }
    get activeSessions() {
        return this.buffers.size;
    }
    getBufferLastAccessed(sessionId) {
        const buf = this.buffers.get(sessionId);
        return buf ? buf.getLastAccessed() : 0;
    }
    cleanupIdleBuffers() {
        const now = Date.now();
        let removedCount = 0;
        this.buffers.forEach((buf, sessionId) => {
            if (now - buf.getLastAccessed() > EventBus.MAX_IDLE_TIME_MS) {
                this.buffers.delete(sessionId);
                removedCount++;
            }
        });
        return removedCount;
    }
}
export const globalEventBus = new EventBus();
//# sourceMappingURL=event-bus.js.map