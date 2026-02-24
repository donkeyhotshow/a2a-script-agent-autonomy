/**
 * @a2a/types - Shared TypeScript types for A2A packages
 * 
 * Provides common types for protocol, search, RAG, and file operations.
 * These types are shared between @a2a/client, @a2a/server, and other packages.
 * 
 * @module @a2a/types
 * @version 1.0.0
 */

// ============================================
// Context Block Types
// ============================================

/**
 * Context block for A2A protocol communication
 * Contains all data needed by client/server for next iteration
 * @typedef {Object} ContextBlock
 * @property {'1.0'} version - Protocol version
 * @property {string} session_id - Session identifier
 * @property {string[]} [new_task] - Task items for new task
 * @property {string[]} [architectural_features] - Non-standard file layout
 * @property {boolean} [continue] - Continue session flag
 * @property {Task[]} [tasks] - Tasks to be performed
 * @property {string[]} [request_files] - Files requested from client
 * @property {boolean} [confirm] - Confirmation flag
 * @property {ProtocolError[]} [errors] - Protocol errors
 */

/**
 * Task definition
 * @typedef {Object} Task
 * @property {string} id - Task identifier
 * @property {TaskType} type - Task type
 * @property {TaskStatus} status - Task status
 * @property {string} [target] - Target file or path
 * @property {number} [progress] - Progress percentage (0-100)
 */

/**
 * Task type enumeration
 * @typedef {'analyze'|'refactor'|'test'|'document'|'fix'|'create'|'delete'} TaskType
 */

/**
 * Task status enumeration
 * @typedef {'pending'|'in_progress'|'completed'|'failed'|'cancelled'} TaskStatus
 */

/**
 * Protocol error
 * @typedef {Object} ProtocolError
 * @property {string} code - Error code
 * @property {string} message - Error message
 * @property {string} [file] - File path if applicable
 * @property {number} [line] - Line number if applicable
 */

// ============================================
// File Block Types
// ============================================

/**
 * File block with content
 * @typedef {Object} FileBlock
 * @property {string} path - File path
 * @property {string} content - File content
 * @property {number} [startLine] - Start line number
 * @property {number} [endLine] - End line number
 */

/**
 * File block request (without content)
 * @typedef {Object} FileBlockRequest
 * @property {string} path - File path
 * @property {number} [startLine] - Start line number
 * @property {number} [endLine] - End line number
 */

// ============================================
// Message Types
// ============================================

/**
 * Client message structure
 * @typedef {Object} ClientMessage
 * @property {ContextBlock} context - Context block
 * @property {FileBlock[]} [files] - Attached files
 */

/**
 * Server message structure
 * @typedef {Object} ServerMessage
 * @property {ContextBlock} context - Context block
 * @property {FileBlock[]} [files] - Response files
 * @property {string} [message] - Text message
 * @property {ActionData} [action] - Action data for iterative execution
 */

/**
 * Action data for iterative execution
 * @typedef {Object} ActionData
 * @property {string} [id] - Action identifier
 * @property {string} [title] - Action title
 * @property {number} [matchScore] - Match score
 * @property {CurrentStep} [currentStep] - Current step
 * @property {NextStep[]} [nextSteps] - Next available steps
 */

/**
 * Current step in action
 * @typedef {Object} CurrentStep
 * @property {string} id - Step identifier
 * @property {string} title - Step title
 * @property {string} [code] - Step code
 */

/**
 * Next available step
 * @typedef {Object} NextStep
 * @property {string} id - Step identifier
 * @property {string} title - Step title
 */

// ============================================
// Search Types
// ============================================

/**
 * Search query
 * @typedef {Object} SearchQuery
 * @property {string} query - Search query string
 * @property {SearchFilters} [filters] - Search filters
 * @property {SearchOptions} [options] - Search options
 */

/**
 * Search filters
 * @typedef {Object} SearchFilters
 * @property {string[]} [file_types] - File type filters (e.g., ['php', 'vue'])
 * @property {string[]} [directories] - Directory filters
 * @property {string} [framework] - Framework filter
 * @property {string[]} [exclude] - Paths to exclude
 */

/**
 * Search options
 * @typedef {Object} SearchOptions
 * @property {number} [limit] - Maximum results
 * @property {number} [min_score] - Minimum score threshold
 * @property {boolean} [include_context] - Include surrounding context
 * @property {boolean} [highlight_matches] - Highlight matches in results
 */

/**
 * Search result
 * @typedef {Object} SearchResult
 * @property {SearchMatch[]} results - Search matches
 * @property {number} total - Total matches
 * @property {number} query_time_ms - Query time in milliseconds
 * @property {string} algorithm_used - Algorithm used
 */

/**
 * Single search match
 * @typedef {Object} SearchMatch
 * @property {string} file - File path
 * @property {number} score - Match score
 * @property {MatchDetail[]} matches - Match details
 * @property {FileMetadata} metadata - File metadata
 */

/**
 * Match detail
 * @typedef {Object} MatchDetail
 * @property {number} line_start - Start line
 * @property {number} line_end - End line
 * @property {string} content - Matched content
 * @property {string} highlight - Highlighted content
 * @property {number} context_score - Context score
 */

/**
 * File metadata
 * @typedef {Object} FileMetadata
 * @property {string} framework - Framework name
 * @property {string} type - File type
 * @property {string} last_modified - Last modified timestamp
 */

// ============================================
// RAG Types
// ============================================

