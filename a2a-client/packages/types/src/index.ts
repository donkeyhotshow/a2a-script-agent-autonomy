/**
 * @a2a/types - Shared TypeScript types for A2A packages
 * Shared between @a2a/client, @a2a/server, and other packages.
 *
 * Protocol types for new-request-flow: https://github.com/org-carrier/a2a-script-agent/tree/main/docs/new-request-flow
 *
 * TODO(Task-05): protocol types from schema/protocol.json; session DTO (SessionSummary, SessionDetail with messages[]) – tasks/client/05-history-and-types-packages-integration.md
 */

// Re-export action types from action-types.ts
export {
  // Execute types
  FormAction,
  FormInput,
  FormChoice,
  ScriptAction,
  RagSearchAction,
  RagSearchFilters,
  RagSearchOptions,
  ReadFileAction,
  WriteFileAction,
  ExecuteCommandAction,
  MessageAction,
  ExecutePayload,
  ExecuteActionType,
  // Execute types with new naming convention
  ExecuteScript,
  ExecuteReadFile,
  ExecuteWriteFile,
  ExecuteRagSearch,
  ExecuteCommand,
  ExecuteForm,
  ExecuteMessage,
  // Result types
  ScriptResult,
  RagSearchResult,
  RagSearchResultPayload,
  ReadFileResult,
  WriteFileResult,
  FormResult,
  ActionResult,
  // Result types with new naming convention
  ScriptActionResult,
  ReadFileActionResult,
  WriteFileActionResult,
  RagSearchActionResult,
  CommandActionResult,
  FormActionResult,
} from './action-types.js';

// ============================================
// Context Block Types
// ============================================

/**
 * Session status for new protocol
 * @see docs/new-request-flow/PROTOCOL.md
 */
export type SessionStatus = 
  | 'pending'    // Ожидает выбора действия
  | 'ready'      // Действие выбрано
  | 'in_progress' // Выполняется
  | 'waiting_confirmation' // Ожидает подтверждения
  | 'completed'  // Завершено
  | 'error'      // Ошибка
  | 'cancelled'; // Отменено

/**
 * Execution context for tracking current action state
 * @see docs/new-request-flow/PROTOCOL.md#contextfields
 */
export interface ExecutionContext {
  action: string;    // ID действия
  step: string;      // ID текущего шага
  status?: 'completed';
  progress?: number;
}

/**
 * Extended context block with new protocol fields
 * @see docs/new-request-flow/PROTOCOL.md
 */
export interface ProtocolContextBlock {
  version: '2.0';
  session_id: string;
  execution?: ExecutionContext;
  history?: Array<{
    action: string;
    step: string;
    result?: ActionResult;
    timestamp: string;
  }>;
  docVirtual?: string;
  // Legacy fields (for backwards compatibility)
  new_task?: string[];
  architectural_features?: string[];
  continue?: boolean;
  tasks?: Task[];
  request_files?: string[];
  confirm?: boolean;
  errors?: ProtocolError[];
}

/**
 * Form choice for first server response
 * @see docs/new-request-flow/PROTOCOL.md#form-choices
 */
export interface FormWithChoices {
  title?: string;
  choices: Array<{
    id: string;
    label: string;
    description?: string;
  }>;
  input?: Array<{
    name: string;
    type: string;
    required?: boolean;
    label?: string;
  }>;
}

/**
 * Form with input fields (no choices)
 * @see docs/new-request-flow/PROTOCOL.md#form-input
 */
export interface FormWithInput {
  title?: string;
  input: Array<{
    name: string;
    type: string;
    required?: boolean;
    label?: string;
    options?: Array<{ value: unknown; label: string }>;
  }>;
}

/**
 * Server response types for new protocol
 * @see docs/new-request-flow/PROTOCOL.md#server-response
 */

/**
 * Form choices response - first server response with available choices
 * @see docs/new-request-flow/PROTOCOL.md#form-choices-response
 */
export interface FormChoicesResponse {
  context: ProtocolContextBlock;
  execute: {
    form: FormWithChoices;
  };
}

/**
 * Execute response - server requesting client to execute an action
 * @see docs/new-request-flow/PROTOCOL.md#execute-response
 */
export interface ExecuteResponse {
  context: ProtocolContextBlock;
  execute: ExecutePayload;
}

/**
 * Completed response - server signaling completion
 * @see docs/new-request-flow/PROTOCOL.md#completed-response
 */
export interface CompletedResponse {
  context: ProtocolContextBlock;
  execute: {
    finalResult?: ActionResult;
    completed: boolean;
  };
}

/**
 * Error response - server signaling an error
 * @see docs/new-request-flow/PROTOCOL.md#error-response
 */
