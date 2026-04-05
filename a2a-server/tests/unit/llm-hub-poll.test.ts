import {afterEach, describe, expect, it, vi} from 'vitest';
import {
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
});
