import {describe, expect, it} from 'vitest';
import {mergeGrayRoomFinalizeInnerContext} from '../src/services/core/request-processor/gray-room-orchestrator.js';

describe('mergeGrayRoomFinalizeInnerContext', () => {
    it('preserves workbench.sections and merges clarify into slots', () => {
        const rawInner = {
            task: 't',
            workbench: {sections: {a: 1}, slots: {prior: true}},
        };
        const nextCtx = {
            context: {
                workbench: {
                    sections: {},
                    slots: {clarify: {questions: ['q?']}},
                },
            },
        };
        const out = mergeGrayRoomFinalizeInnerContext(rawInner, nextCtx)!;
        expect(out.task).toBe('t');
        const wb = out.workbench as Record<string, unknown>;
        const sec = wb.sections as Record<string, unknown>;
        expect(sec.a).toBe(1);
        const slots = wb.slots as Record<string, unknown>;
        expect(slots.prior).toBe(true);
        expect(slots.clarify).toEqual({questions: ['q?']});
    });

    it('prefers handler files and history over raw transform context', () => {
        const rawInner = {
            task: 't',
            history: [{role: 'user', message: 'u'}],
            files: {a: 'old'},
        };
        const nextCtx = {
            context: {
                history: [{role: 'user', message: 'u'}, {role: 'assistant', message: 'x'}],
                files: {a: 'new', b: '2'},
            },
        };
        const out = mergeGrayRoomFinalizeInnerContext(rawInner, nextCtx)!;
        expect((out.history as unknown[]).length).toBe(2);
        expect((out.files as Record<string, string>).a).toBe('new');
        expect((out.files as Record<string, string>).b).toBe('2');
    });

    it('returns raw inner when nextCtx has no nested context', () => {
        const rawInner = {task: 'only'};
        expect(mergeGrayRoomFinalizeInnerContext(rawInner, {task: 'ignored'})).toEqual(rawInner);
    });
});
