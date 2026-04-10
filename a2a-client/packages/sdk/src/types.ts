/**
 * Types for API Client
 * 
 * Re-exports shared session types from @a2a/types
 * Contains additional TypeScript interfaces specific to API Client
 * @see docs/new-request-flow/PROTOCOL.md
 */

// Re-export Session and shared types from @a2a/types
export {
    Session,
    SESSION_STATUS,
    LEGACY_SESSION_STATUS,
    SESSION_ACTIONS,
    MESSAGE_ROLES,
    EXCHANGE_LOG_TYPES,
    createSession,
    validateSessionData,
    sanitizeSessionForClient,
} from '@a2a-client/types';

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
    executeCommand?: (command: string, options?: { cwd?: string; timeout?: number; env?: Record<string, string> }) => Promise<{
        success: boolean;
        exitCode?: number;
        stdout?: string;
        stderr?: string;
        error?: string;
    }>;
    /** Workspace list-dir (execute key `list-directory`); map results to `entries` with at least `name`. */
    listDirectory?: (
        path: string,
        options?: { recursive?: boolean; pattern?: string }
    ) => Promise<{
        success: boolean;
        files?: Array<{
            name: string;
            path?: string;
            isFile?: boolean;
            isDirectory?: boolean;
        }>;
        error?: string;
    }>;
    /** Ripgrep-style search (execute key `grep-search`). */
    grepWorkspace?: (params: {
        pattern: string;
        path?: string;
        glob?: string;
    }) => Promise<{
        success: boolean;
        matches?: unknown[];
        error?: string;
    }>;
    fileExists?: (path: string) => Promise<{
        success: boolean;
        exists?: boolean;
        error?: string;
    }>;
    editPatch?: (params: {
        path: string;
        patch?: string;
        hunks?: unknown;
    }) => Promise<{
        success: boolean;
        error?: string;
    }>;
    /** Predefined script id (execute key `run-script`); distinct from DSL `script`. */
    runRegisteredScript?: (
        scriptId: string,
        params?: Record<string, unknown>
    ) => Promise<{
        success: boolean;
        output?: string;
        filesModified?: string[];
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
