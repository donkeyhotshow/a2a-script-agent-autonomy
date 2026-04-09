import {
    buildWebExecute as buildWebExecuteImpl,
    sanitizeApiRecordExecuteFields as sanitizeApiRecordExecuteFieldsImpl,
} from '../../../../../shared/web-execute-dto.js';

export type BuildWebExecuteOptions = { context?: unknown };

/** Strip client-only execute keys; add message / attachments for the web UI. */
export function buildWebExecute(
    execute: unknown,
    options?: BuildWebExecuteOptions
): Record<string, unknown> | null {
    return buildWebExecuteImpl(execute, options) as Record<string, unknown> | null;
}

/** Apply buildWebExecute to execute-shaped fields on an API payload. */
export function sanitizeApiRecordExecuteFields<T extends Record<string, unknown>>(payload: T): T {
    return sanitizeApiRecordExecuteFieldsImpl(payload) as T;
}
