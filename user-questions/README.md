# User questions (JSON catalogs)

**Intent:** these files are the working catalog of questions. Over time, answers confirmed in-repo become the **source of truth**; documentation should stay aligned (update docs when behavior changes, or update the catalog when docs are authoritative).

## Record shape (`schemaVersion` `1`)

| Field | Meaning |
|-------|---------|
| `id` | Stable id for the catalog file. |
| `schemaVersion` | `"1"` — bump when structure changes. |
| `title` | Human title. |
| `questions[]` | All items, **answered and unanswered on equal footing**. |

Each **question**:

| Field | Meaning |
|-------|---------|
| `id` | Stable id (unique within file). |
| `text` | Wording shown to the user / operator. |
| `status` | `unanswered` — no canonical answer yet; `answered_from_docs` — answer taken from existing documentation (cite in `answer`). |
| `options` | For `unanswered`: choices to collect a future answer (optional if free-form only). |
| `answer` | For `answered_from_docs`: canonical text + provenance. |

Each **answer** (when present):

| Field | Meaning |
|-------|---------|
| `text` | Canonical answer (short). |
| `sources` | One or more `{ "path": "relative/repo/path.md", "section": "optional heading or line hint" }`. |

## Layout

- `data/catalog-from-documentation.json` — questions **with** answers backed by current docs.
- `data/catalog-open-questions.json` — **unanswered** only (gaps to close).
- `samples/` — legacy option-only examples (no `status`); new work should prefer `data/`.
- `schema/catalog-v1.schema.json` — JSON Schema for validation.

## Workflow

1. Add **unanswered** rows where you need decisions or missing data.
2. When the answer exists in **AGENTS.md**, **README.md**, ADRs, etc., set `status` to `answered_from_docs`, fill `answer`, and keep `sources` accurate.
3. If the catalog and a doc disagree, fix one of them and record the change in git — the catalog is not a second truth unless the team agrees it overrides.
