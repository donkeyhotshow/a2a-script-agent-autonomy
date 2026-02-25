# SOLUTIONS Entity Type

- **Color:** #10b981 (emerald)
- **Icon:** 💡
- **Description:** Solution patterns, fixes, recommended approaches

## Properties
| Property | Type | Description |
|----------|------|-------------|
| id | string | Unique identifier |
| name | string | Solution name |
| path | string | File path |
| description | string | Solution description |

## Example
```
json
{
  "id": "solution-001",
  "type": "solutions",
  "name": "Fix Vue Imports",
  "path": "/solutions/fix-vue-imports.js",
  "description": "Automated Vue import fixer"
}
```

## Related Types
- Provided by: AGENTS
- Applied to: NODES, ACTIONS, SYSTEMS
- Implements: FEATURES
