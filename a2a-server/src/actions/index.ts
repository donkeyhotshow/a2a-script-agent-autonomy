/**
 * Index file for Actions system - exports all modules
 *
 * Реализация на основе плана: plans/action-scripts-integration.md
 *
 * Usage:
 * ```typescript
 * import { actionService, ActionDefinition, ... } from './actions/index.js';
 * ```
 */

 // Types from types.ts
export type {
    DSLDefinition,
    ActionContext,
    SubAction,
    ActionDefinition,
    StepStatus,
    StepHistory,
    ExecutionState,
    ActionMatch,
    ActionOutcome,
    ActionResponse,
} from './types.js';

// Generated types (from YAML definitions)
export type {
    // Execute action types
    FormInput,
    FormChoice,
    FormAction,
    ScriptAction,
    RagSearchFilters,
    RagSearchOptions,
    RagSearchAction,
    RagSearchResult,
    ReadFileAction,
    WriteFileAction,
    ExecuteCommandAction,
    ExecuteCommandResult,
    MessageAction,
    ExecutePayload,
    ExecuteActionType,
    ActionResult,
    FormResult,
    ScriptResult,
    RagSearchResultPayload,
    ReadFileResult,
    WriteFileResult,
} from './generated-types.js';

// Validation functions
export {
    validateExecutePayload,
    validateActionResult,
    validateActionDefinition,
    validateFormAction,
    validateScriptAction,
    validateRagSearchAction,
    validateReadFileAction,
    validateWriteFileAction,
    validateExecuteCommandAction,
    validateMessageAction,
    validateExecutePayloadDetailed,
    validateActionKeyShape,
    validateActionResponse,
    createActionValidator,
    validateRagSearchResult,
    validateReadFileResult,
    validateWriteFileResult,
    validateExecuteCommandResult,
    type ValidationResult,
} from './action-validator.js';

// Parser functions from action-parser.ts
export {
    parseActionFromMarkdown,
    parseAllActionsFromDirectory,
    // Additional parser utilities
    parsePrimitive,
    parseSubAction,
    parseActionContext,
} from './action-parser.js';

// Registry from action-registry.ts
export {
    ActionRegistry,
    actionRegistry,
    getActionRegistry,
} from './action-registry.js';

// Executor and types from action-executor.ts
export {
    ActionExecutor,
    type StepResult,
    type ActionResult,
} from './action-executor.js';

// Service and factory from action-service.ts
export {
    ActionService,
    actionService,
    getActionService,
    createActionResponse,
    type ActionResponseSimulation,
} from './action-service.js';

// Processor from action-processor.ts
export {
    ActionProcessor,
    actionProcessor,
    type ActionProcessorResult,
} from './action-processor.js';

// Auto-AI definitions index
export {
    AUTO_AI_CATEGORIES,
    AUTO_AI_ACTION_IDS,
    getActionIdsByCategory,
    getCategories,
    isAutoAiAction,
    getCategoryForAction,
    type AutoAiCategory,
} from './definitions/auto-ai-index.js';
