/**
 * Session types for API Client
 */

export interface Session {
    id: string;
    projectId: string;
    title: string;
    task?: string;
    status?: SessionStatus;
    selectedAction?: string;
    context?: Record<string, unknown>;
    lastPromiseId?: string;
    createdAt: string;
    updatedAt: string;
    messages?: DialogMessage[];
}

export type SessionStatus = 
    | 'PENDING'
    | 'READY'
    | 'IN_PROGRESS'
    | 'COMPLETED'
    | 'FAILED'
    | 'CANCELLED';

export interface SessionMetadata {
    id: string;
    projectId: string;
    title: string;
    status: SessionStatus;
    createdAt: string;
    updatedAt: string;
    messageCount?: number;
    lastPromiseId?: string;
}

export interface DialogMessage {
    id?: string;
    role: DialogRole;
    content: string;
    timestamp?: string;
    metadata?: Record<string, unknown>;
}

export type DialogRole = 'user' | 'assistant' | 'system';

export interface SequenceEntry {
    step: number;
    action?: string;
    result?: unknown;
    timestamp: string;
}

export interface SessionIndex {
    sessions: SessionIndexEntry[];
    total: number;
    offset?: number;
    limit?: number;
}

export interface SessionIndexEntry {
    id: string;
    title: string;
    projectId: string;
    status: SessionStatus;
    createdAt: string;
    updatedAt: string;
    messageCount: number;
}

export interface SessionManagerConfig {
    serverUrl?: string;
    token?: string;
    autoSave?: boolean;
    maxRetries?: number;
}

export interface SessionFilter {
    projectId?: string;
    status?: SessionStatus;
    limit?: number;
    offset?: number;
}

export interface SessionUpdate {
    title?: string;
    task?: string;
    status?: SessionStatus;
    selectedAction?: string;
    context?: Record<string, unknown>;
}

export interface CreateSessionOptions {
    projectId: string;
    title?: string;
    task?: string;
}

export interface ProgressInfo {
    promiseId: string;
    status: string;
    progress?: number;
    message?: string;
    result?: unknown;
    error?: string;
}

export interface ProgressCallbacks {
    onProgress?: (progress: ProgressInfo) => void;
    onComplete?: (result: unknown) => void;
    onError?: (error: Error) => void;
}
