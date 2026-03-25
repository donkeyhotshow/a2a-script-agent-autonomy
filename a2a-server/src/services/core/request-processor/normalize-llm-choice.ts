/**
 * Router follow-up: `result.choice` is the selected LLM mode. Merge into `execution` when still on task/router.
 * Data-driven allowed choices: shared/router-static-choices.json → llmPipelineActions.
 */

import { LLM_PIPELINE_ACTIONS } from '../../../config/router-static.js';

export function normalizeLlmChoiceToExecution(context: Record<string, unknown>): void {
    const result = context['result'] as Record<string, unknown> | undefined;
    const choice = result?.choice;
    if (typeof choice !== 'string' || !LLM_PIPELINE_ACTIONS.includes(choice)) {
        return;
    }
    const exec = context['execution'] as Record<string, unknown> | undefined;
    const currentAction = exec?.action as string | undefined;
    const step = exec?.step as string | undefined;
    const isRouterHandoff =
        currentAction === undefined ||
        (currentAction === 'task' && (step === 'router' || step === 'new'));
    if (!isRouterHandoff) {
        return;
    }
    context['execution'] = {
        ...(exec ?? {}),
        action: choice,
        step: 'request',
    };
}
