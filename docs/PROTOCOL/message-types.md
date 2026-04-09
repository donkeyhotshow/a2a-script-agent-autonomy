# Message Types

The A2A protocol uses two primary message types for communication between client and server: ClientMessage and ServerMessage.

## ClientMessage

Sent from client to server containing contextual information and optional file blocks and results.

### Fields

#### context
- **Type**: `ContextBlock`
- **Description**: Context block containing session information, action types, task data, and execution state
- **Required**: Yes

#### files
- **Type**: `FileBlock[]` (optional)
- **Description**: Array of file blocks being sent to the server
- **Usage**: Used when client needs to provide file content for processing

#### result
- **Type**: `ResultCommand` (optional)
- **Description**: Result from client using action-key shape (new protocol format)
- **Usage**: Contains the result of executing a command that was previously requested by the server

## ServerMessage

Sent from server to client containing contextual information, optional file blocks, messages, and execute commands.

### Fields

#### context
- **Type**: `ContextBlock`
- **Description**: Context block containing session information, action types, task data, and execution state
- **Required**: Yes

#### files
- **Type**: `FileBlock[]` (optional)
- **Description**: Array of file blocks being sent to the client
- **Usage**: Used when server needs to provide file content to the client

#### message
- **Type**: `string` (optional)
- **Description**: Human-readable message for the client
- **Usage**: Used for status updates, instructions, or information to display to the user

#### execute
- **Type**: `ExecuteCommand` (optional)
- **Description**: Execute commands for client using action-key shape (new protocol format)
- **Usage**: Contains commands that the client should execute (read files, run scripts, etc.)

## Usage Pattern

1. Client sends ClientMessage to server with context and any files/results
2. Server processes the message and returns ServerMessage with:
   - Updated context
   - Any requested files
   - Optional message to display
   - Execute commands for client to run
3. Client executes the commands and sends another ClientMessage with results
4. Cycle continues until task completion

## Security Notes

- Context.session_id is confidential and should never leave the client
- All other fields may be transmitted but should be validated
- File content should be scanned for security risks when appropriate