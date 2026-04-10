# Greedy dump (markdown-pipeline work import)

Branch: `greedy-dump`. Russian label: «жадная свалка» — consolidated queue to pull **scripts and automation** from `markdown-pipeline-automator/work` into **a2a-server script / action** surface (single action-key shape per AGENTS.md).

## Layout

| Path | Role |
|------|------|
| [SOURCE.md](SOURCE.md) | Canonical path to the original dump (read-only there). |
| [STATE.md](STATE.md) | Ordered progress: what was mirrored, what is next. |
| [TASK-TREE.md](TASK-TREE.md) | Tree of integration tasks (folder → subfolder). |
| [docs/DOCUMENTS-STATE.md](docs/DOCUMENTS-STATE.md) | Document / queue metadata (WMD-style ledger). |
| `mirror/` | Small stubs + manifests only; **no** multi-GB copies. |

## Goal

Queue every extractable script for implementation as **server-side actions** (or documented transforms), with rationale per slice. Originals stay on disk at the source path; this repo holds **tasks + minimal samples**.
