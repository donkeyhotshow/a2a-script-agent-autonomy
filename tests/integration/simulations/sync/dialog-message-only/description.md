# Dialog — message-only step

## Purpose

Single-step fixture for **`execution.step: "message-only"`** on **`dialog`**: the server returns **`execute.message`** only (no `form`), with user text already in `context.history`.

## Scope

Minimal coverage by design: documents the **message-only** response shape for Web DTO / projection tests. For full router → dialog → multi-turn flows, see **`simulations/sync/dialog/`**.

## Pipeline

This step is typically **non-LLM** in the sim pipeline: `request.json` → `server-transforms-request.json` → `response.json` (see `simulations/SCHEMA.md`).

## Files

- `1/` — dialog task, history with one user message, synchronous `execute.message` assistant reply.
