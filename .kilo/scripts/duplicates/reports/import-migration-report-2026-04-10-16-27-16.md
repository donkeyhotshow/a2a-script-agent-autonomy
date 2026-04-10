# Import Migration Report

Generated: 10.04.2026, 19:27:16

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
**Suggested:** `@a2a/request/core\black-room\algorithm-registry`

**2. Line 13:**
```typescript
import { globalArtifactStore } from "./services/core/artifact-store.js";
```
**Suggested:** `@a2a/request/core\artifact-store`

**3. Line 15:**
```typescript
import { ultraContextService } from "./services/context/ultracontext.service.js";
```
**Suggested:** `@a2a/request/context\ultracontext.service`

**4. Line 16:**
```typescript
import { peerRelay } from "./services/p2p/relay.js";
```
**Suggested:** `@a2a/request/p2p\relay`

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
**Suggested:** `@a2a/server-utils/logger`

### 4. a2a-server\packages\server-utils\src\lib\retry.ts

**Issues:** 1

**1. Line 6:**
```typescript
import { logger } from './logger.js';
```
**Suggested:** `@a2a/server-utils/logger`

### 5. a2a-server\packages\server-utils\src\lib\circuit-breaker.ts

**Issues:** 1

**1. Line 6:**
```typescript
import { logger } from './logger.js';
```
**Suggested:** `@a2a/server-utils/logger`

### 6. a2a-server\packages\server-utils\src\lib\backoff.ts

**Issues:** 1

**1. Line 13:**
```typescript
import { logger } from './logger.js';
```
**Suggested:** `@a2a/server-utils/logger`

### 7. a2a-server\packages\server\src\routes\sessions.routes.ts

**Issues:** 1

**1. Line 6:**
```typescript
import {stripServerInternalWorkbenchFromContext} from '../services/core/request/client-visible-context.js';
```
**Suggested:** `@a2a/request/core\request\client-visible-context`

### 8. a2a-server\packages\server\src\routes\requests.routes.ts

**Issues:** 2

**1. Line 10:**
```typescript
import {requestService} from '../services/core/request/request.service.js';
```
**Suggested:** `@a2a/request/core\request\request.service`

**2. Line 12:**
```typescript
import {clientSafeWorkbench} from '../services/core/request/client-visible-context.js';
```
**Suggested:** `@a2a/request/core\request\client-visible-context`

### 9. a2a-server\packages\server\src\routes\index.ts

**Issues:** 1

**1. Line 6:**
```typescript
import {invoke} from '../services/utils/invoke.service.js';
```
**Suggested:** `@a2a/request/utils\invoke.service`

### 10. a2a-server\packages\server\src\request\request.service.ts

**Issues:** 2

**1. Line 9:**
```typescript
import {RequestFileStorage} from './request-file-storage.js';
```
**Suggested:** `@a2a/request/request-file-storage`

**2. Line 10:**
```typescript
import {sanitizeRequestResultForStorage} from './client-visible-context.js';
```
**Suggested:** `@a2a/request/client-visible-context`

### 11. a2a-server\packages\server\src\request\index.ts

**Issues:** 1

**1. Line 1:**
```typescript
export * from './request.service.js';
```
**Suggested:** `@a2a/request/request.service`

### 12. a2a-server\packages\features\src\gray-room\orchestrator.ts

**Issues:** 1

**1. Line 1:**
```typescript
import { logger } from "./logger.js";
```
**Suggested:** `@a2a/gray-room/logger`

### 13. a2a-server\packages\features\src\gray-room\manager.ts

**Issues:** 2

**1. Line 2:**
```typescript
import { logger } from "./logger.js";
```
**Suggested:** `@a2a/gray-room/logger`

**2. Line 10:**
```typescript
import { GrayRoomOrchestrator } from "./orchestrator.js";
```
**Suggested:** `@a2a/gray-room/orchestrator`

### 14. a2a-server\packages\features\src\gray-room\config.ts

**Issues:** 1

**1. Line 1:**
```typescript
import { GrayRoomConfig } from "./types.js";
```
**Suggested:** `@a2a/gray-room/types`

### 15. a2a-server\packages\features\src\actions\index.ts

**Issues:** 1

**1. Line 80:**
```typescript
export * as handlers from './handlers/index.js';
```
**Suggested:** `@a2a/actions/handlers\index`

### 16. a2a-server\packages\features\src\actions\action-service.ts

**Issues:** 3

**1. Line 8:**
```typescript
import { ActionDefinition, ActionMatch, ActionOutcome, ExecutionState, SubAction } from './types.js';
```
**Suggested:** `@a2a/actions/types`

**2. Line 9:**
```typescript
import { ActionRegistry, actionRegistry } from './action-registry.js';
```
**Suggested:** `@a2a/actions/action-registry`

**3. Line 10:**
```typescript
import { ActionExecutor, StepResult } from './action-executor.js';
```
**Suggested:** `@a2a/actions/action-executor`

### 17. a2a-server\packages\features\src\actions\action-registry.ts

**Issues:** 2

**1. Line 9:**
```typescript
import {ActionDefinition, ActionMatch} from './types.js';
```
**Suggested:** `@a2a/actions/types`

**2. Line 10:**
```typescript
import {parseAllActionsFromDirectory} from './action-parser.js';
```
**Suggested:** `@a2a/actions/action-parser`

