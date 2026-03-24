# A2A Web Client Tester Documentation

## Overview

The A2A Web Client Tester is a comprehensive CLI-based testing and automation framework that enables remote control and monitoring of A2A web clients through API server commands sent via Server-Sent Events (SSE).

## Architecture

```
CLI Tool (tester/)
    ↓ HTTP POST
API Server (/api/tester/command)
    ↓ SSE Broadcast
Web Client (TransportManager)
    ↓ Command Processing
UI Components (PanelManager, SessionStore, etc.)
```

## Key Components

### 1. CLI Tool (`cli.js`)
Command-line interface for sending commands to web clients.

**Features:**
- Interactive and programmatic command execution
- Real-time event monitoring via SSE
- Comprehensive test suites
- JSON output support for automation

### 2. API Server Integration (`tester.routes.ts`)
Server-side endpoints for command routing.

**Endpoints:**
- `POST /api/tester/command` - Send command to specific session
- `GET /api/tester/status` - Get tester system status
- `GET /api/tester/sessions` - List active sessions
- `POST /api/tester/broadcast` - Broadcast command to all sessions

### 3. Web Client Integration (`command-handler.js`)
Client-side command processing and execution.

**Features:**
- Command registration system
- Panel control integration
- Session management
- Response handling via WebSocket

### 4. Test Framework (`tests/`)
Comprehensive test suites for validation.

**Test Suites:**
- **Panels**: UI panel management testing
- **Sessions**: Session creation and switching
- **Commands**: Command execution and response validation
- **Performance**: Load and latency testing

## Command Protocol

### Command Structure
```javascript
{
  type: "tester_command",
  commandId: "cmd_1234567890_abc123",
  command: "panel_control",
  data: {
    action: "show",
    panelId: "task-panel"
  },
  sessionId: "tester-session",
  timestamp: "2026-03-06T21:27:00.000Z",
  source: "api_server"
}
```

### Response Structure
```javascript
{
  type: "tester_response",
  commandId: "cmd_1234567890_abc123",
  response: {
    success: true,
    result: {
      panelId: "task-panel",
      action: "shown"
    }
  },
  timestamp: "2026-03-06T21:27:01.000Z"
}
```

## Available Commands

### Panel Commands

| Command | Data | Description |
|---------|------|-------------|
| `panel_control` | `{action, panelId, position?, size?}` | Unified panel control |
| `show_panel` | `{panelId}` | Show specific panel |
| `hide_panel` | `{panelId}` | Hide specific panel |
| `move_panel` | `{panelId, position: {x, y}}` | Move panel to coordinates |
| `resize_panel` | `{panelId, size: {width, height}}` | Resize panel |

### Session Commands

| Command | Data | Description |
|---------|------|-------------|
| `session_control` | `{action, ...params}` | Unified session control |
| `create_session` | `{title?}` | Create new session |
| `switch_session` | `{sessionId}` | Switch to session |
| `list_sessions` | `{}` | List all sessions |
| `delete_session` | `{sessionId}` | Delete session |

### Utility Commands

| Command | Data | Description |
|---------|------|-------------|
| `ping` | `{}` | Ping test |
| `echo` | `{message}` | Echo data back |
| `get_status` | `{}` | Get client status |
| `get_timestamp` | `{}` | Get current timestamp |
| `debug_info` | `{}` | Get debug information |

## Usage Examples

### Basic Panel Control
```bash
# Show task panel
a2a-tester send panel_control --data '{"action":"show","panelId":"task-panel"}'

# Move panel to position
a2a-tester panel move task-panel --x 100 --y 200

# Resize panel
a2a-tester panel resize debug-panel --width 600 --height 400
```

### Session Management
```bash
# Create new session
a2a-tester session create --title "Test Session"

# Switch to session
a2a-tester session switch --id "sess_123"

# List all sessions
a2a-tester session list
```

### Monitoring and Testing
```bash
# Monitor events
a2a-tester monitor --filter "panel_update"

# Run panel tests
a2a-tester test --suite panels

# Run all tests interactively
a2a-tester test --interactive
```

## Integration Points

### TransportManager Integration
- Receives `tester_command` and `tester_broadcast` events
- Forwards commands to CommandHandler
- Sends responses back via WebSocket

### PanelManager Integration
- Panel creation, showing, hiding
- Position and size manipulation
- State synchronization

### SessionStore Integration
- Session creation and switching
- State persistence
- Multi-session support

## Testing Strategy

### Unit Testing
Individual command handlers and utility functions.

### Integration Testing
Full command flow from CLI → API Server → Web Client → Response.

### Performance Testing
- Command latency measurement
- Concurrent command handling
- Memory usage monitoring
- Connection stability testing

### End-to-End Testing
Complete user workflows and scenarios.

## Security Considerations

### Authentication
- Commands require valid session context
- API endpoints use optional authentication
- Session isolation prevents cross-session commands

### Validation
- Command data validation on both client and server
- Safe command execution with error boundaries
- Timeout protection for long-running commands

### Rate Limiting
- Command frequency limits to prevent abuse
- Queue management for high-volume testing
- Resource usage monitoring

## Troubleshooting

### Connection Issues
1. Verify API server is running on correct port
2. Check session ID matches web client session
3. Ensure SSE/WebSocket connections are established

### Command Failures
1. Check command syntax and required parameters
2. Verify web client has necessary components loaded
3. Review browser console for JavaScript errors

### Performance Issues
1. Monitor command latency with performance tests
2. Check for memory leaks in long-running tests
3. Verify network connectivity and bandwidth

## Development

### Adding New Commands
1. Define command in `CommandHandler._registerCommands()`
2. Implement handler function
3. Add validation logic if needed
4. Update CLI interface and documentation
5. Add corresponding tests

### Extending Test Framework
1. Create new test file in `tests/` directory
2. Export `run()` function
3. Add to main CLI test command
4. Follow existing test patterns

### API Extensions
1. Add new routes in `tester.routes.ts`
2. Update SSE manager if needed
3. Document new endpoints
4. Add client-side integration

## Related Documentation

- [Web Client Documentation](../README.md)
- [API Server Documentation](../../../a2a-server/README.md)
- [Server Testing Mocking Guide](../../../a2a-server/docs/TESTING-MOCKING-GUIDE.md)

## Future Enhancements

- **Recording/Playback**: Record and replay command sequences
- **Visual Testing**: Screenshot comparison and UI validation
- **Load Testing**: Distributed command execution
- **Plugin System**: Extensible command architecture
- **Web UI**: Browser-based tester interface