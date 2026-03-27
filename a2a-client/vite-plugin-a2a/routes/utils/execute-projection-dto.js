/**
 * UI projection for execute payload.
 * Canonical execute stays action-key based; this projection strips client-only actions.
 */
export {
    buildWebExecute as buildExecuteProjection,
    sanitizeApiRecordExecuteFields as sanitizeExecuteProjectionFields,
    buildWebExecute,
    sanitizeApiRecordExecuteFields,
} from '../../../shared/web-execute-dto.mjs';
