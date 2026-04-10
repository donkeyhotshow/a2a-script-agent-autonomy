# Import Migration Report

Generated: 10.04.2026, 19:24:09

## Summary

- **Total files analyzed:** 596
- **Files with imports:** 372
- **Total imports:** 1143
- **Imports needing migration:** 198

## Migration by Duplicate Type

| Duplicate Type | Count |
|---------------|-------|
| packages/features/src/actions/ | 92 |
| packages/features/src/gray-room/ | 85 |
| packages/server/src/services/ | 11 |
| packages/server-utils/src/lib/ | 4 |
| packages/server/src/api/registry/ | 3 |
| packages/server/src/request/ | 3 |

## Files Requiring Changes

### 1. a2a-server\packages\server\src\index.ts

**Issues:** 4

**1. Line 11:**
```typescript
import { algorithmRegistry } from "./services/core/black-room/algorithm-registry.js";
```
**Suggested:** `..\..\request\src`

**2. Line 13:**
```typescript
import { globalArtifactStore } from "./services/core/artifact-store.js";
```
**Suggested:** `..\..\request\src`

**3. Line 15:**
```typescript
import { ultraContextService } from "./services/context/ultracontext.service.js";
```
**Suggested:** `..\..\request\src`

**4. Line 16:**
```typescript
import { peerRelay } from "./services/p2p/relay.js";
```
**Suggested:** `..\..\request\src`

### 2. a2a-server\packages\server\src\app.ts

**Issues:** 3

**1. Line 12:**
```typescript
import registryRegisterRouter from './api/registry/register.js';
```
**Suggested:** `./registry`

**2. Line 13:**
```typescript
import registryRouteRouter from './api/registry/route.js';
```
**Suggested:** `./registry`

**3. Line 14:**
```typescript
import registryHealthRouter from './api/registry/health.js';
```
**Suggested:** `./registry`

### 3. a2a-server\packages\server-utils\src\lib\validation.ts

**Issues:** 1

**1. Line 2:**
```typescript
import {logger} from './logger.js';
```
**Suggested:** `..`

### 4. a2a-server\packages\server-utils\src\lib\retry.ts

**Issues:** 1

**1. Line 6:**
```typescript
import { logger } from './logger.js';
```
**Suggested:** `..`

### 5. a2a-server\packages\server-utils\src\lib\circuit-breaker.ts

**Issues:** 1

**1. Line 6:**
```typescript
import { logger } from './logger.js';
```
**Suggested:** `..`

### 6. a2a-server\packages\server-utils\src\lib\backoff.ts

**Issues:** 1

**1. Line 13:**
```typescript
import { logger } from './logger.js';
```
**Suggested:** `..`

### 7. a2a-server\packages\server\src\routes\sessions.routes.ts

**Issues:** 1

**1. Line 6:**
```typescript
import {stripServerInternalWorkbenchFromContext} from '../services/core/request/client-visible-context.js';
```
**Suggested:** `..\..\..\request\src`

### 8. a2a-server\packages\server\src\routes\requests.routes.ts

**Issues:** 2

**1. Line 10:**
```typescript
import {requestService} from '../services/core/request/request.service.js';
```
**Suggested:** `..\..\..\request\src`

**2. Line 12:**
```typescript
import {clientSafeWorkbench} from '../services/core/request/client-visible-context.js';
```
**Suggested:** `..\..\..\request\src`

### 9. a2a-server\packages\server\src\routes\index.ts

**Issues:** 1

**1. Line 6:**
```typescript
import {invoke} from '../services/utils/invoke.service.js';
```
**Suggested:** `..\..\..\request\src`

### 10. a2a-server\packages\server\src\request\request.service.ts

**Issues:** 2

**1. Line 9:**
```typescript
import {RequestFileStorage} from './request-file-storage.js';
```
**Suggested:** `..\..\..\request\src`

**2. Line 10:**
```typescript
import {sanitizeRequestResultForStorage} from './client-visible-context.js';
```
**Suggested:** `..\..\..\request\src`

### 11. a2a-server\packages\server\src\request\index.ts

**Issues:** 1

**1. Line 1:**
```typescript
export * from './request.service.js';
```
**Suggested:** `..\..\..\request\src`

### 12. a2a-server\packages\features\src\gray-room\orchestrator.ts

**Issues:** 1

**1. Line 1:**
```typescript
import { logger } from "./logger.js";
```
**Suggested:** `..\..\..\gray-room\src`

### 13. a2a-server\packages\features\src\gray-room\manager.ts

**Issues:** 2

