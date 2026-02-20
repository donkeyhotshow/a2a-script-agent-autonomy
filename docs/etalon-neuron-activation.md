# Etalon: Neuron Activation on new_task

**Index:** [docs/README.md](README.md) | **Law:** [neurons-and-paths-law.md](neurons-and-paths-law.md)

---

## θ (theta) — startup state

When `new_task` arrives, the initial state (θ) determines which neurons can activate. Different conditions produce different activation patterns.

---

## Etalon Scenarios

| Scenario | new_task | codeBlocks | arch | Result |
|----------|----------|------------|------|--------|
| **A. Short task, no files** | "fix bug" | [] | [] | 0 neurons (empty pool) |
| **B. Short task, with arch** | "add validation" | [] | [FormRequest, Laravel] | validation neuron (trigger in arch) |
| **C. Large task, no files** | Long description | [] | [...] | Same as B — task text now in pool |
| **D. Task + codeBlocks** | "refactor model" | [User.php, ...] | [...] | eloquent, auth, etc. from file content |
| **E. Task activates nothing** | "do something" | [] | [] | 0 neurons — fallback needed |

---

## Neuron "Plays" (Strategies)

1. **Content-triggered**: Match code patterns in `fileContents`. Example: eloquent, auth, validation.
2. **Task-triggered**: Match task keywords in `taskText`. Example: neuron with triggers `["validation", "rules"]` + task "add user validation".
3. **Fallback / bootstrap**: Always-active when pool is empty — requests `request_files` to gather context.
4. **Architecture-triggered**: Match `projectStructure` / `architectural_features`. Example: project-detector.

---

## Implementation

- `ActivationContext.taskText` — `new_task` joined, passed from `processNewTaskToContext` and `handleNewTask`.
- `buildContentPool` in neuron-activator includes `taskText` in the pool.
- Tests: [a2a-server/tests/unit/neuron-activator.test.ts](../a2a-server/tests/unit/neuron-activator.test.ts) — Etalon scenarios A, B, D, E.
