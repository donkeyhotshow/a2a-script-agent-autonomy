# Entity Types Reference

## Overview

This file documents the entity types used in the VueFlow visualization for the A2A Protocol.

## Entity Types

| Type            | Color             | Icon | Description                    |
|-----------------|-------------------|------|--------------------------------|
| **AGENTS**      | #a855f7 (purple)  | 🤖   | AI Agents, automation scripts  |
| **NODES**       | #3b82f6 (blue)    | 🔵   | Graph nodes, state machines    |
| **ACTIONS**     | #f97316 (orange)  | ⚡    | Actions, operations            |
| **SERVICES**    | #06b6d4 (cyan)    | 🔧   | Backend services, APIs         |
| **TASKS**       | #84cc16 (lime)    | 📋   | Task definitions, jobs         |
| **TERMINATORS** | #ef4444 (red)     | 🛑   | End states, termination points |
| **PACKAGES**    | #6366f1 (indigo)  | 📦   | NPM packages, libraries        |
| **FEATURES**    | #ec4899 (pink)    | ✨    | Feature flags, capabilities    |
| **SYSTEMS**     | #14b8a6 (teal)    | ⚙️   | System components              |
| **SCRIPTS**     | #f59e0b (amber)   | 📜   | Scripts, shell commands        |
| **SOLUTIONS**   | #10b981 (emerald) | 💡   | Solution patterns, fixes       |

## Usage in Code

```
javascript
import { ELEMENT_TYPES } from './nodes.js';

// Use type constants
const agentNode = {
  type: ELEMENT_TYPES.AGENTS,
  data: { name: 'My Agent', path: '/agents/my-agent.js' }
};
```

## VueFlow Integration

The entity types are automatically mapped to VueFlow nodes with:

- Custom styling based on type color
- Icon and label in the header
- Standard handles for connections

## Relations

Entities can be connected via relations:

```
javascript
const relations = [
  { source: 'agent1', target: 'node1' },
  { source: 'node1', target: 'action1' }
];