**1. Line 2:**
```typescript
import { logger } from "./logger.js";
```
**Suggested:** `..\..\..\gray-room\src`

**2. Line 10:**
```typescript
import { GrayRoomOrchestrator } from "./orchestrator.js";
```
**Suggested:** `..\..\..\gray-room\src`

### 14. a2a-server\packages\features\src\gray-room\config.ts

**Issues:** 1

**1. Line 1:**
```typescript
import { GrayRoomConfig } from "./types.js";
```
**Suggested:** `..\..\..\gray-room\src`

### 15. a2a-server\packages\features\src\actions\index.ts

**Issues:** 1

**1. Line 80:**
```typescript
export * as handlers from './handlers/index.js';
```
**Suggested:** `..\..\..\actions\src`

### 16. a2a-server\packages\features\src\actions\action-service.ts

**Issues:** 3

**1. Line 8:**
```typescript
import { ActionDefinition, ActionMatch, ActionOutcome, ExecutionState, SubAction } from './types.js';
```
**Suggested:** `..\..\..\actions\src`

**2. Line 9:**
```typescript
import { ActionRegistry, actionRegistry } from './action-registry.js';
```
**Suggested:** `..\..\..\actions\src`

**3. Line 10:**
```typescript
import { ActionExecutor, StepResult } from './action-executor.js';
```
**Suggested:** `..\..\..\actions\src`

### 17. a2a-server\packages\features\src\actions\action-registry.ts

**Issues:** 2

**1. Line 9:**
```typescript
import {ActionDefinition, ActionMatch} from './types.js';
```
**Suggested:** `..\..\..\actions\src`

**2. Line 10:**
```typescript
import {parseAllActionsFromDirectory} from './action-parser.js';
```
**Suggested:** `..\..\..\actions\src`

### 18. a2a-server\packages\features\src\actions\action-processor.ts

**Issues:** 2

**1. Line 16:**
```typescript
import {ActionService, ActionResponseSimulation} from './action-service.js';
```
**Suggested:** `..\..\..\actions\src`

**2. Line 17:**
```typescript
import {ActionDefinition, SubAction} from './types.js';
```
**Suggested:** `..\..\..\actions\src`

### 19. a2a-server\packages\features\src\actions\action-parser.ts

**Issues:** 1

**1. Line 9:**
```typescript
import {ActionDefinition, SubAction, ActionContext, DSLDefinition} from './types.js';
```
**Suggested:** `..\..\..\actions\src`

### 20. a2a-server\packages\features\src\actions\action-handler-registry.ts

**Issues:** 1

**1. Line 8:**
```typescript
import * as handlers from './handlers/index.js';
```
**Suggested:** `..\..\..\actions\src`

### 21. a2a-server\packages\features\src\actions\action-executor.ts

**Issues:** 1

**1. Line 1:**
```typescript
import { ActionDefinition, ExecutionState, SubAction, StepHistory } from './types.js';
```
**Suggested:** `..\..\..\actions\src`

### 22. a2a-server\packages\server\src\api\registry\route.ts

**Issues:** 1

**1. Line 12:**
```typescript
import { agentRegistry } from '../../services/registry-v2.js';
```
**Suggested:** `..\..\..\..\request\src`

### 23. a2a-server\packages\server\src\api\registry\register.ts

**Issues:** 1

**1. Line 11:**
```typescript
import { agentRegistry, type AgentRegistration } from '../../services/registry-v2.js';
```
**Suggested:** `..\..\..\..\request\src`

### 24. a2a-server\packages\server\src\api\registry\health.ts

**Issues:** 1

**1. Line 10:**
```typescript
import { agentRegistry } from '../../services/registry-v2.js';
```
**Suggested:** `..\..\..\..\request\src`

### 25. a2a-server\packages\features\src\actions\src\index.ts

**Issues:** 11

**1. Line 2:**
```typescript
export * from "./action-executor.js";
```
**Suggested:** `..\..\..\..\actions\src`

**2. Line 3:**
```typescript
export * from "./action-handler-registry.js";
```
**Suggested:** `..\..\..\..\actions\src`

**3. Line 4:**
```typescript
export * from "./action-parser.js";
```
**Suggested:** `..\..\..\..\actions\src`

**4. Line 5:**
```typescript
export * from "./action-processor.js";
```
**Suggested:** `..\..\..\..\actions\src`

**5. Line 6:**
```typescript
export * from "./action-registry.js";
```
**Suggested:** `..\..\..\..\actions\src`

**6. Line 7:**
```typescript
export * from "./action-service.js";
```
**Suggested:** `..\..\..\..\actions\src`

