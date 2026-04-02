/**
 * Manual LLM Service
 *
 * Manages "manual LLM mode" where the server pauses before calling LLM
 * and waits for an operator to submit the LLM response via API.
 *
 * Env: A2A_MANUAL_LLM_MODE=1 to enable
 */

import {logger} from '../../../utils/logger.js';

export interface PendingManualLlm {
    promiseId: string;
    messages: Array<{role: string; content: string}>;
    schemaName: string;
    ctxSnapshot: Record<string, unknown>;
    outputDir: string;
    createdAt: Date;
}

const pending = new Map<string, PendingManualLlm>();

/** Check if manual LLM mode is enabled via env */
export function isManualLlmModeEnabled(): boolean {
    const v = process.env.A2A_MANUAL_LLM_MODE;
    if (v === undefined || v === null) return false;
    const s = String(v).trim().toLowerCase();
    return s === '1' || s === 'true' || s === 'yes';
}

/** Store pending manual LLM request */
export function storePendingManualLlm(data: PendingManualLlm): void {
    pending.set(data.promiseId, data);
    logger.info('[ManualLlm] Stored pending manual LLM request', {
        promiseId: data.promiseId,
        schemaName: data.schemaName,
        messageCount: data.messages.length,
    });
}

/** Get pending manual LLM request by promiseId */
export function getPendingManualLlm(promiseId: string): PendingManualLlm | undefined {
    return pending.get(promiseId);
}

/** Remove pending manual LLM request */
export function removePendingManualLlm(promiseId: string): boolean {
    const existed = pending.has(promiseId);
    if (existed) {
        pending.delete(promiseId);
        logger.info('[ManualLlm] Removed pending manual LLM request', {promiseId});
    }
    return existed;
}

/** List all pending manual LLM requests */
export function listPendingManualLlms(): Array<{promiseId: string; schemaName: string; createdAt: Date; waitingMinutes: number}> {
    const now = Date.now();
    return Array.from(pending.values()).map(p => ({
        promiseId: p.promiseId,
        schemaName: p.schemaName,
        createdAt: p.createdAt,
        waitingMinutes: Math.floor((now - p.createdAt.getTime()) / 60000),
    }));
}

/** Build execute payload for "waiting manual LLM" state */
export function buildManualLlmWaitingExecute(promiseId: string, messages: Array<{role: string; content: string}>): Record<string, unknown> {
    const preview = messages.map(m => ({
        role: m.role,
        preview: m.content.slice(0, 200) + (m.content.length > 200 ? '...' : ''),
    }));

    return {
        form: {
            title: '🛑 MANUAL LLM MODE — Operator Input Required',
            description: `Server is waiting for manual LLM response. Submit via POST /requests/${promiseId}/llm-response`,
            meta: {
                mode: 'manual_llm',
                status: 'waiting_operator',
                promiseId,
            },
            messages_preview: preview,
            submit_endpoint: `/api/v1/requests/${promiseId}/llm-response`,
            submit_method: 'POST',
            submit_body_example: {
                response: 'Paste LLM response markdown here',
            },
        },
    };
}

/** Cleanup old pending entries (older than 24h) */
export function cleanupOldPendingManualLlms(maxAgeMs: number = 24 * 60 * 60 * 1000): number {
    const now = Date.now();
    let removed = 0;
    for (const [promiseId, data] of pending.entries()) {
        if (now - data.createdAt.getTime() > maxAgeMs) {
            pending.delete(promiseId);
            removed++;
        }
    }
    if (removed > 0) {
        logger.info('[ManualLlm] Cleaned up old pending requests', {removed});
    }
    return removed;
}
