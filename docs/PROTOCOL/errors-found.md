# Protocol Errors Found

This document tracks identified inconsistencies, redundancies, and syntax errors in the A2A protocol implementation across client, server, and proxy components.

## Syntax Errors

### Field Type Mismatches
- **Location**: `ai-integration/tests/test_llm_cache.py`
- **Issue**: `build_llm_cache_payload` function parameters expect `str` but receive `str | dict[Any, Any]`
- **Affected Fields**: `path`, `method`, `target_url`, `forward_args`, `raw_body`
- **Impact**: Type safety violations in LLM cache payload construction
- **Resolution**: Update function signature to handle union types or add type guards

### Execute Message Only Violations
- **Location**: Session server-response.json files
- **Issue**: Execute commands contain only message strings instead of expected form or tool action keys
- **Affected Files**:
  - `a2a-client/storage/sessions/sess_1775608866619/3/server-response.json`
  - `a2a-client/storage/sessions/sess_1775608866619/4/server-response.json`
  - `a2a-client/storage/sessions/sess_1775647490825/4/server-response.json`
  - `a2a-client/storage/sessions/sess_1775647490825/5/server-response.json`
- **Expected**: Execute should use action-key shape: `{ "read-file": {...} }` or `{ form: {...} }`
- **Actual**: Execute contains only string messages
- **Impact**: Protocol violation - clients expect structured execute commands, not plain messages
- **Resolution**: Update server responses to use proper execute command format or move messages to ServerMessage.message field

### Missing Module Imports
- **Location**: `scripts/audit-session-storage-to-tasks.mjs`
- **Issue**: Import statement references non-existent module
- **Missing Module**: `a2a-server/src/fs-utils/recursive-directory-walker.js`
- **Impact**: Audit script cannot run, preventing session storage validation
- **Resolution**: Either create the missing module or update import to use existing utility

## Order Inconsistencies

### Message Field Ordering
- **Location**: Protocol message processing across client/server
- **Issue**: No enforced ordering for optional fields in ContextBlock and message structures
- **Affected Components**: ClientMessage, ServerMessage serialization/deserialization
- **Impact**: Potential parsing errors if components expect specific field order
- **Resolution**: Define canonical field ordering in protocol specification

## Redundancy Issues

### Duplicate Field Definitions
- **Location**: Multiple type files (`index.ts`, `unified.ts`, `protocol.generated.ts`)
- **Issue**: Similar fields defined across different interfaces (e.g., `action` field in ContextBlock vs ExecutionContext)
- **Affected Fields**: `action`, `status`, `result` fields
- **Impact**: Maintenance overhead, potential for inconsistencies
- **Resolution**: Consolidate common fields into shared base interfaces

### Overlapping Command Types
- **Location**: ExecuteCommand and ResultCommand unions
- **Issue**: Some command types appear in both execute and result shapes with similar structures
- **Affected Types**: `form`, `script`, `message` commands
- **Impact**: Code duplication, unclear separation of concerns
- **Resolution**: Review and clarify execute vs result command purposes

## Missing Field Documentation

### Undocumented Fields
- **Location**: RequestContextBlock, RequestApiResult interfaces
- **Issue**: Fields like `graph`, `frameworks`, `graph_stats`, `activated_neuron_ids`, `injected_content` lack detailed specifications
- **Affected Components**: Request API responses
- **Impact**: Implementation uncertainty, integration issues
- **Resolution**: Add comprehensive field documentation with usage examples

### Incomplete Type Coverage
- **Location**: Search types, API response types
- **Issue**: SearchFilters, SearchOptions, ApiResponse, PaginatedResponse lack field-level documentation
- **Affected Components**: Search functionality, API error handling
- **Impact**: Developer confusion, inconsistent implementations
- **Resolution**: Extend protocol documentation to cover all type definitions

## Client-Server-Proxy Inconsistencies

### Field Presence Variations
- **Client Component**: May include `session_id` (confidential)
- **Server Component**: Must strip `session_id` before transmission
- **Proxy Component**: Should not forward `session_id`
- **Issue**: Potential for session ID leakage if stripping logic fails
- **Resolution**: Add validation layers and audit logging

### Execution Context Handling
- **Client Component**: Processes `execution` field for action tracking
- **Server Component**: Sets `execution` field for state management
- **Proxy Component**: May need to preserve or modify execution state
- **Issue**: Execution state synchronization across components
- **Resolution**: Define clear execution state ownership and transfer rules

### Message vs Execute Field Confusion
- **Server Component**: Using ServerMessage.message for executable content
- **Client Component**: Expects ServerMessage.execute for commands
- **Issue**: Mixing human-readable messages with executable commands
- **Impact**: Client may not execute intended server commands
- **Resolution**: Reserve ServerMessage.message for user display, ServerMessage.execute for client actions

## Test Coverage Gaps

### Missing Validators
- **Location**: Protocol message validation
- **Issue**: No comprehensive validation for ContextBlock field constraints
- **Affected Components**: All message processing
- **Impact**: Invalid data may pass through system undetected
- **Resolution**: Implement and test protocol validators for all message types

### Simulation Directory Issues
- **Location**: `tests/direct-tests/validators/audit-sim-choice-descriptions.mjs`
- **Issue**: Script expects `simulations/` directory that doesn't exist
- **Expected Path**: `C:\workspace\org-carrier\a2a-script-agent\simulations`
- **Actual Paths**: `tests/simulations/`, `a2a-server/tests/fixtures/simulations/`
- **Impact**: Validation scripts fail to run
- **Resolution**: Update script paths or create expected directory structure

## Future Investigation Required

### Performance Implications
- Investigate impact of optional field presence on serialization/deserialization performance
- Analyze memory usage patterns for large file blocks and search results

### Security Boundaries
- Audit all field transmission paths for sensitive data leakage
- Review field validation for injection attack vectors

---

*This document should be updated as new errors are discovered through simulations and testing.*