# SCRIPTS Entity Type

- **Color:** #f59e0b (amber)
- **Icon:** 📜
- **Description:** Scripts, shell commands, executable code

## Properties

| Property    | Type   | Description        |
|-------------|--------|--------------------|
| id          | string | Unique identifier  |
| name        | string | Script name        |
| path        | string | Script path        |
| description | string | Script description |

## Example

```
json
{
  "id": "script-001",
  "type": "scripts",
  "name": "Build Script",
  "path": "/scripts/build.sh",
  "description": "Build automation script"
}
```

## Related Types

- Executed by: ACTIONS, TASKS
- Uses: PACKAGES
- Part of: SYSTEMS, SERVICES
