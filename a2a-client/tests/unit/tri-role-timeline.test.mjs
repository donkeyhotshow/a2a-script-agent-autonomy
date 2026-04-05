/**
 * UA-C-03: Fixture tests — user / assistant / system roles in history projection,
 * merge behavior, and JSON round-trip (storage-style) without reordering loss.
 */
import { describe, it, expect } from 'vitest';
import { projectHistoryTimeline } from '../../packages/vite-plugin/routes/utils/history-projection.js';
import { mergeDialogHistoryForInvoke } from '../../shared/dialog-invoke-history.mjs';

/** Interleaved chain typical of tool + Red Room (system) lines. */
const MIXED_HISTORY = [
    { role: 'user', message: 'u1' },
    { role: 'assistant', message: 'a1' },
    { role: 'system', message: 'RAG page 1' },
    { role: 'assistant', message: 'a2' },
    { role: 'system', message: 'Read pkg/a.md' },
    { role: 'user', message: 'u2' },
];

describe('tri-role timeline (UA-C-03)', () => {
    it('projectHistoryTimeline preserves order and roles for user, assistant, system', () => {
        const timeline = projectHistoryTimeline({
            context: { history: MIXED_HISTORY },
        });

        expect(timeline.map((e) => e.role)).toEqual([
            'user',
            'assistant',
            'system',
            'assistant',
            'system',
            'user',
        ]);
        expect(timeline.map((e) => e.content)).toEqual([
            'u1',
            'a1',
            'RAG page 1',
            'a2',
            'Read pkg/a.md',
            'u2',
        ]);
        expect(timeline.map((e) => e.idx)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('JSON round-trip does not reorder or drop roles', () => {
        const json = JSON.stringify({ context: { history: MIXED_HISTORY } });
        const parsed = JSON.parse(json);
        const t1 = projectHistoryTimeline(parsed);
        const t2 = projectHistoryTimeline(JSON.parse(JSON.stringify(parsed)));
        expect(t1).toEqual(t2);
        expect(t1.length).toBe(6);
    });

    it('mergeDialogHistoryForInvoke appends user after trailing assistant without removing system rows', () => {
        const ctx = {
            history: [
                { role: 'user', message: 'start' },
                { role: 'assistant', message: 'ok' },
                { role: 'system', message: 'tool result' },
                { role: 'assistant', message: 'next step' },
            ],
        };
        mergeDialogHistoryForInvoke(ctx, 'follow-up');
        expect(ctx.history).toEqual([
            { role: 'user', message: 'start' },
            { role: 'assistant', message: 'ok' },
            { role: 'system', message: 'tool result' },
            { role: 'assistant', message: 'next step' },
            { role: 'user', message: 'follow-up' },
        ]);
    });

    it('mergeDialogHistoryForInvoke replaces trailing user text when last is user', () => {
        const ctx = {
            history: [
                { role: 'assistant', message: 'hi' },
                { role: 'user', message: 'draft' },
            ],
        };
        mergeDialogHistoryForInvoke(ctx, 'final');
        expect(ctx.history[ctx.history.length - 1]).toEqual({
            role: 'user',
            message: 'final',
        });
    });
});
