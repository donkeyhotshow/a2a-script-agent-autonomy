# Code hierarchy (canonical)

**Index:** [docs/README.md](README.md) | **Flow:** [flow-graph-requests.md](flow-graph-requests.md)

Canonical layout and layer rules. New code must follow this hierarchy.

---

## 1. Repository root

| Path | Purpose |
|------|---------|
| **a2a-server/** | Backend: API, knowledge, graph, neurons, processor |
| **a2a-client/** | Client: Vite app, e2e, packages, protocol |
| **docs/** | Documentation index and canonical docs (no duplication) |
| **tasks/** | Development tasks (from hack analysis) |
| **plans/** | Implementation plans (pre-ADR) |
| **scripts/** | Root-level scripts (e.g. questions-cli) |
| **output/** | Generated outputs (etalon results, etc.) |
| **LOADING.md** | Training data: neurons, entity/relation types, config |
| **AGENTS.md** | What to do now; links to docs |

Rule: **docs/** is the single index ([docs/README.md](README.md)); cross-link from there, not duplicate.

---

## 2. a2a-server (backend)

Entry: `src/app.ts` → `routes/index.js` → services/controllers.

### 2.1 Top-level src/

| Dir / file | Role | Allowed to depend on |
|------------|------|------------------------|
| **routes/** | HTTP endpoints; thin — delegate to services | controllers, middleware, services |
| **controllers/** | Request/response; no business logic | services, types |
| **services/** | Business logic, orchestration | knowledge, repositories, protocol, ml |
| **knowledge/** | Neurons, graph, context, entity recognition | types, utils (no routes/controllers) |
| **middleware/** | Auth, validation, error, rate-limit | utils, types |
| **protocol/** | Parsing context, file blocks, message build | types |
| **repositories/** | Data access (DB, files) | config, types |
| **ml/** | Embedding, indexer, search, Plexe client | config, types |
| **queue/** | Jobs and workers (BullMQ planned) | services, knowledge |
| **config/** | DB, Redis, env | — |
| **types/** | Shared TS types | — |
| **utils/** | Logger, helpers | — |
| **websocket/** | Session WS (if used) | services |
| **app.ts** | Express setup, register neurons | routes, middleware, knowledge/neurons |
| **index.ts** | Server start | app, config |

### 2.2 Knowledge layer (no HTTP)

| Path | Role |
|-----|------|
| **knowledge/context-handler.ts** | processNewTaskToContext, merge context |
| **knowledge/context-injector.ts** | Resolve @INJECT from neurons |
| **knowledge/context-store.ts** | Built-in context blocks (e.g. Laravel 11) |
| **knowledge/graph-store.ts** | In-memory graph (project_path → StoredGraph) |
| **knowledge/entity-recognizer.ts** | Code → entities (regex-based) |
| **knowledge/relation-mapper.ts** | Map relations between entities |
| **knowledge/neurons/** | Neuron store, activator, base neurons |
| **knowledge/neurons/base/** | One file per neuron (bootstrap, validation, auth, …) |
| **knowledge/question-generator.ts** | Graph → questions |
| **knowledge/index-query.ts** | Query index (stub) |
| **knowledge/semantic-extractor.ts** | Extract semantics from code |
| **knowledge/graph-log.ts** | Logging for graph ops |

Rule: **knowledge/** must not import from **routes**, **controllers**, or **app**. It is used by services and scripts (e.g. process-input).

### 2.3 Scripts (outside src)

| Path | Role |
|-----|------|
| **a2a-server/scripts/process-input.ts** | CLI: load neurons, process MD input, write output (request_files, activated_neurons) |

Scripts may import **src/knowledge**, **src/protocol**, **src/services** as needed.

---

## 3. a2a-client

| Path | Purpose |
|-----|---------|
| **docs/requirements.md** | Protocol (context, new_task, tasks, request_files) — single source |
| **e2e/** | Playwright E2E tests |
| **packages/** | Shared/client packages |
| **web/** | Vite app (if present) |
| **.a2a-client/** | projects.json, local config |
| **vite-plugin-a2a.js** | Vite plugin for A2A |

---

## 4. Dependency rules

1. **routes** → controllers, services, middleware (no direct knowledge).
2. **controllers** → services only (no knowledge, no repositories directly if avoidable).
3. **services** → knowledge, repositories, protocol, ml; **request-processor** orchestrates knowledge (neurons, graph, questions).
4. **knowledge** → types, utils only; no routes, controllers, app.
5. **scripts** → may use knowledge, protocol, services.

---

## 5. Naming

- **Files:** kebab-case (`request-processor.service.ts`, `bootstrap.neuron.ts`).
- **Routes:** `*.routes.ts`; **controllers:** `*.controller.ts`; **services:** `*.service.ts`; **neurons:** `*.neuron.ts`.
- **Config:** `config/*.ts`; **types:** `types/*.ts` or colocated.

---

**ADR:** This hierarchy is the accepted layout. Changes go via ADR in [adr/](adr/).

**Violations:** Current breaches of the above rules are listed in [code-hierarchy-violations.md](code-hierarchy-violations.md).