### 18. a2a-server\packages\features\src\actions\action-processor.ts

**Issues:** 2

**1. Line 16:**
```typescript
import {ActionService, ActionResponseSimulation} from './action-service.js';
```
**Suggested:** `@a2a/actions/action-service`

**2. Line 17:**
```typescript
import {ActionDefinition, SubAction} from './types.js';
```
**Suggested:** `@a2a/actions/types`

### 19. a2a-server\packages\features\src\actions\action-parser.ts

**Issues:** 1

**1. Line 9:**
```typescript
import {ActionDefinition, SubAction, ActionContext, DSLDefinition} from './types.js';
```
**Suggested:** `@a2a/actions/types`

### 20. a2a-server\packages\features\src\actions\action-handler-registry.ts

**Issues:** 1

**1. Line 8:**
```typescript
import * as handlers from './handlers/index.js';
```
**Suggested:** `@a2a/actions/handlers\index`

### 21. a2a-server\packages\features\src\actions\action-executor.ts

**Issues:** 1

**1. Line 1:**
```typescript
import { ActionDefinition, ExecutionState, SubAction, StepHistory } from './types.js';
```
**Suggested:** `@a2a/actions/types`

### 22. a2a-server\packages\server\src\api\registry\route.ts

**Issues:** 1

**1. Line 12:**
```typescript
import { agentRegistry } from '../../services/registry-v2.js';
```
**Suggested:** `@a2a/request/registry-v2`

### 23. a2a-server\packages\server\src\api\registry\register.ts

**Issues:** 1

**1. Line 11:**
```typescript
import { agentRegistry, type AgentRegistration } from '../../services/registry-v2.js';
```
**Suggested:** `@a2a/request/registry-v2`

### 24. a2a-server\packages\server\src\api\registry\health.ts

**Issues:** 1

**1. Line 10:**
```typescript
import { agentRegistry } from '../../services/registry-v2.js';
```
**Suggested:** `@a2a/request/registry-v2`

### 25. a2a-server\packages\features\src\actions\src\index.ts

**Issues:** 11

**1. Line 2:**
```typescript
export * from "./action-executor.js";
```
**Suggested:** `@a2a/actions/src\action-executor`

**2. Line 3:**
```typescript
export * from "./action-handler-registry.js";
```
**Suggested:** `@a2a/actions/src\action-handler-registry`

**3. Line 4:**
```typescript
export * from "./action-parser.js";
```
**Suggested:** `@a2a/actions/src\action-parser`

**4. Line 5:**
```typescript
export * from "./action-processor.js";
```
**Suggested:** `@a2a/actions/src\action-processor`

**5. Line 6:**
```typescript
export * from "./action-registry.js";
```
**Suggested:** `@a2a/actions/src\action-registry`

**6. Line 7:**
```typescript
export * from "./action-service.js";
```
**Suggested:** `@a2a/actions/src\action-service`

**7. Line 8:**
```typescript
export * from "./action-validator.js";
```
**Suggested:** `@a2a/actions/src\action-validator`

**8. Line 9:**
```typescript
export * from "./index.js";
```
**Suggested:** `@a2a/actions/src\index`

**9. Line 10:**
```typescript
export * from "./types.js";
```
**Suggested:** `@a2a/actions/src\types`

**10. Line 11:**
```typescript
export * from "./utils.js";
```
**Suggested:** `@a2a/actions/src\utils`

**11. Line 14:**
```typescript
export * from "./handlers/index.js";
```
**Suggested:** `@a2a/actions/src\handlers\index`

### 26. a2a-server\packages\features\src\actions\handlers\grep-search.ts

**Issues:** 1

**1. Line 10:**
```typescript
import {validatePath} from './file-operations/security.js';
```
**Suggested:** `@a2a/actions/handlers\file-operations\security`

### 27. a2a-server\packages\features\src\actions\handlers\file-operations.ts

**Issues:** 4

**1. Line 5:**
```typescript
export {executeReadFile} from './file-operations/read-file.js';
```
**Suggested:** `@a2a/actions/handlers\file-operations\read-file`

**2. Line 6:**
```typescript
export {executeWriteFile} from './file-operations/write-file.js';
```
**Suggested:** `@a2a/actions/handlers\file-operations\write-file`

**3. Line 7:**
```typescript
export {executeFileExists} from './file-operations/file-exists.js';
```
**Suggested:** `@a2a/actions/handlers\file-operations\file-exists`

**4. Line 8:**
```typescript
export {executeListDirectory} from './file-operations/list-directory.js';
```
**Suggested:** `@a2a/actions/handlers\file-operations\list-directory`

### 28. a2a-server\packages\features\src\actions\handlers\edit-patch.ts

**Issues:** 1

**1. Line 11:**
```typescript
import {validatePath} from './file-operations/security.js';
```
**Suggested:** `@a2a/actions/handlers\file-operations\security`

### 29. a2a-server\packages\features\src\actions\handlers\command-execution.ts

**Issues:** 2

**1. Line 9:**
```typescript
import {validatePath} from './file-operations/security.js';
```
**Suggested:** `@a2a/actions/handlers\file-operations\security`

**2. Line 10:**
```typescript
import {executeAction, ValidationResult} from '../utils.js';
```
**Suggested:** `@a2a/actions/utils`

