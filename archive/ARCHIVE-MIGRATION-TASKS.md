# Archive migration — 20 tasks

**Direction:** Gradually move unnecessary content/files to `archive/`.

---

## Batch 1 — Root (1–5)

1. **ID-NEURONS-UNIQUE.md** → `archive/` — 1000 neuron IDs exploratory; current system uses 8 neurons.
2. **docs/README.md** — remove broken links: LOADING.md, PROMPT-FOR-SESSION.md, SEQUENCE.md, json-in-cmd.md, plans/, tasks/, all-posible-concept-realisations.
3. **AGENTS.md** — remove links to SEQUENCE.md, tasks/, plans/; point to docs/README.md for payloads.
4. **docs/README.md** — add link to archive/ARCHIVE-MIGRATION-TASKS.md in archive section.
5. **docs/code-hierarchy.md** — remove refs to deleted knowledge/ if any.

---

## Batch 2 — Plans & tasks (6–10)

6. **plans/** — verify all in `archive/plans/`; create if missing from deleted git paths.
7. **tasks/** — verify in `archive/tasks/`; root tasks/ removed.
8. **.cursor/plans/** — move to `archive/.cursor-plans/` if any remain.
9. **json-in-cmd.md** — restore from git history to `archive/` if needed for reference.
10. **docs/README.md** — plans section: link to `archive/plans/` or remove if obsolete.

---

## Batch 3 — Client & server (11–15)

11. **a2a-client/TODO.md** → `archive/a2a-client/` (if exists).
12. **a2a-client/additional-commands-from-server.md** → `archive/a2a-client/` (if exists).
13. **a2a-server/TODO*.md** → `archive/a2a-server/` (if exist).
14. **a2a-server/docs/neurons-catalog.md** — keep if autogen; else → `archive/a2a-server/docs/`.
15. **a2a-server/src/** — grep for `knowledge/` imports; remove or redirect to services.

---

## Batch 4 — Docs & cleanup (16–20)

16. **docs/code-hierarchy-violations.md** — in archive; update docs/README if still linked.
17. **archive/README.md** — add plans/, tasks/, knowledge/, all-posible-concept-realisations to table.
18. **tttt/** — verify in archive; remove root tttt/ if any.
19. **output/** — .gitignore ok; move stale outputs to `archive/output/` if any.
20. **archive/README.md** — final index: what's where, why archived.

---

## Checklist

- [x] 1–5
- [x] 6–10
- [ ] 11–15 (a2a-client/TODO, a2a-server/TODO — не найдены)
- [x] 16–20

---

## Next phase (task 21)

[tasks/021-docs-single-source.md](tasks/021-docs-single-source.md) — Consolidate docs: one canonical source per concept. Remove duplicate explanations across AGENTS.md, docs/README, flow-graph-requests, neurons-and-paths-law. Each concept → single doc, others link.
