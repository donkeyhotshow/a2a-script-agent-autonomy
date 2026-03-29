# CLI Hub Action

**ID:** `cli-hub`  
**Description:** Dispatch CLI commands to the Laravel agent system core. Acts as a hub for routing commands to appropriate handlers.  
**Source:** `laravel-agent-workspace-tools/scripts/cli-hub.js`

## Metadata

| Field | Value |
|-------|-------|
| version | 1.0.0 |
| author | greedy-dump integration |
| tags | cli, laravel, dispatch |

## Input Schema

```json
{
  "command": "string (required) - CLI command to execute",
  "arg": "string (optional) - Argument for the command"
}
```

## Output Schema

```json
{
  "success": "boolean",
  "message": "string - Result or error message",
  "command": "string - Command that was executed"
}
```

## Sub-actions

### `dispatch-command`

Dispatches a command through the CLI hub system.

```typescript
export default async function run(input: {
  command: string;
  arg?: string;
}): Promise<{
  success: boolean;
  message: string;
  command: string;
}> {
  const { command, arg } = input;

  if (!command) {
    return {
      success: false,
      message: "Command is required",
      command: ""
    };
  }

  try {
    // Dispatch command via CLI hub
    // In a real implementation, this would call the handleCLICommand from core/index.js
    console.log(`--- AI Agent System: CLI HUB ---`);
    console.log(`Command: ${command}`);
    console.log(`Argument: ${arg || "(none)"}`);

    // Simulate command dispatch
    const validCommands = [
      "migrate",
      "test",
      "build",
      "deploy",
      "validate",
      "restore"
    ];

    if (validCommands.includes(command)) {
      return {
        success: true,
        message: `Command '${command}' dispatched successfully${arg ? ` with arg: ${arg}` : ""}`,
        command
      };
    } else {
      return {
        success: false,
        message: `Unknown command: '${command}'. Valid commands: ${validCommands.join(", ")}`,
        command
      };
    }
  } catch (error) {
    return {
      success: false,
      message: `Error dispatching command: ${error instanceof Error ? error.message : String(error)}`,
      command
    };
  }
}
```

## Error Handling

- Returns `success: false` with error message if command dispatch fails
- Returns `success: false` for unknown commands

## Usage Example

```json
{
  "execute": {
    "cli-hub": {
      "command": "migrate",
      "arg": "php-components"
    }
  }
}