**7. Line 8:**
```typescript
export * from "./action-validator.js";
```
**Suggested:** `..\..\..\..\actions\src`

**8. Line 9:**
```typescript
export * from "./index.js";
```
**Suggested:** `..\..\..\..\actions\src`

**9. Line 10:**
```typescript
export * from "./types.js";
```
**Suggested:** `..\..\..\..\actions\src`

**10. Line 11:**
```typescript
export * from "./utils.js";
```
**Suggested:** `..\..\..\..\actions\src`

**11. Line 14:**
```typescript
export * from "./handlers/index.js";
```
**Suggested:** `..\..\..\..\actions\src`

### 26. a2a-server\packages\features\src\actions\handlers\grep-search.ts

**Issues:** 1

**1. Line 10:**
```typescript
import {validatePath} from './file-operations/security.js';
```
**Suggested:** `..\..\..\..\actions\src`

### 27. a2a-server\packages\features\src\actions\handlers\file-operations.ts

**Issues:** 4

**1. Line 5:**
```typescript
export {executeReadFile} from './file-operations/read-file.js';
```
**Suggested:** `..\..\..\..\actions\src`

**2. Line 6:**
```typescript
export {executeWriteFile} from './file-operations/write-file.js';
```
**Suggested:** `..\..\..\..\actions\src`

**3. Line 7:**
```typescript
export {executeFileExists} from './file-operations/file-exists.js';
```
**Suggested:** `..\..\..\..\actions\src`

**4. Line 8:**
```typescript
export {executeListDirectory} from './file-operations/list-directory.js';
```
**Suggested:** `..\..\..\..\actions\src`

### 28. a2a-server\packages\features\src\actions\handlers\edit-patch.ts

**Issues:** 1

**1. Line 11:**
```typescript
import {validatePath} from './file-operations/security.js';
```
**Suggested:** `..\..\..\..\actions\src`

### 29. a2a-server\packages\features\src\actions\handlers\command-execution.ts

**Issues:** 2

**1. Line 9:**
```typescript
import {validatePath} from './file-operations/security.js';
```
**Suggested:** `..\..\..\..\actions\src`

**2. Line 10:**
```typescript
import {executeAction, ValidationResult} from '../utils.js';
```
**Suggested:** `..\..\..\..\actions\src`

### 30. a2a-server\packages\features\src\gray-room\core\request-processor\gray-room-utils.ts

**Issues:** 7

**1. Line 2:**
```typescript
import {executeReadFile} from '../../actions/handlers/file-operations.js';
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**2. Line 3:**
```typescript
import {mergeServerRagPageIntoContext} from '../../rag/auto-rag-page-server.js';
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**3. Line 4:**
```typescript
import {mergeGrayRoomSlotIntoContext, mergeInterruptTraceIntoContext} from '../../transform/interrupt-trace-contract.js';
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**4. Line 5:**
```typescript
import {runPromptsTransform} from '../../transform/index.js';
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**5. Line 6:**
```typescript
import type {GrayRoomControlEnvelope, InterruptDirective, ServerInterruptTraceEvent} from '../../transform/types.js';
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**6. Line 7:**
```typescript
import {resolveExecution, resolveHistoryLength} from './normalization.js';
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**7. Line 8:**
```typescript
import {grayRoomLlmModelFallback, resolveGrayRoomLlmModelFromContext} from './llm-model-resolver.js';
```
**Suggested:** `..\..\..\..\..\gray-room\src`

### 31. a2a-server\packages\features\src\gray-room\core\request-processor\gray-room-trigger.ts

**Issues:** 2

