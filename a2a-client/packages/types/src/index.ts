/**
 * @a2a/types - Shared TypeScript types for A2A packages
 * Shared between @a2a/client, @a2a/server, and other packages.
 *
 * TODO(Task-05): protocol types from schema/protocol.json; session DTO (SessionSummary, SessionDetail with messages[]) – tasks/client/05-history-and-types-packages-integration.md
 */

// ============================================
// Context Block Types
// ============================================

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