### 30. a2a-server\packages\features\src\gray-room\core\request-processor\gray-room-utils.ts

**Issues:** 7

**1. Line 2:**
```typescript
import {executeReadFile} from '../../actions/handlers/file-operations.js';
```
**Suggested:** `@a2a/gray-room/actions\handlers\file-operations`

**2. Line 3:**
```typescript
import {mergeServerRagPageIntoContext} from '../../rag/auto-rag-page-server.js';
```
**Suggested:** `@a2a/gray-room/rag\auto-rag-page-server`

**3. Line 4:**
```typescript
import {mergeGrayRoomSlotIntoContext, mergeInterruptTraceIntoContext} from '../../transform/interrupt-trace-contract.js';
```
**Suggested:** `@a2a/gray-room/transform\interrupt-trace-contract`

**4. Line 5:**
```typescript
import {runPromptsTransform} from '../../transform/index.js';
```
**Suggested:** `@a2a/gray-room/transform\index`

**5. Line 6:**
```typescript
import type {GrayRoomControlEnvelope, InterruptDirective, ServerInterruptTraceEvent} from '../../transform/types.js';
```
**Suggested:** `@a2a/gray-room/transform\types`

**6. Line 7:**
```typescript
import {resolveExecution, resolveHistoryLength} from './normalization.js';
```
**Suggested:** `@a2a/gray-room/core\request-processor\normalization`

**7. Line 8:**
```typescript
import {grayRoomLlmModelFallback, resolveGrayRoomLlmModelFromContext} from './llm-model-resolver.js';
```
**Suggested:** `@a2a/gray-room/core\request-processor\llm-model-resolver`

### 31. a2a-server\packages\features\src\gray-room\core\request-processor\gray-room-trigger.ts

**Issues:** 2

**1. Line 1:**
```typescript
import {resolveExecution} from './normalization.js';
```
**Suggested:** `@a2a/gray-room/core\request-processor\normalization`

**2. Line 2:**
```typescript
import {grayRoomLlmModelFallback, resolveGrayRoomLlmModelFromContext} from './llm-model-resolver.js';
```
**Suggested:** `@a2a/gray-room/core\request-processor\llm-model-resolver`

### 32. a2a-server\packages\features\src\gray-room\core\request-processor\gray-room-orchestrator.ts

**Issues:** 23

**1. Line 16:**
```typescript
import { executeReadFile } from "../../../actions/handlers/file-operations.js";
```
**Suggested:** `@a2a/actions/handlers\file-operations`

**2. Line 23:**
```typescript
import { BlackRoomOrchestrator } from "../../black-room/black-room-orchestrator.js";
```
**Suggested:** `@a2a/gray-room/black-room\black-room-orchestrator`

**3. Line 28:**
```typescript
import type { ProcessResult } from "./request-processor.interfaces.js";
```
**Suggested:** `@a2a/gray-room/core\request-processor\request-processor.interfaces`

**4. Line 44:**
```typescript
import { globalArtifactStore } from "../artifact-store.js";
```
**Suggested:** `@a2a/gray-room/core\artifact-store`

**5. Line 45:**
```typescript
import { DedicatedAnalyzer } from "../analyzer.js";
```
**Suggested:** `@a2a/gray-room/core\analyzer`

**6. Line 46:**
```typescript
import { globalMcpRegistry } from "../../mcp/registry.js";
```
**Suggested:** `@a2a/gray-room/mcp\registry`

**7. Line 69:**
```typescript
import { handleCompressHistory } from "./gray-room-interrupt-handlers/compress-history.js";
```
**Suggested:** `@a2a/gray-room/core\request-processor\gray-room-interrupt-handlers\compress-history`

**8. Line 70:**
```typescript
import { handleThinking } from "./gray-room-interrupt-handlers/thinking.js";
```
**Suggested:** `@a2a/gray-room/core\request-processor\gray-room-interrupt-handlers\thinking`

**9. Line 71:**
```typescript
import { handleAutoReadFile } from "./gray-room-interrupt-handlers/auto-read-file.js";
```
**Suggested:** `@a2a/gray-room/core\request-processor\gray-room-interrupt-handlers\auto-read-file`

**10. Line 72:**
```typescript
import { handleAutoRagPage } from "./gray-room-interrupt-handlers/auto-rag-page.js";
```
**Suggested:** `@a2a/gray-room/core\request-processor\gray-room-interrupt-handlers\auto-rag-page`

**11. Line 73:**
```typescript
import { handleClarify } from "./gray-room-interrupt-handlers/clarify.js";
```
**Suggested:** `@a2a/gray-room/core\request-processor\gray-room-interrupt-handlers\clarify`

**12. Line 74:**
```typescript
import { handleAlgorithmInvoke } from "./gray-room-interrupt-handlers/algorithm-invoke.js";
```
**Suggested:** `@a2a/gray-room/core\request-processor\gray-room-interrupt-handlers\algorithm-invoke`

**13. Line 75:**
```typescript
import { globalVisionTester } from "../vision-tester.js";
```
**Suggested:** `@a2a/gray-room/core\vision-tester`

**14. Line 76:**
```typescript
import { globalRoleRegistry, AgentRole } from "../agent-role-registry.js";
```
**Suggested:** `@a2a/gray-room/core\agent-role-registry`

