import {describe, expect, it} from 'vitest';
import {filterResponse, mergePollContextWithPersisted} from '../../src/routes/requests.routes.js';

describe('mergePollContextWithPersisted', () => {
    it('adds grayRoom slot from persisted request context when result.context.workbench omitted slots', () => {
        const responseData: Record<string, unknown> = {
            ...filterResponse({
                execute: {message: 'x'},
                context: {
                    task: 't',
                    workbench: {sections: {a: 1}},
                },
            }),
        };
        mergePollContextWithPersisted(responseData, {
            workbench: {
                slots: {grayRoom: {status: 'completed', turn: 0}},
            },
        });
        const ctx = responseData.context as Record<string, unknown>;
        const wb = ctx.workbench as Record<string, unknown>;
        const slots = wb.slots as Record<string, unknown>;
        expect(slots.grayRoom).toMatchObject({status: 'completed'});
        expect(wb.sections).toEqual({a: 1});
    });

    it('fills missing context keys from persisted only when absent in poll slice', () => {
        const responseData: Record<string, unknown> = {...filterResponse({execute: {form: {}}})};
        mergePollContextWithPersisted(responseData, {
            task: 'from-persisted',
            execution: {action: 'agent', step: 'x'},
        });
        const ctx = responseData.context as Record<string, unknown>;
        expect(ctx.task).toBe('from-persisted');
        expect((ctx.execution as Record<string, unknown>).action).toBe('agent');
    });
});
