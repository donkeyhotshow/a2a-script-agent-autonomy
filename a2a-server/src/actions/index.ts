/**
 * Index file for Actions system - Simulation Mode
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

// Validation functions
export {
    validateExecutePayload,
    validateActionResult,
    validateActionDefinition,
    validateFormAction,
    validateScriptAction,
    validateReadFileAction,
    validateWriteFileAction,
    validateExecuteCommandAction,
    validateMessageAction,
    validateExecutePayloadDetailed,
    validateActionKeyShape,
    validateActionResponse,
    createActionValidator,
    validateReadFileResult,
    validateWriteFileResult,
    validateExecuteCommandResult,
    type ValidationResult,
} from './action-validator.js';

// Parser functions from action-parser.ts
export {
    parseActionFromMarkdown,
    parseAllActionsFromDirectory,
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

// Action Handler Registry
export {
    ActionHandlerRegistry,
    actionHandlerRegistry,
    type ActionType,
    type ActionHandler,
    type ActionHandlerContext,
} from './action-handler-registry.js';

// Action Handlers
export * as handlers from './handlers/index.js';
