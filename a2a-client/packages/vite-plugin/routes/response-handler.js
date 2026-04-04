import { toMinimalNextAck } from './utils/session-projection-dto.js';

export function parseServerResponse(data) {
    if (!data || data.trim() === '') {
        throw new Error('Empty response from A2A server');
    }
    return JSON.parse(data);
}

export function processResponseData({ a2aData, xhrRes }) {
    let serverResponse = null;
    let promiseData = null;

    if (a2aData.data?.promiseId) {
        promiseData = {
            promiseId: a2aData.data.promiseId,
            status: 'pending',
            submittedAt: new Date().toISOString(),
        };
    } else if (xhrRes.statusCode >= 200 && xhrRes.statusCode < 300) {
        serverResponse = a2aData;
    }

    return { serverResponse, promiseData };
}

export function extractAssistantMessage({ serverResponse, a2aPayload, history }) {
    let assistantMessage =
        a2aPayload?.execute?.message ||
        serverResponse?.result?.execute?.message ||
        a2aPayload?.result?.execute?.message ||
        serverResponse?.result?.message ||
        a2aPayload?.message ||
        serverResponse?.message ||
        null;

    if (
        assistantMessage &&
        typeof assistantMessage === 'string' &&
        (assistantMessage.length < 35 || !assistantMessage.match(/[.!?]$/))
    ) {
        if (Array.isArray(history)) {
            const historyMsg = history.find((h) => h.role === 'assistant');
            if (historyMsg?.message) {
                assistantMessage = historyMsg.message;
            }
        }
    }

    return assistantMessage;
}

export function createResponseAck({ success, step, promiseId = null, error = null }) {
    return toMinimalNextAck({ success, step, promiseId, error });
}