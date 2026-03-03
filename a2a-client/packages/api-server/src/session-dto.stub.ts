/**
 * Session DTO for Web – stub.
 * Task: tasks/client/02-api-server-client-api-integration.md
 *
 * TODO(02): define SessionSummary and SessionDetail types (id, status, context, messages[], execute)
 * TODO(02): build DTO from internal session + server response; hide server internals
 * TODO(02): expose via GET /api/sessions/:id and POST /api/sessions/:id/next responses
 */

export interface SessionSummary {
    id: string;
    status: string;
    title?: string;
    createdAt?: string;
    // TODO(02): add fields per SESSION-FLOW.md
}

export interface SessionDetail extends SessionSummary {
    context?: Record<string, unknown>;
    execute?: Record<string, unknown>;
    messages?: Array<{ role: string; text: string }>;
    // TODO(02): exchangeLog[] for replay; canContinue, canAuto, canStop
}

/** TODO(02): implement – map internal session + last server response to SessionDetail */
export function toSessionDetail(_internal: unknown, _lastResponse?: unknown): SessionDetail {
    throw new Error('TODO Task 02: implement toSessionDetail');
}
