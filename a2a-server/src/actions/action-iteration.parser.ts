/** Action iteration / step parsing from context or MD. */

export interface IterationState {
    step: number;
    total: number;
    subActionId?: string;
}

export function parseIterationFromContext(ctx: { iteration?: unknown }): IterationState | null {
    const it = ctx.iteration;
    if (typeof it !== 'object' || it === null) return null;
    const o = it as Record<string, unknown>;
    const step = typeof o.step === 'number' ? o.step : undefined;
    const total = typeof o.total === 'number' ? o.total : undefined;
    if (step == null || total == null) return null;
    return {
        step,
        total,
        subActionId: typeof o.subActionId === 'string' ? o.subActionId : undefined,
    };
}

export function formatIteration(state: IterationState): string {
    const sub = state.subActionId ? ` (${state.subActionId})` : '';
    return `step ${state.step}/${state.total}${sub}`;
}
