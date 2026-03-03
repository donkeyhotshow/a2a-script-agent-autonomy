/**
 * Request Processors
 *
 * Specialized processors for different types of requests.
 * Each processor extends BaseRequestProcessor and handles a specific request type.
 */

// Base processor and registry
export {
    BaseRequestProcessor,
    ProcessorRegistry,
    processorRegistry,
    DEFAULT_PROCESSOR_CONFIG
} from './base-processor.js';

export type {
    BaseProcessorConfig,
    RequestType
} from './base-processor.js';

// Action request processor
export {
    ActionRequestProcessor,
    actionRequestProcessor
} from './action-request-processor.js';

export type {
    ActionProcessorConfig
} from './action-request-processor.js';

// Simulation request processor
export {
    SimulationRequestProcessor,
    simulationRequestProcessor
} from './simulation-request-processor.js';

export type {
    SimulationConfig,
    SimulationContext
} from './simulation-request-processor.js';

// Form request processor
export {
    FormRequestProcessor,
    formRequestProcessor
} from './form-request-processor.js';

export type {
    FormDefinition,
    FormField,
    FormSubmission,
    FormValidationError
} from './form-request-processor.js';

// Neuron request processor
export {
    NeuronRequestProcessor,
    neuronRequestProcessor
} from './neuron-request-processor.js';
