# Core Utilities

This directory contains core utilities that are shared across multiple A2A client packages but are not part of the public shared contract. These utilities provide foundational functionality for the A2A client ecosystem.

## Where each asset is loaded (code)

| File | Consumed in |
|------|-------------|
| `kv-unwrap.mjs` | Storage and cache utilities across packages |
| `node-errors.mjs` | Error handling utilities used throughout the codebase |

## Purpose

The core directory provides foundational utilities that are used internally by various A2A client packages. Unlike the shared directory which contains public contracts, core contains implementation details that may change between versions but are stable enough to be depended upon by multiple packages.

## Files

### `kv-unwrap.mjs`
Key-value storage unwrapping utilities for handling nested data structures in cache operations.

### `node-errors.mjs`
Node.js-specific error handling utilities that provide consistent error types and handling patterns across the codebase.

## Internal Usage

These utilities are intended for internal use within the A2A client package ecosystem. They are not part of the public API contract and may be refactored between versions. Packages depending on these utilities should ensure compatibility with their specific versions.