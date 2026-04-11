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
} from './types';

// Validation (action-key shape + invoke envelope; see action-validator.ts)
export {
    VALID_EXECUTE_KEYS,
    VALID_RESULT_KEYS,
    validateActionKeyShape,
    validateExecutePayloadDetailed,
    validateInvokeEnvelopeResponse,
    type ValidationResult,
    type ExecuteKey,
    type ResultKey,
} from './action-validator';

// Parser functions from action-parser.ts
export {
    parseActionFromMarkdown,
    parseAllActionsFromDirectory,
    parsePrimitive,
    parseSubAction,
    parseActionContext,
} from './action-parser';

// Registry from action-registry.ts
export {
    ActionRegistry,
    actionRegistry,
    getActionRegistry,
} from './action-registry';

// Executor and types from action-executor.ts
export {
    ActionExecutor,
    type StepResult,
    type ActionResult,
} from './action-executor';

// Service and factory from action-service.ts
export {
    ActionService,
    actionService,
    getActionService,
    createActionResponse,
    type ActionResponseSimulation,
} from './action-service';

// Processor from action-processor.ts
export {
    ActionProcessor,
    actionProcessor,
    type ActionProcessorResult,
} from './action-processor';

// Action Handler Registry
export {
    ActionHandlerRegistry,
    actionHandlerRegistry,
    type ActionType,
    type ActionHandler,
    type ActionHandlerContext,
} from './action-handler-registry';

// Action Handlers
export * as handlers from './handlers/index';

// Utilities
export {
    normalizeForMatching
} from './utils/string-utils';
