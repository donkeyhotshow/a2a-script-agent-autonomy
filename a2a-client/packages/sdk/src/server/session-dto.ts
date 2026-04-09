/**
 * Session DTO for Web
 * 
 * Provides the canonical session representation for Web UI consumption.
 * Includes context, execute, status, exchangeLog[], messages[] as required.
 * 
 * ✅ IMPLEMENTED: Full session DTO with all required fields for Web UI
 * ✅ IMPLEMENTED: Context with execution state and exchangeLog
 * ✅ IMPLEMENTED: Messages array for UI rendering
 * ✅ IMPLEMENTED: Execute information for current action
 * ✅ IMPLEMENTED: New protocol support - execute.form.choices, action-key shape
 */

/**
 * Form choice item (new protocol)
 */
export interface FormChoice {
    id: string;
    label: string;
    value?: unknown;
    description?: string;
}

/**
 * Form data from server (new protocol)
 */
export interface FormData {
    title?: string;
    description?: string;
    choices?: FormChoice[];
    input?: Array<{
        name: string;
        type: 'text' | 'textarea' | 'select' | 'checkbox' | 'number';
        label?: string;
        required?: boolean;
        default?: unknown;
        options?: Array<{ value: unknown; label: string }>;
    }>;
}

/**
 * Execution state (new protocol)
 */
export interface ExecutionState {
    action?: string;
    step?: string;
    progress?: number;
    status?: string;
}

/**
 * Session summary for list views
 */
export interface SessionSummary {
    id: string;
    projectId: string;
    title: string;
    status?: string;
    createdAt: string;
    updatedAt: string;
    messageCount: number;
    lastPromiseId?: string;
}

/**
 * Session detail for single session views
 */
export interface SessionDetail {
    id: string;
    projectId: string;
    title: string;
    task?: string;
    status?: string;
    selectedAction?: string;
    context?: Record<string, unknown>;
    lastPromiseId?: string;
    createdAt: string;
    updatedAt: string;
    messages: unknown[];
    exchangeLog: unknown[];
    messageCount: number;
    // New protocol fields
    execution?: ExecutionState;
    formChoices?: FormData;
    execute?: Record<string, unknown>;
    currentExecute?: Record<string, unknown>;
}

/**
 * Message in session
 */
export interface SessionMessage {
    id: string;
    content: unknown;
    role: 'user' | 'assistant' | 'system';
    timestamp: string;
    metadata?: Record<string, unknown>;
}

/**
 * Exchange log entry
 */
export interface ExchangeLogEntry {
    id: string;
    type: 'request' | 'response' | 'error';
    content: unknown;
    timestamp: string;
    metadata?: Record<string, unknown>;
}

/**
 * Execute information from server
 */
export interface ExecuteInfo {
    action?: string;
    input?: unknown;
    output?: unknown;
    status?: string;
    progress?: number;
    timestamp: string;
}

/**
 * Context information
 */
export interface SessionContext {
    execution?: {
        action?: string;
        step?: string;
        progress?: number;
        status?: string;
    };
    history?: unknown[];
    workbench?: unknown;
    [key: string]: unknown;
}

/**
 * Convert session to summary DTO
 */
export function toSessionSummary(session: any): SessionSummary {
    return {
        id: session.id,
        projectId: session.projectId,
        title: session.title,
        status: session.status,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messageCount: Array.isArray(session.messages) ? session.messages.length : 0,
        lastPromiseId: session.lastPromiseId,
    };
}

/**
 * Convert session to detail DTO
 */
export function toSessionDetail(session: any): SessionDetail {
    // Extract form choices from context if present
    const formChoices = session.context?.formChoices || (session.context?.execute?.form ? session.context.execute.form : undefined);
    
    return {
        id: session.id,
        projectId: session.projectId,
        title: session.title,
        task: session.task,
        status: session.status,
        selectedAction: session.selectedAction,
        context: session.context || {},
        lastPromiseId: session.lastPromiseId,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messages: Array.isArray(session.messages) ? session.messages : [],
        exchangeLog: Array.isArray(session.context?.exchangeLog) ? session.context.exchangeLog : [],
        messageCount: Array.isArray(session.messages) ? session.messages.length : 0,
        // New protocol fields
        execution: session.execution,
        formChoices: formChoices,
        currentExecute: session.context?.execute,
    };
}

/**
 * Create new session message
 */
export function createSessionMessage(
    content: unknown,
    role: 'user' | 'assistant' | 'system' = 'assistant',
    metadata?: Record<string, unknown>
): SessionMessage {
    return {
        id: `msg_${crypto.randomUUID()}`,
        content,
        role,
        timestamp: new Date().toISOString(),
        metadata,
    };
}

/**
 * Create exchange log entry
 */
