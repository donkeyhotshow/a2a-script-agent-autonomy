# A2A Script Agent

## 🚀 Quick Start (Unified Orchestrator)

The project now uses a unified orchestrator to manage all services with health gating and graceful shutdown.

```bash
# 1. Setup environment
copy .env.example .env
# Edit .env and set your secrets

# 2. Install dependencies
npm install
cd a2a-server && npm install && cd ..
cd a2a-client && npm install && cd ..

# 3. Start all services
npm run dev
```

### Available Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all services (Server + Client + Infrastructure) |
| `npm run dev:server` | Server + PostgreSQL + Redis only |
| `npm run dev:client` | Client API + Web UI only |
| `npm run dev:proxy` | AI Proxy + Ollama only |
| `npm run dev:full` | Everything including AI services |
| `npm run dev:status` | Show service status |
| `npm run dev:stop` | Stop all services |

### Service Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        PORTS                                 │
├─────────────────────────────────────────────────────────────┤
│  3000  │ A2A Server API    │ Node.js + Express             │
│  3001  │ Client API        │ Node.js + WebSocket           │
│  5173  │ Web UI            │ Vite + Vue                    │
│  5432  │ PostgreSQL        │ pgvector extension            │
│  6379  │ Redis             │ Caching & queues              │
│ 11434  │ AI Proxy          │ Python Flask                  │
│ 11435  │ Ollama            │ LLM inference (Docker)        │
└─────────────────────────────────────────────────────────────┘
```

### Health Gating

Services start in dependency order:
1. **Infrastructure**: PostgreSQL → Redis → (Ollama if proxy needed)
2. **Backend**: Server (waits for PostgreSQL + Redis)
3. **Client**: Client API → Web UI (waits for Server)
4. **AI**: Proxy (waits for Ollama)

### Graceful Shutdown

Press `Ctrl+C` to stop all services gracefully. The orchestrator will:
1. Stop application services in reverse order
2. Wait for cleanup (5s timeout)
3. Stop Docker infrastructure

---

## Project Status (2026-03-03)

### Recently Completed
- ✅ **Unified Service Orchestrator** - Health gating, graceful shutdown
- ✅ **12 Major Tasks** - Web Integration, Simulation Framework, Server Refactoring
- ✅ **3 Refactoring Tasks** - request-processor, message-builder, context-parser
- ✅ **Server Analysis** - Inventory check aligned with simulations

### Current Focus: Server Cleanup & Alignment

We are analyzing the server codebase to align it with simulation scenarios. This involves:

1. **Identifying Unused Systems** (~58,000 lines potentially removable)
   - entity-recognizer.service.ts (~21k lines)
   - phase-machine.service.ts (~14k lines)
   - framework-extractor.service.ts (~9k lines)
   - graph-store.service.ts (~7k lines)
   - Neuron system lint rules (~3k lines)

2. **Decision Required**
   - Review [Server Cleanup Decisions](docs/server-cleanup-decisions.md)
   - Choose: KEEP / REMOVE / REFACTOR for each system

3. **Missing Systems to Implement**
   - RAG Service (for coder/coder-smart simulations)
   - Script Engine (for batch processing simulations)
   - File/Command Services (for file operations)

### Documentation

| Document | Purpose |
|----------|---------|
| [Server Inventory Report](docs/server-inventory-report.md) | Full analysis of server systems |
| [Server Cleanup Decisions](docs/server-cleanup-decisions.md) | Decision form for unused systems |
| [Implementation Roadmap](plans/server/04-comprehensive-implementation-roadmap.md) | Overall project roadmap |
| [Progress Report](docs/PROGRESS-2026-03-03.md) | Detailed progress tracking |

### Documentation Requirements (Machine-Readable)

All documents in this repository must be adapted for **machine reading** (parsing and/or RAG indexer ingestion). **Human reading is not required.**

- Prefer structured, unambiguous Markdown (stable headings, lists, tables, JSON/YAML blocks where applicable)
- Avoid “marketing” prose; write for deterministic extraction and indexing

### Legacy Quick Start

```bash
# Install dependencies
npm install
cd a2a-server && npm install

# Run tests
npm test

# Validate simulations
npm run sim:validate
```

### Project Structure

```
├── a2a-client/          # Web UI and client packages
├── a2a-server/          # Server API and services
├── ai-integration/      # AI Hub proxy (Python)
├── docker-compose.yml   # Infrastructure orchestration
├── scripts/             # Orchestrator and utilities
│   └── orchestrator.js  # Unified service manager
├── simulations/         # Test scenarios (golden standard)
├── tasks/               # Active tasks
│   ├── client/
│   └── server/
├── plans/               # Implementation plans
└── docs/                # Documentation
```

## Contributing

See [Server Cleanup Decisions](docs/server-cleanup-decisions.md) for current decisions needed.
