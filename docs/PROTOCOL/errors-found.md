# Protocol Errors Found

This document tracks identified inconsistencies, redundancies, and syntax errors in the A2A protocol implementation across client, server, and proxy components.

## Redundancy Issues

### Duplicate Field Definitions
- **Location**: Multiple type files (`index.ts`, `unified.ts`, `protocol.generated.ts`)
- **Issue**: Similar fields defined across different interfaces (e.g., `action` field in ContextBlock vs ExecutionContext)
- **Affected Fields**: `action`, `status`, `result` fields
- **Impact**: Maintenance overhead, potential for inconsistencies
- **Resolution**: Consolidate common fields into shared base interfaces

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