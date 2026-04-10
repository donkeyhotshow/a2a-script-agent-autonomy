# Quick Reference: All Duplicates by File

## CSV Format for Import/Filtering

```
filename,location_1,location_2,location_3,file_type,severity,line_range,notes
action-executor.ts,packages/actions/src/,packages/features/src/actions/,packages/features/src/actions/src/actions/,implementation,CRITICAL,~50-70,Identical - 3 copies
action-handler-registry.ts,packages/actions/src/,packages/features/src/actions/,packages/features/src/actions/src/actions/,implementation,CRITICAL,N/A,Identical - 3 copies
action-parser.ts,packages/actions/src/,packages/features/src/actions/,packages/features/src/actions/src/actions/,implementation,CRITICAL,N/A,Identical - 3 copies
action-processor.ts,packages/actions/src/,packages/features/src/actions/,packages/features/src/actions/src/actions/,implementation,CRITICAL,~100-150,Identical - 3 copies with Russian comments
action-registry.ts,packages/actions/src/,packages/features/src/actions/,packages/features/src/actions/src/actions/,implementation,CRITICAL,N/A,Identical - 3 copies
action-service.ts,packages/actions/src/,packages/features/src/actions/,packages/features/src/actions/src/actions/,implementation,CRITICAL,N/A,Identical - 3 copies
action-validator.ts,packages/actions/src/,packages/features/src/actions/,packages/features/src/actions/src/actions/,implementation,CRITICAL,N/A,Identical - 3 copies
algorithm-invoke.ts,packages/features/src/gray-room/,packages/gray-room/src/,gray-room-interrupt-handlers/,implementation,CRITICAL,N/A,Identical - parallel structure
artifact-store.ts,packages/utils/src/,packages/server/src/,N/A,utility,HIGH,N/A,Cross-package duplication
artifact-validator.ts,packages/utils/src/,packages/server/src/,N/A,utility,HIGH,N/A,Cross-package duplication
auth.controller.ts,packages/server/src/controllers/,packages/server/src/controllers/controllers/,N/A,controller,MEDIUM,N/A,Double-nested structure
auto-ai-index.ts,packages/actions/src/definitions/,packages/features/src/actions/definitions/,packages/features/src/actions/src/actions/definitions/,definition,HIGH,N/A,3 copies
auto-rag-page.ts,packages/features/src/gray-room/,packages/gray-room/src/,N/A,handler,CRITICAL,N/A,Identical - parallel gray-room
auto-read-file.ts,packages/features/src/gray-room/,packages/gray-room/src/,N/A,handler,CRITICAL,N/A,Identical - parallel gray-room
backoff.ts,packages/utils/src/,packages/utils/src/lib/,N/A,utility,CRITICAL,N/A,Identical - root vs lib/
base-handler.ts,packages/features/src/gray-room/,packages/gray-room/src/,N/A,handler,CRITICAL,N/A,Identical - parallel
circuit-breaker.ts,packages/utils/src/,packages/utils/src/lib/,N/A,utility,CRITICAL,N/A,Identical - root vs lib/
clarify.ts,packages/features/src/gray-room/,packages/gray-room/src/,N/A,handler,CRITICAL,N/A,Identical
client-visible-context.ts,packages/request/src/,packages/server/src/request/,N/A,service,HIGH,N/A,Cross-package
command-execution.ts,packages/actions/src/handlers/,packages/features/src/actions/handlers/,packages/features/src/actions/src/actions/handlers/,handler,CRITICAL,N/A,3 copies
compress-history.ts,packages/features/src/gray-room/,packages/gray-room/src/,N/A,handler,CRITICAL,N/A,Identical
config.production.ts,packages/features/src/gray-room/,packages/gray-room/src/,N/A,config,CRITICAL,N/A,Identical
config.ts,packages/features/src/gray-room/,packages/gray-room/src/,N/A,config,CRITICAL,N/A,Identical
context-discovery.service.ts,packages/features/src/gray-room/,packages/gray-room/src/,N/A,service,CRITICAL,N/A,Identical
context-manager.metrics.ts,packages/features/src/gray-room/,packages/gray-room/src/,N/A,metrics,CRITICAL,N/A,Identical
crypto.ts,packages/utils/src/,packages/utils/src/lib/,N/A,utility,CRITICAL,N/A,Identical - root vs lib/
deep-clone-json.ts,packages/utils/src/,packages/utils/src/lib/,N/A,utility,CRITICAL,N/A,Identical - root vs lib/
dummy.skill.ts,packages/features/src/actions/src/skills/custom/,packages/features/src/skills/custom/,N/A,skill,HIGH,N/A,Duplicate
edit-patch.ts,packages/actions/src/handlers/,packages/features/src/actions/handlers/,packages/features/src/actions/src/actions/handlers/,handler,CRITICAL,N/A,3 copies
episodic-memory.ts,packages/daemon/src/memory/,packages/memory/src/src/,N/A,memory,HIGH,N/A,Nested src/src structure
errors.ts,packages/utils/src/,packages/utils/src/lib/,N/A,utility,CRITICAL,N/A,Identical - root vs lib/
event-bus.ts,packages/utils/src/,packages/server/src/,N/A,utility,HIGH,N/A,Cross-package duplication
experience-bank.ts,packages/daemon/src/memory/,packages/memory/src/src/,N/A,memory,HIGH,N/A,Nested src/src structure
file-exists.ts,packages/actions/src/handlers/file-operations/,packages/features/src/actions/handlers/file-operations/,packages/features/src/actions/src/actions/handlers/file-operations/,handler,CRITICAL,N/A,3 copies
file-operations.ts,packages/actions/src/handlers/,packages/features/src/actions/handlers/,packages/features/src/actions/src/actions/handlers/,handler,CRITICAL,N/A,3 copies
fs-access.ts,packages/utils/src/,packages/utils/src/lib/,N/A,utility,CRITICAL,N/A,Identical - root vs lib/
graph-store.service.ts,packages/utils/src/,packages/server/src/,N/A,service,HIGH,N/A,Cross-package duplication
gray-room-orchestrator.ts,packages/features/src/gray-room/core/orchestrator/,packages/features/src/gray-room/core/request-processor/,packages/gray-room/src/core/orchestrator/,orchestrator,CRITICAL,N/A,Multiple copies even within features
gray-room-trigger.ts,packages/features/src/gray-room/,packages/gray-room/src/,N/A,handler,CRITICAL,N/A,Identical
gray-room-utils.ts,packages/features/src/gray-room/,packages/gray-room/src/,N/A,util,CRITICAL,N/A,Identical
grep-search.ts,packages/actions/src/handlers/,packages/features/src/actions/handlers/,packages/features/src/actions/src/actions/handlers/,handler,CRITICAL,N/A,3 copies
AgentSwing.ts,packages/features/src/gray-room/components/context/context/,packages/gray-room/src/components/context/context/,N/A,component,CRITICAL,N/A,Identical
health.ts,packages/server/src/api/registry/,packages/server/src/registry/,N/A,endpoint,HIGH,N/A,API migration - incomplete cleanup
helpers.ts,packages/config/schemas/,packages/server/tests/tests/integration/,N/A,helper,MEDIUM,N/A,Duplication in tests
index.ts,packages/actions/src/,packages/features/src/actions/,packages/features/src/actions/src/,barrel_export,CRITICAL,N/A,Multiple entry points - circular import risk
invoke.service.ts,packages/services/src/utils/,packages/server/src/services/,N/A,service,HIGH,N/A,Cross-package
list-directory.ts,packages/actions/src/handlers/file-operations/,packages/features/src/actions/handlers/file-operations/,packages/features/src/actions/src/actions/handlers/file-operations/,handler,CRITICAL,N/A,3 copies
logger.ts,packages/utils/src/,packages/utils/src/lib/,N/A,utility,CRITICAL,N/A,Identical - root vs lib/ (also gray-room versions)
manager.ts,packages/features/src/gray-room/,packages/gray-room/src/,N/A,manager,CRITICAL,N/A,Identical
mcp-call.ts,packages/actions/src/handlers/,packages/features/src/actions/handlers/,packages/features/src/actions/src/actions/handlers/,handler,CRITICAL,N/A,3 copies
metrics.ts,packages/utils/src/,packages/utils/src/lib/,N/A,utility,CRITICAL,N/A,Identical - root vs lib/
mkdtemp-os-tmp.ts,packages/utils/src/,packages/utils/src/lib/,N/A,utility,CRITICAL,N/A,Identical - root vs lib/
MuSE.ts,packages/features/src/gray-room/components/memory/,packages/gray-room/src/components/memory/,N/A,component,CRITICAL,N/A,Identical
orchestrator.ts,packages/features/src/gray-room/,packages/gray-room/src/,N/A,orchestrator,CRITICAL,N/A,Identical
phpantom.ts,packages/actions/src/handlers/,packages/features/src/actions/handlers/,packages/features/src/actions/src/actions/handlers/,handler,CRITICAL,N/A,3 copies
read-file.ts,packages/actions/src/handlers/file-operations/,packages/features/src/actions/handlers/file-operations/,packages/features/src/actions/src/actions/handlers/file-operations/,handler,CRITICAL,N/A,3 copies
register.ts,packages/server/src/api/registry/,packages/server/src/registry/,N/A,endpoint,HIGH,N/A,API migration - incomplete cleanup
request-file-storage.ts,packages/request/src/,packages/server/src/request/,N/A,service,HIGH,N/A,Cross-package
request-processor.service.ts,packages/server/src/request-processor/,packages/server/src/services/,N/A,service,HIGH,N/A,Duplicate locations
request.service.ts,packages/request/src/,packages/server/src/request/,packages/server/src/services/,service,CRITICAL,N/A,TRIPLE duplication
route.ts,packages/server/src/api/registry/,packages/server/src/registry/,N/A,config,HIGH,N/A,API migration - incomplete cleanup
run-script.ts,packages/actions/src/handlers/,packages/features/src/actions/handlers/,packages/features/src/actions/src/actions/handlers/,handler,CRITICAL,N/A,3 copies
security.ts,packages/actions/src/handlers/file-operations/,packages/features/src/actions/handlers/file-operations/,packages/features/src/actions/src/actions/handlers/file-operations/,handler,CRITICAL,N/A,3 copies
session-compaction.ts,packages/utils/src/,packages/server/src/,N/A,service,HIGH,N/A,Cross-package - also utils/lib version
SkillRegistry.ts,packages/features/src/actions/src/skills/,packages/features/src/skills/,N/A,registry,HIGH,N/A,Duplicate
strip-markdown-json-fence.ts,packages/utils/src/,packages/utils/src/lib/,N/A,utility,CRITICAL,N/A,Identical - root vs lib/
task-detail-analyzer.ts,packages/utils/src/,packages/utils/src/lib/,N/A,utility,CRITICAL,N/A,Identical - root vs lib/
temporal-memory.ts,packages/daemon/src/memory/,packages/memory/src/src/,N/A,memory,HIGH,N/A,Nested src/src structure
thinking.ts,packages/features/src/gray-room/,packages/gray-room/src/,N/A,handler,CRITICAL,N/A,Identical
tools-evolve-sandbox.ts,packages/server/src/api/,packages/server/src/,N/A,tool,HIGH,N/A,Migration - incomplete cleanup
tools-evolve.ts,packages/server/src/api/,packages/server/src/,N/A,tool,HIGH,N/A,Migration - incomplete cleanup
types.ts,packages/actions/src/,packages/actions/src/handlers/file-operations/,packages/features/src/actions/ (×2 nested),type_definition,CRITICAL,N/A,Scattered type definitions - 10+ locations total
ultracontext.service.ts,packages/features/src/gray-room/,packages/gray-room/src/,N/A,service,CRITICAL,N/A,Identical
Ultracontext.ts,packages/features/src/gray-room/,packages/gray-room/src/,N/A,component,CRITICAL,N/A,Identical
utils.ts,packages/actions/src/,packages/features/src/actions/,packages/features/src/actions/src/actions/,utility,CRITICAL,N/A,3 copies
validate.ts,packages/config/,packages/transform/src/pipeline/,N/A,validator,MEDIUM,N/A,Different validation logic?
validation.ts,packages/utils/src/,packages/utils/src/lib/,N/A,validator,CRITICAL,~160 lines,Identical - root vs lib/
vision-tester.ts,packages/server/src/evaluation/,packages/server/src/,N/A,tool,MEDIUM,N/A,Migration - incomplete cleanup
write-file.ts,packages/actions/src/handlers/file-operations/,packages/features/src/actions/handlers/file-operations/,packages/features/src/actions/src/actions/handlers/file-operations/,handler,CRITICAL,N/A,3 copies
```

