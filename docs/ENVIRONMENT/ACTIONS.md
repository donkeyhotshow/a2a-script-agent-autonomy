# ACTIONS Entity Type

- **Color:** #f97316 (orange)
- **Icon:** ⚡
- **Description:** Actions, operations, executable tasks

## Properties

| Property    | Type   | Description         |
|-------------|--------|---------------------|
| id          | string | Unique identifier   |
| name        | string | Action name         |
| path        | string | File path to action |
| description | string | Action description  |

## Example

```
json
{
  "id": "action-001",
  "type": "actions",
  "name": "Create File",
  "path": "/actions/create-file.js",
  "description": "Creates a new file in the project"
}
```

## Related Types

- Initiated by: AGENTS, NODES
- Uses: SCRIPTS, SERVICES
- Can trigger: TASKS, NODES
