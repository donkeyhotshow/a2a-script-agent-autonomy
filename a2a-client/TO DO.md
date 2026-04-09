# A2A Client Monorepo Migration (Updated)

1. [x] packages/core/package.json, README.md, api-helpers.* created

2. [ ] Create remaining core files: a2a-*.mjs, agent-rag-*.mjs, etc. (22 files)

3. [ ] Update deps in sdk/web/vite-plugin package.json to @a2a/core workspace:*

4. [ ] Edit root package.json: workspaces remove \"shared\"

5. [ ] rm -rf shared/ packages/shared/ 

6. [ ] Search/replace imports '../../../shared/' → '../core/'

7. [ ] Test: npm i ; npm test

8. [ ] Split sdk (optional)

Status: Migrating files to packages/core
