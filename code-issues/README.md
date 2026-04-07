# code-issues/

Static findings from repo scans (TODO/FIXME, `@ts-ignore`, weak typing hotspots). One file = one trackable item. Move to `tasks/pending/` or fix in place when picked up.

**Scan hint:** `rg "FIXME|TODO:|@ts-ignore|@ts-expect-error" --glob "*.ts"`

| File | Topic |
|------|--------|
| `ai-integration-forward-timeout-unlimited-default.md` | proxy forward timeout 0 |
| `ai-integration-test-redirect-bare-except.md` | Python bare `except` |
| `a2a-server-node-builtins-import-prefix.md` | `http`/`fs`/`crypto`/`child_process` → `node:` |
| `a2a-sessions-sse-no-auth.md` | SSE events open |
| `api-registry-register-no-auth.md` | registry API no auth |
| `api-tools-evolve-unsafe-deploy.md` | `/evolve` deploy risks |
| `app-cors-origin-true-credentials.md` | permissive CORS |
| `app-express-json-body-limit-10mb.md` | large body limit |
| `bin-a2a-ts-ignore.md` | CLI `@ts-ignore` |
| `context-discovery-execsync-injection.md` | shell `grep` + user strings |
| `core-vision-tester-random-mock.md` | Vision QA `Math.random` |
| `dialog-cognition-stub-stores.md` | Cognition stub stores |
| `agent-registry-unbounded-registrations.md` | registry `Map` growth |
| `episodic-memory-eslint-suppressions.md` | DB layer `any` / require |
| `event-bus-session-buffers-unbounded.md` | EventBus session `Map` |
| `execute-command-allowlist-high-risk.md` | `node`/`curl`/docker on allowlist |
| `execution-script-runner-require.md` | dynamic `require` |
| `file-operations-validatePath-prefix-truncation.md` | path prefix `startsWith` |
| `gray-room-hardcoded-vite-preview-url.md` | vision screenshot URL |
| `gray-room-interrupt-handlers-console-warn.md` | gray room `console.warn` |
| `gray-room-handlers-context-as-any.md` | gray room casts |
| `invoke-route-ajv-any-casts.md` | invoke AJV `any` |
| `invoke-route-console-log-traffic.md` | `/invoke` `console.log` |
| `invoke-route-schema-validation-bypass.md` | invoke if schema missing |
| `llm-service-provider-fallback-to-compat_llm.md` | provider vs hub path |
| `message-service-in-memory-unbounded.md` | message `Map` unbounded |
| `p2p-libp2p-ts-ignore-and-any.md` | P2P `node.ts` + `crdt.ts` typing |
| `premium-ui-stream-interrupt-placeholder.md` | HITL interrupt stub |
| `premium-ui-thread-todo-usestream.md` | UI TODO |
| `prototype-agent-card-eslint-any.md` | prototype Card |
| `repo-map-service-blocking-sync-fs.md` | RepoMap sync FS |
| `request-service-math-random-ids.md` | weak request IDs |
| `requests-halt-endpoint-no-auth.md` | `halt` unauthenticated |
| `sdk-session-service-console-log.md` | SDK `console.log` |
| `sdk-session-transform-any.md` | session-transform `any` |
| `skill-lite-catch-err-any.md` | `catch (err: any)` |
| `skill-registry-schema-any.md` | SkillRegistry `any` |
| `server-crypto-fallback-default-key.md` | default encryption key |
| `server-error-details-node-env-unset.md` | errors if `NODE_ENV` unset |
| `server-helmet-csp-disabled.md` | Helmet CSP off |
| `server-metrics-endpoint-no-auth.md` | `/metrics` open |
| `swe-verifier-test-command-shell-exec.md` | `TEST_COMMAND` + `exec` |
| `task-flow-innerhtml-unescaped-store-error.md` | TaskFlow `innerHTML` |
| `tests-performance-monitor-ts-ignore.md` | test helper |
| `types-js-session-debug-warns.md` | session DEBUG warns |
| `vite-plugin-saveNewStep-deprecated-jsdoc.md` | misleading `@deprecated` |
| `vite-plugin-saveNewStep-files-path-traversal.md` | `files` keys vs `..` |
| `vite-plugin-storage-json-parse-throws.md` | storage `JSON.parse` |
| `vm2-deprecated-sandbox.md` | `vm2` unmaintained |
| `web-client-action-runner-eval.md` | `eval` / `new Function` |
| `web-packages-duplicate-js-trees.md` | duplicate `web/js` trees |