**15. Line 77:**
```typescript
import { globalSafetyLayer } from "../safety-layer.js";
```
**Suggested:** `@a2a/gray-room/core\safety-layer`

**16. Line 78:**
```typescript
import { globalIntentGate } from "../intent-gate.js";
```
**Suggested:** `@a2a/gray-room/core\intent-gate`

**17. Line 79:**
```typescript
import { bugFixer } from "../../llm/bug-fixer.js";
```
**Suggested:** `@a2a/gray-room/llm\bug-fixer`

**18. Line 80:**
```typescript
import { repoMapService } from "../../context/repo-map.service.js";
```
**Suggested:** `@a2a/gray-room/context\repo-map.service`

**19. Line 81:**
```typescript
import { llmService } from "../../llm/llm-service.js";
```
**Suggested:** `@a2a/gray-room/llm\llm-service`

**20. Line 82:**
```typescript
import { contextDiscoveryService } from "../../context/context-discovery.service.js";
```
**Suggested:** `@a2a/gray-room/context\context-discovery.service`

**21. Line 83:**
```typescript
import { resolveAiHubBaseUrl } from "../../utils/ai-hub-url.js";
```
**Suggested:** `@a2a/gray-room/utils\ai-hub-url`

**22. Line 84:**
```typescript
import { mkdtempOsTmp } from "../../utils/mkdtemp-os-tmp.js";
```
**Suggested:** `@a2a/gray-room/utils\mkdtemp-os-tmp`

**23. Line 85:**
```typescript
import { prepareLlmMessages } from "./llm-orchestration.js";
```
**Suggested:** `@a2a/gray-room/core\request-processor\llm-orchestration`

### 33. a2a-server\packages\features\src\gray-room\core\orchestrator\gray-room-orchestrator.ts

**Issues:** 16

**1. Line 16:**
```typescript
import { executeReadFile } from "../../../actions/handlers/file-operations.js";
```
**Suggested:** `@a2a/actions/handlers\file-operations`

**2. Line 28:**
```typescript
import type { ProcessResult } from "./request-processor.interfaces.js";
```
**Suggested:** `@a2a/gray-room/core\orchestrator\request-processor.interfaces`

**3. Line 44:**
```typescript
import { globalArtifactStore } from "../../artifact-store.js";
```
**Suggested:** `@a2a/gray-room/artifact-store`

**4. Line 45:**
```typescript
import { DedicatedAnalyzer } from "../../analyzer.js";
```
**Suggested:** `@a2a/gray-room/analyzer`

**5. Line 69:**
```typescript
import { handleCompressHistory } from "./gray-room-interrupt-handlers/compress-history.js";
```
**Suggested:** `@a2a/gray-room/core\orchestrator\gray-room-interrupt-handlers\compress-history`

**6. Line 70:**
```typescript
import { handleThinking } from "./gray-room-interrupt-handlers/thinking.js";
```
**Suggested:** `@a2a/gray-room/core\orchestrator\gray-room-interrupt-handlers\thinking`

**7. Line 71:**
```typescript
import { handleAutoReadFile } from "./gray-room-interrupt-handlers/auto-read-file.js";
```
**Suggested:** `@a2a/gray-room/core\orchestrator\gray-room-interrupt-handlers\auto-read-file`

**8. Line 72:**
```typescript
import { handleAutoRagPage } from "./gray-room-interrupt-handlers/auto-rag-page.js";
```
**Suggested:** `@a2a/gray-room/core\orchestrator\gray-room-interrupt-handlers\auto-rag-page`

**9. Line 73:**
```typescript
import { handleClarify } from "./gray-room-interrupt-handlers/clarify.js";
```
**Suggested:** `@a2a/gray-room/core\orchestrator\gray-room-interrupt-handlers\clarify`

**10. Line 74:**
```typescript
import { handleAlgorithmInvoke } from "./gray-room-interrupt-handlers/algorithm-invoke.js";
```
**Suggested:** `@a2a/gray-room/core\orchestrator\gray-room-interrupt-handlers\algorithm-invoke`

**11. Line 76:**
```typescript
import { globalRoleRegistry, AgentRole } from "../agent-role-registry.js";
```
**Suggested:** `@a2a/gray-room/core\agent-role-registry`

**12. Line 81:**
```typescript
import { llmService } from "../../llm/llm-service.js";
```
**Suggested:** `@a2a/gray-room/llm\llm-service`

**13. Line 82:**
```typescript
import { contextDiscoveryService } from "../../context/context-discovery.service.js";
```
**Suggested:** `@a2a/gray-room/context\context-discovery.service`

**14. Line 83:**
```typescript
import { resolveAiHubBaseUrl } from "../../utils/ai-hub-url.js";
```
**Suggested:** `@a2a/gray-room/utils\ai-hub-url`

**15. Line 84:**
```typescript
import { mkdtempOsTmp } from "../../utils/mkdtemp-os-tmp.js";
```
**Suggested:** `@a2a/gray-room/utils\mkdtemp-os-tmp`

**16. Line 85:**
```typescript
import { prepareLlmMessages } from "./llm-orchestration.js";
```
**Suggested:** `@a2a/gray-room/core\orchestrator\llm-orchestration`

### 34. a2a-server\packages\features\src\gray-room\components\memory\MuSE.ts

**Issues:** 1

