import { describe, it, expect } from 'vitest';
import { runTransformPipeline } from '../../src/transform/pipeline.js';
import type { TransformPipeline } from '../../src/transform/types.js';

/** T017: server transform consumes scratchpad_ops into scratchpad (see apply-scratchpad-ops). */
describe('apply-scratchpad-ops', () => {
    it('merges ops into context.scratchpad', async () => {
        const pipeline: TransformPipeline = {
            type: 'pipeline',
            steps: [
                {
                    op: 'set',
                    path: '$.context.scratchpad',
                    value: { a: '1' },
                },
                {
                    op: 'set',
                    path: '$.scratchpad_ops',
                    value: [{ op: 'add', item: 'note-b' }],
                },
                {
                    op: 'apply-scratchpad-ops',
                    from: '$.scratchpad_ops',
                    scratchpadPath: '$.context.scratchpad',
                },
            ],
        };
        const input = { context: {} };
        const out = await runTransformPipeline(pipeline, input);
        expect(out.success).toBe(true);
        const sp = (out.output.context as Record<string, unknown>)?.scratchpad as Record<string, unknown>;
        expect(sp?.['note-b']).toBe(true);
    });
});
