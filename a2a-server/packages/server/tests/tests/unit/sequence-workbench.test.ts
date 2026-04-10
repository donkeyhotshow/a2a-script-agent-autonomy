import {describe, expect, it} from 'vitest';
import {applySequenceStepComplete} from '../../src/services/core/request-processor/sequence-workbench.js';

describe('applySequenceStepComplete', () => {
    it('rejects when workbench.sequence is missing', () => {
        const r = applySequenceStepComplete({session_id: 's1'}, 'a');
        expect(r.ok).toBe(false);
        if (!r.ok) {
            expect(r.error).toMatch(/sequence/);
        }
    });

    it('completes head step and advances headIndex', () => {
        const ctx = {
            session_id: 'srv_sess_x',
            task: 'Do thing',
            workbench: {
                sections: {
                    sequence: {
                        steps: [
                            {
                                id: 's1',
                                title: 'First',
                                goal: 'g1',
                                exit_criteria: ['e1'],
                                prompt_reference: 'p1',
                                dependencies: [],
                                status: 'in_progress' as const,
                            },
                            {
                                id: 's2',
                                title: 'Second',
                                goal: 'g2',
                                exit_criteria: [],
                                prompt_reference: 'p2',
                                dependencies: [],
                                status: 'pending' as const,
                            },
                        ],
                        headIndex: 0,
                    },
                },
            },
        };
        const r = applySequenceStepComplete(ctx, 's1');
        expect(r.ok).toBe(true);
        if (!r.ok) {
            return;
        }
        const seq = (r.context.workbench as {sections: {sequence: {steps: unknown[]; headIndex: number}}}).sections
            .sequence;
        expect(seq.headIndex).toBe(1);
        expect(seq.steps[0].status).toBe('complete');
        expect(seq.steps[0].completedAt).toBeTruthy();
        expect(Array.isArray(r.context.history)).toBe(true);
        expect((r.context.history as unknown[]).length).toBe(1);
        expect(Array.isArray(r.context.operationHistory)).toBe(true);
    });

    it('rejects step id not at head', () => {
        const ctx = {
            workbench: {
                sections: {
                    sequence: {
                        steps: [{id: 's1', title: 'A', status: 'pending' as const}],
                        headIndex: 0,
                    },
                },
            },
        };
        const r = applySequenceStepComplete(ctx, 'wrong');
        expect(r.ok).toBe(false);
    });

    it('accepts sequence as array of steps', () => {
        const ctx = {
            workbench: {
                sections: {
                    sequence: [{id: 'a', title: 'T', status: 'pending' as const}],
                },
            },
        };
        const r = applySequenceStepComplete(ctx, 'a');
        expect(r.ok).toBe(true);
    });

    it('adds final_prediction when pending backlog drops to <= 2', () => {
        const ctx = {
            task: 'Ship feature',
            workbench: {
                sections: {
                    sequence: {
                        steps: [
                            {
                                id: 's1',
                                title: 'First',
                                goal: 'g1',
                                exit_criteria: [],
                                prompt_reference: 'p1',
                                dependencies: [],
                                status: 'in_progress' as const,
                            },
                            {
                                id: 's2',
                                title: 'Second',
                                goal: 'g2',
                                exit_criteria: [],
                                prompt_reference: 'p2',
                                dependencies: [],
                                status: 'pending' as const,
                            },
                            {
                                id: 's3',
                                title: 'Third',
                                goal: 'g3',
                                exit_criteria: [],
                                prompt_reference: 'p3',
                                dependencies: [],
                                status: 'pending' as const,
                            },
                        ],
                        headIndex: 0,
                    },
                },
            },
        };
        const r = applySequenceStepComplete(ctx, 's1');
        expect(r.ok).toBe(true);
        if (!r.ok) return;
        const sec = (r.context.workbench as {sections: {predictions?: unknown[]}}).sections;
        const preds = sec.predictions;
        expect(Array.isArray(preds)).toBe(true);
        const finalP = preds!.find((p: {kind?: string}) => p.kind === 'final_prediction');
        expect(finalP).toBeTruthy();
        expect((finalP as {title?: string}).title).toBe('Predicted Final Step');
    });
});
