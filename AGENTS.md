# AGENTS Entity Type

- **Color:** #a855f7 (purple)
- **Icon:** 🤖
- **Description:** AI Agents, automation scripts, autonomous entities

## Properties
| Property | Type | Description |
|----------|------|-------------|
| id | string | Unique identifier |
| name | string | Agent name |
| path | string | File path to agent implementation |
| description | string | Agent description |

## Example
```
json
{
  "id": "agent-001",
  "type": "agents",
  "name": "Code Review Agent",
  "path": "/agents/code-review-agent.js",
  "description": "Automated code review and suggestions"
}
```

## Related Types
- Connects to: NODES, ACTIONS
- Often initiates: ACTIONS
- Uses: SERVICES
