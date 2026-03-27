import {
    buildWebExecute as buildWebExecuteImpl,
    sanitizeApiRecordExecuteFields as sanitizeApiRecordExecuteFieldsImpl,
} from '../../../../../shared/web-execute-dto.mjs';

/** Strip client-only execute keys; add message / attachments for the web UI. */
export function buildWebExecute(execute: unknown): Record<string, unknown> | null {
    return buildWebExecuteImpl(execute);
}

/** Apply buildWebExecute to execute-shaped fields on an API payload. */
export function sanitizeApiRecordExecuteFields<T extends Record<string, unknown>>(payload: T): T {
    return sanitizeApiRecordExecuteFieldsImpl(payload) as T;
}
