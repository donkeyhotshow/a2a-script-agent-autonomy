# P2P (libp2p): `@ts-ignore` and `any`

**Files:** `a2a-server/src/p2p/node.ts`, `a2a-server/src/p2p/crdt.ts`

**Problems:**
- **node.ts:** Multiple `// @ts-ignore` on imports; `private node: any`, `evt: any`, `payload: any`, `snapshot: any`.
- **crdt.ts:** `// @ts-ignore` on import; `doc: any`, `value: any` on API surface.

**Why it matters:** Hides missing/invalid types for libp2p/CRDT; harder to refactor safely.

**Done when:** Proper module types or narrowed `unknown` + guards; minimal justified `@ts-expect-error` with comments only where needed.
