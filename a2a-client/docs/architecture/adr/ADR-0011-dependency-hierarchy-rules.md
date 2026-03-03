# ADR-0011: Dependency Hierarchy Rules

Status: accepted  
Date: 2026-03-03

## Context

The A2A Client is organized as a monorepo with multiple npm workspaces (see `ADR-0001` and `ADR-0002`).  
To keep the system maintainable, we need **explicit rules** that define which packages are allowed to depend on which others, and how tests may cross boundaries.

## Decision

Define and enforce a strict dependency hierarchy for `@a2a/*` packages:

### 1. Package and System Levels

#### 1.1 Internal `@a2a/*` Packages

- **Level 0 — Core Infrastructure**
  - `@a2a/types`
  - `@a2a/api-client`
  - `@a2a/json`

- **Level 1 — Action Execution**
  - `@a2a/script-runner`
  - `@a2a/fs-utils`
  - `@a2a/terminal`
  - `@a2a/rag`
  - `@a2a/embedding`

- **Level 2 — State / Data**
  - `@a2a/history` (planned)
  - `@a2a/storage` (planned)

- **Level 3 — Application**
  - `@a2a/web` (planned app wrapper around `web/`)
  - `@a2a/api-server`

#### 1.2 Non-package Elements in This Repo

- **Level 3A — Web UI App**
  - `web/` (Vue SPA, see `ADR-0007`)
  - Depends on `@a2a/api-client` and other Level 0–2 packages, but is not imported by them.

- **Level 4 — Test & Simulation Harness**
  - Root tests: `tests/**`, `tests/e2e/**`
  - Simulations: `simulations/**`
  - Tooling: Playwright/Vitest configs, Vite configs
  - May import any lower level code (including `web/`), but **must never be imported by production code**.

#### 1.3 External System Components (Read-only View)

- **A2A Server (`a2a-server/`)**
  - Treated as an external service (HTTP/WebSocket), not as a library.
  - Client packages do not import server code; only call its public API.

- **External AI Hub / LLM Providers**
  - Reached indirectly via `a2a-server`, never directly from client packages.

### 2. Allowed Dependencies

- **General rule (packages)**: `@a2a/*` packages may depend only on **same level or lower** levels.
- **Forbidden (packages)**: any dependency from a lower level to a higher level (e.g. `@a2a/fs-utils` → `@a2a/web`).
- **Web UI (`web/`)**:
  - May depend on any `@a2a/*` package (Levels 0–2 and `@a2a/api-server`).
  - Must not be imported from any `@a2a/*` package.
- **Tests, simulations, tooling (Level 4)**:
  - May depend on any internal package and on `web/`.
  - Must never be imported by production code in `packages/*` or `web/`.
- **Cross-repo dependencies**:
  - `a2a-client` interacts with `a2a-server` **only via HTTP/WebSocket APIs** in tests and runtime.
  - No direct imports from `a2a-server` into `a2a-client` packages.

### 3. Enforcement

- **Code review**: reviewers must check new or changed `dependencies` / `devDependencies` in `packages/*/package.json` against the level rules.
- **Static checks (planned)**:
  - Add a simple script that builds a dependency graph from `package.json` files.
  - Fail CI when a package depends on a higher-level package.

## Consequences

- **Positive**
  - Clear, documented dependency rules for all `@a2a/*` packages.
  - Reduced risk of accidental coupling between UI / application and low-level utilities.
  - Easier refactoring and extraction of packages into other projects.

- **Trade-offs**
  - Some features may require introducing new shared packages instead of “just importing” from higher layers.
  - Slight overhead in maintaining and checking the dependency graph in CI.

