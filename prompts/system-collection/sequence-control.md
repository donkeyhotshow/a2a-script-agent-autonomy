# Sequence Control Documentation

## Overview
This document describes the sequence control system for managing multi-step tasks in the grey-room implementation. The sequence queue tracks task progression, maintains state, and provides operational checkpoints.

## Core Concepts

### Sequence State
The sequence state is stored in `context.workbench.sections.sequence` with the following structure:

```typescript
interface SequenceState {
  steps: SequenceStep[];
  headIndex: number;
}

interface SequenceStep {
  id: string;
  title: string;
  goal?: string;
  exit_criteria?: string[];
  prompt_reference?: string;
  dependencies?: string[];
  status: 'pending' | 'in_progress' | 'complete' | 'blocked';
  completedAt?: string;
}
```

### Sequence Operations

#### Step Complete Workflow
When a step is completed via `step_complete` action:

1. **Validation**: Verify the step ID matches the current head step (`steps[headIndex]`)
2. **Mark Complete**: Set step status to 'complete' and record `completedAt` timestamp
3. **Advance Head**: Increment `headIndex` to point to the next step
4. **Update History**: Add entry to `context.history` array
5. **Update Operation History**: Add entry to `context.operationHistory` array
6. **Predict Final Step**: If pending steps ≤ 2, generate final prediction in `context.workbench.sections.predictions`

#### Final Step Prediction
When the sequence has 2 or fewer pending steps, the system automatically generates a "Predicted Final Step" entry:

- **Title**: "Predicted Final Step"
- **Goal**: Based on accumulated step goals or overall task description
- **Type**: `final_prediction`
- **Stored in**: `context.workbench.sections.predictions[]`

## API Endpoints

### Client API
- `GET /api/a2a/sessions/{id}/sequence` - Retrieve current sequence state
- `PUT /api/a2a/sessions/{id}/sequence` - Update sequence state (persisted to `sequence.json`)

### Server Actions
- `step_complete` - Complete current head step and advance queue
- `step_result` - Process results from executed steps

## UI Components

### AgentForm.vue
Enhanced to display the look-ahead queue from sequence state:
- Shows next 3 steps from current head position
- Allows editing pending step titles/goals
- Supports drag-and-drop reordering of pending steps
- Stores edits in `context.workbench.sections.sequence_edits`

### SequenceInspector.vue
Dedicated component for sequence management:
- Displays full sequence queue with status indicators
- Provides controls for step operations (mark complete, edit, reorder)
- Shows predictions and history
- Refreshes via HTTP after PUT operations

## Implementation Details

### Server-Side (a2a-server)
- `action-request-processor.ts`: Handles `step_complete` action routing
- `sequence-workbench.ts`: Core sequence manipulation logic (`applySequenceStepComplete`)

### Client-Side (a2a-client)
- `packages/web/src/components/SequenceInspector.vue`: UI for sequence inspection
- `packages/web/js/sequence-inspector-entry.js`: Component mounting logic
- `packages/web/js/window-events.js`: Sequence binding via `window.__a2aSequenceBind(sessionId)`

### Storage
- Sequence state persisted in `a2a-client/storage/sessions/{sessionId}/sequence.json`
- Context updates stored in session state
- No server-side persistence for sequences (stateless server design)

## Validation and Testing

### Simulation Coverage
Golden test files in `simulations/gray-room/`:
- `queue-init-5-steps/`: Tests sequence initialization with 5 steps
- Additional tests for step completion, queue advancement, and predictions

### Operational Checkpoints
- `tests/direct-tests/validators/verify-gray-room-state.mjs`: JSON snapshot validation
- Command: `npm run verify:gray-room -- <file.json>`

## Integration Points

### Context Structure
```json
{
  "workbench": {
    "sections": {
      "sequence": {
        "steps": [...],
        "headIndex": 0
      },
      "sequence_edits": {...},
      "predictions": [...]
    }
  },
  "history": [...],
  "operationHistory": [...]
}
```

### Session Storage
- Flat session storage mode required for sequence persistence
- Project storage mode not supported for sequences
- Sequence data stored alongside session steps in `storage/sessions/{id}/`

## Future Enhancements

### Planned Features
- WebSocket-based real-time updates (currently HTTP polling)
- Advanced prediction algorithms
- Sequence branching and conditional logic
- Integration with external task management systems

### Performance Considerations
- Sequence operations are synchronous and lightweight
- Prediction generation triggered only when backlog shrinks
- UI updates via HTTP polling to avoid complexity