**1. Line 1:**
```typescript
import {resolveExecution} from './normalization.js';
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**2. Line 2:**
```typescript
import {grayRoomLlmModelFallback, resolveGrayRoomLlmModelFromContext} from './llm-model-resolver.js';
```
**Suggested:** `..\..\..\..\..\gray-room\src`

### 32. a2a-server\packages\features\src\gray-room\core\request-processor\gray-room-orchestrator.ts

**Issues:** 23

**1. Line 16:**
```typescript
import { executeReadFile } from "../../../actions/handlers/file-operations.js";
```
**Suggested:** `..\..\..\..\..\actions\src`

**2. Line 23:**
```typescript
import { BlackRoomOrchestrator } from "../../black-room/black-room-orchestrator.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**3. Line 28:**
```typescript
import type { ProcessResult } from "./request-processor.interfaces.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**4. Line 44:**
```typescript
import { globalArtifactStore } from "../artifact-store.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**5. Line 45:**
```typescript
import { DedicatedAnalyzer } from "../analyzer.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**6. Line 46:**
```typescript
import { globalMcpRegistry } from "../../mcp/registry.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**7. Line 69:**
```typescript
import { handleCompressHistory } from "./gray-room-interrupt-handlers/compress-history.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**8. Line 70:**
```typescript
import { handleThinking } from "./gray-room-interrupt-handlers/thinking.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**9. Line 71:**
```typescript
import { handleAutoReadFile } from "./gray-room-interrupt-handlers/auto-read-file.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**10. Line 72:**
```typescript
import { handleAutoRagPage } from "./gray-room-interrupt-handlers/auto-rag-page.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**11. Line 73:**
```typescript
import { handleClarify } from "./gray-room-interrupt-handlers/clarify.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**12. Line 74:**
```typescript
import { handleAlgorithmInvoke } from "./gray-room-interrupt-handlers/algorithm-invoke.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**13. Line 75:**
```typescript
import { globalVisionTester } from "../vision-tester.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**14. Line 76:**
```typescript
import { globalRoleRegistry, AgentRole } from "../agent-role-registry.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**15. Line 77:**
```typescript
import { globalSafetyLayer } from "../safety-layer.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**16. Line 78:**
```typescript
import { globalIntentGate } from "../intent-gate.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**17. Line 79:**
```typescript
import { bugFixer } from "../../llm/bug-fixer.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**18. Line 80:**
```typescript
import { repoMapService } from "../../context/repo-map.service.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**19. Line 81:**
```typescript
import { llmService } from "../../llm/llm-service.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**20. Line 82:**
```typescript
import { contextDiscoveryService } from "../../context/context-discovery.service.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**21. Line 83:**
```typescript
import { resolveAiHubBaseUrl } from "../../utils/ai-hub-url.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**22. Line 84:**
```typescript
import { mkdtempOsTmp } from "../../utils/mkdtemp-os-tmp.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**23. Line 85:**
```typescript
import { prepareLlmMessages } from "./llm-orchestration.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

### 33. a2a-server\packages\features\src\gray-room\core\orchestrator\gray-room-orchestrator.ts

**Issues:** 16

**1. Line 16:**
```typescript
import { executeReadFile } from "../../../actions/handlers/file-operations.js";
```
**Suggested:** `..\..\..\..\..\actions\src`

**2. Line 28:**
```typescript
import type { ProcessResult } from "./request-processor.interfaces.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**3. Line 44:**
```typescript
import { globalArtifactStore } from "../../artifact-store.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**4. Line 45:**
```typescript
import { DedicatedAnalyzer } from "../../analyzer.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**5. Line 69:**
```typescript
import { handleCompressHistory } from "./gray-room-interrupt-handlers/compress-history.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**6. Line 70:**
```typescript
import { handleThinking } from "./gray-room-interrupt-handlers/thinking.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**7. Line 71:**
```typescript
import { handleAutoReadFile } from "./gray-room-interrupt-handlers/auto-read-file.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**8. Line 72:**
```typescript
import { handleAutoRagPage } from "./gray-room-interrupt-handlers/auto-rag-page.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**9. Line 73:**
```typescript
import { handleClarify } from "./gray-room-interrupt-handlers/clarify.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**10. Line 74:**
```typescript
import { handleAlgorithmInvoke } from "./gray-room-interrupt-handlers/algorithm-invoke.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**11. Line 76:**
```typescript
import { globalRoleRegistry, AgentRole } from "../agent-role-registry.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**12. Line 81:**
```typescript
import { llmService } from "../../llm/llm-service.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**13. Line 82:**
```typescript
import { contextDiscoveryService } from "../../context/context-discovery.service.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**14. Line 83:**
```typescript
import { resolveAiHubBaseUrl } from "../../utils/ai-hub-url.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**15. Line 84:**
```typescript
import { mkdtempOsTmp } from "../../utils/mkdtemp-os-tmp.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

**16. Line 85:**
```typescript
import { prepareLlmMessages } from "./llm-orchestration.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

### 34. a2a-server\packages\features\src\gray-room\components\memory\MuSE.ts

**Issues:** 1

**1. Line 1:**
```typescript
import { logger } from '../../utils/logger.js';
```
**Suggested:** `..\..\..\..\..\gray-room\src`

### 35. a2a-server\packages\features\src\gray-room\components\context\ultracontext.service.ts

**Issues:** 1

**1. Line 4:**
```typescript
import { logger } from "../../utils/logger.js";
```
**Suggested:** `..\..\..\..\..\gray-room\src`

