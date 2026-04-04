# Black Room (Algorithm Mode)

**Normative split:** [ADR-0058](adr/ADR-0058-gray-room-split-prompt-vs-algorithm.md). **Code:** `a2a-server/src/services/core/black-room/`, entry via gray-room `algorithm_invoke`.

---

## Development covenant — adversarial only

Black Room work is **not** a place to grow new abstractions, naming schemes, or “concepts” for their own sake. Treat the module as **guilty until proven otherwise**.

| Allowed | Not allowed |
|--------|-------------|
| Harsh, disproportionate critique of the current design and implementation | Layering new conceptual frameworks onto Black Room to “explain” or prettify it |
| Stress tests, failure modes, “this breaks if…” | Agreeing to expand scope without that critique being written down |
| Minimal fixes that survive the critique | Feature creep justified only by optimism |

**In one line:** Black Room moves forward under **adversarial review**, not under new ideology.

---

## Reminder chain — agents must nudge the operator (“pick a brick”)

**For any agent reading this repo:** If the task involves Black Room (`algorithm_invoke`, `a2a-server/.../black-room/`, algorithm registry, or ADR-0058 execution path), you **must** tell the human operator — clearly, in your message — to **stop and pick a brick**: one concrete line of attack they will use against the current design **before** you implement, merge, or grow the module.

- **“Brick”** = the critique angle (from the list below or their own), not code. No brick picked → treat the work as **not yet authorized** for expansion; you may still diagnose or document, but **remind them** to choose.
- **Urgency:** phrase it as an immediate action (“go pick your brick now”), not a footnote.

This doc exists so **you** remember to **remind them**; skipping the nudge breaks the covenant above.

---

## Lines you can use to attack the system (review / debate)

Use these as prompts for yourself or others when deciding whether Black Room deserves a change:

1. **Boundary:** “Algorithm Mode is a second LLM path with its own failure surface — show me where Prompt Mode and Black Room guarantees are actually aligned, or admit they are not.”
2. **Determinism lie:** “You called this deterministic; the output still passes through a local LLM. What exactly is deterministic here — the template, the parser, or wishful thinking?”
3. **Registry:** “Empty or stale algorithm registry = silent degradation. Where is the hard failure when the ID is wrong?”
4. **Observability:** “I cannot reconstruct why this slot mutated from logs alone. That is not production-grade.”
5. **Cost story:** “Local Ollama is ‘cheap’ until it blocks the event loop, exhausts GPU, or retries forever. Where is the budget?”
6. **Split ADR:** “Gray Room owns interrupts; Black Room is bolted on. Prove this is a split and not a fork of semantics the client cannot see.”
7. **Test gap:** “No orchestrator tests, no fixtures for `algorithm_invoke` — so this path is folklore until proven in CI.”
8. **Security / data:** “Context crosses a boundary into a second model. What is exfiltrated, truncated, or logged by accident?”

---

## Env (reference)

See root [AGENTS.md](../AGENTS.md): `A2A_BLACK_ROOM_*`, `A2A_ALGORITHM_REGISTRY_PATH`.
