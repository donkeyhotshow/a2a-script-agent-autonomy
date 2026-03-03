# SYSTEMS Entity Type

- **Color:** #14b8a6 (teal)
- **Icon:** ⚙️
- **Description:** System components, infrastructure, core modules

## Properties

| Property    | Type   | Description        |
|-------------|--------|--------------------|
| id          | string | Unique identifier  |
| name        | string | System name        |
| path        | string | File path          |
| description | string | System description |

## Example

```
json
{
  "id": "system-001",
  "type": "systems",
  "name": "Auth System",
  "path": "/systems/auth.js",
  "description": "Authentication and authorization"
}
```

## Related Types

- Contains: SERVICES, NODES
- Uses: PACKAGES
- Managed by: AGENTS
