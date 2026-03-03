/**
 * Message Builders Module
 *
 * Экспорты всех специализированных билдеров сообщений
 */

// Base Builder
export {
    BaseMessageBuilder,
    MessageBuilderOptions,
    ValidationResult,
    PROTOCOL_VERSION,
} from './base-builder.js';

// Action Message Builder
export {
    ActionMessageBuilder,
    ActionClientMessageBuilder,
    ActionStep,
    ProposedAction,
    ActionMessageOptions,
    createActionMessageBuilder,
    createActionClientMessageBuilder,
} from './action-message-builder.js';

// Simulation Message Builder
export {
    SimulationMessageBuilder,
    SimulationStep,
    SimulationOptions,
    createSimulationMessageBuilder,
} from './simulation-message-builder.js';

// Form Message Builder
export {
    FormMessageBuilder,
    FormResponseMessageBuilder,
    FormChoice,
    FormField,
    FormOptions,
    createFormMessageBuilder,
    createFormResponseMessageBuilder,
} from './form-message-builder.js';

// Error Message Builder
export {
    ErrorMessageBuilder,
    ErrorDetails,
    ErrorOptions,
    ErrorCode,
    createErrorMessageBuilder,
    quickError,
} from './error-message-builder.js';
