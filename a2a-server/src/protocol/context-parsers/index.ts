/**
 * Context Parsers Index
 *
 * Re-exports all context parsers and factory functions
 */

// Base parser
export {
    BaseContextParser,
    ParseContext,
    ParseResult,
    PROTOCOL_VERSION,
    VALID_TASK_STATUSES,
    VALID_TASK_TYPES,
    isValidContextBlock,
    extractSessionId,
    validateContextVersion,
} from './base-parser.js';

// Action context parser
export {
    ActionContextParser,
    ActionContext,
    ActionExecutionState,
    ProposedAction,
    createActionContextParser,
} from './action-context-parser.js';

// Simulation context parser
export {
    SimulationContextParser,
    SimulationContext,
    SimulationState,
    ReplayData,
    ReplayEvent,
    createSimulationContextParser,
} from './simulation-context-parser.js';

// Form context parser
export {
    FormContextParser,
    FormContext,
    FormState,
    FormChoice,
    FormInput,
    createFormContextParser,
} from './form-context-parser.js';

// Error context parser
export {
    ErrorContextParser,
    ErrorContext,
    ParsedError,
    StackFrame,
    createErrorContextParser,
} from './error-context-parser.js';

// Parser registry/factory
export { ContextParserRegistry, createParserForContext } from './registry.js';

// Legacy functions (deprecated)
export * from './legacy.js';
