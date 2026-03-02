# TASKS Entity Type

- **Color:** #84cc16 (lime)
- **Icon:** 📋
- **Description:** Task definitions, jobs, scheduled operations

## Properties

| Property    | Type   | Description       |
|-------------|--------|-------------------|
| id          | string | Unique identifier |
| name        | string | Task name         |
| path        | string | File path         |
| description | string | Task description  |

## Example

```
json
{
  "id": "task-001",
  "type": "tasks",
  "name": "Daily Build",
  "path": "/tasks/daily-build.js",
  "description": "Scheduled daily build task"
}
```

## Related Types

- Created by: AGENTS, ACTIONS
- Uses: SCRIPTS, SERVICES
- Can trigger: NODES, TERMINATORS
