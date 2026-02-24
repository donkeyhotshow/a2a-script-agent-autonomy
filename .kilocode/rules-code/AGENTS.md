# Project Coding Rules (Non-Obvious Only)

- **Use .js extension for path aliases** - Imports like `import x from '@/services/x'` must use `.js` extension: `import x from '@/services/x.js'` (NodeNext module resolution)
- **Server does NOT store client data** - Graph is passed in context and returned in response; never persist client graph state
- **ActionProcessor for no-AI mode** - Actions defined in MD files under `a2a-server/src/actions/definitions/` are executed without AI calls
- **PhaseMachine drives request flow** - Phases: idle → discovery → recognition → analysis → action → validation → completed
