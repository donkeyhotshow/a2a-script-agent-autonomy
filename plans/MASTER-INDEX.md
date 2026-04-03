# Master index — action plans

## Files

| File | Notes |
|------|--------|
| [ACTIONS-TABLE.md](./ACTIONS-TABLE.md) | Laravel-oriented combined table (~60 rows) |
| [LARAVEL-11-ACTIONS-TABLE.md](./LARAVEL-11-ACTIONS-TABLE.md) | Laravel 11 stack detail (~83 rows) |
| [LARAVEL-STACK-CAPABILITIES.md](./LARAVEL-STACK-CAPABILITIES.md) | Short pointer (narrative retired) |
| [FRONTEND-ACTIONS.md](./FRONTEND-ACTIONS.md) | Frontend |
| [BACKEND-ACTIONS.md](./BACKEND-ACTIONS.md) | Backend |
| [DEVOPS-ACTIONS.md](./DEVOPS-ACTIONS.md) | DevOps |
| [TESTING-ACTIONS.md](./TESTING-ACTIONS.md) | Testing |
| [DATABASE-ACTIONS.md](./DATABASE-ACTIONS.md) | Database |
| [SECURITY-ACTIONS.md](./SECURITY-ACTIONS.md) | Security |
| [CODE-QUALITY-ACTIONS.md](./CODE-QUALITY-ACTIONS.md) | Code quality |
| [DOCUMENTATION-ACTIONS.md](./DOCUMENTATION-ACTIONS.md) | Documentation |
| [RECON-ACTIONS.md](./RECON-ACTIONS.md) | Recon / indexing actions |
| [PROJECT-CONTEXT-DETECTOR.md](./PROJECT-CONTEXT-DETECTOR.md) | `.a2a/*` context schema and activation flow |

Executors (in tables): **script** | **ollama** | **agent**.

## Pipeline (sketch)

1. **Detect** — scan repo → `.a2a/context.json`  
2. **Activate** — map tables → `.a2a/active-actions.json`  
3. **Run** — scripts, then LLM/agent where needed  
4. **Refresh** — react to repo changes  

There is no `cli.js` in this repo; treat the commands above as a target design, not shipped tooling.
