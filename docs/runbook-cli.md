# Runbook CLI System

## Overview

The `runbook-cli` is a comprehensive service management system designed to replace manual `npm run dev`, `node`, and `start-all.bat` commands. It provides intelligent orchestration of the A2A (Agent-to-Agent) system components with built-in dependency management, error handling, and API-driven monitoring.

## Key Features

### Single Launch Guarantee
- Prevents multiple instances of the same service
- Manages process lifecycle with PID tracking
- Automatic cleanup of orphaned processes

### Dependency-Aware Restarts
- Forces restart of services based on dependency chains
- Supports selective restart of individual services or all services
- Handles service interdependencies automatically

### Intelligent Error Handling
- Validates service startup success by checking PID capture
- Checks API health when ports are occupied
- Provides detailed error messages with direct logfile links
- Shows specific log file paths for each service type

### API Integration
- Running services expose REST API endpoints for health/status
- CLI queries APIs when ports are occupied instead of attempting restart
- Retrieves detailed error information, traces, and diagnostics from services

## Architecture

The runbook-cli follows the same approach as `start-all.bat`:

```
CLI Tool (runbook-cli) → Existing Start Scripts → Service APIs → Logs
     ↓                           ↓                       ↓         ↓
Port Checks              scripts/start-*.bat        Health Checks  Log Files
Dependency Resolution    PID Capture              Error Details   Error Links
Process Cleanup          kill-all.bat             Status Display
```

## Service Components

The system manages the following services:

| Service | Port | API Endpoint | Dependencies |
|---------|------|--------------|--------------|
| AI Integration (Proxy) | 11434 | `/health` | None (optional upstream via env / `providers.json`) |
| A2A Server | 3000 | `/health` | AI Integration |
| Client API | 3001 | `/api/a2a/projects` | A2A Server |
| Web UI | 5173 | `/api/a2a/projects` | Client API |

## Usage

### Basic Commands

```powershell
# Start all services (following start-all.bat approach)
.\runbook-cli.ps1 -Command start

# Start specific services and their dependencies
.\runbook-cli.ps1 -Command start -Services a2a-server,web-ui

# Restart all services
.\runbook-cli.ps1 -Command restart

# Stop all services
.\runbook-cli.ps1 -Command stop

# Check service status
.\runbook-cli.ps1 -Command status
```

### Command Reference

#### `runbook-cli start [service]`

Starts services in dependency order. If no service specified, starts all services.

- **Behavior**: Checks port availability, starts services sequentially, validates startup
- **Error Handling**: If service fails to start, displays error message and logfile path
- **API Integration**: If port occupied, queries service API for current status/error details

#### `runbook-cli restart [service]`

Forces restart of services. Dependencies are automatically included.

- **Behavior**: Kills existing processes, waits for ports to free, starts services
- **Force Mode**: Uses aggressive process termination (SIGKILL equivalent)
- **Validation**: Verifies all services restart successfully

#### `runbook-cli stop`

Stops all running services gracefully.

- **Behavior**: Sends termination signals, waits for clean shutdown
- **Fallback**: Force kills processes that don't respond to graceful shutdown

#### `runbook-cli status`

Displays current status of all services.

- **Output**: PID, port status, health check results, API connectivity
- **Format**: Color-coded status indicators (🟢 running, 🔴 error, 🟡 starting)

## Error Handling Workflow

### Service Startup Failure

1. **Detection**: CLI monitors process startup and port binding
2. **Validation**: Performs health checks against service API endpoints
3. **Reporting**: Displays error message with direct link to logfile

Example error output:
```
[2024-01-15 10:30:00] Starting a2a-server on port 3000...
[2024-01-15 10:30:10] ERROR: a2a-server failed to start
[2024-01-15 10:30:10] Check logfile: C:\workspace\org-carrier\a2a-script-agent\a2a-server\logs\a2a-server.log
```

When port is occupied but service not responding:
```
[2024-01-15 10:30:00] Port 3000 is occupied. Checking if service is responding...
[2024-01-15 10:30:05] ERROR: a2a-server port occupied but service not responding
[2024-01-15 10:30:05] Cannot connect to service API: Connection refused
[2024-01-15 10:30:05] Check logfile: C:\workspace\org-carrier\a2a-script-agent\a2a-server\logs\a2a-server.log
```

### Port Occupation Handling

When attempting to start a service on an occupied port:

1. **Detection**: Port binding fails
2. **API Query**: CLI queries existing service on that port for status
3. **Information Retrieval**: Gets error details, traceback, and diagnostic data
4. **Reporting**: Displays current service status and any errors

Example API response handling:
```json
{
  "status": "error",
  "error": "Database connection failed",
  "traceback": "...",
  "timestamp": "2024-01-15T10:30:00Z",
  "logfile": "/path/to/service.log"
}
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `RUNBOOK_CLI_TIMEOUT` | Startup timeout in seconds | 60 |
| `RUNBOOK_CLI_FORCE_KILL` | Enable force kill on timeout | true |
| `RUNBOOK_CLI_API_TIMEOUT` | API request timeout in seconds | 10 |
| `RUNBOOK_CLI_LOG_LEVEL` | Logging verbosity | info |

### Service Configuration

Services are configured in `runbook-config.json`:

```json
{
  "services": {
    "a2a-server": {
      "port": 3000,
      "health_endpoint": "/health",
      "start_command": "cd a2a-server && npm run dev",
      "dependencies": ["ai-integration"],
      "logfile": "a2a-server/logs/a2a-server.log"
    }
  }
}
```

## Implementation Notes

### Process Management
- Calls existing `scripts/start-*.bat` scripts for each service
- Uses `kill-all.bat` for environment cleanup
- Maintains `.pids.txt` file for PID tracking
- Implements port-based service detection

### Dependency Resolution
- Hardcoded dependency chains as requested
- Topological sort ensures proper startup order
- Sequential startup following start-all.bat pattern

### API Integration
- Leverages existing health endpoints (`/health`, `/api/tags`, etc.)
- Port occupation detection triggers API status queries
- Error details retrieved from running services when ports are busy

### Logging Integration
- Uses existing log files created by start scripts
- Direct file path references for error investigation
- Compatible with project's logging infrastructure

## Development Status

- **Phase 1**: Basic service management (completed)
- **Phase 2**: API integration for error details (in progress)
- **Phase 3**: Advanced dependency management (planned)
- **Phase 4**: Web dashboard interface (future)

## Files

- `runbook-cli.ps1` - Main standalone PowerShell CLI script
- `runbook-cli.md` - This documentation

The CLI uses PowerShell jobs for background process management and ensures subprocess cleanup on script termination.</content>
<parameter name="filePath">runbook-cli.md