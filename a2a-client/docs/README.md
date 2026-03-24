# A2A Web Client Documentation

This directory contains comprehensive documentation for the A2A Script Agent web client (port 5173).

## Documentation Structure

### 📋 Workflows & Scenarios
- **[Workflows](./workflows/)** - Complete workflow documentation with scenarios, state machines, and validation criteria
  - [Session Lifecycle](./workflows/session-lifecycle/) - Session creation, management, switching, and deletion
  - [Task Execution](./workflows/task-execution/) - Execute types, action processing, and result submission
  - [Communication](./workflows/communication/) - SSE/WebSocket transport and fallback mechanisms
  - [UI Interactions](./workflows/ui-interactions/) - Panel management and user interface workflows
  - [Testing](./workflows/testing/) - Test scenarios, validation workflows, and QA processes

### 🏗️ Architecture & Implementation
- **[Unified Architecture Complete](./workflows/UNIFIED_ARCHITECTURE_COMPLETE.md)** - Implementation status of major refactoring steps
- **[Session Architecture Migration](./workflows/session-architecture-migration.md)** - Migration guide for unified session architecture
- **[Context Synchronization Guide](./workflows/context-synchronization-guide.md)** - State synchronization across components

### 🔍 API & dialog
- **[Client API: Web UI vs `@a2a/sdk`](./CLIENT_API_WEB_SDK.md)** - Two implementations, contracts, and debugging
- **[Dialog frontend](./DIALOG-FRONTEND.md)** - Dialog UI behavior
- **[Session storage](./SESSION-STORAGE.md)** - On-disk step layout and Client API

### 📊 Development State
- **[Web UI DEV_STATE](../DEV_STATE.md)** - Current development status and component overview

## Quick Navigation

| Need | Go To |
|------|-------|
| **Understand workflows** | [Workflows Overview](./workflows/) |
| **Client API / Vite vs SDK** | [CLIENT_API_WEB_SDK.md](./CLIENT_API_WEB_SDK.md) |
| **Implement session management** | [Session Lifecycle](./workflows/session-lifecycle/) + [Session Architecture Migration](./workflows/session-architecture-migration.md) |
| **Handle task execution** | [Task Execution](./workflows/task-execution/) |
| **Manage real-time communication** | [Communication](./workflows/communication/) |
| **Build UI components** | [UI Interactions](./workflows/ui-interactions/) + [Context Synchronization](./workflows/context-synchronization-guide.md) |
| **Test the system** | [Testing](./workflows/testing/) |
| **Check implementation status** | [Unified Architecture Complete](./workflows/UNIFIED_ARCHITECTURE_COMPLETE.md) |

## Key Components Overview

### Core Architecture (Unified)
- **SessionStore** - Single source of truth for session state
- **TransportManager** - SSE primary → WebSocket auto-fallback
- **PanelManager** - Unified panel system (panels/cubes/modals)
- **ActionHandler** - Standardized action-key shape submissions

### Communication
- **SSE**: Primary transport (`/api/sse/:sessionId`) with 30s heartbeat
- **WebSocket**: Fallback transport (`/api/ws/:sessionId`) for SSE failures
- **HTTP Polling**: Standard for stateless / async updates via `/async`

### UI Patterns
- **Execute Types**: `form`, `message`, `script`, `rag-search`, `read-file`, `write-file`, `execute-command`
- **Panel States**: visible ↔ minimized (cube) ↔ closed
- **Action Shape**: `{ [actionType]: data }` for all submissions

## Development Workflow

1. **Planning**: Check [Workflows](./workflows/) for user scenarios
2. **Implementation**: Reference [Unified Architecture](./workflows/UNIFIED_ARCHITECTURE_COMPLETE.md) for patterns
3. **Testing**: Use [Testing Scenarios](./workflows/testing/) for validation
4. **Documentation**: Update relevant workflow docs for new features

---

*This documentation provides comprehensive coverage of the A2A web client architecture, workflows, and implementation patterns.*