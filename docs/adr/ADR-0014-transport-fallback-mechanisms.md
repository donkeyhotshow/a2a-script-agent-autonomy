# ADR-0014: Transport Fallback Mechanisms

Status: accepted
Date: 2026-03-06

## Context

Real-time communication failures can occur due to network issues, firewall restrictions, proxy configurations, or protocol limitations. The system needed robust fallback mechanisms to ensure continuous operation when primary transport methods fail. Without proper fallbacks:

- Users experience complete loss of real-time updates
- Sessions become unresponsive during network issues
- No graceful degradation when SSE/WebSocket are blocked
- Difficult recovery from transient network failures
- Poor user experience in enterprise environments with restrictive proxies

## Decision

Implement automatic transport fallback with progressive degradation and intelligent recovery mechanisms.

### Fallback Hierarchy

1. **SSE (Primary)** - Attempt connection, monitor for 30 seconds
2. **WebSocket (Fallback)** - If SSE fails, attempt WebSocket connection
3. **HTTP Polling (Last Resort)** - If WebSocket fails, use HTTP polling

### Fallback Triggers

**Automatic Fallback Conditions:**
- SSE connection timeout (>30 seconds)
- SSE network errors (CORS, firewall blocking)
- SSE protocol errors (malformed events)
- WebSocket connection failure
- WebSocket protocol errors

**Recovery Logic:**
- Attempt fallback only after primary transport fails
- Maintain message queue during transition
- Preserve session state across transport switches
- Revert to better transport when available

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
- ✅ SSE to WebSocket automatic switching
- ✅ WebSocket to HTTP polling fallback
- ✅ Exponential backoff reconnection
- ✅ Message queuing during transitions
- ✅ Transport health monitoring

### Future Enhancements
- Add transport quality scoring for intelligent selection
- Implement connection pooling for better resource utilization
- Add user preference for transport selection
- Consider QUIC/WebTransport for modern fallback options
- Add detailed connection analytics for debugging