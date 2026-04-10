/**
 * Merge + invoke body for POST /next (shared: Vite context-processor + SDK sessions-async).
 */

import { pickInvokeContextPatch } from './context-invoke-patch.mjs';
import {
    sanitizeContextForServer,
    sanitizeInvokeBodyForA2aUpstream,
} from './a2a-invoke-builders.mjs';
import {
    stripSpuriousTaskEchoFromDialogHistory,
    mergeDialogHistoryForInvoke,
} from './dialog-invoke-history.mjs';

export function mergeContext({ prevStepData, sessionContext, submitResult, hasChoices }) {
    const previousContext = prevStepData?.context || {};
    let mergedContext = { ...previousContext };

    if (prevStepData?.result?.context) {
        const filteredContext = pickInvokeContextPatch(prevStepData.result.context);
        mergedContext = { ...mergedContext, ...filteredContext };
    }

    const sessionCtx = sessionContext || {};
    const previousExecution = sessionCtx.execution || {};
    if (previousExecution.action && !mergedContext.execution) {
        mergedContext.execution = previousExecution;
    }
    if (sessionCtx.llmModel && !mergedContext.llmModel) {
        mergedContext.llmModel = sessionCtx.llmModel;
    }

    mergedContext.sessionId = sessionContext.sessionId;
    if (sessionContext.projectId) {
        mergedContext.projectId = sessionContext.projectId;
    }
    if (sessionContext.projectRoot) {
        mergedContext.projectRoot = sessionContext.projectRoot;
    }

    if (
        hasChoices &&
        submitResult &&
        typeof submitResult.choice === 'string' &&
        prevStepData?.context?.execution &&
        typeof prevStepData.context.execution === 'object' &&
        prevStepData.context.execution.step === 'router'
    ) {
        mergedContext.execution = { ...prevStepData.context.execution };
    }

    if (hasChoices && submitResult && typeof submitResult.choice === 'string') {
        delete mergedContext.llmPromiseId;
    }

    return mergedContext;
}

export function processTaskAndContext({ mergedContext, submitResult, prevStepData: _prev }) {
    const effectiveTask = submitResult?.message;
    const execAction = mergedContext.execution?.action;

    if (effectiveTask) {
        if (execAction === 'dialog') {
            stripSpuriousTaskEchoFromDialogHistory(mergedContext);
            mergeDialogHistoryForInvoke(mergedContext, effectiveTask);
        } else {
            mergedContext.task = effectiveTask;
        }
    }

    return { effectiveTask, mergedContext };
}

export function prepareServerRequest({ mergedContext, submitResult, effectiveTask }) {
    const contextForServer = sanitizeContextForServer(mergedContext);
    const execAction = mergedContext.execution?.action;
    let topLevelTask = effectiveTask;
    if (
        execAction === 'dialog' &&
        typeof mergedContext.task === 'string' &&
        mergedContext.task.trim().length > 0
    ) {
        topLevelTask = mergedContext.task;
    }
    const requestToServer = {
        context: contextForServer,
        result: submitResult,
        ...(topLevelTask ? { task: topLevelTask } : {}),
    };

    return sanitizeInvokeBodyForA2aUpstream(requestToServer);
}