**1. Line 1:**
```typescript
import { logger } from '../../utils/logger.js';
```
**Suggested:** `@a2a/gray-room/utils\logger`

### 35. a2a-server\packages\features\src\gray-room\components\context\ultracontext.service.ts

**Issues:** 1

**1. Line 4:**
```typescript
import { logger } from "../../utils/logger.js";
```
**Suggested:** `@a2a/gray-room/utils\logger`

### 36. a2a-server\packages\features\src\gray-room\components\context\context-discovery.service.ts

**Issues:** 1

**1. Line 3:**
```typescript
import { logger } from '../../utils/logger.js';
```
**Suggested:** `@a2a/gray-room/utils\logger`

### 37. a2a-server\packages\features\src\actions\src\actions\utils.ts

**Issues:** 1

**1. Line 1:**
```typescript
import { logger } from '../../lib/logger.js';
```
**Suggested:** `@a2a/actions/lib\logger`

### 38. a2a-server\packages\features\src\actions\src\actions\index.ts

**Issues:** 1

**1. Line 80:**
```typescript
export * as handlers from './handlers/index.js';
```
**Suggested:** `@a2a/actions/src\actions\handlers\index`

### 39. a2a-server\packages\features\src\actions\src\actions\action-service.ts

**Issues:** 4

**1. Line 8:**
```typescript
import { ActionDefinition, ActionMatch, ActionOutcome, ExecutionState, SubAction } from './types.js';
```
**Suggested:** `@a2a/actions/src\actions\types`

**2. Line 9:**
```typescript
import { ActionRegistry, actionRegistry } from './action-registry.js';
```
**Suggested:** `@a2a/actions/src\actions\action-registry`

**3. Line 10:**
```typescript
import { ActionExecutor, StepResult } from './action-executor.js';
```
**Suggested:** `@a2a/actions/src\actions\action-executor`

**4. Line 11:**
```typescript
import { logger } from '../../lib/logger.js';
```
**Suggested:** `@a2a/actions/lib\logger`

### 40. a2a-server\packages\features\src\actions\src\actions\action-registry.ts

**Issues:** 3

**1. Line 9:**
```typescript
import {ActionDefinition, ActionMatch} from './types.js';
```
**Suggested:** `@a2a/actions/src\actions\types`

**2. Line 10:**
```typescript
import {parseAllActionsFromDirectory} from './action-parser.js';
```
**Suggested:** `@a2a/actions/src\actions\action-parser`

**3. Line 11:**
```typescript
import {logger} from '../../lib/logger.js';
```
**Suggested:** `@a2a/actions/lib\logger`

### 41. a2a-server\packages\features\src\actions\src\actions\action-processor.ts

**Issues:** 3

**1. Line 16:**
```typescript
import {ActionService, ActionResponseSimulation} from './action-service.js';
```
**Suggested:** `@a2a/actions/src\actions\action-service`

**2. Line 17:**
```typescript
import {ActionDefinition, SubAction} from './types.js';
```
**Suggested:** `@a2a/actions/src\actions\types`

**3. Line 18:**
```typescript
import type {ContextBlock, ServerMessage, Task, TaskStatus, TaskType} from '../types/index.js';
```
**Suggested:** `@a2a/actions/src\types\index`

### 42. a2a-server\packages\features\src\actions\src\actions\action-parser.ts

**Issues:** 2

**1. Line 9:**
```typescript
import {ActionDefinition, SubAction, ActionContext, DSLDefinition} from './types.js';
```
**Suggested:** `@a2a/actions/src\actions\types`

**2. Line 10:**
```typescript
import {tryParseJsonFromLlmText} from '../../lib/strip-markdown-json-fence.js';
```
**Suggested:** `@a2a/actions/lib\strip-markdown-json-fence`

### 43. a2a-server\packages\features\src\actions\src\actions\action-handler-registry.ts

**Issues:** 3

**1. Line 7:**
```typescript
import {logger} from '../../lib/logger.js';
```
**Suggested:** `@a2a/actions/lib\logger`

**2. Line 8:**
```typescript
import * as handlers from './handlers/index.js';
```
**Suggested:** `@a2a/actions/src\actions\handlers\index`

**3. Line 9:**
```typescript
import {SkillEvolver} from '../services/core/skill-evolver.js';
```
**Suggested:** `@a2a/actions/src\services\core\skill-evolver`

### 44. a2a-server\packages\features\src\actions\src\actions\action-executor.ts

**Issues:** 1

**1. Line 1:**
```typescript
import { ActionDefinition, ExecutionState, SubAction, StepHistory } from './types.js';
```
**Suggested:** `@a2a/actions/src\actions\types`

### 45. a2a-server\packages\features\src\actions\handlers\file-operations\write-file.ts

**Issues:** 4

**1. Line 5:**
```typescript
import type {WriteFileActionInput, WriteFileActionOutput} from './types.js';
```
**Suggested:** `@a2a/actions/handlers\file-operations\types`

**2. Line 6:**
```typescript
import {validatePath} from './security.js';
```
**Suggested:** `@a2a/actions/handlers\file-operations\security`

**3. Line 7:**
```typescript
import {SWEVerifier} from '../../services/core/swe-verifier.js';
```
**Suggested:** `@a2a/actions/services\core\swe-verifier`

**4. Line 8:**
```typescript
import {executeAction} from '../../utils.js';
```
**Suggested:** `@a2a/actions/utils`

