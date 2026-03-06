# SSE Connection Issues

Server-Sent Events (SSE) connection problems and their solutions.

## Common SSE Issues

### CORS Blocking

**Symptoms:**
- SSE connection fails immediately
- Browser console shows CORS error
- Network tab shows blocked request

**Causes:**
- Server not configured for cross-origin requests
- Missing CORS headers on SSE endpoint
- Incorrect origin configuration

**Solutions:**

1. **Server Configuration**
```javascript
// Express.js CORS setup
const cors = require('cors');
app.use(cors({
  origin: ['http://localhost:5173', 'https://yourdomain.com'],
  credentials: true
}));
```

2. **SSE Endpoint Headers**
```javascript
// Ensure SSE endpoint returns proper CORS headers
app.get('/api/sse/:sessionId', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  // ... rest of SSE logic
});
```

3. **Client-Side Fallback**
```javascript
// TransportManager automatically falls back to WebSocket
// Check if fallback occurred
transport.on('connected', ({ transport, fallback }) => {
  if (fallback) {
    console.log('Using WebSocket fallback due to CORS');
  }
});
```

### Network Failures

**Symptoms:**
- SSE connects but disconnects randomly
- Intermittent connection drops
- "Failed to fetch" errors

**Causes:**
- Network instability
- Proxy/firewall blocking
- Server connection limits
- Browser tab/background throttling

**Solutions:**

1. **Check Network Connectivity**
```bash
# Test basic connectivity
curl -I https://your-server.com/api/sse/test

# Test with authentication
curl -H "Authorization: Bearer YOUR_TOKEN" \
     https://your-server.com/api/sse/test
```

2. **Browser Network Inspection**
- Open DevTools → Network tab
- Filter by "EventSource" or SSE endpoint
- Check for 502, 503, 504 errors
- Look for "net::ERR_NETWORK_CHANGED"

3. **Connection Recovery**
```javascript
// TransportManager handles reconnection automatically
transport.on('reconnecting', ({ attempt, maxAttempts }) => {
  console.log(`Reconnecting... ${attempt}/${maxAttempts}`);
});

transport.on('disconnected', ({ reason }) => {
  if (reason === 'max_attempts') {
    // Manual intervention needed
    showReconnectButton();
  }
});
```

### Server-Side SSE Problems

**Symptoms:**
- SSE endpoint returns 404
- Server doesn't send events
- Events arrive but malformed

**Causes:**
- SSE endpoint not implemented
- Server not sending proper event format
- Event data not JSON-parseable

**Solutions:**

1. **Verify Endpoint Exists**
```bash
# Test SSE endpoint directly
curl -N https://your-server.com/api/sse/test-session-id
```

2. **Check Server Event Format**
```javascript
// Server should send properly formatted events
const eventData = {
  type: 'message',
  data: { content: 'Hello from server' }
};

res.write(`data: ${JSON.stringify(eventData)}\n\n`);
```

3. **Client Event Parsing**
```javascript
// TransportManager handles event parsing
transport.on('message', (data) => {
  try {
    // Data should already be parsed
    console.log('Received:', data);
  } catch (e) {
    console.error('Failed to parse event:', e);
  }
});
```

### WebSocket Fallback Debugging

**Symptoms:**
- Application works but shows "fallback" messages
- WebSocket connection fails
- Performance issues with HTTP polling

**Causes:**
- WebSocket endpoint not available
- Protocol mismatch (ws vs wss)
- Firewall blocking WebSocket ports

**Solutions:**

1. **Verify WebSocket Endpoint**
```bash
# Test WebSocket upgrade
curl -I -H "Upgrade: websocket" \
     -H "Connection: Upgrade" \
     https://your-server.com/api/ws/test-session
```

