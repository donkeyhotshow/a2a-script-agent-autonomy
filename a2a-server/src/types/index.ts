// Реализация на основе плана: plans/types-improvements.md

// Protocol types based on a2a-codebase-agen-v1.md

import type {ProtocolVersion} from '../protocol/versioning/protocol-versions.js';

// Re-export Unified JSON types
export * from './unified.js';

// ============================================
// Context Block Types
// ============================================

export interface ContextBlock {
    version: ProtocolVersion;
    session_id: string;
    new_task?: string[];
    architectural_features?: string[];
    continue?: boolean;
    tasks?: Task[];
    request_files?: string[];
    confirm?: boolean;
    errors?: ProtocolError[];
    /** Task from client (for action processing) */
    task?: string;
    /** Execution state for actions (new protocol format) */
    execution?: {
        /** Action ID (e.g., 'fix-vue-imports', 'coder') */
        action: string;
        /** Current step ID (e.g., 'vue-import-detect', 'llm-request') */
        step: string;
        /** Optional status for completion */
        status?: 'completed';
        /** History of executed steps */
        history?: Array<{ step: string; result?: unknown }>;
    };
}

export interface Task {
    id: string;
    type: TaskType;
    status: TaskStatus;
    target?: string;
    progress?: number;
}

export type TaskType = 'analyze' | 'refactor' | 'test' | 'document' | 'fix' | 'create' | 'delete';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface ProtocolError {
    code: string;
    message: string;
    file?: string;
    line?: number;
}

// ============================================
// File Block Types
// ============================================

export interface FileBlock {
    path: string;
    content: string;
    startLine?: number;
    endLine?: number;
}

export interface FileBlockRequest {
    path: string;
    startLine?: number;
    endLine?: number;
}

// ============================================
// Message Types
// ============================================

export interface ClientMessage {
    context: ContextBlock;
    files?: FileBlock[];
    /** Result from client (new protocol format - action-key shape) */
    result?: ResultCommand;
}

export interface ServerMessage {
    context: ContextBlock;
    files?: FileBlock[];
    message?: string;
    /** Execute commands for client (new protocol format - action-key shape) */
    execute?: ExecuteCommand;
    /**
     * Legacy: Action data for iterative execution
     * @deprecated Use `execute.form` for first response instead
     * @see docs/new-request-flow/PROTOCOL.md
     */
    action?: {
        id?: string;
        title?: string;
        matchScore?: number;
        currentStep?: {
            id: string;
            title: string;
            code?: string;
        } | null;
        nextSteps?: Array<{
            id: string;
            title: string;
        }>;
    };
    /**
     * Legacy: Executing action for action_executing response (top-level)
     * @deprecated Use `execute` with action-type keys instead (e.g., `execute: { script: {...} }`)
     * @see docs/new-request-flow/PROTOCOL.md#action-key-shape-обязательно
     */
    executingAction?: {
        actionId: string;
        title: string;
        description?: string;
        priority?: number;
        dsl?: Record<string, unknown>;
        /** @deprecated Use `execute` with action-type keys */
        dslScript?: string;
    };
    /**
     * Legacy: Next steps for action_executing response
     * @deprecated Use `execute.form.choices` to let user select next action
     * @see docs/new-request-flow/PROTOCOL.md
     */
    nextSteps?: Array<{
        actionId: string;
        title: string;
    }>;
    /** Final result when action is completed */
    finalResult?: {
        action: string;
        summary: Record<string, unknown>;
    };
}

// ============================================
// Execute/Result Command Types (New Protocol)
// ============================================

/**
 * Execute command from server to client
 * Uses action-key shape: { execute: { "action-type": { ...params } } }
 */
export type ExecuteCommand =
    | { form: ExecuteForm }
    | { script: ExecuteScript }
    | { message: string }
    | { 'read-file': ExecuteReadFile }
    | { 'write-file': ExecuteWriteFile }
    | { 'rag-search': ExecuteRagSearch }
    | { 'execute-command': ExecuteCommandParams }
    | { 'list-directory': ExecuteListDirectory }
    | { 'grep-search': ExecuteGrepSearch };

/**
 * Form execute command - interactive form with choices/input
 */
export interface ExecuteForm {
    title?: string;
    description?: string;
    choices?: Array<{ id: string; label: string }>;
    input?: Array<{
        id: string;
        label: string;
        type: 'text' | 'textarea' | 'number' | 'select' | 'checkbox' | 'radio';
        required?: boolean;
        placeholder?: string;
        options?: Array<{ label: string; value: string }>;
    }>;
}

