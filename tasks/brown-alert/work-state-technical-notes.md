# Distill: long-form technical notes in `work/STATE.md`

## Artifact

- **Path:** [`work/STATE.md`](../../work/STATE.md) — mixes **personal queue table** (S1–S20) with **deep-dive sections** (“Путь к LLM”, “Токены”, “Скелеты”, “Gray room”, etc.).

## Why (Brown)

Durable **architecture notes** buried in a “work state” file are **undistilled**; they should live in `docs/` or ADRs if they remain true.

## Actions

1. **Identify** sections that are **stable** (not personal status) → move to e.g. `docs/` or `a2a-server/docs/` with cross-links from `work/STATE.md`.
2. **Keep** in `work/STATE.md` only: queue table, short pointers, **current** focus.
3. **Prune** outdated technical claims after migration (or mark Amber if doc/code mismatch).

## Done when

`work/STATE.md` is lean; lasting knowledge lives under `docs/` with a single link from the work file.
