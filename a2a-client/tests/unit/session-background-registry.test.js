import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * @vitest-environment jsdom
 */

// Mock the global window object for the registry
const mockProcessInstance = {
    destroy: vi.fn(),
    stop: vi.fn(),
    startPolling: vi.fn()
};

// Create a simple implementation for testing
function createTestRegistry() {
    const processes = new Map();

    function makeKey(projectId, sessionId) {
        return `${String(projectId || '')}::${String(sessionId || '')}`;
    }

    function getProcessMap(projectId, sessionId) {
        const key = makeKey(projectId, sessionId);
        if (!processes.has(key)) {
            processes.set(key, new Map());
        }
        return processes.get(key);
    }

    return {
        register(projectId, sessionId, processType, processId, process) {
            if (!projectId || !sessionId) return false;
            if (!processType || !processId || !process) return false;

            const map = getProcessMap(projectId, sessionId);
            const typeKey = `${processType}:${processId}`;
            
            const entry = {
                instance: process,
                type: processType,
                id: processId,
                registeredAt: Date.now(),
                destroy: process.destroy || process.stop || null
            };
            
            map.set(typeKey, entry);
            return true;
        },

        unregister(projectId, sessionId, processType, processId) {
            const map = getProcessMap(projectId, sessionId);
            const typeKey = `${processType}:${processId}`;
            const entry = map.get(typeKey);

            if (entry) {
                if (typeof entry.destroy === 'function') {
                    entry.destroy.call(entry.instance);
                }
                map.delete(typeKey);
                return true;
            }
            return false;
        },

        get(projectId, sessionId, processType, processId) {
            const map = getProcessMap(projectId, sessionId);
            const entry = map.get(`${processType}:${processId}`);
            return entry ? entry.instance : null;
        },

        getAll(projectId, sessionId) {
            const map = getProcessMap(projectId, sessionId);
            return Array.from(map.values()).map(entry => ({
                type: entry.type,
                id: entry.id,
                instance: entry.instance
            }));
        },

        getCount(projectId, sessionId) {
            const map = getProcessMap(projectId, sessionId);
            return map.size;
        },

        hasActiveProcesses(projectId, sessionId) {
            return this.getCount(projectId, sessionId) > 0;
        },

        cleanupSession(projectId, sessionId) {
            const key = makeKey(projectId, sessionId);
            const map = processes.get(key);

            if (!map || map.size === 0) return 0;

            let cleaned = 0;
            for (const [typeKey, entry] of map) {
                if (typeof entry.destroy === 'function') {
                    entry.destroy.call(entry.instance);
                }
                cleaned++;
            }

            processes.delete(key);
            return cleaned;
        },

        cleanupProject(projectId) {
            let cleanedSessions = 0;

            for (const [key, map] of processes) {
                if (key.startsWith(`${String(projectId || '')}::`)) {
                    for (const [typeKey, entry] of map) {
                        if (typeof entry.destroy === 'function') {
                            entry.destroy.call(entry.instance);
                        }
                    }
                    cleanedSessions++;
                    processes.delete(key);
                }
            }

            return cleanedSessions;
        },

        cleanupAll() {
            let cleanedSessions = 0;

            for (const [key, map] of processes) {
                for (const [typeKey, entry] of map) {
                    if (typeof entry.destroy === 'function') {
                        entry.destroy.call(entry.instance);
                    }
                }
                cleanedSessions++;
            }

            processes.clear();
            return cleanedSessions;
        },

        getDebugInfo() {
            const info = {};
            for (const [key, map] of processes) {
                info[key] = {
                    processCount: map.size,
                    processes: Array.from(map.keys())
                };
            }
            return info;
        },

        // Test utility: reset internal state
        _reset() {
            processes.clear();
        }
    };
}

