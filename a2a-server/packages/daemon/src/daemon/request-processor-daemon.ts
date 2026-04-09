/**
 * A2A Server daemon — background queue processing (timer-driven).
 * Facade over `request-processor.service` for a clear entrypoint in `src/index.ts`.
 */
export {
    startRequestProcessor,
    stopRequestProcessor,
    processOneRequest,
} from '../services/core/request-processor/request-processor.service.js';
