import {afterEach, describe, expect, it, vi} from 'vitest';
import {
    extractLlmTextFromHubResponseBody,
    initAiHubChatPromise,
    parseHubCompatChatResponseBody,
    pollReadyThenFetch,
    resolveLlmPromiseRecovery,
} from '../../src/daemon/llm-hub-poll.js';

describe('parseHubCompatChatResponseBody', () => {
    it('parses plain JSON', () => {
        const o = parseHubCompatChatResponseBody('{"message":{"content":"x"}}');
        expect(o?.message?.content).toBe('x');
    });

    it('parses markdown-fenced JSON', () => {
        const raw = '```json\n{"message":{"content":"hi"}}\n```';
        const o = parseHubCompatChatResponseBody(raw);
        expect(o?.message?.content).toBe('hi');
    });

    it('returns null on garbage', () => {
        expect(parseHubCompatChatResponseBody('not json')).toBeNull();
    });

    it('parses Local LLM upstream /api/generate shape (top-level response)', () => {
        const o = parseHubCompatChatResponseBody('{"model":"qwen","response":"hello","done":true}');
        expect(o?.response).toBe('hello');
    });
});

describe('extractLlmTextFromHubResponseBody', () => {
    it('returns Local LLM upstream chat content when present', () => {
        expect(extractLlmTextFromHubResponseBody('{"message":{"content":"x"}}')).toBe('x');
    });

    it('returns full raw body when JSON is not Local LLM upstream-shaped (e.g. A2A response object)', () => {
        const a2a = JSON.stringify({
            step: 'response',
            execute: {message: 'hi', form: {textarea: {name: 'task'}}},
            completed: false,
        });
        expect(extractLlmTextFromHubResponseBody(a2a)).toBe(a2a);
    });
});

describe('initAiHubChatPromise', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('returns llmPromiseId on 202', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string, init?: RequestInit) => {
                expect(String(url)).toContain('/api/chat?promise=1');
                expect(init?.headers).toBeDefined();
                return new Response(JSON.stringify({promiseId: 'hub-p1'}), {status: 202});
            })
        );
        const r = await initAiHubChatPromise('http://hub', 'srv-1', {
            model: 'm',
            messages: [{role: 'user', content: 'hi'}],
            stream: false,
        });
        expect(r).toEqual({ok: true, llmPromiseId: 'hub-p1'});
    });

    it('returns inlineResponseBody on 200 completed (disk cache hit)', async () => {
        const body = JSON.stringify({message: {content: 'cached'}});
        vi.stubGlobal(
            'fetch',
            vi.fn(async () =>
                new Response(
                    JSON.stringify({
                        promiseId: 'hub-cache',
                        status: 'completed',
                        cached: true,
                        responseBody: body,
                    }),
                    {status: 200}
                )
            )
        );
        const r = await initAiHubChatPromise('http://hub', 'srv-1', {
            model: 'm',
            messages: [{role: 'user', content: 'hi'}],
            stream: false,
        });
        expect(r).toEqual({
            ok: true,
            llmPromiseId: 'hub-cache',
            inlineResponseBody: body,
        });
    });

    it('bad_http_status when not 202', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response('nope', {status: 500}))
        );
        const r = await initAiHubChatPromise('http://hub', 'srv-1', {
            model: 'm',
            messages: [{role: 'user', content: 'hi'}],
            stream: false,
        });
        expect(r).toEqual({ok: false, reason: 'bad_http_status', status: 500, bodyText: 'nope'});
    });

    it('missing_llm_promise_id on 202 without id', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response(JSON.stringify({}), {status: 202}))
        );
        const r = await initAiHubChatPromise('http://hub', 'srv-1', {
            model: 'm',
            messages: [{role: 'user', content: 'hi'}],
            stream: false,
        });
        expect(r).toEqual({ok: false, reason: 'missing_llm_promise_id'});
    });
});

describe('resolveLlmPromiseRecovery', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('resubmit on 404', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response(JSON.stringify({error: 'promise_not_found'}), {status: 404}))
        );
        const r = await resolveLlmPromiseRecovery('http://hub', 'pid1');
        expect(r).toEqual({kind: 'resubmit', reason: 'promise_not_found'});
    });

    it('pending on 202', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response(JSON.stringify({status: 'pending'}), {status: 202}))
        );
        const r = await resolveLlmPromiseRecovery('http://hub', 'pid1');
        expect(r).toEqual({kind: 'pending'});
    });

    it('ready on 200 after fetching response body', async () => {
        const f = vi.fn(async (url: string) => {
            if (url.includes('/promise/pid1/response')) {
                return new Response(JSON.stringify({message: {content: 'md'}}), {status: 200});
            }
            return new Response(JSON.stringify({status: 'done'}), {status: 200});
        });
        vi.stubGlobal('fetch', f);
        const r = await resolveLlmPromiseRecovery('http://hub', 'pid1');
        expect(r).toEqual({kind: 'ready', responseMd: 'md'});
    });

    it('ready when hub body uses generate API response field', async () => {
        const f = vi.fn(async (url: string) => {
            if (url.includes('/promise/pid2/response')) {
                return new Response(JSON.stringify({response: 'from-generate', done: true}), {status: 200});
            }
            return new Response(JSON.stringify({status: 'done'}), {status: 200});
        });
        vi.stubGlobal('fetch', f);
        const r = await resolveLlmPromiseRecovery('http://hub', 'pid2');
        expect(r).toEqual({kind: 'ready', responseMd: 'from-generate'});
    });

    it('ready when hub body is A2A-shaped JSON (no Local LLM upstream message wrapper)', async () => {
        const body = JSON.stringify({step: 'response', execute: {message: 'ok'}, completed: false});
        const f = vi.fn(async (url: string) => {
            if (url.includes('/promise/pid-a2a/response')) {
                return new Response(body, {status: 200});
            }
            return new Response(JSON.stringify({status: 'done'}), {status: 200});
        });
        vi.stubGlobal('fetch', f);
        const r = await resolveLlmPromiseRecovery('http://hub', 'pid-a2a');
        expect(r).toEqual({kind: 'ready', responseMd: body});
    });
});

describe('pollReadyThenFetch', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        delete process.env.LLM_POLL_INTERVAL_MS;
    });

    it('polls GET /promise/:id until done, then returns response text', async () => {
        process.env.LLM_POLL_INTERVAL_MS = '1';
        let statusCalls = 0;
        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string) => {
                const u = String(url);
                if (u.includes('/promise/hub-llm-1/response')) {
                    return new Response(JSON.stringify({message: {content: 'final'}}), {status: 200});
                }
                if (u.includes('/promise/hub-llm-1') && !u.includes('/response')) {
                    statusCalls += 1;
                    if (statusCalls === 1) {
                        return new Response(JSON.stringify({promiseId: 'hub-llm-1', status: 'pending'}), {
                            status: 202,
                        });
                    }
                    return new Response(
                        JSON.stringify({promiseId: 'hub-llm-1', status: 'done', result_status_code: 200}),
                        {status: 200}
                    );
                }
                return new Response('unexpected', {status: 500});
            })
        );
        const r = await pollReadyThenFetch('http://hub', 'hub-llm-1');
        expect(r).toBe('final');
        expect(statusCalls).toBe(2);
    });
});
