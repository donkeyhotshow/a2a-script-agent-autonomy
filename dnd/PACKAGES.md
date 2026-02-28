# PACKAGES Entity Type

- **Color:** #6366f1 (indigo)
- **Icon:** 📦
- **Description:** NPM packages, libraries, dependencies

## Properties
| Property | Type | Description |
|----------|------|-------------|
| id | string | Unique identifier |
| name | string | Package name |
| path | string | Package path |
| description | string | Package description |

## Example
```
json
{
  "id": "package-001",
  "type": "packages",
  "name": "vueflow",
  "path": "/node_modules/vueflow",
  "description": "Visualization library"
}
```

## Related Types
- Used by: ACTIONS, SERVICES, SYSTEMS
- Contains: SCRIPTS, FEATURES
- Referenced by: NODES
