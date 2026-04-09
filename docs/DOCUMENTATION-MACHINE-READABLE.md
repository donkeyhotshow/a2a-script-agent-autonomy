# Documentation: Machine-Readable First

This repository treats documentation as **machine input** (parsing and/or RAG indexing). Human readability is optional.

## Goals

- Deterministic parsing (stable structure, minimal ambiguity)
- High recall for RAG indexing (clear terminology, consistent identifiers)
- Low maintenance (templates and repeatable patterns)

## Writing Rules

1. Use explicit headings and predictable section names.
2. Prefer lists, tables, and structured blocks over free-form prose.
3. Keep terminology consistent (reuse the same names for the same concepts).
4. Prefer code blocks with JSON/YAML for schemas, examples, and contracts.
5. Avoid decorative content (emojis, excessive formatting, “marketing” text).

## Suggested Document Skeleton (Markdown)

```md
# <Title>

## Purpose
<1–3 short lines>

## Inputs
- ...

## Outputs
- ...

## Constraints
- ...

## Examples
```json
{ "example": true }
```

## References
- <file paths / identifiers>

## Indexing Notes

- Prefer stable identifiers in headings (e.g. `Action-Key Shape`, `Execute Types`)
- If a concept is important for retrieval, include its exact key/name (e.g. `execute.form.choices`, `read-file`)
```

# @a2a-client: scoped web + vite-plugin (monorepo)

**Goal:** Treat `@a2a-client/web` as a first-class package under a clear `@a2a-client/*` scope, with a path from current layout to publishable artifacts. Align with existing `a2a-client/packages/*` (`@a2a/sdk`, `@a2a/types`, …) without breaking dev (`vite`, `start-all`, Client API on 5173).

**Current state:** Shell lives at **`a2a-client/packages/web`** (`@a2a-client/web`). Vite plugin at **`a2a-client/packages/vite-plugin`** (`@a2a-client/vite-plugin`, `index.js` + `routes`/`storage`/…). Root **`@a2a-client/root`** has **`build:web`**. Remaining: Vite lib mode / npm publish — see phases below.

**Definition of done (incremental):** Each phase has a verifiable step (build passes, `npm run dev` / smoke, or `npm test` in `a2a-client`).

---

## Phase 1 — Structure & naming

**Decision (2026-04-03, updated):** **`@a2a-client/web`** source is **`a2a-client/packages/web`**. **`vite.config.js`** / **`vite.config.prod.ts`** `root` is **`packages/web`**. Workspaces: `packages/*` (includes `packages/vite-plugin`; no separate `web` entry).

1. Decide scope split: **`@a2a-client/web`** + **`@a2a-client/vite-plugin`** vs folding into existing **`@a2a/sdk`** (document decision in this file or ADR if behavior crosses modules).
2. Optionally rename root workspace package to a scoped private name (e.g. `@a2a-client/root`) — **only** if tooling/docs/scripts are updated consistently (`package.json` names, CI, `devRoots`).
3. Plan physical moves:
    - `a2a-client/web` → `a2a-client/packages/web` (or keep `web/` but add real `exports` / build — pick one and stick to it).
    - [x] `a2a-client/packages/vite-plugin` → `a2a-client/packages/vite-plugin` (`@a2a-client/vite-plugin`).
4. Update root repo `devRoots` / docs if paths change (`package.json` at repo root lists `a2a-client/web`).

## Phase 2 — `@a2a-client/web` package

5. Author `packages/web/package.json`: `name`, `version`, `type: "module"`, `files`, `exports` map (even if initially `"."` → source or `dist/`). [x]
6. Wire Vite `root` / `index.html` entry to the new location; ensure `public` / static assets paths still resolve. [x]
7. Reduce reliance on globals (`window.__A2AApiHelpers`, script-tag-only loading) where feasible; prefer ES modules + explicit exports for anything meant to be consumed outside the app shell. [x]
8. Add a real **build** for library consumers (Rollup/Vite lib mode): output `dist/` + optional `.d.ts` (or JSDoc + `checkJs`). [x]

## Phase 3 — `@a2a-client/vite-plugin` package

9. [x] Plugin lives in **`a2a-client/packages/vite-plugin`** (`index.js`, `main`/`exports` → `./index.js`). Legacy **`vite-plugin-a2a/`** and root **`vite-plugin-a2a.js`** removed.
10. [x] **`vite.config.js`** already imports **`@a2a-client/vite-plugin`** (workspace); no root shim.
11. [x] **`packages/vite-plugin/README.md`** — env + proxy; imports to **`a2a-client/shared`** and **`packages/execution`** adjusted for extra directory depth.

## Phase 4 — Workspaces & scripts

12. Extend `a2a-client` `workspaces` to include new packages (e.g. `packages/web`, `packages/vite-plugin`).
13. Root scripts: `build --workspaces` or explicit `-w @a2a-client/web` / `-w @a2a-client/vite-plugin`; keep `dev`/`start-all` contract from [`docs/SYSTEM_STARTUP.md`](../../docs/SYSTEM_STARTUP.md).

## Phase 5 — Tests & CI

14. Relocate or re-path Playwright/Vitest configs if `web/` moves; run `a2a-client` tests + smoke Client API after each structural change.
15. Add minimal package-level `test`/`lint` where new code lives.

## Phase 6 — Publish (production)

16. Confirm npm org / scope **`@a2a-client`** (registry access, `publishConfig`).
17. **Publish whitelist:** `files` in each package; no accidental `storage/` or secrets.
18. Versioning: align with Changesets/Lerna or manual — document in [`a2a-client/DEV_STATE.md`](../../a2a-client/DEV_STATE.md) when first publish happens.
19. Post-publish: consumer example (`npm i @a2a-client/vite-plugin` + minimal `vite.config`), and note relationship to **ADR-0028** ([`docs/adr/ADR-0028-client-api-deployment-modes.md`](../../docs/adr/ADR-0028-client-api-deployment-modes.md)).

---

## References

- Current Vite root: [`a2a-client/vite.config.js`](../../a2a-client/vite.config.js) (`root: 'packages/web'`).
- Existing scoped packages: [`a2a-client/packages/sdk/package.json`](../../a2a-client/packages/sdk/package.json) (`@a2a/sdk`).