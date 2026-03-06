# Task Execution Scenarios

This directory documents all task execution workflows and execute types in the A2A system.

## Related Documentation

- **[Actions & Events Decomposition](../actions-events-decomposition.md)** - Detailed breakdown of execute types and UI interactions
- **[Context Synchronization Guide](../context-synchronization-guide.md)** - Execute processing and context updates
- **[Dialog Architecture Tasks](../tasks/dialog-architecture-tasks.md)** - Execute handling catalog and processing flows
- **[UNIFIED_ARCHITECTURE_COMPLETE](../UNIFIED_ARCHITECTURE_COMPLETE.md)** - Action standardization and action-key shape
- **[Web UI DEV_STATE](../../DEV_STATE.md)** - Protocol overview and submission formats

## Task Submission Flow

### Initial Task Creation
```mermaid
sequenceDiagram
    participant U as User
    participant TF as TaskFlow
    participant SM as SessionManager
    participant API as Server API
    participant LLM as LLM Processor

    U->>TF: Enter task in input field
    U->>TF: Click Send button
    TF->>SM: createSession(task, projectId)
    SM->>API: POST /sessions {task, projectId}
    API->>LLM: Process initial task
    LLM->>API: Return execute object
    API-->>SM: Session created + first execute
    SM-->>TF: Execute received
    TF-->>U: Display execute UI
```

### Execute Types Overview

| Execute Type | Description | User Interaction | Result Payload | Components |
|--------------|-------------|------------------|----------------|------------|
| **form** | Multiple choice selection | Click choice button | `{"form": {"choice": "id"}}` | Choice buttons, ActionHandler |
| **message** | Continue confirmation | Click Continue button | `{"message": {"continue": true}}` | Message display, ActionHandler |
| **script** | Client-side JavaScript | Auto-execution in sandbox | `{"script": {"result": "...", "error": "..."}}` | ScriptRunner, sandbox |
| **rag-search** | RAG query execution | Auto-execution | `{"rag-search": {"results": [...], "query": "..."}}` | RagSearch, vector DB |
| **read-file** | File content reading | File selection dialog | `{"read-file": {"content": "...", "path": "..."}}` | FileSelector, FS API |
| **write-file** | File content writing | Save file dialog | `{"write-file": {"success": true, "path": "..."}}` | FileSaver, FS API |
| **execute-command** | Shell command execution | Auto-execution | `{"execute-command": {"output": "...", "exitCode": 0}}` | Terminal, process execution |

## Form Choice Execution

### Interactive Choice Selection
```mermaid
sequenceDiagram
    participant U as User
    participant UI as Form UI
    participant AH as ActionHandler
    participant API as Server API
    participant LLM as LLM Processor

    U->>UI: Click choice button
    UI->>AH: sendChoice(sessionId, projectId, choiceId)
    AH->>API: POST /sessions/:id/next {result: {form: {choice: choiceId}}}
    API->>LLM: Process choice selection
    LLM->>API: Return next execute
    API-->>AH: New execute object
    AH-->>UI: Update display
    UI-->>U: Show next step
```

### Choice Validation
- Choice IDs must match form.choices array
- Invalid choice IDs rejected by server
- Choice submission triggers immediate UI update
- Progress indicator shows processing state

## Message Continuation Execution

### Continue Button Flow
```mermaid
sequenceDiagram
    participant U as User
    participant UI as Message UI
    participant AH as ActionHandler
    participant API as Server API

    U->>UI: Click Continue button
    UI->>AH: sendMessageResult(sessionId, projectId, {continue: true})
    AH->>API: POST /sessions/:id/next {result: {message: {continue: true}}}
    API-->>AH: Next execute or completion
    AH-->>UI: Update UI state
```

### Message Display Rules
- Messages show with markdown rendering
- Continue button appears after message display
- Progress bar shows during processing
- No user input validation required

## Script Execution Scenarios

### Client-Side JavaScript Execution
```mermaid
stateDiagram-v2
    [*] --> ScriptReceived
    ScriptReceived --> SandboxInit: Create isolated context
    SandboxInit --> CodeExecution: Run user code
    CodeExecution --> Success: No errors
    CodeExecution --> Error: Exception thrown
    Success --> ResultSubmission: Format result
    Error --> ResultSubmission: Format error
    ResultSubmission --> [*]: Submit to server
```

### Script Security Constraints
- Code executes in isolated iframe sandbox
- No access to parent window DOM
- Network requests blocked
- File system access restricted
- Execution timeout: 30 seconds
- Memory limit: 50MB

