# ADR-0018: Promise State Synchronization

Status: accepted
Date: 2026-03-06

## Context

Multiple promise daemons may process tasks concurrently, and the system needs to maintain consistent promise state across distributed workers. Without proper synchronization:

- Race conditions between daemons updating the same promise
- Inconsistent state views across different components
- Lost updates during daemon failures or restarts
- Difficult recovery from partial failures
- Stale data causing incorrect user feedback

The project needed a synchronization mechanism to ensure promise state consistency across distributed daemon workers.

## Decision

Implement optimistic locking with conflict resolution for promise state synchronization across distributed daemon workers.

### Synchronization Strategy

**Optimistic Locking:**
- Version numbers for each promise state
- Conflict detection on concurrent updates
- Automatic retry with exponential backoff
- Conflict resolution policies

**State Transition Rules:**
```javascript
// Valid state transitions
PENDING → PROCESSING (lock acquisition)
PROCESSING → COMPLETED | FAILED | TIMEOUT
PENDING | PROCESSING → CANCELLED (user/system cancellation)

// Invalid transitions prevented
COMPLETED → PROCESSING (impossible)
FAILED → COMPLETED (inconsistent)
```

**Conflict Resolution:**
```javascript
function resolveConflict(localState, remoteState, localVersion, remoteVersion) {
  if (remoteVersion > localVersion) {
    // Remote is newer, adopt remote state
    return { adopt: remoteState, retry: false };
  } else if (isCancellationConflict(localState, remoteState)) {
    // Cancellation takes precedence
    return { adopt: 'CANCELLED', retry: false };
  } else {
    // Retry with backoff
    return { adopt: localState, retry: true };
  }
}
```

### Synchronization Points

**Critical Sections:**
- Promise acquisition from queue
- State transition updates
- Result storage and notification
- Cancellation processing

**Synchronization Mechanisms:**
- Database-level locking for queue operations
- Version-based optimistic locking for state updates
- Eventual consistency for non-critical state
- Heartbeat monitoring for daemon health

## Consequences

### Positive
- **Data Consistency**: Guaranteed consistent promise states
- **Race Condition Prevention**: Proper handling of concurrent updates
- **Fault Tolerance**: Graceful handling of daemon failures
- **Scalability**: Multiple daemons can work concurrently
- **Recovery**: Automatic recovery from partial failures

### Negative
- **Performance Impact**: Locking and retries add latency
- **Complexity**: Additional synchronization logic to maintain
- **Deadlock Risk**: Improper locking can cause deadlocks
- **Network Overhead**: Synchronization requires network calls

### Trade-offs
- **Consistency vs Performance**: Strong consistency reduces performance
- **Complexity vs Reliability**: Synchronization logic adds complexity for reliability
- **Availability vs Consistency**: Optimistic locking balances both

## Notes / Follow-ups

### Completed
- ✅ Optimistic locking implementation
- ✅ Conflict resolution logic
- ✅ State transition validation
- ✅ Distributed synchronization
- ✅ Recovery mechanisms
- ✅ Performance monitoring

### Future Enhancements
- Consider CRDTs for better conflict resolution
- Add distributed consensus protocols
- Implement state machine validation
- Add synchronization metrics
- Consider Redis-based locking for better performance