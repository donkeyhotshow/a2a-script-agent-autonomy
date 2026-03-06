# Project Coding Rules (Non-Obvious Only)

- **Use .js extension for path aliases** - Imports like `import x from '@/services/x'` must use `.js` extension:
  `import x from '@/services/x.js'` (NodeNext module resolution in [`tsconfig.json`](a2a-server/tsconfig.json:4-5))
- **Actions use sub-actions with DSL** - Each action MD file contains sub-actions with TypeScript code blocks that run on client
