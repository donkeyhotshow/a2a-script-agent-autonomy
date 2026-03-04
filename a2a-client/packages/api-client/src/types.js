/**
 * Types for API Client
 * 
 * Defines the session model structure used in the API Client package
 * Matches the server-side session model with context, execute, status, exchangeLog[], messages[]
 */

/**
 * Session model for API Client
 * Supports both legacy and new protocol
 * @see docs/new-request-flow/PROTOCOL.md
 */
export class Session {
    constructor(data) {
        this.id = data.id;
        this.projectId = data.projectId;
        this.title = data.title;
        this.task = data.task;
        this.status = data.status || 'PENDING';
        this.selectedAction = data.selectedAction;
        this.context = data.context || {};
        this.lastPromiseId = data.lastPromiseId;
        this.createdAt = data.createdAt;
        this.updatedAt = data.updatedAt;
        this.messages = Array.isArray(data.messages) ? data.messages : [];
        this.exchangeLog = Array.isArray(data.context?.exchangeLog) ? data.context.exchangeLog : [];
        this.messageCount = Array.isArray(data.messages) ? data.messages.length : 0;
        
        // New protocol fields
        this.execution = data.context?.execution || null;
        this.history = data.context?.history || [];
        this.docVirtual = data.context?.docVirtual || '';
    }

    /**
     * Add message to session
     */
    addMessage(content, role = 'assistant', metadata = {}) {
        const message = {
            id: `msg_${crypto.randomUUID()}`,
            content,
            role,
            timestamp: new Date().toISOString(),
            metadata,
        };
        
        this.messages.push(message);
        this.messageCount = this.messages.length;
        this.updatedAt = new Date().toISOString();
        
        return message;
    }

    /**
     * Add exchange log entry
     */
    addExchangeLog(type, content, metadata = {}) {
        const entry = {
            id: `log_${crypto.randomUUID()}`,
            type,
            content,
            timestamp: new Date().toISOString(),
            metadata,
        };
        
        if (!this.context.exchangeLog) {
            this.context.exchangeLog = [];
        }
        
        this.context.exchangeLog.push(entry);
        this.updatedAt = new Date().toISOString();
        
        return entry;
    }

