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
} from '@a2a/server-utils';

export type {
    CircuitBreakerOptions,
    RetryMetrics,
} from '@a2a/server-utils';
