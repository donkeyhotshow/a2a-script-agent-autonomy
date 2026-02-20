# Task 013: architectural_features — document source

**Index:** [tasks/README.md](README.md)

---

## Problem

`architectural_features` feeds projectStructure for neuron activation. Who provides it? Client? Detector? If not provided, arch-triggered neurons never fire. No doc.

## Solution

Document in [a2a-client/docs/requirements.md](../a2a-client/docs/requirements.md) or [json-in-cmd.md](../json-in-cmd.md):
- Client sends `context.architectural_features: string[]` — e.g. from project detector (Laravel, FormRequest, Inertia)
- If absent, server uses empty array
- Example values: "Laravel", "FormRequest", "Inertia", "app/Models/"

Add to Request API examples. Client responsibility to populate from detector or manual config.

## Files

- [a2a-client/docs/requirements.md](../a2a-client/docs/requirements.md)
- [json-in-cmd.md](../json-in-cmd.md)

## Verification

Docs clearly state source and format.
