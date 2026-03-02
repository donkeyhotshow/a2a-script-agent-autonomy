# NODES Entity Type

- **Color:** #3b82f6 (blue)
- **Icon:** 🔵
- **Description:** Graph nodes, state machines, flow control points

## Properties

| Property    | Type   | Description       |
|-------------|--------|-------------------|
| id          | string | Unique identifier |
| name        | string | Node name         |
| path        | string | File path         |
| description | string | Node description  |

## Example

```
json
{
  "id": "node-001",
  "type": "nodes",
  "name": "Start Node",
  "path": "/nodes/start.js",
  "description": "Initial flow node"
}
```

## Related Types

- Connected to: AGENTS, ACTIONS, SERVICES
- Can connect to: ACTIONS, NODES, TERMINATORS
