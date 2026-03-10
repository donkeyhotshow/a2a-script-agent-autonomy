# ADR-0013: Unified Transport Layer

Status: superseded
Date: 2026-03-06

## Note

This ADR has been superseded by the **async `promiseId` flow**. The system now uses HTTP with `promiseId` polling:
Server returns `promiseId`, Client API polls `/requests/:id/status` until `completed`, then returns `execute.*` to Web.

## Previous Decision (Superseded)

Implement a unified TransportManager that consolidates multiple transport channels into a single abstraction with automatic protocol selection and failover.

### Architecture (Superseded)

**TransportManager** (`transport-manager.js`) originally provided:
- Primary real-time channel with automatic fallback
- HTTP polling as last resort for complete transport failure
- Consistent reconnection logic with exponential backoff
- Unified event interface for all transport types
- Connection health monitoring and reporting

### Current Implementation

**TransportManager** now uses async `promiseId` polling:
- Server returns `{ promiseId, status: "pending" }`
- Client API polls `/requests/:promiseId/status` until `completed`
- When completed, Client API returns `execute.*` to Web
- SSE/WebSocket optional for realtime progress updates

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
- ✅ Real-time channel integration
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