2. **Check Protocol Mismatch**
```javascript
// TransportManager handles protocol automatically
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const url = `${protocol}//${host}${apiBase}/ws/${sessionId}`;
console.log('WebSocket URL:', url);
```

3. **Fallback Behavior**
```javascript
// Monitor fallback usage
transport.on('connected', ({ transport, fallback }) => {
  if (transport === 'websocket' && !fallback) {
    console.log('Direct WebSocket connection');
  } else if (fallback) {
    console.log('WebSocket fallback - check primary transport');
  }
});
```

## Diagnostic Procedures

### Connection Health Check
```javascript
function diagnoseConnection() {
  const state = TransportManager.getState();

  console.log('Connection diagnostics:');
  console.log('- State:', state.connectionState);
  console.log('- Transport:', state.activeTransport);
  console.log('- Session:', state.sessionId);
  console.log('- Reconnect attempts:', state.reconnectAttempts);

  if (state.connectionState === 'disconnected') {
    console.log('🔴 DISCONNECTED - Check network and server');
  } else if (state.activeTransport === 'websocket') {
    console.log('🟡 WEBSOCKET FALLBACK - SSE preferred');
  } else {
    console.log('🟢 HEALTHY - SSE connection active');
  }
}
```

### Event Monitoring
```javascript
function monitorEvents() {
  const events = [];

  // Monitor all transport events
  ['connecting', 'connected', 'disconnected', 'reconnecting',
   'transportError', 'message'].forEach(event => {
    TransportManager.on(event, (data) => {
      events.push({ event, data, timestamp: Date.now() });
      console.log(`Transport: ${event}`, data);
    });
  });

  // Check event frequency
  setInterval(() => {
    const recentEvents = events.filter(e =>
      Date.now() - e.timestamp < 30000); // Last 30 seconds
    console.log(`Events in last 30s: ${recentEvents.length}`);
  }, 30000);
}
```

### Network Request Inspection
```javascript
// Log all HTTP requests (fallback mode)
const originalFetch = window.fetch;
window.fetch = function(...args) {
  console.log('HTTP Request:', args[0], args[1]);
  return originalFetch.apply(this, args)
    .then(response => {
      console.log('HTTP Response:', response.status, response.url);
      return response;
    })
    .catch(error => {
      console.error('HTTP Error:', error);
      throw error;
    });
};
```

## Common Error Messages

| Error Message | Likely Cause | Solution |
|---------------|--------------|----------|
| `EventSource failed to connect` | CORS or network issue | Check CORS headers |
| `net::ERR_NETWORK_CHANGED` | Network instability | Wait for reconnection |
| `WebSocket connection failed` | Firewall or protocol | Check WebSocket endpoint |
| `SSE timeout` | Server not responding | Check server SSE implementation |
| `Invalid event data` | Malformed JSON | Fix server event format |

## Prevention Best Practices

### Server Configuration
```javascript
// Robust SSE headers
function setupSSEHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Cache-Control');
}

// Heartbeat for connection health
function sendHeartbeat(res) {
  setInterval(() => {
    res.write('data: {"type": "heartbeat"}\n\n');
  }, 30000);
}
```

### Client Resilience
```javascript
// Implement connection monitoring
class ConnectionMonitor {
  constructor() {
    this.lastActivity = Date.now();
    this.checkInterval = setInterval(() => this.checkHealth(), 60000);
  }

  checkHealth() {
    const timeSinceActivity = Date.now() - this.lastActivity;
    if (timeSinceActivity > 300000) { // 5 minutes
      console.warn('No activity for 5 minutes, reconnecting...');
      TransportManager.disconnect();
      TransportManager.connect(currentSessionId);
    }
  }

  recordActivity() {
    this.lastActivity = Date.now();
  }
}
```

### Error Boundaries
```javascript
// Wrap connection logic in error boundaries
async function safeConnect(sessionId) {
  try {
    const connected = await TransportManager.connect(sessionId);
    if (!connected) {
      throw new Error('All connection methods failed');
    }
  } catch (error) {
    console.error('Connection failed:', error);
    // Show user-friendly error
    showConnectionError(error.message);
    // Attempt recovery
    setTimeout(() => safeConnect(sessionId), 5000);
  }
}
```