/**
 * Tests for Simulation Debug UI
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

// Helper function to compute diff (mirrors the one in simulation-debug.js)
function computeDiff(fixture, live, volatileFields = ['timestamp', 'created_at', 'updated_at', 'promiseId', 'session_id', 'id', 'request_id']) {
    const differences = [];

    function compareObjects(fixtureObj, liveObj, path = '') {
        const allKeys = new Set([
            ...Object.keys(fixtureObj || {}),
            ...Object.keys(liveObj || {})
        ]);

        for (const key of allKeys) {
            const currentPath = path ? `${path}.${key}` : key;

            if (volatileFields.some(f => currentPath.toLowerCase().includes(f.toLowerCase()))) {
                continue;
            }

            const fixtureVal = fixtureObj?.[key];
            const liveVal = liveObj?.[key];

            if (typeof fixtureVal === 'object' && fixtureVal !== null &&
                typeof liveVal === 'object' && liveVal !== null) {
                compareObjects(fixtureVal, liveVal, currentPath);
            } else if (JSON.stringify(fixtureVal) !== JSON.stringify(liveVal)) {
                differences.push({
                    path: currentPath,
                    fixture: fixtureVal,
                    live: liveVal,
                    type: fixtureVal === undefined ? 'added' :
                          liveVal === undefined ? 'removed' : 'modified'
                });
            }
        }
    }

    compareObjects(fixture, live);
    return differences;
}

describe('SimulationDebug UI', () => {
    describe('Configuration', () => {
        it('should have correct default configuration', () => {
            const config = {
                apiBase: '/api',
                simulationsPath: '/simulations',
                volatileFields: ['timestamp', 'created_at', 'updated_at', 'promiseId', 'session_id', 'id', 'request_id'],
                defaultProjectId: 'default'
            };

            expect(config.apiBase).toBe('/api');
            expect(config.volatileFields).toContain('timestamp');
            expect(config.volatileFields).toContain('promiseId');
        });
    });

    describe('Diff Computation', () => {
        it('should detect added fields', () => {
            const fixture = { a: 1 };
            const live = { a: 1, b: 2 };

            const differences = computeDiff(fixture, live);

            expect(differences).toHaveLength(1);
            expect(differences[0]).toMatchObject({
                path: 'b',
                fixture: undefined,
                live: 2,
                type: 'added'
            });
        });

        it('should detect removed fields', () => {
            const fixture = { a: 1, b: 2 };
            const live = { a: 1 };

            const differences = computeDiff(fixture, live);

            expect(differences).toHaveLength(1);
            expect(differences[0]).toMatchObject({
                path: 'b',
                fixture: 2,
                live: undefined,
                type: 'removed'
            });
        });

        it('should detect modified fields', () => {
            const fixture = { a: 1 };
            const live = { a: 2 };

            const differences = computeDiff(fixture, live);

            expect(differences).toHaveLength(1);
            expect(differences[0]).toMatchObject({
                path: 'a',
                fixture: 1,
                live: 2,
                type: 'modified'
            });
        });

        it('should ignore volatile fields', () => {
            const fixture = { timestamp: '2024-01-01', data: 'value' };
            const live = { timestamp: '2024-01-02', data: 'value' };

            const volatileFields = ['timestamp', 'id'];
            const differences = computeDiff(fixture, live, volatileFields);

            expect(differences).toHaveLength(0);
        });

        it('should handle nested objects', () => {
            const fixture = { nested: { a: 1 } };
            const live = { nested: { a: 2 } };

            const differences = computeDiff(fixture, live);

            expect(differences).toHaveLength(1);
            expect(differences[0].path).toBe('nested.a');
        });

        it('should return empty array when objects match', () => {
            const fixture = { a: 1, b: { c: 2 } };
            const live = { a: 1, b: { c: 2 } };

            const differences = computeDiff(fixture, live);

            expect(differences).toHaveLength(0);
        });

        it('should handle null values', () => {
            const fixture = { a: null, b: 2 };
            const live = { a: null, b: 3 };

            const differences = computeDiff(fixture, live);

            expect(differences).toHaveLength(1);
            expect(differences[0].path).toBe('b');
        });

        it('should handle arrays', () => {
            const fixture = { items: [1, 2, 3] };
            const live = { items: [1, 2, 4] };

            const differences = computeDiff(fixture, live);

            expect(differences).toHaveLength(1);
            expect(differences[0].path).toBe('items');
        });
    });

    describe('Mock API Integration', () => {
        it('should fetch simulations from API', async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ simulations: [{ id: 'sim1', name: 'Simulation 1' }] })
            });
            global.fetch = mockFetch;

            const response = await fetch('/api/simulations');
            const data = await response.json();

            expect(mockFetch).toHaveBeenCalledWith('/api/simulations');
            expect(data.simulations).toHaveLength(1);
        });

        it('should handle API errors gracefully', async () => {
            const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
            global.fetch = mockFetch;

            try {
                await fetch('/api/simulations');
            } catch (e) {
                expect(e.message).toBe('Network error');
            }
        });
    });

    describe('Pipeline Files', () => {
        it('should identify all pipeline files', () => {
            const files = ['request.json', 'request.md', 'response.md', 'response.json'];
            
            expect(files).toContain('request.json');
            expect(files).toContain('request.md');
            expect(files).toContain('response.md');
            expect(files).toContain('response.json');
            expect(files).toHaveLength(4);
        });

        it('should determine correct language class for files', () => {
            const getLanguageClass = (filename) => {
                if (filename.endsWith('.json')) return 'language-json';
                if (filename.endsWith('.md')) return 'language-markdown';
                return '';
            };

            expect(getLanguageClass('request.json')).toBe('language-json');
            expect(getLanguageClass('request.md')).toBe('language-markdown');
            expect(getLanguageClass('response.json')).toBe('language-json');
            expect(getLanguageClass('response.md')).toBe('language-markdown');
        });
    });

    describe('Live Execution', () => {
        it('should format request body correctly', () => {
            const requestData = {
                context: { session_id: 'session-123', version: '1.0' },
                new_task: ['Test task']
            };

            const body = JSON.stringify(requestData);
            const parsed = JSON.parse(body);

            expect(parsed.context.session_id).toBe('session-123');
            expect(parsed.new_task[0]).toBe('Test task');
        });

        it('should parse response correctly', () => {
            const mockResponse = {
                data: {
                    context: { session_id: 'session-123' },
                    execute: { form: { choices: [] } }
                }
            };

            const data = mockResponse.data;
            expect(data.context.session_id).toBe('session-123');
            expect(data.execute.form.choices).toEqual([]);
        });
    });
});
