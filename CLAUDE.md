# Agent Instructions

This file is read by all AI agents (Kiro, Cursor, Claude, Copilot, Cline).

## Project summary

A2A Script Agent is an autonomous AI operator workstation. Work proceeds through long-lived async sessions (Client API → A2A Server → AI Hub) via `/next` + `/async` polling — not one-shot HTTP to an LLM. The Task Monitor (`npm run monitor`) is the canonical driver for processing the `prompts-to-agent-mode/` queue.

## Before you start

1. Read `.kiro/steering/` — all files (product, tech-stack, structure, conventions, workflow)
2. Read `docs/DEV_STATE_ROOT.md` — current state and open questions
3. Read `tasks/` — pending work items
4. Read `AGENTS.md` — critical rules and quick reference

## Rules

- **No questions to user** — if unclear, document the assumption and continue
- Work from simple to complex
- One logical block at a time — test before moving on
- Silent errors are bugs: every catch must log
- No implicit `any`
- Imports require `.js` extension (NodeNext moduleResolution)
- `a2a-server` packages have no incoming deps from `a2a-client` packages
- Action-key shape: single type per response `{ "execute": {...} }` OR `{ "result": {...} }`
- Async-only transport: never add sync invoke or disable promise queue

## File locations

- Completed tasks → `tasks/completed/` or `tasks/_completed/`
- Deprecated files → `_deprecated/` (never delete)
- State → `docs/DEV_STATE_ROOT.md` (root), `docs/DEV_STATE_SERVER.md` (server)
- Architecture → `arch-map.json`
- Schema debugging → `tests/direct-tests/README.md`

## When you find a problem not in tasks/

Create a task file in `tasks/` and continue. Do not stop.

## Empty queue policy

"Nothing in queue" ≠ "work finished". Always: 1) Prune completed items, 2) Discover new work, 3) Write tasks. Then run Task Monitor if still empty.

## Evidence rule

Every iteration must record runtime evidence: run concrete check (test/session/curl/script), capture identifiers/signals, write to DEV_STATE. No evidence = no closure.

## Claude-specific

- Use extended thinking for architecture decisions
- Always update `docs/DEV_STATE_ROOT.md` after completing a phase
- For multi-turn work: keep one sessionId and run `/next` + poll `/async` until terminal
- Prefer `npm run monitor:once` over manual curl loops
