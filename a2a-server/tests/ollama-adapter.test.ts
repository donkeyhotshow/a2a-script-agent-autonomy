/**
 * Ollama adapter tests (mocked fetch).
 */

import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import {
    createOllamaPromise,
    getPromiseStatus,
    getPromiseResponse,
    waitForPromise,
    type OllamaRequest,
    type PromiseStatus,
} from '../src/services/ollama-adapter.js';

describe('ollama-adapter', () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
        vi.stubGlobal(
            'fetch',
            vi.fn((url: string, init?: RequestInit) => {
                if (url.includes('/api/generate?promise=1')) {
                    return Promise.resolve(
                        new Response(JSON.stringify({promiseId: 'test-promise-123'}), {status: 200})
                    );
                }
                if (url.includes('/promise/test-promise-123/response')) {
                    return Promise.resolve(new Response('response body'));
                }
                if (url.includes('/promise/')) {
                    const status = url.includes('pending') ? 'pending' : 'done';
                    return Promise.resolve(
                        new Response(JSON.stringify({promiseId: 'test-promise-123', status}), {status: 200})
                    );
                }
                return Promise.resolve(new Response('{}', {status: 404}));
            })
        );
    });

    afterEach(() => {
        vi.stubGlobal('fetch', originalFetch);
    });

    describe('createOllamaPromise', () => {
        it('returns promiseId from AI Hub', async () => {
            const req: OllamaRequest = {model: 'llama2', prompt: 'hello'};
            const out = await createOllamaPromise(req);
            expect(out.promiseId).toBe('test-promise-123');
        });
        it('throws on non-ok response', async () => {
            vi.mocked(fetch).mockResolvedValueOnce(new Response('', {status: 500}));
            await expect(createOllamaPromise({model: 'x'})).rejects.toThrow('AI Hub error');
        });
    });

    describe('getPromiseStatus', () => {
        it('returns status from hub', async () => {
            const status = await getPromiseStatus('test-promise-123');
            expect(status.promiseId).toBe('test-promise-123');
            expect(['pending', 'done', 'error']).toContain(status.status);
        });
    });

    describe('getPromiseResponse', () => {
        it('returns response body', async () => {
            const res = await getPromiseResponse('test-promise-123');
            const text = await res.text();
            expect(text).toBe('response body');
        });
    });

    describe('waitForPromise', () => {
        it('returns response when status is done', async () => {
            let callCount = 0;
            vi.mocked(fetch).mockImplementation((url: string) => {
                if (url.includes('/promise/') && !url.includes('/response')) {
                    callCount++;
                    return Promise.resolve(
                        new Response(
                            JSON.stringify({
                                promiseId: 'p1',
                                status: callCount < 2 ? 'pending' : 'done',
                            }),
                            {status: 200}
                        )
                    ) as Promise<Response>;
                }
                if (url.includes('/response')) {
                    return Promise.resolve(new Response('done body')) as Promise<Response>;
                }
                return Promise.resolve(new Response('{}', {status: 404})) as Promise<Response>;
            });
            const out = await waitForPromise('p1');
            expect(out).toBe('done body');
        });
    });
});
