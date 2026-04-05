import {beforeEach, describe, expect, it, vi} from 'vitest';

const initAiHubChatPromise = vi.fn();

vi.mock('../../src/daemon/llm-hub-poll.js', () => ({
    initAiHubChatPromise: (...a: unknown[]) => initAiHubChatPromise(...a),
}));

import {AgentSwing} from '../../src/services/core/agent-swing.js';

describe('AgentSwing.compressWithLookahead', () => {
    const swing = new AgentSwing();

    beforeEach(() => {
        initAiHubChatPromise.mockReset();
    });

    it('returns empty history when input history is empty', async () => {
        const poll = vi.fn();
        const r = await swing.compressWithLookahead(
            [],
            {},
            'prm',
            'http://hub',
            'model',
            poll
        );
        expect(r).toEqual({best_history: [], score: 1.0, options_considered: 1});
        expect(initAiHubChatPromise).not.toHaveBeenCalled();
        expect(poll).not.toHaveBeenCalled();
    });

    it('throws when all parallel branches fail (init not ok)', async () => {
        initAiHubChatPromise.mockResolvedValue({ok: false, reason: 'bad_http_status'});
        const poll = vi.fn();
        await expect(
            swing.compressWithLookahead(
                [{role: 'user', content: 'hi'}],
                {},
                'prm',
                'http://hub',
                'm',
                poll
            )
        ).rejects.toThrow(/All AgentSwing parallel branches failed/);
        expect(poll).not.toHaveBeenCalled();
    });

    it('throws when init ok but poll returns non-JSON array', async () => {
        initAiHubChatPromise.mockResolvedValue({ok: true, llmPromiseId: 'L'});
        const poll = vi.fn().mockResolvedValue('{"not":"array"}');
        await expect(
            swing.compressWithLookahead(
                [{role: 'user', content: 'x'}],
                {},
                'prm',
                'http://hub',
                'm',
                poll
            )
        ).rejects.toThrow(/All AgentSwing parallel branches failed/);
        expect(poll).toHaveBeenCalled();
    });

    it('picks best branch when one returns valid compressed array', async () => {
        initAiHubChatPromise.mockImplementation(async (_base, id: string) => {
            if (String(id).includes('swing-0')) {
                return {ok: true, llmPromiseId: 'A'};
            }
            return {ok: false, reason: 'x'};
        });
        const poll = vi.fn().mockImplementation(async (_url, pid: string) => {
            if (pid === 'A') {
                return JSON.stringify([{role: 'user', message: 'c'}]);
            }
            return null;
        });
        const hist = [{role: 'user', content: 'long '.repeat(50)}];
        const r = await swing.compressWithLookahead(
            hist,
            {},
            'prm',
            'http://hub',
            'm',
            poll
        );
        expect(r.best_history).toEqual([{role: 'user', message: 'c'}]);
        expect(r.options_considered).toBeGreaterThanOrEqual(1);
    });
});
