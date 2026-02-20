# ADR 0022: File block format

## Status

accepted

## Date

2026-02-20

## Context

Serialize file content in messages. requirements.md §5.2.

## Decision

- Markdown: ` ```file:path\ncontent\n``` ` or ` ```file:path:start-end\ncontent\n``` `
- `serializeFileBlock(path, content, startLine?, endLine?)`
- `parseFileBlock(text)` — regex extract
- `detectLanguage(path)` — extension map (.php, .vue, .ts, …)
- Requests API: `codeBlocks: [{ path, content }]` — no range

## Consequences

- Range support for partial files
- protocol.js and file-block-handler share format
