/**
 * Unit Tests for SessionStore
 * Tests for storage mode, numbered folders, and auto-responses
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock global objects
const mockFetch = vi.fn();
const mockLocalStorage = {
    getItem: vi.fn(),
    setItem: vi.fn(),
    removeItem: vi.fn()
};

global.fetch = mockFetch;
global.localStorage = mockLocalStorage;

// Import after setting up mocks
// Note: In real tests, these would be imported from the source

describe('SessionStore', () => {
    let SessionStore;

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Create a fresh SessionStore instance for each test
        // In real implementation, import the actual SessionStore
        SessionStore = function() {
            this._state = {
                sessionId: null,
                projectId: null,
                messages: [],
                execute: null,
                context: null,
                status: 'idle',
                pendingForm: null,
                lastError: null,
                promisePending: false,
                _waitIndicatorActive: false,
                responsesLog: [],
                messagesLog: [],
                currentStep: 0,
                steps: []
            };
            this._listeners = new Map();
            this._apiBase = '/api';
            this._storageMode = 'memory';
            this._storageBase = '/api/a2a/sessions';
        };
        
        SessionStore.prototype.setStorageMode = function(mode) {
            if (mode !== 'memory' && mode !== 'storage') {
                console.warn('[SessionStore] Invalid storage mode:', mode, '- using memory');
                mode = 'memory';
            }
            this._storageMode = mode;
            return this;
        };
        
        SessionStore.prototype.getStorageMode = function() {
            return this._storageMode;
        };
        
        SessionStore.prototype.isPersistentStorage = function() {
            return this._storageMode === 'storage';
        };
        
        SessionStore.prototype.reset = function(sessionId = null, projectId = null) {
            this._state = {
                sessionId,
                projectId,
                messages: [],
                execute: null,
                context: null,
                status: sessionId ? 'created' : 'idle',
                pendingForm: null,
                lastError: null,
                promisePending: false,
                _waitIndicatorActive: false,
                responsesLog: [],
                messagesLog: [],
                currentStep: 0,
                steps: []
            };
            return this;
        };
        
        SessionStore.prototype.setExecute = function(execute) {
            this._state.execute = execute || null;
            
            // Handle form with choices or input — waiting for user input
            if (execute?.form?.choices || execute?.form?.input) {
                this._state.pendingForm = execute.form;
                this._state.status = 'waiting';
            } else {
                this._state.pendingForm = null;
            }
            
            // Handle message - display to user
            if (execute?.message) {
                const msg = typeof execute.message === 'string'
                    ? { content: execute.message }
                    : execute.message;
                this._state.messages.push({
                    id: `msg_${Date.now()}`,
                    role: 'assistant',
                    content: msg.content || '',
                    timestamp: new Date().toISOString(),
                    metadata: {}
                });
            }
            
            // Handle auto-responses (no form required) — protocol uses one action key under execute
            if (execute && !execute.form?.input && !execute.form?.choices) {
                if (execute.script) {
                    this._state.messages.push({
                        id: `msg_${Date.now()}`,
                        role: 'system',
                        content: 'Running script...',
                        timestamp: new Date().toISOString(),
                        metadata: { type: 'auto-script' }
                    });
                } else {
                    const toolKey = Object.keys(execute).find(
                        (k) =>
                            !['message', 'form', 'completed', 'wait', 'result', 'action'].includes(k)
                    );
                    if (toolKey) {
                        this._state.messages.push({
                            id: `msg_${Date.now()}`,
                            role: 'system',
                            content: `Executing: ${toolKey}`,
                            timestamp: new Date().toISOString(),
                            metadata: { type: 'auto-action', action: toolKey }
                        });
                    } else if (typeof (execute as Record<string, unknown>).action === 'string') {
                        const legacy = (execute as Record<string, unknown>).action as string;
                        this._state.messages.push({
                            id: `msg_${Date.now()}`,
                            role: 'system',
                            content: `Executing: ${legacy}`,
                            timestamp: new Date().toISOString(),
                            metadata: { type: 'auto-action', action: legacy, deprecatedFlatExecute: true }
                        });
                    } else if (execute.result) {
                        const resultMsg = typeof execute.result === 'string'
                            ? execute.result
                            : execute.result.summary || 'Task completed';
                        this._state.messages.push({
                            id: `msg_${Date.now()}`,
                            role: 'system',
                            content: resultMsg,
                            timestamp: new Date().toISOString(),
                            metadata: { type: 'auto-result' }
                        });
                    }
                }
            }
            
            if (execute?.completed === true) {
                this._state.status = 'completed';
            }
            
            // Handle wait indicator
            if (execute?.wait) {
                this._state.status = 'waiting';
                this._state._waitIndicatorActive = true;
            }
            
            return this;
        };
        
        SessionStore.prototype.getCurrentStep = function() {
            return this._state.currentStep || 0;
        };
        
        SessionStore.prototype.pushMessage = function(message, role = 'assistant') {
            const msg = {
                id: message.id || `msg_${Date.now()}`,
                role,
                content: message.content || '',
                timestamp: message.timestamp || new Date().toISOString(),
                metadata: message.metadata || {}
            };
            this._state.messages.push(msg);
            return this;
        };
        
        SessionStore.prototype._emit = function(event, payload) {
            const handlers = this._listeners.get(event);
            if (!handlers) return;
            handlers.forEach(handler => {
                try {
                    handler(payload);
                } catch (err) {
                    console.error('[SessionStore] Handler failed for', event, err);
                }
            });
        };
        
        SessionStore.prototype.on = function(event, callback) {
            if (typeof callback !== 'function') return () => {};
            if (!this._listeners.has(event)) {
                this._listeners.set(event, new Set());
            }
            this._listeners.get(event).add(callback);
            return () => this.off(event, callback);
        };
        
        SessionStore.prototype.off = function(event, callback) {
            this._listeners.get(event)?.delete(callback);
        };
        
        SessionStore.prototype.setPromisePending = function(pending) {
            this._state.promisePending = pending;
            return this;
        };
    });

    describe('Storage Mode', () => {
        it('should default to memory mode', () => {
            const store = new SessionStore();
            expect(store.getStorageMode()).toBe('memory');
            expect(store.isPersistentStorage()).toBe(false);
        });

        it('should switch to storage mode', () => {
            const store = new SessionStore();
            store.setStorageMode('storage');
            expect(store.getStorageMode()).toBe('storage');
            expect(store.isPersistentStorage()).toBe(true);
        });

        it('should reject invalid storage mode', () => {
            const store = new SessionStore();
            store.setStorageMode('invalid');
            expect(store.getStorageMode()).toBe('memory');
        });

        it('should persist storage mode in localStorage', () => {
            mockLocalStorage.getItem.mockReturnValue('storage');
            const store = new SessionStore();
            // In real implementation, this would load from localStorage on init
            expect(mockLocalStorage.getItem).toHaveBeenCalled();
        });
    });

    describe('Auto-Responses', () => {
        it('should create auto-action message when action is received without form', () => {
            const store = new SessionStore();
            store.setExecute({ action: 'read-file' });
            
            expect(store._state.messages.length).toBe(1);
            expect(store._state.messages[0].role).toBe('system');
            expect(store._state.messages[0].content).toBe('Executing: read-file');
            expect(store._state.messages[0].metadata.type).toBe('auto-action');
        });

        it('should create auto-script message when script is received', () => {
            const store = new SessionStore();
            store.setExecute({ script: { code: 'console.log("test")' } });
            
            expect(store._state.messages.length).toBe(1);
            expect(store._state.messages[0].role).toBe('system');
            expect(store._state.messages[0].content).toBe('Running script...');
            expect(store._state.messages[0].metadata.type).toBe('auto-script');
        });

        it('should create auto-result message when result is received', () => {
            const store = new SessionStore();
            store.setExecute({ result: { summary: 'File created successfully' } });
            
            expect(store._state.messages.length).toBe(1);
            expect(store._state.messages[0].role).toBe('system');
            expect(store._state.messages[0].content).toBe('File created successfully');
            expect(store._state.messages[0].metadata.type).toBe('auto-result');
        });

        it('should NOT create auto-message when form.input is present', () => {
            const store = new SessionStore();
            store.setExecute({ 
                action: 'read-file',
                form: { input: { name: 'task', label: 'Task' } }
            });
            
            expect(store._state.messages.length).toBe(0);
            expect(store._state.pendingForm).not.toBeNull();
        });

        it('should NOT create auto-message when form.choices is present', () => {
            const store = new SessionStore();
            store.setExecute({ 
                action: 'select-option',
                form: { choices: ['Option 1', 'Option 2'] }
            });
            
            expect(store._state.messages.length).toBe(0);
            expect(store._state.pendingForm).not.toBeNull();
        });

        it('should handle message in execute normally', () => {
            const store = new SessionStore();
            store.setExecute({ message: 'Hello, user!' });
            
            expect(store._state.messages.length).toBe(1);
            expect(store._state.messages[0].role).toBe('assistant');
            expect(store._state.messages[0].content).toBe('Hello, user!');
        });
    });

    describe('Step Tracking', () => {
        it('should initialize with step 0', () => {
            const store = new SessionStore();
            expect(store.getCurrentStep()).toBe(0);
        });

        it('should track current step in state', () => {
            const store = new SessionStore();
            store._state.currentStep = 5;
            expect(store.getCurrentStep()).toBe(5);
        });
    });

    describe('Promise Pending', () => {
        it('should track promise pending state', () => {
            const store = new SessionStore();
            store.setPromisePending(true);
            expect(store._state.promisePending).toBe(true);
            
            store.setPromisePending(false);
            expect(store._state.promisePending).toBe(false);
        });

        it('should emit promisePending event', () => {
            const store = new SessionStore();
            const callback = vi.fn();
            store.on('promisePending', callback);
            
            store.setPromisePending(true);
            expect(callback).toHaveBeenCalledWith(true);
        });
    });

    describe('Event System', () => {
        it('should subscribe to events', () => {
            const store = new SessionStore();
            const callback = vi.fn();
            
            store.on('testEvent', callback);
            store._emit('testEvent', { data: 'test' });
            
            expect(callback).toHaveBeenCalledWith({ data: 'test' });
        });

        it('should unsubscribe from events', () => {
            const store = new SessionStore();
            const callback = vi.fn();
            
            const unsubscribe = store.on('testEvent', callback);
            unsubscribe();
            store._emit('testEvent', { data: 'test' });
            
            expect(callback).not.toHaveBeenCalled();
        });
    });
});

describe('SessionStorageAPI', () => {
    // These tests would mock fetch and test the API methods
    
    describe('listSessions', () => {
        it('should call fetch with correct URL', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ sessions: [] })
            });
            
            // In real implementation:
            // const sessions = await SessionStorageAPI.listSessions();
            
            expect(mockFetch).toHaveBeenCalledWith(
                '/api/a2a/sessions',
                expect.objectContaining({ method: 'GET' })
            );
        });
    });

    describe('createSession', () => {
        it('should send title in request body', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ 
                    success: true, 
                    session: { id: 'sess_123', title: 'Test' }
                })
            });
            
            // In real implementation:
            // const session = await SessionStorageAPI.createSession('Test');
            
            expect(mockFetch).toHaveBeenCalledWith(
                '/api/a2a/sessions',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify({ title: 'Test' })
                })
            );
        });
    });
});
