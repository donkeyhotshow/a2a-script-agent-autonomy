# A2A Web Client Tester

CLI tool for managing and testing A2A web client through API server commands sent via Server-Sent Events (SSE).

## ✅ Implementation Complete

This system has been fully implemented and tested. It provides:

- **CLI Tool**: Command-line interface for remote web client control
- **API Endpoints**: RESTful endpoints for command routing via SSE
- **Web Client Integration**: Command processing in TransportManager
- **Comprehensive Documentation**: Full API and integration guides
- **Test Framework**: Automated testing for all functionality

## Quick Start

```bash
# Install dependencies
cd a2a-client/tester
npm install

# Start API server
cd a2a-client/packages/sdk
npm run dev

# Use CLI (in another terminal)
cd a2a-client/tester
node cli.js status
node cli.js send ping
node cli.js panel show task-panel
```

## Overview

The A2A Web Client Tester provides a command-line interface to interact with the A2A web client remotely. It sends commands through the API server which forwards them to connected web clients via SSE, enabling automated testing, monitoring, and control of the frontend.

## Features

- **Remote Control**: Send commands to web clients through API server
- **Real-time Monitoring**: Monitor web client events via SSE
- **Panel Management**: Control UI panels (show/hide, position, resize)
- **Session Management**: Create, update, and monitor sessions
- **Automated Testing**: Run test suites against web client
- **Interactive Mode**: Guided testing with prompts

## Installation

```bash
cd a2a-client/tester
npm install
npm link  # Make globally available as 'a2a-tester'
```

## Usage

### Basic Commands

```bash
# Connect to web client session
a2a-tester connect

# Send custom command
a2a-tester send "custom_command" --data '{"key": "value"}'

# Monitor events
a2a-tester monitor --filter "panel_update"

# Control panels
a2a-tester panel show task-panel --x 100 --y 200
a2a-tester panel hide chat-panel
a2a-tester panel move debug-panel --x 50 --y 50

# Manage sessions
a2a-tester session create --title "Test Session"
a2a-tester session list
a2a-tester session switch --id "session-123"

# Get status
a2a-tester status

# Run tests
a2a-tester test --suite panels
a2a-tester test --interactive

# Health check
npm run health
```

### Global Options

- `-u, --api-url <url>`: API server URL (default: http://localhost:3001)
- `-s, --session <id>`: Session ID (default: tester-session)
- `-v, --verbose`: Verbose output
- `--json`: Output JSON format

## Command Reference

### connect
Connect to a web client session for real-time communication.

```bash
a2a-tester connect [options]
```

Options:
- `-t, --timeout <ms>`: Connection timeout (default: 5000)

### send
Send a custom command to the web client.

```bash
a2a-tester send <command> [options]
```

Options:
- `-d, --data <json>`: Command data as JSON string
- `-w, --wait`: Wait for response

### monitor
Monitor web client events in real-time.

```bash
a2a-tester monitor [options]
```

Options:
- `-f, --filter <type>`: Filter events by type

### panel
Control web client panels.

```bash
a2a-tester panel <action> [panelId] [options]
```

Actions:
- `show` - Show panel
- `hide` - Hide panel
- `move` - Move panel
- `resize` - Resize panel
- `minimize` - Minimize panel
- `maximize` - Maximize panel
- `close` - Close panel

Options:
- `--x <x>` - X position
- `--y <y>` - Y position
- `--width <w>` - Width
- `--height <h>` - Height

### session
Manage web client sessions.

```bash
a2a-tester session <action> [options]
```

Actions:
- `create` - Create new session
- `list` - List sessions
- `switch` - Switch to session
- `delete` - Delete session

Options:
- `-i, --id <id>` - Session ID
- `-t, --title <title>` - Session title

### status
Get web client status information.

```bash
a2a-tester status
```

### test
Run automated tests.

```bash
a2a-tester test [options]
```

Options:
- `-s, --suite <name>` - Test suite name
- `--interactive` - Run in interactive mode

## Architecture

```
CLI Tool → API Server → SSE → Web Client → TransportManager → UI Components
    ↑                                                            ↓
    └──────────────────── Response Flow ────────────────────────┘
```

### Command Flow

1. CLI sends HTTP POST to `/api/tester/command` with command payload
2. API server validates and forwards command via SSE to web client
3. Web client receives command through TransportManager
4. Command is processed and executed on UI components
5. Response flows back through the same channels

### Event Monitoring

- CLI connects to `/api/sse/{sessionId}` for real-time event streaming
- All web client events are forwarded to monitoring CLI instances
- Events include panel updates, session changes, command responses, etc.

## Testing

### Test Suites

- **panels**: Panel management functionality
- **sessions**: Session creation and management
- **commands**: Command execution and response handling
- **performance**: Load and performance testing
- **all**: Run all test suites

### Example Test Run

```bash
# Run all tests interactively
a2a-tester test --interactive

# Run specific test suite
a2a-tester test --suite panels

# Run tests with JSON output
a2a-tester test --suite commands --json
```

## Configuration

### Environment Variables

- `A2A_API_URL`: API server URL (default: http://localhost:3001)
- `A2A_SESSION_ID`: Default session ID (default: tester-session)

### Configuration File

Create `config.json` in the tester directory:

```json
{
  "apiUrl": "http://localhost:3001",
  "defaultSession": "tester-session",
  "timeout": 5000,
  "verbose": false
}
```

## Development

### Project Structure

```
a2a-client/tester/
├── cli.js              # Main CLI script
├── package.json        # Package configuration
├── README.md          # This file
├── tests/             # Test suites
│   ├── panels.js
│   ├── sessions.js
│   ├── commands.js
│   └── performance.js
└── lib/               # Utility libraries
    ├── commands.js
    ├── sse-client.js
    └── utils.js
```

### Adding New Commands

1. Add command definition in `cli.js`
2. Implement command handler if needed
3. Add corresponding web client handler in TransportManager
4. Update tests and documentation

### Web Client Integration

Commands are processed by the web client's TransportManager. Add new command handlers:

```javascript
// In TransportManager._bindSSEEvents()
eventSource.addEventListener('tester_command', (event) => {
  const { command, data } = JSON.parse(event.data);
  handleTesterCommand(command, data);
});
```

## Troubleshooting

### Connection Issues

- Ensure API server is running on correct port
- Check session ID matches web client session
- Verify SSE endpoint is accessible

### Command Not Executing

- Check command format and required parameters
- Verify web client is connected and listening
- Check browser console for JavaScript errors

### Monitoring Not Working

- Ensure SSE connection is established
- Check event filters are correct
- Verify web client is sending events

## Related Documentation

- [A2A Protocol](../../docs/new-request-flow/PROTOCOL.md)
- [Web Client Architecture](../web/README.md)
- [API Server Documentation](../../../a2a-server/README.md)
- [Testing Guide](../../docs/TESTING-MOCKING-GUIDE.md)