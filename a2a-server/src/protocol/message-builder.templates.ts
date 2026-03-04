import {CURRENT_PROTOCOL_VERSION} from './versioning/protocol-versions.js';

/** Message templates (skeleton objects). */

export function templateClientMessage(sessionId: string): Record<string, unknown> {
    return {version: CURRENT_PROTOCOL_VERSION, session_id: sessionId};
}

export function templateServerMessage(sessionId: string): Record<string, unknown> {
    return {version: CURRENT_PROTOCOL_VERSION, session_id: sessionId, direction: 'SERVER_TO_CLIENT'};
}
