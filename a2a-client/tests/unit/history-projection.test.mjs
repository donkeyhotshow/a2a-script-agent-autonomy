import { describe, it, expect } from 'vitest';
import { projectHistoryTimeline } from '../../packages/vite-plugin/routes/utils/history-projection.js';

describe('projectHistoryTimeline', () => {
    it('projects basic user/assistant entries in order', () => {
        const payload = {
            context: {
                history: [
                    { role: 'user', message: 'hello' },
                    { role: 'assistant', message: 'hi there' },
                ],
            },
        };

        const timeline = projectHistoryTimeline(payload);

        expect(timeline).toEqual([
            {
                role: 'user',
                content: 'hello',
                source: 'history',
                idx: 1,
            },
            {
                role: 'assistant',
                content: 'hi there',
                source: 'history',
                idx: 2,
            },
        ]);
    });

    it('detects system role from explicit role', () => {
        const payload = {
            context: {
                history: [
                    { role: 'system', message: 'system note' },
                ],
            },
        };

        const [entry] = projectHistoryTimeline(payload);
        expect(entry.role).toBe('system');
        expect(entry.content).toBe('system note');
    });

    it('detects system role from metadata', () => {
        const payload = {
            context: {
                history: [
                    {
                        message: 'prompt',
                        metadata: { source: 'system-prompt' },
                    },
                    {
                        message: 'another',
                        metadata: { type: 'system' },
                    },
                ],
            },
        };

        const timeline = projectHistoryTimeline(payload);
        expect(timeline[0].role).toBe('system');
        expect(timeline[1].role).toBe('system');
    });

    it('skips empty messages and remains deterministic', () => {
        const payload = {
            context: {
                history: [
                    { role: 'user', message: 'a' },
                    { role: 'user', message: '' },
                    { role: 'assistant', content: 'b' },
                    { role: 'assistant', message: '   ' },
                ],
            },
        };

        const timeline = projectHistoryTimeline(payload);

        expect(timeline).toEqual([
            {
                role: 'user',
                content: 'a',
                source: 'history',
                idx: 1,
            },
            {
                role: 'assistant',
                content: 'b',
                source: 'history',
                idx: 2,
            },
        ]);
    });

    it('handles missing or invalid payload gracefully', () => {
        expect(projectHistoryTimeline(null)).toEqual([]);
        expect(projectHistoryTimeline({})).toEqual([]);
        expect(
            projectHistoryTimeline({ context: { history: 'not-an-array' } }),
        ).toEqual([]);
    });
});

