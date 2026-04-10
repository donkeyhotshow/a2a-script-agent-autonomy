# Context Block

The Context Block is a core data structure used throughout the A2A protocol to pass contextual information between client and server. It contains session identifiers, action types, task information, and execution state.

## Fields

### session_id
- **Type**: `string` (optional)
- **Description**: Client session identifiers are confidential (client-only) and must not appear in client/server HTTP request/response payloads. Legacy/internal code may still pass this around in-process, but it must be stripped before persistence and API responses.
- **Privacy**: Confidential - must not be transmitted over network

### action
- **Type**: `string` (optional)
- **Description**: Action type from client (e.g., 'dialog', 'auto-ai', 'task-decomposition')
- **Examples**: 'dialog', 'auto-ai', 'task-decomposition', 'fix-vue-imports', 'coder'

### new_task
- **Type**: `string[]` (optional)
- **Description**: Array of task descriptions from client for processing

### architectural_features
- **Type**: `string[]` (optional)
- **Description**: List of architectural features detected in the project

### continue
- **Type**: `boolean` (optional)
- **Description**: Flag indicating whether to continue with the current task processing

### tasks
- **Type**: `Task[]` (optional)
- **Description**: Array of task objects to be processed

### request_files
- **Type**: `string[]` (optional)
- **Description**: List of file paths that the client should provide in the next request

### confirm
- **Type**: `boolean` (optional)
- **Description**: Flag for confirmation requirements

### errors
- **Type**: `ProtocolError[]` (optional)
- **Description**: Array of protocol errors encountered during processing

### task
- **Type**: `string` (optional)
- **Description**: Task from client (for action processing)

### llmModel
- **Type**: `string` (optional)
- **Description**: LLM model id for AI Hub proxy (e.g. `glm-4.7-flash`, `qwen3:8b`); overrides env defaults.

### grayRoomLlmModel
- **Type**: `string` (optional)
- **Description**: Optional override for gray-room sub-calls only (default: `A2A_GRAY_ROOM_LLM_MODEL` or qwen3:8b).

### execution
- **Type**: `object` (optional)
- **Description**: Execution state for actions (new protocol format)
- **Properties**:
  - **action**: `string` - Action ID (e.g., 'fix-vue-imports', 'coder')
  - **step**: `string` - Current step ID (e.g., 'vue-import-detect', 'request')
  - **status**: `'completed'` (optional) - Optional status for completion
  - **history**: `Array<{ step: string; result?: unknown }>` (optional) - History of executed steps

## Usage

The Context Block flows bidirectionally between client and server in all messages. It maintains state across iterations of the request/response cycle.

## Security Notes

- `session_id` must never be transmitted in HTTP payloads - it's client-confidential only
- All other fields may be transmitted but should be validated for security