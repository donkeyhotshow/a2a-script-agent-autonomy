# Invoke route: `Ajv` / compiler typed as `any`

**File:** `a2a-server/src/routes/index.ts` (~lines 10, 37)

**Problem:** `new (Ajv as any)(…)` and `(validateInvokeRequestBody as any).errors` hide typing mistakes and weaken refactors around schema validation.

**Done when:** Proper `Ajv` generics or wrapper; typed `ValidateFunction` + `ErrorObject[]` from `ajv`.
