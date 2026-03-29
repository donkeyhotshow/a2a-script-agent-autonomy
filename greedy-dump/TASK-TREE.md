# Task tree (folder → subfolder)

Legend: `[ ]` open `[x]` done. Child tasks live in `mirror/<path>/TASK.md` or `SUBTREE.md`.

## Root

- [ ] **LEGACY-CODEBACE.zip** — `mirror/LEGACY-CODEBACE/` (reference only)
- [ ] **enggineered-prompts** — `mirror/enggineered-prompts/TASK.md`
  - [ ] `cursor-story` (from `!Cursor story`)
  - [ ] `ai-prompts-saver`
  - [ ] `aleon`
  - [ ] `cursor-agent-main`
  - [ ] `start-session`
- [ ] **obrabotano** — `mirror/obrabotano/TASK.md`
  - [ ] `node-terminal`
- [x] **priority-1** — `mirror/priority-1/TASK.md`
  - [x] `bootstrap-platform`
  - [x] `ml-integration`
- [x] **priority-2** — `mirror/priority-2/TASK.md`
   - [x] `a2a` (stub; actual agent repos in SOURCE)
   - [x] `agent.openrouter.ai`
   - [x] `laravel-agent-workspace-tools` (**Laravel: yes** — ✅ implemented 14 server actions)
- [ ] **priority-3** — `mirror/priority-3/TASK.md` + `SUBTREE.md` (19 apps)
- [ ] **priority-4** — empty placeholder — `mirror/priority-4/TASK.md`
- [ ] **priority-5** — `mirror/priority-5/TASK.md` + per-folder tasks
- [ ] **priority-6** — `mirror/priority-6/TASK.md`
  - [ ] `backup 0000` … `backup 0003`
  - [ ] `others`

## Dependency hint

Implement **priority-1** and **priority-2/a2a** before wide scraping of **priority-3** so shared A2A patterns land once.
