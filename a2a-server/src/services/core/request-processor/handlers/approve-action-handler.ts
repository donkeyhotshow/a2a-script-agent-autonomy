/**
 * Approve Action Handler
 * 
 * Handles processing of action execution approvals
 */

import {logger} from '../../../utils/logger.js';
import {actionProcessor} from '../../../actions/action-processor.js';
import type {
    RequestContext,
    ProcessResult,
    ProcessOutcome,
} from '../request-processor.interfaces.js';

/**
 * Handle approve_action - client confirms action execution
 */
export async function handleApproveAction(
    sessionId: string,
    _promiseId: string,
    ctx: Record<string, unknown>
): Promise<ProcessResult> {
    logger.info('[ApproveActionHandler] Processing approve_action', {
        actionId: ctx['action_id'] || ctx['actionId'],
        sessionId
    });

    const actionId = ctx['action_id'] as string || ctx['actionId'] as string;

    if (!actionId) {
        logger.warn('[ApproveActionHandler] Missing actionId in approve_action');
        return {
            outcome: 'failed' as ProcessOutcome,
            error: 'Missing actionId'
        } as ProcessResult;
    }

    // Delegate to action processor
    const result = await actionProcessor.approveAction(sessionId, actionId);
    
    // Include sessionId in context if it exists in input
    if (ctx['session_id'] && typeof ctx['session_id'] === 'string') {
        const resultContext = { ...result.message.context };
        (resultContext as Record<string, unknown>)['session_id'] = ctx['session_id'];
        return {
            ...result,
            message: {
                ...result.message,
                context: resultContext
            }
        };
    }
    
    return result;
}