describe('SessionBackgroundRegistry', () => {
    let registry;

    beforeEach(() => {
        registry = createTestRegistry();
    });

    describe('register', () => {
        it('registers a background process successfully', () => {
            const result = registry.register('proj1', 'sess1', 'poller', 'main', mockProcessInstance);
            expect(result).toBe(true);
            expect(registry.getCount('proj1', 'sess1')).toBe(1);
        });

        it('rejects registration without projectId', () => {
            const result = registry.register('', 'sess1', 'poller', 'main', mockProcessInstance);
            expect(result).toBe(false);
        });

        it('rejects registration without sessionId', () => {
            const result = registry.register('proj1', '', 'poller', 'main', mockProcessInstance);
            expect(result).toBe(false);
        });

        it('rejects registration without process', () => {
            const result = registry.register('proj1', 'sess1', 'poller', 'main', null);
            expect(result).toBe(false);
        });

        it('allows multiple processes of different types', () => {
            registry.register('proj1', 'sess1', 'poller', 'p1', mockProcessInstance);
            registry.register('proj1', 'sess1', 'timer', 't1', mockProcessInstance);
            registry.register('proj1', 'sess1', 'statusChecker', 's1', mockProcessInstance);
            
            expect(registry.getCount('proj1', 'sess1')).toBe(3);
        });

        it('allows multiple processes of same type with different ids', () => {
            registry.register('proj1', 'sess1', 'poller', 'p1', mockProcessInstance);
            registry.register('proj1', 'sess1', 'poller', 'p2', mockProcessInstance);
            
            expect(registry.getCount('proj1', 'sess1')).toBe(2);
        });
    });

    describe('unregister', () => {
        it('unregisters an existing process', () => {
            registry.register('proj1', 'sess1', 'poller', 'main', mockProcessInstance);
            const result = registry.unregister('proj1', 'sess1', 'poller', 'main');
            
            expect(result).toBe(true);
            expect(registry.getCount('proj1', 'sess1')).toBe(0);
        });

        it('calls destroy method when unregistering', () => {
            registry.register('proj1', 'sess1', 'poller', 'main', mockProcessInstance);
            registry.unregister('proj1', 'sess1', 'poller', 'main');
            
            expect(mockProcessInstance.destroy).toHaveBeenCalled();
        });

        it('returns false for non-existent process', () => {
            const result = registry.unregister('proj1', 'sess1', 'poller', 'nonexistent');
            expect(result).toBe(false);
        });
    });

    describe('get', () => {
        it('retrieves a registered process', () => {
            registry.register('proj1', 'sess1', 'poller', 'main', mockProcessInstance);
            const process = registry.get('proj1', 'sess1', 'poller', 'main');
            
            expect(process).toBe(mockProcessInstance);
        });

        it('returns null for non-existent process', () => {
            const process = registry.get('proj1', 'sess1', 'poller', 'nonexistent');
            expect(process).toBeNull();
        });
    });

    describe('getAll', () => {
        it('returns all processes for a session', () => {
            registry.register('proj1', 'sess1', 'poller', 'p1', mockProcessInstance);
            registry.register('proj1', 'sess1', 'timer', 't1', mockProcessInstance);
            
            const all = registry.getAll('proj1', 'sess1');
            
            expect(all).toHaveLength(2);
            expect(all.map(p => p.type)).toContain('poller');
            expect(all.map(p => p.type)).toContain('timer');
        });

        it('returns empty array for non-existent session', () => {
            const all = registry.getAll('proj1', 'nonexistent');
            expect(all).toHaveLength(0);
        });
    });

    describe('getCount', () => {
        it('returns 0 for empty session', () => {
            expect(registry.getCount('proj1', 'sess1')).toBe(0);
        });

        it('returns correct count after registrations', () => {
            registry.register('proj1', 'sess1', 'poller', 'p1', mockProcessInstance);
            registry.register('proj1', 'sess1', 'timer', 't1', mockProcessInstance);
            
            expect(registry.getCount('proj1', 'sess1')).toBe(2);
        });
    });

    describe('hasActiveProcesses', () => {
        it('returns false when no processes', () => {
            expect(registry.hasActiveProcesses('proj1', 'sess1')).toBe(false);
        });

        it('returns true when processes exist', () => {
            registry.register('proj1', 'sess1', 'poller', 'main', mockProcessInstance);
            expect(registry.hasActiveProcesses('proj1', 'sess1')).toBe(true);
        });
    });

    describe('cleanupSession', () => {
        it('cleans up all processes for a session', () => {
            registry.register('proj1', 'sess1', 'poller', 'p1', mockProcessInstance);
            registry.register('proj1', 'sess1', 'timer', 't1', mockProcessInstance);
            
            const cleaned = registry.cleanupSession('proj1', 'sess1');
            
            expect(cleaned).toBe(2);
            expect(registry.getCount('proj1', 'sess1')).toBe(0);
        });

        it('calls destroy on all processes during cleanup', () => {
            const mock1 = { destroy: vi.fn() };
            const mock2 = { destroy: vi.fn() };
            
            registry.register('proj1', 'sess1', 'poller', 'p1', mock1);
            registry.register('proj1', 'sess1', 'timer', 't1', mock2);
            
            registry.cleanupSession('proj1', 'sess1');
            
            expect(mock1.destroy).toHaveBeenCalled();
            expect(mock2.destroy).toHaveBeenCalled();
        });

        it('returns 0 for non-existent session', () => {
            const cleaned = registry.cleanupSession('proj1', 'nonexistent');
            expect(cleaned).toBe(0);
        });
    });

    describe('cleanupProject', () => {
        it('cleans up all sessions for a project', () => {
            registry.register('proj1', 'sess1', 'poller', 'p1', mockProcessInstance);
            registry.register('proj1', 'sess2', 'poller', 'p2', mockProcessInstance);
            registry.register('proj2', 'sess3', 'poller', 'p3', mockProcessInstance);
            
            const cleaned = registry.cleanupProject('proj1');
            
            expect(cleaned).toBe(2); // 2 sessions for proj1
            expect(registry.getCount('proj1', 'sess1')).toBe(0);
            expect(registry.getCount('proj1', 'sess2')).toBe(0);
            expect(registry.getCount('proj2', 'sess3')).toBe(1); // proj2 unaffected
        });
    });

    describe('cleanupAll', () => {
        it('cleans up all processes globally', () => {
            registry.register('proj1', 'sess1', 'poller', 'p1', mockProcessInstance);
            registry.register('proj2', 'sess2', 'timer', 't1', mockProcessInstance);
            
            const cleaned = registry.cleanupAll();
            
            expect(cleaned).toBe(2);
            expect(registry.getCount('proj1', 'sess1')).toBe(0);
            expect(registry.getCount('proj2', 'sess2')).toBe(0);
        });
    });

    describe('getDebugInfo', () => {
        it('returns debug info for all sessions', () => {
            registry.register('proj1', 'sess1', 'poller', 'p1', mockProcessInstance);
            registry.register('proj1', 'sess2', 'timer', 't1', mockProcessInstance);
            
            const info = registry.getDebugInfo();
            
            expect(Object.keys(info)).toHaveLength(2);
            expect(info['proj1::sess1'].processCount).toBe(1);
            expect(info['proj1::sess2'].processCount).toBe(1);
        });

        it('returns empty object when nothing registered', () => {
            const info = registry.getDebugInfo();
            expect(Object.keys(info)).toHaveLength(0);
        });
    });

    describe('key format', () => {
        it('uses projectId::sessionId format', () => {
            registry.register('my-project', 'my-session', 'poller', 'p1', mockProcessInstance);
            const info = registry.getDebugInfo();
            
            expect(info['my-project::my-session']).toBeDefined();
        });

        it('handles empty projectId', () => {
            registry.register('', 'sess1', 'poller', 'p1', mockProcessInstance);
            const info = registry.getDebugInfo();
            
            expect(info['::sess1']).toBeDefined();
        });

        it('handles empty sessionId', () => {
            registry.register('proj1', '', 'poller', 'p1', mockProcessInstance);
            const info = registry.getDebugInfo();
            
            expect(info['proj1::']).toBeDefined();
        });
    });

    describe('process types', () => {
        it('registers promisePoller type correctly', () => {
            const poller = { stopPolling: vi.fn(), destroy: vi.fn() };
            registry.register('proj1', 'sess1', 'promisePoller', 'async-123', poller);
            
            expect(registry.getCount('proj1', 'sess1')).toBe(1);
        });

        it('registers statusChecker type correctly', () => {
            const checker = { stop: vi.fn(), destroy: vi.fn() };
            registry.register('proj1', 'sess1', 'statusChecker', 'health', checker);
            
            expect(registry.getCount('proj1', 'sess1')).toBe(1);
        });
    });
});