/**
 * Re-export CircuitBreaker from the shared lib so tests and modules inside
 * packages/gray-room can import from '../../src/utils/circuit-breaker'
 * without duplicating the implementation.
 */
export {
    CircuitBreaker,
    CircuitBreakerOpenError,
    withCircuitBreaker,
    DEFAULT_CIRCUIT_BREAKER_OPTIONS,
} from '../../../server-utils/src/circuit-breaker.js';

export type {
    CircuitBreakerOptions,
    RetryMetrics,
} from '../../../server-utils/src/circuit-breaker.js';