### 46. a2a-server\packages\features\src\actions\handlers\file-operations\read-file.ts

**Issues:** 3

**1. Line 4:**
```typescript
import type {ReadFileActionInput, ReadFileActionOutput} from './types.js';
```
**Suggested:** `@a2a/actions/handlers\file-operations\types`

**2. Line 5:**
```typescript
import {validatePath} from './security.js';
```
**Suggested:** `@a2a/actions/handlers\file-operations\security`

**3. Line 6:**
```typescript
import {executeAction} from '../../utils.js';
```
**Suggested:** `@a2a/actions/utils`

### 47. a2a-server\packages\features\src\actions\handlers\file-operations\list-directory.ts

**Issues:** 3

**1. Line 4:**
```typescript
import type {ListDirActionInput, ListDirActionOutput} from './types.js';
```
**Suggested:** `@a2a/actions/handlers\file-operations\types`

**2. Line 5:**
```typescript
import {validatePath} from './security.js';
```
**Suggested:** `@a2a/actions/handlers\file-operations\security`

**3. Line 6:**
```typescript
import {executeAction} from '../../utils.js';
```
**Suggested:** `@a2a/actions/utils`

### 48. a2a-server\packages\features\src\actions\handlers\file-operations\file-exists.ts

**Issues:** 1

**1. Line 4:**
```typescript
import type {FileExistsActionInput, FileExistsActionOutput} from './types.js';
```
**Suggested:** `@a2a/actions/handlers\file-operations\types`

### 49. a2a-server\packages\features\src\gray-room\core\request-processor\gray-room-interrupt-handlers\thinking.ts

**Issues:** 6

**1. Line 1:**
```typescript
import {resolveGrayRoomLlmModelFromContext} from '../llm-model-resolver.js';
```
**Suggested:** `@a2a/gray-room/core\request-processor\llm-model-resolver`

**2. Line 7:**
```typescript
import {logger} from '../../../utils/logger.js';
```
**Suggested:** `@a2a/gray-room/utils\logger`

**3. Line 8:**
```typescript
import {mergeSlotIntoWorkbenchContext} from '../gray-room-utils.js';
```
**Suggested:** `@a2a/gray-room/core\request-processor\gray-room-utils`

**4. Line 9:**
```typescript
import {tryParseJsonFromLlmText} from '../../../utils/strip-markdown-json-fence.js';
```
**Suggested:** `@a2a/gray-room/utils\strip-markdown-json-fence`

**5. Line 10:**
```typescript
import type {InterruptDirective, ServerInterruptTraceEvent, GrayRoomContext} from '../../../transform/types.js';
```
**Suggested:** `@a2a/gray-room/transform\types`

**6. Line 11:**
```typescript
import {BaseGrayRoomHandler} from './base-handler.js';
```
**Suggested:** `@a2a/gray-room/core\request-processor\gray-room-interrupt-handlers\base-handler`

### 50. a2a-server\packages\features\src\gray-room\core\request-processor\gray-room-interrupt-handlers\compress-history.ts

**Issues:** 6

**1. Line 1:**
```typescript
import {resolveGrayRoomLlmModelFromContext} from '../llm-model-resolver.js';
```
**Suggested:** `@a2a/gray-room/core\request-processor\llm-model-resolver`

**2. Line 2:**
```typescript
import { AgentSwing } from '../../agent-swing.js';
```
**Suggested:** `@a2a/gray-room/core\agent-swing`

**3. Line 3:**
```typescript
import { pollReadyThenFetch } from '../../../daemon/llm-hub-poll.js';
```
**Suggested:** `@a2a/gray-room/daemon\llm-hub-poll`

**4. Line 4:**
```typescript
import { logger } from '../../../utils/logger.js';
```
**Suggested:** `@a2a/gray-room/utils\logger`

**5. Line 5:**
```typescript
import type {InterruptDirective, ServerInterruptTraceEvent, GrayRoomContext} from '../../../transform/types.js';
```
**Suggested:** `@a2a/gray-room/transform\types`

**6. Line 6:**
```typescript
import {BaseGrayRoomHandler} from './base-handler.js';
```
**Suggested:** `@a2a/gray-room/core\request-processor\gray-room-interrupt-handlers\base-handler`

### 51. a2a-server\packages\features\src\gray-room\core\request-processor\gray-room-interrupt-handlers\clarify.ts

**Issues:** 3

**1. Line 1:**
```typescript
import type {InterruptDirective, ServerInterruptTraceEvent, GrayRoomContext} from '../../../transform/types.js';
```
**Suggested:** `@a2a/gray-room/transform\types`

**2. Line 2:**
```typescript
import {mergeSlotIntoWorkbenchContext} from '../gray-room-utils.js';
```
**Suggested:** `@a2a/gray-room/core\request-processor\gray-room-utils`

**3. Line 3:**
```typescript
import {BaseGrayRoomHandler} from './base-handler.js';
```
**Suggested:** `@a2a/gray-room/core\request-processor\gray-room-interrupt-handlers\base-handler`

### 52. a2a-server\packages\features\src\gray-room\core\request-processor\gray-room-interrupt-handlers\base-handler.ts

**Issues:** 2

