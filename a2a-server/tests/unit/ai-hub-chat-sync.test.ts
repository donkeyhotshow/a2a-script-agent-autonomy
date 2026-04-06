import {afterEach, describe, expect, it, vi} from 'vitest';
import {fetchAiHubChatJson} from '../../src/utils/ai-hub-chat-sync.js';

describe('fetchAiHubChatJson', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('normalizes hub base (trailing slash) in request URL', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string) => {
                expect(url).toBe('http://hub.test:11434/api/chat');
                return new Response('{}', {status: 200});
            })
        );
        await fetchAiHubChatJson(
            'http://hub.test:11434/',
            {model: 'm', messages: [{role: 'user', content: 'h'}], stream: false}
        );
    });

    it('returns parsed data on 200', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string) => {
                expect(String(url)).toContain('/api/chat');
                return new Response(
                    JSON.stringify({message: {content: '{"x":1}'}, eval_count: 2}),
                    {status: 200}
                );
            })
        );
        const r = await fetchAiHubChatJson(
            'http://hub',
            {model: 'm', messages: [{role: 'user', content: 'hi'}], stream: false}
        );
        expect(r.ok && r.data.message?.content).toBe('{"x":1}');
    });

    it('bad_http on error status', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('err', {status: 503})));
        const r = await fetchAiHubChatJson('http://hub', {
            model: 'm',
            messages: [{role: 'user', content: 'h'}],
            stream: false,
        });
        expect(r).toEqual({ok: false, status: 503, bodyText: 'err'});
    });

    it('passes AbortSignal to fetch when provided', async () => {
        const ac = new AbortController();
        vi.stubGlobal(
            'fetch',
            vi.fn(async (_url: string, init?: RequestInit) => {
                expect(init?.signal).toBe(ac.signal);
                return new Response('{}', {status: 200, headers: {'Content-Type': 'application/json'}});
            })
        );
        await fetchAiHubChatJson(
            'http://hub',
            {model: 'm', messages: [{role: 'user', content: 'h'}], stream: false},
            ac.signal
        );
    });

    it('propagates when 200 body is not JSON', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () => new Response('not-json', {status: 200}))
        );
        await expect(
            fetchAiHubChatJson('http://hub', {
                model: 'm',
                messages: [{role: 'user', content: 'h'}],
                stream: false,
            })
        ).rejects.toThrow();
    });

    it('propagates fetch rejection (network / abort)', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('net down'))));
        await expect(
            fetchAiHubChatJson('http://hub', {
                model: 'm',
                messages: [{role: 'user', content: 'h'}],
                stream: false,
            })
        ).rejects.toThrow('net down');
    });
});
