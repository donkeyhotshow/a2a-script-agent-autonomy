# A2A Script Agent

**Status: 2026-04-08 — autonomous AI operator workstation; production-grade session completion validation**

## Project positioning

This repository is an **autonomous operator workstation** for AI-assisted development: a coordinated stack (Client API, server, hub, Web UI) where work proceeds through **long-lived async sessions** (`/next` + `/async`), not one-shot HTTP to an LLM.

**Completion bar (production level):** canonical acceptance and closure criteria are defined in [`docs/OPERATOR-MONITOR-MANUAL-QA.md`](docs/OPERATOR-MONITOR-MANUAL-QA.md). The **Task Monitor** (`npm run monitor` / `monitor:once`) is the normative driver for multi-turn completion; validators enforce contracts, edge cases, and cross-layer shape.

**Central orchestrator (parameterless):** `npm run central` runs the full offline gate (`test:before-start`, cross-system, sim checks) then one **`monitor:once`** pass — see [`docs/CENTRAL-ORCHESTRATOR.md`](docs/CENTRAL-ORCHESTRATOR.md). The final monitor step needs the **live stack**; use **`CENTRAL_SKIP_OFFLINE=1`** when offline steps already passed and you only need **`monitor:once`**. **`npm run central:offline`** runs the same offline sequence **without** `monitor:once` (no Client API).

**Session quality:** operator and CI treat **terminal session state** (router beats, action-key shapes, async terminality, stored artifacts) as evidence — see [`AGENTS.md`](AGENTS.md), [`docs/AGENTS-REFERENCE.md`](docs/AGENTS-REFERENCE.md), [`GLOSSARY.md`](GLOSSARY.md). Optional hygiene: `npm run audit:session-storage` for client session storage drift → tracked tasks.

## Live stack: start and restart

| Platform | Use this from the **repository root** only |
|----------|---------------------------------------------|
| **Windows** | **`npm run dev`** — starts all services using the runbook CLI |
| **Linux / macOS** | **`npm run dev`** — same rule |

Do **not** use `npm run dev`, `npm start`, or equivalent **inside** `a2a-server`, `a2a-client`, `ai-integration`, or nested packages to refresh the live stack. That skips kill/port checks and PID bookkeeping and leads to duplicate listeners and broken `.pids.txt`.

The `npm run dev` uses `scripts/runbook-cli.js start` to manage all services locally.

## Key Changes (2026-03-20)

| Change | Impact |
|--------|--------|
| Stateless A2A Server | No server-side session storage |
| Config-driven / keyword router | Static choices + keyword matching (see [`a2a-server/docs/Router.md`](a2a-server/docs/Router.md)); not an open-ended LLM-only router |
| Action-key shape | Mandatory for execute/result |
| Context fields | execution, history, workbench |
| Step-based storage | Numbered folders in Client API |
| DEV_STATE methodology | Always update before/after work |

## Implementation preferences

**Simplicity first:** prefer the straightforward implementation over shaving bytes or cycles — performance and payload size are secondary unless something is proven to be a bottleneck. **Unification** (one contract, one code path where it makes sense) and **JSON-first** APIs and artifacts (easy to inspect, log, validate, and align across Client API ↔ server ↔ tests) are explicit goals.

---

## Full-spectrum agent run (master prompt)

Open **[`START-FULL-SPECTRUM.md`](START-FULL-SPECTRUM.md)** and copy the **Agent prompt** block into Cursor **or** seed `task` on `POST /api/a2a/sessions` (`mode: "agent"`). Either way, **stack execution** is not one request: keep **one `sessionId`** and run **`/next` + poll `/async`** (router beats) until terminal — or run **`npm run monitor`** so the Task Monitor owns that loop ([`prompts-to-agent-mode/README.md`](prompts-to-agent-mode/README.md) top note). That file indexes the full `prompts-to-agent-mode/` surface plus methodology and Client API checks. Linear spine: [`prompts-to-agent-mode/ONE-PIPELINE.md`](prompts-to-agent-mode/ONE-PIPELINE.md). Curl detail: [`docs/OPERATOR-CURL.md`](docs/OPERATOR-CURL.md).

## Quick Start

```bash
# 1. Prerequisites
# Install PostgreSQL and Redis locally
# On Windows: Install PostgreSQL from https://www.postgresql.org/download/windows/
# On Windows: Install Redis from https://redis.io/download

# 2. Setup
cp .env.example .env
# Edit .env with your secrets

# 3. Install
npm install
cd a2a-server && npm install && cd ..
cd a2a-client && npm install && cd ..

# 4. Run (repository root only)
npm run dev
```

---

## Commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start all services (Server + Client + AI + Databases) using runbook CLI |
| `node scripts/runbook-cli.js start` | Manual start with verification |
| `node scripts/runbook-cli.js stop` | Stop all services |
| `node scripts/runbook-cli.js status` | Check service status |
| `node scripts/runbook-cli.js daemon-start` | Start daemon for monitoring and auto-restart |

Use `npm run dev` from the repository root to start the full stack. The runbook CLI manages service lifecycle, health checks, and dependencies.

Services include:
- PostgreSQL (port 5432)
- Redis (port 6379)
- AI Integration (port 11434)
- A2A Server (port 3000)
- Client API (port 3001)
- Web UI (port 5173)

