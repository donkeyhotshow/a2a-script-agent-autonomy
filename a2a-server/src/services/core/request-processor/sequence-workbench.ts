/**
 * Sequence queue in context.workbench.sections.sequence (stateless server).
 * Supports { steps, headIndex } or a bare steps[] (treated as headIndex 0).
 */

export type SequenceStepStatus = 'pending' | 'in_progress' | 'complete' | 'blocked';

export interface SequenceStep {
    id: string;
    title: string;
    goal?: string;
    exit_criteria?: string[];
    prompt_reference?: string;
    dependencies?: string[];
    status: SequenceStepStatus;
    completedAt?: string;
}

export interface SequenceState {
    steps: SequenceStep[];
    headIndex: number;
}

export interface SequencePrediction {
    id: string;
    kind: 'final_prediction';
    title: string;
    goal: string;
    at: string;
}

function normalizeSequence(raw: unknown): SequenceState | null {
    if (raw === null || raw === undefined) {
        return null;
    }
    if (Array.isArray(raw)) {
        const steps = raw as SequenceStep[];
        if (steps.length === 0) {
            return null;
        }
        return {steps, headIndex: 0};
    }
    if (typeof raw !== 'object') {
        return null;
    }
    const o = raw as Record<string, unknown>;
    const steps = o['steps'];
    if (!Array.isArray(steps) || steps.length === 0) {
        return null;
    }
    const hi = o['headIndex'];
    const headIndex = typeof hi === 'number' && hi >= 0 && hi < steps.length ? hi : 0;
    return {steps: steps as SequenceStep[], headIndex};
}

/**
 * Apply step_complete: validate head step id, mark complete, advance head, optional final prediction.
 */
export function applySequenceStepComplete(
    ctx: Record<string, unknown>,
    stepId: string
): {ok: true; context: Record<string, unknown>} | {ok: false; error: string} {
    const wb = ctx['workbench'];
    if (!wb || typeof wb !== 'object') {
        return {ok: false, error: 'Missing context.workbench for sequence'};
    }
    const sections = (wb as Record<string, unknown>)['sections'];
    if (!sections || typeof sections !== 'object') {
        return {ok: false, error: 'Missing context.workbench.sections for sequence'};
    }
    const seqRaw = (sections as Record<string, unknown>)['sequence'];
    const seq = normalizeSequence(seqRaw);
    if (!seq) {
        return {ok: false, error: 'Missing or empty context.workbench.sections.sequence'};
    }

    const {steps, headIndex} = seq;
    if (headIndex >= steps.length) {
        return {ok: false, error: 'Sequence headIndex out of range'};
    }

    const current = steps[headIndex];
    if (!current || current.id !== stepId) {
        return {
            ok: false,
            error: `Step ID mismatch at head (expected ${current?.id ?? '?'}, got ${stepId})`,
        };
    }

    const completedAt = new Date().toISOString();
    current.status = 'complete';
    current.completedAt = completedAt;

    const nextHead = headIndex + 1;
    const updatedSequence: SequenceState = {
        steps: [...steps],
        headIndex: nextHead,
    };

    const historyEntry = {
        type: 'step_complete' as const,
        stepId: current.id,
        title: current.title,
        status: 'complete' as const,
        completedAt,
        summary: `Completed step: ${current.title}`,
    };

    const prevHistory = ctx['history'];
    const history = Array.isArray(prevHistory) ? [...prevHistory] : [];
    history.push(historyEntry);

    const opEntry = {
        op: 'sequence_step_complete' as const,
        stepId: current.id,
        at: completedAt,
    };
    const prevOp = ctx['operationHistory'];
    const operationHistory = Array.isArray(prevOp) ? [...prevOp] : [];
    operationHistory.push(opEntry);

    const sec: Record<string, unknown> = {...(sections as Record<string, unknown>), sequence: updatedSequence};
    const pendingAfter = updatedSequence.steps.slice(updatedSequence.headIndex).filter((s) => s.status !== 'complete');

    if (pendingAfter.length <= 2) {
        const predictionsRaw = sec['predictions'];
        const base: SequencePrediction[] = Array.isArray(predictionsRaw)
            ? [...(predictionsRaw as SequencePrediction[])]
            : [];
        const predictions = base.filter((p) => p.kind !== 'final_prediction');
        const taskGoal =
            (typeof ctx['task'] === 'string' && ctx['task']) ||
            updatedSequence.steps.map((s) => s.goal || s.title).join(' → ') ||
            'task';
        predictions.push({
            id: `pred-final-${completedAt}`,
            kind: 'final_prediction',
            title: 'Predicted Final Step',
            goal: `Consolidate progress toward: ${taskGoal}`,
            at: completedAt,
        });
        sec['predictions'] = predictions;
    }

    const nextWorkbench = {
        ...(wb as Record<string, unknown>),
        sections: sec,
    };

    const nextCtx: Record<string, unknown> = {
        ...ctx,
        workbench: nextWorkbench,
        history,
        operationHistory,
        execution: {
            ...(typeof ctx['execution'] === 'object' && ctx['execution'] !== null
                ? (ctx['execution'] as Record<string, unknown>)
                : {}),
            action: 'task',
            step: 'sequence',
        },
    };

    return {ok: true, context: nextCtx};
}
