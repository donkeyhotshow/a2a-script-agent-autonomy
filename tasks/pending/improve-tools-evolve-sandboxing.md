# Improve sandboxing in tools-evolve endpoint

**Purpose:** Replace the primitive sandbox check in the tools-evolve endpoint with proper isolated VM sandboxing to prevent arbitrary code execution.

**Location:** `a2a-server/src/api/tools-evolve.ts`

**Current Implementation Issues:**
- Line 30-31: `// TODO: Implement proper sandboxing with isolated VM (e.g., vm2 replacement or Node vm with restrictions)`
- Line 31: Primitive check `const isSafe = !toolCode.includes('process.exit');` is insufficient
- This allows potential arbitrary code execution if malicious code is submitted

**Required Changes:**
1. Replace primitive string check with proper sandboxing using:
   - Option 1: `vm2` library (if available in project) for isolated context
   - Option 2: Node.js `vm` module with careful context restriction
   - Option 3: External process isolation (more secure but heavier)

2. Implement proper validation that:
   - Restricts access to dangerous Node.js built-ins (process, require, etc.)
   - Limits available globals to only what's needed for tool execution
   - Prevents file system access beyond intended directories
   - Blocks infinite loops or resource exhaustion attempts

3. Maintain API compatibility - endpoint should still accept toolName and toolCode and return deployment status

**Acceptance Criteria:**
- [ ] Replace TODO comment with proper sandbox implementation
- [ ] Sandbox prevents execution of dangerous code (process.exit, require('fs'), etc.)
- [ ] Sandbox allows legitimate tool code to execute safely
- [ ] Existing tests still pass
- [ ] Add security test cases for the sandbox
- [ ] Update DEV_STATE.md with evidence of fix

**References:**
- Current file: `a2a-server/src/api/tools-evolve.ts`
- Similar patterns may exist in: skill-evolver.ts or other dynamic code loading areas
- Security best practices for Node.js vm module usage

**Priority:** High (security vulnerability)
<environment_details>
Current time: 2026-04-07T20:41:48+03:00
</environment_details>