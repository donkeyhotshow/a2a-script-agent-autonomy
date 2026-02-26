# Terminal Tool

## Overview
Terminal command execution tool for AI agents.

## Package
`@a2a/terminal`

## Path
`a2a-client/packages/terminal/`

## Description
Terminal handler with command execution, pre-processing and post-processing capabilities.

## Features
- Command execution with timeout
- Directory change tracking (cd, pushd, popd)
- Command history persistence
- Session management
- Security analysis
- Workspace management

## Usage

```javascript
const { TerminalHandler } = require('@a2a/terminal');

const handler = new TerminalHandler(server);
await handler.handleTerminalTool(id, args);
```

## API

### TerminalHandler
Main handler class for terminal operations.

#### Methods
- `handleTerminalTool(id, args)` - Handle terminal tool call
- `handleDirectTerminalCommand(id, args)` - Handle direct command
- `handleStructuredTerminalAction(id, args)` - Handle structured actions

### Command Converter
Converts emulated commands to MCP tools.

### Core Utilities
- `resolvePathCore` - Resolve relative paths
- `analyzeDirectoryChangeCore` - Analyze directory change commands
- `shouldPersistHistoryCore` - Check if history should persist
- `checkHistoryLimitCore` - Check history limit

## Dependencies
- `execa` - Command execution

## Status: READY

## Extracted from
`legacy-code-to-assimilate/node-terminal/`
