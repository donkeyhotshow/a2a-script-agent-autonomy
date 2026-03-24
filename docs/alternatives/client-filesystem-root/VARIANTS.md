# Client API filesystem root — application variants

**Last reviewed:** 2026-03-24

## Constraints (invariants)

- SDK uses **A2A_CLIENT_STORAGE_DIR** or falls back to user home under `.a2a-client` (`a2a-client/packages/sdk/src/server/services/session-storage.ts`). Vite uses `getStorageRoot()` in the plugin.

## Context

Pick where session KV and artifacts live: OS home, explicit env path, or workspace directory. Affects backups, CI isolation, and multi-repo setups.

## Variants

| ID | Variant | Summary | Fit notes |
|----|---------|---------|-----------|
| `home-default` | Default SDK path | Data under user home `.a2a-client` when env unset. | Persists across projects. |
| `env-explicit` | A2A_CLIENT_STORAGE_DIR | Per pipeline or per machine root. | Used in client integration tests. |
| `repo-bundled` | Workspace storage | e.g. `a2a-client/storage` for Vite. | Easy to inspect; watch gitignore. |

### `home-default`

- **Use when:** single developer quick start.
- **Cost / risk:** collisions without env override.
- **Status:** candidate

### `env-explicit`

- **Use when:** CI, Docker, tenant separation.
- **Cost / risk:** every process must set env.
- **Status:** candidate

### `repo-bundled`

- **Use when:** artifacts should live in the clone.
- **Cost / risk:** accidental commits.
- **Status:** candidate

## Current selection (this repo)

- [ ] `home-default`
- [ ] `env-explicit`
- [ ] `repo-bundled`

**Where it applies:** SDK vs Vite (may differ)

**Notes:**

## Implementation backlog

- [ ] Single table: Vite storage root vs A2A_CLIENT_STORAGE_DIR.

## Related

- `a2a-client/vite-plugin-a2a.js`
- `a2a-client/packages/sdk/src/server/services/session-storage.ts`

## Open questions

- …
