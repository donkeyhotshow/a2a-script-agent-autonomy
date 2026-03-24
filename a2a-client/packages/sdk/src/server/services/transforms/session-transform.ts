/**
 * Session Transform Service
 * 
 * Transforms session data based on server responses.
 * Updates session state with context, execution, messages, and exchange logs.
 */

import type { Session, Project } from '../../models/session.model.js';

/**
 * Updates session with data from server response
 * 
 * Extracts and applies:
 * - context (version, execution, history, workbench)
 * - execute (form, message)
 * - messages
 * - exchangeLog
 * - finalResult
 */
export async function updateSessionWithServerResponse(
    project: Project,
    session: Session,
    serverResponse: any
): Promise<Session> {
    const updatedSession: Session = { ...session };
    
    // Update version if provided
    if (serverResponse?.context?.version) {
        updatedSession.version = serverResponse.context.version;
    }
    
    // Update context from server response
    if (serverResponse?.context) {
        updatedSession.context = { ...session.context, ...serverResponse.context };
        
        // Extract execution info from context
        if (serverResponse.context.execution) {
            updatedSession.execution = serverResponse.context.execution as Session['execution'];
        }
    }
    
    // Update execute information from server response (new protocol)
    if (serverResponse?.execute) {
        // Store execute information in context for now
        const hadExistingContext = !!updatedSession.context;
        updatedSession.context = updatedSession.context || {};
        if (hadExistingContext) {
            console.warn('[SESSION TRANSFORM] Context existed before execute update, keys:', Object.keys(updatedSession.context));
        }
        updatedSession.context.execute = serverResponse.execute;
        
        // Check for form choices and extract them
        if (serverResponse.execute.form) {
            updatedSession.context.formChoices = serverResponse.execute.form;
        }
    }
    
    // Handle completed status
    if (serverResponse?.execute?.completed === true || serverResponse?.finalResult) {
        updatedSession.status = 'COMPLETED';
        if (serverResponse.finalResult) {
            updatedSession.context = updatedSession.context || {};
            updatedSession.context.finalResult = serverResponse.finalResult;
        }
    }
    
    // Update messages from server response
    if (serverResponse?.messages && Array.isArray(serverResponse.messages)) {
        updatedSession.messages = [...(session.messages || []), ...serverResponse.messages];
    }

    // Persist assistant message from execute.message if not already in messages
    const assistantText: string | undefined =
        typeof serverResponse?.execute?.message === 'string' ? serverResponse.execute.message :
        typeof serverResponse?.execute?.message?.content === 'string' ? serverResponse.execute.message.content :
        typeof serverResponse?.execute?.form?.title === 'string' ? serverResponse.execute.form.title :
        undefined;

    if (assistantText) {
        const existing = updatedSession.messages || [];
        const alreadyAdded = existing.some(m => m.role === 'assistant' && m.content === assistantText);
        if (!alreadyAdded) {
            updatedSession.messages = [...existing, { role: 'assistant', content: assistantText, timestamp: new Date().toISOString() }];
        }
    }
    
    // Update exchange log from server response
    if (serverResponse?.exchangeLog && Array.isArray(serverResponse.exchangeLog)) {
        // Store exchange log in context
        updatedSession.context = updatedSession.context || {};
        const existingLog = Array.isArray(session.context?.exchangeLog) ? session.context.exchangeLog : [];
        updatedSession.context.exchangeLog = [
            ...existingLog,
            ...serverResponse.exchangeLog
        ];
    }
    
    // Update history (new protocol)
    if (serverResponse?.context?.history && Array.isArray(serverResponse.context.history)) {
        updatedSession.context = updatedSession.context || {};
        updatedSession.context.history = serverResponse.context.history;
    }
    
    if (serverResponse?.context?.workbench !== undefined) {
        updatedSession.context = updatedSession.context || {};
        updatedSession.context.workbench = serverResponse.context.workbench;
    }
    
    updatedSession.updatedAt = new Date().toISOString();
    return updatedSession;
}

/**
 * Updates session with data from server status response
 * 
 * Used for polling /requests/:id/status endpoint.
 * Extracts and applies:
 * - context
 * - execute
 * - messages
 * - exchangeLog
 * - status
 */
export async function updateSessionWithStatusResponse(
    project: Project,
    session: Session,
    statusResponse: any
): Promise<Session> {
    const updatedSession: Session = { ...session };
    
    // Update context from status response
    if (statusResponse?.context) {
        updatedSession.context = { ...session.context, ...statusResponse.context };
    }
    
    // Update execute information from status response
    if (statusResponse?.execute) {
        updatedSession.context = updatedSession.context || {};
        updatedSession.context.execute = statusResponse.execute;
    }
    
    // Update messages from status response
    if (statusResponse?.messages && Array.isArray(statusResponse.messages)) {
        updatedSession.messages = [...(session.messages || []), ...statusResponse.messages];
    }
    
    // Update exchange log from status response
    if (statusResponse?.exchangeLog && Array.isArray(statusResponse.exchangeLog)) {
        updatedSession.context = updatedSession.context || {};
        const existingLog = Array.isArray(session.context?.exchangeLog) ? session.context.exchangeLog : [];
        updatedSession.context.exchangeLog = [
            ...existingLog,
            ...statusResponse.exchangeLog
        ];
    }
    
    // Update status if provided
    if (statusResponse?.status) {
        updatedSession.status = statusResponse.status;
    }
    
    updatedSession.updatedAt = new Date().toISOString();
    return updatedSession;
}
