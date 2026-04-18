# A2A Protocol Package

This package contains the core A2A protocol implementations including invoke builders, pipelines, and router logic.

## Files

- `a2a-invoke-builders.mjs` - Functions for building A2A invoke payloads
- `context-invoke-patch.mjs` - Utilities for patching invoke contexts
- `dialog-invoke-history.mjs` - History tracking for dialog invokes
- `next-invoke-pipeline.mjs` - Pipeline processing for next invokes
- `router-submit.mjs` - Router submit handling and normalization

## Usage

These modules are used by the SDK and Vite plugin to handle A2A protocol operations.