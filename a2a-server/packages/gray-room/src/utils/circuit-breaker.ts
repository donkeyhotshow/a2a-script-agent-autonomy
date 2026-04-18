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
} from '../../../lib/circuit-breaker.js';

export type {
    CircuitBreakerOptions,
    RetryMetrics,
} from '../../../lib/circuit-breaker.js';