### Script Result Format
```javascript
// Success result
{
  result: {
    script: {
      result: "execution output",
      executionTime: 150, // milliseconds
      success: true
    }
  }
}

// Error result
{
  result: {
    script: {
      error: "ReferenceError: x is not defined",
      executionTime: 50,
      success: false
    }
  }
}
```

## RAG Search Execution

### Vector Database Query Flow
```mermaid
sequenceDiagram
    participant API as Server API
    participant RS as RagSearch
    participant VDB as Vector DB
    participant LLM as LLM Processor

    API->>RS: Execute rag-search
    RS->>VDB: Query similar documents
    VDB-->>RS: Return relevant chunks
    RS->>LLM: Generate response with context
    LLM-->>RS: Formatted results
    RS-->>API: Submit search results
```

### RAG Result Structure
```javascript
{
  result: {
    "rag-search": {
      query: "user search query",
      results: [
        {
          content: "relevant document chunk",
          score: 0.95,
          source: "document.md",
          metadata: { line: 42, section: "API" }
        }
      ],
      totalResults: 5,
      executionTime: 200
    }
  }
}
```

## File Operation Scenarios

### Read File Execution
```mermaid
sequenceDiagram
    participant U as User
    participant FS as FileSelector
    participant API as Server API
    participant LLM as LLM Processor

    API->>FS: Execute read-file
    FS->>U: Show file picker dialog
    U->>FS: Select file
    FS->>FS: Read file content
    FS->>API: Submit file content
    API->>LLM: Process with file content
    LLM->>API: Continue execution
```

### Write File Execution
```mermaid
sequenceDiagram
    participant U as User
    participant FS as FileSaver
    participant API as Server API

    API->>FS: Execute write-file
    FS->>U: Show save dialog
    U->>FS: Choose location
    FS->>FS: Write content to file
    FS->>API: Submit success confirmation
    API-->>FS: Continue to next step
```

## Command Execution Scenarios

### Shell Command Flow
```mermaid
sequenceDiagram
    participant API as Server API
    participant TERM as Terminal
    participant PROC as Process
    participant LLM as LLM Processor

    API->>TERM: Execute command
    TERM->>PROC: Spawn shell process
    PROC-->>TERM: Stream output
    TERM->>TERM: Buffer output
    PROC-->>TERM: Exit with code
    TERM->>API: Submit command result
    API->>LLM: Process command output
```

### Command Result Format
```javascript
{
  result: {
    "execute-command": {
      command: "ls -la",
      output: "total 24\ndrwxr-xr-x  5 user  staff   160 Mar 6 10:30 .\n...",
      error: "", // stderr output
      exitCode: 0,
      executionTime: 500,
      workingDirectory: "/home/user/project"
    }
  }
}
```

## Execution State Management

### Context Progression
```javascript
// Initial context
{
  task: "user input",
  messages: [],
  execution: {
    step: "initial",
    action: "processing",
    progress: 0
  }
}

// After execute processing
{
  task: "user input",
  messages: [{role: "assistant", content: "..."}],
  execution: {
    step: "form-selection",
    action: "user-choice",
    progress: 25
  }
}
```

### Progress Tracking
- Progress values: 0-100 (monotonic)
- Step names: semantic identifiers (`plan`, `execute`, `clarify`, etc.)
- Action names: current operation type
- UI updates progress bars and step indicators

## Error Handling Scenarios

### Execution Timeouts
```
Script/command exceeds timeout → Force termination → Submit error result → Continue flow
```

### Permission Errors
```
File access denied → Show user error → Allow retry with different selection
```

### Network Failures
```
Result submission fails → Queue for retry → Auto-resubmit on reconnection
```

### Invalid Results
```
Malformed result object → Server validation → Error response → Retry option
```

## Validation Criteria

### Form Execution Tests
- [ ] All choice buttons render correctly
- [ ] Choice submission succeeds
- [ ] Invalid choices rejected
- [ ] UI updates immediately after submission
- [ ] Progress indicators work during processing

### Script Execution Tests
- [ ] Code executes in sandbox environment
- [ ] Timeout handling works correctly
- [ ] Error results formatted properly
- [ ] Success results include execution time
- [ ] No access to parent window objects

### File Operation Tests
- [ ] File picker opens on read-file
- [ ] Save dialog appears on write-file
- [ ] Large files handled correctly
- [ ] Permission errors displayed to user
- [ ] File content transmitted accurately

### Command Execution Tests
- [ ] Commands execute in proper working directory
- [ ] Output streaming works
- [ ] Exit codes captured correctly
- [ ] Long-running commands don't block UI
- [ ] Error output separated from stdout