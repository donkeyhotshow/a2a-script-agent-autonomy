/**
 * Unit Tests for Dialog Components
 * Tests for EventEmitter, DialogState, DialogLoader, DialogPromise, SessionStoreCore
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Import components from source
import { EventEmitter } from '../../web/js/core/EventEmitter.js';
import { DialogState } from '../../web/js/core/DialogState.js';
import { DialogLoader } from '../../web/js/core/DialogLoader.js';
import { DialogPromise } from '../../web/js/core/DialogPromise.js';
import { SessionStoreCore } from '../../web/js/core/SessionStoreCore.js';

describe('EventEmitter', () => {
    let emitter;

    beforeEach(() => {
        emitter = new EventEmitter();
    });

    describe('on() / off() - subscription/unsubscription', () => {
        it('should add listener and return unsubscribe function', () => {
            const callback = vi.fn();
            const unsubscribe = emitter.on('test-event', callback);

            expect(typeof unsubscribe).toBe('function');
            expect(emitter.listenerCount('test-event')).toBe(1);
        });

        it('should remove listener when unsubscribe is called', () => {
            const callback = vi.fn();
            const unsubscribe = emitter.on('test-event', callback);
            unsubscribe();

            expect(emitter.listenerCount('test-event')).toBe(0);
        });

        it('should handle off() method for removal', () => {
            const callback = vi.fn();
            emitter.on('test-event', callback);
            emitter.off('test-event', callback);

            expect(emitter.listenerCount('test-event')).toBe(0);
        });

        it('should handle invalid callback gracefully', () => {
            const unsubscribe = emitter.on('test-event', 'not-a-function');
            expect(typeof unsubscribe).toBe('function');
            expect(emitter.listenerCount('test-event')).toBe(0);
        });
    });

    describe('emit() - event dispatch', () => {
        it('should call all listeners for an event', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();
            
            emitter.on('test-event', callback1);
            emitter.on('test-event', callback2);
            emitter.emit('test-event', { data: 'test' });

            expect(callback1).toHaveBeenCalledWith({ data: 'test' });
            expect(callback2).toHaveBeenCalledWith({ data: 'test' });
        });

        it('should not call listeners for non-existent events', () => {
            const callback = vi.fn();
            emitter.on('other-event', callback);
            emitter.emit('test-event', { data: 'test' });

            expect(callback).not.toHaveBeenCalled();
        });

        it('should pass payload to handlers', () => {
            const callback = vi.fn();
            emitter.on('test-event', callback);
            emitter.emit('test-event', { message: 'hello', number: 42 });

            expect(callback).toHaveBeenCalledWith({ message: 'hello', number: 42 });
        });
    });

    describe('once() - one-time handler', () => {
        it('should call handler only once', () => {
            const callback = vi.fn();
            emitter.once('test-event', callback);

            emitter.emit('test-event');
            emitter.emit('test-event');
            emitter.emit('test-event');

            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('should unsubscribe after first call', () => {
            const callback = vi.fn();
            emitter.once('test-event', callback);

            emitter.emit('test-event');

            expect(emitter.listenerCount('test-event')).toBe(0);
        });
    });

    describe('Multiple listeners for one event', () => {
        it('should handle multiple different listeners', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();
            const callback3 = vi.fn();

            emitter.on('test-event', callback1);
            emitter.on('test-event', callback2);
            emitter.on('test-event', callback3);

            expect(emitter.listenerCount('test-event')).toBe(3);

            emitter.emit('test-event', { value: 1 });

            expect(callback1).toHaveBeenCalled();
            expect(callback2).toHaveBeenCalled();
            expect(callback3).toHaveBeenCalled();
        });

        it('should remove only specific listener', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            emitter.on('test-event', callback1);
            emitter.on('test-event', callback2);
            emitter.off('test-event', callback1);

            emitter.emit('test-event');

            expect(callback1).not.toHaveBeenCalled();
            expect(callback2).toHaveBeenCalled();
        });
    });

    describe('Utility methods', () => {
        it('should return event names', () => {
            emitter.on('event1', () => {});
            emitter.on('event2', () => {});
            emitter.on('event3', () => {});

            const names = emitter.eventNames();
            expect(names).toContain('event1');
            expect(names).toContain('event2');
            expect(names).toContain('event3');
        });

        it('should return listener count for specific event', () => {
            emitter.on('test', () => {});
            emitter.on('test', () => {});

            expect(emitter.listenerCount('test')).toBe(2);
            expect(emitter.listenerCount('nonexistent')).toBe(0);
        });

        it('should remove all listeners', () => {
            emitter.on('event1', () => {});
            emitter.on('event2', () => {});
            emitter.removeAllListeners();

            expect(emitter.eventNames()).toHaveLength(0);
        });
    });
});

describe('DialogState', () => {
    let dialogState;

    beforeEach(() => {
        dialogState = new DialogState();
    });

    describe('Initial state', () => {
        it('should have default idle status', () => {
            expect(dialogState.status).toBe('idle');
        });

        it('should have empty messages array', () => {
            expect(dialogState.messages).toEqual([]);
        });

        it('should have null execute and context', () => {
            expect(dialogState.execute).toBeNull();
            expect(dialogState.context).toBeNull();
        });
    });

    describe('setMessages() / getMessages()', () => {
        it('should set messages array', () => {
            const messages = [
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Hi there!' }
            ];
            
            dialogState.setMessages(messages);
            
            const result = dialogState.messages;
            expect(result.length).toBeGreaterThan(0);
            expect(result[0]).toHaveProperty('id');
            expect(result[0]).toHaveProperty('timestamp');
        });

        it('should not set non-array messages', () => {
            const result = dialogState.setMessages('not an array');
            expect(dialogState.messages).toEqual([]);
        });

        it('should limit messages to maxMessages', () => {
            const dialogStateLimited = new DialogState({ maxMessages: 3 });
            const messages = [
                { role: 'user', content: '1' },
                { role: 'user', content: '2' },
                { role: 'user', content: '3' },
                { role: 'user', content: '4' },
                { role: 'user', content: '5' }
            ];
            
            dialogStateLimited.setMessages(messages);
            
            expect(dialogStateLimited.messages.length).toBe(3);
        });
    });

    describe('pushMessage() - adding single message', () => {
        it('should add a single message', () => {
            dialogState.pushMessage({ content: 'Hello' }, 'user');
            
            expect(dialogState.messages.length).toBe(1);
            expect(dialogState.messages[0].content).toBe('Hello');
            expect(dialogState.messages[0].role).toBe('user');
        });

        it('should add message with default role', () => {
            dialogState.pushMessage({ content: 'Hello' });
            
            expect(dialogState.messages[0].role).toBe('assistant');
        });

        it('should add string message', () => {
            dialogState.pushMessage('Hello world', 'user');
            
            expect(dialogState.messages[0].content).toBe('Hello world');
        });
    });

    describe('setExecute() / setContext()', () => {
        it('should set execute object', () => {
            const execute = { form: { input: 'test' } };
            dialogState.setExecute(execute);
            
            expect(dialogState.execute).toEqual(execute);
        });

        it('should set null execute', () => {
            dialogState.setExecute({ form: { input: 'test' } });
            dialogState.setExecute(null);
            
            expect(dialogState.execute).toBeNull();
        });

        it('should set pendingForm when execute has choices', () => {
            const execute = { form: { choices: ['A', 'B', 'C'] } };
            dialogState.setExecute(execute);
            
            expect(dialogState.pendingForm).toEqual(execute.form);
            expect(dialogState.status).toBe('waiting');
        });

        it('should set context object', () => {
            const context = { history: [], sessionId: 'test-123' };
            dialogState.setContext(context);
            
            expect(dialogState.context).toEqual(context);
        });
    });

    describe('State reset', () => {
        it('should reset to idle with no params', () => {
            dialogState.setExecute({ test: true });
            dialogState.setContext({ test: true });
            dialogState.pushMessage({ content: 'test' }, 'user');
            
            dialogState.reset();
            
            expect(dialogState.status).toBe('idle');
            expect(dialogState.execute).toBeNull();
            expect(dialogState.context).toBeNull();
            expect(dialogState.messages).toEqual([]);
        });

        it('should reset with session and project ids', () => {
            dialogState.reset('session-123', 'project-456');
            
            expect(dialogState.sessionId).toBe('session-123');
            expect(dialogState.projectId).toBe('project-456');
            expect(dialogState.status).toBe('created');
        });
    });

    describe('Computed properties', () => {
        it('isWaitingForInput should return true when status is waiting', () => {
            dialogState.setStatus('waiting');
            
            expect(dialogState.isWaitingForInput()).toBe(true);
        });

        it('isWaitingForInput should return true when pendingForm exists', () => {
            dialogState.setExecute({ form: { input: true } });
            
            expect(dialogState.isWaitingForInput()).toBe(true);
        });

        it('isActive should return true for active/waiting status', () => {
            dialogState.setStatus('active');
            expect(dialogState.isActive()).toBe(true);
            
            dialogState.setStatus('waiting');
            expect(dialogState.isActive()).toBe(true);
            
            dialogState.setStatus('idle');
            expect(dialogState.isActive()).toBe(false);
        });
    });
});

describe('DialogLoader', () => {
    let loader;

    beforeEach(() => {
        vi.useFakeTimers();
        loader = new DialogLoader({ minTime: 100 }); // 100ms for faster tests
    });

    afterEach(() => {
        vi.useRealTimers();
        loader.destroy();
    });

    describe('start() / stop() - visibility control', () => {
        it('should start loader', () => {
            loader.start();
            
            expect(loader.isActive).toBe(true);
        });

        it('should not start twice', () => {
            loader.start();
            loader.start();
            
            expect(loader.isActive).toBe(true);
        });

        it('should stop loader', () => {
            loader.start();
            loader.stop();
            
            // Should wait for min time
            vi.advanceTimersByTime(200);
            
            expect(loader.isActive).toBe(false);
        });
    });

    describe('Minimum time enforcement (5000ms)', () => {
        it('should enforce minimum display time', () => {
            loader.setMinTime(5000);
            loader.start();
            
            // Try to stop immediately
            loader.stop();
            
            // Loader should still be active because min time hasn't passed
            const state = loader.getState();
            expect(state.active).toBe(true);
        });

        it('should hide after minimum time passes', () => {
            loader.setMinTime(5000);
            loader.start();
            
            vi.advanceTimersByTime(6000);
            loader.stop();
            
            // After min time, loader should be hidden
            expect(loader.isActive).toBe(false);
        });

        it('should emit loader events', () => {
            const callback = vi.fn();
            loader.on('loader', callback);
            
            loader.start();
            
            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({ active: true })
            );
        });
    });

    describe('State changes', () => {
        it('should return correct state', () => {
            loader.start();
            
            const state = loader.getState();
            expect(state).toHaveProperty('active');
            expect(state).toHaveProperty('minEndTime');
            expect(state).toHaveProperty('canHide');
        });

        it('should reset loader state', () => {
            loader.start();
            loader.reset();
            
            expect(loader.isActive).toBe(false);
        });
    });
});

describe('DialogPromise', () => {
    let dialogPromise;

    beforeEach(() => {
        vi.useFakeTimers();
        dialogPromise = new DialogPromise({ pollInterval: 100 });
    });

    afterEach(() => {
        vi.useRealTimers();
        dialogPromise.destroy();
    });

    describe('setPromiseId() / getPromiseId()', () => {
        it('should set promiseId', () => {
            dialogPromise.setPromiseId('prom_123');
            
            expect(dialogPromise.promiseId).toBe('prom_123');
        });

        it('should clear promiseId when null', () => {
            dialogPromise.setPromiseId('prom_123');
            dialogPromise.setPromiseId(null);
            
            expect(dialogPromise.promiseId).toBeNull();
        });

        it('should set pending state when promiseId is set', () => {
            dialogPromise.setPromiseId('prom_123');
            
            expect(dialogPromise.isPending).toBe(true);
        });
    });

    describe('Polling simulation', () => {
        it('should start polling with check function', async () => {
            const checkFn = vi.fn().mockResolvedValue({ 
                completed: true, 
                result: { data: 'test' } 
            });
            
            const callback = vi.fn();
            dialogPromise.on('resolved', callback);
            
            dialogPromise.setPromiseId('prom_123');
            dialogPromise.startPolling(checkFn);
            
            // Advance timers to trigger polling
            vi.advanceTimersByTime(200);
            
            expect(callback).toHaveBeenCalled();
        });

        it('should handle failed status', async () => {
            const checkFn = vi.fn().mockResolvedValue({ 
                status: 'failed', 
                error: 'Something went wrong' 
            });
            
            const callback = vi.fn();
            dialogPromise.on('rejected', callback);
            
            dialogPromise.setPromiseId('prom_123');
            dialogPromise.startPolling(checkFn);
            
            vi.advanceTimersByTime(200);
            
            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({ error: 'Something went wrong' })
            );
        });

        it('should stop polling', () => {
            const checkFn = vi.fn();
            
            dialogPromise.setPromiseId('prom_123');
            dialogPromise.startPolling(checkFn);
            dialogPromise.stopPolling();
            
            vi.advanceTimersByTime(300);
            
            // checkFn should only be called once (initial check before stop)
            expect(checkFn).toHaveBeenCalledTimes(1);
        });
    });

    describe('resolve() / reject()', () => {
        it('should resolve promise manually', () => {
            const callback = vi.fn();
            dialogPromise.on('resolved', callback);
            
            dialogPromise.resolve({ data: 'success' });
            
            expect(callback).toHaveBeenCalledWith({ data: 'success' });
            expect(dialogPromise.isPending).toBe(false);
        });

        it('should reject promise manually', () => {
            const callback = vi.fn();
            dialogPromise.on('rejected', callback);
            
            dialogPromise.reject({ error: 'failed' });
            
            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({ error: { error: 'failed' } })
            );
            expect(dialogPromise.isPending).toBe(false);
        });

        it('should reset promise state', () => {
            dialogPromise.setPromiseId('prom_123');
            dialogPromise.reset();
            
            expect(dialogPromise.promiseId).toBeNull();
            expect(dialogPromise.isPending).toBe(false);
        });
    });

    describe('Events', () => {
        it('should emit promiseId event', () => {
            const callback = vi.fn();
            dialogPromise.on('promiseId', callback);
            
            dialogPromise.setPromiseId('prom_123');
            
            expect(callback).toHaveBeenCalledWith('prom_123');
        });

        it('should emit promisePending event', () => {
            const callback = vi.fn();
            dialogPromise.on('promisePending', callback);
            
            dialogPromise.setPromiseId('prom_123');
            
            expect(callback).toHaveBeenCalledWith(true);
        });
    });
});

describe('SessionStoreCore integration', () => {
    let store;

    beforeEach(() => {
        store = new SessionStoreCore({ 
            maxMessages: 100, 
            loaderMinTime: 100,
            promisePollInterval: 100
        });
    });

    afterEach(() => {
        store.destroy();
    });

    describe('Full state flow', () => {
        it('should create session', () => {
            const callback = vi.fn();
            store.on('sessionCreated', callback);
            
            store.createSession({ id: 'session-123', projectId: 'project-456' });
            
            expect(store.sessionId).toBe('session-123');
            expect(store.projectId).toBe('project-456');
            expect(store.status).toBe('created');
            expect(callback).toHaveBeenCalled();
        });

        it('should set messages', () => {
            const messages = [
                { role: 'user', content: 'Hello' },
                { role: 'assistant', content: 'Hi!' }
            ];
            
            store.setMessages(messages);
            
            expect(store.messages.length).toBeGreaterThan(0);
        });

        it('should push message', () => {
            const callback = vi.fn();
            store.on('message', callback);
            
            store.pushMessage({ content: 'Test message' }, 'user');
            
            expect(store.messages.length).toBe(1);
            expect(store.messages[0].content).toBe('Test message');
            expect(callback).toHaveBeenCalled();
        });

        it('should set execute', () => {
            const execute = { form: { choices: ['A', 'B'] } };
            store.setExecute(execute);
            
            expect(store.execute).toEqual(execute);
            expect(store.pendingForm).toEqual(execute.form);
        });

        it('should set context', () => {
            const context = { sessionId: 'test', step: 1 };
            store.setContext(context);
            
            expect(store.context).toEqual(context);
        });
    });

    describe('Event propagation between components', () => {
        it('should propagate loader events', () => {
            const callback = vi.fn();
            store.on('loader', callback);
            
            store.startLoader();
            
            expect(callback).toHaveBeenCalledWith(
                expect.objectContaining({ active: true })
            );
        });

        it('should propagate promise events', () => {
            const callback = vi.fn();
            store.on('promisePending', callback);
            
            store.setPromiseId('prom_123');
            
            expect(callback).toHaveBeenCalledWith(true);
        });

        it('should propagate promise resolved events', () => {
            const callback = vi.fn();
            store.on('promiseResolved', callback);
            
            store.setPromiseId('prom_123');
            
            vi.useFakeTimers();
            store._promise.resolve({ data: 'done' });
            
            expect(callback).toHaveBeenCalledWith({ data: 'done' });
            vi.useRealTimers();
        });

        it('should propagate execute events', () => {
            const callback = vi.fn();
            store.on('execute', callback);
            
            store.setExecute({ test: true });
            
            expect(callback).toHaveBeenCalled();
        });
    });

    describe('Loader integration', () => {
        it('should start and stop loader', () => {
            store.startLoader();
            
            const state1 = store.getLoaderState();
            expect(state1.active).toBe(true);
            
            store.stopLoader();
            
            // Wait for min time
            vi.useFakeTimers();
            vi.advanceTimersByTime(200);
            
            const state2 = store.getLoaderState();
            expect(state2.active).toBe(false);
            vi.useRealTimers();
        });
    });

    describe('Reset', () => {
        it('should reset all state', () => {
            store.createSession({ id: 'session-123' });
            store.setExecute({ test: true });
            store.setContext({ test: true });
            store.pushMessage({ content: 'test' }, 'user');
            
            const callback = vi.fn();
            store.on('reset', callback);
            
            store.reset();
            
            expect(store.sessionId).toBeNull();
            expect(store.execute).toBeNull();
            expect(store.context).toBeNull();
            expect(store.messages).toEqual([]);
            expect(callback).toHaveBeenCalled();
        });
    });

    describe('getState()', () => {
        it('should return full state', () => {
            store.createSession({ id: 'session-123', projectId: 'project-456' });
            
            const state = store.getState();
            
            expect(state).toHaveProperty('sessionId');
            expect(state).toHaveProperty('projectId');
            expect(state).toHaveProperty('messages');
            expect(state).toHaveProperty('execute');
            expect(state).toHaveProperty('context');
            expect(state).toHaveProperty('status');
            expect(state).toHaveProperty('loaderActive');
            expect(state).toHaveProperty('promisePending');
        });
    });

    describe('isInputBlocked()', () => {
        it('should return true when promise is pending', () => {
            store.setPromiseId('prom_123');
            
            expect(store.isInputBlocked()).toBe(true);
        });

        it('should return true when status is loading', () => {
            store.setStatus('loading');
            
            expect(store.isInputBlocked()).toBe(true);
        });

        it('should return false when idle', () => {
            expect(store.isInputBlocked()).toBe(false);
        });
    });
});
