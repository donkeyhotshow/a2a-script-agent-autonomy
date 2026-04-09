# A2A Protocol Documentation Index

This index provides quick access to all protocol documentation files. Each document describes specific fields, types, and their usage in the A2A protocol system.

## Core Protocol Types

### Context Block
- **[context-block.md](context-block.md)** - ContextBlock interface with all fields and their purposes
- **[request-context-block.md](request-context-block.md)** - RequestContextBlock for API responses
- **[request-api-result.md](request-api-result.md)** - Full Request API result structure

### Messages
- **[message-types.md](message-types.md)** - ClientMessage and ServerMessage structures
- **[execute-commands.md](execute-commands.md)** - Execute command types and formats
- **[execute.md](execute.md)** - Execute command specifications (duplicate - consider consolidation)

### Data Structures
- **[file-block.md](file-block.md)** - FileBlock and FileBlockRequest interfaces
- **[task.md](task.md)** - Task interface for work tracking
- **[protocol-error.md](protocol-error.md)** - ProtocolError structure

## Advanced Types

### Search & Query
- **[search-types.md](search-types.md)** - SearchQuery, SearchFilters, SearchOptions, and result types

### API Responses
- **[api-response-types.md](api-response-types.md)** - ApiResponse, ApiError, PaginatedResponse
- **[unified-response-types.md](unified-response-types.md)** - Unified response types for consistent API

### Architecture
- **[architectural-feature.md](architectural-feature.md)** - ArchitecturalFeature for project analysis

## Error Tracking
- **[errors-found.md](errors-found.md)** - Documented protocol inconsistencies and issues

## Field Usage by Service

### Client Services
Fields that client components read/write:
- `session_id` (client-only, confidential)
- `action`, `new_task`, `request_files` (client input)
- `result` (client responses to server commands)

### Server Services
Fields that server components generate:
- `tasks`, `architectural_features` (analysis results)
- `execute` (commands for client execution)
- `message` (human-readable responses)
- `graph`, `frameworks` (contextual data)

### Request Processor
Fields managed by request processing:
- `outcome`, `questions`, `missing` (flow control)
- `context` (state management)
- `graph_stats`, `activated_neuron_ids` (monitoring)

### Validation Services
Fields checked by validators:
- All message structure compliance
- Field type constraints
- Security boundaries (`session_id` stripping)

## Quick Reference

### Field Categories
- **Confidential**: `session_id` - never transmit
- **Contextual**: `graph`, `frameworks`, `architectural_features` - project state
- **Operational**: `tasks`, `execute`, `result` - work execution
- **Control**: `action`, `new_task`, `outcome` - flow management
- **Metadata**: `errors`, `progress`, `execution` - status tracking

### Common Patterns
- **Action-Key Shape**: Execute/result commands use `{ "action-type": params }` format
- **Context Continuity**: ContextBlock flows bidirectionally with state preservation
- **Error Handling**: Structured errors with codes, messages, and optional details
- **Pagination**: Consistent page/per_page/total pattern for list responses

### Validation Rules
- Server must strip `session_id` before transmission
- Execute commands must use action-key shape, not plain messages
- Optional fields should be omitted when undefined/null
- Timestamps use ISO format
- Progress values are 0-100 percentages

---

*For implementation guidance, see the specific field documentation linked above.*