# SkillRegistry: `schema: any`

**File:** `a2a-server/src/skills/SkillRegistry.ts`

**Problem:** `SkillMeta.schema` is `any` — no validation at compile time for skill JSON shape.

**Done when:** `unknown` + Zod/JSON Schema type, or a narrow `Record<string, unknown>` interface.
