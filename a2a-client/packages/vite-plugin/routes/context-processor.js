import {
    mergeDialogHistoryForInvoke,
    pickInvokeContextPatch,
    sanitizeContextForServer,
    stripSpuriousTaskEchoFromDialogHistory,
} from './utils/builders.js';

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

    // Client API: keep storage session id + project scope on session.context (stripped before /invoke).
    mergedContext.sessionId = sessionContext.sessionId;
    if (sessionContext.projectId) {
        mergedContext.projectId = sessionContext.projectId;
    }
    if (sessionContext.projectRoot) {
        mergedContext.projectRoot = sessionContext.projectRoot;
    }

    // Router beat B: choice submit must keep execution.step === 'router' (not session seed agent/new).
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

    // Router beat B: a new pipeline choice must not carry llmPromiseId from the prior router/classify hop
    if (hasChoices && submitResult && typeof submitResult.choice === 'string') {
        delete mergedContext.llmPromiseId;
    }

    return mergedContext;
}

export function processTaskAndContext({ mergedContext, submitResult, prevStepData }) {
    const effectiveTask = submitResult?.message;
    const execAction = mergedContext.execution?.action;

    if (effectiveTask) {
        if (execAction === 'dialog') {
            // Session task stays the first user line from the web client; current utterance is only result.message + history.
            stripSpuriousTaskEchoFromDialogHistory(mergedContext);
            mergeDialogHistoryForInvoke(mergedContext, effectiveTask);
        } else {
            mergedContext.task = effectiveTask;
        }
    }

    return { effectiveTask, mergedContext };
}

export function determineInvokeMode({ execStep, effectiveTask, hasChoices, submitResult }) {
    // First beat (task form, step new): run sync invoke so router execute is returned immediately.
    const shouldSyncInvoke =
        execStep === 'new' &&
        typeof effectiveTask === 'string' &&
        effectiveTask.trim().length > 0 &&
        !hasChoices;

    // Router beat B (pipeline choice): force sync invoke
    const syncRouterChoice =
        hasChoices && submitResult && typeof submitResult.choice === 'string';

    return { shouldSyncInvoke, syncRouterChoice };
}

export function prepareServerRequest({ mergedContext, submitResult, effectiveTask, shouldSyncInvoke, syncRouterChoice }) {
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
        ...(shouldSyncInvoke || syncRouterChoice ? { sync: true } : {}),
    };

    return requestToServer;
}