# Client packages: TypeScript migration + merge with a2a-client/src

## Scope

- **packages/** (`a2a-client/packages`): working JS; migrate to TS gradually.
- **src/** (`a2a-client/src`): TS server app (Express, phase machine, neurons). Plan merge and classify: **use on client** vs **remove**.

Boundary (from AGENTS.md): client = indexes, history, runs commands; server = logic, controls client. Code in `packages/` is client-side; `src/` is currently the server app (no `@a2a/*` imports).

---

## Part 1: Gradual TS migration (packages)

Order by dependency (leaf first):

| Order | Package       | Current        | Action |
|-------|---------------|----------------|--------|
| 1     | **types**     | ~~JS + JSDoc~~ → **TS** | Done: `src/index.ts`, build → `dist/`, CJS. |
| 2     | **fs-utils**  | ~~JS~~ → **TS** | Done: all modules `.ts`, build → `dist/`, tests use `dist/`. |
| 3     | **embedding** | ~~JS~~ → **TS** | Done: `src/index.ts`, build → `dist/`, CJS. |
| 4     | **script-runner** | ~~JS~~ → **TS** | Done: ESM, `vm2.d.ts`, build → `dist/`, tests pass. |
| 5     | **api-client**| ~~JS~~ → **TS** | Done: protocol, async-client, action-handler, index → `dist/`. |
| 6     | **rag**       | JS + types/    | Convert to `.ts`; consume @a2a/types, @a2a/fs-utils, @a2a/embedding. |
| 7     | **agent**     | JS + types/    | Convert to `.ts`; consume api-client, rag, fs-utils. |

Per-package steps:

- Add `tsconfig.json` (extends root if present): `module: NodeNext`, `moduleResolution: NodeNext`, emit to `dist/` or keep `src/` with emit.
- Rename `.js` → `.ts`; fix imports (use `.js` in imports for NodeNext if emit stays .js).
- Replace JSDoc-only or `*.d.ts` with real TS in `src`.
- Keep existing tests; run after each package.

---

## Part 2: src/ classification (use on client vs remove)

### 2.1 Use on client (align or reuse in packages)

| Area | Path | Use on client |
|------|------|----------------|
| **Types** | `src/types/index.ts`, `entity.types`, `workflow.types`, `knowledge.types`, `errors` | Single source: merge with `packages/types`. Client needs: `ContextBlock`, `Task`, `FileBlock`, `FileBlockRequest`, `ClientMessage`, `ServerMessage`, protocol errors. Entity/workflow/knowledge types used by server (neurons, phase machine) — keep in server or move shared subset to `@a2a/types`. |
| **Protocol – parsing** | `src/protocol/context-parser.ts` | **Useful.** Validation/parse of context block. Option: move to `packages/types` (e.g. `context-parser.ts`) or `packages/api-client` so client can validate incoming server messages. |
| **Protocol – message build** | `src/protocol/message-builder.ts` | Server-side only (builds server→client messages). Client does not need it. **Do not merge**; keep in src or remove if unused. |
| **Utils** | `src/utils/logger.ts`, `context.ts` (correlation) | Logger: generic; can copy pattern into packages (small shared util) or leave in src. Correlation: server request-scoped; **do not** move to client packages. |

### 2.2 Server-only (keep in src, do not merge into packages)

- `config/`, `middleware/`, `routes/`, `repositories/` (Prisma, Redis, DB).
- `services/`: request-processor, phase-machine, context-manager, neuron-activator, entity-recognizer, graph-store, session, request, auth, invoke, llm-router, file-cache, repo-map, watchdog, etc.
- `neurons/` (all).
- `app.ts`, `index.ts`.
- `ml/`: embedding.service, indexer.service, search.service, plexe.client, tfidf.service — depend on Prisma/repos; **server-only**. Client RAG lives in `packages/rag` + `packages/embedding`.

### 2.3 Remove (after merge / when redundant)

| Item | Reason |
|------|--------|
| Duplicate type definitions | Once `packages/types` is TS and canonical, remove duplicate protocol/context types from `src/types` and import from `@a2a/types` in src. |
| Unused or dead code in src | After server is wired to @a2a/types and (optional) context-parser, remove any duplicate validation/parsing in src. |
| Obsolete ml code | If server later uses client RAG (packages/rag) or a single embedding client, mark `src/ml` for removal and replace with @a2a/rag + @a2a/embedding. |

---

## Part 3: Merge steps (high level)

1. **Types**
   - Migrate `packages/types` to TS; export `ContextBlock`, `Task`, `FileBlock`, errors, etc.
   - In `src/`, replace local protocol types with `import from '@a2a/types'`; delete duplicated type code (or mark **удалить**).
2. **Context parser**
   - Decide: live in `packages/types` or `packages/api-client`.
   - Copy or move `context-parser.ts` into chosen package; have server import from there (or keep in src and later align API with client).
3. **Server**
   - Keep message-builder and all server-only services/neurons in src.
   - Optionally: later replace `src/ml` with @a2a/rag + @a2a/embedding and mark `src/ml` **удалить**.

---

## Checklist (summary)

- [x] packages: **types** → **fs-utils** migrated to TS (done).
- [x] **embedding**, **script-runner**, **api-client** migrated to TS.
- [ ] packages: rag → agent (TS migration).
- [ ] Single source for protocol/context types: `@a2a/types`.
- [ ] src: use `@a2a/types`; remove duplicate types (mark **удалить** where removed).
- [ ] context-parser: move to package or keep in src; document.
- [ ] message-builder: keep in src (server-only).
- [ ] Server-only: config, middleware, routes, repos, services, neurons, ml — no merge.
- [ ] Later: consider replacing src/ml with packages/rag + embedding; mark src/ml **удалить**.
