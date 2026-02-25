# TERMINATORS Entity Type

- **Color:** #ef4444 (red)
- **Icon:** 🛑
- **Description:** End states, termination points, exit conditions

## Properties
| Property | Type | Description |
|----------|------|-------------|
| id | string | Unique identifier |
| name | string | Terminator name |
| path | string | File path |
| description | string | Terminator description |

## Example
```
json
{
  "id": "terminator-001",
  "type": "terminators",
  "name": "Error Exit",
  "path": "/terminators/error-exit.js",
  "description": "Error handling termination"
}
```

## Related Types
- Connected to: NODES, ACTIONS, TASKS
- End point for: FLOW, ACTIONS
