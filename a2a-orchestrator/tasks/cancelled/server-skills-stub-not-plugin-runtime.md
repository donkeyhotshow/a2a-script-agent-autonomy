# Cancelled Task: Server-Side SkillRegistry Stub (Not a Plugin Runtime)

**Status:** CANCELLED  
**Cancellation date:** 2026-04-18  
**Reason:** A no-op SkillRegistry on the server is not a plugin runtime. The concept needs
to be moved to the orchestrator with a real interface.

---

## What was built

`a2a-server/packages/server/src/skills/SkillRegistry.ts`

```typescript
// [STUB] SkillRegistry — requires real implementation
export class SkillRegistry {
  register(_name: string, _skill: unknown): void {}
  get(_name: string): unknown { return null; }
  list(): string[] { return []; }
}
export const skillRegistry = new SkillRegistry();
```

A fully no-op stub that is instantiated by `tools-evolve.ts` with a custom path but never
does anything useful. The `skills/` directory in the server root contains only markdown
prompt templates (commit.md, debug.md, plan.md, review.md).

## Why this is wrong

1. **It's a stub that does nothing** — any code depending on it gets null/empty results.
2. **Skills (markdown prompts) are not the same as runtime plugins** — prompt templates
   belong in the orchestrator context assembly, not a server registry.
3. **Conflates two different things**: LLM prompt templates (`.md` files) and executable
   plugin hooks (code that runs before/after agent turns).
4. The server should not own a plugin registry. The orchestrator owns it.

## Where this should live

| Concern | Correct layer |
|---------|--------------|
| Prompt template library | `a2a-orchestrator/src/prompts/` or `a2a-server/skills/` (read-only) |
| Plugin (executable hook) registry | `a2a-orchestrator/src/plugin-runtime/plugin-manager.ts` |
| Plugin interface definition | `a2a-orchestrator/src/plugin-runtime/plugin.interface.ts` |

## Files affected

- `a2a-server/packages/server/src/skills/SkillRegistry.ts` — stub to be replaced
- `a2a-server/skills/*.md` — prompt templates (keep in place, they are correct as prompts)
- `a2a-server/packages/server/src/api/tools-evolve.ts` — imports SkillRegistry

## What can be reused

- The markdown skill files (commit.md, plan.md, debug.md, review.md) are correct prompt
  templates and should stay as-is in `a2a-server/skills/` or be moved to
  `a2a-orchestrator/src/prompts/`.

## Correct future implementation

See `a2a-orchestrator/src/plugin-runtime/plugin.interface.ts` for the canonical plugin
interface that replaces the stub SkillRegistry.