### 36. a2a-server\packages\features\src\gray-room\components\context\context-discovery.service.ts

**Issues:** 1

**1. Line 3:**
```typescript
import { logger } from '../../utils/logger.js';
```
**Suggested:** `..\..\..\..\..\gray-room\src`

### 37. a2a-server\packages\features\src\actions\src\actions\utils.ts

**Issues:** 1

**1. Line 1:**
```typescript
import { logger } from '../../lib/logger.js';
```
**Suggested:** `..\..\..\..\..\actions\src`

### 38. a2a-server\packages\features\src\actions\src\actions\index.ts

**Issues:** 1

**1. Line 80:**
```typescript
export * as handlers from './handlers/index.js';
```
**Suggested:** `..\..\..\..\..\actions\src`

### 39. a2a-server\packages\features\src\actions\src\actions\action-service.ts

**Issues:** 4

**1. Line 8:**
```typescript
import { ActionDefinition, ActionMatch, ActionOutcome, ExecutionState, SubAction } from './types.js';
```
**Suggested:** `..\..\..\..\..\actions\src`

**2. Line 9:**
```typescript
import { ActionRegistry, actionRegistry } from './action-registry.js';
```
**Suggested:** `..\..\..\..\..\actions\src`

**3. Line 10:**
```typescript
import { ActionExecutor, StepResult } from './action-executor.js';
```
**Suggested:** `..\..\..\..\..\actions\src`

**4. Line 11:**
```typescript
import { logger } from '../../lib/logger.js';
```
**Suggested:** `..\..\..\..\..\actions\src`

### 40. a2a-server\packages\features\src\actions\src\actions\action-registry.ts

**Issues:** 3

**1. Line 9:**
```typescript
import {ActionDefinition, ActionMatch} from './types.js';
```
**Suggested:** `..\..\..\..\..\actions\src`

**2. Line 10:**
```typescript
import {parseAllActionsFromDirectory} from './action-parser.js';
```
**Suggested:** `..\..\..\..\..\actions\src`

**3. Line 11:**
```typescript
import {logger} from '../../lib/logger.js';
```
**Suggested:** `..\..\..\..\..\actions\src`

### 41. a2a-server\packages\features\src\actions\src\actions\action-processor.ts

**Issues:** 3

**1. Line 16:**
```typescript
import {ActionService, ActionResponseSimulation} from './action-service.js';
```
**Suggested:** `..\..\..\..\..\actions\src`

**2. Line 17:**
```typescript
import {ActionDefinition, SubAction} from './types.js';
```
**Suggested:** `..\..\..\..\..\actions\src`

**3. Line 18:**
```typescript
import type {ContextBlock, ServerMessage, Task, TaskStatus, TaskType} from '../types/index.js';
```
**Suggested:** `..\..\..\..\..\actions\src`

### 42. a2a-server\packages\features\src\actions\src\actions\action-parser.ts

**Issues:** 2

**1. Line 9:**
```typescript
import {ActionDefinition, SubAction, ActionContext, DSLDefinition} from './types.js';
```
**Suggested:** `..\..\..\..\..\actions\src`

**2. Line 10:**
```typescript
import {tryParseJsonFromLlmText} from '../../lib/strip-markdown-json-fence.js';
```
**Suggested:** `..\..\..\..\..\actions\src`

### 43. a2a-server\packages\features\src\actions\src\actions\action-handler-registry.ts

**Issues:** 3

**1. Line 7:**
```typescript
import {logger} from '../../lib/logger.js';
```
**Suggested:** `..\..\..\..\..\actions\src`

**2. Line 8:**
```typescript
import * as handlers from './handlers/index.js';
```
**Suggested:** `..\..\..\..\..\actions\src`

**3. Line 9:**
```typescript
import {SkillEvolver} from '../services/core/skill-evolver.js';
```
**Suggested:** `..\..\..\..\..\actions\src`

### 44. a2a-server\packages\features\src\actions\src\actions\action-executor.ts

**Issues:** 1

**1. Line 1:**
```typescript
import { ActionDefinition, ExecutionState, SubAction, StepHistory } from './types.js';
```
**Suggested:** `..\..\..\..\..\actions\src`

### 45. a2a-server\packages\features\src\actions\handlers\file-operations\write-file.ts

**Issues:** 4

**1. Line 5:**
```typescript
import type {WriteFileActionInput, WriteFileActionOutput} from './types.js';
```
**Suggested:** `..\..\..\..\..\actions\src`

**2. Line 6:**
```typescript
import {validatePath} from './security.js';
```
**Suggested:** `..\..\..\..\..\actions\src`

