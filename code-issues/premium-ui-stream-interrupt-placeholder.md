# premium-ui `useA2AStream`: interrupt not wired

**File:** `a2a-client/packages/premium-ui/src/hooks/useA2AStream.ts` (~line 87)

**Problem:** State exposes `interrupt: null` with comment “Placeholder for A2A HITL” — human-in-the-loop / cancel is not implemented in this hook.

**Done when:** Wire to Client API / protocol interrupt when defined; remove placeholder or gate behind feature flag.
