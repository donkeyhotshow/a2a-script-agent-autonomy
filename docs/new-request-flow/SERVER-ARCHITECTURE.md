# A2A Server Architecture

> Server-centric documentation for the A2A Script Agent project.
> This document expands on [ARCHITECTURE.md](ARCHITECTURE.md) and [PROTOCOL.md](PROTOCOL.md) with detailed server-specific information.

---

## Table of Contents

1. [Overview](#overview)
2. [Server Architecture](#server-architecture)
3. [Actions vs AI-Actions](#actions-vs-ai-actions)
4. [External AI Hub Integration](#external-ai-hub-integration)
5. [Simulation Mapping](#simulation-mapping)
6. [Operational Notes](#operational-notes)
7. [Cross-References](#cross-references)

---

## Overview

The A2A Server is a **stateless** HTTP service that processes requests and returns results. It does not store sessions—session state is managed by the Client API (Vite **5173** `/api/a2a/*` or standalone SDK **3001**). The server focuses on:

- **Request processing**: Receiving task requests and returning appropriate responses
- **Action execution**: Managing Actions (hardcoded steps) and AI-Actions (LLM-driven steps)
- **LLM integration**: Communicating with External AI Hub for AI-powered workflows
- **Context management**: Parsing and maintaining execution context across steps

### Position in System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              WEB UI (port 5173)                              │
│                   User interface, session management (client)                │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    CLIENT API (5173 /api/a2a/* or SDK :3001)                  │
│  - Manages sessions (stateless from server perspective)                     │
│  - API: e.g. POST /api/a2a/sessions, GET /api/a2a/sessions/:id               │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          A2A SERVER (port 3000) - STATELESS                  │
│                                                                              │
│  ┌─────────────────┐  ┌──────────────────┐  ┌─────────────────────────────┐  │
│  │ Request Routes │  │ Action Registry  │  │ Request Processor Service   │  │
│  │ /api/v1/invoke │  │ Actions/AI-Actions│  │ Timer-based polling (5s)   │  │
│  │ /api/v1/requests│  │                  │  │                            │  │
│  └────────┬────────┘  └────────┬─────────┘  └──────────────┬────────────┘  │
│           │                    │                           │                │
│           └────────────────────┼───────────────────────────┘                │
│                                ▼                                            │
│                    ┌─────────────────────────┐                              │
│                    │   Neuron Activator       │                              │
│                    │   (auto-detection)      │                              │
│                    └────────────┬────────────┘                              │
│                                 │                                            │
│                                 ▼                                            │
│                    ┌─────────────────────────┐                              │
│                    │   External AI Hub       │                              │
│                    │   (ai-integration)      │                              │
│                    └─────────────────────────┘                              │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                       EXTERNAL AI HUB (ai-integration)                       │
│  - Proxy on **11435** → Ollama **11434**                                    │
│  - Async promise support (promiseId)                                        │
│  - ML simulation capabilities                                               │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Server Architecture

### Core Components

#### 1. Routes (`a2a-server/src/routes/`)

| Route File | Endpoints | Description |
|------------|-----------|-------------|
| `index.ts` | `POST /api/v1/invoke`, `GET /metrics`, … | Invoke + metrics (mounted under `/api/v1`) |
| `requests.routes.ts` | `POST /api/v1/requests`, `GET /:id/status`, `GET /:id/result` | Request handling |
| `actions.routes.ts` | `GET /api/v1/actions/:id` | Action definitions |
| `sse.routes.ts` | `GET /api/v1/sse/:sessionId` | Server-Sent Events |
| `health.routes.ts` | `GET /health`, `GET /health/live` | Health checks |

#### 2. Services (`a2a-server/src/services/`)

| Service | Purpose |
|---------|---------|
| [`request-processor.service.ts`](a2a-server/src/services/request-processor.service.ts) | Main request processing, timer-based polling |
| [`request.service.ts`](a2a-server/src/services/request.service.ts) | Request CRUD operations |
| [`invoke.service.ts`](a2a-server/src/services/invoke.service.ts) | Request invocation |
| [`context-manager.service.ts`](a2a-server/src/services/context-manager.service.ts) | Context parsing and management |
| [`phase-machine.service.ts`](a2a-server/src/services/phase-machine.service.ts) | AI-Action phase management |
| [`llm-adapter.ts`](a2a-server/src/services/llm-adapter.ts) | LLM communication |
| [`ollama-adapter.ts`](a2a-server/src/services/ollama-adapter.ts) | Ollama-specific adapter |
| [`neuron-activator.service.ts`](a2a-server/src/services/neuron-activator.service.ts) | Auto-detection of actions |

#### 3. Actions (`a2a-server/src/actions/`)

| Component | Purpose |
|-----------|---------|
| [`action-registry.ts`](a2a-server/src/actions/action-registry.ts) | Registry of available Actions |
| [`action-processor.ts`](a2a-server/src/actions/action-processor.ts) | Action execution logic |
| [`action-executor.ts`](a2a-server/src/actions/action-executor.ts) | Step execution |
| [`action-service.ts`](a2a-server/src/actions/action-service.ts) | Action management |

#### 4. Protocol (`a2a-server/src/protocol/`)

| Component | Purpose |
|-----------|---------|
| [`context-parser.ts`](a2a-server/src/protocol/context-parser.ts) | Parse incoming context |
| [`message-builder.ts`](a2a-server/src/protocol/message-builder.ts) | Build server responses |
| [`file-block-handler.ts`](a2a-server/src/protocol/file-block-handler.ts) | Handle file content blocks |

#### 5. Neurons (`a2a-server/src/neurons/`)

Neurons are auto-detection components that activate based on project context:

| Neuron | Trigger | Purpose |
|--------|---------|---------|
| `project-context-detector.neuron.ts` | Project structure | Detect project type |
| `task-semantic-analyzer.neuron.ts` | Task description | Analyze task semantics |
| `external-ai-trigger.neuron.ts` | AI action requests | Trigger LLM calls |
| `lint-*.neuron.ts` | File patterns | Run linters |

---

## Actions vs AI-Actions

### Actions (Server-Driven)

**Definition**: Hardcoded sequence of steps where the server completely controls execution flow.

**Characteristics**:
- Steps are defined in Action definition (YAML or MD)
- Server determines next step from previous `result`
- No LLM involvement during execution (only for initial matching)
- Predictable, algorithmic flow

**Structure**:
```json
{
  "context": {
    "task": "fix vue imports",
    "execution": {
      "action": "fix-vue-imports",
      "step": "vue-import-detect"
    }
  },
  "execute": {
    "script": {
      "input": { "rootDir": ".", "filePattern": "**/*.vue" },
      "output": "broken_imports[]",
      "code": "// DSL code here"
    }
  }
}
```

**Life Cycle**:
```
request.json → response.json (execute.script, step: "detect")
     ↑________________↓
request.json (result.script) → response.json (execute.script, step: "resolve")
     ↑________________↓
...automatic step switching...
```

**Built-in Actions**:

| Action | Steps | Description |
|--------|-------|-------------|
| `fix-vue-imports` | detect → resolve → apply → cleanup | Fix Vue import paths |
| `phpunit-deprecations` | scan → analyze → report | Detect PHPUnit deprecations |

**Definition Location**: `a2a-server/src/actions/definitions/`

### AI-Actions (LLM-Driven)

**Definition**: Dynamic steps where the LLM chooses the next action based on context.

**Characteristics**:
- Steps are not in fixed sequence
- Server shows list of *available* steps
- Next step determined from LLM response
- Each step can be a separate LLM request

**Structure**:
```json
{
  "context": {
    "task": "implement login",
    "execution": {
      "action": "coder",
      "step": "request"
    }
  },
  "execute": {
    "message": "I'll help you implement the login feature. What files exist in your project?"
  }
}
```

**Life Cycle**:
```
request.json → request.md (LLM prompt) → response.md (LLM output)
                                           ↓
                          server-transforms-response.json
                                           ↓
                                  response.json
                    (execute.message, execute.form, or client action)
```

**Built-in AI-Actions**:

| AI-Action | Purpose | Available Steps |
|-----------|---------|-----------------|
| `dialog` | Simple dialog | read-file, write-file, execute-command, ask-question |
| `coder` | Code generation | plan, generate, review |
| `coder-smart` | Smart code assistant | user-request → rag-clarify → research → write-doc → execute |
| `auto-ai` | Full AI capabilities | All client actions + form |

### Comparison

| Aspect | Actions | AI-Actions |
|--------|---------|-------------|
| Step Definition | Hardcoded in definition | Dynamic, from LLM |
| Step Switching | Server automatic | LLM determines |
| LLM Required | No (only for matching) | Yes, every step |
| `execution.step` | Specific step name | Often `"request"` |
| Complexity | Simple, algorithmic | Complex, reasoning-based |
| Examples | fix-vue-imports, phpunit-deprecations | dialog, coder, auto-ai |

---

<span id="external-ai-hub-integration"></span>

## External AI Hub Integration

### Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              A2A Server                                      │
│  ┌───────────────┐    ┌──────────────┐    ┌─────────────┐                    │
│  │context-parser │───▶│ request.md  │───▶│llm-adapter │                    │
│  │               │    │              │    │             │                    │
│  └───────────────┘    └──────────────┘    └──────┬──────┘                    │
└────────────────────────────────────────────────┼────────────────────────────┘
                                                 │
                              POST /api/chat     │
                              X-Promise: <id>    ▼
                                                 │
┌────────────────────────────────────────────────┼────────────────────────────┐
│                    AI Integration (Proxy)      │                            │
│  ┌─────────────┐    ┌─────────────┐    ┌──────┴──────┐                     │
│  │ promises.py │◀───│proxy_handler│◀───│ollama_manager│                    │
│  │             │───▶│             │───▶│              │                    │
│  └─────────────┘    └─────────────┘    └─────────────┘                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

### LLM Prompt Pipeline

Transform chain (`request.json` → transforms → `request.md` → LLM → `response.md` → transforms → `response.json`): canonical file roles in [`simulations/SCHEMA.md`](../../simulations/SCHEMA.md). Server-side prep before `request.md` (history + `flowControlHint`): [`a2a-server/docs/LLM-REQUEST-PREP.md`](../../a2a-server/docs/LLM-REQUEST-PREP.md).

### Async Flow with promiseId

Contract and Hub endpoints: [PROTOCOL.md → Async flow](PROTOCOL.md#async-flow-promiseid).

### Supported LLM Providers

| Provider | Configuration | Adapter |
|----------|--------------|---------|
| Ollama | `OLLAMA_MODEL`, `AI_HUB_URL` | `ollama-adapter.ts` |
| OpenAI | `OPENAI_API_KEY`, `OPENAI_MODEL` | `llm-adapter.ts` |
| Placeholder | `LLM_PROVIDER=placeholder` | `llm-adapter.ts` |

### Configuration

```typescript
// Ollama
{
  provider: 'ollama',
  model: 'qwen3:8b',
  url: 'http://localhost:11434',
  pollIntervalMs: 2000,
  pollTimeoutMs: 120000
}

// OpenAI
{
  provider: 'openai',
  model: 'gpt-4o-mini',
  apiKey: process.env.OPENAI_API_KEY
}
```

---

## Simulation Mapping

### Simulation Structure

Per-step artifacts and naming: [`simulations/SCHEMA.md`](../../simulations/SCHEMA.md).

### Action-Key Shape (Canonical Format)

Normative rules and examples: [PROTOCOL.md → Action-key shape](PROTOCOL.md#action-key-shape).

### Simulation Types Mapping

| Simulation | Type | Server Component |
|------------|------|------------------|
| `fix-vue-imports` | Action | `action-registry.ts` |
| `phpunit-deprecations` | Action | `action-registry.ts` |
| `dialog` | AI-Action | `phase-machine.service.ts` |
| `coder` | AI-Action | `phase-machine.service.ts` |
| `coder-smart` | AI-Action | `phase-machine.service.ts` |
| `auto-ai` | AI-Action | `phase-machine.service.ts` |

### Running Simulations

| Script | Purpose |
|--------|---------|
| `sim-run.ts` | Run a single simulation |
| `sim-create.ts` | Create new simulation |
| `sim-validate.ts` | Validate simulation format |
| `sim-compare.ts` | Compare simulations |
| `sim-report.ts` | Generate reports |

---

## Operational Notes

### Environment Variables

**Server (.env)**:
```
PORT=3000
JWT_SECRET=your-32-character-minimum-secret-key
ENCRYPTION_KEY=32-characters-key-here
SKIP_AUTH=1
REQUEST_PROCESSOR_INTERVAL_MS=5000
```

> **Note:** Server is stateless - no database required. All state is stored by Client API.

**AI Hub (ai-integration)**:
```
PROXY_PORT=11435
OLLAMA_HOST=http://localhost:11434
SIMULATION_ENABLED=false
AI_HUB_CONFIG=path/to/config.json
```

### Ports

| Component | Port | Description |
|-----------|------|-------------|
| Server | 3000 | HTTP API |
| Client API | 5173 (`/api/a2a/*`) or 3001 (SDK) | HTTP API for web |
| Web UI | 5173 | Vite dev server |
| AI Hub Proxy | 11435 | Proxy / promise flow → Ollama |
| Ollama | 11434 | Local LLM |

### Startup

```bash
# Server (stateless - no database needed)
cd a2a-server
npm install
npm run dev

# AI Hub (optional)
cd ai-integration
pip install -r requirements.txt
python -m proxy

# Or with Docker (AI services only, no database)
docker-compose up
```

### Health Checks

```
GET /health                          - Basic health
GET /api/v1/health/live              - Liveness probe
GET /api/v1/health/ready             - Readiness probe
```

> **Note:** No database health check - server is stateless.

---

## Cross-References

### Related Documentation

| Document | Description |
|----------|-------------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | General system architecture |
| [PROTOCOL.md](PROTOCOL.md) | Communication protocol |
| [DATA-FLOW.md](DATA-FLOW.md) | Complete data flow diagram |
| [SESSION-FLOW.md](SESSION-FLOW.md) | Session flow details |
| [SIMULATION-FORMAT.md](SIMULATION-FORMAT.md) | Simulation format |
| [SIMULATION-LLM-PROXY.md](SIMULATION-LLM-PROXY.md) | Async flow with promiseId |

### Server-Specific Documentation

| Document | Description |
|----------|-------------|
| [a2a-server/docs/detailed-architecture.md](a2a-server/docs/detailed-architecture.md) | Detailed server architecture |
| [a2a-server/docs/entry-points.md](a2a-server/docs/entry-points.md) | Entry points & root context |
| [a2a-server/docs/action-api.md](a2a-server/docs/action-api.md) | Action API |
| [simulations/SCHEMA.md](../../simulations/SCHEMA.md) | Canonical simulation schema |
| [simulations/REFERENCE.md](../../simulations/REFERENCE.md) | Action reference |

### AI Integration

| Document | Description |
|----------|-------------|
| [ai-integration/README.md](../../ai-integration/README.md) | AI Hub documentation |
| [ai-integration/docs/UPGRADE.md](../../ai-integration/docs/UPGRADE.md) | Upgrade guide |

---

## For Contributors

### Key Files to Understand

1. **Request Flow**: `services/request-processor.service.ts`
2. **Action Execution**: `actions/action-processor.ts`
3. **Protocol Parsing**: `protocol/context-parser.ts`
4. **AI-Action Phases**: `services/phase-machine.service.ts`

### Adding New Actions

1. Create definition in `src/actions/definitions/`
2. Register in `src/actions/action-registry.ts`
3. Add tests in `tests/`
4. Create simulation in `simulations/`

### Adding New AI-Actions

1. Define prompt templates in `src/actions/definitions/`
2. Implement phase logic in `phase-machine.service.ts`
3. Add LLM adapter configuration
4. Create simulation in `simulations/`

---

**Last Updated**: 2026-03-03
