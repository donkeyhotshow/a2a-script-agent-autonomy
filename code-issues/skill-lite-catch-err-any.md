# SkillLite: `catch (err: any)`

**File:** `a2a-server/src/sandbox/SkillLite.ts`

**Problem:** `catch (err: any)` loses type safety; inconsistent with `unknown` + narrowing pattern used elsewhere.

**Done when:** `unknown` + `instanceof Error` / error shape guard.