export interface ErrorResponse {
  context: ProtocolContextBlock;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Union type for all server responses
 * @see docs/new-request-flow/PROTOCOL.md#server-response
 */
export type ServerResponse =
  | FormChoicesResponse
  | ExecuteResponse
  | CompletedResponse
  | ErrorResponse;

/**
 * Client request types for new protocol
 * @see docs/new-request-flow/PROTOCOL.md#client-request
 */

/**
 * Form choice request - client selecting a choice
 * @see docs/new-request-flow/PROTOCOL.md#form-choice-request
 */
export interface FormChoiceRequest {
  context: ProtocolContextBlock;
  result: {
    form: {
      choice: string;
      input?: Record<string, unknown>;
    };
  };
}

/**
 * Action result request - client sending action result
 * @see docs/new-request-flow/PROTOCOL.md#action-result-request
 */
export interface ActionResultRequest {
  context: ProtocolContextBlock;
  result: ActionResult;
}

/**
 * Client request union type
 * @see docs/new-request-flow/PROTOCOL.md#client-request
 */
export type ClientRequest =
  | FormChoiceRequest
  | ActionResultRequest;

export type TaskType = 'analyze' | 'refactor' | 'test' | 'document' | 'fix' | 'create' | 'delete';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface ProtocolError {
    code: string;
    message: string;
    file?: string;
    line?: number;
}

export interface Task {
    id: string;
    type: TaskType;
    status: TaskStatus;
    target?: string;
    progress?: number;
}

export interface ContextBlock {
    version: '1.0';
    session_id: string;
    new_task?: string[];
    architectural_features?: string[];
    continue?: boolean;
    tasks?: Task[];
    request_files?: string[];
    confirm?: boolean;
    errors?: ProtocolError[];
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
}

export interface CurrentStep {
    id: string;
    title: string;
    code?: string;
}

export interface NextStep {
    id: string;
    title: string;
}

export interface ActionData {
    id?: string;
    title?: string;
    matchScore?: number;
    currentStep?: CurrentStep;
    nextSteps?: NextStep[];
}

export interface ServerMessage {
    context: ContextBlock;
    files?: FileBlock[];
    message?: string;
    action?: ActionData;
}

// ============================================
// Search Types
// ============================================

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

export interface SearchQuery {
    query: string;
    filters?: SearchFilters;
    options?: SearchOptions;
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

export interface SearchMatch {
    file: string;
    score: number;
    matches: MatchDetail[];
    metadata: FileMetadata;
}

export interface SearchResult {
    results: SearchMatch[];
    total: number;
    query_time_ms: number;
    algorithm_used: string;
}

// ============================================
// RAG Types
// ============================================

export interface RAGConfig {
    projectPath: string;
    includePatterns?: string[];
    excludePatterns?: string[];
    useTFIDF?: boolean;
    useBM25?: boolean;
    useSemantic?: boolean;
    maxDepth?: number;
    maxFiles?: number;
    embeddingModel?: string;
    embeddingProvider?: string;
}

export interface Chunk {
    id: string;
    filePath: string;
    type: string;
    name: string;
    content: string;
    startLine: number;
    endLine?: number;
    visibility?: string;
    method?: string;
}

export interface IndexStats {
    filesIndexed: number;
    chunksIndexed: number;
    lastUpdated: number;
    indexedExtensions?: string[];
}

// ============================================
// API Response Types
// ============================================

export interface ApiError {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: ApiError;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    per_page: number;
}

// ============================================
// WebSocket Event Types
// ============================================

export type WsEventType = 'task:progress' | 'task:completed' | 'files:updated' | 'files:requested' | 'error';

export interface WsEvent<T = unknown> {
    type: WsEventType;
    payload: T;
    timestamp: Date;
}

// ============================================
// Architectural Feature Types
// ============================================

export type ArchitecturalFeatureCategory = 'directory_structure' | 'naming_convention' | 'custom_pattern' | 'framework';

export interface ArchitecturalFeature {
    name: string;
    category: ArchitecturalFeatureCategory;
    description?: string;
    path?: string;
    metadata?: Record<string, unknown>;
}

// ============================================
// Request API Result Types
// ============================================

export interface RequestContextBlock {
    tasks?: Task[];
    request_files?: string[];
    architectural_features?: ArchitecturalFeature[];
    graph?: Record<string, unknown>;
    frameworks?: Record<string, unknown>;
    new_task?: string[];
}

export interface RequestApiResult {
    outcome: 'completed' | 'graph_incomplete' | 'failed';
    message?: string;
    context?: RequestContextBlock;
    questions?: string[];
    missing?: string[];
    graph_stats?: Record<string, unknown>;
    activated_neuron_ids?: string[];
    injected_content?: string[];
    error?: Record<string, unknown>;
}

// ============================================
// Factory option types
// ============================================

export interface CreateContextBlockOptions {
    sessionId: string;
    newTask?: string[];
    architecturalFeatures?: string[];
    continue?: boolean;
    tasks?: Task[];
    requestFiles?: string[];
    confirm?: boolean;
    errors?: ProtocolError[];
}

export interface CreateTaskOptions {
    id?: string;
    type?: TaskType;
    status?: TaskStatus;
    target?: string;
    progress?: number;
}

export interface CreateFileBlockOptions {
    path: string;
    content: string;
    startLine?: number;
    endLine?: number;
}

export interface CreateSearchQueryOptions {
    query: string;
    filters?: SearchFilters;
    options?: SearchOptions;
}

// ============================================
// Factory functions
// ============================================

export function createContextBlock(options: CreateContextBlockOptions): ContextBlock {
    return {
        version: '1.0',
        session_id: options.sessionId,
        new_task: options.newTask,
        architectural_features: options.architecturalFeatures,
        continue: options.continue,
        tasks: options.tasks,
        request_files: options.requestFiles,
        confirm: options.confirm,
        errors: options.errors,
    };
}

export function createTask(options: CreateTaskOptions): Task {
    return {
        id: options.id ?? `task_${Date.now()}`,
        type: options.type ?? 'analyze',
        status: options.status ?? 'pending',
        target: options.target,
        progress: options.progress ?? 0,
    };
}

export function createFileBlock(options: CreateFileBlockOptions): FileBlock {
    return {
        path: options.path,
        content: options.content,
        startLine: options.startLine,
        endLine: options.endLine,
    };
}

export function createSearchQuery(options: CreateSearchQueryOptions): SearchQuery {
    return {
        query: options.query,
        filters: options.filters,
        options: options.options,
    };
}