/**
 * Script execute command - execute DSL code on client
 */
export interface ExecuteScript {
    input: Record<string, unknown>;
    output: string;
    code: string;
}

/**
 * Read-file execute command
 */
export interface ExecuteReadFile {
    path: string;
    startLine?: number;
    endLine?: number;
}

/**
 * Write-file execute command
 */
export interface ExecuteWriteFile {
    path: string;
    content: string;
}

/**
 * RAG search execute command
 */
export interface ExecuteRagSearch {
    query: string;
    limit?: number;
}

/**
 * Execute-command execute command
 */
export interface ExecuteCommandParams {
    command: string;
    cwd?: string;
    timeout?: number;
}

/**
 * List-directory execute command - list contents of a directory
 */
export interface ExecuteListDirectory {
    path: string;
}

/**
 * Grep-search execute command - search for pattern in files
 */
export interface ExecuteGrepSearch {
    pattern: string;
    path?: string;
    glob?: string;
}

/**
 * Result command from client to server
 * Uses action-key shape: { result: { "action-type": { ...result } } }
 */
export type ResultCommand =
    | { script: Record<string, unknown> }
    | { 'read-file': { path: string; content: string } }
    | { 'write-file': { path: string; success: boolean } }
    | { 'rag-search': { results: unknown[]; files: string[] } }
    | { 'execute-command': { command: string; exitCode: number; stdout: string; stderr: string } }
    | { 'list-directory': { path: string; entries: Array<{ name: string; isDirectory: boolean }> } }
    | { 'grep-search': { matches: Array<{ file: string; line: number; content: string }> } }
    | { form: { choice?: string; values?: Record<string, unknown> } }
    | { message: string };

// ============================================
// Search Types
// ============================================

export interface SearchQuery {
    query: string;
    filters?: SearchFilters;
    options?: SearchOptions;
}

export interface SearchFilters {
    file_types?: string[];
    directories?: string[];
    framework?: string;
    exclude?: string[];
}

export interface SearchOptions {
    limit?: number;
    min_score?: number;
    include_context?: boolean;
    highlight_matches?: boolean;
}

export interface SearchResult {
    results: SearchMatch[];
    total: number;
    query_time_ms: number;
    algorithm_used: string;
}

export interface SearchMatch {
    file: string;
    score: number;
    matches: MatchDetail[];
    metadata: FileMetadata;
}

export interface MatchDetail {
    line_start: number;
    line_end: number;
    content: string;
    highlight: string;
    context_score: number;
}

export interface FileMetadata {
    framework: string;
    type: string;
    last_modified: string;
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: ApiError;
}

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    per_page: number;
}

// ============================================
// Architectural Feature Types
// ============================================

export interface ArchitecturalFeature {
    name: string;
    category: 'directory_structure' | 'naming_convention' | 'custom_pattern' | 'framework';
    description?: string;
    path?: string;
    metadata?: Record<string, unknown>;
}

// ============================================
// Request API Response Types
// ============================================

/**
 * Context block returned in Request API response
 * Contains all data needed by client for next iteration
 */
export interface RequestContextBlock {
    /** Tasks to be performed (derived from new_task and neuron activation) */
    tasks?: Task[];
    /** Files that client should provide in next request */
    request_files?: string[];
    /** Architectural features detected in project */
    architectural_features?: string[];
    /** Current graph state */
    graph?: {
        entities: unknown[];
        relations: unknown[];
    };
    /** Frameworks detected in project (flexible structure) */
    frameworks?: Record<string, unknown>;
    /** Original task from client */
    new_task?: string[];
}

/**
 * Full result structure for Request API
 */
export interface RequestApiResult {
    outcome: 'completed' | 'graph_incomplete' | 'failed';
    message?: string;
    context?: RequestContextBlock;
    /** Questions for client (when graph_incomplete) */
    questions?: string[];
    /** Missing elements identified */
    missing?: string[];
    /** Graph statistics */
    graph_stats?: {
        entityCount: number;
        relationCount: number;
        entityTypes: Record<string, number>;
    };
    /** Activated neuron IDs */
    activated_neuron_ids?: string[];
    /** Content injected by neurons */
    injected_content?: string[];
    /** Error details (when failed) */
    error?: {
        code: string;
        message: string;
    };
}
