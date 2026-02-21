# Task 014: request_files — client resolution spec

**Index:** [tasks/README.md](README.md)

---

## Problem

Neurons request `["database/migrations/*", "app/Models/*.php"]`. Client must resolve to actual paths. No spec for glob vs exact path vs semantic search.

## Solution

Document in protocol:
- `request_files` items: exact path, glob (`*`), or semantic term
- Client resolves: exact → return file; glob → expand; semantic → search
- Format: `string[]` — client interprets each item

Add to [a2a-client/docs/requirements.md](../a2a-client/docs/requirements.md) § context.request_files.

## Files

- [a2a-client/docs/requirements.md](../a2a-client/docs/requirements.md)
- [neuron.types.ts](../a2a-server/src/knowledge/neurons/neuron.types.ts) — NeuronActionRequestFiles already has free-format comment

## Verification

Protocol doc specifies resolution rules.