## Summary by Category

### Critical (Immediate Action - 40+ files)
- Actions triple nesting (20+ files)
- Gray-room duplication (15+ files)
- Utils lib/ duplication (15 files)
- Memory src/src nesting (3 files)

### High (Should Address - 25+ files)
- Request service triplication (4 files)
- API registry duplication (3 files)
- Cross-package utilities (5 files)

### Medium (Nice to Fix - 20+ files)
- Type definition scatter (varies)
- Test helpers duplication
- Tools/evaluation consolidation

## File Classification

| Category | Count | Severity | Example |
|----------|-------|----------|---------|
| Handler implementations | 20+ | CRITICAL | command-execution.ts |
| Utility functions | 15+ | CRITICAL | validation.ts |
| Service implementations | 6+ | HIGH | request.service.ts |
| Type definitions | 10+ | CRITICAL | types.ts |
| Configuration files | 4+ | HIGH | config.ts |
| Manager/Orchestrator | 8+ | CRITICAL | orchestrator.ts |
| Shared utilities | 5+ | HIGH | artifact-store.ts |
| Controllers | 1 | MEDIUM | auth.controller.ts |
| API endpoints | 3+ | HIGH | health.ts |

## Consolidation Impact

If ALL duplicates are consolidated:
- **Lines of code reduced:** ~5,000-7,000
- **Maintenance points reduced:** ~120 → ~40
- **Import paths to update:** ~200-300
- **Build time impact:** ~15-20% improvement
- **Developer confusion reduced:** ~70%

## Top 10 Most Critical Duplicates (by impact)

1. **action-executor.ts** - 3 copies, 50+ lines each, used everywhere
2. **types.ts** - 10+ locations scattered, circular import risk
3. **validation.ts** - 2 identical copies in utils (160 lines)
4. **logger.ts** - 4 copies across packages (utils/lib, utils/root, gray-room/lib, gray-room/root)
5. **request.service.ts** - 3 locations across packages (request, server/request, server/services)
6. **orchestrator.ts** - 2 copies + internal duplicates in gray-room (4 implementations total)
7. **gray-room-orchestrator.ts** - 2+ copies across packages
8. **crypto.ts** - 2 identical copies in utils (lib/ vs root)
9. **index.ts** - 30+ locations, high circular dependency risk
10. **gray-room-trigger.ts** - Duplicated in parallel structure