**3. Line 7:**
```typescript
import {SWEVerifier} from '../../services/core/swe-verifier.js';
```
**Suggested:** `..\..\..\..\..\actions\src`

**4. Line 8:**
```typescript
import {executeAction} from '../../utils.js';
```
**Suggested:** `..\..\..\..\..\actions\src`

### 46. a2a-server\packages\features\src\actions\handlers\file-operations\read-file.ts

**Issues:** 3

**1. Line 4:**
```typescript
import type {ReadFileActionInput, ReadFileActionOutput} from './types.js';
```
**Suggested:** `..\..\..\..\..\actions\src`

**2. Line 5:**
```typescript
import {validatePath} from './security.js';
```
**Suggested:** `..\..\..\..\..\actions\src`

**3. Line 6:**
```typescript
import {executeAction} from '../../utils.js';
```
**Suggested:** `..\..\..\..\..\actions\src`

### 47. a2a-server\packages\features\src\actions\handlers\file-operations\list-directory.ts

**Issues:** 3

**1. Line 4:**
```typescript
import type {ListDirActionInput, ListDirActionOutput} from './types.js';
```
**Suggested:** `..\..\..\..\..\actions\src`

**2. Line 5:**
```typescript
import {validatePath} from './security.js';
```
**Suggested:** `..\..\..\..\..\actions\src`

**3. Line 6:**
```typescript
import {executeAction} from '../../utils.js';
```
**Suggested:** `..\..\..\..\..\actions\src`

### 48. a2a-server\packages\features\src\actions\handlers\file-operations\file-exists.ts

**Issues:** 1

**1. Line 4:**
```typescript
import type {FileExistsActionInput, FileExistsActionOutput} from './types.js';
```
**Suggested:** `..\..\..\..\..\actions\src`

### 49. a2a-server\packages\features\src\gray-room\core\request-processor\gray-room-interrupt-handlers\thinking.ts

**Issues:** 6

**1. Line 1:**
```typescript
import {resolveGrayRoomLlmModelFromContext} from '../llm-model-resolver.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

**2. Line 7:**
```typescript
import {logger} from '../../../utils/logger.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

**3. Line 8:**
```typescript
import {mergeSlotIntoWorkbenchContext} from '../gray-room-utils.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

**4. Line 9:**
```typescript
import {tryParseJsonFromLlmText} from '../../../utils/strip-markdown-json-fence.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

**5. Line 10:**
```typescript
import type {InterruptDirective, ServerInterruptTraceEvent, GrayRoomContext} from '../../../transform/types.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

**6. Line 11:**
```typescript
import {BaseGrayRoomHandler} from './base-handler.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

### 50. a2a-server\packages\features\src\gray-room\core\request-processor\gray-room-interrupt-handlers\compress-history.ts

**Issues:** 6

**1. Line 1:**
```typescript
import {resolveGrayRoomLlmModelFromContext} from '../llm-model-resolver.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

**2. Line 2:**
```typescript
import { AgentSwing } from '../../agent-swing.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

**3. Line 3:**
```typescript
import { pollReadyThenFetch } from '../../../daemon/llm-hub-poll.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

**4. Line 4:**
```typescript
import { logger } from '../../../utils/logger.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

**5. Line 5:**
```typescript
import type {InterruptDirective, ServerInterruptTraceEvent, GrayRoomContext} from '../../../transform/types.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

**6. Line 6:**
```typescript
import {BaseGrayRoomHandler} from './base-handler.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

### 51. a2a-server\packages\features\src\gray-room\core\request-processor\gray-room-interrupt-handlers\clarify.ts

**Issues:** 3

**1. Line 1:**
```typescript
import type {InterruptDirective, ServerInterruptTraceEvent, GrayRoomContext} from '../../../transform/types.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

**2. Line 2:**
```typescript
import {mergeSlotIntoWorkbenchContext} from '../gray-room-utils.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

**3. Line 3:**
```typescript
import {BaseGrayRoomHandler} from './base-handler.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

### 52. a2a-server\packages\features\src\gray-room\core\request-processor\gray-room-interrupt-handlers\base-handler.ts

**Issues:** 2

**1. Line 1:**
```typescript
import type {InterruptDirective, ServerInterruptTraceEvent} from '../../../transform/types.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

**2. Line 2:**
```typescript
import type {GrayRoomContext} from '../gray-room-utils.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

### 53. a2a-server\packages\features\src\gray-room\core\request-processor\gray-room-interrupt-handlers\auto-read-file.ts

**Issues:** 3

**1. Line 1:**
```typescript
import {executeReadFile} from '../../../actions/handlers/file-operations.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

