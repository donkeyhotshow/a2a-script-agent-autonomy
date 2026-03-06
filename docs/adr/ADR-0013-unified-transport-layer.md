# ADR-0013: Unified Transport Layer

Status: accepted
Date: 2026-03-06

## Context

The Web UI component required reliable real-time communication with the server for session updates, but different transport mechanisms (SSE, WebSocket, HTTP polling) were handled by separate components with inconsistent fallback logic. This led to:

- Complex transport selection logic scattered across components
- Inconsistent error handling and reconnection strategies
- Race conditions between transport switches
- Poor user experience during network issues
- Difficult maintenance and testing of transport logic

The project needed a unified transport layer that could seamlessly handle multiple communication protocols with automatic failover and consistent behavior.

## Decision

Implement a unified TransportManager that consolidates SSE, WebSocket, and HTTP polling into a single abstraction with automatic protocol selection and failover.

### Architecture

**TransportManager** (`transport-manager.js`) provides:
- Primary SSE transport with automatic WebSocket fallback
- HTTP polling as last resort for complete transport failure
- Consistent reconnection logic with exponential backoff
- Unified event interface for all transport types
- Connection health monitoring and reporting

### Protocol Priority

1. **SSE (Server-Sent Events)** - Primary transport
   - Low latency for server-to-client messages
   - Automatic reconnection built into browser API
   - Heartbeat monitoring every 30 seconds

2. **WebSocket** - Fallback transport
   - Bidirectional communication when SSE fails
   - Manual reconnection with backoff strategy
   - Message queuing during reconnection

3. **HTTP Polling** - Last resort
   - Traditional request/response for environments blocking SSE/WebSocket
   - Higher latency but guaranteed delivery
   - Configurable polling intervals

### Connection States

```javascript
enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}
```

## Consequences

### Positive
- **Improved Reliability**: Automatic failover ensures continuous connectivity
- **Better User Experience**: Seamless transport switching without user intervention
- **Simplified API**: Single interface for all transport operations
- **Consistent Behavior**: Unified error handling and reconnection logic
- **Easier Testing**: Centralized transport logic simplifies testing scenarios

### Negative
- **Increased Complexity**: TransportManager adds abstraction layer
- **Resource Usage**: Maintaining multiple connection attempts
- **Debugging Difficulty**: Transport switching can complicate issue diagnosis

### Trade-offs
- **Reliability vs Performance**: Multiple connection attempts use more resources but ensure connectivity
- **Simplicity vs Flexibility**: Unified API sacrifices some protocol-specific features
- **Automatic vs Manual**: Removes user control over transport selection for consistency

## Notes / Follow-ups

### Completed
- ✅ TransportManager core implementation
- ✅ SSE primary transport integration
- ✅ WebSocket fallback logic
- ✅ HTTP polling last resort
- ✅ Connection health monitoring
- ✅ Exponential backoff reconnection
- ✅ Integration with SessionStore

### Future Enhancements
- Add connection quality metrics (latency, packet loss)
- Implement adaptive polling intervals based on connection quality
- Add transport preference configuration
- Consider WebRTC for peer-to-peer scenarios
- Add bandwidth monitoring and adaptive behavior