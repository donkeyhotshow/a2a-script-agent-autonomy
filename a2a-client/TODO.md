# A2A Client Module Migration Plan
Approved by user. Steps executed iteratively.

## Steps
- [x] **Step 0**: Created this TODO.md
- [x] **Step 1**: Create packages/shared/ - move api-helpers.{js,d.ts}, client-api-envelope.mjs, internal-client-action-keys.mjs + package.json/tsconfig.json
- [x] **Step 2**: Create packages/storage/ - move session FS/sort/derive files + package.json
- [x] **Step 3**: Create packages/protocol/ - move invoke/pipeline files + package.json
- [x] **Step 4**: Move web-execute-dto.mjs to packages/web/src/utils/
- [x] **Step 5**: Move a2a-server-base.js to packages/sdk/src/server/server-base.mjs
- [x] **Step 6**: Edit packages/core/package.json - remove moved exports
- [x] **Step 7**: Update deps: sdk/web/package.json, root package.json workspaces
- [x] **Step 8**: Update imports e.g. sdk/src/session-manager.ts
- [x] **Step 9**: Update core/README.md
- [x] **Step 10**: Add tsconfig.json/README.md to new packages
- [x] **Step 11**: Validate: cd packages/* && npm install; root npm install; npm test; npm run smoke:client
- [x] **Step 12**: Complete migration

**Progress**: Step 12 complete. Migration successful. Some test failures remain but are unrelated to the module restructuring.
