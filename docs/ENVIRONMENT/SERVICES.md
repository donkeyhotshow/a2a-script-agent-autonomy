# SERVICES Entity Type

- **Color:** #06b6d4 (cyan)
- **Icon:** 🔧
- **Description:** Backend services, APIs, external integrations

## Properties

| Property    | Type   | Description         |
|-------------|--------|---------------------|
| id          | string | Unique identifier   |
| name        | string | Service name        |
| path        | string | File path           |
| description | string | Service description |

## Example

```
json
{
  "id": "service-001",
  "type": "services",
  "name": "File Service",
  "path": "/services/file-service.js",
  "description": "File operations API"
}
```

## Related Types

- Used by: AGENTS, ACTIONS
- Provides: TASKS, NODES
- Connected to: SYSTEMS