**1. Line 1:**
```typescript
import type {InterruptDirective, ServerInterruptTraceEvent} from '../../../transform/types.js';
```
**Suggested:** `@a2a/gray-room/transform\types`

**2. Line 2:**
```typescript
import type {GrayRoomContext} from '../gray-room-utils.js';
```
**Suggested:** `@a2a/gray-room/core\request-processor\gray-room-utils`

### 53. a2a-server\packages\features\src\gray-room\core\request-processor\gray-room-interrupt-handlers\auto-read-file.ts

**Issues:** 3

**1. Line 1:**
```typescript
import {executeReadFile} from '../../../actions/handlers/file-operations.js';
```
**Suggested:** `@a2a/gray-room/actions\handlers\file-operations`

**2. Line 2:**
```typescript
import type {InterruptDirective, ServerInterruptTraceEvent, GrayRoomContext} from '../../../transform/types.js';
```
**Suggested:** `@a2a/gray-room/transform\types`

**3. Line 3:**
```typescript
import {BaseGrayRoomHandler} from './base-handler.js';
```
**Suggested:** `@a2a/gray-room/core\request-processor\gray-room-interrupt-handlers\base-handler`

### 54. a2a-server\packages\features\src\gray-room\core\request-processor\gray-room-interrupt-handlers\auto-rag-page.ts

**Issues:** 3

**1. Line 1:**
```typescript
import {ProgressiveRetriever} from '../../rag/progressive-retriever.js';
```
**Suggested:** `@a2a/gray-room/core\rag\progressive-retriever`

**2. Line 2:**
```typescript
import type {InterruptDirective, ServerInterruptTraceEvent, GrayRoomContext} from '../../../transform/types.js';
```
**Suggested:** `@a2a/gray-room/transform\types`

**3. Line 3:**
```typescript
import {BaseGrayRoomHandler} from './base-handler.js';
```
**Suggested:** `@a2a/gray-room/core\request-processor\gray-room-interrupt-handlers\base-handler`

### 55. a2a-server\packages\features\src\gray-room\core\request-processor\gray-room-interrupt-handlers\algorithm-invoke.ts

**Issues:** 5

**1. Line 1:**
```typescript
import type {AlgorithmContext, AlgorithmData} from '../../black-room/types.js';
```
**Suggested:** `@a2a/gray-room/core\black-room\types`

**2. Line 2:**
```typescript
import type {InterruptDirective, ServerInterruptTraceEvent, GrayRoomContext} from '../../../transform/types.js';
```
**Suggested:** `@a2a/gray-room/transform\types`

**3. Line 3:**
```typescript
import {BlackRoomOrchestrator} from '../../black-room/black-room-orchestrator.js';
```
**Suggested:** `@a2a/gray-room/core\black-room\black-room-orchestrator`

**4. Line 4:**
```typescript
import {mergeSlotIntoWorkbenchContext} from '../gray-room-utils.js';
```
**Suggested:** `@a2a/gray-room/core\request-processor\gray-room-utils`

**5. Line 5:**
```typescript
import {BaseGrayRoomHandler} from './base-handler.js';
```
**Suggested:** `@a2a/gray-room/core\request-processor\gray-room-interrupt-handlers\base-handler`

### 56. a2a-server\packages\features\src\gray-room\components\context\context\Ultracontext.ts

**Issues:** 2

**1. Line 1:**
```typescript
import { logger } from '../../utils/logger.js';
```
**Suggested:** `@a2a/gray-room/components\utils\logger`

**2. Line 2:**
```typescript
import { deepCloneJson } from '../../utils/deep-clone-json.js';
```
**Suggested:** `@a2a/gray-room/components\utils\deep-clone-json`

### 57. a2a-server\packages\features\src\gray-room\components\context\context\AgentSwing.ts

**Issues:** 2

**1. Line 1:**
```typescript
import { logger } from '../../utils/logger.js';
```
**Suggested:** `@a2a/gray-room/components\utils\logger`

**2. Line 2:**
```typescript
import { ultracontext } from './Ultracontext.js';
```
**Suggested:** `@a2a/gray-room/components\context\context\Ultracontext`

### 58. a2a-server\packages\features\src\actions\src\actions\handlers\run-script.ts

**Issues:** 1

**1. Line 7:**
```typescript
import {logger} from '../../../utils/logger.js';
```
**Suggested:** `@a2a/actions/utils\logger`

### 59. a2a-server\packages\features\src\actions\src\actions\handlers\phpantom.ts

**Issues:** 1

**1. Line 24:**
```typescript
import { logger } from '../../../utils/logger.js';
```
**Suggested:** `@a2a/actions/utils\logger`

### 60. a2a-server\packages\features\src\actions\src\actions\handlers\mcp-call.ts

**Issues:** 1

**1. Line 19:**
```typescript
import { logger } from '../../../utils/logger.js';
```
**Suggested:** `@a2a/actions/utils\logger`

### 61. a2a-server\packages\features\src\actions\src\actions\handlers\grep-search.ts

**Issues:** 2

**1. Line 7:**
```typescript
import {logger} from '../../../utils/logger.js';
```
**Suggested:** `@a2a/actions/utils\logger`

**2. Line 10:**
```typescript
import {validatePath} from './file-operations/security.js';
```
**Suggested:** `@a2a/actions/src\actions\handlers\file-operations\security`

### 62. a2a-server\packages\features\src\actions\src\actions\handlers\file-operations.ts

