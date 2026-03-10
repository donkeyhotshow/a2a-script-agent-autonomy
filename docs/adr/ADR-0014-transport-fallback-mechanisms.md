# ADR-0014: Transport Fallback Mechanisms

Status: superseded
Date: 2026-03-06

## Note

This ADR has been superseded by the **async `promiseId` flow**. The system now uses HTTP with `promiseId` polling.
Fallback mechanisms are no longer needed — Client API simply polls until `completed`.

## Previous Decision (Superseded)

Implement automatic transport fallback with progressive degradation and intelligent recovery mechanisms.

### Fallback Hierarchy (Superseded)

1. **Primary channel** - Attempt connection, monitor for 30 seconds
2. **Secondary channel** - If the primary channel fails, switch to the backup path
3. **HTTP Polling (Last Resort)** - If all fallback channels fail, use HTTP polling

### Current Implementation

No fallback mechanisms needed — all communication uses async `promiseId` polling:
- Server returns `promiseId`
- Client API polls `/requests/:promiseId/status` until `completed`
- When completed, returns `execute.*` to Web

### Reconnection Strategy

**Exponential Backoff:**
```javascript
// Base delay: 3 seconds
// Max attempts: 5
// Backoff multiplier: 2x
attempts: [3s, 6s, 12s, 24s, 48s]
```

**Smart Reconnection:**
- Detect network recovery and attempt upgrade
- Avoid reconnection storms with jitter
- Respect server rate limits
- Graceful degradation during outages

## Consequences

### Positive
- **Continuous Connectivity**: Users maintain connection even with transport failures
- **Enterprise Compatibility**: Works in restrictive network environments
- **Automatic Recovery**: No user intervention required for transport issues
- **Better Reliability**: Progressive degradation instead of complete failure
- **Network Resilience**: Handles various network conditions gracefully

### Negative
- **Increased Complexity**: Multiple transport implementations to maintain
- **Resource Overhead**: Maintaining fallback connections consumes resources
- **Latency Impact**: HTTP polling introduces higher latency
- **Debugging Complexity**: Transport switching complicates issue diagnosis

### Trade-offs
- **Reliability vs Performance**: Fallback mechanisms ensure connectivity at cost of performance
- **Automatic vs Manual**: Removes user control for guaranteed operation
- **Complexity vs User Experience**: Added complexity for seamless experience

## Notes / Follow-ups

### Completed
- ✅ Fallback decision tree implementation
- ✅ Automated channel switching
- ✅ HTTP polling fallback
- ✅ Exponential backoff reconnection
- ✅ Message queuing during transitions
- ✅ Transport health monitoring

### Future Enhancements
- Add transport quality scoring for intelligent selection
- Implement connection pooling for better resource utilization
- Add user preference for transport selection
- Consider QUIC/WebTransport for modern fallback options
- Add detailed connection analytics for debugging
