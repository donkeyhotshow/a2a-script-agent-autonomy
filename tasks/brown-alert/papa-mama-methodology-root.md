# Distill: `PAPA-MAMA.md` at repo root

## Artifact

- **Path:** [`PAPA-MAMA.md`](../../PAPA-MAMA.md) — methodology for **Papa** (direct / Client API tests) vs **Mama** (offline + `proba-servera` / indirect).

## Why (Brown)

The content is **real** and **canonical-worthy**, but sitting at root next to `README.md`/`AGENTS.md` is easy to miss and hard to discover from `docs/` or `tests/`.

## Actions

1. **Move** to a stable doc path, e.g. [`docs/TESTING-PAPA-MAMA.md`](../../docs/TESTING-PAPA-MAMA.md) — **or** [`tests/README.md`](../../tests/README.md) section with anchor.
2. **From root** `README.md` / [`tests/direct-tests/README.md`](../../tests/direct-tests/README.md), add **one** link to the new location.
3. **Leave** a tiny `PAPA-MAMA.md` stub at root **only** if you want a permanent redirect note (optional).

## Done when

Methodology lives under `docs/` or `tests/` with a clear link; no duplicate long-form copies.
