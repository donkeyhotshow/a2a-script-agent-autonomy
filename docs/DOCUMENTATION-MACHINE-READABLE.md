# Documentation: Machine-Readable First

This repository treats documentation as **machine input** (parsing and/or RAG indexing). Human readability is optional.

## Goals

- Deterministic parsing (stable structure, minimal ambiguity)
- High recall for RAG indexing (clear terminology, consistent identifiers)
- Low maintenance (templates and repeatable patterns)

## Writing Rules

1. Use explicit headings and predictable section names.
2. Prefer lists, tables, and structured blocks over free-form prose.
3. Keep terminology consistent (reuse the same names for the same concepts).
4. Prefer code blocks with JSON/YAML for schemas, examples, and contracts.
5. Avoid decorative content (emojis, excessive formatting, “marketing” text).

## Suggested Document Skeleton (Markdown)

```md
# <Title>

## Purpose
<1–3 short lines>

## Inputs
- ...

## Outputs
- ...

## Constraints
- ...

## Examples
```json
{ "example": true }
```

## References
- <file paths / identifiers>
```

## Indexing Notes

- Prefer stable identifiers in headings (e.g. `Action-Key Shape`, `Execute Types`)
- If a concept is important for retrieval, include its exact key/name (e.g. `execute.form.choices`, `read-file`)

