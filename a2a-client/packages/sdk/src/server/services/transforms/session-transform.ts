/**
 * Session Transform Service
 * 
 * Transforms session data based on server responses.
 * Updates session state with context, execution, messages, and exchange logs.
 */

import type { Session, Project } from '../../models/session.model.js';
import { buildWebExecute } from '../../lib/web-execute-dto.js';

/**
 * Updates session with data from server response
 * 
 * Extracts and applies:
 * - context (version, execution, history, workbench)
 * - execute (form, message)
 * - messages
 * - exchangeLog
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
        // Preserve canonical fields that must persist: files, scratchpad, scratchpad_ops
        const existingFiles = session.context?.files;
        const existingScratchpad = session.context?.scratchpad;
        const existingScratchpadOps = session.context?.scratchpad_ops;
        
        updatedSession.context = { ...session.context, ...serverResponse.context };
        
        // Restore preserved fields if not present in server response
        if (existingFiles && !updatedSession.context.files) {
            updatedSession.context.files = existingFiles;
        }
        if (existingScratchpad && !updatedSession.context.scratchpad) {
            updatedSession.context.scratchpad = existingScratchpad;
        }
        if (existingScratchpadOps && !updatedSession.context.scratchpad_ops) {
            updatedSession.context.scratchpad_ops = existingScratchpadOps;
        }
        
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
        updatedSession.context.execute = buildWebExecute(serverResponse.execute) ?? undefined;
        
        // Check for form choices and extract them
        if (serverResponse.execute.form) {
            updatedSession.context.formChoices = serverResponse.execute.form;
        }
    }
    
    // Completed status: protocol signals only (no duplicate execute.finalResult / top-level finalResult)
    const isResultCompleted = serverResponse?.result?.completed === true;
    const isExecuteCompleted = serverResponse?.execute?.completed === true;

    if (isResultCompleted || isExecuteCompleted) {
        updatedSession.status = 'COMPLETED';
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
    
    // Update history (new protocol) - context.history is canonical
    if (serverResponse?.context?.history && Array.isArray(serverResponse.context.history)) {
        updatedSession.context = updatedSession.context || {};
        updatedSession.context.history = serverResponse.context.history;
        
        // Also sync to messages if assistant entries exist in history but not in messages
        // This ensures consistency between the two sources
        const historyAssistants = serverResponse.context.history.filter((h: any) => h.role === 'assistant');
        if (historyAssistants.length > 0 && updatedSession.messages) {
            const messageContents = new Set(updatedSession.messages.map((m: any) => m.content));
            historyAssistants.forEach((h: any) => {
                if (h.content && !messageContents.has(h.content)) {
                    updatedSession.messages = [...updatedSession.messages, { 
                        role: 'assistant', 
                        content: h.content, 
                        timestamp: h.timestamp || new Date().toISOString() 
                    }];
                }
            });
        }
    }
    
    // Update workbench - merge sections instead of clobbering
    if (serverResponse?.context?.workbench !== undefined) {
        updatedSession.context = updatedSession.context || {};
        const existingWorkbench = session.context?.workbench;
        const newWorkbench = serverResponse.context.workbench;
        
        if (existingWorkbench && newWorkbench && typeof existingWorkbench === 'object' && typeof newWorkbench === 'object') {
            // Merge sections: preserve existing sections, update/add new ones
            updatedSession.context.workbench = {
                ...existingWorkbench,
                ...newWorkbench,
                sections: {
                    ...(existingWorkbench.sections || {}),
                    ...(newWorkbench.sections || {})
                }
            };
        } else {
            // If either is missing, use new value (or existing if new is undefined)
            updatedSession.context.workbench = newWorkbench ?? existingWorkbench;
        }
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
        updatedSession.context.execute = buildWebExecute(statusResponse.execute) ?? undefined;
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
