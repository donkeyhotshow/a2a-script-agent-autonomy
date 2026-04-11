import {describe, it, expect} from 'vitest';
import {filterResponse} from '../../src/routes/requests.routes';
import {clientSafeWorkbench} from '../../src/services/core/request/client-visible-context';

describe('filterResponse (poll /result)', () => {
    it('preserves workbench, files, scratchpad, scratchpad_ops on context', () => {
        const raw = {
            execute: {form: {title: 'x'}},
            context: {
                task: 't',
                execution: {action: 'a', step: 's'},
                history: [],
                workbench: {sections: {doc: 'hi'}},
                files: {'a.txt': 'x'},
                scratchpad: {done: true},
                scratchpad_ops: [{op: 'check', item: 'x'}],
                extraNoise: 'drop-me',
            },
        };
        const out = filterResponse(raw);
        expect(out.execute).toEqual(raw.execute);
        const ctx = out.context as Record<string, unknown>;
        expect(ctx.workbench).toEqual(raw.context.workbench);
        expect(ctx.files).toEqual(raw.context.files);
        expect(ctx.scratchpad).toEqual(raw.context.scratchpad);
        expect(ctx.scratchpad_ops).toEqual(raw.context.scratchpad_ops);
        expect(ctx.extraNoise).toBeUndefined();
    });

    it('drops server-owned workbench.slots (grayRoom, interruptTrace, thinking, clarify) from poll context', () => {
        const raw = {
            execute: {message: 'ok'},
            context: {
                workbench: {
                    sections: {},
                    slots: {
                        grayRoom: {enabled: true, planId: 'prom_x'},
                        interruptTrace: [{kind: 'llm_output'}],
                        thinking: {x: 1},
                        clarify: {y: 1},
                        editPlan: {keep: true},
                    },
                },
            },
        };
        const out = filterResponse(raw);
        const slots = (out.context as Record<string, unknown>)['workbench'] as Record<string, unknown>;
        const s = slots['slots'] as Record<string, unknown>;
        expect(s['grayRoom']).toBeUndefined();
        expect(s['interruptTrace']).toBeUndefined();
        expect(s['thinking']).toBeUndefined();
        expect(s['clarify']).toBeUndefined();
        expect(s['editPlan']).toEqual({keep: true});
    });

    it('clientSafeWorkbench is noop when grayRoom absent', () => {
        const wb = {sections: {a: 1}, slots: {editPlan: {x: 1}}};
        expect(clientSafeWorkbench(wb)).toBe(wb);
    });
});
