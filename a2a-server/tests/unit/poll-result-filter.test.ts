import {describe, it, expect} from 'vitest';
import {filterResponse} from '../../src/routes/requests.routes.js';

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
});
