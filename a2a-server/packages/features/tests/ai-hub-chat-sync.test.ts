import {afterEach, describe, expect, it, vi} from 'vitest';
import {fetchAiHubChatJson} from '../../src/utils/ai-hub-chat-sync';

describe('fetchAiHubChatJson', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('uses hub promise init URL (?promise=1)', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string) => {
                expect(String(url)).toContain('/api/chat?promise=1');
                return new Response(
                    JSON.stringify({
                        promiseId: 'p-inline',
                        status: 'completed',
                        cached: true,
                        responseBody: JSON.stringify({message: {content: 'x'}}),
                    }),
                    {status: 200}
                );
            })
        );
        const r = await fetchAiHubChatJson('http://hub.test:11434/', {
            model: 'm',
            messages: [{role: 'user', content: 'h'}],
            stream: false,
        });
        expect(r.ok && r.data.message?.content).toBe('x');
    });

    it('returns parsed data from inline cache 200 responseBody', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string) => {
                expect(String(url)).toContain('/api/chat?promise=1');
                return new Response(
                    JSON.stringify({
                        promiseId: 'p1',
                        status: 'completed',
                        cached: true,
                        responseBody: JSON.stringify({message: {content: '{"x":1}'}, eval_count: 2}),
                    }),
                    {status: 200}
                );
            })
        );
        const r = await fetchAiHubChatJson('http://hub', {
            model: 'm',
            messages: [{role: 'user', content: 'hi'}],
            stream: false,
        });
        expect(r.ok && r.data.message?.content).toBe('{"x":1}');
        expect(r.ok && r.data.eval_count).toBe(2);
    });

    it('202 then poll + body_raw returns full JSON', async () => {
        const payload = {message: {content: 'from-raw'}, eval_count: 3};
        vi.stubGlobal(
            'fetch',
            vi.fn(async (url: string) => {
                const u = String(url);
                if (u.includes('/api/chat?promise=1')) {
                    return new Response(JSON.stringify({promiseId: 'p-async'}), {status: 202});
                }
                if (u.includes('/promise/p-async/execute')) {
                    return new Response('', {status: 202});
                }
                // pollReadyThenFetch uses GET /promise/:id until status done (not /promises/status)
                if (u.includes('/promise/p-async') && !u.includes('/body_raw') && !u.includes('/response')) {
                    return new Response(JSON.stringify({status: 'done'}), {
                        status: 200,
                        headers: {'Content-Type': 'application/json'},
                    });
                }
                if (u.includes('/promise/p-async/body_raw')) {
                    return new Response(JSON.stringify(payload), {status: 200, headers: {'Content-Type': 'application/json'}});
                }
                return new Response('notfound', {status: 404});
            })
        );
        const r = await fetchAiHubChatJson('http://hub', {
            model: 'm',
            messages: [{role: 'user', content: 'hi'}],
            stream: false,
        });
        expect(r.ok && r.data.message?.content).toBe('from-raw');
        expect(r.ok && r.data.eval_count).toBe(3);
    });

    it('bad_http on error status from init', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('err', {status: 503})));
        const r = await fetchAiHubChatJson('http://hub', {
            model: 'm',
            messages: [{role: 'user', content: 'h'}],
            stream: false,
        });
        expect(r).toEqual({ok: false, status: 503, bodyText: 'err'});
    });

    it('passes AbortSignal to init fetch when provided', async () => {
        const ac = new AbortController();
        vi.stubGlobal(
            'fetch',
            vi.fn(async (_url: string, init?: RequestInit) => {
                expect(init?.signal).toBe(ac.signal);
                return new Response(
                    JSON.stringify({
                        promiseId: 'p',
                        status: 'completed',
                        cached: true,
                        responseBody: '{}',
                    }),
                    {status: 200, headers: {'Content-Type': 'application/json'}}
                );
            })
        );
        await fetchAiHubChatJson(
            'http://hub',
            {model: 'm', messages: [{role: 'user', content: 'h'}], stream: false},
            ac.signal
        );
    });

    it('returns ok:false when responseBody is not JSON', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn(async () =>
                new Response(
                    JSON.stringify({
                        promiseId: 'p',
                        status: 'completed',
                        cached: true,
                        responseBody: 'not-json',
                    }),
                    {status: 200}
                )
            )
        );
        const r = await fetchAiHubChatJson('http://hub', {
            model: 'm',
            messages: [{role: 'user', content: 'h'}],
            stream: false,
        });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.bodyText).toContain('invalid_json');
    });

    it('returns ok:false on fetch rejection (network)', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new Error('net down'))));
        const r = await fetchAiHubChatJson('http://hub', {
            model: 'm',
            messages: [{role: 'user', content: 'h'}],
            stream: false,
        });
        expect(r.ok).toBe(false);
        if (!r.ok) expect(r.bodyText).toContain('net down');
    });
});
