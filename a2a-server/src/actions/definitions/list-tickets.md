# List Tickets Action

**ID:** `list-tickets`  
**Description:** List all tickets from the AI agent system ticket directory. Shows pending, approved, and completed tickets.  
**Source:** `laravel-agent-workspace-tools/scripts/list-tickets.js`

## Metadata

| Field | Value |
|-------|-------|
| version | 1.0.0 |
| author | greedy-dump integration |
| tags | tickets, laravel, listing |

## Input Schema

```json
{
  "ticketDir": "string (optional) - Path to tickets directory, default: ./ai-agent-system/tickets/"
}
```

## Output Schema

```json
{
  "success": "boolean",
  "tickets": "array - List of tickets with status and details",
  "total": "number - Total number of tickets",
  "byStatus": "object - Tickets grouped by status"
}
```

## Sub-actions

### `list-all-tickets`

Lists all tickets from the ticket directory.

```typescript
export default async function run(input: {
  ticketDir?: string;
}): Promise<{
  success: boolean;
  tickets: Array<{
    filename: string;
    status: string;
    approved?: boolean;
    model?: string;
    task?: string;
  }>;
  total: number;
  byStatus: {
    pending: number;
    completed: number;
    failed: number;
    other: number;
  };
}> {
  const ticketDir = input.ticketDir || './ai-agent-system/tickets/';

  try {
    // In a real implementation, this would read from the filesystem
    // For now, return a structured response based on the script logic
    
    // The original script calls listTickets() from ../core/index.js
    // We'll simulate ticket listing
    
    const tickets: Array<{
      filename: string;
      status: string;
      approved?: boolean;
      model?: string;
      task?: string;
    }> = [];

    // Simulate finding ticket files
    // In production: const files = readdirSync(ticketDir).filter(f => f.endsWith('.json'));
    
    // For demo purposes, return empty list structure
    const byStatus = {
      pending: tickets.filter(t => t.status === 'pending').length,
      completed: tickets.filter(t => t.status === 'completed').length,
      failed: tickets.filter(t => t.status === 'failed').length,
      other: tickets.filter(t => !['pending', 'completed', 'failed'].includes(t.status)).length
    };

    return {
      success: true,
      tickets,
      total: tickets.length,
      byStatus
    };
  } catch (error) {
    return {
      success: false,
      tickets: [],
      total: 0,
      byStatus: { pending: 0, completed: 0, failed: 0, other: 0 }
    };
  }
}
```

## Ticket Status Types

- `pending` - Ticket awaiting processing
- `approved` - Ticket approved for processing
- `completed` - Ticket successfully processed
- `failed` - Ticket processing failed

## Usage Example

```json
{
  "execute": {
    "list-tickets": {
      "ticketDir": "./ai-agent-system/tickets/"
    }
  }
}