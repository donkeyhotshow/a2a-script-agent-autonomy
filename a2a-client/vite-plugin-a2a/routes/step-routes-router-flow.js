import { validateClientResultPayload } from '../../shared/client-api-envelope.mjs';

export function buildSubmitResult({ body, hasChoices }) {
    const { result, task } = body || {};
    if (result) return result;
    if (!task) return undefined;
    return { [hasChoices ? 'choice' : 'message']: task };
}

export function validateSubmitResult(submitResult) {
    const submitResultError = validateClientResultPayload(submitResult);
    if (submitResultError) {
        return submitResultError;
    }
    return null;
}