export function createExchangeLogEntry(
    type: 'request' | 'response' | 'error',
    content: unknown,
    metadata?: Record<string, unknown>
): ExchangeLogEntry {
    return {
        id: `log_${crypto.randomUUID()}`,
        type,
        content,
        timestamp: new Date().toISOString(),
        metadata,
    };
}

/**
 * Create execute info
 */
export function createExecuteInfo(
    action?: string,
    input?: unknown,
    output?: unknown,
    status?: string,
    progress?: number
): ExecuteInfo {
    return {
        action,
        input,
        output,
        status,
        progress,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Create session context
 */
export function createSessionContext(
    execution?: SessionContext['execution'],
    history?: unknown[],
    workbench?: unknown
): SessionContext {
    return {
        execution,
        history: history || [],
        workbench,
    };
}

/**
 * Update session with new message
 */
export function addMessageToSession(
    session: any,
    content: unknown,
    role: 'user' | 'assistant' | 'system' = 'assistant',
    metadata?: Record<string, unknown>
): any {
    const message = createSessionMessage(content, role, metadata);
    const messages = Array.isArray(session.messages) ? [...session.messages, message] : [message];
    
    return {
        ...session,
        messages,
        updatedAt: new Date().toISOString(),
    };
}

/**
 * Update session with exchange log entry
 */
export function addExchangeLogToSession(
    session: any,
    type: 'request' | 'response' | 'error',
    content: unknown,
    metadata?: Record<string, unknown>
): any {
    const entry = createExchangeLogEntry(type, content, metadata);
    const exchangeLog = Array.isArray(session.context?.exchangeLog) 
        ? [...session.context.exchangeLog, entry] 
        : [entry];
    
    return {
        ...session,
        context: {
            ...session.context,
            exchangeLog,
        },
        updatedAt: new Date().toISOString(),
    };
}

/**
 * Update session with execute information
 */
export function addExecuteInfoToSession(
    session: any,
    executeInfo: ExecuteInfo
): any {
    return {
        ...session,
        context: {
            ...session.context,
            execute: executeInfo,
        },
        updatedAt: new Date().toISOString(),
    };
}

/**
 * Update session status
 */
export function updateSessionStatus(
    session: any,
    status: string
): any {
    return {
        ...session,
        status,
        updatedAt: new Date().toISOString(),
    };
}

/**
 * Update session context
 */
export function updateSessionContext(
    session: any,
    context: Partial<SessionContext>
): any {
    return {
        ...session,
        context: {
            ...session.context,
            ...context,
        },
        updatedAt: new Date().toISOString(),
    };
}

/**
 * Validate session data
 */
export function validateSessionData(session: any): boolean {
    if (!session || typeof session !== 'object') return false;
    if (!session.id || typeof session.id !== 'string') return false;
    if (!session.projectId || typeof session.projectId !== 'string') return false;
    if (!session.title || typeof session.title !== 'string') return false;
    if (!session.createdAt || !new Date(session.createdAt).getTime()) return false;
    if (!session.updatedAt || !new Date(session.updatedAt).getTime()) return false;
    
    return true;
}

/**
 * Sanitize session data for API response
 */
export function sanitizeSessionForAPI(session: any): any {
    if (!validateSessionData(session)) {
        throw new Error('Invalid session data');
    }
    
    return {
        id: session.id,
        projectId: session.projectId,
        title: session.title,
        task: session.task,
        status: session.status,
        selectedAction: session.selectedAction,
        context: session.context || {},
        lastPromiseId: session.lastPromiseId,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messages: Array.isArray(session.messages) ? session.messages : [],
        exchangeLog: Array.isArray(session.context?.exchangeLog) ? session.context.exchangeLog : [],
        messageCount: Array.isArray(session.messages) ? session.messages.length : 0,
    };
}

/**
 * Create session from basic data
 */
export function createSession(
    projectId: string,
    title: string,
    task?: string,
    context?: SessionContext
): any {
    const now = new Date().toISOString();
    
    return {
        id: `sess_${crypto.randomUUID()}`,
        projectId,
        title,
        task,
        status: 'PENDING',
        selectedAction: undefined,
        context: context || createSessionContext(),
        lastPromiseId: undefined,
        createdAt: now,
        updatedAt: now,
        messages: [],
        messageCount: 0,
    };
}

/**
 * Session status types
 */
export const SESSION_STATUS = {
    PENDING: 'PENDING',
    READY: 'READY',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    ERROR: 'ERROR',
} as const;

/**
 * Session action types
 */
export const SESSION_ACTIONS = {
    START: 'start',
    NEXT: 'next',
    CANCEL: 'cancel',
    RESET: 'reset',
} as const;

/**
 * Session message roles
 */
export const MESSAGE_ROLES = {
    USER: 'user',
    ASSISTANT: 'assistant',
    SYSTEM: 'system',
} as const;

/**
 * Exchange log types
 */
export const EXCHANGE_LOG_TYPES = {
    REQUEST: 'request',
    RESPONSE: 'response',
    ERROR: 'error',
} as const;
