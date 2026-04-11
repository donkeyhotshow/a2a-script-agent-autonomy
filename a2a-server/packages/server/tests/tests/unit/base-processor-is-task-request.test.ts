/**
 * Locks router vs LLM-pipeline classification for mode:agent (see tasks/pending/router-agent-mode-fix-verification.md).
 */
import {describe, it, expect} from 'vitest';
import {BaseRequestProcessor, type RequestType} from '../../src/services/core/request-processor/base-processor';
import type {RequestContext, ProcessResult} from '../../src/services/core/request-processor/request-processor.interfaces';

class IsTaskRequestProbe extends BaseRequestProcessor {
    constructor() {
        super('is-task-request-probe');
    }
    getRequestType(): RequestType {
        return 'action';
    }
    canProcess(_request: RequestContext): boolean {
        return true;
    }
    protected async doProcess(): Promise<ProcessResult> {
        return {outcome: 'failed', error: 'probe'} as ProcessResult;
    }
    public probe(ctx: Record<string, unknown>): boolean {
        return this.isTaskRequest(ctx);
    }
}

describe('BaseRequestProcessor.isTaskRequest (agent / LLM pipeline)', () => {
    const probe = new IsTaskRequestProbe();

    it('returns true for agent|dialog when step is new (first beat still uses task/router path)', () => {
        expect(
            probe.probe({
                execution: {action: 'agent', step: 'new'},
                task: 'hello',
            })
        ).toBe(true);
    });

    it('returns false for agent when step is past new (do not re-route to task/router)', () => {
        expect(
            probe.probe({
                execution: {action: 'agent', step: 'start'},
                task: 'hello',
            })
        ).toBe(false);
        expect(
            probe.probe({
                execution: {action: 'agent', step: 'processing'},
                task: 'hello',
            })
        ).toBe(false);
    });

    it('returns false for dialog and task-decomposition when step is past new', () => {
        expect(probe.probe({execution: {action: 'dialog', step: 'start'}})).toBe(false);
        expect(
            probe.probe({execution: {action: 'task-decomposition', step: 'start'}})
        ).toBe(false);
    });
});
