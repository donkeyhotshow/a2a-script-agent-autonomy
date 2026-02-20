// Protocol types based on a2a-codebase-agen-v1.md

// ============================================
// Context Block Types
// ============================================

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
}

export interface ServerMessage {
  context: ContextBlock;
  files?: FileBlock[];
  message?: string;
}

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
// WebSocket Event Types (for future use)
// ============================================

export interface WsEvent<T = unknown> {
  type: WsEventType;
  payload: T;
  timestamp: Date;
}

export type WsEventType = 
  | 'task:progress'
  | 'task:completed'
  | 'files:updated'
  | 'files:requested'
  | 'error';

export interface TaskProgressPayload {
  task_id: string;
  progress: number;
  status: TaskStatus;
}

export interface TaskCompletedPayload {
  task_id: string;
  result: unknown;
}

export interface FilesUpdatedPayload {
  files: FileBlock[];
}

export interface FilesRequestedPayload {
  paths: string[];
}

export interface ErrorPayload {
  code: string;
  message: string;
}