**Issues:** 4

**1. Line 5:**
```typescript
export {executeReadFile} from './file-operations/read-file.js';
```
**Suggested:** `@a2a/actions/src\actions\handlers\file-operations\read-file`

**2. Line 6:**
```typescript
export {executeWriteFile} from './file-operations/write-file.js';
```
**Suggested:** `@a2a/actions/src\actions\handlers\file-operations\write-file`

**3. Line 7:**
```typescript
export {executeFileExists} from './file-operations/file-exists.js';
```
**Suggested:** `@a2a/actions/src\actions\handlers\file-operations\file-exists`

**4. Line 8:**
```typescript
export {executeListDirectory} from './file-operations/list-directory.js';
```
**Suggested:** `@a2a/actions/src\actions\handlers\file-operations\list-directory`

### 63. a2a-server\packages\features\src\actions\src\actions\handlers\edit-patch.ts

**Issues:** 3

**1. Line 7:**
```typescript
import {logger} from '../../../utils/logger.js';
```
**Suggested:** `@a2a/actions/utils\logger`

**2. Line 8:**
```typescript
import {pathIsAccessible, timestampedBackupPath} from '../../../utils/fs-access.js';
```
**Suggested:** `@a2a/actions/utils\fs-access`

**3. Line 11:**
```typescript
import {validatePath} from './file-operations/security.js';
```
**Suggested:** `@a2a/actions/src\actions\handlers\file-operations\security`

### 64. a2a-server\packages\features\src\actions\src\actions\handlers\command-execution.ts

**Issues:** 3

**1. Line 7:**
```typescript
import {logger} from '../../../utils/logger.js';
```
**Suggested:** `@a2a/actions/utils\logger`

**2. Line 9:**
```typescript
import {validatePath} from './file-operations/security.js';
```
**Suggested:** `@a2a/actions/src\actions\handlers\file-operations\security`

**3. Line 10:**
```typescript
import {executeAction, ValidationResult} from '../utils.js';
```
**Suggested:** `@a2a/actions/src\actions\utils`

### 65. a2a-server\packages\features\src\actions\src\actions\handlers\file-operations\write-file.ts

**Issues:** 6

**1. Line 1:**
```typescript
import {logger} from '../../../utils/logger.js';
```
**Suggested:** `@a2a/actions/src\utils\logger`

**2. Line 2:**
```typescript
import {pathIsAccessible, timestampedBackupPath} from '../../../utils/fs-access.js';
```
**Suggested:** `@a2a/actions/src\utils\fs-access`

**3. Line 5:**
```typescript
import type {WriteFileActionInput, WriteFileActionOutput} from './types.js';
```
**Suggested:** `@a2a/actions/src\actions\handlers\file-operations\types`

**4. Line 6:**
```typescript
import {validatePath} from './security.js';
```
**Suggested:** `@a2a/actions/src\actions\handlers\file-operations\security`

**5. Line 7:**
```typescript
import {SWEVerifier} from '../../services/core/swe-verifier.js';
```
**Suggested:** `@a2a/actions/src\actions\services\core\swe-verifier`

**6. Line 8:**
```typescript
import {executeAction} from '../../utils.js';
```
**Suggested:** `@a2a/actions/src\actions\utils`

### 66. a2a-server\packages\features\src\actions\src\actions\handlers\file-operations\read-file.ts

**Issues:** 4

**1. Line 1:**
```typescript
import {logger} from '../../../utils/logger.js';
```
**Suggested:** `@a2a/actions/src\utils\logger`

**2. Line 4:**
```typescript
import type {ReadFileActionInput, ReadFileActionOutput} from './types.js';
```
**Suggested:** `@a2a/actions/src\actions\handlers\file-operations\types`

**3. Line 5:**
```typescript
import {validatePath} from './security.js';
```
**Suggested:** `@a2a/actions/src\actions\handlers\file-operations\security`

**4. Line 6:**
```typescript
import {executeAction} from '../../utils.js';
```
**Suggested:** `@a2a/actions/src\actions\utils`

### 67. a2a-server\packages\features\src\actions\src\actions\handlers\file-operations\list-directory.ts

**Issues:** 4

**1. Line 1:**
```typescript
import {logger} from '../../../utils/logger.js';
```
**Suggested:** `@a2a/actions/src\utils\logger`

**2. Line 4:**
```typescript
import type {ListDirActionInput, ListDirActionOutput} from './types.js';
```
**Suggested:** `@a2a/actions/src\actions\handlers\file-operations\types`

**3. Line 5:**
```typescript
import {validatePath} from './security.js';
```
**Suggested:** `@a2a/actions/src\actions\handlers\file-operations\security`

**4. Line 6:**
```typescript
import {executeAction} from '../../utils.js';
```
**Suggested:** `@a2a/actions/src\actions\utils`

### 68. a2a-server\packages\features\src\actions\src\actions\handlers\file-operations\file-exists.ts

**Issues:** 2

**1. Line 1:**
```typescript
import {logger} from '../../../utils/logger.js';
```
**Suggested:** `@a2a/actions/src\utils\logger`

**2. Line 4:**
```typescript
import type {FileExistsActionInput, FileExistsActionOutput} from './types.js';
```
**Suggested:** `@a2a/actions/src\actions\handlers\file-operations\types`

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
