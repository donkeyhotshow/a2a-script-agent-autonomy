## Refactoring TODO: Split Monolithic Files

### Approved Plan Progress Tracker
**Status: 0/5 tasks complete** ✅ Plan approved by user ("делаем")

#### 1. Config Module Refactoring (Priority: High - Low Risk)
- [x] **1a. Refactor config/schema.ts → config/schemas/** ✅ (15 schema files <50 lines each)
  - Created helpers.ts, all domain schemas (<50 lines)
  - schemas/index.ts: full appConfigSchema + re-exports + helpers
  - schema.ts: re-export index
  - Updated types.ts, ports.ts for type compatibility
  - config/index.ts imports unchanged (compatible)
  - validate.ts unchanged
  - TS errors fixed (PortMetadata/ServiceKey exported)
- [ ] **1b. Refactor config/index.ts → 5 modules** (<100 lines each)
  - Create env-mapper.ts, loader.ts, computed.ts
  - Create validators/ (4 files + index.ts)
  - Update config/index.ts barrel
  - Tests: env-mapper.test.ts, loader.test.ts, validators/*.test.ts
- [ ] **1c. Update dependents** (types.ts, ports.ts, validate.ts)
- [ ] **1d. Test config/**: `npm test`, validateConfig(), server startup
- [ ] **1e. ✅ PR Ready**

#### 2. Request Processor Refactoring (Priority: Medium)
- [ ] **2a. Extract request-processor/router.ts** (determineRequestType, routeRequest)
- [ ] **2b. Extract timer.ts, recovery.ts, error-handler.ts**
- [ ] **2c. Update request-processor.service.ts → index.ts**
- [ ] **2d. Tests: router.test.ts, etc.**
- [ ] **2e. Smoke test: request processing**
- [ ] **2f. ✅ PR Ready**

#### 3. SDK Refactoring (Priority: Medium)
- [ ] **3a. Extract api-client.ts** (ApiClient class)
- [ ] **3b. Extract session-methods.ts, message-methods.ts, action-handlers.ts**
- [ ] **3c. Update sdk/src/index.ts barrel**
- [ ] **3d. Tests: extend api-client.test.js**
- [ ] **3e. Verify public API**
- [ ] **3f. ✅ PR Ready**

#### 4. RAG Refactoring (Priority: Low)
- [ ] **4a. Extract rag/src/factory.ts**
- [ ] **4b. Create rag/src/exports/index.ts** (grouped)
- [ ] **4c. Update rag/src/index.ts**
- [ ] **4d. Tests: protocol-rag-search.test.ts**
- [ ] **4e. ✅ PR Ready**

#### 5. Final Validation & Cleanup
- [ ] Run full stack: `start-all.bat`
- [ ] 100% test coverage: `npm test -- --coverage`
- [ ] Linting: `npm run lint`
- [ ] File sizes: All <100 lines
- [ ] ✅ Complete!

**Next Step: Start with 1a - config/schemas/ (safest first)**  
**Branch: blackboxai/refactor-config-schemas**

