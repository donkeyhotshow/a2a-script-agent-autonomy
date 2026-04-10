# @a2a/gray-room

Configurable Gray Room orchestrator with task-based triggers and conditions.

## Overview

The Gray Room package provides a flexible system for managing complex AI agent workflows with configurable triggers, conditions, and actions. It allows you to:

- Create tickets for workflow sessions
- Define tasks with specific triggers (pre-request, post-response, post-transform, manual)
- Set conditions for task execution
- Execute actions through a queue-based system
- Control workflow timing and frequency

## Configuration

Tasks are defined in a configuration object with triggers and conditions:

```typescript
const config: GrayRoomConfig = {
  tasks: [
    {
      id: "pre_request_context_scan",
      name: "Pre-request Context Scan",
      trigger: "pre_request",
      conditions: [
        {
          type: "context_key",
          key: "projectRoot",
          operator: "exists",
        },
      ],
      actions: [
        {
          type: "interrupt",
          params: {
            reason: "auto_context_scan",
            schema: "context_enrichment",
          },
        },
      ],
      priority: 10,
      enabled: true,
    },
  ],
};
```

## Usage

```typescript
import { GrayRoomManager, defaultGrayRoomConfig } from "@a2a/gray-room";

const manager = new GrayRoomManager(defaultGrayRoomConfig);

// Create a ticket for a session
const ticketId = manager.createTicket("session-123", {
  projectRoot: "/path/to/project",
});

// Trigger tasks at different points
await manager.trigger(ticketId, "pre_request");
await manager.trigger(ticketId, "post_response", { result: responseData });

// Cleanup when done
manager.cleanup(ticketId);
```

## Triggers

- `pre_request`: Before sending request to LLM
- `post_response`: After receiving LLM response
- `post_transform`: After response transformation
- `manual`: Only triggered manually
- `conditional`: Based on custom conditions

## Actions

- `interrupt`: Trigger interrupt in gray room workflow
- `analyze`: Execute analysis logic
- `rag_page`: Generate RAG pages
- `compress_history`: Compress conversation history
- `custom`: User-defined actions

## Conditions

Tasks can have conditions that must be met for execution:

- `context_key`: Check context values
- `result_outcome`: Check execution results
- `interrupt_reason`: Check interrupt reasons
- `custom`: User-defined conditions
