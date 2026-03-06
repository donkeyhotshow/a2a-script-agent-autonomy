# Code Editing Guide

> **How to safely modify code in this project**

## Before You Edit

### 1. Read These Files

| Priority | File | Why |
|----------|------|-----|
| Critical | `AGENTS.md` | Canonical patterns and rules |
| Critical | `simulations/SCHEMA.md` | Message format specification |
| High | `workflows/0-architecture-overview.md` | System boundaries |
| Medium | Relevant workflow doc | Specific patterns for your change |

### 2. Run Tests

```bash
# Always run before editing
npm test

# If tests fail, fix before continuing
```

## Safe Editing Patterns

### Adding New Feature

```
1. Create simulation first
   simulations/my-feature/
   ├── request.json
   ├── request.md
   ├── response.md
   └── response.json

2. Run simulation validation
   npm run sim:validate

3. Implement feature
   - Add tests first (TDD)
   - Implement code
   - Verify against simulation

4. Update workflows/
   - Document new flow
   - Add editing instructions
```

### Modifying Existing Code

```
1. Identify entry point
   - Check workflows/ for relevant doc
   - Read AGENTS.md for patterns

2. Add logging
   - Add console.log at entry
   - Add console.log at exit
   - Verify flow understanding

3. Make minimal change
   - One feature per edit
   - No refactoring mixed with features

4. Run tests
   - npm test
   - npm run test:integration
   - npm run test:sim

5. Remove logging
   - Clean up debug code
```

### Common Mistakes

| Mistake | Why Bad | Correct |
|---------|---------|---------|
| Edit without tests | Can't verify | Run tests first |
| Multiple changes | Hard to debug | One change at a time |
| Skip AGENTS.md | Wrong pattern | Always read rules |
| Direct localStorage | Bypasses adapters | Use Storage API |
| Flat action format | Legacy, deprecated | Use action-key shape |
| Import without .js | NodeNext error | Add .js extension |

## Validation Checklist

Before committing changes:

- [ ] Tests pass (`npm test`)
- [ ] Simulations valid (`npm run sim:validate`)
- [ ] No `console.log` left (unless intentional)
- [ ] AGENTS.md patterns followed
- [ ] Action-key shape used
- [ ] Imports have .js extension

## Debugging Tips

### Enable Debug Mode

```javascript
// In browser console - set window flags
window.DEBUG = true;
window.DEBUG_TRANSPORT = true;
window.DEBUG_AI_ACTIONS = true;

// Or use SessionStore debug method
SessionStore.debug();
```

### Check Event Flow

```javascript
// Monitor all events
EventBus.on('*', (event, data) => {
  console.log('[Event]', event, data);
});
```

### Inspect Storage

```javascript
// View all sessions
const sessions = await storage.getAllSessions();
console.table(sessions);
```

## Where to Add Code

| Want to... | Add to... | Example |
|------------|-----------|---------|
| Add storage adapter | `session-store-adapters.js` | New backend support |
| Add transport | `transport/new-transport.js` | WebSocket alternative |
| Add action handler | `components/ai-actions/handlers.js` | New execute type |
| Add panel type | `panel-manager.js` + CSS | Custom panel |
| Add server action | `a2a-server/actions/definitions/` | New automation |
| Add message type | `protocol/` (server) + validator | New event type |

## Testing Your Changes

### Unit Tests

```bash
# Test specific module
npm test -- --grep "storage"

# Watch mode
npm test -- --watch
```

### Integration Tests

```bash
# Needs database
SKIP_AUTH=1 npm run test:integration
```

### Simulation Tests

```bash
# Golden standard
npm run test:sim

# Specific simulation
npm run test:sim -- coder
```

### Manual Testing

```bash
# Start all services
npm run dev

# Use comprehensive CLI testing framework
cd a2a-client/tester

# Basic status check
node cli.js status

# Send commands to web client
node cli.js send ping
node cli.js panel show task-panel

# Monitor events in real-time
node cli.js monitor --filter tester_command

# Run automated test suites
node cli.js test --interactive

# Manage sessions
node cli.js session create --title "Test Session"
```

### CLI Testing Framework

The project includes a comprehensive CLI testing framework located in `a2a-client/tester/`:

#### Available Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `connect` | Establish WebSocket connection | `cli.js connect --timeout 5000` |
| `send <cmd>` | Send command to web client | `cli.js send ping` |
| `monitor` | Monitor SSE events | `cli.js monitor --filter tester_command` |
| `panel <action>` | Control UI panels | `cli.js panel show task-panel` |
| `session <action>` | Manage sessions | `cli.js session create --title "Test"` |
| `status` | Get system status | `cli.js status` |
| `test` | Run automated tests | `cli.js test --suite panels` |

#### PowerShell Integration Tests

For comprehensive Level 3 testing, use the PowerShell scripts:

```bash
# Full E2E client testing
.\scripts\test-a2a-client.ps1

# Individual component tests
.\scripts\test-services-basic.ps1
.\scripts\test-web-ui.ps1
```

## Getting Help

1. Check relevant workflow doc in `workflows/`
2. Read `AGENTS.md` again
3. Look at existing code in same directory
4. Check simulations for examples
5. Run with debug logging enabled

## Emergency Rollback

```bash
# If everything breaks
git checkout -- .
npm install
npm test
```