**2. Line 2:**
```typescript
import type {InterruptDirective, ServerInterruptTraceEvent, GrayRoomContext} from '../../../transform/types.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

**3. Line 3:**
```typescript
import {BaseGrayRoomHandler} from './base-handler.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

### 54. a2a-server\packages\features\src\gray-room\core\request-processor\gray-room-interrupt-handlers\auto-rag-page.ts

**Issues:** 3

**1. Line 1:**
```typescript
import {ProgressiveRetriever} from '../../rag/progressive-retriever.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

**2. Line 2:**
```typescript
import type {InterruptDirective, ServerInterruptTraceEvent, GrayRoomContext} from '../../../transform/types.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

**3. Line 3:**
```typescript
import {BaseGrayRoomHandler} from './base-handler.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

### 55. a2a-server\packages\features\src\gray-room\core\request-processor\gray-room-interrupt-handlers\algorithm-invoke.ts

**Issues:** 5

**1. Line 1:**
```typescript
import type {AlgorithmContext, AlgorithmData} from '../../black-room/types.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

**2. Line 2:**
```typescript
import type {InterruptDirective, ServerInterruptTraceEvent, GrayRoomContext} from '../../../transform/types.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

**3. Line 3:**
```typescript
import {BlackRoomOrchestrator} from '../../black-room/black-room-orchestrator.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

**4. Line 4:**
```typescript
import {mergeSlotIntoWorkbenchContext} from '../gray-room-utils.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

**5. Line 5:**
```typescript
import {BaseGrayRoomHandler} from './base-handler.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

### 56. a2a-server\packages\features\src\gray-room\components\context\context\Ultracontext.ts

**Issues:** 2

**1. Line 1:**
```typescript
import { logger } from '../../utils/logger.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

**2. Line 2:**
```typescript
import { deepCloneJson } from '../../utils/deep-clone-json.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

### 57. a2a-server\packages\features\src\gray-room\components\context\context\AgentSwing.ts

**Issues:** 2

