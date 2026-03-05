# Local client CLI

This CLI lives inside `a2a-client/cli` and talks directly to the local `HistoryManager` storage (`.a2a-sessions`). It **does not** call any remote API, so you can use it during manual testing to inspect sessions, exchange logs, messages and other metadata without spinning up the server.

## Running

1. Install the dependencies (already part of the workspace):
   ```bash
   cd a2a-client
   npm install
   ```
2. Run the CLI via the new npm script:
   ```bash
   npm run cli -- <command> [options]
   ```

Arguments after `--` flow directly to the CLI script. The global flags (`--project`, `--json`) may appear before or after the command name; anything else is considered part of the command-specific arguments.

## Commands

| Command | Description |
| --- | --- |
| `list-sessions` | Show IDs, names and status for every stored session |
| `show-session [sessionId]` | Print plan/task summary, exchange log size and tags for a session (defaults to the first session) |
| `exchange-log <sessionId>` | Dump stored exchange-log entries (`--type` filters by `request`, `response` or `error`) |
| `messages <sessionId>` | Print reconstructed assistant/user messages from the log |
| `create-session <name>` | Create a new session (`--description`, `--tags` optional, comma-separated) |
| `add-exchange <sessionId>` | Append a manual exchange-log entry (`--type`, `--content`, `--metadata`) |

## Options

- `--project <path>` — override the client root (default is the parent directory of this CLI script). Useful if you run the CLI from another checkout location.
- `--json` — print raw JSON blobs instead of pretty tables/text.

## Examples

```bash
npm run cli -- list-sessions
npm run cli -- show-session 86a2c3e
npm run cli -- exchange-log 86a2c3e --type=response
npm run cli -- create-session "Manual test" --description "Dry run filters"
npm run cli -- add-exchange 86a2c3e --type=response --content '{}'
```

You can pair `--json` with any command when you want machine-readable output (for example, to pipe the exchange log into another tool).

## Purpose

The CLI mirrors what the web UI stores locally: session metadata, plans, tasks, exchange logs, and partial message reconstruction. Because it never hits the API, it is safe to run during manual experiments or while debugging offline scenarios. Use it to seed exchange-log entries, check context synchronization, or verify that a simulated `sessionId` has the right metadata before the web UI loads it.
