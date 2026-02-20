# Task 011: ADR 0008 — align with content-based triggers ✓

**Status:** Done. ADR updated.

**Index:** [tasks/README.md](README.md) | **Law:** [neurons-and-paths-law.md](../docs/neurons-and-paths-law.md) | **ADR:** [0008-laravel-neurons.md](../docs/adr/0008-laravel-neurons.md)

---

## Problem

[ADR 0008](../docs/adr/0008-laravel-neurons.md) says "Triggers match path substrings (e.g. `app/Models/`)". Actual implementation: triggers match **content** (FormRequest, extends Model, belongsTo). [neurons-and-paths-law](../docs/neurons-and-paths-law.md) requires content-based triggers.

## Solution

Update ADR 0008: replace "path substrings" with "content-based (code patterns, keywords)". Add note: paths in `store` are conventions only, not triggers.

## Files

- [docs/adr/0008-laravel-neurons.md](../docs/adr/0008-laravel-neurons.md)

## Verification

ADR text matches implementation (content-based) and [neurons-and-paths-law](../docs/neurons-and-paths-law.md).
