# DEV_STATE — Cross-Module State Summary

**Primary source:** Individual module DEV_STATE.md (e.g. a2a-client/DEV_STATE.md).  
**Root purpose:** High-level summary, iteration log, triangle workflow, normalization criteria. See [AGENTS.md](AGENTS.md), [GLOSSARY.md](GLOSSARY.md).

## Current Iteration Log (Summary)
**Doc reorganization (2024-10):** Moved AGENTS.md, GLOSSARY.md to docs/. Evidence: git diff, DOC-STATE.md.

**Full history:** git log DEV_STATE.md + module files.

## Triangle Workflow Reference
| Vertex | Layer | Alert |
|--------|-------|-------|
| A | Client | Blue/Orange/Teal |
| B | Server | Gray |
| C | Proxy | Black (proxy) |

**Red alert:** Run Task Monitor. See GLOSSARY.md *Alerts*.

## Next Offline Gates
- `npm run test:before-start`
- `npm run sim:lint -- --all`
- `npm run sim:validate -- --all`

**Archived summary from:** root DEV_STATE.md (2024-10, DOC-STATE). Full content in modules.

