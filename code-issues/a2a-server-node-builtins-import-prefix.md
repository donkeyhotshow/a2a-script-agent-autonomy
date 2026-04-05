# a2a-server: built-in modules without `node:` prefix

**Theme:** Prefer `node:` imports for NodeNext clarity and tooling consistency.

| Module | Example files / notes |
|--------|------------------------|
| `http` | `src/index.ts` — `import http from 'http'` → `node:http` |
| `fs` | `router-static.ts`, `SkillRegistry.ts`, `tools-evolve.ts`, `repo-map.service.ts`, `index.ts`, `simulation-request-processor.ts`, memory services |
| `crypto` | `episodic-memory.ts`, `experience-bank.ts`, `llm-judge.ts`, `cognitive-engine.ts`, `goal-planner.ts`, `event-bus.ts`, `utils/crypto.ts`, `Ultracontext.ts` |
| `child_process` | `SkillLite.ts`, `bug-fixer.ts`, `context-discovery.service.ts`, `swe-verifier.ts` (others already use `node:child_process` in places) |

**Done when:** `from 'node:…'` / `node:fs/promises` across `src/` as appropriate; verify no bundler regression.
