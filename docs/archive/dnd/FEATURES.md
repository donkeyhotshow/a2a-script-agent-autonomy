# FEATURES Entity Type

- **Color:** #ec4899 (pink)
- **Icon:** ✨
- **Description:** Feature flags, capabilities, toggleable features

## Properties

| Property    | Type   | Description         |
|-------------|--------|---------------------|
| id          | string | Unique identifier   |
| name        | string | Feature name        |
| path        | string | File path           |
| description | string | Feature description |

## Example

```
json
{
  "id": "feature-001",
  "type": "features",
  "name": "Dark Mode",
  "path": "/features/dark-mode.js",
  "description": "Dark mode toggle feature"
}
```

## Related Types

- Controlled by: ACTIONS
- Used by: SYSTEMS, SERVICES
- Part of: PACKAGES
