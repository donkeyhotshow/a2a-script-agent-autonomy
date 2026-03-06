# A2A Script Agent - Workflow Documentation

> **Purpose:** Understand how to edit code at every level of the system.

## Structure

```
workflows/
├── README.md                 # This file - navigation hub
├── 0-architecture-overview.md # System layers and boundaries
├── 1-low-level/             # Foundation workflows
│   ├── storage.md           # Local storage (HistoryManager, adapters)
│   ├── transport.md         # SSE, WebSocket, HTTP transports
│   ├── protocol.md          # Message parsing, validation, transforms
│   └── state.md             # Session state management
├── 2-mid-level/             # Component workflows
│   ├── ai-actions.md        # AI Actions panel system
│   ├── panels.md            # Panel manager lifecycle
│   ├── session-sync.md      # Session synchronization v2
│   └── components.md        # UI components (renderer, handlers)
├── 3-high-level/            # End-to-end scenarios
│   ├── new-session.md       # Creating new session
│   ├── task-execution.md    # Full task execution flow
│   ├── api-endpoints.md     # Complete API reference
│   ├── file-operations.md   # Reading/writing files
│   └── error-recovery.md    # Error handling flows
├── 4-editing-guide.md       # How to modify code safely
└── troubleshooting.md       # Common issues and solutions
```

## Quick Navigation

| I want to... | Go to |
|--------------|-------|
| Add new storage adapter | [1-low-level/storage.md](1-low-level/storage.md) |
| Fix transport issues | [1-low-level/transport.md](1-low-level/transport.md) |
| Change message format | [1-low-level/protocol.md](1-low-level/protocol.md) |
| Modify AI Actions | [2-mid-level/ai-actions.md](2-mid-level/ai-actions.md) |
| Add new panel type | [2-mid-level/panels.md](2-mid-level/panels.md) |
| Understand full request flow | [3-high-level/task-execution.md](3-high-level/task-execution.md) |
| Check API endpoints | [3-high-level/api-endpoints.md](3-high-level/api-endpoints.md) |
| Learn safe editing patterns | [4-editing-guide.md](4-editing-guide.md) |
| Troubleshoot issues | [troubleshooting.md](troubleshooting.md) |

## System Layers

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 3: User Scenarios                                    │
│  - New session, task execution, file operations              │
│  - Error recovery, batch operations                          │
├─────────────────────────────────────────────────────────────┤
│  LAYER 2: Components & Services                             │
│  - AI Actions, Panels, Session Sync                          │
│  - Renderers, Handlers, Integration                         │
├─────────────────────────────────────────────────────────────┤
│  LAYER 1: Foundation                                        │
│  - Storage (HistoryManager, adapters)                        │
│  - Transport (SSE, WebSocket, HTTP)                          │
│  - Protocol (parsing, validation, transforms)                │
│  - State (session store, persistence)                       │
└─────────────────────────────────────────────────────────────┘
```

## Testing Framework

The project includes a comprehensive multi-level testing framework:

### Level 1: AI Integration Testing
- Tests proxy, daemon, and LLM integration
- Located in `ai-integration/scripts/`
- Run: `python scripts/test_ai_integration.py`

### Level 2: A2A Server Testing
- Tests API endpoints and neuron processing
- Located in `scripts/test-a2a-server.ps1`
- Run: `.\scripts\test-a2a-server.ps1`

### Level 3: A2A Client Testing
- Tests full E2E flow: Web UI → Client API → Server → AI Integration
- CLI testing framework in `a2a-client/tester/`
- PowerShell script: `.\scripts\test-a2a-client.ps1`

### CLI Testing Framework

For interactive testing and debugging:

```bash
cd a2a-client/tester

# System status
node cli.js status

# Send commands to web client
node cli.js send ping
node cli.js panel show task-panel

# Monitor events
node cli.js monitor --filter tester_command

# Run test suites
node cli.js test --interactive
```

## Reading Order

1. **Start here:** [0-architecture-overview.md](0-architecture-overview.md)
2. **Foundation:** Read all [1-low-level/](1-low-level/) docs
3. **Components:** Read [2-mid-level/](2-mid-level/) for your area
4. **Scenarios:** See [3-high-level/](3-high-level/) for end-to-end context
5. **Test:** Use the [CLI testing framework](#testing-framework) for validation
6. **Edit:** Follow [4-editing-guide.md](4-editing-guide.md) before modifying code
7. **Debug:** Check [troubleshooting.md](troubleshooting.md) for common issues
