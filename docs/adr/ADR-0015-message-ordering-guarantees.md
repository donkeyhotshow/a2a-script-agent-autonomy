# ADR-0015: Message Ordering Guarantees

Status: accepted
Date: 2026-03-06

## Context

Real-time communication systems can suffer from message reordering due to network conditions, transport protocol differences, or concurrent processing. The Web UI needs to maintain correct message ordering to ensure proper session state and user experience. Without ordering guarantees:

- Messages could appear out of chronological order
- Session state could become inconsistent
- User actions might be processed in wrong sequence
- Race conditions between UI updates and server events
- Difficult debugging of timing-related issues

The system needed mechanisms to ensure message ordering across different transport protocols and network conditions.

## Decision

Implement message ordering guarantees through sequence numbers, deduplication, and buffering mechanisms.

### Ordering Mechanisms

**Sequence Numbers:**
- Each message includes a monotonically increasing sequence number
- Server assigns sequence numbers to all events
- Client validates and buffers out-of-order messages
- UI updates only when sequence is contiguous

**Message Buffering:**
```javascript
class MessageBuffer {
  constructor() {
    this.buffer = new Map(); // sequence -> message
    this.nextExpected = 0;
  }

  addMessage(sequence, message) {
    if (sequence === this.nextExpected) {
      this.processMessage(message);
      this.nextExpected++;
      this.processBuffered();
    } else if (sequence > this.nextExpected) {
      this.buffer.set(sequence, message);
    }
    // Ignore duplicates (sequence < nextExpected)
  }

  processBuffered() {
    while (this.buffer.has(this.nextExpected)) {
      const message = this.buffer.get(this.nextExpected);
      this.processMessage(message);
      this.buffer.delete(this.nextExpected);
      this.nextExpected++;
    }
  }
}
```

**Deduplication:**
- Message IDs prevent duplicate processing
- Transport layer deduplicates during reconnection
- State updates are idempotent

### Transport-Specific Handling

**Persistent-channel ordering:**
- The persistent connection guarantees order within each session
- Reconnection may still cause gaps that require buffering and validation

**HTTP Polling Ordering:**
- Client-side buffering ensures chronologic playback between polls
- Sequence validation on each poll response detects missing or duplicate items

## Consequences

### Positive
- **Consistent State**: Messages always processed in correct order
- **Race Condition Prevention**: Eliminates timing-related bugs
- **Better UX**: Chronological message display
- **Debugging Simplicity**: Clear message flow and sequencing
- **Network Resilience**: Handles reordering from network issues

### Negative
- **Latency Impact**: Buffering can delay message processing
- **Memory Usage**: Buffer storage for out-of-order messages
- **Complexity**: Additional sequencing logic to maintain
- **Head-of-Line Blocking**: One delayed message blocks subsequent ones

### Trade-offs
- **Consistency vs Latency**: Guaranteed ordering may increase perceived latency
- **Memory vs Reliability**: Buffer usage for ordering guarantees
- **Complexity vs Correctness**: Additional logic for guaranteed behavior

## Notes / Follow-ups

### Completed
- ✅ Sequence number assignment by server
- ✅ Message buffer implementation
- ✅ Deduplication logic
- ✅ Transport-specific ordering handling
- ✅ UI integration with ordered updates

### Future Enhancements
- Consider causal ordering for complex interactions
- Add configurable buffer sizes and timeout handling
- Implement compression for buffered messages
- Add sequence number validation in tests
- Consider vector clocks for distributed ordering
