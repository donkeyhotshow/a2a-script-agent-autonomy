# DEV_STATE (2026-03-06)

## Project Overview

This project implements an AI agent system with the following architecture:

```
User Interface (Web/SSE/WebSocket)
    ↓
a2a-client (API proxy + client SDK)
    ↓
a2a-server (AI processing + neurons)
    ↓
ai-integration (LLM proxy + promise queue daemon)
    ↓
External AI (Ollama/OpenAI/etc)
```

## Component Status

| Component | Status | Description |
|-----------|--------|-------------|
| **ai-integration** | ✅ Active | LLM proxy with promise queue daemon and simulation support |
| **a2a-server** | ✅ Active | AI processing server with neuron system |
| **a2a-client** | ✅ Active | Client API with Web UI and testing framework |

## Component Documentation

- **[ai-integration/DEV_STATE.md](ai-integration/DEV_STATE.md)** - LLM proxy, promise queue daemon, simulation testing
- **[a2a-server/DEV_STATE.md](a2a-server/DEV_STATE.md)** - Server architecture, neuron processing, API endpoints
- **[a2a-client/DEV_STATE.md](a2a-client/DEV_STATE.md)** - Client API proxy, SDK, testing framework, web UI component, session management, transport layer
- **[a2a-client/docs/README.md](a2a-client/docs/README.md)** - Complete documentation index with workflows and scenarios
- **[a2a-client/docs/workflows/](a2a-client/docs/workflows/)** - Detailed workflow documentation for all user scenarios
- **[a2a-client/tester/](a2a-client/tester/)** - CLI testing and automation framework for web client control

## Key Features

- **Promise Queue System**: Asynchronous task processing with daemon workers
- **Simulation Mode**: Test workflows without actual LLM calls
- **SSE/WebSocket Transport**: Real-time communication between components
- **Unified Action Protocol**: Standardized request/response format across all components
- **Multi-level Testing**: AI Integration → Server → Client → Web UI testing pipeline
- **CLI Testing Framework**: Remote web client control and automated testing via CLI
- **Automated Health Checks**: CLI-based system verification and monitoring

## Recent Updates

- Promise simulation support with configurable daemon skipping
- Unified transport layer with SSE primary + WebSocket fallback
- Enhanced testing framework with multi-level smoke tests
- Session state management with single source of truth
- CLI testing framework for remote web client control and automation
- Automated health checks and system verification through CLI
- **a2a-server improvements**: Storage API, log rotation, rate limiting, performance monitoring
- **Enhanced security**: Input validation, size limits, error handling in storage routes
- **Operational improvements**: Automatic cleanup, monitoring metrics, access logging

See individual component DEV_STATE files for detailed status and implementation notes.
