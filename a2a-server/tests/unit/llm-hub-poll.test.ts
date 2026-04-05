import {afterEach, describe, expect, it, vi} from 'vitest';
import {
    initAiHubChatPromise,
    parseOllamaChatResponseBody,
    resolveLlmPromiseRecovery,
} from '../../src/daemon/llm-hub-poll.js';

describe('parseOllamaChatResponseBody', () => {
    it('parses plain JSON', () => {
        const o = parseOllamaChatResponseBody('{"message":{"content":"x"}}');
        expect(o?.message?.content).toBe('x');
    });

    it('parses markdown-fenced JSON', () => {
        const raw = '```json\n{"message":{"content":"hi"}}\n```';
        const o = parseOllamaChatResponseBody(raw);
        expect(o?.message?.content).toBe('hi');
    });

    it('returns null on garbage', () => {
        expect(parseOllamaChatResponseBody('not json')).toBeNull();
    });

    it('parses Ollama /api/generate shape (top-level response)', () => {
        const o = parseOllamaChatResponseBody('{"model":"qwen","response":"hello","done":true}');
        expect(o?.response).toBe('hello');
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
});