**1. Line 1:**
```typescript
import { logger } from '../../utils/logger.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

**2. Line 2:**
```typescript
import { ultracontext } from './Ultracontext.js';
```
**Suggested:** `..\..\..\..\..\..\gray-room\src`

### 58. a2a-server\packages\features\src\actions\src\actions\handlers\run-script.ts

**Issues:** 1

**1. Line 7:**
```typescript
import {logger} from '../../../utils/logger.js';
```
**Suggested:** `..\..\..\..\..\..\actions\src`

### 59. a2a-server\packages\features\src\actions\src\actions\handlers\phpantom.ts

**Issues:** 1

**1. Line 24:**
```typescript
import { logger } from '../../../utils/logger.js';
```
**Suggested:** `..\..\..\..\..\..\actions\src`

### 60. a2a-server\packages\features\src\actions\src\actions\handlers\mcp-call.ts

**Issues:** 1

**1. Line 19:**
```typescript
import { logger } from '../../../utils/logger.js';
```
**Suggested:** `..\..\..\..\..\..\actions\src`

### 61. a2a-server\packages\features\src\actions\src\actions\handlers\grep-search.ts

**Issues:** 2

**1. Line 7:**
```typescript
import {logger} from '../../../utils/logger.js';
```
**Suggested:** `..\..\..\..\..\..\actions\src`

**2. Line 10:**
```typescript
import {validatePath} from './file-operations/security.js';
```
**Suggested:** `..\..\..\..\..\..\actions\src`

### 62. a2a-server\packages\features\src\actions\src\actions\handlers\file-operations.ts

**Issues:** 4

**1. Line 5:**
```typescript
export {executeReadFile} from './file-operations/read-file.js';
```
**Suggested:** `..\..\..\..\..\..\actions\src`

**2. Line 6:**
```typescript
export {executeWriteFile} from './file-operations/write-file.js';
```
**Suggested:** `..\..\..\..\..\..\actions\src`

**3. Line 7:**
```typescript
export {executeFileExists} from './file-operations/file-exists.js';
```
**Suggested:** `..\..\..\..\..\..\actions\src`

**4. Line 8:**
```typescript
export {executeListDirectory} from './file-operations/list-directory.js';
```
**Suggested:** `..\..\..\..\..\..\actions\src`

### 63. a2a-server\packages\features\src\actions\src\actions\handlers\edit-patch.ts

**Issues:** 3

**1. Line 7:**
```typescript
import {logger} from '../../../utils/logger.js';
```
**Suggested:** `..\..\..\..\..\..\actions\src`

**2. Line 8:**
```typescript
import {pathIsAccessible, timestampedBackupPath} from '../../../utils/fs-access.js';
```
**Suggested:** `..\..\..\..\..\..\actions\src`

**3. Line 11:**
```typescript
import {validatePath} from './file-operations/security.js';
```
**Suggested:** `..\..\..\..\..\..\actions\src`

### 64. a2a-server\packages\features\src\actions\src\actions\handlers\command-execution.ts

**Issues:** 3

**1. Line 7:**
```typescript
import {logger} from '../../../utils/logger.js';
```
**Suggested:** `..\..\..\..\..\..\actions\src`

**2. Line 9:**
```typescript
import {validatePath} from './file-operations/security.js';
```
**Suggested:** `..\..\..\..\..\..\actions\src`

**3. Line 10:**
```typescript
import {executeAction, ValidationResult} from '../utils.js';
```
**Suggested:** `..\..\..\..\..\..\actions\src`

### 65. a2a-server\packages\features\src\actions\src\actions\handlers\file-operations\write-file.ts

**Issues:** 6

**1. Line 1:**
```typescript
import {logger} from '../../../utils/logger.js';
```
**Suggested:** `..\..\..\..\..\..\..\actions\src`

**2. Line 2:**
```typescript
import {pathIsAccessible, timestampedBackupPath} from '../../../utils/fs-access.js';
```
**Suggested:** `..\..\..\..\..\..\..\actions\src`

**3. Line 5:**
```typescript
import type {WriteFileActionInput, WriteFileActionOutput} from './types.js';
```
**Suggested:** `..\..\..\..\..\..\..\actions\src`

**4. Line 6:**
```typescript
import {validatePath} from './security.js';
```
**Suggested:** `..\..\..\..\..\..\..\actions\src`

**5. Line 7:**
```typescript
import {SWEVerifier} from '../../services/core/swe-verifier.js';
```
**Suggested:** `..\..\..\..\..\..\..\actions\src`

**6. Line 8:**
```typescript
import {executeAction} from '../../utils.js';
```
**Suggested:** `..\..\..\..\..\..\..\actions\src`

### 66. a2a-server\packages\features\src\actions\src\actions\handlers\file-operations\read-file.ts

**Issues:** 4

**1. Line 1:**
```typescript
import {logger} from '../../../utils/logger.js';
```
**Suggested:** `..\..\..\..\..\..\..\actions\src`

**2. Line 4:**
```typescript
import type {ReadFileActionInput, ReadFileActionOutput} from './types.js';
```
**Suggested:** `..\..\..\..\..\..\..\actions\src`

**3. Line 5:**
```typescript
import {validatePath} from './security.js';
```
**Suggested:** `..\..\..\..\..\..\..\actions\src`

**4. Line 6:**
```typescript
import {executeAction} from '../../utils.js';
```
**Suggested:** `..\..\..\..\..\..\..\actions\src`

### 67. a2a-server\packages\features\src\actions\src\actions\handlers\file-operations\list-directory.ts

**Issues:** 4

**1. Line 1:**
```typescript
import {logger} from '../../../utils/logger.js';
```
**Suggested:** `..\..\..\..\..\..\..\actions\src`

**2. Line 4:**
```typescript
import type {ListDirActionInput, ListDirActionOutput} from './types.js';
```
**Suggested:** `..\..\..\..\..\..\..\actions\src`

**3. Line 5:**
```typescript
import {validatePath} from './security.js';
```
**Suggested:** `..\..\..\..\..\..\..\actions\src`

**4. Line 6:**
```typescript
import {executeAction} from '../../utils.js';
```
**Suggested:** `..\..\..\..\..\..\..\actions\src`

### 68. a2a-server\packages\features\src\actions\src\actions\handlers\file-operations\file-exists.ts

**Issues:** 2

**1. Line 1:**
```typescript
import {logger} from '../../../utils/logger.js';
```
**Suggested:** `..\..\..\..\..\..\..\actions\src`

**2. Line 4:**
```typescript
import type {FileExistsActionInput, FileExistsActionOutput} from './types.js';
```
**Suggested:** `..\..\..\..\..\..\..\actions\src`

## Migration Commands

After reviewing the changes, you can run automated migration:

```bash
node .kilo/scripts/duplicates/import-migration.js --apply
```

## Manual Verification

After migration, verify:

- [ ] `npm run build` succeeds
- [ ] `npm run typecheck` passes
- [ ] Tests pass
- [ ] Application functionality works
