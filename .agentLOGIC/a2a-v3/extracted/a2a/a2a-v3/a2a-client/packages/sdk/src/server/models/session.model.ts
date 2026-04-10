/**
 * Session Model Types
 * 
 * Contains core types for Session, Project, ClientConfig, and related entities.
 * Extracted from temp.ts for modular organization.
 */

// ============================================================================
// Session Types
// ============================================================================

/**
 * Execution state for a session
 * Represents the current state of action execution within a session
 */
export interface SessionExecution {
    /** Current action being executed */
    action?: string;
    /** Current step within the action */
    step?: string;
    /** Progress percentage (0-100) */
    progress?: number;
    /** Execution status */
    status?: string;
}

/**
 * Main Session type representing an active workflow session
 */
export type Session = {
    /** Unique session identifier */
    id: string;
    /** Associated project ID */
    projectId: string;
    /** Session title */
    title: string;
    /** Current task description */
    task?: string;
    /** Session status (active, completed, etc.) */
    status?: string;
    /** Currently selected action */
    selectedAction?: string;
    /** Session context data */
    context?: Record<string, unknown>;
    /** Last promise ID for async operations */
    lastPromiseId?: string;
    /** Creation timestamp */
    createdAt: string;
    /** Last update timestamp */
    updatedAt: string;
    /** Session messages/history */
    messages?: unknown[];
    /** Protocol version */
    version?: string;
    /** Current execution state */
    execution?: SessionExecution;
};

// ============================================================================
// Project Types
// ============================================================================

/**
 * Project type representing a collection of sessions
 */
export type Project = {
    /** Unique project identifier */
    id: string;
    /** Project name */
    name: string;
    /** Project file system path */
    path?: string;
    /** Project description */
    description?: string;
};

// ============================================================================
// Client Configuration Types
// ============================================================================

/**
 * Client configuration for connecting to the server
 */
export type ClientConfig = {
    /** Server URL endpoint */
    serverUrl: string;
    /** Authentication token */
    token?: string | null;
};

// ============================================================================
// RAG / File Types
// ============================================================================

/**
 * File metadata for RAG (Retrieval-Augmented Generation) operations
 */
export interface FileMetadata {
    /** Unique file identifier */
    id: string;
    /** Stored filename */
    filename: string;
    /** Original uploaded filename */
    originalName: string;
    /** File size in bytes */
    size: number;
    /** Upload timestamp */
    uploadedAt: string;
    /** Whether file has been indexed for search */
    indexed: boolean;
    /** File system path */
    path: string;
    /** File extension */
    extension: string;
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Session creation payload
 */
export type CreateSessionPayload = {
    projectId: string;
    title: string;
    task?: string;
    context?: Record<string, unknown>;
};

/**
 * Session update payload
 */
export type UpdateSessionPayload = {
    title?: string;
    task?: string;
    status?: string;
    selectedAction?: string;
    context?: Record<string, unknown>;
    lastPromiseId?: string;
    execution?: SessionExecution;
};

/**
 * Project creation payload
 */
export type CreateProjectPayload = {
    name: string;
    path?: string;
    description?: string;
};

/**
 * Project update payload
 */
export type UpdateProjectPayload = {
    name?: string;
    path?: string;
    description?: string;
};

// ============================================================================
// Status Constants
// ============================================================================

/** Common session statuses */
export const SessionStatus = {
    ACTIVE: 'active',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
    PENDING: 'pending',
} as const;

export type SessionStatusValue = typeof SessionStatus[keyof typeof SessionStatus];