/**
 * RAG configuration
 * @typedef {Object} RAGConfig
 * @property {string} projectPath - Path to project directory
 * @property {string[]} [includePatterns] - File patterns to include
 * @property {string[]} [excludePatterns] - File patterns to exclude
 * @property {boolean} [useTFIDF] - Enable TF-IDF search
 * @property {boolean} [useBM25] - Enable BM25 search
 * @property {boolean} [useSemantic] - Enable semantic search
 * @property {number} [maxDepth] - Maximum directory depth
 * @property {number} [maxFiles] - Maximum files to index
 * @property {string} [embeddingModel] - Embedding model name
 * @property {string} [embeddingProvider] - Embedding provider (ollama, openai)
 */

/**
 * Code chunk
 * @typedef {Object} Chunk
 * @property {string} id - Chunk identifier
 * @property {string} filePath - File path
 * @property {string} type - Chunk type (class, function, method, etc.)
 * @property {string} name - Chunk name
 * @property {string} content - Chunk content
 * @property {number} startLine - Start line number
 * @property {number} [endLine] - End line number
 * @property {string} [visibility] - Visibility (public, private, protected)
 * @property {string} [method] - HTTP method for routes
 */

/**
 * Index statistics
 * @typedef {Object} IndexStats
 * @property {number} filesIndexed - Number of files indexed
 * @property {number} chunksIndexed - Number of chunks indexed
 * @property {number} lastUpdated - Last update timestamp
 * @property {string[]} [indexedExtensions] - Indexed file extensions
 */

// ============================================
// API Response Types
// ============================================

/**
 * Generic API response
 * @typedef {Object} ApiResponse
 * @property {boolean} success - Success flag
 * @property {T} [data] - Response data
 * @property {ApiError} [error] - Error information
 */

/**
 * API error
 * @typedef {Object} ApiError
 * @property {string} code - Error code
 * @property {string} message - Error message
 * @property {Object} [details] - Additional error details
 */

/**
 * Paginated response
 * @typedef {Object} PaginatedResponse
 * @property {T[]} items - Items array
 * @property {number} total - Total items
 * @property {number} page - Current page
 * @property {number} per_page - Items per page
 */

// ============================================
// WebSocket Event Types
// ============================================

/**
 * WebSocket event
 * @typedef {Object} WsEvent
 * @property {WsEventType} type - Event type
 * @property {T} payload - Event payload
 * @property {Date} timestamp - Event timestamp
 */

/**
 * WebSocket event type
 * @typedef {'task:progress'|'task:completed'|'files:updated'|'files:requested'|'error'} WsEventType
 */

// ============================================
// Architectural Feature Types
// ============================================

/**
 * Architectural feature
 * @typedef {Object} ArchitecturalFeature
 * @property {string} name - Feature name
 * @property {'directory_structure'|'naming_convention'|'custom_pattern'|'framework'} category - Feature category
 * @property {string} [description] - Feature description
 * @property {string} [path] - Feature path
 * @property {Object} [metadata] - Additional metadata
 */

// ============================================
// Request API Result Types
// ============================================

/**
 * Request context block
 * @typedef {Object} RequestContextBlock
 * @property {Task[]} [tasks] - Tasks to perform
 * @property {string[]} [request_files] - Files to request
 * @property {ArchitecturalFeature[]} [architectural_features] - Architectural features
 * @property {Object} [graph] - Graph state
 * @property {Object} [frameworks] - Detected frameworks
 * @property {string[]} [new_task] - Original task
 */

/**
 * Request API result
 * @typedef {Object} RequestApiResult
 * @property {'completed'|'graph_incomplete'|'failed'} outcome - Request outcome
 * @property {string} [message] - Result message
 * @property {RequestContextBlock} [context] - Context block
 * @property {string[]} [questions] - Questions for client
 * @property {string[]} [missing] - Missing elements
 * @property {Object} [graph_stats] - Graph statistics
 * @property {string[]} [activated_neuron_ids] - Activated neuron IDs
 * @property {string[]} [injected_content] - Injected content
 * @property {Object} [error] - Error details
 */

// ============================================
// Export factory functions
// ============================================

/**
 * Create a ContextBlock
 * @param {Object} options - Context options
 * @returns {ContextBlock}
 */
function createContextBlock(options) {
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

/**
 * Create a Task
 * @param {Object} options - Task options
 * @returns {Task}
 */
function createTask(options) {
  return {
    id: options.id || `task_${Date.now()}`,
    type: options.type || 'analyze',
    status: options.status || 'pending',
    target: options.target,
    progress: options.progress || 0,
  };
}

/**
 * Create a FileBlock
 * @param {Object} options - File options
 * @returns {FileBlock}
 */
function createFileBlock(options) {
  return {
    path: options.path,
    content: options.content,
    startLine: options.startLine,
    endLine: options.endLine,
  };
}

/**
 * Create a SearchQuery
 * @param {Object} options - Search options
 * @returns {SearchQuery}
 */
function createSearchQuery(options) {
  return {
    query: options.query,
    filters: options.filters,
    options: options.options,
  };
}

// Export types and factory functions
module.exports = {
  // Context Block
  createContextBlock,
  
  // Task
  createTask,
  
  // File
  createFileBlock,
  
  // Search
  createSearchQuery,
  
  // Re-export for convenience
  types: {
    ContextBlock: 'ContextBlock',
    Task: 'Task',
    FileBlock: 'FileBlock',
    SearchQuery: 'SearchQuery',
    SearchResult: 'SearchResult',
    Chunk: 'Chunk',
    RAGConfig: 'RAGConfig',
  },
};

/**
 * @typedef {import('./index.js').ContextBlock} ContextBlock
 * @typedef {import('./index.js').Task} Task
 * @typedef {import('./index.js').FileBlock} FileBlock
 * @typedef {import('./index.js').SearchQuery} SearchQuery
 * @typedef {import('./index.js').SearchResult} SearchResult
 * @typedef {import('./index.js').Chunk} Chunk
 * @typedef {import('./index.js').RAGConfig} RAGConfig
 */