The runbook CLI follows the port-kill / verify / PID cleanup pattern documented in [`docs/SYSTEM_STARTUP.md`](docs/SYSTEM_STARTUP.md) and [`AGENTS.md`](AGENTS.md).

### Service Architecture

See [`docs/SYSTEM_STARTUP.md`](docs/SYSTEM_STARTUP.md) for detailed port management and service configuration.

### Health Gating with Exponential Backoff

Services start in dependency order with automatic retry:
1. **Infrastructure**: PostgreSQL → Redis → (Local LLM upstream if proxy needed)
2. **Backend**: Server (waits for PostgreSQL + Redis)
3. **Client**: Client API → Web UI (waits for Server)
4. **AI**: Proxy (waits for Local LLM upstream)

Each service waits for healthy dependencies before starting, with exponential backoff retry.

### Port Management

The orchestrator handles dynamic port allocation with conflict detection and automatic cleanup.

See [System Startup Documentation](docs/SYSTEM_STARTUP.md) for details.

### Testing

**Sessions and E2E flows:** Target the **Client API** (`http://localhost:5173/api/a2a/*`) for session operations. See [`AGENTS.md`](AGENTS.md) for agent mode and testing details.

**Schema debugging:** Start with [`tests/direct-tests/README.md`](tests/direct-tests/README.md#schema-debugging--start-here).

- **Validators:** [tests/direct-tests/validators/README.md](tests/direct-tests/validators/README.md)
- **One-promise trace:** `npm run report:promise -- <promiseId>`
- **Health checks:** [tests/direct-tests/run-checks.ps1](tests/direct-tests/run-checks.ps1)
- **Web UI smoke test:** `.\scripts\tests\test-web-ui.ps1`

**Test Commands:**
- Unit: `npm test`
- Monitor: `npm run test:monitor`
- Offline gate: `npm run test:before-start`
- Integration: `SKIP_AUTH=1 npm run test:integration`
- Simulations: `npm run test:sim`

**Requirements:**
- Docker (for PostgreSQL + Redis)
- Node.js/npm environment
- Browser (Chromium/Chrome, Firefox, or Edge)
- PowerShell (Windows) or PowerShell Core (cross-platform)

**Who runs it:**
- **Developers**: Manual verification during development
- **CI/CD**: Automated headless runs for regression testing
- **QA**: Full browser testing with manual verification steps

**What it tests:**
- Infrastructure services (Docker PostgreSQL + Redis)
- A2A Server health check (/health)
- Client API health check
- Vite dev server startup
- Browser page load and session panel display
- SSE connectivity and real-time updates

#### Other Test Commands

```bash
# Unit tests
npm test

# Task Monitor — static regression (Client API session driver wiring; repo root)
npm run test:monitor

# Offline gate: indirect tests + server unit script + test:monitor
npm run test:before-start

# Integration tests (requires DB)
SKIP_AUTH=1 npm run test:integration

# Simulation tests (golden standard)
npm run test:sim
```

### Graceful Shutdown

Press `Ctrl+C` to stop all services gracefully. The orchestrator will:
1. Stop application services in reverse order
2. Wait for cleanup (5s timeout)
3. Stop Docker infrastructure

---

## Project Status

See [DEV_STATE.md](DEV_STATE.md) for current project status, recent changes, and development progress.

### Documentation

| Document | Purpose |
|----------|---------|
| [AGENTS.md](AGENTS.md) | Agent and repo conventions; API and architecture pointers |
| [prompts-to-agent-mode/README.md](prompts-to-agent-mode/README.md) | Task prompt index |
| [prompts-to-agent-mode/STACK-RUN.md](prompts-to-agent-mode/STACK-RUN.md) | **Required read** before HTTP-driving those prompts: Client API + `mode: "agent"` (not `invoke` alone) |
| [New request flow](docs/new-request-flow/) | Protocol, data flow, server architecture (canonical) |
| [System Startup](docs/SYSTEM_STARTUP.md) | Port allocation, conflict detection, health gating |
| [Machine-Readable Docs](docs/DOCUMENTATION-MACHINE-READABLE.md) | Documentation requirements for parsing |
| [System Startup](docs/SYSTEM_STARTUP.md) | `start-all` / `kill-all`, ports, stack restart (canonical) |

### Documentation Requirements (Machine-Readable)

All documents in this repository must be adapted for **machine reading** (parsing and/or RAG indexer ingestion). **Human reading is not required.**

- Prefer structured, unambiguous Markdown (stable headings, lists, tables, JSON/YAML blocks where applicable)
- Avoid “marketing” prose; write for deterministic extraction and indexing
- Details: `docs/DOCUMENTATION-MACHINE-READABLE.md`

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
├── scripts/runbook-cli.js # Service orchestration
├── scripts/             # Orchestrator and utilities
│   └── orchestrator.js  # Unified service manager
├── simulations/         # Test scenarios (golden standard)
├── tasks/               # Active tasks
│   ├── client/
│   └── server/
├── docs/plans/          # Active backlog (docs/plans/active/); archives under package docs
└── docs/                # Documentation
```

## Contributing

Contributions are welcome. For **LLM prompts, transform pipelines, simulations, or new `execute` types**, follow **[`a2a-server/docs/EXTENDING-LLM-ACTIONS.md`](a2a-server/docs/EXTENDING-LLM-ACTIONS.md)** and repo **[`AGENTS.md`](AGENTS.md)** (golden rules, `sim:lint`).
