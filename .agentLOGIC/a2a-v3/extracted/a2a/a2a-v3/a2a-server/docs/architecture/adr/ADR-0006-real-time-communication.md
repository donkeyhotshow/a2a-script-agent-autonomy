# ADR-0006: Real-time Communication

Status: accepted
Date: 2026-03-03

## Context

The A2A Server needs to provide real-time communication capabilities for:
- **Progress updates** during long-running request processing
- **Status notifications** for request state changes
- **Live logging** for debugging and monitoring
- **Client coordination** for action-based workflows
- **Error notifications** for immediate user feedback

The system must support:
- **Multiple concurrent clients** with individual session tracking
- **Reliable message delivery** with proper error handling
- **Scalable architecture** for growing user base
- **Fallback mechanisms** for connection issues
- **Efficient resource usage** to handle high message volumes

## Decision

Implement **Server-Sent Events (SSE)** as the primary real-time communication mechanism with the following architecture:

### 1. Communication Protocol

**Server-Sent Events (SSE):**
- **HTTP-based** protocol for server-to-client streaming
- **Automatic reconnection** with exponential backoff
- **Event types** for different message categories
- **Message ordering** and deduplication
- **Connection management** with proper cleanup

**Event Types:**
```typescript
interface SSEEvent {
  type: 'connected' | 'log' | 'progress' | 'status' | 'complete' | 'error';
  data: unknown;
  timestamp: string;
  sessionId?: string;
}
```

**Event Categories:**
- **connected** - Initial connection establishment
- **log** - Log messages for debugging and monitoring
- **progress** - Progress updates with percentage and message
- **status** - Request status changes
- **complete** - Request completion with results
- **error** - Error notifications with details

### 2. SSE Manager Implementation

**SSE Manager Class:**
```typescript
class SSEManager {
  private clients: Map<string, Response[]> = new Map();
  
  subscribe(sessionId: string, res: Response): void;
  unsubscribe(sessionId: string, res: Response): void;
  emit(sessionId: string, event: string, data: unknown): void;
  broadcast(event: string, data: unknown): void;
  disconnect(sessionId: string): void;
}
```

**Connection Management:**
- **Session-based** client tracking
- **Automatic cleanup** of disconnected clients
- **Heartbeat mechanism** to detect stale connections
- **Resource limits** to prevent memory leaks

### 3. Message Flow Architecture

**Message Processing Pipeline:**
```
Event Source → Message Formatter → SSE Manager → Client Connection → Browser
```

**Event Sources:**
- **Request Processor** - Progress and status updates
- **Action Executor** - Action execution events
- **LLM Integration** - LLM response events
- **System Events** - Health and monitoring events

**Message Formatting:**
- **JSON serialization** for structured data
- **Compression** for large payloads
- **Validation** for message integrity
- **Timestamping** for ordering and debugging

### 4. Client-Side Integration

**Client Library:**
```typescript
class SSEClient {
  private eventSource: EventSource | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  
  connect(url: string, onMessage: (event: MessageEvent) => void): void;
  disconnect(): void;
  reconnect(): void;
}
```

**Reconnection Strategy:**
- **Exponential backoff** for retry intervals
- **Maximum retry attempts** to prevent infinite loops
- **Connection state tracking** for user feedback
- **Graceful degradation** when SSE unavailable

### 5. Scalability Considerations

**Horizontal Scaling:**
- **Load balancer configuration** for sticky sessions
- **Shared state management** for multi-instance deployments
- **Message routing** for distributed systems
- **Connection pooling** for resource optimization

**Performance Optimization:**
- **Message batching** for high-frequency updates
- **Compression** for large payloads
- **Connection limits** per client
- **Memory management** for long-lived connections

### 6. Error Handling and Recovery

**Connection Errors:**
- **Network failures** with automatic reconnection
- **Server errors** with proper error reporting
- **Client disconnections** with cleanup
- **Timeout handling** for stuck connections

**Message Errors:**
- **Invalid messages** with error logging
- **Duplicate messages** with deduplication
- **Lost messages** with recovery mechanisms
- **Corrupted data** with validation

### 7. Monitoring and Observability

**Connection Metrics:**
- **Active connections** count and trends
- **Connection duration** and stability
- **Reconnection frequency** and success rate
- **Message throughput** and latency

**Error Monitoring:**
- **Connection failures** with root cause analysis
- **Message delivery** success rates
- **Client-side errors** with user impact
- **Performance bottlenecks** identification

## Consequences

### Positive

- **Simplicity**: SSE is simpler to implement than WebSockets
- **Reliability**: Built-in reconnection and error handling
- **Compatibility**: Works with all modern browsers
- **HTTP-friendly**: Uses standard HTTP connections
- **Scalability**: Can handle many concurrent connections
- **Debugging**: Easy to debug with browser developer tools

### Trade-offs

- **Unidirectional**: Server-to-client only (not suitable for client-to-server)
- **HTTP overhead**: Each message includes HTTP headers
- **Browser limits**: Limited concurrent connections per domain
- **Legacy support**: Older browsers may not support SSE

### Implementation Requirements

- **SSE endpoint** implementation in Express
- **Client-side library** for browser integration
- **Connection management** middleware
- **Error handling** and recovery mechanisms
- **Monitoring** and metrics collection
- **Load testing** for scalability validation

## Alternatives Considered

### 1. WebSockets
- **Pros**: Full-duplex communication, lower overhead
- **Cons**: More complex implementation, requires WebSocket server
- **Rejected**: SSE sufficient for current requirements

### 2. Long Polling
- **Pros**: Works with all browsers, simple implementation
- **Cons**: Higher latency, more server resources
- **Rejected**: SSE provides better performance and features

### 3. HTTP Streaming
- **Pros**: Customizable, full control
- **Cons**: Complex implementation, browser compatibility issues
- **Rejected**: SSE provides standardized approach

## Notes / Follow-ups

- Implement comprehensive load testing for SSE connections
- Set up monitoring for connection health and performance
- Plan for horizontal scaling with shared state management
- Consider implementing fallback to long polling for older browsers
- Add client-side error handling and user feedback
- Implement proper cleanup for long-running connections
- Consider implementing message queuing for offline clients