    /**
     * Update execute information
     */
    updateExecute(action, input, output, status, progress) {
        this.context.execute = {
            action,
            input,
            output,
            status,
            progress,
            timestamp: new Date().toISOString(),
        };
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Update execution context (new protocol)
     * @param {string} action - Action ID
     * @param {string} step - Step ID
     * @param {string} status - Status ('completed' or undefined)
     * @param {number} progress - Progress 0-100
     * @see docs/new-request-flow/PROTOCOL.md#execution
     */
    updateExecution(action, step, status, progress) {
        this.execution = {
            action,
            step,
            status,
            progress,
        };
        this.context.execution = this.execution;
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Add history entry (new protocol)
     * @param {string} action - Action ID
     * @param {string} step - Step ID
     * @param {object} result - Action result
     * @see docs/new-request-flow/PROTOCOL.md#history
     */
    addHistoryEntry(action, step, result) {
        const entry = {
            action,
            step,
            result,
            timestamp: new Date().toISOString(),
        };
        this.history.push(entry);
        this.context.history = this.history;
        this.updatedAt = new Date().toISOString();
        return entry;
    }

    /**
     * Update docVirtual (new protocol)
     * @param {string} content - Virtual document content
     * @see docs/new-request-flow/PROTOCOL.md#docvirtual
     */
    updateDocVirtual(content) {
        this.docVirtual = content;
        this.context.docVirtual = content;
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Update status
     */
    updateStatus(status) {
        this.status = status;
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Update context
     */
    updateContext(context) {
        this.context = { ...this.context, ...context };
        this.updatedAt = new Date().toISOString();
    }

    /**
     * Get summary for list views
     */
    getSummary() {
        return {
            id: this.id,
            projectId: this.projectId,
            title: this.title,
            status: this.status,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            messageCount: this.messageCount,
            lastPromiseId: this.lastPromiseId,
        };
    }

    /**
     * Get detail for single session views
     */
    getDetail() {
        return {
            id: this.id,
            projectId: this.projectId,
            title: this.title,
            task: this.task,
            status: this.status,
            selectedAction: this.selectedAction,
            context: this.context,
            lastPromiseId: this.lastPromiseId,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            messages: this.messages,
            exchangeLog: this.exchangeLog,
            messageCount: this.messageCount,
        };
    }
}

/**
 * Session status types - supports both legacy and new protocol
 * @see docs/new-request-flow/PROTOCOL.md#sessionstatus
 */
export const SESSION_STATUS = {
    PENDING: 'PENDING',          // Ожидает выбора действия (new protocol: 'pending')
    READY: 'READY',              // Действие выбрано (new protocol: 'ready')
    IN_PROGRESS: 'IN_PROGRESS',  // Выполняется (new protocol: 'in_progress')
    WAITING_CONFIRMATION: 'WAITING_CONFIRMATION', // Ожидает подтверждения (new protocol: 'waiting_confirmation')
    COMPLETED: 'COMPLETED',      // Завершено (new protocol: 'completed')
    ERROR: 'ERROR',              // Ошибка (new protocol: 'error')
    CANCELLED: 'CANCELLED',       // Отменено (new protocol: 'cancelled')
};

/**
 * Legacy session status (for backwards compatibility)
 * @deprecated Use SESSION_STATUS instead
 */
export const LEGACY_SESSION_STATUS = {
    PENDING: 'PENDING',
    READY: 'READY',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    FAILED: 'FAILED',
    CANCELLED: 'CANCELLED',
};

/**
 * Session status union type for TypeScript
 * @see docs/new-request-flow/PROTOCOL.md#sessionstatus
 */
// Note: In JS, use SESSION_STATUS constants instead of type aliases

/**
 * Session action types
 */
export const SESSION_ACTIONS = {
    START: 'start',
    NEXT: 'next',
    CANCEL: 'cancel',
    RESET: 'reset',
};

/**
 * Message roles
 */
export const MESSAGE_ROLES = {
    USER: 'user',
    ASSISTANT: 'assistant',
    SYSTEM: 'system',
};

/**
 * Exchange log types
 */
export const EXCHANGE_LOG_TYPES = {
    REQUEST: 'request',
    RESPONSE: 'response',
    ERROR: 'error',
};

/**
 * Create new session
 */
export function createSession(projectId, title, task, context) {
    const now = new Date().toISOString();
    
    return new Session({
        id: `sess_${crypto.randomUUID()}`,
        projectId,
        title,
        task,
        status: 'PENDING',
        selectedAction: undefined,
        context: context || {},
        lastPromiseId: undefined,
        createdAt: now,
        updatedAt: now,
        messages: [],
        messageCount: 0,
    });
}

/**
 * Validate session data
 */
export function validateSessionData(session) {
    if (!session || typeof session !== 'object') return false;
    if (!session.id || typeof session.id !== 'string') return false;
    if (!session.projectId || typeof session.projectId !== 'string') return false;
    if (!session.title || typeof session.title !== 'string') return false;
    if (!session.createdAt || !new Date(session.createdAt).getTime()) return false;
    if (!session.updatedAt || !new Date(session.updatedAt).getTime()) return false;
    
    return true;
}

/**
 * Async client types for handling long-running operations with promiseId support
 */

/**
 * Options for configuring the async client
 */
export interface AsyncClientOptions {
    httpClient: {
        get: (url: string) => Promise<Response>;
        post: (url: string, body: unknown) => Promise<Response>;
        put: (url: string, body: unknown) => Promise<Response>;
        delete: (url: string) => Promise<Response>;
    };
    baseUrl?: string;
}

/**
 * Status of an async operation
 */
export interface AsyncOperationStatus<T = unknown> {
    promiseId: string;
    status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
    progress?: {
        current: number;
        total: number;
        percentage: number;
        message?: string;
    };
    data?: T;
    error?: string;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Result of an async operation
 */
export interface AsyncOperationResult<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    metadata?: Record<string, unknown>;
}

/**
 * Error class for async client operations
 */
export class AsyncClientError extends Error {
    constructor(
        message: string,
        public readonly context: {
            promiseId?: string;
            timeout?: number;
            originalError?: unknown;
        }
    ) {
        super(message);
        this.name = 'AsyncClientError';
    }
}

/**
 * Handle action options interface
 */
export interface HandleActionOptions {
    executeScript?: (code: string, input: Record<string, unknown>, context: { 
        workingDir?: string; 
        sessionId?: string; 
        stepId?: string 
    }) => Promise<{ success: boolean; data?: unknown; error?: string }>;
    readFile?: (path: string, options?: { startLine?: number; endLine?: number }) => Promise<{ 
        success: boolean; 
        content?: string; 
        error?: string 
    }>;
    writeFile?: (path: string, content: string, options?: { createDirs?: boolean }) => Promise<{ 
        success: boolean; 
        error?: string 
    }>;
    ragSearch?: (query: string, filters?: Record<string, unknown>, options?: Record<string, unknown>) => Promise<{
        success: boolean;
        results?: Array<Record<string, unknown>>;
        files?: string[];
        error?: string;
    }>;
    executeCommand?: (command: string, options?: { cwd?: string; timeout?: number }) => Promise<{
        success: boolean;
        exitCode?: number;
        stdout?: string;
        stderr?: string;
        error?: string;
    }>;
    sendContinue: (sessionId: string, result: Record<string, unknown>) => Promise<unknown>;
    projectPath?: string;
    sessionId?: string;
}

/**
 * Handle action result interface
 */
export interface HandleActionResult {
    handled: boolean;
    actionType?: string;
    result?: Record<string, unknown>;
    nextResponse?: unknown;
    error?: string;
    // UI-related fields for form/message types
    uiNeeded?: boolean;
    formData?: {
        title?: string;
        description?: string;
        choices?: Array<{ id: string; label: string; value?: unknown; description?: string }>;
        input?: Array<{
            name: string;
            type: 'text' | 'textarea' | 'select' | 'checkbox' | 'number';
            label?: string;
            required?: boolean;
            default?: unknown;
            options?: Array<{ value: unknown; label: string }>;
        }>;
    };
    messageData?: {
        content: string;
        role?: 'system' | 'user' | 'assistant';
    };
}

/**
 * Sanitize session data for API Client
 */
export function sanitizeSessionForAPIClient(session) {
    if (!validateSessionData(session)) {
        throw new Error('Invalid session data');
    }
    
    return new Session({
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
    });
}
